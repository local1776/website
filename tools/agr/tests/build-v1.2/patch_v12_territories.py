# v1.2: territory income tax. Guam and the U.S. Virgin Islands are mirror systems (the territory collects the
# federal-style tax in place of the IRS). Puerto Rico taxes federal pay under its own schedule and credits the
# federal tax on the same pay. Sources: IRS Publication 570 (2025); 41 CFR 302-17.44; Puerto Rico Treasury rates.
import sys, pathlib
p=pathlib.Path(sys.argv[1]); t=p.read_text(encoding='utf-8')
def rep(old,new,count=1):
    global t
    assert t.count(old)==count,(t.count(old),old[:90]); t=t.replace(old,new)
# data
rep('"PR":{"name":"Puerto Rico","rate":0.25,"adExempt":false,"adStatus":"taxable","milRetExempt":false,"fersExempt":false}',
    '"PR":{"name":"Puerto Rico","rate":0,"prTax":true,"adExempt":false,"adStatus":"taxable","milRetExempt":false,"fersExempt":false}')
rep('"GU":{"name":"Guam","rate":0.22,"adExempt":false,"adStatus":"taxable","milRetExempt":false,"fersExempt":false}',
    '"GU":{"name":"Guam","rate":0,"mirror":true,"adExempt":false,"adStatus":"taxable","milRetExempt":false,"fersExempt":false}')
rep('"VI":{"name":"U.S. Virgin Islands","rate":0.22,"adExempt":false,"adStatus":"taxable","milRetExempt":false,"fersExempt":false}',
    '"VI":{"name":"U.S. Virgin Islands","rate":0,"mirror":true,"adExempt":false,"adStatus":"taxable","milRetExempt":false,"fersExempt":false}')
rep('"ssWageBase2026":184500','"ssWageBase2026":184500,"pr":{"brackets":[[0,0,9000],[0.07,9000,25000],[0.14,25000,41500],[0.25,41500,61500],[0.33,61500,null]],"exemption":{"single":3500,"married":7000},"discountLimit":100000,"discountLow":0.92,"discountHigh":0.95}')
# engine
rep("  const state = stateRule(D,inp).rate * Math.max(0, sw - pretaxDeductions);",
"""  const rule = stateRule(D,inp);
  let state;
  if(rule.mirror){
    // Guam, U.S. Virgin Islands: mirror tax systems. A resident pays the territory the same tax the IRS
    // would collect, in place of the IRS. The figure in `fed` is that tax. Nothing is added on top.
    state = 0;
  } else if(rule.prTax && D.tax.pr){
    // Puerto Rico: federal civilian and military pay is taxed by both. Puerto Rico credits the federal tax
    // paid on the same pay, so the member ends up paying the higher of the two, not the sum.
    const P = D.tax.pr;
    const prNet = Math.max(0, sw - pretaxDeductions - P.exemption[inp.filing]);
    const prTax = bracketTax(prNet, P.brackets) * (sw <= P.discountLimit ? P.discountLow : P.discountHigh);
    state = Math.max(0, prTax - fed);
  } else {
    state = rule.rate * Math.max(0, sw - pretaxDeductions);
  }""")
# UI: say what the income tax line means in a territory
rep("function row(l,v,cls){","""function terrHint(inp){
  const r=stateRule(D,inp);
  if(r.mirror) return '<div class="hint">'+r.name+' residents pay this tax to '+(r.name.indexOf('U.S.')===0?'the ':'')+r.name+' in place of the IRS. Same rates, one return.</div>';
  if(r.prTax) return '<div class="hint">Puerto Rico taxes this pay too and credits the federal tax paid on it. You pay the higher of the two, not both.</div>';
  return '';
}
function row(l,v,cls){""")
rep("Your drill and AT money is state-tax-free above.</div>':'')}","Your drill and AT money is state-tax-free above.</div>':terrHint(inp))}")
rep("doesn\\'t tax active-duty military pay, already reflected above.</div>':'')}","doesn\\'t tax active-duty military pay, already reflected above.</div>':terrHint(inp))}")
# methodology, footer, version
rep("Puerto Rico, Guam, and the U.S. Virgin Islands use their territorial rates as estimates. Territorial filing is genuinely different, so treat those results as rougher.",
    "Guam and the U.S. Virgin Islands run mirror tax systems: a resident pays the territory the same tax the IRS would collect, in place of the IRS, so no second tax is added. Puerto Rico taxes federal civilian and military pay under its own rates (0% to 33% after a $3,500 personal exemption, $7,000 for a married couple, less the 8% reduction for income of $100,000 or less) and credits the federal tax paid on the same pay, so the tool charges the higher of the two. Dependent exemptions and itemized deductions are not counted. Treat territory results as estimates.")
rep("(Federal Register, Nov. 10, 2025); IRS Rev. Proc. 2025-32;","(Federal Register, Nov. 10, 2025); IRS Rev. Proc. 2025-32; territory tax rules per IRS Publication 570 (2025), with Puerto Rico rates from the Puerto Rico Treasury;")
rep("<span>Beta v1.1</span>","<span>Version 1.2</span>")
rep("Beta v1.1, published by LIUNA Local 1776.","Version 1.2, published by LIUNA Local 1776.")
for bad in ('—','\\u2014','–'): assert bad not in t, bad
p.write_text(t,encoding='utf-8'); print('v1.2 territory patch ok',len(t))
