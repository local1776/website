#!/usr/bin/env python3
"""v1.3 step K: officers are asked for both halves of their active-duty time: years as enlisted or warrant, and years as a
commissioned officer. The two must add up to Prior Active-Duty Years. The results flag a mismatch between the enlisted
time entered and the O-1E/O-2E/O-3E pay grades (37 U.S.C. 203(d): over 4 years of active enlisted or warrant service, or
more than 1,460 points). No engine change.
Usage: python3 patch_v13_k_officer_split.py index_j.html index_k.html"""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, f'expected {count}, found {n}: {old[:90]!r}'
    s = s.replace(old, new)

rep('<div id="commWrap" class="hide"><label for="commAD">Active-Duty Years as a Commissioned Officer</label><input type="number" id="commAD" min="0" max="30" step="0.1" placeholder="Years, 0 if none"><div class="hint">Officers only. Count just the active-duty time you served as an officer: officer training, annual training, deployments, AGR time. It is part of your Prior Active-Duty Years. An officer\'s active-duty retirement takes 20 active years, and 10 of them have to be commissioned.</div></div>',
    '<div id="enlWrap" class="hide"><label for="enlAD">Active-Duty Years as Enlisted or Warrant</label><input type="number" id="enlAD" min="0" max="30" step="0.1" placeholder="Years, 0 if none"><div class="hint">Officers only. The part of your Prior Active-Duty Years you served before you were commissioned: basic, tech school, annual training, deployments. Active duty only, not drill years.</div></div>\n'
    '  <div id="commWrap" class="hide"><label for="commAD">Active-Duty Years as a Commissioned Officer</label><input type="number" id="commAD" min="0" max="30" step="0.1" placeholder="Years, 0 if none"><div class="hint">Officers only. The part of your Prior Active-Duty Years you served as an officer. Active duty only: twelve years as a drilling officer is not twelve years here. An officer\'s active-duty retirement takes 20 active years, and 10 of them have to be commissioned.</div></div>')
rep("commAD:clamp($('commAD').value,0,40,0),", "commAD:clamp($('commAD').value,0,40,0), enlAD:clamp($('enlAD').value,0,40,0),")
rep("function syncComm(){ $('commWrap').classList.toggle('hide', !isOfficerGrade());", "function syncComm(){ $('commWrap').classList.toggle('hide', !isOfficerGrade()); $('enlWrap').classList.toggle('hide', !isOfficerGrade());")
rep("const REQ=['commAD','age',", "const REQ=['enlAD','commAD','age',")
rep("const LABEL={commAD:'Active-Duty Years as a Commissioned Officer',", "const LABEL={enlAD:'Active-Duty Years as Enlisted or Warrant',commAD:'Active-Duty Years as a Commissioned Officer',")
rep("""  if(isOfficerGrade() && (blank('commAD') || !isFinite(+$('commAD').value))) missing.push('commAD');
  if(isOfficerGrade() && !blank('commAD')){ const c=+$('commAD').value, p=num('priorAD');
    if(c<0) problems.push(`Active-Duty Years as a Commissioned Officer can't be less than zero.`);
    else if(isFinite(p) && c>p) problems.push(`Your commissioned active-duty years (${Math.round(c*10)/10}) can't be more than your Prior Active-Duty Years (${Math.round(p*10)/10}). They are part of that number, not on top of it.`); }""",
"""  if(isOfficerGrade()){
    for(const id of ['enlAD','commAD']) if(blank(id) || !isFinite(+$(id).value)) missing.push(id);
    const c=num('commAD'), e=num('enlAD'), p=num('priorAD'), r=v=>Math.round(v*10)/10;
    if(isFinite(e) && e<0) problems.push(`Active-Duty Years as Enlisted or Warrant can't be less than zero.`);
    if(isFinite(c) && c<0) problems.push(`Active-Duty Years as a Commissioned Officer can't be less than zero.`);
    if(isFinite(c) && isFinite(e) && isFinite(p) && c>=0 && e>=0 && Math.abs(e+c-p)>0.25)
      problems.push(`Your enlisted or warrant active-duty years (${r(e)}) and your commissioned active-duty years (${r(c)}) add up to ${r(e+c)}, but you entered ${r(p)} Prior Active-Duty Years. Those have to match. All three boxes count active duty only, not drill years.`);
  }""")
rep("    $('softNote').innerHTML=notes.length?",
    "    if(/^O-[123]$/.test(inp.grade) && inp.enlAD>4) notes.push(`You entered ${inp.enlAD} years of enlisted or warrant active duty. With more than 4, an ${inp.grade} is paid at the higher ${inp.grade}E rate. If your LES shows ${inp.grade}E, change Military Grade to ${inp.grade}E and run it again.`);\n"
    "    if(/^O-[123]E$/.test(inp.grade) && inp.enlAD<=4) notes.push(`You picked ${inp.grade}. That pay rate takes more than 4 years of enlisted or warrant active duty, or more than 1,460 retirement points earned as enlisted or warrant. You entered ${inp.enlAD} years. Check your LES to be sure ${inp.grade} is your pay grade.`);\n"
    "    $('softNote').innerHTML=notes.length?")
rep("When you pick an officer grade the tool asks for your commissioned active-duty years and runs the AGR path until both are met.",
    "When you pick an officer grade the tool asks how much of your active-duty time was enlisted or warrant and how much was commissioned, checks that the two add up to your Prior Active-Duty Years, and runs the AGR path until both conditions are met. Officers in O-1 through O-3 with over 4 years of active enlisted or warrant service, or more than 1,460 points, are paid at the O-1E, O-2E and O-3E rates (37 U.S.C. § 203(d)); pick that grade if it is on your LES.")
open(dst,'w',encoding='utf-8').write(s); print('wrote',dst,len(s))
