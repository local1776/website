#!/usr/bin/env python3
"""v1.3 step E: TSP details.
Engine: BRS government money follows the BRS rules on both paths: automatic 1% from the start, matching only after 2 years
of service, and nothing after 26 years of service (DoD Guide to the Uniformed Services Blended Retirement System).
Page: warns a member with under 3 civilian years about the unvested automatic 1%; says why the current TSP balance is not
asked for; says the leave double dip during deployments is left out.
Usage: python3 patch_v13_e_tsp.py index_d.html index_e.html"""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, f'expected {count}, found {n}: {old[:90]!r}'
    s = s.replace(old, new)

rep("function techYear(D, inp, yos, step){",
"""// BRS government TSP money: automatic 1% (from 60 days of service), matching only after 2 years of service,
// and both stop after 26 years of service. yos is the service already completed at the start of the year.
function brsRate(p, yos){
  const on = Math.max(0, Math.min(1, 26 - yos));
  const matchOn = Math.max(0, Math.min(1, yos - 1));
  return on * (0.01 + matchOn * (matchRate(p) - 0.01));
}
function techYear(D, inp, yos, step){""")
rep("const govTSPmil = inp.retsys==='brs' ? matchRate(mP) * milTaxable : 0;  // BRS matches drill pay too",
    "const govTSPmil = inp.retsys==='brs' ? brsRate(mP, yos) * milTaxable : 0;  // BRS matches drill pay too, within the BRS service limits")
rep("const govTSP = inp.retsys==='brs' ? matchRate(mP)*base : 0;", "const govTSP = inp.retsys==='brs' ? brsRate(mP, yos)*base : 0;")
rep("module.exports={futureStreams,", "module.exports={brsRate,matchRate,futureStreams,")

# page
rep("BRS gets the same structure on military basic pay only.", "BRS gets the same structure on military basic pay only, with matching starting after 2 years of service and all BRS government money ending after 26 years of service.")
rep("${govRowHTML(0,'TSP Match','BRS Only: On Basic Pay, Never on BAH/BAS',", "${govRowHTML(0,'TSP Match','BRS Only: On Basic Pay, Never on BAH/BAS<br>Ends After 26 Years of Service',")
rep("to age 60, the same rate on every path. <b>The AGR column is a best case.</b>",
    "to age 60, the same rate on every path. Your current TSP balance isn't asked for: it is yours on every path and grows the same on every path, so it would not change the comparison. <b>The AGR column is a best case.</b>")
rep("  gu.push(`<li><b>Two pension checks instead of one.</b>",
    "  if(inp.civYears<3) gu.push(`<li><b>Part of your TSP.</b> With under 3 years of federal civilian service you are not yet vested in the automatic 1% your agency puts in your TSP. Leave federal civilian service before 3 years and that money and its earnings go back to the TSP. Your own contributions and the matching money stay yours.</li>`);\n"
    "  gu.push(`<li><b>Two pension checks instead of one.</b>")
rep("(When technicians do deploy, they draw the same active-duty pay and allowances an AGR does for those days.)</li>",
    "(When technicians do deploy, they draw the same active-duty pay and allowances an AGR does for those days.) A deployed technician can also keep drawing civilian pay for the days covered by military leave or annual leave. This tool counts that double dip only for the 15 annual training days, which shorts the technician columns.</li>")
rep("Left out, and it would favor the civilian columns: survivor benefits, per-diem on orders.", "Left out, and it would favor the civilian columns: survivor benefits, per-diem on orders, civilian pay drawn on leave during deployments.")
open(dst,'w',encoding='utf-8').write(s); print('wrote',dst,len(s))
