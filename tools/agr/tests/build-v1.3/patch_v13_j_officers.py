#!/usr/bin/env python3
"""v1.3 step J: officers. An officer's active-duty retirement takes 20 years of active service, at least 10 of them as a
commissioned officer (10 U.S.C. 7311, 9311). When an officer grade is picked, the form asks for commissioned active-duty
years, and the AGR path runs until both conditions are met. Warrant officers and enlisted members are unaffected.
Usage: python3 patch_v13_j_officers.py index_i.html index_j.html"""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, f'expected {count}, found {n}: {old[:90]!r}'
    s = s.replace(old, new)

# ---- engine ----
rep("""  const yrsNeeded = Math.max(0, 20 - inp.priorAD);
  const retAge = inp.age + yrsNeeded;
  const yosAtRet = inp.yos + yrsNeeded;
  const mbRet = monthlyBase(D, inp.grade, yosAtRet);
  const mult = inp.retsys==='brs'?D.params.brsMult:D.params.legacyMult;
  const pension = mult * 20 * mbRet * 12;""",
"""  // Officers: 20 years of active service, at least 10 of them as a commissioned officer (10 U.S.C. 7311, 9311).
  const isOfficer = /^O-/.test(inp.grade||'');
  const yrsFor20 = Math.max(0, 20 - inp.priorAD);
  const commNeed = isOfficer ? Math.max(0, 10 - Math.max(0, +inp.commAD||0)) : 0;
  const yrsNeeded = Math.max(yrsFor20, commNeed);
  const commBinds = commNeed > yrsFor20 + 1e-9;
  const retAge = inp.age + yrsNeeded;
  const yosAtRet = inp.yos + yrsNeeded;
  const mbRet = monthlyBase(D, inp.grade, yosAtRet);
  const mult = inp.retsys==='brs'?D.params.brsMult:D.params.legacyMult;
  const pension = mult * Math.max(20, inp.priorAD + yrsNeeded) * mbRet * 12; // 20 years, or more when the commissioned-service rule adds years""")
rep("return {yrsNeeded, retAge, pension, mbRet, reachableBy60: retAge <= 60, serve, earned, pensionEarned: earned?pension:0};",
    "return {yrsNeeded, retAge, pension, mbRet, reachableBy60: retAge <= 60, serve, earned, pensionEarned: earned?pension:0, isOfficer, commNeed, commBinds, yrsFor20};")

# ---- page: the box ----
HINT = "It's yours on every path, so it doesn't change who comes out ahead. Enter it to see what your whole TSP could be worth at 60."
rep('<div><label for="tspBalMil">Military TSP Balance ($): Optional</label><input type="number" id="tspBalMil" min="0" step="1" placeholder="Optional"><div class="hint">' + HINT + '</div></div>',
    '<div><label for="tspBalMil">Military TSP Balance ($): Optional</label><input type="number" id="tspBalMil" min="0" step="1" placeholder="Optional"><div class="hint">' + HINT + '</div></div>\n'
    '  <div id="commWrap" class="hide"><label for="commAD">Active-Duty Years as a Commissioned Officer</label><input type="number" id="commAD" min="0" max="30" step="0.1" placeholder="Years, 0 if none"><div class="hint">Officers only. Count just the active-duty time you served as an officer: officer training, annual training, deployments, AGR time. It is part of your Prior Active-Duty Years. An officer\'s active-duty retirement takes 20 active years, and 10 of them have to be commissioned.</div></div>')
rep("depMonths:clamp($('depMonths').value,0,240,0),", "depMonths:clamp($('depMonths').value,0,240,0), commAD:clamp($('commAD').value,0,40,0),")
rep("const REQ=['age',", "const isOfficerGrade=()=>/^O-/.test($('grade').value||'');\nfunction syncComm(){ $('commWrap').classList.toggle('hide', !isOfficerGrade()); if(typeof alignFormRows==='function') alignFormRows(); }\n$('grade').addEventListener('change', syncComm); syncComm();\nconst REQ=['commAD','age',")
rep("const LABEL={age:", "const LABEL={commAD:'Active-Duty Years as a Commissioned Officer',age:")
rep("  if($('state').value && needMha && !$('mha').value) missing.push('mha');",
    "  if(isOfficerGrade() && (blank('commAD') || !isFinite(+$('commAD').value))) missing.push('commAD');\n"
    "  if(isOfficerGrade() && !blank('commAD')){ const c=+$('commAD').value, p=num('priorAD');\n"
    "    if(c<0) problems.push(`Active-Duty Years as a Commissioned Officer can't be less than zero.`);\n"
    "    else if(isFinite(p) && c>p) problems.push(`Your commissioned active-duty years (${Math.round(c*10)/10}) can't be more than your Prior Active-Duty Years (${Math.round(p*10)/10}). They are part of that number, not on top of it.`); }\n"
    "  if($('state').value && needMha && !$('mha').value) missing.push('mha');")

# ---- page: results text ----
rep("${t20.reachableBy60?' to reach 20 years of active service':' to reach age 60'}",
    "${t20.reachableBy60?(t20.commBinds?' to have both 20 active years and the 10 commissioned years an officer needs':' to reach 20 years of active service'):' to reach age 60'}")
rep("(${t20.yrsNeeded} more years).</b>", "(${Math.round(t20.yrsNeeded*10)/10} more years).</b>${t20.commBinds?` As an officer you also need 10 years of commissioned active service, and that is what sets your date.`:''}")
rep("`Starts at age ${retD.agrRetAge}, 20 yrs active`", "`Starts at age ${retD.agrRetAge}, ${Math.round(Math.max(20,inp.priorAD+t20.yrsNeeded)*10)/10} yrs active`")
rep("It takes 20 years of active service. You have ${n1(inp.priorAD)}, and you'd reach age 60 with about ${n1(retH.adAt60)}.",
    "It takes 20 years of active service${t20.isOfficer?', and for an officer 10 of them have to be commissioned':''}. You have ${n1(inp.priorAD)}${t20.isOfficer?` (${n1(inp.commAD)} commissioned)`:''}, and you'd reach age 60 with about ${n1(retH.adAt60)}.")
rep("  <li>Same last day:",
    "  <li>Officers: an officer's active-duty retirement takes 20 years of active service, at least 10 of them as a commissioned officer (10 U.S.C. §§ 7311, 9311). When you pick an officer grade the tool asks for your commissioned active-duty years and runs the AGR path until both are met. An officer who reaches 20 active years without 10 commissioned may be able to retire in an enlisted or warrant grade; that is not modeled. Warrant officers need only the 20.</li>\n"
    "  <li>Same last day:")
open(dst,'w',encoding='utf-8').write(s); print('wrote',dst,len(s))
