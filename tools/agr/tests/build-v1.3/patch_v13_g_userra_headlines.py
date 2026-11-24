#!/usr/bin/env python3
"""v1.3 step G: (1) the way back. House bill H.R. 8800 sec. 1105(e): a technician whose position converts to AGR waives
reemployment under 38 U.S.C. 4314 to another dual-status technician position; a claim to a Title 5 or Title 10 civilian
position remains only "if a similar position is reasonably available". (2) Headlines scaled to the size of the lead.
Usage: python3 patch_v13_g_userra_headlines.py index_f.html index_g.html"""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, f'expected {count}, found {n}: {old[:90]!r}'
    s = s.replace(old, new)

# headlines sized to the lead
rep("hlTxt=pick(['NOT EVEN CLOSE','A LANDSLIDE','THE MATH JUST VOTED','SIX FIGURES OF DAYLIGHT']);",
    "hlTxt=dstEdge>=500000?pick(['NOT EVEN CLOSE','THE TECHNICIAN WINS GOING AWAY'])\n"
    "         :dstEdge>=250000?pick(['THE TECHNICIAN WINS THE LONG GAME','THE MATH FAVORS THE TECHNICIAN'])\n"
    "         :pick(['THE TECHNICIAN COMES OUT AHEAD','ADVANTAGE: TECHNICIAN']);")

# the way back
WAY = ("  gu.push(`<li><b>The way back.</b> As the House bill is written, a Technician whose position converts to AGR signs away the right to be reemployed in another dual-status Technician position. "
       "What is left is a claim to a Title 5 or Title 10 civilian job, and only \"if a similar position is reasonably available.\" If your orders are cut, your Technician job is not coming back. "
       "<span class=\"small\">H.R. 8800, section 1105(e); 38 U.S.C. § 4314.</span></li>`);\n")
rep("  gu.push(`<li><b>Your union, for good.</b>", WAY + "  gu.push(`<li><b>Your union, for good.</b>")
rep("Your old Technician job would not be waiting for you. The choices stop",
    "Your old Technician job would not be waiting for you: as the House bill is written, converting waives your right to be reemployed as a dual-status Technician (H.R. 8800, section 1105(e)). The choices stop")
rep("you'd have no outside appeal, and your Technician job would not be waiting for you.",
    "you'd have no outside appeal, and as the House bill is written you would have signed away your right to come back to a Technician job.")
rep("  <li>Deployments are not modeled.",
    "  <li>The way back: section 1105(e) of the House defense bill (H.R. 8800) says a technician whose position is converted to AGR waives reemployment under 38 U.S.C. § 4314 to another dual-status technician position, and may claim a civilian position under Title 5 or Title 10 only if a similar position is reasonably available. That is the House text. The final bill could differ.</li>\n"
    "  <li>Deployments are not modeled.")
open(dst,'w',encoding='utf-8').write(s); print('wrote',dst,len(s))
