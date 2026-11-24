# v1.1 step E: restyle to match reform.local1776.org. Masthead with logo, navy bar with gold rule,
# kicker / headline / deck, the three reform fonts built into the file, reform palette, line icons.
import sys, re, base64, pathlib
p=pathlib.Path(sys.argv[1]); t=p.read_text(encoding='utf-8')
V=pathlib.Path('/home/claude/vendor/node_modules')
def rep(old,new,count=1):
    global t
    assert t.count(old)==count,(t.count(old),old[:90]); t=t.replace(old,new)
def b64(path): return base64.b64encode(pathlib.Path(path).read_bytes()).decode()

# ---------- fonts, built in so the page still contacts nobody ----------
faces=[('Playfair Display',700,'normal','@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2'),
       ('Playfair Display',800,'normal','@fontsource/playfair-display/files/playfair-display-latin-800-normal.woff2'),
       ('Source Serif 4',400,'normal','@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff2'),
       ('Source Serif 4',600,'normal','@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff2'),
       ('Source Serif 4',400,'italic','@fontsource/source-serif-4/files/source-serif-4-latin-400-italic.woff2'),
       ('Libre Franklin',400,'normal','@fontsource/libre-franklin/files/libre-franklin-latin-400-normal.woff2'),
       ('Libre Franklin',500,'normal','@fontsource/libre-franklin/files/libre-franklin-latin-500-normal.woff2'),
       ('Libre Franklin',600,'normal','@fontsource/libre-franklin/files/libre-franklin-latin-600-normal.woff2'),
       ('Libre Franklin',700,'normal','@fontsource/libre-franklin/files/libre-franklin-latin-700-normal.woff2')]
fontcss=''.join(f'@font-face{{font-family:"{n}";font-style:{s};font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{b64(V/f)}) format("woff2")}}\n' for n,w,s,f in faces)

# ---------- icons: single-color line icons, same style as the reform site ----------
P={'user':'<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
 'briefcase':'<path d="M12 12h.01"/><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M22 13a18.15 18.15 0 0 1-20 0"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
 'shield':'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
 'idcard':'<path d="M13 19a4 4 0 0 0-8 0"/><path d="M16 10h2"/><path d="M16 14h2"/><circle cx="9" cy="12" r="3"/><rect x="2" y="5" width="20" height="14" rx="2"/>',
 'calendar':'<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>',
 'users':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
 'filetext':'<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
 'house':'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 'pin':'<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
 'chart':'<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
 'percent':'<line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
 'lock':'<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'}
A='fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
def ico(name,size,extra=''): return f'<svg class="ico" width="{size}" height="{size}" viewBox="0 0 24 24" stroke="currentColor" {A}{extra}>{P[name]}</svg>'
NAVY,T5C,AGRC='#0b2a55','#3f7fb5','#5a6b3b'
def fig(size,color): return f'<svg class="fig" width="{size}" height="{size}" viewBox="0 0 24 24" stroke="{color}" {A}>{P["user"]}</svg>'
def figDst(size,pid): return (f'<svg class="fig" width="{size}" height="{size}" viewBox="0 0 24 24" {A}><defs><clipPath id="{pid}L"><rect x="0" y="0" width="12" height="24"/></clipPath><clipPath id="{pid}R"><rect x="12" y="0" width="12" height="24"/></clipPath></defs>'
    f'<g clip-path="url(#{pid}L)" stroke="{NAVY}">{P["user"]}</g><g clip-path="url(#{pid}R)" stroke="{AGRC}">{P["user"]}</g></svg>')

def sub1(pattern,repl):
    global t
    t,n=re.subn(pattern,lambda m:repl if isinstance(repl,str) else repl(m),t,count=1,flags=re.S); assert n==1,pattern[:70]
for leg,name in (("Let's Start with You",'user'),("Your Civilian Job",'briefcase'),("Your Military Job",'shield')):
    sub1(r'<legend><svg[^>]*>(?:(?!</svg>).)*</svg> '+re.escape(leg)+'</legend>', '<legend>'+ico(name,18,' style="vertical-align:-3px;margin-right:6px"')+leg+'</legend>')
for fid,name in (('fname','idcard'),('age','calendar'),('deps','users'),('filing','filetext'),('state','house'),('mha','pin'),('oha','pin'),('wageArea','chart'),('locPct','percent')):
    sub1(r'(<label class="iconlbl" for="'+fid+r'">)<svg[^>]*>(?:(?!</svg>).)*</svg>', lambda m,name=name: m.group(1)+ico(name,18))
for cls,svg in (('t5v',fig(30,T5C)),('dst',figDst(30,'hd')),('agrv',fig(30,AGRC))):
    sub1(r'(<div class="col '+cls+r'"><div class="colhead">)<svg[^>]*>(?:(?!</svg>).)*</svg>', lambda m,svg=svg: m.group(1)+svg)
sub1(r'const svgDst=p=>`<svg(?:(?!</svg>).)*</svg>`;', 'const svgDst=p=>`'+figDst(28,'${p}')+'`;')
sub1(r'const svgT5=`<svg(?:(?!</svg>).)*</svg>`;', 'const svgT5=`'+fig(28,T5C)+'`;')
sub1(r'const svgAgr=`<svg(?:(?!</svg>).)*</svg>`;', 'const svgAgr=`'+fig(28,AGRC)+'`;')
# favicon: navy square, gold top bar, dollar sign
fav="%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%230b2a55'/%3E%3Crect width='32' height='4' fill='%23b8891a'/%3E%3Ctext x='16' y='25' text-anchor='middle' font-family='Georgia,serif' font-weight='700' font-size='21' fill='%23fff'%3E%24%3C/text%3E%3C/svg%3E"
sub1(r'<link rel="icon" href="data:image/svg\+xml,[^"]*">', '<link rel="icon" href="data:image/svg+xml,'+fav+'">')
n_old=len(re.findall(r'fill="#(?:f4b63f|e8743b|5ec6dd|d64545|c2577e|69b36a|c9b458|c94a4a)"',t)); assert n_old==0, n_old

# ---------- header: masthead, navy bar, kicker / headline / deck ----------
a=t.index('<header>'); b=t.index('</header>')+len('</header>')
deck=re.search(r'<p>(They say AGRs.*?)</p>',t[a:b],re.S).group(1)
logo=b64('/home/claude/reform/source/site/assets/logo.png')
t=t[:a]+f'''<div class="mast">
  <div class="wrap">
    <a href="https://local1776.org/"><img class="logo" src="data:image/png;base64,{logo}" alt="LIUNA Local 1776. We represent U.S. government employees."></a>
    <span class="mast-tag">Technician vs. AGR<br>Pay Calculator</span>
  </div>
</div>

<nav class="nav" aria-label="Site">
  <div class="wrap">
    <a href="#top" aria-current="true">Pay Calculator</a>
    <a href="https://local1776.org/">Local1776.org</a>
  </div>
</nav>

<header class="top" id="top">
  <div class="wrap">
    <div class="kicker">A LIUNA Local 1776 calculator</div>
    <h1>Technician vs. AGR: The Math They Don't Want You to Know</h1>
    <p class="deck">{deck}</p>
    <div class="byline"><span><b>LIUNA Local 1776</b></span><span>Beta v1.1</span><span>2026 pay tables</span><span>Nothing you type leaves your device</span></div>
  </div>
</header>'''+t[b:]
rep('<div class="privacy" style="font-size:.78rem"><strong>Your Privacy:</strong>','<div class="privacy">'+ico('lock',16)+'<div><strong>Your Privacy:</strong>')
rep("All the math happens right here in your browser. Close the page and it's gone.</div>","All the math happens right here in your browser. Close the page and it's gone.</div></div>")

# ---------- old header rules out, palette in ----------
rep("header{background:linear-gradient(135deg,#1F4E79 0%,#2a5f8f 60%,#3f7fb5 100%);color:#fff;padding:24px 16px;margin-bottom:16px}\n","")
rep("header h1{font-size:1.7rem;font-weight:800}\n","")
rep("header p{font-size:.92rem;opacity:.94;margin-top:6px;max-width:920px}\n","")
rep(":root{--navy:#1F4E79;--brown:#6b3a1f;--grey:#595959;--lt:#f4f6f9;--line:#d8dee6;--good:#1a7a3a;--bad:#b02a2a;--warn:#8a6d00;}",
    ':root{--navy:#0b2a55;--gold:#b8891a;--gold-text:#7a5a08;--ink:#121212;--body-ink:#2a2a2a;--muted:#5f6672;--rule:#dcdfe4;--line:#dcdfe4;--grey:#5f6672;--lt:#f6f7f9;--paper:#fbfaf6;--good:#1a6b3a;--bad:#8c1c2c;--warn:#b8891a;--t5:#3f7fb5;--agr:#5a6b3b;--display:"Playfair Display",Georgia,"Times New Roman",serif;--serif:"Source Serif 4",Georgia,"Times New Roman",serif;--sans:"Libre Franklin","Helvetica Neue",Arial,system-ui,sans-serif}')
m=re.search(r'<script id="calcdata" type="application/json">(.*?)</script>',t,re.S)
pre,data,post=t[:m.start(1)],m.group(1),t[m.end(1):]
def recolor(s):
    s=re.sub('#1F4E79','#0b2a55',s,flags=re.I)
    for o,n in (('rgba(31,78,121','rgba(11,42,85'),('rgba(16,42,67','rgba(11,42,85'),('#9db6cc','#9aa6b8'),('linear-gradient(135deg,#0b2a55,#3f7fb5)','#0b2a55'),('linear-gradient(135deg,#b02a2a,#d64545)','#8c1c2c')):
        s=s.replace(o,n)
    return s
t=recolor(pre)+data+recolor(post)
rep("body.printing header,body.printing .wrap>*:not(#printDoc){display:none!important}","body.printing .mast,body.printing .nav,body.printing header,body.printing .wrap>*:not(#printDoc){display:none!important}")

THEME = r'''
/* ===== v1.1 theme: matches reform.local1776.org (masthead, navy bar, type, palette) ===== */
body{font-family:var(--sans);color:var(--ink);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}
.wrap{max-width:1100px;margin:0 auto;padding:0 24px}
body>.wrap{padding-top:26px;padding-bottom:20px}
.mast{background:#fff}
.mast .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:14px;padding-bottom:12px}
.mast a{display:block;max-width:60%}
.logo{height:66px;width:auto;display:block;max-width:100%}
.mast-tag{font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--navy);text-align:right;line-height:1.5}
.nav{position:sticky;top:0;z-index:30;background:var(--navy);border-bottom:1px solid var(--gold)}
.nav .wrap{display:flex;justify-content:flex-start;gap:23px;overflow-x:auto;scrollbar-width:none}
.nav .wrap::-webkit-scrollbar{display:none}
.nav a{color:#fff;text-decoration:none;text-transform:uppercase;white-space:nowrap;font-size:9.8px;line-height:13px;font-weight:400;letter-spacing:.09em;padding:6px 0 4px;border-bottom:2px solid transparent;opacity:.9}
.nav a:hover{opacity:1}
.nav a[aria-current="true"]{font-size:10.5px;font-weight:700;opacity:1;border-bottom-color:var(--gold)}
header.top{padding:36px 0 0}
header.top .kicker{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--navy)}
header.top h1{font-family:var(--display);font-weight:800;font-size:clamp(32px,5.2vw,56px);line-height:1.06;letter-spacing:-.012em;margin:12px 0 16px;text-wrap:balance;max-width:17em;color:var(--ink)}
header.top .deck{font-family:var(--serif);font-size:20px;line-height:1.45;color:var(--body-ink);max-width:62ch;margin:0 0 22px;border:0;padding:0}
header.top .deck b{font-weight:600;color:var(--ink)}
.byline{display:flex;flex-wrap:wrap;gap:6px 0;border-top:1px solid var(--ink);border-bottom:1px solid var(--rule);padding:10px 0;font-size:13px;color:var(--muted)}
.byline span{padding-right:14px;margin-right:14px;border-right:1px solid var(--rule)}
.byline span:last-child{border:0;margin:0;padding:0}
.byline b{color:var(--ink);font-weight:700}
@media (max-width:640px){.wrap{padding:0 16px}header.top{padding-top:26px}header.top .deck{font-size:18px}.logo{height:54px}.mast-tag{font-size:10px}}
.ico{flex:0 0 auto;color:var(--navy)}
.fig{flex:0 0 auto}
.privacy{display:flex;gap:10px;align-items:flex-start;background:var(--paper);border:1px solid var(--rule);border-left:4px solid var(--gold);color:var(--body-ink);border-radius:6px;padding:11px 14px;font-size:.84rem;line-height:1.45;margin-bottom:18px}
.privacy .ico{margin-top:2px;color:var(--gold-text)}
.privacy strong{color:var(--ink)}
fieldset{border:1px solid var(--rule);border-radius:6px;box-shadow:none;padding:16px 18px 18px;margin-bottom:18px}
legend{font-family:var(--display);font-weight:700;font-size:1.2rem;color:var(--ink);padding:0 8px}
.grid label,.grid2 label,.grid3 label,.grid5 label,.iconlbl{font-size:.74rem;font-weight:600;letter-spacing:.01em;color:var(--muted)}
select,input[type=text],input[type=number],input[type=date]{height:36px;padding:6px 10px;border:1px solid #c5cad3;border-radius:4px;font-family:var(--sans);font-size:.9rem;background:#fff;color:var(--ink)}
select:focus,input:focus{border-color:var(--navy);box-shadow:0 0 0 3px rgba(11,42,85,.14)}
select:hover,input:hover{border-color:#9aa6b8}
.hint{color:var(--muted);line-height:1.4}
.callout{border:1px solid var(--rule);border-left:4px solid var(--navy);background:#fff;border-radius:6px;box-shadow:none;padding:16px 20px;margin-bottom:18px;font-family:var(--serif);font-size:1.02rem;line-height:1.5;color:var(--body-ink)}
.callout.warn{border-left-color:var(--gold)}
.callout h3{font-family:var(--display);font-weight:700;font-size:1.35rem;line-height:1.15;color:var(--ink);margin-bottom:8px}
.callout b{color:var(--ink);font-weight:600}
.callout .small,.callout .sub,.callout table,.callout .statcard,.callout .kicker,.callout .rotHint,.callout .ack,.callout .plain,.callout .segbtn,.callout .delta{font-family:var(--sans)}
.callout .statcard b,.callout table b,.callout .plain b{font-weight:700}
#readFirst{border-left-color:var(--muted)!important}
.ack{font-size:.88rem;font-weight:600;color:var(--ink)}
.ack input{accent-color:var(--navy)}
.kicker{font-size:.7rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-text)}
.headline{font-family:var(--display);font-weight:800;font-size:clamp(1.9rem,4.4vw,2.7rem);line-height:1.05;letter-spacing:-.01em;color:var(--navy);margin:6px 0 10px}
.deck{font-family:var(--serif);font-size:1.14rem;line-height:1.45;color:var(--body-ink);border-bottom:1px solid var(--ink);padding-bottom:12px}
.statcards{gap:12px;margin:12px 0}
.statcard,.statcard.sc-t5,.statcard.sc-agr{background:#fff;border:1px solid var(--rule);border-top:3px solid var(--navy);border-radius:6px;padding:12px 14px;gap:12px}
.statcard.sc-t5{border-top-color:var(--t5)}
.statcard.sc-agr{border-top-color:var(--agr)}
.statcard.win{background:var(--paper);border:1px solid var(--navy);border-top:3px solid var(--gold);box-shadow:0 0 0 1px var(--navy)}
.statcard .lb{font-size:.66rem;font-weight:700;letter-spacing:.12em;color:var(--muted)}
.statcard .amt{font-family:var(--display);font-weight:700;font-size:1.55rem;line-height:1.15;font-variant-numeric:lining-nums tabular-nums}
.statcard .sub{color:var(--muted);font-variant-numeric:tabular-nums}
.cols{gap:14px;margin-bottom:18px}
.col{border:1px solid var(--rule);border-top:3px solid var(--navy);border-radius:6px;box-shadow:none}
.col.t5v{border-top-color:var(--t5)}
.col.agrv{border-top-color:var(--agr)}
.colhead{background:#fff;border-bottom:1px solid var(--rule);padding:12px 14px;gap:12px}
.colhead b{font-family:var(--display);font-weight:700;font-size:1.14rem;color:var(--ink)}
.colhead .small{color:var(--muted)}
.sec{padding:12px 14px}
.sec h3{font-size:.66rem;font-weight:700;letter-spacing:.12em;color:var(--gold-text);margin-bottom:8px}
.row{font-size:.86rem}
.row .val{font-variant-numeric:tabular-nums}
.sub{color:var(--muted)}
.big{font-family:var(--display);font-weight:700;font-size:1.4rem;line-height:1.15;font-variant-numeric:lining-nums tabular-nums}
.t5v .big{color:var(--t5)}
.agrv .big{color:var(--agr)}
.plain{background:var(--lt);border-radius:4px;color:var(--body-ink);line-height:1.45}
.small{color:var(--muted)}
table.cmp{font-size:.86rem;font-variant-numeric:tabular-nums}
table.cmp th,table.cmp td{border:1px solid var(--rule);padding:7px 10px}
table.cmp th{background:var(--lt);color:var(--navy);font-weight:700}
button{background:var(--navy);color:#fff;border:0;border-top:3px solid var(--gold);border-radius:5px;box-shadow:none;font-family:var(--sans);font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:12px 26px;transition:background .12s}
button:hover{background:#12386e;transform:none;box-shadow:none}
button.deny{background:var(--bad)}
.segbtn{background:#fff;color:var(--navy);border:1px solid var(--navy);border-radius:0;padding:7px 16px;font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.segbtn:hover{background:var(--lt)}
.segbtn.active,.segbtn.active:hover{background:var(--navy);color:#fff}
.segbtn:first-of-type{border-radius:4px 0 0 4px}.segbtn:last-of-type{border-radius:0 4px 4px 0}
.segsm{padding:5px 10px;font-size:.64rem}
#btnPrint{border-radius:4px!important}
#careerVerdict,#careerVerdictB{font-family:var(--serif);font-weight:600!important;color:var(--ink)!important;font-size:1.05rem!important}
#scenAHead,#scenBHead{font-family:var(--sans);color:var(--navy)}
.pathrow{gap:12px;margin-bottom:10px}
.pathrow svg{margin-top:1px}
.delta.pos{color:var(--good)}.delta.neg{color:var(--bad)}
details{border:1px solid var(--rule);border-radius:6px;margin-bottom:18px}
details summary{font-family:var(--display);font-weight:700;font-size:1.1rem;color:var(--ink);padding:13px 16px}
details .inner{font-family:var(--serif);font-size:.95rem;line-height:1.5;color:var(--body-ink);padding:0 18px 16px}
footer{border-top:1px solid var(--ink);margin-top:22px;padding:14px 0;font-size:.75rem;line-height:1.5;color:var(--muted)}
#results{scroll-margin-top:40px}
#printDoc .pTitle,#printDoc .pBandTitle{font-family:var(--display)}
#printDoc .statcard{padding:4pt 6pt;gap:5pt}
#printDoc .statcard .amt{line-height:1.2}
#printDoc .callout{padding:6pt 9pt}
'''
a=t.index('</style>\n</head>')
t=t[:a]+fontcss+THEME+t[a:]
for bad in ('—','\\u2014','–','#1F4E79','#1f4e79'): assert bad not in t, bad
p.write_text(t,encoding='utf-8'); print('step E ok',len(t))
