#!/usr/bin/env python3
"""Reform site, November 12, 2026: take the site out of draft.

Usage: python3 patch_nov12.py /path/to/site/src

What it does (every replacement is exact-string and its count is asserted):
  1. Removes the "Working draft" note under the header and the words "Working draft." in the footer.
  2. Rewords the caption under "Two estimates, one direction" so the five-year total ($282 million,
     fiscal 2028 through 2032) cannot be mistaken for the yearly cost in fiscal 2038 (also $282 million).
  3. Replaces every "Source pending" tag with a checked source, or rewords the claim to what the source says.
  4. Adds the new sources to sources.js.
  5. Removes the "before launch" note under the studies list and rewords two "not yet compiled" chart notes.
"""
import json, pathlib, re, sys

src = pathlib.Path(sys.argv[1])
rd = lambda n: (src / n).read_text(encoding="utf-8")
def wr(n, s): (src / n).write_text(s, encoding="utf-8")
def rep(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:90])
    return s.replace(a, b)
def line_starting(s, prefix):
    """Return the one full line that starts (after indentation) with prefix."""
    hits = [l for l in s.split("\n") if l.lstrip().startswith(prefix)]
    assert len(hits) == 1, (len(hits), prefix)
    return hits[0]

# ------------------------------------------------------------------ body.html
b = rd("body.html")
draft = line_starting(b, '<p class="draft">')
assert "Working draft." in draft and "Source pending" in draft
b = rep(b, draft + "\n", "")
b = rep(b, "<span>Updated Nov. 10, 2026</span>", "<span>Updated Nov. 12, 2026</span>")
b = rep(b, "<p>Working draft. Figures and case status are current as of November 11, 2026.</p>",
           "<p>Figures and case status are current as of November 11, 2026.</p>")
b = rep(b, " Employee counts by agency are still being compiled.</p>", " Employee counts by agency are not shown.</p>")
assert "Working draft" not in b and "being compiled" not in b
wr("body.html", b)

# ----------------------------------------------------------------- guard.html
g = rd("guard.html")
g = rep(g,
  "The Pentagon's figures are from the resource table in its own proposal and total $248 million. Local 1776's are from the conservative scenario in its June 2026 cost model and total $282 million through fiscal 2032. Neither is an official score.[[fn:lp291,l1776]]",
  "The Pentagon's figures are from the resource table in its own proposal and add up to $248 million over fiscal 2028 through 2032. Local 1776's are from the conservative scenario in its June 2026 cost model and add up to $282 million over the same five years. That five-year total is a different measure from the model's yearly cost once the conversion is complete in fiscal 2038, which happens to be the same number. Neither is an official score.[[fn:lp291,l1776]]")

g = rep(g, '<h3 class="gh">Fifty years of studies, and none found savings</h3>',
           '<h3 class="gh">Nearly fifty years of studies, and none found savings</h3>')

# 1968: the Senate report quotation could not be checked against the report itself. Removed until it is.
l68 = line_starting(g, "<li><b>1968</b>")
assert "considerably more cost" in l68
g = rep(g, l68 + "\n", "")

l78 = line_starting(g, "<li><b>1978</b>")
g = rep(g, l78,
  "      <li><b>1978</b><span>The Congressional Budget Office told Congress that the average Army Guard or Reserve member cost about one-fifth as much as an active-duty soldier, counting pay and operating costs.[[fn:cbo78]]</span></li>")

l80 = line_starting(g, "<li><b>1980</b>")
assert "four-year test" in l80
g = rep(g, l80,
  "      <li><b>1982</b><span>Congress ordered a test of replacing technicians with full-time military. It ran from February 1979 to June 1980. The Pentagon reported no discernible effect on unit readiness, and GAO found the Army had no evidence that converting more positions would improve it.[[fn:gaotech82]]</span></li>")

l13 = line_starting(g, "<li><b>2013</b>")
assert "85 percent less" in l13
g = rep(g, l13,
  "      <li><b>2013</b><span>A Defense Department report to Congress found that Guard and Reserve members who are not mobilized cost about 15 percent as much as active-duty members. A CNA study for Congress the same year found that, for General Schedule technicians, AGR retirement costs the Pentagon 34 percent more than technician retirement. It recommended keeping the technician program.[[fn:gao14,cna13]]</span></li>")

leeo = line_starting(g, "<li><b>The Guard Bureau tried three times in two years")
assert "Source pending" in leeo
g = rep(g, leeo,
  "        <li><b>The Guard Bureau tried three times in two years to pull technicians out of the civilian discrimination complaint process.</b>Local 1776's records show the attempts: in 2013 by internal direction, in the fiscal 2014 defense bill, and in a 2015 reorganization plan. Each would have moved technician complaints into military channels with no union representative. LIUNA and the Association of Civilian Technicians opposed each one, and in 2016 Congress wrote technicians' civilian appeal and discrimination complaint rights into section 709.[[fn:l1776,usc709,mspb]]</li>")
g = rep(g, '    <p class="note">The entries marked pending are cited in Local 1776\'s June 2026 cost report and will be linked to the original documents before launch.</p>\n', "")
assert "Source pending" not in g and 'class="pending"' not in g and "before launch" not in g
wr("guard.html", g)

# --------------------------------------------------------------- tl_main.html
m = rd("tl_main.html")
m = rep(m, "Dashed line: 1962 to 1996 not yet compiled.", "Dashed line: 1962 to 1996, no figures compiled.")
wr("tl_main.html", m)

# ----------------------------------------------------------------- audit.json
raw = rd("audit.json")
A = json.loads(raw)
assert json.dumps(A, ensure_ascii=False) == raw
def hole(n, title):
    h = A[n - 1]; assert h["t"] == title, (n, h["t"]); assert h.get("k") == 1, n; return h
def done(h): del h["k"]

h = hole(8, "Jobs can be defined out of the union")
h["u"] = "Schedule F in 2020 was built to move career employees into a category with fewer protections. The job-by-job security exclusion in this section was passed over in 2025 in favor of excluding whole departments."
h["r"] = ["eo14003", "eo14251"]; done(h)

h = hole(10, "Management rights can swallow the rule")
h["u"] = "How far these rights reach is decided by a board the president appoints, and its reading has shifted with its majority. In 2022 a federal appeals court overturned policy statements the board's prior majority had issued."
h["r"] = ["usc7106", "flra22"]; done(h)

h = hole(11, "A whole category of bargaining switches on and off by executive order")
assert h["r"] == ["vlex", "ballot", "eo14003"]; done(h)

h = hole(13, "Government-wide rules override the bargaining table")
h["u"] = "The 2018 executive orders were written to take discipline procedures and official time off the table everywhere at once. A January 2025 presidential memorandum on union contracts was written to count as a government-wide rule under this section."
h["r"] = ["ballot", "lameduck", "usc7117"]; done(h)

h = hole(15, "Agency heads get a veto over signed contracts")
h["u"] = "A January 2025 presidential memorandum ordered agency heads to use this review to disapprove agreements made in the 30 days before the inauguration. The new chairman of the Federal Trade Commission cited it the next month when he disapproved an interim agreement with the Treasury Employees Union."
h["r"] = ["lameduck", "flra7466", "usc7114"]; done(h)

h = hole(19, "The Impasses Panel belongs to the president")
h["u"] = "A panel named by one administration can write management's proposals into contracts across the government, and the next administration can dismiss the whole panel and start over. President Trump dismissed every member in 2017. President Biden did the same in 2021."
h["r"] = ["fsip21", "blawfsip", "usc7119"]; done(h)

h = hole(21, "Breaking the law costs an agency nothing")
h["o"] = "The usual remedy for an unfair labor practice is an order to stop and a notice on the bulletin board. The statute provides no fines and no punitive damages."
h["u"] = "An agency can repudiate a contract, wait out years of litigation, and in the end be told to stop and post a notice."
h["r"] = ["usc7118"]; done(h)

h = hole(25, "The board's orders do not enforce themselves")
h["r"] = ["usc7123"]; done(h)

h = hole(28, "The board can overturn an arbitrator, and no court can review it")
h["r"] = ["usc7122", "usc7123"]; done(h)

h = hole(33, "The purpose clause is used against the purpose")
h["u"] = "The 2018 executive order on bargaining opened by citing this clause, then set goals and deadlines for agency bargaining in its name."
h["r"] = ["eo13836", "usc7101"]; done(h)

assert not any(x.get("k") for x in A)
wr("audit.json", json.dumps(A, ensure_ascii=False))

# ---------------------------------------------------------------- timeline.js
t = rd("timeline.js")
assert t.count("pend:true,src:[]") == 4
t = rep(t, 'b:"Taft-Hartley barred strikes by federal employees in 1947. A 1955 law added criminal penalties.",pend:true,src:[]',
           'b:"Taft-Hartley barred strikes by federal employees in 1947. A 1955 law added criminal penalties.",src:["usc7311","usc1918"]')
t = rep(t, 'That is why postal workers are not part of this fight.",pend:true,src:[]',
           'That is why postal workers are not part of this fight.",src:["usc39_1209"]')
t = rep(t, 'b:"Partnership councils were dissolved across the government.",pend:true,src:[]',
           'b:"Executive Order 13203, signed February 17, 2001, revoked the Clinton partnership order and dissolved the National Partnership Council.",src:["eo13203"]')
t = rep(t, 's:"The Obama-era forums are ended by executive order.",b:"",pend:true,src:[]',
           's:"The Obama-era forums are ended by executive order.",b:"Executive Order 13812, signed September 29, 2017, revoked the 2009 order that created the forums.",src:["eo13812"]')
assert "pend:true" not in t
t = rep(t, """\n  else h+='<div class="src">Source: to be added before launch.</div>';""", "")
t = rep(t, 'txt:"Bargaining under way. Figures for these years are being compiled."', 'txt:"Bargaining under way. No figures compiled for these years."')
wr("timeline.js", t)

# -------------------------------------------------------------------- page.js
p = rd("page.js")
p = rep(p, 'A union\'s job is to make sure the agency follows its own rules.",true],',
           'A union\'s job is to make sure the agency follows its own rules."],')
p = rep(p, '["heritage25","opm24","fedweek","fedsmith19"],["heritage25","statute"],["politifact","fdr"]',
           '["heritage25","opm24","fedweek","fedsmith19"],["heritage25","usc7513","usc7106"],["politifact","fdr"]')
wr("page.js", p)

# ----------------------------------------------------------------- sources.js
s = rd("sources.js")
NEW = [
 ("cbo78", "Congressional Budget Office, testimony on readiness of the Army reserve components, House Armed Services Committee (February 17, 1978)", "https://webarchive.library.unt.edu/web/20090830202632/http://cbo.gov/ftpdocs/52xx/doc5263/doc08.pdf"),
 ("gaotech82", "GAO, Information on Military Technician Conversions to Full-Time Active Duty Guard and Reserve, FPCD-82-57 (September 8, 1982)", "https://www.gao.gov/products/fpcd-82-57"),
 ("gao14", "GAO-14-711R, on the Defense Department's December 2013 report to Congress on active and reserve unit costs", "https://www.gao.gov/products/gao-14-711r"),
 ("cna13", "CNA, Report on the Termination of Military Technician as a Distinct Personnel Management Category, final report to Congress (September 2013)", ""),
 ("eo13203", "Executive Order 13203, February 17, 2001 (American Presidency Project)", "https://www.presidency.ucsb.edu/documents/executive-order-13203-revocation-executive-order-and-presidential-memorandum-concerning"),
 ("eo13812", "Executive Order 13812, Federal Register, October 4, 2017", "https://www.govinfo.gov/content/pkg/FR-2017-10-04/pdf/2017-21559.pdf"),
 ("eo13836", "Executive Order 13836, Federal Register, June 1, 2018", "https://www.govinfo.gov/content/pkg/FR-2018-06-01/html/2018-11913.htm"),
 ("lameduck", "Presidential memorandum on collective bargaining agreements, January 31, 2025, 90 Fed. Reg. 9581", "https://govinfo.gov/content/pkg/FR-2025-02-14/pdf/2025-02729.pdf"),
 ("flra7466", "NTEU and Federal Trade Commission, 74 FLRA No. 66", "https://www.flra.gov/decisions/v74/74-66"),
 ("fsip21", "Government Executive, Biden demands resignations from the Impasses Panel (February 2021)", "https://www.govexec.com/management/2021/02/biden-demands-resignations-impasses-panel/171807/?oref=ge-next-story"),
 ("blawfsip", "Bloomberg Law, Biden cleans house at the labor impasse panel (February 3, 2021)", "https://news.bloomberglaw.com/daily-labor-report/biden-cleans-house-at-labor-impasse-panel-after-union-complaints"),
 ("usc7101", "5 U.S.C. 7101, findings and purpose", "https://www.law.cornell.edu/uscode/text/5/7101"),
 ("usc7117", "5 U.S.C. 7117, duty to bargain; government-wide rules", "https://www.law.cornell.edu/uscode/text/5/7117"),
 ("usc7118", "5 U.S.C. 7118, unfair labor practice procedures and remedies", "https://www.law.cornell.edu/uscode/text/5/7118"),
 ("usc7119", "5 U.S.C. 7119, negotiation impasses; Federal Service Impasses Panel", "https://www.law.cornell.edu/uscode/text/5/7119"),
 ("usc7122", "5 U.S.C. 7122, exceptions to arbitral awards", "https://www.law.cornell.edu/uscode/text/5/7122"),
 ("usc7123", "5 U.S.C. 7123, judicial review; enforcement", "https://www.law.cornell.edu/uscode/text/5/7123"),
 ("usc7513", "5 U.S.C. 7513, cause and procedure for removals", "https://www.law.cornell.edu/uscode/text/5/7513"),
 ("usc1918", "18 U.S.C. 1918, penalty for striking against the government", "https://www.law.cornell.edu/uscode/text/18/1918"),
 ("usc39_1209", "39 U.S.C. 1209, federal labor laws applied to the Postal Service", "https://www.law.cornell.edu/uscode/text/39/1209"),
]
for k, _, _ in NEW:
    assert not re.search(r"\n\s*%s:\[" % re.escape(k), s), k
last = ' usc7311:["5 U.S.C. 7311, loyalty and striking","https://www.law.cornell.edu/uscode/text/5/7311"]'
assert s.count(last) == 1 and s.rstrip().endswith("};"), "sources.js tail changed"
add = "".join(',\n %s:[%s,%s]' % (k, json.dumps(l, ensure_ascii=False), json.dumps(u)) for k, l, u in NEW)
s = rep(s, last, last + add)
wr("sources.js", s)
print("patched", src)
