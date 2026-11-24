# v1.1 step A: structural and wording changes. Reads the live index.html, writes build/index.html
import sys, re, pathlib
src=pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
t=src
def rep(old,new,count=1):
    global t
    assert t.count(old)==count, (t.count(old), old[:90])
    t=t.replace(old,new)

# --- head: zoom, title, description, share preview ---
rep('<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">')
DESC="Dual-status technician, Title 5 civilian, or AGR? Enter your own grade, step and years of service and compare monthly pay, career earnings and retirement side by side. Nothing you type leaves your device. Published by LIUNA Local 1776."
rep('<title>Technician vs. AGR — What the Switch Really Pays</title>',
    '<title>Technician vs. AGR: What the Switch Really Pays</title>\n'
    f'<meta name="description" content="{DESC}">\n'
    '<link rel="canonical" href="https://calculator.local1776.org/">\n'
    '<meta property="og:type" content="website">\n'
    '<meta property="og:site_name" content="LIUNA Local 1776">\n'
    '<meta property="og:url" content="https://calculator.local1776.org/">\n'
    '<meta property="og:title" content="Technician vs. AGR: What the Switch Really Pays">\n'
    '<meta property="og:description" content="Enter your own grade, step and years of service. Compare monthly pay, career earnings and retirement for all three paths. Nothing you type leaves your device.">\n'
    '<meta property="og:image" content="https://calculator.local1776.org/og.png">\n'
    '<meta property="og:image:width" content="1200">\n'
    '<meta property="og:image:height" content="630">\n'
    '<meta name="twitter:card" content="summary_large_image">')

# --- header copy and version ---
rep('<span class="badge">BETA v1.0</span>','<span class="badge">BETA v1.1</span>')
rep("This calculator shows you the whole picture — the difference monthly, annually, and over your entire career into retirement. And here's the part they always skip: even though the technician comes out ahead over a career and a retirement, <b>technicians cost the U.S. taxpayer less than AGRs</b> — the full-time military package prices every AGR seat higher. Better for you, cheaper for the country. Fill in your info and judge for yourself.",
    "This calculator shows you the whole picture: the difference monthly, annually, and over your entire career into retirement. And here's the part they always skip: <b>technicians cost the U.S. taxpayer less than AGRs</b>, because the full-time military package prices every AGR seat higher. Fill in your info and judge for yourself.")
rep('Beta v1.0 — published by LIUNA Local 1776.','Beta v1.1, published by LIUNA Local 1776.')

# --- privacy bar: let it wrap ---
rep('<div class="privacy" style="font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">','<div class="privacy" style="font-size:.78rem">')

# --- engine: lifetime ledger ---
rep("if(typeof module!=='undefined'){ module.exports={compute,",
"""// Lifetime ledger in today's dollars, from today to age 85: money in hand during the working
// years (take-home pay plus the member's own TSP deposits) plus the retirement package.
// Every dollar is counted once. AGR pension checks sit in the retirement package only.
function lifetime(D, inp){
  const i = Object.assign({}, inp, {cola:0});
  const r = retirement(D, i);
  const cy = Math.max(2, Math.min(42, Math.round(r.mra - i.age))); // same horizon as the career table
  const c = career(D, i, cy), t20 = c.t20;
  const agrWorkYrs = t20.reachableBy60 ? t20.yrsNeeded : Math.max(0, 60 - i.age);
  let extra = 0; // AGR service that runs past the civilian retirement age
  for(let y=cy; y<agrWorkYrs; y++){ const a = agrYear(D, i, i.yos + y); extra += a.takeHome + a.tspEmp + a.govTSP; }
  const civWork = c.tTake + c.tTspEmp;
  const agrWork = c.aTakeWork + c.aTspEmp + extra;
  const civRet = r.techLifetime + r.fehbHelp + r.techTsp.gov;
  const agrRet = r.agrLifetime + r.agrTsp.gov;
  return {cy, agrWorkYrs, civWork, agrWork, civRet, agrRet, civAll:civWork+civRet, agrAll:agrWork+agrRet};
}
if(typeof module!=='undefined'){ module.exports={lifetime,compute,""")

# --- render: the Bottom Line block ---
a=t.index("  const pkgD=retH.techLifetime+retH.fehbHelp+retH.techTsp.gov;")
b=t.index("  const mraR=Math.round(retD.mra);")
old=t[a:b]
m=re.search(r"  const dreams=\[.*?\];\n",old,re.S); assert m
dreams=m.group(0)
new = r"""  const pkgD=retH.techLifetime+retH.fehbHelp+retH.techTsp.gov;
  const pkgT=retHT.techLifetime+retHT.fehbHelp+retHT.techTsp.gov;
  const pkgA=retH.agrLifetime+retH.agrTsp.gov;
  // The Bottom Line counts everything once, in today's dollars: working-years money in hand plus the retirement package
  const lifeD=lifetime(D,iD), lifeT=lifetime(D,iT);
  const allInD=lifeD.civAll, allInT=lifeT.civAll, allInA=lifeD.agrAll;
  const takeDeltaMo=(a.takeHome-tD.takeHome)/12;
  const retEdge=pkgD-pkgA;                      // retirement package only
  const workEdge=lifeD.civWork-lifeD.agrWork;   // working years only
  const dstEdge=allInD-allInA;                  // all in: this is what the verdict follows
  const setAsideMo=(tD.tspEmp+tD.fers+tD.fehbEmp)/12; // what the technician check sets aside monthly
  const roundK=v=>'$'+(Math.round(Math.abs(v)/1000)*1000).toLocaleString('en-US');
  const round10=v=>'$'+(Math.round(Math.abs(v)/10)*10).toLocaleString('en-US');
  const best=Math.max(allInD,allInT,allInA); // the card that makes the most sense gets the pop
  const nm=inp.fname?inp.fname.charAt(0).toUpperCase()+inp.fname.slice(1):'';
  const depsTxt=inp.deps==='yes'?'you and your family':'you';
  const seed=Math.abs(Math.round(dstEdge/1000));
  const pick=(arr)=>arr[seed%arr.length];
""" + dreams + r"""  const bag=[...dreams];
  const d1=bag.splice(Math.floor(Math.random()*bag.length),1)[0];
  const d2=bag.splice(Math.floor(Math.random()*bag.length),1)[0];
  const done20="most AGRs are done at 20, on a pension that's a fraction of a paycheck, hunting for a second job";
  let hlTxt,deckTxt;
  if(dstEdge>=100000){
    hlTxt=pick(['NOT EVEN CLOSE','A LANDSLIDE','THE MATH JUST VOTED','SIX FIGURES OF DAYLIGHT']);
    deckTxt=`All in, converting to AGR would cost ${depsTxt}${nm?`, ${nm},`:''} about <b>${roundK(dstEdge)}</b> over your lifetime. That's ${d1}. That's ${d2}. ${workEdge<0?`AGR pays more during the working years, and this tool counts every dollar of it. <b>Retirement is where the technician program wins it back and then some</b>: ${done20}.`:`<b>A longer career at full pay does the work</b>: ${done20}.`}`;
  } else if(dstEdge<=-100000){
    hlTxt=pick(['THE MONEY FAVORS AGR','AGR PAYS MORE HERE']);
    deckTxt=`On your numbers${nm?`, ${nm}`:''}, AGR comes out about <b>${roundK(-dstEdge)}</b> ahead over your lifetime. This tool doesn't argue with math. But money is one column, not the whole decision. Go in with clear eyes: most AGRs are done at 20 on a pension that needs a second job behind it, the boards control how long you stay, and the job protections you have today do not come with you.`;
  } else {
    hlTxt=pick(['TOO CLOSE TO CALL','A PHOTO FINISH']);
    deckTxt=`For ${depsTxt}${nm?`, ${nm}`:''}, the money lands within about <b>${roundK(Math.abs(dstEdge))}</b> over a lifetime. The dollars won't decide this one. Job security, the gap years, and who controls your career will. Read the retirement card closely, because that's where the paths really differ.`;
  }
  const vd=`<div class="kicker">The Bottom Line${nm?` · ${nm}, for ${depsTxt}`:''}</div>
  <div class="headline">${hlTxt}</div>
  <div class="deck">${deckTxt}</div>`;
  const lifeCard=(cls,svg,lb,all,work,ret,color)=>`<div class="statcard${cls}${all===best?' win':''}">${svg}<div><span class="lb">${lb}</span><span class="amt"${color?` style="color:${color}"`:''}>${fmt(all)}</span><span class="sub">Working years ${fmt(work)}</span><span class="sub">Retirement ${fmt(ret)}</span></div></div>`;
  const who=v=>v>=0?'the technician':'AGR';
  let closer;
  if(dstEdge>=100000){
    closer=takeDeltaMo>=0
      ?`<b>AGR pays more now. The technician program pays more overall.</b> Think of it like this: AGR puts that extra ${round10(takeDeltaMo)} in your <i>front</i> pocket, and front-pocket money gets spent. The technician puts ${round10(setAsideMo)} a month in your <i>back</i> pocket. Still your money, growing until you're ready for it: the boat, the camp, the condo on the beach. <b>Don't give up ${roundK(dstEdge)} in lifetime value for a fatter front pocket today.</b>`
      :`<b>The technician program pays more now and more overall: ${roundK(dstEdge)} more over a lifetime.</b>`;
  } else if(dstEdge<=-100000){
    closer=`<b>On your numbers, AGR comes out about ${roundK(-dstEdge)} ahead over a lifetime. This tool follows your math, not a script.</b> ${retEdge>0?`The technician program still pays about ${roundK(retEdge)} more in retirement. AGR's lead comes from the working years, where tax-free housing and food allowances do the heavy lifting, and those stop the day the uniform comes off. `:''}Double-check your entries, look hard at the job-security and gap-year rows below, and make the call with clear eyes.`;
  } else {
    closer=`<b>On the money alone, this one is close.</b> ${takeDeltaMo>=0&&retEdge>0?`AGR puts more in your <i>front</i> pocket today. The technician program puts more in your <i>back</i> pocket for later. Over a lifetime the two come out about even. `:''}Job security, the gap years, and who controls your career are what should decide it, so look hard at those rows below.`;
  }
  $('headline').innerHTML=`${vd}
  <div class="small" style="margin:6px 0 6px">${inp.grade} · ${inp.paysys}-${inp.cgrade} Step ${inp.cstep} · ${D.mhaLabels[inp.mha]||((D.tax.states[inp.state]||{}).name||'')}</div>
  <p style="margin-top:8px"><b>What each path is worth to you from today to age 85, in today's dollars.</b> Working years is take-home pay plus your own TSP savings. Retirement is pensions, health care benefits, and TSP matching funds.</p>
  <div class="statcards">
    ${lifeCard('',svgDst('bl'),'DUAL-STATUS',allInD,lifeD.civWork,lifeD.civRet,'')}
    ${lifeCard(' sc-t5',svgT5,'TITLE 5',allInT,lifeT.civWork,lifeT.civRet,'#3f7fb5')}
    ${lifeCard(' sc-agr',svgAgr,'AGR',allInA,lifeD.agrWork,lifeD.agrRet,'#5a6b3b')}
  </div>
  <p style="margin-top:6px">All in, staying a dual-status technician is worth about <span class="delta ${dstEdge>=0?'pos':'neg'}">${roundK(dstEdge)} ${dstEdge>=0?'more':'less'}</span> than converting to AGR. ${who(workEdge).replace(/^t/,'T')} is ahead by about ${roundK(workEdge)} during the working years, and ${who(retEdge)} is ahead by about ${roundK(retEdge)} in retirement.</p>
  ${takeDeltaMo>=0?`<p style="margin-top:6px">AGR puts about <b>${round10(takeDeltaMo)} more in your pocket</b> each month. That is real. Most of it is tax-free housing and food allowance (BAH and BAS), and this tool counts every dollar of it.</p>
  <p style="margin-top:6px">But so is this: about <b>${round10(setAsideMo)} a month</b> comes out of your technician check for the FERS pension, TSP, and health insurance. That money is not being thrown away. It is building retirement income, matched savings, and health coverage for life.</p>`:`<p style="margin-top:6px">Even today, the technician puts about <b>${round10(-takeDeltaMo)} more in your pocket</b> each month, and that's after setting aside <b>${round10(setAsideMo)} a month</b> for the FERS pension, TSP, and health insurance.</p>`}
  <p style="margin-top:6px">${closer}</p>`;

"""
t=t[:a]+new+t[b:]

# --- methodology: say what the Bottom Line counts ---
rep("  <li>Standard deduction only; no other income or credits.",
    "  <li>The Bottom Line: adds two things for each path, in today's dollars, from today to age 85. Working years: take-home pay plus your own TSP contributions, for as long as you work on that path. Retirement: pensions, the government's share of FEHB premiums from 60 to 85, and the government's TSP deposits. Every dollar is counted once. TRICARE coverage for a military retiree is not given a dollar value. Its enrollment fee is shown on the retirement card.</li>\n  <li>Standard deduction only; no other income or credits.")
rep("  <li>Left out (all of it favors the civilian columns): FERS Supplement, TSP growth, survivor benefits, per-diem on orders.</li>",
    "  <li>Left out, and it would favor the civilian columns: FERS Supplement, TSP growth, survivor benefits, per-diem on orders. Left out, and it would favor the AGR column: a dollar value for TRICARE in retirement, and anything an AGR earns in a second career after 20.</li>")
pathlib.Path(sys.argv[2]).write_text(t,encoding='utf-8')
print('written',len(t))
