"""Version 1.3, step A: engine only.
Adds: orders-cut what-if (cutYears), full FERS pension at MRA with 30 years, the FERS supplement,
earlier Guard pension age for qualifying duty after Jan. 28, 2008, Social Security and TSP growth estimates.
Usage: python3 patch_v13_a_engine.py in.html out.html
"""
import sys, re
src, out = sys.argv[1], sys.argv[2]
h = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global h
    c = h.count(old)
    assert c == n, f'expected {n} of {old[:70]!r}, found {c}'
    h = h.replace(old, new)

# 1. agrTwenty: how long the AGR actually serves, and whether the 20-year retirement was earned
rep("""  const pension = mult * 20 * mbRet * 12;
  return {yrsNeeded, retAge, pension, mbRet, reachableBy60: retAge <= 60};
}""", """  const pension = mult * 20 * mbRet * 12;
  // v1.3: best case is service to 20 active years, or to mandatory removal at 60 when 20 is out of reach.
  // inp.cutYears is the "orders cut" what-if: the tour is curtailed or not renewed after that many years.
  const cut = (inp.cutYears==null) ? Infinity : Math.max(0, +inp.cutYears);
  const serve = Math.max(0, Math.min(yrsNeeded, 60 - inp.age, cut));
  const earned = serve >= yrsNeeded; // finished 20 active years
  return {yrsNeeded, retAge, pension, mbRet, reachableBy60: retAge <= 60, serve, earned, pensionEarned: earned?pension:0};
}
// ---------- v1.3: Social Security and TSP growth (estimates) ----------
const SS_BEND=[1286,7749];   // 2026 PIA bend points (SSA)
const SS_YEARS=18;           // benefit counted from 67 through 85
const TSP_REAL_GROWTH=0.04;  // assumed yearly TSP growth after inflation
function ssPIA(aime){ return 0.9*Math.min(aime,SS_BEND[0]) + 0.32*Math.max(0,Math.min(aime,SS_BEND[1])-SS_BEND[0]) + 0.15*Math.max(0,aime-SS_BEND[1]); }
function futureStreams(D, inp){
  const i=Object.assign({},inp,{cola:0});
  const cy=Math.max(2, Math.min(42, Math.round(mraFor(i.age) - i.age)));
  const t20=agrTwenty(D,i);
  const tech={ss:[],tsp:[]}, agr={ss:[],tsp:[]};
  for(let y=0;y<cy;y++){ const step=i.paysys==='GS'?nextStepGS(i.cstep,y):nextStepFWS(i.cstep,y); const t=techYear(D,i,i.yos+y,step); tech.ss.push(t.gross); tech.tsp.push(t.tspEmp+t.govTSP); }
  for(let y=0;y<t20.serve;y++){ const a=agrYear(D,i,i.yos+y); agr.ss.push(a.base); agr.tsp.push(a.tspEmp+a.govTSP); } // FICA is paid on basic pay only
  // earnings already on the record are the same on every path: years as a technician at today's pay, earlier years at 60% of it
  const t0=techYear(D,i,i.yos,i.cstep).gross; const past=[];
  for(let k=0;k<Math.max(0,Math.round(i.age)-20);k++) past.push(k<i.civYears ? t0 : 0.6*t0);
  const pia=fut=>{ const top=past.concat(fut).sort((a,b)=>b-a).slice(0,35); return ssPIA(top.reduce((s,x)=>s+x,0)/420); };
  const grow=arr=>arr.reduce((s,c,y)=>s + c*(Math.pow(1+TSP_REAL_GROWTH, Math.max(0, 60-i.age-y-0.5)) - 1), 0);
  return {cy, techPIA:pia(tech.ss), agrPIA:pia(agr.ss), techTspGrowth:grow(tech.tsp), agrTspGrowth:grow(agr.tsp)};
}""")

# 2. career: AGR pay stops when the AGR stops serving; pension checks only if 20 years were earned
rep("    if(y < t20.yrsNeeded){ // still serving AGR", "    if(y < t20.serve){ // still serving AGR")
rep("""      aGross+=t20.pension*f; aTake+=t20.pension*0.9*f; aPensionYrs++;
      aGrossPen+=t20.pension*f; aTakePen+=t20.pension*0.9*f;""", """      aGross+=t20.pensionEarned*f; aTake+=t20.pensionEarned*0.9*f; aPensionYrs++;
      aGrossPen+=t20.pensionEarned*f; aTakePen+=t20.pensionEarned*0.9*f;""")

# 3. retirement
rep("  if(t20.reachableBy60){\n    agrActive=true;", "  if(t20.earned){\n    agrActive=true;")
rep("(inp.priorAD + yrsTo60)", "(inp.priorAD + t20.serve)")
rep("monthlyBase(D,inp.grade,inp.yos+yrsTo60) * Math.pow(1+cola,yrsTo60) * 12", "monthlyBase(D,inp.grade,inp.yos+t20.serve) * Math.pow(1+cola,t20.serve) * 12")
rep("""  const techLifetime = gser(fersAnnual + techResAnnual, 25);
  const agrLifetime = gser(agrPensionAnnual, Math.max(0,85-agrRetAge)) + defFers*23;""", """  // v1.3: Guard (non-regular) pension starts 3 months sooner for each 90 days of qualifying duty after Jan. 28, 2008, never below age 50 (10 U.S.C. 12731(f))
  const early = Math.min(10, Math.floor(Math.max(0,inp.depMonths||0)/3)*0.25);
  const resStartAge = 60 - early;
  // v1.3: with 30 years of civilian service at MRA the FERS pension is immediate and unreduced; otherwise it is postponed to 60 as before
  const fersImmediate = civYearsTotal >= 30;
  const fersStartAge = fersImmediate ? Math.min(60, mra) : 60;
  const techLifetime = gser(fersAnnual, 85 - fersStartAge) + gser(techResAnnual, 25 + early);
  const agrPenStartAge = t20.earned ? agrRetAge : resStartAge;
  const agrLifetime = gser(agrPensionAnnual, t20.earned ? Math.max(0,85-agrRetAge) : 25 + early) + defFers*23;
  // v1.3: Social Security (67 through 85), TSP growth, and the FERS supplement (paid from an immediate unreduced retirement to 62)
  const fs = futureStreams(D, inp);
  const ssTech = fs.techPIA*12*SS_YEARS, ssAgr = fs.agrPIA*12*SS_YEARS;
  const fersSuppMonthly = (fersImmediate && fersStartAge < 62) ? 0.70*fs.techPIA*Math.min(civYearsTotal,40)/40 : 0;
  const fersSuppLife = fersSuppMonthly*12*Math.max(0, 62 - fersStartAge);""")
rep("""  const civHealthLife = gser(civHealthAnnual*Math.pow(1+cola,yrsTo60), 25);""", """  const bridgeHealth = fersImmediate ? Math.max(0, 60 - fersStartAge)*fehbOwn : 0; // FEHB premiums from an immediate retirement until 60
  const civHealthLife = gser(civHealthAnnual*Math.pow(1+cola,yrsTo60), 25) + bridgeHealth;""")
rep("""          fehbOwn,triFee,guardRetiree,civHealthAnnual,civHealthLife,agrHealthLife};""", """          fehbOwn,triFee,guardRetiree,civHealthAnnual,civHealthLife,agrHealthLife,
          early,resStartAge,fersImmediate,fersStartAge,agrPenStartAge,bridgeHealth,
          ssTech,ssAgr,ssTechMonthly:fs.techPIA,ssAgrMonthly:fs.agrPIA,fersSuppMonthly,fersSuppLife,
          techTspGrowth:fs.techTspGrowth,agrTspGrowth:fs.agrTspGrowth};""")

# 4. lifetime
rep("  const agrWorkYrs = t20.reachableBy60 ? t20.yrsNeeded : Math.max(0, 60 - i.age);", "  const agrWorkYrs = t20.serve;")
rep("""  const civRet = r.techLifetime + r.techTsp.gov - r.civHealthLife;
  const agrRet = r.agrLifetime + r.agrTsp.gov - r.agrHealthLife;""", """  const civRet = r.techLifetime + r.fersSuppLife + r.techTsp.gov + r.techTspGrowth + r.ssTech - r.civHealthLife;
  const agrRet = r.agrLifetime + r.agrTsp.gov + r.agrTspGrowth + r.ssAgr - r.agrHealthLife;""")
rep("module.exports={lifetime,compute,", "module.exports={futureStreams,ssPIA,lifetime,compute,")
open(out, 'w', encoding='utf-8').write(h)
print('engine patched ->', out)
