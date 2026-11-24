#!/usr/bin/env python3
"""v1.3 step F: optional TSP balance boxes (civilian and military). The balance is the member's on every path, so it is
not part of the Bottom Line and does not change the comparison; when entered, the retirement table adds one row showing
what the whole TSP could be worth at 60 on each path. Also: with no first name, the Bottom Line addresses "You".
Usage: python3 patch_v13_f_tsp_balance.py index_e.html index_f.html"""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, f'expected {count}, found {n}: {old[:90]!r}'
    s = s.replace(old, new)

HINT = "It's yours on every path, so it doesn't change who comes out ahead. Enter it to see what your whole TSP could be worth at 60."
rep('<div class="hint">What YOU actually put in. Check your LES. (5% earns the full government match.)</div></div>',
    '<div class="hint">What YOU actually put in. Check your LES. (5% earns the full government match.)</div></div>\n'
    '  <div><label for="tspBalCiv">Civilian TSP Balance ($): Optional</label><input type="number" id="tspBalCiv" min="0" step="1" placeholder="Optional"><div class="hint">' + HINT + '</div></div>')
rep('<div class="hint">What you actually put in from drill/AT/AD basic pay. Check your LES.</div></div>',
    '<div class="hint">What you actually put in from drill/AT/AD basic pay. Check your LES.</div></div>\n'
    '  <div><label for="tspBalMil">Military TSP Balance ($): Optional</label><input type="number" id="tspBalMil" min="0" step="1" placeholder="Optional"><div class="hint">' + HINT + '</div></div>')
rep("depMonths:clamp($('depMonths').value,0,240,0),", "depMonths:clamp($('depMonths').value,0,240,0), tspBal:clamp($('tspBalCiv').value,0,1e8,0)+clamp($('tspBalMil').value,0,1e8,0),")
rep("  if(isFinite(t1) && t1>100) problems.push(", "  for(const id of ['tspBalCiv','tspBalMil']) if(String($(id).value).trim()!=='' && !(+$(id).value>=0)) problems.push(`${id==='tspBalCiv'?'Civilian':'Military'} TSP Balance can't be less than zero. Leave it blank if you'd rather not enter it.`);\n  if(isFinite(t1) && t1>100) problems.push(")
# one extra row when a balance was entered
rep("<td><b>${fmt(pkgOf(retD).civ)}</b></td><td><b>${fmt(pkgOf(retT).civ)}</b></td><td><b>${fmt(pkgOf(retD).agr)}</b></td></tr>`;",
    "<td><b>${fmt(pkgOf(retD).civ)}</b></td><td><b>${fmt(pkgOf(retT).civ)}</b></td><td><b>${fmt(pkgOf(retD).agr)}</b></td></tr>${inp.tspBal>0?`\n"
    "    <tr><td>Your Whole TSP at Age 60<span class=\"sub\">Today's ${fmt(inp.tspBal)} + new money + growth · estimate, today's dollars · not part of the package above</span></td>"
    "<td>${fmt(tspAt60(retH.techTsp.emp+retH.techTsp.gov+retH.techTspGrowth))}</td><td>${fmt(tspAt60(retHT.techTsp.emp+retHT.techTsp.gov+retHT.techTspGrowth))}</td><td>${fmt(tspAt60(retH.agrTsp.emp+retH.agrTsp.gov+retH.agrTspGrowth))}</td></tr>`:''}`;")
rep("  const gapYrs = retD.agrActive ? Math.max(0,mraR-retD.agrRetAge) : 0;",
    "  const gapYrs = retD.agrActive ? Math.max(0,mraR-retD.agrRetAge) : 0;\n"
    "  const tspAt60=newMoney=>inp.tspBal*Math.pow(1.04,Math.max(0,60-inp.age))+newMoney; // the balance grows at the same 4% a year above inflation on every path")
rep("Your current TSP balance isn't asked for: it is yours on every path and grows the same on every path, so it would not change the comparison.",
    "Your current TSP balance is optional. It is yours on every path and grows the same on every path, so it is not in the totals and does not change the comparison. Enter it and this table adds a row showing what your whole TSP could be worth at 60.")
rep("Your current TSP balance is not asked for and not counted: it's already yours, it goes with you on every path, and it would add the same amount to all three columns.",
    "Your current TSP balance is optional and is not in the Bottom Line: it's already yours, it goes with you on every path, and it would add the same amount to all three columns. If you enter it, the retirement table shows it growing at the same 4% a year to age 60 on every path.")
# no first name: address "You"
rep("<div class=\"kicker\">The Bottom Line${nm?` · ${nm}, for ${depsTxt}`:''}</div>", "<div class=\"kicker\">The Bottom Line${nm?` · ${nm}, for ${depsTxt}`:` · For ${depsTxt}`}</div>")
open(dst,'w',encoding='utf-8').write(s); print('wrote',dst,len(s))
