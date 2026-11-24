# v1.1 step D: health care counted as what each path pays; argument rebuilt on what the numbers support
import sys, re, pathlib
p=pathlib.Path(sys.argv[1]); t=p.read_text(encoding='utf-8')
def rep(old,new,count=1):
    global t
    assert t.count(old)==count,(t.count(old),old[:90]); t=t.replace(old,new)

# ---- data: 2026 TRICARE Prime retiree enrollment fees (Federal Register, Nov. 10, 2025) ----
rep('"tricareRetireeAnnual":{"A_ind":381.96,"A_fam":770.04,"B_fam":1076.0}','"tricareRetireeAnnual":{"A_ind":381.96,"A_fam":765.0,"B_ind":462.96,"B_fam":927.0}')

# ---- engine: retirement() ----
rep("""  // TSP accumulated to each side's end of career (no investment growth counted)
  const acc = career(D, inp, yrsWork);""",
"""  // Health coverage in retirement, counted as what the retiree pays out of pocket, through age 85.
  // A dual-status technician who finishes 20 qualifying years is a Guard retiree: TRICARE at 60.
  const fam = inp.deps==='yes';
  const fehbOwn = fam?D.params.fehbAnnualEmployee.family:D.params.fehbAnnualEmployee.self;
  const tri = D.params.tricareRetireeAnnual;
  const triFee = inp.retsys==='brs' ? (fam?tri.B_fam:tri.B_ind) : (fam?tri.A_fam:tri.A_ind);
  const guardRetiree = inp.mode!=='t5' && (inp.yos + yrsWork) >= 20;
  const civHealthAnnual = guardRetiree ? triFee : fehbOwn;
  const civHealthLife = gser(civHealthAnnual*Math.pow(1+cola,yrsTo60), 25);
  const agrHealthLife = gser(triFee*Math.pow(1+cola,Math.max(0,agrRetAge-inp.age)), Math.max(0,85-agrRetAge));
  // TSP accumulated to each side's end of career (no investment growth counted)
  const acc = career(D, inp, yrsWork);""")
rep("techLifetime,agrLifetime,fehbGov,fehbHelp,colaG,mult,techTsp,agrTsp,mra,adAt60};",
    "techLifetime,agrLifetime,fehbGov,fehbHelp,colaG,mult,techTsp,agrTsp,mra,adAt60,\n          fehbOwn,triFee,guardRetiree,civHealthAnnual,civHealthLife,agrHealthLife};")
# ---- engine: lifetime() ----
rep("// years (take-home pay plus the member's own TSP deposits) plus the retirement package.",
    "// years (take-home pay plus the member's own TSP deposits) plus the retirement package\n// (pensions and government TSP deposits, minus what the retiree pays for health coverage).")
rep("  const civRet = r.techLifetime + r.fehbHelp + r.techTsp.gov;\n  const agrRet = r.agrLifetime + r.agrTsp.gov;",
    "  const civRet = r.techLifetime + r.techTsp.gov - r.civHealthLife;\n  const agrRet = r.agrLifetime + r.agrTsp.gov - r.agrHealthLife;")

# ---- header deck ----
rep("They say AGRs make more money than Technicians. Well...the devil is in the details. This calculator shows you the whole picture: the difference monthly, annually, and over your entire career into retirement. And here's the part they always skip: <b>technicians cost the U.S. taxpayer less than AGRs</b>, because the full-time military package prices every AGR seat higher. Fill in your info and judge for yourself.",
    "They say AGRs make more money than Technicians. Well...the devil is in the details. This calculator shows you the whole picture: the difference monthly, annually, and over your entire career into retirement, and what you sign away to get it. And here's the part they always skip: <b>technicians cost the U.S. taxpayer less than AGRs</b>, because the full-time military package prices every AGR seat higher. Fill in your info and judge for yourself.")

# ---- civilian column note ----
a=t.index('    <div class="plain" style="font-size:.78rem">Looks smaller than the AGR number?'); b=t.index("</div></div>`;",a)
t=t[:a]+"""    <div class="plain" style="font-size:.78rem">Looks smaller than the AGR number? About ${VIEW==='mo'?fmt((t.tspEmp+t.fers+t.fehbEmp)/12)+' a month':fmt(t.tspEmp+t.fers+t.fehbEmp)+' this year'} came out first for your TSP savings, your pension, and your health insurance. The TSP and pension money is not gone. It is parked.${agrNet>t.takeHome?`<br><br>The AGR's net-pay lead is ${yr(agrNet-t.takeHome)}. Of that, ${yr(Math.min(agrNet-t.takeHome,t.tspEmp+t.fers))} is money you are setting aside in your own TSP and your pension.`:''}"""+t[b:]

# ---- Bottom Line: package definitions and verdict copy ----
rep("  const pkgD=retH.techLifetime+retH.fehbHelp+retH.techTsp.gov;\n  const pkgT=retHT.techLifetime+retHT.fehbHelp+retHT.techTsp.gov;\n  const pkgA=retH.agrLifetime+retH.agrTsp.gov;",
    "  const pkgOf=(r)=>({civ:r.techLifetime+r.techTsp.gov-r.civHealthLife, agr:r.agrLifetime+r.agrTsp.gov-r.agrHealthLife}); // pensions + gov't TSP, minus health premiums paid\n  const pkgD=pkgOf(retH).civ, pkgT=pkgOf(retHT).civ, pkgA=pkgOf(retH).agr;")
rep("""    deckTxt=`On your numbers${nm?`, ${nm}`:''}, AGR comes out about <b>${roundK(-dstEdge)}</b> ahead over your lifetime. This tool doesn't argue with math. But money is one column, not the whole decision. Go in with clear eyes: most AGRs are done at 20 on a pension that needs a second job behind it, the boards control how long you stay, and the job protections you have today do not come with you.`;""",
"""    const endsAt=(t20.reachableBy60&&t20.retAge<Math.round(retH.mra))?`a full-time career that ends around age ${t20.retAge} instead of ${Math.round(retH.mra)} or later`:`a career the boards control`;
    deckTxt=`On your numbers${nm?`, ${nm}`:''}, AGR comes out about <b>${roundK(-dstEdge)}</b> ahead over your lifetime. This tool doesn't argue with math. Now read what that money buys from you: ${endsAt}, your appeal rights, your union, and any say in how long you stay. That extra pay is also the reason converting you costs the taxpayer more.`;""")
rep("""    closer=`<b>On your numbers, AGR comes out about ${roundK(-dstEdge)} ahead over a lifetime. This tool follows your math, not a script.</b> ${retEdge>0?`The technician program still pays about ${roundK(retEdge)} more in retirement. AGR's lead comes from the working years, where tax-free housing and food allowances do the heavy lifting, and those stop the day the uniform comes off. `:''}Double-check your entries, look hard at the job-security and gap-year rows below, and make the call with clear eyes.`;""",
"""    closer=`<b>On your numbers, AGR comes out about ${roundK(-dstEdge)} ahead over a lifetime. This tool follows your math, not a script.</b> ${retEdge>0?`The technician program still pays about ${roundK(retEdge)} more in retirement. `:''}${workEdge<0?`AGR's lead comes from the working years, where tax-free housing and food allowances do the heavy lifting, and those stop the day the uniform comes off. `:''}Money is one column. The rest of this page is the other: who decides when your career ends, what happens when you are treated unfairly, and what you can do about it. Double-check your entries, read those sections, and make the call with clear eyes.`;""")
rep("Working years is take-home pay plus your own TSP savings. Retirement is pensions, health care benefits, and TSP matching funds.</p>",
    "Working years is take-home pay plus your own TSP savings. Retirement is pensions and TSP matching funds, minus what you pay for health coverage.</p>")
rep("It is building retirement income, matched savings, and health coverage for life.</p>`","It is paying for your pension, your matched savings, and your family's health insurance.</p>`")

# ---- career table verdicts: follow take-home pay, the row a member can spend ----
rep("""  $('careerVerdict').textContent = allD>=allA
    ? `Bottom line: over your next ${rD.cy} years, staying dual-status is worth about ${roundK(allD-allA)} more to you than converting to AGR.`
    : `AGR comes out ${fmt(allA-allD)} ahead over the next ${rD.cy} years. Now look at the retirement section below and see what that head start costs you later.`;""",
"""  $('careerVerdict').textContent = cFD.tTake>=cFD.aTake
    ? `Bottom line: in take-home pay over your next ${rD.cy} years, staying dual-status is worth about ${roundK(cFD.tTake-cFD.aTake)} more to you than converting to AGR.`
    : `In take-home pay, AGR comes out about ${roundK(cFD.aTake-cFD.tTake)} ahead over the next ${rD.cy} years. Now look at the retirement section below and see what comes after.`;""")
rep("""  $('careerVerdictB').textContent = allD>=allB
    ? `Even in the AGR's best case, staying dual-status is still worth about ${roundK(allD-allB)} more to you over these ${rD.cy} years.`
    : `In this best case, AGR comes out about ${roundK(allB-allD)} ahead over these ${rD.cy} years. Just remember whose signature that best case depends on, and what the retirement section says about what comes after.`;""",
"""  $('careerVerdictB').textContent = cFD.tTake>=st.t
    ? `Even in the AGR's best case, staying dual-status still takes home about ${roundK(cFD.tTake-st.t)} more over these ${rD.cy} years.`
    : `In this best case, AGR takes home about ${roundK(st.t-cFD.tTake)} more over these ${rD.cy} years. Just remember whose signature that best case depends on, and what the retirement section says about what comes after.`;""")

# ---- retirement card ----
rep("two checks as a dual-status technician, one as Title 5, and you keep your health insurance either way.","two checks as a dual-status technician, one as Title 5, and you keep FEHB either way.")
rep("on a pension that's a fraction of a paycheck, with your FERS frozen and your FEHB gone.","on a pension that's a fraction of a paycheck, with your FERS frozen.")
rep("And here's the kicker: that money isn't even counted in the retirement totals below. It's on top.","That money is in your working-years total, not in the retirement totals below.")
a=t.index("    <tr><td>Health Insurance in Retirement</td>"); b=t.index("    <tr><td>Total Pension Money",a)
t=t[:a]+"""    <tr><td>Health Coverage in Retirement</td>
     <td>${retD.guardRetiree?`<b>TRICARE at 60</b><span class="sub">As a Guard retiree · fee ≈${fmt(retD.triFee)}/yr</span><span class="sub">Or keep FEHB at ≈${fmt(retD.fehbOwn)}/yr</span>`:`<b>Keeps FEHB</b><span class="sub">Your share ≈${fmt(retD.fehbOwn)}/yr</span>`}</td>
     <td><b>Keeps FEHB</b><span class="sub">Your share ≈${fmt(retT.fehbOwn)}/yr</span></td>
     <td><b>TRICARE at ${retD.agrRetAge}</b><span class="sub">Fee ≈${fmt(retD.triFee)}/yr</span></td></tr>
"""+t[b:]
a=t.index("    <tr><td>Health Insurance, Government Share"); b=t.index("    <tr><td>Your TSP Contributions",a)
t=t[:a]+"""    <tr><td>Health Coverage, What You Pay<span class="sub">Premiums and enrollment fees through age 85</span></td><td>${fmt(-retD.civHealthLife)}</td><td>${fmt(-retT.civHealthLife)}</td><td>${fmt(-retD.agrHealthLife)}</td></tr>
"""+t[b:]
a=t.index("    <tr><td><b>Retirement Package, All In</b>"); b=t.index("</tr>`;",a)
t=t[:a]+"""    <tr><td><b>Retirement Package, All In</b><span class="sub">Pensions + gov't TSP, minus health coverage</span></td><td><b>${fmt(pkgOf(retD).civ)}</b></td><td><b>${fmt(pkgOf(retT).civ)}</b></td><td><b>${fmt(pkgOf(retD).agr)}</b></td>"""+t[b:]
rep("TSP totals count money going in, not investment growth.","Health coverage is counted as what you pay for it: the FEHB premium, or the TRICARE Prime enrollment fee for a military retiree. TSP totals count money going in, not investment growth.")

# ---- What You Give Up: rights first ----
a=t.index("  const gu=[];"); b=t.index("  $('giveup').innerHTML=gu.join('');",a)
old=t[a:b]
def item(start):
    i=old.index(start); j=old.index("</li>`);",i)+len("</li>`);"); return old[i:j]
fersIf=old[old.index("  if(retD.defFers>0) gu.push("):old.index("  gu.push(`<li><b>Two pension checks")]
two=item("  gu.push(`<li><b>Two pension checks"); prot=item("  gu.push(`<li><b>Job protections"); pay=item("  gu.push(`<li><b>A paycheck until retirement"); rent=item("  gu.push(`<li><b>The \"extra\" pay is rent money")
new="""  const gu=[];
"""+prot+"""
  gu.push(`<li><b>Your union, for good.</b> Technician bargaining rights are suspended by executive order right now, and an executive order can be cancelled by the next president. An AGR position cannot bargain under any president: federal law makes it a crime to bargain on behalf of AGR members (10 U.S.C. § 976).</li>`);
"""+pay+"\n"+fersIf+two+"\n"+rent+"""
  gu.push(`<li><b>FEHB.</b> Convert to AGR before you're retirement-eligible and you lose the right to carry FEHB into retirement. You'd be on TRICARE instead, which costs a retiree less out of pocket: about ${fmt(retD.triFee)} a year against about ${fmt(retD.fehbOwn)} for FEHB. What you give up is the choice of plans. (Title 5 converts keep FEHB.)</li>`);
"""
t=t[:a]+new+t[b:]

# ---- taxpayer card ----
rep("""<div id="printbar" style="margin:14px 0;""","""<div class="callout" id="cardTaxpayer"><h3>What the Switch Costs the Taxpayer</h3><p>The higher AGR pay on this page is not free. The Defense Department's own estimate shows that replacing technicians with AGRs adds a net $248 million in cost from fiscal 2028 through 2032. Technicians do the same work for less.</p><p class="small" style="margin-top:6px">Source: Defense Department legislative proposal, resource table, May 11, 2026.</p></div>

<div id="printbar" style="margin:14px 0;""")
rep("const px=mk('pPage'); px.appendChild(cloneById('cardGiveup'));","const px=mk('pPage'); px.appendChild(cloneById('cardGiveup')); px.appendChild(cloneById('cardTaxpayer'));")

# ---- methodology and footer ----
rep("  <li>Health: 2026 Blue Cross Standard as the FEHB example. TRICARE: $0 premium for AGR families; 2026 retiree enrollment fees shown.</li>",
    "  <li>Health: working years use the 2026 Blue Cross Standard premium as the FEHB example, and $0 for an AGR family on TRICARE Prime. Retirement counts what you pay through age 85: the FEHB premium for a Title 5 retiree, and the 2026 TRICARE Prime enrollment fee for an AGR retiree and for a dual-status technician who finishes 20 qualifying years. A Guard retiree is eligible for TRICARE at 60 and can keep FEHB instead at the higher premium. Group A fees are used for Legacy High-3 and Group B fees for BRS. Copays, deductibles, and Medicare at 65 are not counted on any path. The years between your civilian retirement age and 60 show no pension, no pay, and no premium.</li>")
rep("Retirement: pensions, the government's share of FEHB premiums from 60 to 85, and the government's TSP deposits. Every dollar is counted once. TRICARE coverage for a military retiree is not given a dollar value. Its enrollment fee is shown on the retirement card.</li>",
    "Retirement: pensions and the government's TSP deposits, minus what you pay for health coverage. Every dollar is counted once.</li>")
rep("  <li>Left out, and it would favor the civilian columns: FERS Supplement, TSP growth, survivor benefits, per-diem on orders. Left out, and it would favor the AGR column: a dollar value for TRICARE in retirement, and anything an AGR earns in a second career after 20.</li>",
    "  <li>Left out, and it would favor the civilian columns: FERS Supplement, TSP growth, Social Security earned on the larger civilian paycheck, survivor benefits, per-diem on orders. Left out, and it would favor the AGR column: anything an AGR earns in a second career after 20.</li>")
rep("realignment); IRS Rev. Proc. 2025-32;","realignment); TRICARE Prime retiree enrollment fees for 2026 (Federal Register, Nov. 10, 2025); IRS Rev. Proc. 2025-32;")
for bad in ('—','\\u2014','–'): assert bad not in t, bad
p.write_text(t,encoding='utf-8'); print('step D ok',len(t))
