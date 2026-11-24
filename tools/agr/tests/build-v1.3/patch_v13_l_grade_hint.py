#!/usr/bin/env python3
"""v1.3 step L: Military Grade gets a hint (pick the grade you hold today), and the fine print says how a former officer
now serving as enlisted or warrant is treated. No math change.
Usage: python3 patch_v13_l_grade_hint.py index_k.html index_l.html"""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, f'expected {count}, found {n}: {old[:90]!r}'
    s = s.replace(old, new)
rep('<div><label for="grade">Military Grade</label><select id="grade"></select></div>',
    '<div><label for="grade">Military Grade</label><select id="grade"></select><div class="hint">Pick the grade you currently hold.</div></div>')
rep("Warrant officers need only the 20.</li>",
    "Warrant officers need only the 20. A former officer who now serves as enlisted or warrant picks the grade held today and is treated under that grade's rules: 20 years of active service, with the earlier commissioned time counting toward the 20.</li>")
open(dst,'w',encoding='utf-8').write(s); print('wrote',dst,len(s))
