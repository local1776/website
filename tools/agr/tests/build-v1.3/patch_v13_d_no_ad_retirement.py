#!/usr/bin/env python3
"""v1.3 step D: members who cannot reach 20 years of active service before 60.
The result leads with that fact, gives retirement and working years as two separate answers, states the bet in plain
words, and labels the AGR-path pension for what it is. No math changes.
Usage: python3 patch_v13_d_no_ad_retirement.py index_c.html index_d.html"""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, f'expected {count}, found {n}: {old[:90]!r}'
    s = s.replace(old, new)

rep("  let hlTxt,deckTxt;\n  if(dstEdge>=100000){",
r"""  let hlTxt,deckTxt;
  const n1=v=>Math.round(v*10)/10;
  if(!t20.reachableBy60){
    // can't finish 20 years of active service before 60: there is no active-duty retirement on the table
    const halfCut=Math.max(1,Math.round(t20.serve/2));
    const cutEdge=allInD-lifetime(D,{...iD,cutYears:halfCut}).agrAll;
    hlTxt='NO ACTIVE-DUTY RETIREMENT';
    deckTxt=`${nm?nm+', on':'On'} your numbers, converting to AGR never gets you an active-duty retirement. It takes 20 years of active service. You have ${n1(inp.priorAD)}, and you'd reach age 60 with about ${n1(retH.adAt60)}. What you'd retire on is the same Guard pension a drilling member draws at 60, plus a FERS pension frozen at today's pay.
    <br><br>${retEdge>=0?`<b>In retirement, staying a Technician is worth about ${roundK(retEdge)} more.</b>`:`In retirement, the AGR path comes out about ${roundK(-retEdge)} ahead, because each AGR year adds 365 points to that Guard pension.`}
    ${workEdge<0?`<b>While you're working, AGR would pay about ${roundK(-workEdge)} more</b>, and only if the Guard keeps you on orders for all ${n1(t20.serve)} years.`:`<b>While you're working, the Technician job pays about ${roundK(workEdge)} more.</b>`}
    <br><br><b>That is ${n1(t20.serve)} years of rolling the dice.</b> Nothing guarantees them. Your orders can be cut at any time, you'd have no outside appeal, and your Technician job would not be waiting for you.${cutEdge>0?` Cut after ${halfCut} year${halfCut>1?'s':''}, you'd end up about <b>${roundK(cutEdge)}</b> behind where the Technician job would have put you.`:''}`;
  } else if(dstEdge>=100000){""")
rep("`Starts at ${ageTxt(retD.agrPenStartAge)}, points formula`", "`Guard retirement at ${ageTxt(retD.agrPenStartAge)}, not an active-duty retirement`")
open(dst,'w',encoding='utf-8').write(s); print('wrote',dst,len(s))
