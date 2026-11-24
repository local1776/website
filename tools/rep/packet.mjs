// The two PDFs made from one Representation Request (Ben, Nov 21 2026). Each function takes the request exactly as the
// website form sends it (see site/js/rep.js; JSON fields may arrive as strings) and returns a complete HTML page that
// prints to a letter-size PDF. No packages, no outside data, so the Union App can use this same file when it receives
// requests.
// formVersion "2" (Nov 22 2026): every topic the employee picks is its own request, so each topic object in "topics"
// carries its own facts (items, action dates, incidents, outcome, management, filings, deadlines, urgent). The app calls
// these functions ONCE PER TOPIC, with the given-once fields plus that ONE topic in "topics". Version 1 requests (facts
// at the top level) still print as they did.
//   designationHtml(r)  PDF 1 · Designation of Representation (one page). The ONLY page management ever gets, and only
//                       when staff send it from the app: the general matter (the topic), never the specifics.
//   packetHtml(r)       PDF 2 · Request Details (internal; the employee gets a copy): the grievance form from the
//                       employee's contract filled in, the Case Narrative, then the Request for Assistance with
//                       everything the employee told us about this topic.
// options: { logo: image URL or data: URI, poc: { name, title, email, phone, fax } }

const POC = { name: 'Ben Banchs', title: 'Business Manager', email: 'bbanchs@local1776.org', phone: '1 (800) 569-5861 ext. 1001', fax: '1 (888) 506-6082' };
const ADDRESS = 'PO Box 1794, Abita Springs, LA 70420 · 1 (800) 569-5861 · www.local1776.org';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const J = v => (typeof v === 'string' ? (v.trim() ? JSON.parse(v) : []) : (v || []));
const yes = v => v === true || v === 'yes' || v === 'true';
const day = s => { if (!s) return ''; const d = new Date(/T/.test(s) ? s : s + 'T12:00:00Z'); return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' }); };
const short = s => s ? new Date(s + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
const stamp = s => new Date(s).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago', timeZoneName: 'short' });
const para = s => esc(s).split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
const v = s => (String(s ?? '').trim() ? esc(s) : '<span class="none">—</span>');
const fullName = r => [r.firstName, r.lastName].filter(Boolean).join(' ');
const topicNames = r => J(r.topics).map(t => t.topic);
const usd = n => (String(n ?? '').trim() === '' ? '' : '$' + Number(n).toLocaleString('en-US'));
// the facts of the request, from either shape: v2 = inside each topic (normally just one), v1 = at the top level.
// Several v2 topics passed at once are folded together (incidents marked with their topic) so nothing is lost.
export function facts(r) {
  const topics = J(r.topics);
  const v2 = String(r.formVersion || '') === '2' || topics.some(t => t && (t.key || Array.isArray(t.incidents) || t.outcome !== undefined));
  if (!v2) return { v2, topics, incidents: J(r.incidents), filings: J(r.filings), deadlines: J(r.deadlines), adverse: yes(r.adverseAction), urgent: yes(r.urgent),
    stage: r.stage, receivedDate: r.receivedDate, replyDue: r.replyDue, effectiveDate: r.effectiveDate, interviewDate: r.interviewDate, eeoContact: r.eeoContact,
    outcome: r.outcome || '', talkedMgmt: r.talkedMgmt, mgmtName: r.mgmtName, mgmtPosition: r.mgmtPosition, mgmtSaid: r.mgmtSaid };
  const many = topics.length > 1, pick = k => (topics.find(t => t[k]) || {})[k] || '';
  const talked = topics.find(t => t.talkedMgmt === 'yes') || topics.find(t => t.talkedMgmt) || {};
  return { v2, topics,
    incidents: topics.flatMap(t => J(t.incidents).map(n => ({ ...n, topics: many ? [t.topic] : [] }))),
    filings: topics.flatMap(t => J(t.filings)),
    deadlines: topics.flatMap(t => J(t.deadlines)).sort((a, b) => String(a.date).localeCompare(String(b.date))),
    adverse: topics.some(t => yes(t.adverseAction) || (t.items || []).some(i => i.adverse)),
    urgent: topics.some(t => yes(t.urgent)),
    stage: pick('stage'), receivedDate: pick('receivedDate'), replyDue: pick('replyDue'), effectiveDate: pick('effectiveDate'),
    interviewDate: pick('interviewDate'), eeoContact: pick('eeoContact'),
    outcome: many ? topics.filter(t => t.outcome).map(t => t.topic + ': ' + t.outcome).join('\n\n') : ((topics[0] || {}).outcome || ''),
    talkedMgmt: talked.talkedMgmt, mgmtName: talked.mgmtName, mgmtPosition: talked.mgmtPosition, mgmtSaid: talked.mgmtSaid };
}
const list = a => a.length < 3 ? a.join(' and ') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];

const CSS = `
@page{size:letter;margin:.55in .6in .7in}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:"Source Serif 4",Georgia,serif;font-size:10.5pt;line-height:1.45;color:#2a2a2a;background:#fff}
.page{break-after:page}.page:last-child{break-after:auto}
.head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 0 9px;margin:0 0 16px;border-bottom:2px solid #0b2a55}
.head img{height:42px;width:auto}
.head div{text-align:right;font-family:"Libre Franklin",Arial,sans-serif;font-size:7.5pt;line-height:1.5;color:#5f6672}
.head b{display:block;font-size:9pt;color:#0b2a55;letter-spacing:.04em}
.kick{font-family:"Libre Franklin",Arial,sans-serif;font-size:7.5pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#b45f00;margin:0 0 3px}
h1{font-family:"Playfair Display",Georgia,serif;font-weight:800;font-size:21pt;line-height:1.1;color:#121212;margin:0 0 4px;white-space:nowrap}
.sub{font-family:"Libre Franklin",Arial,sans-serif;font-size:8.5pt;color:#5f6672;margin:0 0 14px}
h2{font-family:"Libre Franklin",Arial,sans-serif;font-size:8pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#0b2a55;margin:16px 0 7px;padding:6px 0 0;border-top:3px solid #0b2a55;break-after:avoid}
h3{font-family:"Libre Franklin",Arial,sans-serif;font-size:9pt;font-weight:700;color:#121212;margin:9px 0 3px;break-after:avoid}
p{margin:0 0 7px}
.lab{display:block;font-family:"Libre Franklin",Arial,sans-serif;font-size:6.8pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#5f6672;margin:0 0 2px}
.none{color:#9aa0a8}
.grid{display:grid;gap:8px 18px}.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}.g4{grid-template-columns:repeat(4,1fr)}
.f{min-width:0}.f .val{font-size:10pt;line-height:1.35}
.box{border:1px solid #dcdfe4;border-radius:6px;padding:9px 12px;break-inside:avoid}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:0 0 6px}
.tile{border:1px solid #dcdfe4;border-top:3px solid #0b2a55;border-radius:6px;padding:6px 9px}
.tile b{display:block;font-family:"Libre Franklin",Arial,sans-serif;font-size:11pt;color:#0b2a55}
.tile.hot{border-top-color:#ff9e0b}.tile.hot b{color:#b45f00}
.tags{display:flex;flex-wrap:wrap;gap:4px}
.tag{display:inline-block;font-family:"Libre Franklin",Arial,sans-serif;font-size:8pt;font-weight:600;border:1px solid #0b2a55;color:#0b2a55;border-radius:3px;padding:1px 5px;white-space:nowrap}
.tag.amber{border-color:#b45f00;color:#b45f00}
table{width:100%;border-collapse:collapse;font-size:9.5pt}
th{font-family:"Libre Franklin",Arial,sans-serif;font-size:6.8pt;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#5f6672;text-align:left;padding:4px 6px 4px 0;border-bottom:1px solid #0b2a55}
.nw{white-space:nowrap}
td{padding:5px 8px 5px 0;border-bottom:1px solid #dcdfe4;vertical-align:top}
tr{break-inside:avoid}
.sig{font-family:"Dancing Script",cursive;font-size:20pt;line-height:1;color:#0b2a55}
.sigrow{display:grid;grid-template-columns:1.6fr 1fr;gap:24px;margin:14px 0 0}
.sigrow .line{border-bottom:.6px solid #5f6672;padding:0 0 3px;min-height:30px;display:flex;align-items:flex-end}
.check{font-family:"Libre Franklin",Arial,sans-serif;font-size:9pt}
.check i{display:inline-block;width:11px;height:11px;border:1px solid #121212;margin:0 5px -1px 0;font-style:normal;font-size:9px;line-height:9px;text-align:center}
.small{font-size:8.5pt;line-height:1.45;color:#2a2a2a}
.small p{margin:0 0 5px}
.inc{border-left:3px solid #0b2a55;padding:1px 0 1px 10px;margin:0 0 7px;break-inside:avoid;font-size:10pt;line-height:1.4}
.inc p{margin:0 0 4px}
.gf h2{margin-top:11px}.gf .sigrow{margin-top:8px}.gf .sub{margin-bottom:10px}
.inc .when{font-family:"Libre Franklin",Arial,sans-serif;font-size:8pt;font-weight:700;color:#0b2a55;margin:0 0 2px}
.steps{margin:10px 0 0;break-inside:avoid;border:1px solid #121212}.steps th{background:#0b2a55;color:#fff;border:0;padding:4px 6px;font-size:6.3pt;letter-spacing:.08em;vertical-align:bottom}.steps td{height:28px;border:0;border-top:1px solid #121212;border-left:1px solid #121212;padding:4px 6px;vertical-align:middle}.steps td:first-child{border-left:0;text-align:center;width:5%}.steps th:first-child{text-align:center}
.cba{font-family:Arial,Helvetica,sans-serif;color:#000}
.gform{width:100%;border-collapse:collapse;border:1.5px solid #000;table-layout:fixed;font-size:10pt}
.gform th,.gform td{border:1px solid #000;padding:4px 7px 4px;vertical-align:top;text-align:left;font-family:Arial,Helvetica,sans-serif;letter-spacing:0;text-transform:none;color:#000}
.gform td{height:.47in}.gform td.tall{height:.95in}
.gform th.bar{background:#000;color:#fff;font-size:10pt;font-weight:700;padding:5px 7px;line-height:1.5}
.gform th.bar.l{font-weight:400;padding:4px 7px;line-height:1.3}
.gform td>span{display:block;font-size:10pt}
.gform .fv{margin:3px 0 0;font-size:10.5pt;font-weight:700;line-height:1.35}
.gform .opts{margin:4px 0 0;font-size:10pt;display:flex;align-items:center}
.gform .gap{display:inline-block;width:42px}.gform .gap.s{width:22px}
.gform .cb{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border:1px solid #000;margin:0 6px 0 0;font-style:normal;font-size:11px;font-weight:700}
.gform .sig{font-weight:400}
.gfoot{font-family:Arial,Helvetica,sans-serif;font-size:8.5pt;margin:6px 0 0 10px;line-height:1.7}
/* Request Details, formerly Case Packet (Ben, Nov 21 2026): the website's delicate look. Section rules thin; table header rules thinner still but
   darker than the row lines; tiles with a plain thin outline (no colored top); topic items as plain text with dots */
.pk .head{border-bottom:1px solid #0b2a55}
.pk h2{border-top:1px solid #0b2a55;padding-top:7px;margin-top:18px}
.pk th{border-bottom:.6px solid #0b2a55}
.pk td{border-bottom:.5px solid #dcdfe4}
.pk .tile{border:1px solid #dcdfe4;border-radius:6px}
.pk .inc{border-left:1.5px solid #0b2a55}
.sec{break-inside:avoid}
.items{margin:0 0 4px;font-size:10pt;line-height:1.5}
.items .dot{color:#9aa0a8}
.adv{color:#b45f00;font-weight:600}
.pk .gform th,.pk .gform td{border:1px solid #000}
.pk .gform{border:2.25px solid #000}   /* the form's outside edge heavier than its inside lines (Ben, Nov 21 2026) */
.dl td.p{width:62px;text-align:center}.dl td.d{width:132px;text-align:right;white-space:nowrap}
.conf{font-family:"Libre Franklin",Arial,sans-serif;font-size:7pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#b45f00}
`;
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@800&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=Libre+Franklin:wght@400;600;700&family=Dancing+Script:wght@600&display=swap" rel="stylesheet">';
const doc = (title, body, cls = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>${FONTS}<style>${CSS}</style></head><body class="${cls}">${body}</body></html>`;
const head = o => `<div class="head">${o.logo ? `<img src="${o.logo}" alt="LIUNA Local 1776">` : '<b>LIUNA Local 1776</b>'}<div><b>LIUNA Local 1776</b>${esc(ADDRESS)}</div></div>`;
const f = (label, value) => `<div class="f"><span class="lab">${esc(label)}</span><div class="val">${value}</div></div>`;
const signed = r => `<div class="sigrow"><div><div class="line"><span class="sig" style="font-size:17pt">${esc(r.signature)}</span></div><span class="lab">Employee Signature (typed)</span></div><div><div class="line">${esc(day(r.submittedAt))}</div><span class="lab">Date</span></div></div>`;

// ── PDF 1 · Designation of Representation ────────────────────────────────────────────────────────────────────────────
export function designationHtml(r, o = {}) {
  const poc = { ...POC, ...(o.poc || {}) }, topics = topicNames(r);
  return doc('Designation of Representation — ' + fullName(r), `<div class="page">
${head(o)}
<div class="kick">Union Representation</div>
<h1>Designation of Representation</h1>
<p class="sub">${esc(day(r.submittedAt))}</p>
<p>To Whom It May Concern:</p>
<p>I appoint LIUNA Local 1776 to act as my representative in the matter below. Effective immediately, all communication and correspondence about this matter shall be directed to Local 1776, which will relay it to me as needed. From this day forward, I request that a representative designated by Local 1776 be present, in person or by teleconference, at all formal meetings and discussions between me and any agency representative about this matter.</p>
<h2>The Matter</h2>
<div class="box">${f(topics.length > 1 ? 'Request Types' : 'Request Type', `<b>${esc(topics.join(' · '))}</b>`)}</div>
<h2>Employee and Agency</h2>
<div class="grid g2">
  ${f('Employee', esc(fullName(r)))}${f('Agency', esc(r.agencyName))}
  ${f('Position', v(r.positionTitle))}${f('Pay Plan, Series and Grade', v(r.grade))}
  ${f('Duty Station', v(r.dutyLocation))}${f('Work Section', v(r.workSection))}
</div>
${signed(r)}
<h2>Instructions for the Agency</h2>
<p>The employee named above has requested union representation concerning ${esc(list(topics))}. Do not communicate with the employee directly about this matter; doing so may violate federal law. Direct all communication by email to the union representative named below. Documents that cannot be emailed may be faxed. If a document cannot be sent by email or fax, contact the representative for a mailing address.</p>
<div class="box"><span class="lab">Union Point of Contact</span><div class="nw"><b>${esc(poc.name)}</b>, ${esc(poc.title)}</div><div class="nw">${esc(poc.email)} · Tel. ${esc(poc.phone)} · Fax ${esc(poc.fax)}</div></div>
</div>`, 'pk');   // same delicate rules as Request Details (Ben, Nov 21 2026)
}

// Each contract's grievance form (Appendix B/C/D of the signed agreement). The boxes are the same in all eleven; the title,
// the number of steps and the arbitration notes under the form differ (Nevada's printed form has only Steps 1 and 2).
// TARC has no approved agreement yet, so its employees use the PEC agreement and its form (Ben, Nov 21 2026).
// "Other Agency" has no contract with Local 1776, so no grievance form: Request Details starts with the Case Narrative.
const NG = s => [s + ' NATIONAL GUARD GRIEVANCE FORM', 'PLEASE PRINT CLEARLY'];
const GFORMS = {
  ARNG: { title: ['NATIONAL GUARD PROFESSIONAL EDUCATION CENTER GRIEVANCE FORM', '(PLEASE PRINT CLEARLY)'], steps: 3, foot: false },
  CA: { title: NG('CA'), steps: 3, foot: true }, GU: { title: NG('GU'), steps: 3, foot: true },
  IL: { title: NG('IL ARMY'), steps: 3, foot: true }, LA: { title: NG('LA'), steps: 3, foot: true },
  MI: { title: NG('MI ARMY'), steps: 3, foot: true }, NV: { title: NG('NV'), steps: 2, foot: true },
  NM: { title: NG('NM'), steps: 3, foot: true }, SC: { title: NG('SC'), steps: 3, foot: false },
  SD: { title: NG('SD'), steps: 3, foot: true }, UT: { title: NG('UT'), steps: 3, foot: true },
};
export function gform(r) {
  const a = String(r.agency || '');
  if (!a || a === 'OTHER') return null;
  return GFORMS[a.replace(/-(ARMY|AIR|PEC|TARC)$/, '')] || null;
}

// ── PDF 2 · Request Details (was "Case Packet" until Nov 22 2026) ──────────────────────────────────────────────────────────────────────────────────────────────
const STAGE = { proposed: 'Proposed', decided: 'Decision Issued', unsure: 'Not Sure' };
const YN = { yes: 'Yes', no: 'No', unsure: 'Not Sure' };
const TERMS = `
<p><b>Cost of representation.</b> If Local 1776 accepts your request, you may be responsible for some or all of the costs Local 1776 incurs representing you, whether or not you are a member. Depending on the complexity of the case, the expected workload and the need for legal counsel, Local 1776 may charge a retainer to cover some or all of those costs. These are the minimum fees; the actual fee depends on the merits and complexity of each case. Local 1776 may waive fees case by case, especially when you are, or will be, facing a financial hardship.</p>
<p><b>Non-Adverse Action</b> (counseling, reprimand, suspension of 14 days or less): $700+. Includes formal meetings and investigatory (Weingarten) interviews, your reply or rebuttal when needed, and a grievance through the agency&rsquo;s final decision. Does not include arbitration.</p>
<p><b>Adverse Action</b> (suspension of 15 days or more, demotion, removal): $1,400+. Includes formal meetings and investigatory (Weingarten) interviews, your reply to the proposed action letter, and representation through the agency&rsquo;s final decision, or a grievance through its final step. Does not include arbitration or an MSPB appeal.</p>
<p><b>Discrimination Complaint</b> (EEO complaint or grievance): $1,400+. Includes whichever route the union chooses: an EEO complaint, from your request for counseling through your request for a hearing, or a grievance, through the agency&rsquo;s final decision. Does not include arbitration or the EEO hearing, depending on the route.</p>
<p><b>MSPB Appeal</b> (initial appeal only): $1,400+. Includes filing the appeal, the hearing, and representation through the administrative judge&rsquo;s initial decision. Does not include a petition for review or anything after it.</p>
<p><b>All other situations:</b> $700+ minimum.</p>
<p><b>Arbitration, Hearings, and Attorney Fees.</b> LIUNA Local 1776 decides whether a case moves forward to arbitration, an Equal Employment Opportunity (EEO) hearing, or an appeal to the Merit Systems Protection Board (MSPB). The union also decides whether to bring in an attorney. Attorney fees can come up at any of these stages, not only in arbitration. Who pays those fees (you, the union, or both) and how much each pays is decided case by case, based on the strength of the case. This applies equally to members and non-members.</p>
<p><b>When the Union Declines or Ends Representation.</b> LIUNA Local 1776 alone decides whether to accept a case and whether to continue with it. That decision is based on the merits of the case, meaning how strong it is. It is never based on whether you are a member or on who you are. The union may end its representation if, for example, you have been offered a fair settlement or the best settlement you are likely to get, or if the union concludes the case cannot be won. The union may also end its representation if you withhold information or are not truthful with us.</p>
<p><b>Representation Fee on Monetary Awards.</b> When LIUNA Local 1776 obtains a monetary settlement or award for you, the union charges a representation fee of 10% of the total amount, calculated before taxes. The fee applies whether money is the entire result of your case or only part of it. The agency pays the settlement to the union. The union retains its 10% representation fee and pays the remaining 90% to you. For example, on a $50,000 settlement, the union retains $5,000 as its representation fee and you receive $45,000. This fee is separate from, and in addition to, any other costs or fees, including attorney fees.</p>
<p><b>No Guarantee of Results.</b> Choosing a representative is an important decision. Every case is different, and the outcome depends on many factors, including the facts and the merits of the case. LIUNA Local 1776 and its representatives cannot guarantee or promise any particular outcome. Results in past cases do not guarantee a similar result in yours.</p>
<p><b>Disclaimer.</b> This request collects information only. It is not legal advice, not a guarantee of representation and not an agreement to accept your case. A qualified representative will review your request. Local 1776 decides whether to represent you on the merits of your case, not on whether you are a member.</p>`;

// a section that never splits across two pages (Ben, Nov 21 2026)
const sec = (title, body) => `<section class="sec"><h2>${title}</h2>${body}</section>`;

export function packetHtml(r, o = {}) {
  const F = facts(r), topics = F.topics, inc = F.incidents.slice().sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
  const filings = F.filings, dl = F.deadlines, name = fullName(r);
  const adverse = F.adverse, urgent = F.urgent, t32 = r.status === 'Title 32';
  const tagged = inc.some(n => (n.topics || []).length);   // v1, or several topics at once: each incident names its topics
  const matter = F.v2 && topics.length === 1 ? ' · ' + esc(topics[0].topic) : '';
  const incWhen = n => n.date ? (n.ongoing ? 'Began ' + day(n.date) + ' · Still Going On' : day(n.date)) : 'No date given';
  const incShort = n => n.date ? (n.ongoing ? 'Began ' + short(n.date) + ' · Still Going On' : short(n.date)) : 'No date given';

  // page 1: the grievance form from the employee's own contract (its appendix), filled in. Same boxes in every
  // contract; the employee's words go on the Case Narrative attached right after it.
  const form = gform(r);
  const slash = s => s ? new Date(s + 'T12:00:00Z').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', timeZone: 'UTC' }) : '';
  const outcomeFits = String(F.outcome || '').length <= 450 && !/\n/.test(F.outcome || '');
  const cell = (label, value, span, cls) => `<td colspan="${span}"${cls ? ` class="${cls}"` : ''}><span>${label}</span>${value ? `<div class="fv">${value}</div>` : ''}</td>`;
  const box = on => `<i class="cb">${on ? '✓' : ''}</i>`;
  const grievance = !form ? '' : `<div class="page cba">
<table class="gform">
<tr><th colspan="4" class="bar">${form.title.map(esc).join('<br>')}</th></tr>
<tr>${cell('Employee Name', esc([r.lastName, r.firstName].filter(Boolean).join(', ')), 2)}${cell('Employee Telephone', esc(r.phone), 2)}</tr>
<tr>${cell('Duty Location', esc(r.dutyLocation), 2)}${cell('Work Section', esc(r.workSection), 2)}</tr>
<tr>${cell('Grievance Narrative (please include Article and Section of CBA that applies)', 'See attached Case Narrative.', 4, 'tall')}</tr>
<tr>${cell('Proposed Resolution', (outcomeFits ? esc(F.outcome) : 'See attached Case Narrative.') + '<br><br>Additionally, any other relief awardable by an arbitrator if the matter is not resolved beforehand, to include attorney fees.', 4, 'tall')}</tr>
<tr><td colspan="4"><span>Union Representation</span><div class="opts">${box(true)}Employee Request Union Representation<b class="gap"></b>${box(false)}Employee Waives Union Representation</div></td></tr>
<tr>${cell('Employee Signature', `<span class="sig" style="font-size:17pt">${esc(r.signature)}</span>`, 2)}${cell('Date', esc(slash(String(r.submittedAt || '').slice(0, 10))), 2)}</tr>
${Array.from({ length: form.steps }, (_, i) => `<tr><th colspan="4" class="bar l">Step ${i + 1}</th></tr>
<tr>${cell('Date Submitted', '', 1)}${cell('Response Date', '', 1)}${cell('Management Representative Name/Position', '', 2)}</tr>
<tr><td colspan="2"><span>Resolved (attach justification)</span><div class="opts">${box()}YES<b class="gap s"></b>${box()}NO</div></td>${cell('Management Representative Signature', '', 2)}</tr>`).join('\n')}
</table>
${form.foot ? '<p class="gfoot">- If the grievance is not resolved at Step 3 the Parties may invoke arbitration.<br>- Only the Union or the Agency may invoke arbitration.</p>' : ''}
</div>`;

  const narrative = `<div class="page">
${head(o)}
<div class="kick">${form ? 'Attachment to the Grievance Form · Confidential' : 'Request Details · Confidential'}</div>
<h1>Case Narrative</h1>
<p class="sub">${esc(name)} · ${esc(r.agencyName)}${matter}</p>
<h2>What Happened</h2>
${inc.map((n, i) => `<div class="inc"><div class="when">Incident ${i + 1} · ${esc(incWhen(n))}${(n.topics || []).length ? ' · ' + esc(n.topics.join(', ')) : ''}</div>${para(n.what)}</div>`).join('') || '<p class="none">—</p>'}
${sec('Outcome Desired', para(F.outcome))}
</div>`;

  // then the Request for Assistance: everything the employee told us
  const medShown = r.medicalAuth === 'yes' || r.medicalAuth === 'no';
  const probation = r.probation === 'yes' ? 'Yes' + (r.probationEnds ? ', ends ' + short(r.probationEnds) : '') : (YN[r.probation] || '');
  const items = t => (t.items || []).map(i => {
    const txt = esc(i.item) + (i.choices && i.choices.length ? ': ' + esc(i.choices.join(', ')) : '');
    return i.adverse ? `<span class="adv">${txt} (Adverse Action)</span>` : txt;
  }).join('<span class="dot"> · </span>');
  const rfa = `<div class="page">
${head(o)}
<div class="kick">Request Details · Confidential</div>
<h1>Request for Assistance</h1>
<p class="sub">Received ${esc(stamp(r.submittedAt))}${r.id ? ' · Request ' + esc(r.id) : ''}${matter}</p>
<div class="tiles">
  <div class="tile${adverse ? ' hot' : ''}"><span class="lab">Adverse Action</span><b>${adverse ? 'Yes' : 'No'}</b></div>
  <div class="tile${urgent ? ' hot' : ''}"><span class="lab">Deadline Within 7 Days</span><b>${urgent ? 'Yes' : 'No'}</b></div>
  <div class="tile"><span class="lab">Incidents</span><b>${inc.length}</b></div>
  <div class="tile"><span class="lab">Filed in Writing</span><b>${filings.length}</b></div>
</div>
${sec('The Employee', `<div class="grid g3">
  ${f('Name', esc(name) + (r.goesBy ? ` (goes by ${esc(r.goesBy)})` : ''))}${f('Cell Phone', v(r.phone) + (r.textOk ? ` · Texts ${r.textOk === 'yes' ? 'OK' : 'Not OK'}` : ''))}${f('Email', v(r.email))}
  ${f('Home Address', v([r.street, r.city, r.stateZip].filter(Boolean).join(', ')))}
</div>`)}
${sec('The Job', `<div class="grid g3">
  ${f('Agency', esc(r.agencyName))}${f('Status', v(t32 ? 'Dual-Status Technician (Title 32)' : r.status))}${f('Position', v(r.positionTitle))}
  ${f('Pay Plan, Series and Grade', v(r.grade))}${f('Duty Location', v(r.dutyLocation))}${f('Work Section', v(r.workSection))}
  ${f('Hire Date', v(day(r.hireDate)))}${f('Service Computation Date (Leave)', v(day(r.scdLeave)))}${f('Probationary or Trial Period', r.probation === 'yes' ? `<span class="adv">${esc(probation)}</span>` : v(probation))}
  ${f('Supervisor or Manager', v(YN[r.supervisorRole]))}${f('Supervisor', v(r.supervisorName))}${f('Supervisor Email', v(r.supervisorEmail))}
  ${t32 ? f('Military Unit', v(r.militaryUnit)) + f('MOS or AFSC', v(r.mosAfsc)) + f('Over 20', v(YN[r.over20])) : ''}
</div>
<p class="small" style="margin-top:8px">Asked to email their most current SF-50 and last three performance appraisals (from MyBiz+ or the HRO portal) to documents@local1776.org.</p>`)}
<section><h2>What&rsquo;s Going On</h2>
${topics.map(t => `<div class="sec"><h3>${esc(t.topic)}</h3><p class="items">${items(t) || '<span class="none">Described in the narrative</span>'}</p></div>`).join('')}
${F.stage ? `<div class="sec"><h3>About the Action</h3><div class="grid g4">${f('Where It Stands', v(STAGE[F.stage]))}${f('Received', v(day(F.receivedDate)))}${F.stage === 'proposed' ? f('Reply Due', v(day(F.replyDue))) : ''}${F.stage === 'decided' ? f('Effective Date', v(day(F.effectiveDate))) : ''}</div></div>` : ''}
${F.interviewDate ? `<div class="sec"><h3>About the Investigation</h3>${f('Interview Date', esc(day(F.interviewDate)))}</div>` : ''}
${F.eeoContact ? `<div class="sec"><h3>EEO</h3>${f('Contacted an EEO Counselor', F.eeoContact === 'yes' ? 'Yes' : 'No')}</div>` : ''}
</section>
${sec('Incidents', `<table><tr><th style="width:9%">No.</th><th${tagged ? ' style="width:34%"' : ''}>When</th>${tagged ? '<th>Topics</th>' : ''}</tr>
${inc.map((n, i) => `<tr><td>${i + 1}</td><td class="nw">${esc(incShort(n))}</td>${tagged ? `<td>${esc((n.topics || []).join(', '))}</td>` : ''}</tr>`).join('')}</table>
<p class="small" style="margin-top:4px">The employee&rsquo;s own words for each incident, and the outcome desired, are on the Case Narrative.</p>`)}
${sec('Management', F.talkedMgmt === 'yes' ? `<div class="grid g3">${f('Talked To', v(F.mgmtName))}${f('Position', v(F.mgmtPosition))}${f('What They Said', v(F.mgmtSaid))}</div>` : `<p>${F.talkedMgmt === 'no' ? 'Has not talked to management about it.' : '<span class="none">No answer.</span>'}</p>`)}
${sec('Filed in Writing', filings.length ? `<table><tr><th>What</th><th>Date</th><th>Filed With</th><th>About</th><th>What It Says</th><th>Reply So Far</th></tr>
${filings.map(x => `<tr><td><b>${esc(x.what)}</b></td><td class="nw">${v(short(x.date))}</td><td>${v(x.filedWith)}</td><td>${v(x.about)}</td><td>${v(x.summary)}</td><td>${v(x.reply)}</td></tr>`).join('')}</table>` : '<p>Nothing filed in writing.</p>')}
${sec('Deadlines That May Apply', dl.length ? `<table class="dl">${dl.map(d => `<tr><td>${esc(d.what)}</td><td class="p">${d.date < String(r.submittedAt || '').slice(0, 10) ? '<span class="tag amber">Passed</span>' : ''}</td><td class="d"><b>${esc(day(d.date))}</b></td></tr>`).join('')}</table>
<p class="small" style="margin-top:4px">Worked out on the website from the dates the employee entered. &ldquo;Passed&rdquo; means the date had already gone by when the request came in. Check each one against the documents.</p>` : '<p>None worked out from the dates given.</p>')}
${sec('Permissions', `<div class="grid g2">
  ${f('Personnel Records and Personal Information', `<b>${r.recordsAuth === 'yes' ? 'Authorized' : 'Not Authorized'}</b>`)}
  ${medShown ? f('Medical Information', `<b>${r.medicalAuth === 'yes' ? 'Authorized' : 'Not Authorized'}</b>`) : ''}
</div>
<div class="small" style="margin-top:6px">
  <p>${r.recordsAuth === 'yes' ? '✓' : '✗'} I authorize Local 1776 to request my personnel records and personal information from my agency (such as my SF-50s, personnel folder and any investigation file) to work my case. My agency may ask me to sign its own release form too.</p>
  ${medShown ? `<p>${r.medicalAuth === 'yes' ? '✓' : '✗'} I authorize Local 1776 to request my medical records from my agency to work my case.</p>` : ''}
</div>`)}
${yes(r.hardship) ? sec('Hardship Waiver Request', `<div class="grid g3">
  ${f('Asking For', `<span class="adv">${esc({ full: 'Full Waiver', reduced: 'Reduced Fee', plan: 'Payment Plan' }[r.hsRequest] || '—')}</span>`)}${f('Why', v(J(r.hsReasons).join(' · ')))}${f('People in Household', v(r.hsHousehold))}
  ${f('Unpaid Hours, Next 90 Days', v(r.hsUnpaidHours))}${f('Paid Leave Left (Hours)', v(r.hsLeaveHours))}${f('Savings and Cash on Hand', v(usd(r.hsSavings)))}
  ${f('Take-Home Pay / Month', v(usd(r.hsTakeHome)))}${f('Other Household Income / Month', v(usd(r.hsOtherIncome)))}${f('Must-Pay Bills / Month', v(usd(r.hsBills)))}
  ${r.hsRequest === 'full' ? '' : f('Can Pay Now', v(usd(r.hsPayNow))) + f('Can Pay Each Month', v(usd(r.hsPayMonthly)))}
</div>
<h3>In Their Words</h3>${para(r.hsExplain)}
<p class="small">${yes(r.hsCertify) ? '✓' : '✗'} I certify that my hardship request is true and complete. I understand Local 1776 decides whether to grant it. · Asked to email proof to documents@local1776.org; a request without proof is not considered.</p>`) : ''}
${sec('Acknowledgments', `<div class="small">
  <p>${yes(r.voluntary) ? '✓' : '✗'} I am asking Local 1776 for representation on my own. Sending this form does not mean Local 1776 has agreed to represent me.</p>
  <p>${yes(r.merits) ? '✓' : '✗'} I understand Local 1776 decides whether to represent me on the merits of my case, not on whether I am a member.</p>
  <p>${yes(r.costs) ? '✓' : '✗'} I have read the costs of representation. I may be responsible for some or all of them, member or not.</p>
  <p>${yes(r.privacy) ? '✓' : '✗'} I have read the Privacy Policy. What I send is used only to represent me.</p>
</div>`)}
${sec('Terms', `<div class="small">${TERMS}</div>${signed(r)}`)}
</div>`;
  return doc('Request Details — ' + name, grievance + narrative + rfa, 'pk');
}

// Running header and footer for the printed PDFs (Chrome's headerTemplate / footerTemplate).
// Header: a probation notice across the top of every Request Details page, grievance form included (Ben, Nov 21 2026).
export const header = r => r.probation !== 'yes' ? '<span></span>' :
  `<div style="width:100%;font-family:Arial,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:.08em;color:#b45f00;text-align:center;padding:0 0.6in">EMPLOYEE ON PROBATION${r.probationEnds ? ' · PROBATION ENDS ' + esc(day(r.probationEnds)).toUpperCase() : ''}</div>`;
// Footer: page numbers; on Request Details also the confidentiality notice on every page.
export const footer = (label, r, confidential) => `<div style="width:100%;font-family:Arial,sans-serif;font-size:7.5px;color:#5f6672;padding:0 0.6in">
  <div style="display:flex;justify-content:space-between"><span>LIUNA Local 1776 &middot; ${esc(label)} &middot; ${esc(fullName(r))}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>
  ${confidential ? `<div style="margin-top:2px;font-size:6.5px;line-height:1.35">CONFIDENTIAL: personal${r.medicalAuth ? ' and medical' : ''} information, only for people with the authority and a need to know. If you are not authorized to see this document, or you found it, do not read, copy or discuss anything in it; return it to LIUNA Local 1776 right away (1 (800) 569-5861 &middot; contact_us@local1776.org).</div>` : ''}</div>`;
