#!/usr/bin/env python3
"""v1.3 step C: tightening pass.
Engine: (1) no Guard retired pay while still serving, on either path; (2) a partial last AGR year is counted as a partial
year; (3) annual training inside the Prior Active-Duty Years box is not counted twice in retirement points; (4) FERS start
ages follow the law for every length of service, including a frozen (deferred) FERS annuity.
Page: every question must be answered, nothing is pre-filled, entries that contradict each other are refused with a
plain explanation, and nothing the member types is changed silently.
Usage: python3 patch_v13_c_tight.py index_b.html index_c.html"""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, f'expected {count}, found {n}: {old[:90]!r}'
    s = s.replace(old, new)

# =====================================================================================
# ENGINE
# =====================================================================================
# (2) partial last AGR year
rep("""    if(y < t20.serve){ // still serving AGR
      const a = agrYear(D,inp,yos);
      aGross+=a.gross*f; aTake+=a.takeHome*f; aGov+=a.govTSP*f;
      aTspEmp+=a.tspEmp*f; aTspGov+=a.govTSP*f;
      aGrossWork+=a.gross*f; aTakeWork+=a.takeHome*f;
    } else { // retired at 20, pension checks only (LA exempts military retired pay; ~10% est. federal tax)
      aGross+=t20.pensionEarned*f; aTake+=t20.pensionEarned*0.9*f; aPensionYrs++;
      aGrossPen+=t20.pensionEarned*f; aTakePen+=t20.pensionEarned*0.9*f;
    }""",
"""    const w = Math.max(0, Math.min(1, t20.serve - y)); // share of this year still on AGR orders (a partial last year counts as partial)
    if(w > 0){ // still serving AGR
      const a = agrYear(D,inp,yos);
      aGross+=a.gross*f*w; aTake+=a.takeHome*f*w; aGov+=a.govTSP*f*w;
      aTspEmp+=a.tspEmp*f*w; aTspGov+=a.govTSP*f*w;
      aGrossWork+=a.gross*f*w; aTakeWork+=a.takeHome*f*w;
    }
    if(w < 1){ // retired at 20, pension checks only (LA exempts military retired pay; ~10% est. federal tax)
      const p = 1 - w;
      aGross+=t20.pensionEarned*f*p; aTake+=t20.pensionEarned*0.9*f*p; if(w===0) aPensionYrs++;
      aGrossPen+=t20.pensionEarned*f*p; aTakePen+=t20.pensionEarned*0.9*f*p;
    }""")
rep("for(let y=cy; y<agrWorkYrs; y++){ const a = agrYear(D, i, i.yos + y); extra += a.takeHome + a.tspEmp + a.govTSP; }",
    "for(let y=cy; y<agrWorkYrs; y++){ const a = agrYear(D, i, i.yos + y), w = Math.min(1, agrWorkYrs - y); extra += (a.takeHome + a.tspEmp + a.govTSP)*w; }")
rep("for(let y=0;y<t20.serve;y++){ const a=agrYear(D,i,i.yos+y); agr.ss.push(a.base); agr.tsp.push(a.tspEmp+a.govTSP); }",
    "for(let y=0;y<t20.serve;y++){ const a=agrYear(D,i,i.yos+y), w=Math.min(1,t20.serve-y); agr.ss.push(a.base*w); agr.tsp.push((a.tspEmp+a.govTSP)*w); }")

# (3) annual training is already inside the 78-point drilling year
rep("  const pastMday = Math.max(0, inp.yos - inp.priorAD);",
    "  // v1.3: the Prior Active-Duty Years box includes annual training (it counts toward 20 years of active service), but those 15 days\n"
    "  // are already inside the 78-point drilling year. Only the rest of the active time is counted at 365 points a year.\n"
    "  const atShare = 15/365;\n"
    "  const adFull = Math.max(0, Math.min(inp.priorAD, (inp.priorAD - atShare*inp.yos)/(1-atShare)));\n"
    "  const pastMday = Math.max(0, inp.yos - adFull);")
rep("D.params.ptsPerGoodYearMday*pastMday + D.params.ptsPerYearAGR*inp.priorAD + futurePtsPerYr*yrsWork", "D.params.ptsPerGoodYearMday*pastMday + D.params.ptsPerYearAGR*adFull + futurePtsPerYr*yrsWork")
rep("D.params.ptsPerGoodYearMday*pastMday + D.params.ptsPerYearAGR*(inp.priorAD + t20.serve)", "D.params.ptsPerGoodYearMday*pastMday + D.params.ptsPerYearAGR*(adFull + t20.serve)")

# (1) and (4) start ages
rep("""  const fersImmediate = civYearsTotal >= 30;
  const fersStartAge = fersImmediate ? Math.min(60, mra) : 60;
  const techLifetime = gser(fersAnnual, 85 - fersStartAge) + gser(techResAnnual, 25 + early);
  const agrPenStartAge = t20.earned ? agrRetAge : resStartAge;
  const agrLifetime = gser(agrPensionAnnual, t20.earned ? Math.max(0,85-agrRetAge) : 25 + early) + defFers*23;""",
"""  // FERS, unreduced: at MRA with 30 years, at 60 with 20, at 62 with 5 (5 U.S.C. 8412). Short of those at the last day of work, the
  // annuity is postponed to the first age that pays it unreduced.
  const techRetAge = inp.age + yrsWork;
  const fersImmediate = civYearsTotal >= 30 || (techRetAge >= 60 && civYearsTotal >= 20) || (techRetAge >= 62 && civYearsTotal >= 5);
  const fersStartAge = fersImmediate ? techRetAge : Math.max(techRetAge, civYearsTotal >= 20 ? 60 : 62);
  // No Guard retired pay while still serving: the pension starts at the reduced age or the last day of service, whichever is later.
  const techResStartAge = Math.max(resStartAge, techRetAge);
  const techLifetime = gser(fersAnnual, Math.max(0, 85 - fersStartAge)) + gser(techResAnnual, Math.max(0, 85 - techResStartAge));
  const agrPenStartAge = t20.earned ? agrRetAge : Math.max(resStartAge, inp.age + t20.serve);
  // A frozen (deferred) FERS annuity is unreduced at 62 with 5 years, at 60 with 20, at MRA with 30 (5 U.S.C. 8413, 8415).
  const defFersStartAge = Math.max(inp.age, inp.civYears >= 30 ? mra : (inp.civYears >= 20 ? 60 : 62));
  const agrLifetime = gser(agrPensionAnnual, Math.max(0, 85 - agrPenStartAge)) + defFers*Math.max(0, 85 - defFersStartAge);""")
rep("early,resStartAge,fersImmediate,fersStartAge,agrPenStartAge,bridgeHealth,", "early,resStartAge,fersImmediate,fersStartAge,agrPenStartAge,bridgeHealth,techRetAge,techResStartAge,defFersStartAge,adFull,")

# =====================================================================================
# PAGE: text that follows the engine changes
# =====================================================================================
rep("`:`Your FERS pension is shown starting at 60, which keeps it unreduced.`}", "`:`Your FERS pension is shown starting at ${retD.fersStartAge}, which keeps it unreduced.`}")
rep("`Your Guard pension starts at ${ageTxt(retD.resStartAge)}. That's two pension checks.`", "`Your Guard pension starts at ${ageTxt(retD.techResStartAge)}. That's two pension checks.`")
rep("${retD.fersImmediate?`Starts at ${retD.fersStartAge}, full and unreduced`:'Starts at 60'}", "${retD.fersImmediate?`Starts at ${retD.fersStartAge}, full and unreduced`:`Starts at ${retD.fersStartAge}`}")
rep("<span class=\"sub\">Frozen at today's pay · starts at 62</span>", "<span class=\"sub\">Frozen at today's pay · starts at ${retD.defFersStartAge}</span>")
rep("<span class=\"sub\">Starts at ${ageTxt(retD.resStartAge)} · ${Math.round(retD.techPoints).toLocaleString()} points</span>", "<span class=\"sub\">Starts at ${ageTxt(retD.techResStartAge)} · ${Math.round(retD.techPoints).toLocaleString()} points</span>")
rep("`<span class=\"sub\">+${monthly(retD.defFers)} at 62</span>`", "`<span class=\"sub\">+${monthly(retD.defFers)} at ${retD.defFersStartAge}</span>`")
rep("frozen at today's salary, nothing until age 62. Stay civilian", "frozen at today's salary, nothing until age ${retD.defFersStartAge}. Stay civilian")
rep("With fewer than 30, the pension is shown starting at 60, which keeps it unreduced and brings FEHB back with it.",
    "With 20 to 29 years it is shown starting at 60, and with fewer than 20 at 62. Those are the ages that keep it unreduced and bring FEHB back with it.")
rep("three months earlier for every 90 days of qualifying duty after Jan. 28, 2008, and never before 50 (10 U.S.C. § 12731(f)).",
    "three months earlier for every 90 days of qualifying duty after Jan. 28, 2008, never before 50, and never while you are still serving (10 U.S.C. § 12731(f)).")
rep("and FEHB premiums are counted from that day. With fewer than 30 years it is shown starting at 60.",
    "and FEHB premiums are counted from that day. With 20 to 29 years it is shown starting at 60, and with fewer than 20 at 62, the ages that pay it unreduced.")
rep("Go AGR and your FERS freezes: today's salary, payable at 62, no supplement, health insurance lost.",
    "Go AGR and your FERS freezes at today's salary, with no supplement and health insurance lost. It is payable unreduced at 62, at 60 if you already have 20 civilian years, or at your Minimum Retirement Age if you already have 30 (5 U.S.C. §§ 8413, 8415).")
rep("never before 50 (10 U.S.C. § 12731(f)).</li>\n  <li>Social Security:",
    "never before 50 and never while still serving (10 U.S.C. § 12731(f)). Retirement points already earned: 78 for each drilling year, 365 for each year of active duty. Annual training days in your Prior Active-Duty Years are already inside the 78, so they are not counted a second time.</li>\n  <li>Social Security:")

# =====================================================================================
# PAGE: every question answered, nothing pre-filled
# =====================================================================================
PH = '<option value="" disabled selected>Select</option>'
rep('id="age" min="18" max="64" value="35">', 'id="age" min="18" max="64" placeholder="Your age">')
rep('<select id="deps">', '<select id="deps">' + PH)
rep('<select id="filing">', '<select id="filing">' + PH)
rep('<select id="paysys">', '<select id="paysys">' + PH)
rep('id="civYears" min="0" max="42" value="12" step="0.1">', 'id="civYears" min="0" max="42" step="0.1" placeholder="Years">')
rep('<select id="fersCohort">', '<select id="fersCohort">' + PH)
rep('<option value="y2014plus" selected>', '<option value="y2014plus">')
rep('<select id="retsys">', '<select id="retsys">' + PH)
rep('id="yos" min="0" max="40" value="12" step="0.1">', 'id="yos" min="0" max="40" step="0.1" placeholder="Years">')
rep('id="priorAD" min="0" max="30" value="0" step="0.1">', 'id="priorAD" min="0" max="30" step="0.1" placeholder="Years">')
rep('id="depMonths" min="0" max="240" value="0">', 'id="depMonths" min="0" max="240" placeholder="Months, 0 if none">')
rep("Leave it at 0 if you're not sure.</div></div>", "Enter 0 if you have none.</div></div>")
rep('id="tspCiv" min="0" max="60" value="" placeholder="Enter your %">', 'id="tspCiv" min="0" max="60" value="" placeholder="Enter your %, 0 if none">')
rep('id="tspMil" min="0" max="60" value="" placeholder="Enter your %">', 'id="tspMil" min="0" max="60" value="" placeholder="Enter your %, 0 if none">')
rep("const o=document.createElement('option');o.value=g;o.textContent=g;if(g==='E-6')o.selected=true;gradeSel.appendChild(o);});",
    "const o=document.createElement('option');o.value=g;o.textContent=g;gradeSel.appendChild(o);});\n"
    "{const p=document.createElement('option');p.value='';p.textContent='Select';p.disabled=true;p.selected=true;gradeSel.insertBefore(p,gradeSel.firstChild);}")
rep("""  gsel.innerHTML='';ssel.innerHTML='';
  const gmax = sys==='WS'?19:15;
  for(let g=1;g<=gmax;g++){const o=document.createElement('option');o.value=g;o.textContent=sys+'-'+g;if((sys!=='GS'&&g===10)||(sys==='GS'&&g===9))o.selected=true;gsel.appendChild(o);}
  const steps = sys==='GS'?10:5;
  for(let s=1;s<=steps;s++){const o=document.createElement('option');o.value=s;o.textContent='Step '+s;if(s===(sys==='GS'?5:3))o.selected=true;ssel.appendChild(o);}""",
"""  gsel.innerHTML='';ssel.innerHTML='';
  const ph=t=>{const p=document.createElement('option');p.value='';p.textContent=t;p.disabled=true;p.selected=true;return p;};
  if(!sys){ gsel.appendChild(ph('Pick a pay system first')); ssel.appendChild(ph('Pick a pay system first')); return; }
  gsel.appendChild(ph('Select')); ssel.appendChild(ph('Select'));
  const gmax = sys==='WS'?19:15;
  for(let g=1;g<=gmax;g++){const o=document.createElement('option');o.value=g;o.textContent=sys+'-'+g;gsel.appendChild(o);}
  const steps = sys==='GS'?10:5;
  for(let s=1;s<=steps;s++){const o=document.createElement('option');o.value=s;o.textContent='Step '+s;ssel.appendChild(o);}""")
rep("  if(!$('state').value){ $('hourly').value=''; return; }\n", "  if(!$('state').value){ $('hourly').value=''; return; }\n  if(!$('paysys').value||!$('cgrade').value||!$('cstep').value){ $('hourly').value=''; return; }\n")

# message boxes
rep('<div style="margin:0 0 14px"><button id="go">Show Me the Numbers</button></div>',
    '<div class="callout hide" id="formMsg" style="border-left-color:var(--bad)" role="alert"></div>\n\n<div style="margin:0 0 14px"><button id="go">Show Me the Numbers</button></div>')
rep('<div class="callout" id="headline"></div>', '<div class="callout warn hide" id="softNote"></div>\n\n<div class="callout" id="headline"></div>')

# validation
i = s.find("function sanitizeFields(){"); j = s.find("$('go').addEventListener('click',()=>{", i)
assert i > 0 and j > i
CHECK = r"""// Every question has to be answered, and the answers have to agree with each other. Nothing the member types is changed for them.
const REQ=['age','deps','filing','state','mha','oha','paysys','cgrade','cstep','hourly','civYears','fersCohort','tspCiv','grade','retsys','yos','priorAD','depMonths','tspMil'];
const LABEL={age:'How Old Are You?',deps:'Married and/or Have Kids?',filing:'How Do You File Your Taxes?',state:'State or Territory',mha:'Where Do You Work?',oha:'Monthly Housing Allowance (OHA)',paysys:'Civilian Pay System',cgrade:'Civilian Grade',cstep:'Step',hourly:'Your Hourly Rate',civYears:'Years of Federal Civilian Service',fersCohort:'Federal Civilian Hire Date',tspCiv:'Civilian TSP Contribution',grade:'Military Grade',retsys:'Military Retirement System',yos:'Years of Military Service',priorAD:'Prior Active-Duty Years',depMonths:'Months Deployed Since Jan. 28, 2008',tspMil:'Military TSP Contribution'};
function checkForm(){
  const info=stInfo(), missing=[], problems=[];
  const blank=id=>String($(id).value).trim()==='';
  const num=id=>blank(id)?NaN:+$(id).value;
  const needMha=!info.oha, needOha=!!info.oha, needRate=!!info.manualFws && $('paysys').value!=='GS';
  for(const id of ['age','deps','filing','state','paysys','cgrade','cstep','civYears','fersCohort','tspCiv','grade','retsys','yos','priorAD','depMonths','tspMil']){
    if(blank(id) || ($(id).type==='number' && !isFinite(+$(id).value))) missing.push(id);
  }
  if($('state').value && needMha && !$('mha').value) missing.push('mha');
  if(needOha && !(+$('oha').value>0)) missing.push('oha');
  if(needRate && !(+$('hourly').value>0)) missing.push('hourly');
  const age=num('age'), yos=num('yos'), pad=num('priorAD'), civ=num('civYears'), dep=num('depMonths'), t1=num('tspCiv'), t2=num('tspMil');
  const n1=v=>Math.round(v*10)/10;
  if(isFinite(age) && (age<18||age>64)) problems.push(`Your age has to be between 18 and 64. You entered ${age}.`);
  for(const [id,v] of [['yos',yos],['priorAD',pad],['civYears',civ],['depMonths',dep],['tspCiv',t1],['tspMil',t2]]) if(isFinite(v) && v<0) problems.push(`${LABEL[id]} can't be less than zero.`);
  if(isFinite(t1) && t1>100) problems.push(`Civilian TSP Contribution is a percent of your pay. It can't be more than 100.`);
  if(isFinite(t2) && t2>100) problems.push(`Military TSP Contribution is a percent of your pay. It can't be more than 100.`);
  if(isFinite(age) && isFinite(yos) && age>=18 && age<=64 && yos>age-17) problems.push(`You entered ${n1(yos)} Years of Military Service at age ${age}. That would mean you joined before you were 17. Check both boxes.`);
  if(isFinite(age) && isFinite(civ) && age>=18 && age<=64 && civ>age-16) problems.push(`You entered ${n1(civ)} Years of Federal Civilian Service at age ${age}. That would mean you were hired before you were 16. Check both boxes.`);
  if(isFinite(pad) && isFinite(yos) && pad>yos) problems.push(`Your Prior Active-Duty Years (${n1(pad)}) can't be more than your Years of Military Service (${n1(yos)}). Active-duty time is part of your total service, not on top of it.`);
  if(isFinite(pad) && pad>=20) problems.push(`You entered ${n1(pad)} Prior Active-Duty Years. With 20 or more you already qualify for an active-duty retirement, and this tool is built for members who haven't reached it.`);
  if(isFinite(dep) && isFinite(pad) && dep/12>pad+0.05) problems.push(`You entered ${dep} months deployed, which is ${n1(dep/12)} years, but only ${n1(pad)} Prior Active-Duty Years. Deployed time is active duty, so it has to fit inside that number.`);
  const since=Math.floor((Date.now()-new Date('2008-01-28T00:00:00').getTime())/2629800000);
  if(isFinite(dep) && dep>since) problems.push(`You entered ${dep} months deployed since Jan. 28, 2008. Only ${since} months have gone by since that date.`);
  if(isFinite(yos) && yos>=0 && $('retsys').value==='legacy'){ const joined=new Date().getFullYear()-Math.ceil(yos);
    if(joined>=2018) problems.push(`With ${n1(yos)} Years of Military Service you joined in ${joined} or later. Everyone who joined in 2018 or later is under BRS. Change Military Retirement System to BRS.`); }
  return {missing, problems};
}
function showFormMsg(chk){
  REQ.forEach(id=>$(id).classList.toggle('miss-sel', chk.missing.includes(id)));
  let h='';
  if(chk.missing.length) h+=`<h3>Every Box Is Used in the Math</h3><p>Fill in the highlighted boxes: ${chk.missing.map(id=>LABEL[id]).join(', ')}. If the answer is none, type 0.</p>`;
  if(chk.problems.length) h+=`<h3${chk.missing.length?' style="margin-top:10px"':''}>These Entries Don't Add Up</h3><ul>${chk.problems.map(p=>'<li>'+p+'</li>').join('')}</ul><p>Fix them and try again. This tool won't guess or change what you typed.</p>`;
  $('formMsg').innerHTML=h; $('formMsg').classList.remove('hide');
}
function hideFormMsg(){ $('formMsg').classList.add('hide'); $('formMsg').innerHTML=''; REQ.forEach(id=>$(id).classList.remove('miss-sel')); }
REQ.forEach(id=>['input','change'].forEach(ev=>$(id).addEventListener(ev,()=>$(id).classList.remove('miss-sel'))));
function sanitizeFields(){ /* v1.3: nothing is changed for the member any more; checkForm() refuses entries that don't add up */ }
"""
s = s[:i] + CHECK + s[j:]
rep("$('go').addEventListener('click',()=>{\n  const info=stInfo();",
    "$('go').addEventListener('click',()=>{\n  const chk=checkForm();\n"
    "  if(chk.missing.length||chk.problems.length){\n"
    "    showFormMsg(chk); $('results').classList.add('hide'); $('methodBox').classList.add('hide');\n"
    "    const b=$('go'); b.classList.remove('deny'); void b.offsetWidth; b.classList.add('deny'); setTimeout(()=>b.classList.remove('deny'),600);\n"
    "    $('formMsg').scrollIntoView({behavior:'smooth',block:'center'});\n"
    "    return;\n  }\n  hideFormMsg();\n  const info=stInfo();")
# a re-render (Monthly/Annually, COLA switches, the cut-year picker) must never run on a form that no longer adds up
rep("function render(scroll){\n  const inp=inputs();",
    "function render(scroll){\n  { const chk=checkForm(); if(chk.missing.length||chk.problems.length){ showFormMsg(chk); $('results').classList.add('hide'); $('methodBox').classList.add('hide'); $('formMsg').scrollIntoView({behavior:'smooth',block:'center'}); return; } hideFormMsg(); }\n  const inp=inputs();")
rep("  $('results').classList.remove('hide');\n  $('methodBox').classList.remove('hide');\n",
    "  $('results').classList.remove('hide');\n  $('methodBox').classList.remove('hide');\n"
    "  { const notes=[];\n"
    "    if(inp.priorAD<0.3 && inp.yos>=1) notes.push(`You entered ${inp.priorAD} Prior Active-Duty Years. Almost every Guard member has some: basic training, tech school, and annual training all count. Check your Reserve Point Statement, because that number decides how many AGR years it takes to reach 20.`);\n"
    "    $('softNote').innerHTML=notes.length?('<h3>Check This Before You Trust the Numbers</h3>'+notes.map(n=>'<p>'+n+'</p>').join('')):''; $('softNote').classList.toggle('hide',!notes.length); }\n")

open(dst, 'w', encoding='utf-8').write(s)
print('wrote', dst, len(s))
