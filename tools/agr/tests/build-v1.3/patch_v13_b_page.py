#!/usr/bin/env python3
"""v1.3 step B: the page. Reads the engine-patched copy (step A) and writes the review copy.
Usage: python3 patch_v13_b_page.py index_a.html index_b.html
Every replacement is an exact string with an asserted count, so a silent miss is impossible."""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, f'expected {count}, found {n}: {old[:90]!r}'
    s = s.replace(old, new)

def rep_line(prefix, new_line):
    """Replace the one whole line that starts with prefix."""
    global s
    lines = s.split('\n')
    hits = [i for i, l in enumerate(lines) if l.startswith(prefix)]
    assert len(hits) == 1, f'expected 1 line, found {len(hits)}: {prefix[:80]!r}'
    lines[hits[0]] = new_line
    s = '\n'.join(lines)

AGR_SHORT = "<b>AGR Is at the Pleasure of the Guard.</b> This number assumes they keep you every single year. Your tour can be cut short or not renewed at any time. They don't have to prove cause to anyone outside the military, and you have no outside appeal."
TECH_SHORT = "<b>Your Federal Job Is Yours by Law.</b> Once you're past probation, it can be taken only for cause, with written notice, the evidence against you, and a chance to answer. If they get it wrong, you can appeal to an outside board."
RIGHTS_PAIR = ('<div class="plain" style="border-left:3px solid var(--agr)">' + AGR_SHORT + ' The final say belongs to your Adjutant General.</div>'
  '<div class="plain" style="border-left:3px solid var(--navy)"><b>Your Federal Job Is Yours by Law.</b> Once you\'re past probation, it can be taken only for cause. The law treats that job as your property. The government can\'t take it without due process: written notice, the evidence against you, and a chance to answer. If they get it wrong, you can appeal to an outside board. Discrimination complaints go to the EEOC. An AGR has none of this. If an AGR is retaliated against, the only place to complain is inside the military.</div>')

# ---------- version labels ----------
rep('<span>Version 1.2</span>', '<span>Version 1.3</span>')
rep('Version 1.2, published by LIUNA Local 1776.', 'Version 1.3, published by LIUNA Local 1776.')
rep('<span class="small">Full-time military. 20 years and out</span>', '<span class="small">Full-time military, at the pleasure of the Guard</span>')

# ---------- inputs ----------
rep('<div><label for="priorAD">Prior Active-Duty Years</label><input type="number" id="priorAD" min="0" max="30" value="0"><div class="hint">See your Reserve Point Statement or most current DD214.</div></div>',
    '<div><label for="priorAD">Prior Active-Duty Years</label><input type="number" id="priorAD" min="0" max="30" value="0" step="0.1"><div class="hint">All of it: basic and tech school, annual training, deployments. Take the active-duty points on your Reserve Point Statement and divide by 365, or add up your DD-214s.</div></div>\n'
    '  <div><label for="depMonths">Months Deployed Since Jan. 28, 2008</label><input type="number" id="depMonths" min="0" max="240" value="0"><div class="hint">Federal active duty or a national emergency call-up. AGR time doesn\'t count. Every 90 days moves your Guard pension three months earlier than age 60. Leave it at 0 if you\'re not sure.</div></div>')
rep("priorAD:clamp($('priorAD').value,0,40,0),", "priorAD:clamp($('priorAD').value,0,40,0), depMonths:clamp($('depMonths').value,0,240,0),")
rep("let COLA_CAR=0, COLA_RET=0;", "let COLA_CAR=0, COLA_RET=0;\nlet CUT_Y=null; // year picked on the If Your Orders Are Cut card")

# ---------- Read This First ----------
rep_line('<p style="margin-top:6px"><b>What\'s counted:</b>',
    '<p style="margin-top:6px"><b>What\'s counted:</b> official 2026 pay tables, both pensions, the FERS supplement, tax-free BAH and BAS, federal and state taxes, TSP matching from here forward with estimated growth, an estimate of Social Security, and health insurance, working years and retirement.</p>')
rep_line('<p style="margin-top:6px"><b>What\'s not counted:</b>',
    '<p style="margin-top:6px"><b>What\'s not counted:</b> your current TSP balance (it\'s yours and goes with you on every path), future raises, promotions, and inflation. Also not counted: any job you take after you leave full-time duty, and special pays and allowances your particular job or career field may draw: hazardous duty pay, environmental differentials, incentive pays, or bonuses. Everything is in today\'s dollars.</p>')
rep_line('<p style="margin-top:6px"><b>Career-length assumptions:</b>',
    '<p style="margin-top:6px"><b>Career-length assumptions:</b> the Technician works to Minimum Retirement Age. <b>The AGR figure is a best case.</b> It assumes the Guard keeps you until you finish 20 years of active service. Nobody can promise you that. An AGR serves at the pleasure of the Guard, so the results also show what happens if your orders are cut. Full details on every assumption are in the methodology at the bottom of the page.</p>')

# ---------- rights wording on the career and retirement cards ----------
rep('<p class="small" style="margin-bottom:4px">Civilian calculations are based on your Minimum Retirement Age',
    '<div class="plain" style="margin:0 0 8px;border-left:3px solid var(--agr)">' + AGR_SHORT + '</div>\n<p class="small" style="margin-bottom:4px">Civilian calculations are based on your Minimum Retirement Age')
rep('<div id="retStory" style="font-size:.92rem;margin-bottom:8px"></div>',
    '<div class="plain" style="margin:0 0 8px;border-left:3px solid var(--agr)">' + AGR_SHORT + '</div>\n<div class="plain" style="margin:0 0 8px;border-left:3px solid var(--navy)">' + TECH_SHORT + '</div>\n<div id="retStory" style="font-size:.92rem;margin-bottom:8px"></div>')

# ---------- new cards ----------
CARD_CUT = ('<div class="callout warn" id="cardCut"><h3>If Your Orders Are Cut</h3><div id="cutBody"></div></div>\n\n'
            '<div class="callout" id="cardGraph"><h3>How Your Prior Active-Duty Time Changes the Answer</h3><div id="graphBody"></div></div>\n\n')
YES = '<b style="color:var(--good)">Yes</b>'
NO = '<b style="color:var(--bad)">No</b>'
def srow(label, sub, tech_sub='', agr_sub=''):
    return ('<tr><td>' + label + '<span class="sub">' + sub + '</span></td><td>' + YES + (('<span class="sub">' + tech_sub + '</span>') if tech_sub else '') +
            '</td><td>' + NO + (('<span class="sub">' + agr_sub + '</span>') if agr_sub else '') + '</td></tr>')
CARD_RIGHTS = ('<div class="callout" id="cardRights"><h3>The Rights Scorecard: Technician 7, AGR 0</h3>'
  '<p>Money is one column. This is the other. Seven protections a dual-status Technician has in law, and what an AGR has in their place.</p>'
  '<div class="tablewrap"><table class="cmp"><thead><tr><th></th><th>Technician</th><th>AGR</th></tr></thead><tbody>'
  + srow('Appeal a Firing to an Outside Board', 'Merit Systems Protection Board, then federal court', '5 U.S.C. §§ 7511-7513', 'The Adjutant General decides')
  + srow('Take a Discrimination Complaint to the EEOC', 'Title VII of the Civil Rights Act', '', 'Uniformed members are excluded (29 CFR 1614.103)')
  + srow('File a Grievance and Go to an Arbitrator', 'A neutral outsider rules, not your chain of command', 'Suspended by executive order right now', 'Never')
  + srow('Join a Union That Can Bargain for You', 'A contract your command has to follow', 'Suspended by executive order right now', 'A federal crime to bargain for you (10 U.S.C. § 976)')
  + srow('Be Removed Only for Cause', 'Written notice, the evidence, and a chance to answer first', '30 days\' written notice', 'A tour can be ended without proving cause')
  + srow('Keep the Job Without Anyone Renewing It', 'No tour end date, no continuation board', '', 'Tours end and boards decide')
  + srow('Work to a Full Civilian Retirement', 'Your call, to Minimum Retirement Age and beyond', '', 'Out when the Guard says so')
  + '<tr><td><b>Score</b></td><td><b>7 of 7</b></td><td><b>0 of 7</b></td></tr>'
  '</tbody></table></div>'
  '<p class="small" style="margin-top:8px">Straight talk on the limits: a Technician has to keep Guard membership to keep the job, and matters tied to military duty are decided by the Adjutant General (32 U.S.C. § 709(f)). Two of the seven are suspended by executive order today. An executive order can be lifted. An AGR position can never have them.</p>'
  '</div>\n\n')
def rec(place, text, source):
    return '<li><b>' + place + '</b> ' + text + ' <span class="small">' + source + '</span></li>'
CARD_RECORD = ('<div class="callout warn" id="cardRecord"><h3>This Is the Record, Not a Scare Tactic</h3>'
  '<p>When we say an AGR has nowhere outside the Guard to turn, we are describing what has already happened. Every item below comes from a federal investigation, an inspector general, a court, or a major news investigation. Look them up.</p><ul>'
  + rec('Wisconsin, 2019.', 'Federal investigators found the Wisconsin Guard had broken federal law and regulations for years in how it handled sexual assault complaints. The Adjutant General resigned at the governor\'s request the day the report came out.', 'National Guard Bureau, Office of Complex Investigations, report released Dec. 9, 2019; Associated Press.')
  + rec('Alaska, 2014.', 'Federal investigators found fraud, favoritism, and ethical misconduct, and Guard members too afraid of retaliation to file complaints. The Adjutant General resigned.', 'National Guard Bureau, Office of Complex Investigations, report released Sept. 4, 2014; Anchorage Daily News.')
  + rec('West Virginia, 2016.', 'The Defense Department Inspector General found that a brigadier general, the state\'s assistant adjutant general, retaliated against a lieutenant colonel after she reported being raped. It was the first time the Inspector General had ever confirmed reprisal in a sexual assault case.', 'Stars and Stripes; Federal News Network.')
  + rec('California, 2019.', 'The commander of the California Air National Guard was removed after the Los Angeles Times reported that whistleblowers at the Fresno base suffered reprisals. Five California Guard generals resigned, retired, or were fired between 2019 and 2023.', 'Associated Press; Los Angeles Times; Military Times.')
  + rec('Vermont, 2021.', 'A federal assessment found the Vermont Guard had failed to track sexual assault reports properly and had never put in place the retaliation protection plan every state Guard was required to adopt in 2017.', 'National Guard Bureau, Office of Complex Investigations, report released Aug. 2021; VTDigger.')
  + rec('Thirteen States, 2021.', 'USA TODAY documented National Guard scandals in 13 states. In state after state, the member who reported the problem was the one who paid for it.', 'USA TODAY, Nov. 25, 2021.')
  + '</ul>'
  '<p style="margin-top:8px"><b>And here is what happened when an AGR took it to court.</b> In 1988 a Nebraska AGR sergeant testified at his state legislature against the confirmation of his own Adjutant General, saying the general had failed to deal with sexual harassment of women in the Guard. Five months later the general ended his AGR tour, a few months into a new three-year tour. The sergeant sued, saying it was retaliation and that he never got a hearing. The federal appeals court never ruled on whether he was right. It ruled that it could not hear the case at all, because civilian courts do not review military personnel decisions. <span class="small">Lovell v. Heng, 890 F.2d 63 (8th Cir. 1989).</span></p>'
  '<p style="margin-top:8px"><b>That is the difference in one sentence.</b> A Technician who is wrongly fired from the civilian job can take it to an outside board and then to a federal court. An AGR whose orders are cut can complain to the same organization that cut them.</p>'
  '</div>\n\n')
rep('<div class="callout warn" id="cardGiveup"><h3>What You Give Up if You Convert to AGR</h3><ul id="giveup"></ul></div>\n\n',
    CARD_CUT + '<div class="callout warn" id="cardGiveup"><h3>What You Give Up if You Convert to AGR</h3><ul id="giveup"></ul></div>\n\n' + CARD_RIGHTS + CARD_RECORD)

# ---------- column notes ----------
rep("and it never counts toward any pension.</div></div>`;", "and it never counts toward any pension.</div><div class=\"plain\" style=\"margin-top:8px;font-size:.78rem\">" + AGR_SHORT + "</div></div>`;")
rep("That pay stacks on top of everything here.</div></div>`:`", "That pay stacks on top of everything here.</div><div class=\"plain\" style=\"margin-top:8px;font-size:.78rem\">" + TECH_SHORT + "</div></div>`:`")
# the dual-status note is the last branch on the same line
lines = s.split('\n')
hit = [i for i, l in enumerate(lines) if l.startswith('  const noteSec=isT5?')]
assert len(hit) == 1 and lines[hit[0]].endswith("`:''}</div>`;"), 'dual-status note line'
lines[hit[0]] = lines[hit[0]][:-len('</div>`;')] + '<div class="plain" style="margin-top:8px;font-size:.78rem">' + TECH_SHORT + '</div></div>`;'
s = '\n'.join(lines)

# ---------- bottom line ----------
rep("const pkgOf=(r)=>({civ:r.techLifetime+r.techTsp.gov-r.civHealthLife, agr:r.agrLifetime+r.agrTsp.gov-r.agrHealthLife}); // pensions + gov't TSP, minus health premiums paid",
    "const pkgOf=(r)=>({civ:r.techLifetime+r.fersSuppLife+r.techTsp.gov+r.techTspGrowth+r.ssTech-r.civHealthLife, agr:r.agrLifetime+r.agrTsp.gov+r.agrTspGrowth+r.ssAgr-r.agrHealthLife}); // pensions, FERS supplement, Social Security, gov't TSP and growth, minus health premiums paid")
rep("hlTxt=pick(['THE MONEY FAVORS AGR','AGR PAYS MORE HERE']);", "hlTxt=pick(['AGR PAYS MORE, IF THEY KEEP YOU','THE MONEY FAVORS AGR, IF YOU FINISH']);")
rep("ahead over your lifetime. This tool doesn't argue with math.", "ahead over your lifetime, if the Guard keeps you the whole way. This tool doesn't argue with math.")
rep("Working years is take-home pay plus your own TSP savings. Retirement is pensions and TSP matching funds, minus what you pay for health coverage.</p>",
    "Working years is take-home pay plus your own TSP savings. Retirement is pensions, Social Security, and TSP matching funds with estimated growth, minus what you pay for health coverage.</p>")
rep("    ${lifeCard(' sc-agr',svgAgr,'AGR',allInA,lifeD.agrWork,lifeD.agrRet,'#5a6b3b')}\n  </div>",
    "    ${lifeCard(' sc-agr',svgAgr,'AGR, BEST CASE',allInA,lifeD.agrWork,lifeD.agrRet,'#5a6b3b')}\n  </div>\n"
    "  <p style=\"margin-top:6px\"><b>The AGR figure is a best case.</b> It assumes the Guard keeps you on full-time orders for all ${Math.round(t20.serve*10)/10} more years it takes${t20.reachableBy60?' to reach 20 years of active service':' to reach age 60'}. See \"If Your Orders Are Cut\" below for what happens when it doesn't.</p>\n"
    "  " + RIGHTS_PAIR)

# ---------- retirement card ----------
rep_line("  $('retStory').innerHTML=",
  "  $('retStory').innerHTML=`<p><b>Stay civilian, either path, and you draw a full paycheck to your Minimum Retirement Age (${mraR}).</b> ${retD.fersImmediate?`With ${retD.civYearsTotal} years of service by then, your FERS pension starts right away, full and unreduced, and the FERS supplement pays on top of it until 62.`:`Your FERS pension is shown starting at 60, which keeps it unreduced.`} ${retD.guardRetiree?`Your Guard pension starts at ${ageTxt(retD.resStartAge)}. That's two pension checks.`:''} You keep FEHB either way. ${t20.reachableBy60?`<b>Go AGR and, if the Guard keeps you the whole way, you're done around age ${retD.agrRetAge}</b>. Your pension starts then, but so does your job hunt: ${gapYrs} years to fill, on a pension that's a fraction of a paycheck, with your FERS frozen.`:`On your numbers the AGR path can't reach 20 active years before 60, so it ends at 60 on a points-based pension instead.`}</p>${gapYrs>0?`<div class=\"plain\" style=\"margin:6px 0 10px\"><b>The gap years, age ${retD.agrRetAge} to ${mraR}:</b> the AGR's paychecks stop at ${retD.agrRetAge}. Yours don't. While they live on a ${fmt(retD.agrPensionAnnual/12)}/mo pension and hunt for a second career, you're still collecting a full ${fmt(tD.civFull/12)}/mo paycheck plus drill pay, roughly <b>${fmt(tD.civFull*gapYrs)}</b> over those ${gapYrs} years. That money is in your working-years total, not in the retirement totals below.</div>`:''}`;")
rep("  const gapYrs = retD.agrActive ? Math.max(0,mraR-retD.agrRetAge) : 0;",
    "  const gapYrs = retD.agrActive ? Math.max(0,mraR-retD.agrRetAge) : 0;\n  const ageTxt=v=>(Math.round(v*100)/100)===60?'60':('age '+(Math.round(v*100)/100));")
rep('`<tr><td>FERS Civilian Pension<span class="sub">Starts at 60</span></td>',
    '`<tr><td>FERS Civilian Pension<span class="sub">${retD.fersImmediate?`Starts at ${retD.fersStartAge}, full and unreduced`:\'Starts at 60\'}</span></td>')
rep('<span class="sub">Frozen at today\'s pay · starts at 62</span>`:`None <span class="sub">Under 5 civilian years: forfeited</span>`}</td></tr>\n',
    '<span class="sub">Frozen at today\'s pay · starts at 62</span>`:`None <span class="sub">Under 5 civilian years: forfeited</span>`}</td></tr>\n'
    '    <tr><td>FERS Supplement<span class="sub">Bridges you to Social Security at 62</span></td>\n'
    '     <td>${retD.fersSuppMonthly>0?`<b>${fmt(retD.fersSuppMonthly)}/mo</b><span class="sub">Age ${retD.fersStartAge} to 62 · estimate</span>`:`None<span class="sub">Takes 30 years at retirement age</span>`}</td>\n'
    '     <td>${retT.fersSuppMonthly>0?`<b>${fmt(retT.fersSuppMonthly)}/mo</b><span class="sub">Age ${retT.fersStartAge} to 62 · estimate</span>`:`None<span class="sub">Takes 30 years at retirement age</span>`}</td>\n'
    '     <td>None<span class="sub">Not paid on a frozen pension</span></td></tr>\n')
rep('<span class="sub">Starts at 60 · ${Math.round(retD.techPoints).toLocaleString()} points</span>',
    '<span class="sub">Starts at ${ageTxt(retD.resStartAge)} · ${Math.round(retD.techPoints).toLocaleString()} points</span>')
rep('`Starts at 60, points formula`', '`Starts at ${ageTxt(retD.agrPenStartAge)}, points formula`')
rep('    <tr><td>Total Pension Money<span class="sub">Through age 85</span></td><td>${fmt(retD.techLifetime)}</td><td>${fmt(retT.techLifetime)}</td><td>${fmt(retD.agrLifetime)}</td></tr>\n',
    '    <tr><td>Social Security<span class="sub">Estimate, claimed at 67</span></td><td><b>${fmt(retD.ssTechMonthly)}/mo</b></td><td><b>${fmt(retT.ssTechMonthly)}/mo</b></td><td><b>${fmt(retD.ssAgrMonthly)}/mo</b><span class="sub">BAH and BAS earn none</span></td></tr>\n'
    '    <tr><td>Total Pension Money<span class="sub">Through age 85, with the FERS supplement</span></td><td>${fmt(retD.techLifetime+retD.fersSuppLife)}</td><td>${fmt(retT.techLifetime+retT.fersSuppLife)}</td><td>${fmt(retD.agrLifetime)}</td></tr>\n'
    '    <tr><td>Total Social Security<span class="sub">Age 67 through 85 · estimate</span></td><td>${fmt(retD.ssTech)}</td><td>${fmt(retT.ssTech)}</td><td>${fmt(retD.ssAgr)}</td></tr>\n')
rep('    <tr><td>Government TSP Match<span class="sub">Free government match</span></td><td>${fmt(retD.techTsp.gov)}</td><td>${fmt(retT.techTsp.gov)}</td><td>${fmt(retD.agrTsp.gov)}</td></tr>\n',
    '    <tr><td>Government TSP Match<span class="sub">Free government match</span></td><td>${fmt(retD.techTsp.gov)}</td><td>${fmt(retT.techTsp.gov)}</td><td>${fmt(retD.agrTsp.gov)}</td></tr>\n'
    '    <tr><td>Estimated TSP Growth<span class="sub">New money only, 4% a year above inflation, to age 60</span></td><td>${fmt(retD.techTspGrowth)}</td><td>${fmt(retT.techTspGrowth)}</td><td>${fmt(retD.agrTspGrowth)}</td></tr>\n')
rep('<span class="sub">Pensions + gov\'t TSP, minus health coverage</span>', '<span class="sub">Pensions + Social Security + gov\'t TSP and growth, minus health coverage</span>')
rep_line("  $('retNotes').innerHTML=",
  "  $('retNotes').innerHTML=`The civilian columns assume you work to your Minimum Retirement Age: ${mraR} for you, figured from your birth year. With 30 years of service by then, the FERS pension starts right away, unreduced, and the FERS supplement pays until 62. With fewer than 30, the pension is shown starting at 60, which keeps it unreduced and brings FEHB back with it. The Guard pension starts at 60, or earlier if you entered deployed months: three months earlier for every 90 days of qualifying duty after Jan. 28, 2008, and never before 50 (10 U.S.C. § 12731(f)). ${COLA_RET?'A conservative 3% annual cost-of-living assumption is applied to pay, pensions, and premiums, except your frozen deferred FERS, which stays frozen until it starts. That is the law, and it is exactly the problem.':'Everything is in today\\'s dollars, as if nobody ever got another raise.'} Health coverage is counted as what you pay for it: the FEHB premium, or the TRICARE Prime enrollment fee for a military retiree. Social Security is an estimate built from the pay each path earns from here on, claimed at 67. TSP growth is an estimate too: 4% a year above inflation on new contributions, to age 60, the same rate on every path. <b>The AGR column is a best case.</b> It assumes the Guard keeps you until you finish 20 years of active service. If the boards kept an AGR full-time past 20, the pension grows with every extra year. That is shown right in the Military Retirement row.`;")

# ---------- methodology ----------
rep("Legacy High-3 gets nothing. Investment growth is left out on all sides.", "Legacy High-3 gets nothing. Growth on new contributions is estimated at 4% a year above inflation, to age 60, at the same rate on every path.")
rep_line("  <li>FERS: 1% × high-3 × years",
  "  <li>FERS: 1% × high-3 × years. With 30 years of service at your Minimum Retirement Age it starts right away, unreduced, with the FERS supplement until 62 (5 U.S.C. §§ 8412, 8421), and FEHB premiums are counted from that day. With fewer than 30 years it is shown starting at 60. The supplement is an estimate: your age-62 Social Security benefit × FERS years ÷ 40. Go AGR and your FERS freezes: today's salary, payable at 62, no supplement, health insurance lost. Guard pension: (points ÷ 360) × 2.5% (Legacy) or 2% (BRS) × high-36, at 60, or earlier by three months for every 90 days of qualifying duty after Jan. 28, 2008, never before 50 (10 U.S.C. § 12731(f)).</li>\n"
  "  <li>Social Security: an estimate, not your statement. It uses the 2026 benefit formula (90% of the first $1,286 of average monthly earnings, 32% up to $7,749, 15% above that), the pay each path earns from here on, and an assumed earnings history before today. Claimed at 67, counted to 85. Civilian pay and military basic pay earn Social Security. BAH and BAS do not.</li>\n"
  "  <li>If Your Orders Are Cut: reruns the AGR path ending after the year you pick. Short of 20 years of active service there is no active-duty pension; the active years count as points toward a Guard pension. Pay from any job after the cut is not counted, the same as for an AGR who retires at 20. The choices stop at 18 active years, because members within two years of an active-duty retirement are generally protected to 20 (10 U.S.C. § 12686). The Odds You Need weighs the best case against that one cut point.</li>")
rep_line("  <li>The Bottom Line: adds two things",
  "  <li>The Bottom Line: adds two things for each path, in today's dollars, from today to age 85. Working years: take-home pay plus your own TSP contributions, for as long as you work on that path. Retirement: pensions, the FERS supplement, Social Security, the government's TSP deposits, and estimated TSP growth, minus what you pay for health coverage. Every dollar is counted once. The AGR total is a best case: it assumes the tour is never cut.</li>")
rep_line("  <li>Left out, and it would favor the civilian columns:",
  "  <li>Left out, and it would favor the civilian columns: survivor benefits, per-diem on orders. Left out, and it would favor the AGR column: anything an AGR earns in a second career after leaving full-time duty.</li>")

# ---------- cut card, graph ----------
NEW_JS = r"""
  // ---- If Your Orders Are Cut ----
  {
    const serveBest=t20.serve;
    const sanct=Math.floor(18-inp.priorAD);               // sanctuary starts at 18 active years
    const maxCut=Math.min(sanct, Math.ceil(serveBest)-1);
    if(maxCut<1){
      $('cutBody').innerHTML=t20.reachableBy60
        ? `<p>On your numbers you are within two years of an active-duty retirement. Federal law generally protects a member that close to 20 years of active service (10 U.S.C. § 12686), so no cut scenario is shown.</p>`
        : `<p>On your numbers the AGR path can't reach 20 years of active service before age 60, so there is no active-duty pension to lose. It pays a points-based Guard pension either way.</p>`;
    } else {
      if(CUT_Y==null||CUT_Y>maxCut||CUT_Y<1) CUT_Y=Math.max(1,Math.min(maxCut,Math.round(serveBest/2)));
      const Lc=lifetime(D,{...iD,cutYears:CUT_Y});
      const agrCut=Lc.agrAll, behind=allInD-agrCut;
      let opts=''; for(let k=1;k<=maxCut;k++) opts+=`<option value="${k}"${k===CUT_Y?' selected':''}>${k} year${k>1?'s':''} (age ${inp.age+k})</option>`;
      let odds;
      if(allInA<=allInD) odds=`<b>The Odds You Need: there aren't any.</b> Even if the Guard keeps you every single year, the Technician path comes out ahead on your numbers.`;
      else if(agrCut>=allInD) odds=`<b>The Odds You Need:</b> on your numbers the AGR path stays ahead on money even if it ends at this point. Pick an earlier year and look again, then read the scorecard below.`;
      else { const pct=Math.min(99,Math.ceil(100*(allInD-agrCut)/(allInA-agrCut)));
        odds=`<b>The Odds You Need: about ${pct}%.</b> Measured against a cut at year ${CUT_Y}, AGR is the better bet on money only if you are at least ${pct}% sure the Guard keeps you on orders for all ${Math.round(serveBest*10)/10} years. Nobody can promise you that, and no law requires it.`; }
      $('cutBody').innerHTML=`<p><b>An AGR tour can end before you reach 20 years, and nobody outside the military can stop it.</b> Pick a year and see what the AGR path is worth if your orders end there.</p>
      <p style="margin-top:8px"><label for="cutSel" style="display:inline;font-weight:700">My orders end after</label> <select id="cutSel" style="width:auto;display:inline-block;margin-left:6px">${opts}</select></p>
      <div class="tablewrap"><table class="cmp"><thead><tr><th></th><th>Worth to You, Today to Age 85</th></tr></thead><tbody>
      <tr><td>Stay a Dual-Status Technician<span class="sub">Full career, to age ${mraR}</span></td><td><b>${fmt(allInD)}</b></td></tr>
      <tr><td>Convert to AGR, Best Case<span class="sub">Kept on orders all ${Math.round(serveBest*10)/10} years</span></td><td><b>${fmt(allInA)}</b></td></tr>
      <tr><td>Convert to AGR, Orders Cut After ${CUT_Y} Year${CUT_Y>1?'s':''}<span class="sub">At age ${inp.age+CUT_Y}, with ${Math.round((inp.priorAD+CUT_Y)*10)/10} years of active service</span></td><td><b>${fmt(agrCut)}</b></td></tr>
      </tbody></table></div>
      <p style="margin-top:8px">${behind>0?`<b>Cut after ${CUT_Y} year${CUT_Y>1?'s':''}, the AGR path leaves you about ${roundK(behind)} behind where the Technician job would have put you.</b>`:`<b>Cut after ${CUT_Y} year${CUT_Y>1?'s':''}, the AGR path still comes out about ${roundK(-behind)} ahead on your numbers.</b>`} You would leave with no active-duty pension. Your active years would still count as points toward a Guard pension, and your FERS would stay frozen where you left it.</p>
      <p style="margin-top:8px">${odds}</p>
      <div class="plain" style="border-left:3px solid var(--agr)">${AGR_SHORT_JS} The final say belongs to your Adjutant General.</div>
      <p class="small" style="margin-top:8px">What this does and doesn't count: after a cut you would go back to drilling status or out of the Guard, and you would find other work. That next paycheck isn't counted here, because nobody can know it, and it isn't counted for an AGR who retires at 20 either. Your old Technician job would not be waiting for you. The choices stop at 18 years of active service, where federal law generally protects a member to 20 (10 U.S.C. § 12686).</p>`;
    }
  }
  // ---- prior active-duty graph ----
  {
    const maxP=Math.min(19,Math.floor(inp.yos));
    if(maxP<2){ $('cardGraph').style.display='none'; }
    else {
      $('cardGraph').style.display='';
      const pts=[]; for(let p=0;p<=maxP;p++){ const L=lifetime(D,{...iD,priorAD:p}); pts.push([p,L.civAll-L.agrAll]); }
      const W=640,H=280,ml=74,mr=16,mt=26,mb=44;
      const lo=Math.min(0,...pts.map(q=>q[1]),dstEdge), hi=Math.max(0,...pts.map(q=>q[1]),dstEdge);
      const pad=(hi-lo)*0.08||1, y0=lo-pad, y1=hi+pad;
      const X=p=>ml+(W-ml-mr)*p/maxP, Y=v=>mt+(H-mt-mb)*(1-(v-y0)/(y1-y0));
      const kfmt=v=>(v<0?'−':'')+'$'+(Math.abs(v)>=999500?(Math.abs(v)/1e6).toFixed(1)+'M':Math.round(Math.abs(v)/1000)+'K');
      const path=pts.map((q,i)=>(i?'L':'M')+X(q[0]).toFixed(1)+' '+Y(q[1]).toFixed(1)).join(' ');
      const youX=X(Math.min(maxP,inp.priorAD)), youY=Y(dstEdge);
      let xt=''; for(let p=0;p<=maxP;p+=(maxP>10?2:1)) xt+=`<text x="${X(p)}" y="${H-mb+16}" text-anchor="middle" font-size="11" fill="#5f6672">${p}</text>`;
      const yt=[lo,0,hi].filter((v,i,a)=>a.indexOf(v)===i).map(v=>`<text x="${ml-8}" y="${Y(v)+4}" text-anchor="end" font-size="11" fill="#5f6672">${kfmt(v)}</text>`).join('');
      $('graphBody').innerHTML=`<p>Time you have already served on active duty counts toward the 20 years an AGR needs. This chart reruns your numbers with every amount of prior active-duty time, so you can see how much the answer depends on it.</p>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Technician lead over AGR by years of prior active duty" style="width:100%;height:auto;max-width:${W}px;display:block;margin:8px auto 0;font-family:var(--sans)">
        <rect x="${ml}" y="${mt}" width="${W-ml-mr}" height="${Math.max(0,Y(0)-mt)}" fill="#0b2a55" opacity=".05"/>
        <rect x="${ml}" y="${Y(0)}" width="${W-ml-mr}" height="${Math.max(0,H-mb-Y(0))}" fill="#5a6b3b" opacity=".07"/>
        ${hi>0?`<text x="${ml+8}" y="${mt+15}" font-size="11" font-weight="700" fill="#0b2a55">Technician Ahead</text>`:''}
        ${lo<0?`<text x="${ml+8}" y="${H-mb-8}" font-size="11" font-weight="700" fill="#5a6b3b">AGR Ahead, if Kept the Whole Way</text>`:''}
        <line x1="${ml}" x2="${W-mr}" y1="${Y(0)}" y2="${Y(0)}" stroke="#121212" stroke-width="1"/>
        <line x1="${ml}" x2="${ml}" y1="${mt}" y2="${H-mb}" stroke="#dcdfe4" stroke-width="1"/>
        ${yt}${xt}
        <text x="${(ml+W-mr)/2}" y="${H-8}" text-anchor="middle" font-size="11.5" fill="#2a2a2a">Prior Active-Duty Years</text>
        <path d="${path}" fill="none" stroke="#0b2a55" stroke-width="2.5" stroke-linejoin="round"/>
        ${pts.map(q=>`<circle cx="${X(q[0]).toFixed(1)}" cy="${Y(q[1]).toFixed(1)}" r="2.6" fill="#0b2a55"/>`).join('')}
        <circle cx="${youX.toFixed(1)}" cy="${youY.toFixed(1)}" r="7" fill="#b8891a" stroke="#fff" stroke-width="2"/>
        <text x="${Math.min(W-mr-78,youX+13).toFixed(1)}" y="${Math.min(H-mb-6,youY+22).toFixed(1)}" font-size="11.5" font-weight="700" fill="#7a5a08" stroke="#fff" stroke-width="3" paint-order="stroke">You: ${kfmt(dstEdge)}</text>
      </svg>
      <p class="small" style="margin-top:8px">Above the line, the Technician path is worth more over a lifetime. Below it, AGR is worth more, and only if the Guard keeps you on orders the whole way. Every point uses the rest of your entries exactly as you typed them. The gold dot is you.</p>
      <p class="small" style="margin-top:6px">Why the line moves: the more active time you already have, the sooner an AGR reaches 20 and the full-time paychecks stop, while the Technician job keeps paying to age ${mraR}. This tool counts no second job after either path's last day. If you would expect to walk straight into other work, the real gap is smaller than the chart shows.</p>`;
    }
  }

  alignSections();"""
NEW_JS = NEW_JS.replace('${AGR_SHORT_JS}', AGR_SHORT.replace('`', "'"))
rep("\n  alignSections();\n  if(scroll!==false) $('results').scrollIntoView({behavior:'smooth'});", NEW_JS + "\n  if(scroll!==false) $('results').scrollIntoView({behavior:'smooth'});")
rep("function alignSections(){", "document.getElementById('cutBody').addEventListener('change',e=>{ if(e.target&&e.target.id==='cutSel'){ CUT_Y=+e.target.value; render(false); } });\nfunction alignSections(){")

# ---------- print ----------
rep("const px=mk('pPage'); px.appendChild(cloneById('cardGiveup')); px.appendChild(cloneById('cardTaxpayer'));",
    "const px=mk('pPage'); px.appendChild(cloneById('cardGiveup')); px.appendChild(cloneById('cardTaxpayer'));\n"
    "  const px2=mk('pPage'); ['cardCut','cardGraph'].forEach(id=>px2.appendChild(cloneById(id)));\n"
    "  const px3=mk('pPage'); ['cardRights','cardRecord'].forEach(id=>px3.appendChild(cloneById(id)));\n"
    "  px2.querySelectorAll('select').forEach(sel=>{const t=document.createElement('b'); t.textContent=(sel.options[sel.selectedIndex]||{}).text||''; sel.replaceWith(t);});")
rep("[p1,band,pc,pr,px,pe].forEach(x=>root.appendChild(x));", "[p1,band,pc,pr,px2,px,px3,pe].forEach(x=>root.appendChild(x));")

open(dst, 'w', encoding='utf-8').write(s)
print('wrote', dst, len(s))
