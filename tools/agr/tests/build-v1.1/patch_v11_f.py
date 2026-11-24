import sys, pathlib
p=pathlib.Path(sys.argv[1]); t=p.read_text(encoding='utf-8')
def rep(old,new,count=1):
    global t
    assert t.count(old)==count,(t.count(old),old[:90]); t=t.replace(old,new)
rep('<tr><td>Total Pension Money<span class="sub">Age 60 to 85</span></td>','<tr><td>Total Pension Money<span class="sub">Through age 85</span></td>')
rep("    ${govRowHTML(3,null)}</div>`;","    ${govRowHTML(3,'Health Care, Government Share','TRICARE Prime, no premium for you or your family','All of it','pos')}</div>`;")
rep(".statcard .sub{color:var(--muted);font-variant-numeric:tabular-nums}",".statcard .amt{margin:3px 0 4px}\n.statcard .sub{color:var(--muted);font-variant-numeric:tabular-nums}")
p.write_text(t,encoding='utf-8'); print('step F ok')
