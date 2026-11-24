import asyncio, base64, io, pathlib, segno
from playwright.async_api import async_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).parent
# Nov 22 2026: the site moved to www.local1776.org/reform (the old address forwards there, keeping #guard), so printed
# handouts with the old code still work. New handouts carry the new address.
URL = "https://www.local1776.org/reform"
URL_SHOWN = "local1776.org/reform"
F = ROOT / "node_modules/@fontsource"
def font(fam, path, weight, style="normal"):
    b = base64.b64encode((F / path).read_bytes()).decode()
    return "@font-face{font-family:'%s';font-weight:%s;font-style:%s;src:url(data:font/woff2;base64,%s) format('woff2')}" % (fam, weight, style, b)
FONTS = "".join([
    font("Playfair Display", "playfair-display/files/playfair-display-latin-700-normal.woff2", 700),
    font("Playfair Display", "playfair-display/files/playfair-display-latin-800-normal.woff2", 800),
    font("Source Serif 4", "source-serif-4/files/source-serif-4-latin-400-normal.woff2", 400),
    font("Source Serif 4", "source-serif-4/files/source-serif-4-latin-600-normal.woff2", 600),
    font("Source Serif 4", "source-serif-4/files/source-serif-4-latin-400-italic.woff2", 400, "italic"),
    font("Libre Franklin", "libre-franklin/files/libre-franklin-latin-400-normal.woff2", 400),
    font("Libre Franklin", "libre-franklin/files/libre-franklin-latin-600-normal.woff2", 600),
    font("Libre Franklin", "libre-franklin/files/libre-franklin-latin-700-normal.woff2", 700),
])
import os
# the logo and Chrome can be pointed at with HANDOUT_LOGO / CHROME (defaults: the original build machine)
LOGO = "data:image/png;base64," + base64.b64encode(pathlib.Path(os.environ.get("HANDOUT_LOGO", "/home/claude/cbsite/assets/logo_src.png")).read_bytes()).decode()
buf = io.BytesIO(); segno.make(URL, error="m").save(buf, kind="png", scale=10, border=1, dark="#0b2a55")
QR = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

CSS = """
@page{size:8.5in 11in;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:'Libre Franklin',Arial,sans-serif;color:#121212;font-size:9.3pt;line-height:1.38;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:8.5in;height:11in;padding:.42in .5in .38in;display:flex;flex-direction:column}
.mast{display:flex;justify-content:space-between;align-items:center;padding-bottom:9px;border-bottom:3px solid #0b2a55}
.mast img{height:44px}
.mast div{text-align:right;font-size:7.6pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#0b2a55;line-height:1.5}
.mast div span{display:block;font-weight:600;color:#b45f00}
.gold{height:2px;background:#ff9e0b;margin-top:2px}
.kicker{font-size:7.6pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#b45f00;margin-top:13px}
h1{font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:19.5pt;line-height:1.1;letter-spacing:-.01em;margin:5px 0 7px}
.deck{font-family:'Source Serif 4',Georgia,serif;font-size:11pt;line-height:1.4;color:#2a2a2a;margin:0 0 10px;max-width:6.9in}
.stats{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #121212;border-bottom:1px solid #dcdfe4;margin-bottom:11px}
.stats div{padding:8px 12px;border-left:1px solid #dcdfe4}
.stats div:first-child{border-left:0;padding-left:0}
.stats b{display:block;font-family:'Playfair Display',Georgia,serif;font-size:19pt;line-height:1;color:#0b2a55}
.stats span{display:block;font-size:7.6pt;line-height:1.35;color:#555d6b;margin-top:4px}
.cols{display:grid;grid-template-columns:1.12fr 1fr;gap:.3in;flex:1;min-height:0}
.cols.even{grid-template-columns:1fr 1fr;flex:0 0 auto}
h2{font-size:8pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#0b2a55;border-top:2px solid #0b2a55;padding-top:6px;margin:0 0 5px}
h2.sp{margin-top:11px}
ul{margin:0;padding:0;list-style:none}
li{font-family:'Source Serif 4',Georgia,serif;font-size:10pt;line-height:1.4;color:#2a2a2a;padding:4.5px 0;border-top:1px solid #dcdfe4}
li:first-child{border-top:0;padding-top:1px}
li b{font-family:'Libre Franklin',Arial,sans-serif;font-size:8.8pt;color:#121212}
.ask{background:#0b2a55;color:#fff;border-top:3px solid #ff9e0b;border-radius:5px;padding:11px 14px 12px;margin-bottom:11px}
.ask h3{font-family:'Playfair Display',Georgia,serif;font-size:15pt;line-height:1.1;margin:0 0 6px}
.ask ol{margin:0;padding-left:1.25em}
.ask li{color:#fff;border:0;padding:2.5px 0;font-size:10.2pt}
.quiet{font-family:'Source Serif 4',Georgia,serif;font-size:9.7pt;line-height:1.4;color:#2a2a2a;margin:0}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:7.2pt;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#555d6b;padding:0 8px 4px 0;border-bottom:1px solid #121212}
td{font-family:'Source Serif 4',Georgia,serif;font-size:9.5pt;line-height:1.35;color:#2a2a2a;padding:5.5px 8px 5.5px 0;border-bottom:1px solid #dcdfe4;vertical-align:top}
td.p{font-family:'Libre Franklin',Arial,sans-serif;font-size:8.6pt;font-weight:700;color:#121212;width:1.55in}
table.est{margin:2px 0 6px;border-top:2px solid #0b2a55}
table.est th{font-size:7.4pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#555d6b;text-align:right;padding:5px 0 3px}
table.est td{font-size:8.4pt;padding:4px 0 4px 7px;border-top:1px solid #dcdfe4;text-align:right;font-variant-numeric:lining-nums tabular-nums;color:#121212}
table.est td:first-child{text-align:left;font-weight:600;color:#2a2a2a;padding-right:6px}
table.est td:last-child,table.est th:last-child{font-weight:700;color:#0b2a55;padding-left:8px}
table.glance td{padding:3.5px 8px 3.5px 0;font-size:9.3pt}
table.glance{border-top:2px solid #0b2a55}
table.glance th{padding-top:6px}
.tight li{padding:3.5px 0;font-size:9.7pt}
td.p span{display:block;font-size:7pt;letter-spacing:.1em;text-transform:uppercase;color:#b45f00;font-weight:700}
.claims{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:16px .3in;align-content:start}
.claim{border-top:2px solid #0b2a55;padding-top:6px}
.claim .l{font-size:7pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#555d6b}
.claim h3{font-family:'Playfair Display',Georgia,serif;font-size:13.4pt;line-height:1.18;margin:2px 0 4px}
.claim p{font-family:'Source Serif 4',Georgia,serif;font-size:10.6pt;line-height:1.42;color:#2a2a2a;margin:0}
.claim p b{font-family:'Libre Franklin',Arial,sans-serif;font-size:7pt;letter-spacing:.12em;text-transform:uppercase;color:#0b2a55;margin-right:4px}
.strip{border-top:1px solid #121212;border-bottom:1px solid #dcdfe4;padding:8px 0;margin-top:10px;display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.strip div{font-size:8pt;line-height:1.35;color:#555d6b}
.strip b{display:block;font-family:'Playfair Display',Georgia,serif;font-size:13pt;color:#0b2a55;line-height:1.1}
.foot{display:flex;gap:14px;align-items:center;border-top:3px solid #0b2a55;padding-top:9px;margin-top:11px}
.foot img{width:.92in;height:.92in}
.foot .t{flex:1}
.foot .t b{display:block;font-family:'Playfair Display',Georgia,serif;font-size:12.5pt;line-height:1.15;white-space:nowrap}
.foot .t .u{font-size:10pt;font-weight:700;color:#0b2a55;margin-top:2px}
.foot .t .s{font-size:7.4pt;color:#555d6b;margin-top:4px;line-height:1.4}
.foot .c{text-align:right;font-size:8pt;line-height:1.45;color:#2a2a2a}
.foot .c b{display:block;font-size:8.6pt;color:#121212}
"""

def qr(url):
    b = io.BytesIO(); segno.make(url, error="m").save(b, kind="png", scale=10, border=1, dark="#0b2a55")
    return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()

FOOT_S = "Scan the code with a phone camera. Every figure and quotation on this page is sourced on the site. The bill language is a discussion draft and has not been reviewed by legislative counsel."

def page(num, label, body, mast="Federal Collective Bargaining Reform", sub=None, qrsrc=None, shown=None, foot_h="Read the full record, sources and draft text", foot_s=None):
    return """<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>%s</title><style>%s%s</style></head><body><div class="page">
<div class="mast"><img src="%s" alt="LIUNA Local 1776"><div>%s<span>%s</span></div></div><div class="gold"></div>
%s
<div class="foot"><img src="%s" alt="QR code"><div class="t"><b>%s</b><div class="u">%s</div><div class="s">%s</div></div><div class="c"><b>LIUNA Local 1776</b>Ben Banchs<br>Business Manager-Secretary Treasurer<br>We represent U.S. government employees</div></div>
</div></body></html>""" % (label, FONTS, CSS, LOGO, mast, sub or ("%s of 3 &middot; %s" % (num, label)), body, qrsrc or QR, foot_h, shown or URL_SHOWN, foot_s or FOOT_S)

P1 = """
<div class="kicker">5 U.S.C. Chapter 71 &middot; Federal collective bargaining</div>
<h1>One signature took bargaining rights from a million federal workers. Congress can make sure it never happens again.</h1>
<p class="deck">A national security exception written for intelligence agencies was used in 2025 to pull most of the federal government out of the collective bargaining law. Cancelling the orders is not enough.</p>
<div class="stats">
<div><b>1,066,423</b><span>union-represented federal workers lost bargaining rights, counting TSA</span></div>
<div><b>40+</b><span>agencies and subdivisions excluded by one order on March 27, 2025</span></div>
<div><b>34.8%</b><span>of the workforce still in a bargaining unit in June 2026, down from about 56%</span></div>
<div><b>231&ndash;195</b><span>House vote to cancel the orders in December 2025, with 20 Republicans voting yes</span></div>
</div>
<div class="cols">
<div>
<h2>What happened</h2>
<ul>
<li>Executive Order 14251 declared that more than 40 agencies and offices have a &ldquo;primary function&rdquo; of national security work. The list includes the VA, the EPA and the FDA. A second order added the National Weather Service and NASA.</li>
<li>Contracts were cancelled in the middle of their terms. Grievances were dropped. Dues deductions were shut off.</li>
<li>Police, firefighters and Customs and Border Protection kept their rights. The White House fact sheet said certain unions had &ldquo;declared war on President Trump&rsquo;s agenda.&rdquo;</li>
</ul>
<h2 class="sp">Why a new executive order will not fix it</h2>
<ul>
<li>Every gain made by executive order has been erased by the next president who wanted it gone. Only a statute outlasts an election.</li>
<li>The House-passed Protect America&rsquo;s Workforce Act (H.R. 2550) cancels the two orders. It does not change the section of law that allowed them, so the next president could do it again.</li>
</ul>
<h2 class="sp">What the rewrite leaves alone</h2>
<p class="quiet">Federal employees still cannot strike. Congress still sets pay. Managers keep their emergency authority. The FBI, the CIA and the NSA stay outside the law.</p>
</div>
<div>
<div class="ask"><h3>The ask</h3><ol>
<li>Bar funding for Executive Orders 14251 and 14343 in every appropriations bill and in the defense bill.</li>
<li>Cosponsor a rewrite of Chapter 71, the Federal Workforce Bargaining Rights Protection Act.</li></ol></div>
<h2>What the rewrite does</h2>
<ul>
<li><b>Narrows the exception.</b> Written findings for each unit, approval by Congress, court review, a four-year limit, no delegation.</li>
<li><b>Adds enforcement.</b> A right to sue, injunctions, penalties, and full make-whole relief when an agency breaks the law.</li>
<li><b>Protects the referees.</b> The labor board keeps working when seats are empty, and deadlocks go to neutral arbitrators.</li>
<li><b>Makes contracts hold.</b> No order can void a signed agreement, and agencies can be compelled to arbitrate.</li>
<li><b>Restores what was taken.</b> Voids the 2025 orders and reinstates the contracts.</li>
</ul>
</div>
</div>"""

P2 = """
<div class="kicker">Discussion draft &middot; Rewrite of 5 U.S.C. Chapter 71</div>
<h1>The Federal Workforce Bargaining Rights Protection Act</h1>
<p class="deck">Seven issues in the federal bargaining law, and how the bill closes each one.</p>
<table class="glance">
<tr><th>Issue</th><th>The problem</th><th>The fix</th></tr>
<tr><td class="p"><span>Issue 1</span>Who is covered</td><td>One order excluded about two-thirds of the workforce as &ldquo;national security.&rdquo;</td><td>A narrow exception that Congress must approve and courts can review. TSA officers covered.</td></tr>
<tr><td class="p"><span>Issue 2</span>What can be bargained</td><td>Subjects switch on and off by executive order. The labor board rewrote the rules in 2020.</td><td>The scope of bargaining is fixed in the statute. No order may void a signed contract.</td></tr>
<tr><td class="p"><span>Issue 3</span>The referees</td><td>The labor board&rsquo;s chair was fired. Its prosecutor&rsquo;s seat has had no confirmed occupant since 2017.</td><td>An automatic acting General Counsel, deadlines for every case, neutral arbitrators for deadlocks.</td></tr>
<tr><td class="p"><span>Issue 4</span>Enforcement</td><td>An agency that breaks the law is told to stop and post a notice.</td><td>A right to sue, injunctions, civil penalties, make-whole relief, discipline for officials.</td></tr>
<tr><td class="p"><span>Issue 5</span>Contracts and arbitration</td><td>In 2025 agencies stopped processing grievances and declined to arbitrate.</td><td>Courts can compel arbitration. Arbitrators&rsquo; awards get deference.</td></tr>
<tr><td class="p"><span>Issue 6</span>Union operations</td><td>Official time was capped by order. Dues withholding was shut off.</td><td>Both are locked against limits imposed by order or guidance.</td></tr>
<tr><td class="p"><span>Issue 7</span>Restoration</td><td>The 2025 orders cancelled contracts covering hundreds of thousands of employees.</td><td>Voids the orders and restores every agreement in effect on March 26, 2025.</td></tr>
</table>
<div class="cols even tight" style="margin-top:9px">
<div>
<h2>Section 7103(b) today</h2>
<p class="quiet" style="margin-bottom:8px">The president &ldquo;determines&rdquo; that an agency does national security work. No findings, no notice, no review, no time limit.</p>
<h2>Section 7103(b) under the draft</h2>
<ul>
<li><b>Units, not departments.</b> An order may cover a subdivision, never a whole department.</li>
<li><b>Findings in writing.</b> A majority of the unit&rsquo;s employees must do intelligence or national security work.</li>
<li><b>Congress decides.</b> An order lapses unless Congress approves it by joint resolution within 180 days.</li>
</ul>
</div>
<div>
<h2>Continued</h2>
<ul>
<li><b>No retaliation.</b> An order cannot rest on a union&rsquo;s lawsuits, grievances or politics.</li>
<li><b>Recognized units.</b> Extra findings are required before employees already in a bargaining unit can be excluded.</li>
<li><b>Court review.</b> Contracts continue while a federal court reviews the order fresh, with the burden on the government.</li>
<li><b>Limits.</b> An order expires after four years and cannot be delegated.</li>
</ul>
</div>
</div>
<div class="cols even" style="margin-top:9px;flex:0 0 auto">
<div><h2>Status of the draft</h2><p class="quiet">Statutory text is drafted for Issue 1 (sections 2 to 5 of the draft): an amended section 7103(b) and a new section 7136. Section 6 voids the 2025 orders. The other issues are in outline.</p></div>
<div><h2>What the bill leaves alone</h2><p class="quiet">The ban on strikes. Congress&rsquo;s control of pay. Management&rsquo;s emergency authority. The job-by-job exclusion for security positions. The statutory exclusion of the FBI, the CIA and the NSA.</p></div>
</div>"""

def claim(c, r):
    return '<div class="claim"><div class="l">The claim</div><h3>%s</h3><p><b>The record</b>%s</p></div>' % (c, r)
P3 = """
<div class="kicker">Federal collective bargaining &middot; Answers to common objections</div>
<h1>What critics claim, and what the record shows</h1>
<p class="deck">The case against federal bargaining comes mostly from the Heritage Foundation, its Project 2025 and the White House fact sheet on the 2025 orders. Here are the main arguments next to the facts.</p>
<div class="claims">
""" + claim("Nobody lost the right to join a union. Only bargaining ended.", "A union that cannot bargain, file a grievance or go to arbitration is a club. Agencies were told to stop honoring grievances and stop deducting dues.") \
    + claim("Official time costs taxpayers more than $300 million a year.", "OPM&rsquo;s own reports put the payroll cost between $135 million and $177 million a year from fiscal 2012 through 2019, about one-tenth of one percent of federal pay and benefits. It exists because the law requires a union to represent every employee, member or not, at no charge.") \
    + claim("This is about national security.", "Police, firefighters and Customs and Border Protection kept their rights. The White House fact sheet complained that unions were fighting the president&rsquo;s agenda. TSA granted bargaining in 2011 because poor morale was hurting security.") \
    + claim("Even FDR opposed bargaining in the federal government.", "His 1937 letter was about strikes, which are still illegal for federal workers. Congress then watched bargaining work under Kennedy, Johnson, Nixon and Ford for 16 years and made it law in 1978.") \
    + claim("Unions should not be able to obstruct an elected president.", "Congress is elected too, and Congress wrote the bargaining law. That law reserves hiring, firing, budget and mission to management, and lets managers act first in an emergency.") \
    + claim("Presidents of both parties have used this exception.", "True. Carter used it first, in 1979. For 45 years the list was intelligence offices and a few law enforcement units. In 2025 it became about two-thirds of the federal workforce.") + """
</div>
<div class="strip">
<div><b>1962</b>Kennedy grants the first bargaining rights by executive order</div>
<div><b>1969</b>Nixon expands the program and creates its machinery</div>
<div><b>1975</b>Ford widens what can be bargained</div>
<div><b>1978</b>Congress writes bargaining into law and calls it &ldquo;in the public interest&rdquo;</div>
<div><b>2025</b>Twenty House Republicans vote to restore the rights taken that year</div>
</div>"""

P4 = """
<div class="kicker">Fiscal 2027 defense bill &middot; H.R. 8800 section 1105 &middot; S. 4784 section 513</div>
<h1>Ending the National Guard technician program costs more and fixes nothing</h1>
<p class="deck">The defense bill would replace about nine of every ten technicians with full-time military AGR members. The Pentagon&rsquo;s own numbers show it costs more.</p>
<div class="stats">
<div><b>31,699</b><span>technician positions authorized in the Army and Air National Guard</span></div>
<div><b>89%</b><span>would become AGR military positions. The rest become Title 5 civilians</span></div>
<div><b>$248M</b><span>net added cost, fiscal 2028 to 2032, in the Pentagon&rsquo;s own resource table</span></div>
<div><b>$282M</b><span>added cost every year by fiscal 2038, Local 1776 conservative model</span></div>
</div>
<div class="cols">
<div>
<h2>What the bill does</h2>
<ul>
<li>Freezes technician hiring on October 1, 2028, and repeals 32 U.S.C. 709 on October 1, 2038.</li>
<li>Converts the workforce to 89 percent AGR and 11 percent Title 5 civilian.</li>
</ul>
<h2 class="sp">It costs more, by the Pentagon&rsquo;s own count</h2>
<table class="est">
<tr><th></th><th>FY28</th><th>FY29</th><th>FY30</th><th>FY31</th><th>FY32</th><th>Total</th></tr>
<tr><td>Pentagon&rsquo;s table</td><td>$10M</td><td>$25M</td><td>$46M</td><td>$69M</td><td>$98M</td><td>$248M</td></tr>
<tr><td>Local 1776 model</td><td>$0</td><td>$28M</td><td>$56M</td><td>$85M</td><td>$113M</td><td>$282M</td></tr>
</table>
<ul>
<li>By fiscal 2032 it spends $2.7 billion more a year on AGR pay to save $2.6 billion on civilian and drill-status pay.</li>
<li>A 2017 study done for the Pentagon found the same or higher cost in every reserve component when AGRs replace technicians.</li>
<li>CBO lists the opposite move, replacing military personnel with civilians, as a way to save about $17 billion over ten years.</li>
</ul>
<h2 class="sp">It fixes nothing</h2>
<p class="quiet">The Department has not named a job an AGR can do that a technician cannot. Its bill has to amend 32 U.S.C. 328(b) so AGRs may do the maintenance work technicians already do.</p>
</div>
<div>
<div class="ask"><h3>The ask</h3><ol>
<li>Strike section 1105 of H.R. 8800 and section 513 of S. 4784 from the final defense bill.</li>
<li>No phase-out without a CBO score and a GAO review that compare the plan with the status quo and with a full Title 5 conversion.</li></ol></div>
<h2>What technicians lose</h2>
<ul>
<li><b>Bargaining.</b> AGR members serve on full-time National Guard duty. Federal law makes it a crime to bargain on their behalf (10 U.S.C. 976).</li>
<li><b>Appeals and complaints.</b> No Merit Systems Protection Board for a firing, no EEOC for discrimination and no union representative. Military channels only.</li>
<li><b>For good.</b> An executive order can be reversed. A position converted to military status is outside the bargaining law under any president.</li>
</ul>
<h2 class="sp">The alternative the Pentagon passed over</h2>
<p class="quiet">Convert technicians to Title 5 civilian positions, as Congress did for part of the workforce in 2017. It keeps every capability and every right, and CBO&rsquo;s work says it saves money. LIUNA supports it.</p>
</div>
</div>"""

DOCS = [("1", "The problem and the ask", P1, "1_The_Problem_and_the_Ask"), ("2", "The bill at a glance", P2, "2_The_Bill_at_a_Glance"), ("3", "Claims and the record", P3, "3_Claims_and_the_Record")]

async def main():
    out = ROOT / "out"; out.mkdir(exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"), args=["--no-sandbox"])
        G_URL = URL + "#guard"
        JOBS = [(page(n, l, bd), f, "Chapter71_Handout_" + f) for n, l, bd, f in DOCS]
        JOBS.append((page("", "National Guard technician phaseout", P4, mast="National Guard Technicians", sub="Fiscal 2027 defense bill &middot; The technician phaseout", qrsrc=qr(G_URL), shown=URL_SHOWN + "#guard", foot_h="Read the full analysis, charts and sources", foot_s="Scan the code with a phone camera. Every figure on this page is sourced on the site. Figures labeled Local 1776 are our own benchmarks from a June 2026 cost model. They are not an official score."), "Guard_Technician_Phaseout", "National_Guard_Handout_Technician_Phaseout"))
        for html, fn, pdfname in JOBS:
            assert "—" not in html and "&mdash;" not in html
            (out / (fn + ".html")).write_text(html, encoding="utf-8")
            pg = await b.new_page(viewport={"width": 816, "height": 1056})
            await pg.goto((out / (fn + ".html")).as_uri()); await pg.wait_for_timeout(400)
            over = await pg.evaluate("(()=>{const f=document.querySelector('.foot').getBoundingClientRect();const m=Math.max(...[...document.querySelectorAll('.page *')].filter(e=>!e.closest('.foot')).map(e=>e.getBoundingClientRect().bottom));return [document.querySelector('.page').scrollHeight, Math.round(f.top), Math.round(m), Math.round(f.top-m)]})()")
            pdf = out / (pdfname + ".pdf")
            await pg.pdf(path=str(pdf), width="8.5in", height="11in", print_background=True, margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})
            print(fn, "pages:", len(PdfReader(str(pdf)).pages), "pageHeight,footTop,contentBottom,room:", over, pdf.stat().st_size)
            await pg.close()
        await b.close()
asyncio.run(main())
