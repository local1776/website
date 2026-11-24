#!/usr/bin/env python3
"""v1.3 step N: the prior rank category question was tried and dropped (it changed no numbers). This step keeps only
the fine-print sentence about advancement on the retired list, and the plainer heading on the missing-box message.
Usage: python3 patch_v13_n_fine_print.py index_l.html index_n.html"""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, f'expected {count}, found {n}: {old[:90]!r}'
    s = s.replace(old, new)
rep("<h3>Every Box Is Used in the Math</h3>", "<h3>Every Box Needs an Answer</h3>")
rep("A former officer who now serves as enlisted or warrant picks the grade held today and is treated under that grade's rules: 20 years of active service, with the earlier commissioned time counting toward the 20.</li>",
    "A former officer who now serves as enlisted or warrant picks the grade held today and is treated under that grade's rules: 20 years of active service, with the earlier commissioned time counting toward the 20. A retired enlisted member or warrant officer can later be advanced on the retired list to the highest grade served in on active duty, once active service plus time on the retired list totals 30 years (10 U.S.C. §§ 7344, 9344). That advancement is not counted here, so a former officer's or warrant's pension could be higher than shown. Ask your retirement services office.</li>")
open(dst,'w',encoding='utf-8').write(s); print('wrote',dst,len(s))
