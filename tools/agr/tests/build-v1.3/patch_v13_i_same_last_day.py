#!/usr/bin/env python3
"""v1.3 step I: same last day. When the AGR path (best case) would run past the technician's Minimum Retirement Age,
the technician and Title 5 columns run to that same day, never past 60, so both sides work the same number of years.
An orders-cut what-if does not shorten the technician's career.
Usage: python3 patch_v13_i_same_last_day.py index_h.html index_i.html"""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, f'expected {count}, found {n}: {old[:90]!r}'
    s = s.replace(old, new)

# ---- engine ----
rep("// ---------- v1.3: Social Security and TSP growth (estimates) ----------",
"""// v1.3 same last day: the technician works to Minimum Retirement Age, or to the day the AGR path would end in its best case
// when that is later (an AGR who cannot reach 20 serves to 60). Never past 60. A cut-orders what-if does not change it.
function techEndAge(D, inp){
  const mra = mraFor(inp.age);
  const best = agrTwenty(D, Object.assign({}, inp, {cutYears:null}));
  return Math.max(mra, Math.min(60, inp.age + best.serve));
}
// ---------- v1.3: Social Security and TSP growth (estimates) ----------""")
rep("const cy=Math.max(2, Math.min(42, Math.round(mraFor(i.age) - i.age)));", "const cy=Math.max(2, Math.min(42, Math.round(techEndAge(D,i) - i.age)));")
rep("  const mra = mraFor(inp.age);\n  const yrsWork = Math.max(0, mra - inp.age); // civilians: most favorable, work to their MRA",
    "  const mraLaw = mraFor(inp.age);            // FERS Minimum Retirement Age\n"
    "  const mra = techEndAge(D, inp);            // the technician's last working age (MRA, or the AGR path's last day when that is later)\n"
    "  const techExtended = mra > mraLaw + 0.01;\n"
    "  const yrsWork = Math.max(0, mra - inp.age);")
rep("inp.civYears >= 30 ? mra : (inp.civYears >= 20 ? 60 : 62)", "inp.civYears >= 30 ? mraLaw : (inp.civYears >= 20 ? 60 : 62)")
rep("techRetAge,techResStartAge,defFersStartAge,adFull,", "techRetAge,techResStartAge,defFersStartAge,adFull,mraLaw,techExtended,")
rep("const cy = Math.max(2, Math.min(42, Math.round(mraFor(inp.age||35) - (inp.age||35)))); // horizon: to their actual MRA",
    "const cy = Math.max(2, Math.min(42, Math.round(techEndAge(D,inp) - (inp.age||35)))); // horizon: the technician's last working age")
rep("module.exports={brsRate,", "module.exports={techEndAge,brsRate,")

# ---- page ----
rep("you draw a full paycheck to your Minimum Retirement Age (${mraR}).</b>",
    "you draw a full paycheck to ${retD.techExtended?`age ${mraR}, the same day the AGR path would end`:`your Minimum Retirement Age (${mraR})`}.</b>")
rep("The civilian columns assume you work to your Minimum Retirement Age: ${mraR} for you, figured from your birth year.",
    "${retD.techExtended?`The civilian columns assume you work to age ${mraR}, the same last day as the AGR path, so both sides work the same number of years.`:`The civilian columns assume you work to your Minimum Retirement Age: ${mraR} for you, figured from your birth year.`}")
rep("all the way to ${mraR} and beyond, possibly to 60.", "all the way to ${mraR}${mraR<60?' and beyond, possibly to 60':''}.")
rep("<b>Career-length assumptions:</b> the Technician works to Minimum Retirement Age.",
    "<b>Career-length assumptions:</b> the Technician works to Minimum Retirement Age, or to the same day the AGR path would end when that is later, so neither side gets extra years.")
rep("Civilian calculations are based on your Minimum Retirement Age (shown in the title above).",
    "Civilian calculations run to your Minimum Retirement Age, or to the AGR path's last day when that is later (the age is in the title above).")
rep("  <li>The Bottom Line: adds two things",
    "  <li>Same last day: when the AGR path would run past your Minimum Retirement Age (an AGR who cannot reach 20 years of active service serves to 60), the technician and Title 5 columns run to that same day, never past 60. Both sides work the same number of years.</li>\n"
    "  <li>The Bottom Line: adds two things")
open(dst,'w',encoding='utf-8').write(s); print('wrote',dst,len(s))
