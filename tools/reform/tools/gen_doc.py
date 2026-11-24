import json
A=json.load(open('src/audit.json',encoding='utf-8')); P=json.load(open('src/playbook.json',encoding='utf-8'))
L=[]; w=L.append
ISSUE={"Coverage":(1,"Who is covered"),"Scope of bargaining":(2,"What can be bargained"),"The referees":(3,"The referees"),"Enforcement":(4,"Enforcement"),"Contracts and grievances":(5,"Contracts and arbitration"),"Union operations":(6,"Union operations"),"Interpretation":(7,"Restoration and purpose")}
w("# Chapter 71 Audit and Comprehensive Reform Framework\n")
w("Prepared November 10, 2026. Revised November 11, 2026: the seven divisions are now called issues, and the bill is numbered by section with no titles. Companion to the Research Brief. Scope: all of 5 U.S.C. Chapter 71 (sections 7101 to 7135), not only section 7103(b).\n")
w("Rows marked **[pending]** rest on general knowledge of the statute or its history and need a source pulled before launch. Everything else was checked against a source in this project's research.\n")
w("## 1. The core finding\n")
w("- The 2025 orders used one hole, the national security exception. The chapter has %d.\n- The deepest problem is enforcement. An agency that breaks this law is told to stop and post a notice. A union that strikes is decertified, and its members can be fired and prosecuted.\n- Federal unions have beaten most attacks one at a time (MaxHR in court in 2006, NSPS in Congress in 2009, the 2020 labor board policy statements in court in 2022) and then waited for the next one. A statute that can be enforced ends that cycle.\n" % len(A))
w("## 2. The playbook: nine tactics used against federal bargaining\n")
for i,p in enumerate(P,1):
    w("**%d. %s.** %s" % (i,p["t"],p["o"]))
    for e in p["e"]: w("- "+e)
    w("- Answered in the fix: "+p["l"]+"\n")
w("## 3. Section-by-section audit\n")
cats=[]
for h in A:
    if h["c"] not in cats: cats.append(h["c"])
n=0
for c in cats:
    w("### Issue %d: %s\n" % ISSUE[c])
    w("| # | Section | Hole | How it was used | Fix |"); w("|---|---|---|---|---|")
    for h in A:
        n_idx=A.index(h)+1
        if h["c"]==c:
            w("| %d | %s | **%s.** %s%s | %s | %s |" % (n_idx,h["s"],h["t"],h["o"]," **[pending]**" if h.get("k") else "",h["u"],h["f"]))
    w("")
w("## 4. Bill outline: Federal Workforce Bargaining Rights Protection Act (working title)\n")
for t,d in [
 ("Issue 1, Who is covered","Narrow section 7103(b): written unit-level findings, approval by joint resolution, de novo court review, four-year sunset, no delegation. Mirror in 22 U.S.C. 4103(b). Bring TSA under the chapter, narrow 38 U.S.C. 7422. Tighten section 7112(b). Anti-waiver clause against future agency personnel systems."),
 ("Issue 2, What can be bargained","Make section 7106(b)(1) subjects mandatory. Codify the more-than-de-minimis threshold and the mid-term bargaining duty. Limit section 7117 government-wide rules. Limit section 7114(c) agency head review. Bar executive orders from narrowing bargaining or voiding agreements."),
 ("Issue 3, Referees a president cannot bench","Automatic acting General Counsel, complaint authority for regional directors, deadlines at every stage, impasses to neutral arbitrators, court access when the Authority cannot act."),
 ("Issue 4, Enforcement","Private right of action in district court, injunctions (mandatory petition when a contract is repudiated), civil penalties, make-whole relief including lost dues, interest and fees, discipline for officials who order violations, self-enforcing orders, statutory status quo rule."),
 ("Issue 5, Contracts and arbitration","Court orders compelling arbitration, deference standard for awards with court review, fixed list of grievance exclusions, compliance pending appeal."),
 ("Issue 6, Union operations","Protect official time (7131), dues withholding (7115), and access to the workplace, employees and information."),
 ("Issue 7, Restoration","Void EO 14251 and EO 14343, restore agreements as of March 26, 2025, two-year sunset for older exclusion orders, rule of construction, severability.")]:
    w("- **%s.** %s" % (t,d))
w("\nNaming: the public site and handouts call these seven divisions issues. The bill itself has no titles. It is numbered by section. Statutory text exists for Issue 1 (sections 2 through 5 of the draft) and the restoration piece of Issue 7 (section 6). Issues 2 through 6 need drafting.\n")
w("## 5. Legal risks to address in a memo\n")
w("- Article II challenge to limits on the president's national security determinations and to court review of them.\n- After Trump v. Slaughter (June 29, 2026), any design that depends on the Authority's independence is exposed. The framework routes enforcement through Article III courts and neutral arbitrators for that reason.\n- Approval by joint resolution is used because a one-house veto would be unconstitutional.\n- Sovereign immunity: civil penalties and damages against agencies need an express waiver.\n- The Sherk article (Harvard JLPP, 2026) argues that union and arbitrator powers under the chapter are unconstitutional. Expect it in litigation.\n")
w("## 6. Corrections to the Research Brief\n")
w("- The August 2025 order (EO 14343) also added NASA, the U.S. Agency for Global Media, NESDIS, and Bureau of Reclamation hydropower units.\n- EO 14251 section 5 delegates the exclusion power for the Transportation Department, including the FAA, to the Secretary.\n- The Senate cosponsor figure for S. 2837 (\"48 plus Collins and Murkowski\") is unconfirmed. Verified: Collins and Murkowski cosponsor.\n- DHS MaxHR and NSPS are now sourced (no longer pending).\n")
w("## 7. Sources added in this pass\n")
for t,u in [
 ("Executive Order 14251, full text","https://www.presidency.ucsb.edu/documents/executive-order-14251-exclusions-from-federal-labor-management-relations-programs"),
 ("Executive Order 14343, Federal Register","https://www.federalregister.gov/documents/2025/09/03/2025-16924/further-exclusions-from-the-federal-labor--management-relations-program"),
 ("CRS on NTEU v. Chertoff (MaxHR)","https://www.everycrsreport.com/files/20080201_RL33052_6b40b2e465580e9fbb0e2e47e54f9d22ddafd73c.html"),
 ("GovExec, unions win over DHS labor system (2006)","https://govexec.com/defense/2006/06/unions-win-broad-victory-over-dhs-labor-relations-system/22146"),
 ("AFGE v. Gates, D.C. Circuit (2007)","https://law.justia.com/cases/federal/appellate-courts/F3/486/1316/524478/"),
 ("AFGE on the repeal of NSPS","https://www.afge.org/publication/nsps-repealed-with-signing-of-2010-national-defense-authorization-act-"),
 ("Nextgov, Congress restored bargaining in 2008","https://www.nextgov.com/people/2009/11/obama-gives-the-heave-ho-to-dod-pay-for-performance/250568"),
 ("Project 2025, Mandate for Leadership, chapter 3","https://static.project2025.org/2025_MandateForLeadership_CHAPTER-03.pdf"),
 ("Daily Signal on the Project 2025 personnel chapter","https://www.dailysignal.com/?p=54653"),
 ("GovExec, appeals court overturns labor board policy statements (2022)","https://govexec.com/workforce/2022/01/appeals-court-shuts-down-drive-flra-rulings-midterm-bargaining-and-zipper-clauses/361326"),
 ("AFGE v. FLRA, D.C. Circuit, Feb. 1, 2022","https://law.justia.com/cases/federal/appellate-courts/cadc/20-1396/20-1396-2022-02-01.html")]:
    w("- %s: %s" % (t,u))
w("\n## 8. Next steps\n")
w("1. Pull sources for every [pending] row, starting with the enforcement rows (sections 7118, 7122, 7123) and the FSIP history.\n2. Draft statutory text for Issues 2 through 6, enforcement (Issue 4) first.\n3. Legal memo on the risks in section 5.\n4. Add the House roll call lookup and agency employee counts to the site.\n")
open('out/audit.md','w',encoding='utf-8').write("\n".join(L))
print(len("\n".join(L)), len(A))
