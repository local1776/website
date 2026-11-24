# v1.1 step C: print layout hardening + popup-blocked print fallback fix
import sys, pathlib
p=pathlib.Path(sys.argv[1]); t=p.read_text(encoding='utf-8')
def rep(old,new):
    global t
    assert t.count(old)==1,(t.count(old),old[:80]); t=t.replace(old,new)
rep(".hide{display:none}\n",
"""/* v1.1: page 1 of the printout. The fine-print footer sits at the bottom when there is room and follows the text when there is not, so it can never cover a line. */
#printDoc .pPage.first{display:flex;flex-direction:column}
#printDoc .fineprint{position:static;margin-top:auto}
#printDoc .statcard .sub{font-size:5.8pt;line-height:1.25}
#printDoc .callout>p{margin-top:3pt!important}
#printDoc .threePaths{font-size:7.6pt}
#printDoc .threePaths .pathrow{margin-bottom:2pt}
.hide{display:none}
""")
# popup blocked: the fallback attached the printout inside the hidden page header, which printed a blank page
rep("document.querySelector('.wrap').appendChild(built);","document.querySelector('body > .wrap').appendChild(built);")
p.write_text(t,encoding='utf-8'); print('ok')
