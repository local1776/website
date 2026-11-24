#!/usr/bin/env python3
"""v1.3 step H: "The way back" says in plain words what the fallback is and who controls it (10 U.S.C. 10508(b):
National Guard civilian employees are appointed, employed and administered by the adjutant general).
Usage: python3 patch_v13_h_way_back.py index_g.html index_h.html"""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, f'expected {count}, found {n}: {old[:90]!r}'
    s = s.replace(old, new)
rep('What is left is a claim to a Title 5 or Title 10 civilian job, and only "if a similar position is reasonably available." If your orders are cut, your Technician job is not coming back. <span class="small">H.R. 8800, section 1105(e); 38 U.S.C. § 4314.</span>',
    'What is left is a claim to a regular federal civilian job, with no Guard membership attached, and only "if a similar position is reasonably available." In the Guard, those civilian jobs are hired and run by the Adjutant General, the same office that would have ended your orders. If your orders are cut, your Technician job is not coming back. <span class="small">H.R. 8800, section 1105(e); 38 U.S.C. § 4314; 10 U.S.C. § 10508(b).</span>')
rep("and may claim a civilian position under Title 5 or Title 10 only if a similar position is reasonably available. That is the House text.",
    "and may claim a civilian position under Title 5 or Title 10 only if a similar position is reasonably available. The Title 10 positions named are defense intelligence jobs (10 U.S.C. § 1601), acquisition demonstration jobs (§ 1762), and National Guard civilian jobs that the adjutants general appoint and administer (§ 10508). That is the House text.")
open(dst,'w',encoding='utf-8').write(s); print('wrote',dst,len(s))
