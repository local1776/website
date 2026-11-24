// Representation Request (Ben, Nov 21 2026; paged Nov 22 2026). The form unlocks once the employing agency is chosen; the
// Guard seal of the branch lights up. It goes one step at a time (Back / Next): first the employee, the job and the topic
// tiles; then ONE PAGE PER TOPIC picked, in the order picked, each with that topic's own checklist, follow-ups, incidents,
// outcome, management, filings and deadlines (Local 1776 handles each topic as its own request); last Sign and Send.
// Every box has a short plain-English explainer under it; some open a follow-up choice. The form works out what counts as
// an adverse action (MSPB-appealable, 5 U.S.C. 7512) and which deadlines may apply — the employee never has to. It only
// takes in facts: no advice. "Other Agency" (no Local 1776 contract) limits the choices to adverse actions and
// discrimination. Save for Later keeps the answers in this browser only (never the signature) for 30 days.
// Sends formVersion "2": the given-once fields by name, and "topics" = JSON [{key, topic, items, ...that topic's facts}].
(function () {
  var form = document.getElementById('rq');
  if (!form) return;
  var $ = function (s, root) { return (root || form).querySelector(s); };
  var val = function (n) { var c = form.querySelector('input[name="' + n + '"]:checked'); return c ? c.value : ''; };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };

  // Icons: Lucide (lucide.dev), ISC License — Copyright (c) Lucide Contributors 2022; portions Copyright (c) Cole Bemis
  // 2013-2022 as part of Feather (MIT). Permission to use, copy, modify, and/or distribute this software for any purpose
  // with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in
  // all copies. (24 x 24 icons)
  var ICON = {
    "gavel": "<path d=\"m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8\" /><path d=\"m16 16 6-6\" /><path d=\"m8 8 6-6\" /><path d=\"m9 7 8 8\" /><path d=\"m21 11-8-8\" />",
    "briefcase": "<path d=\"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\" /><rect width=\"20\" height=\"14\" x=\"2\" y=\"6\" rx=\"2\" />",
    "user-search": "<circle cx=\"10\" cy=\"7\" r=\"4\" /><path d=\"M10.3 15H7a4 4 0 0 0-4 4v2\" /><circle cx=\"17\" cy=\"17\" r=\"3\" /><path d=\"m21 21-1.9-1.9\" />",
    "scale": "<path d=\"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z\" /><path d=\"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z\" /><path d=\"M7 21h10\" /><path d=\"M12 3v18\" /><path d=\"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2\" />",
    "hand-helping": "<path d=\"M11 12h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 14\" /><path d=\"m7 18 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9\" /><path d=\"m2 13 6 6\" />",
    "circle-dollar-sign": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8\" /><path d=\"M12 18V6\" />",
    "calendar-days": "<path d=\"M8 2v4\" /><path d=\"M16 2v4\" /><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" /><path d=\"M3 10h18\" /><path d=\"M8 14h.01\" /><path d=\"M12 14h.01\" /><path d=\"M16 14h.01\" /><path d=\"M8 18h.01\" /><path d=\"M12 18h.01\" /><path d=\"M16 18h.01\" />",
    "award": "<path d=\"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526\" /><circle cx=\"12\" cy=\"8\" r=\"6\" />",
    "hard-hat": "<path d=\"M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5\" /><path d=\"M14 6a6 6 0 0 1 6 6v3\" /><path d=\"M4 15v-3a6 6 0 0 1 6-6\" /><rect x=\"2\" y=\"15\" width=\"20\" height=\"4\" rx=\"1\" />",
    "shield-alert": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /><path d=\"M12 8v4\" /><path d=\"M12 16h.01\" />",
    "square-plus": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" /><path d=\"M8 12h8\" /><path d=\"M12 8v8\" />"
  };
  // each contract's "Procedure for Unsafe/Hazardous Assignments" section (imminent danger; the employee may decline the task)
  var SAFETY = {"ARNG":{"sec":"11.3","href":"/national-guard-professional-education-center-PEC-collective-bargaining-agreement#s11-3"},"CA":{"sec":"11.4","href":"/california-army-national-guard-collective-bargaining-agreement#s11-4"},"GU":{"sec":"11.4","href":"/guam-army-and-air-national-guard#s11-4"},"IL":{"sec":"11.4","href":"/illinois-army-national-guard-collective-bargaining-agreement#s11-4"},"LA":{"sec":"11.4","href":"/louisiana-army-and-air-national-guard#s11-4"},"MI":{"sec":"11.4","href":"/michigan-army-national-guard#s11-4"},"NV":{"sec":"11.4","href":"/nevada-army-national-guard#s11-4"},"NM":{"sec":"11.4","href":"/new-mexico-army-and-air-national-guard#s11-4"},"SC":{"sec":"11.4","href":"/south-carolina-army-and-air-national-guard#s11-4"},"SD":{"sec":"11.4","href":"/south-dakota-army-national-guard-collective-bargaining-agreement#s11-4"},"UT":{"sec":"11.4","href":"/utah-national-guard-collective-bargaining-agreement#s11-4"}};

  // an item: [label, explainer, flags]. flags: adv = adverse action (MSPB), oa = offered to "Other Agency" too,
  // eeo = counts as discrimination (EEO time limit), sub = a follow-up choice {h, one, cols, opts: [label or [label, note]]}
  var KIND = ['Disability or Medical Condition', 'Pregnancy', 'Religious Practice'];
  var TOPICS = [
    ['discipline', 'Discipline', 'Discipline', 'gavel', [
      ['Counseling (Verbal or Written)', 'Your supervisor talked to you or wrote you up about a problem. It is not formal discipline.'],
      ['Admonishment', 'A formal warning, less serious than a reprimand.'],
      ['Letter of Reprimand', 'A formal written warning that stays in your file for a set time.'],
      ['Suspension of 14 Days or Less', 'Sent home without pay for 14 days or fewer.'],
      ['Suspension of More Than 14 Days', 'Sent home without pay for 15 days or more.', { adv: 1 }],
      ['Indefinite Suspension', 'Sent home without pay with no end date, often while an investigation or clearance review is pending.', { adv: 1 }],
      ['Removal (Termination)', 'You were fired, or told you will be.', { adv: 1 }],
      ['Demotion', 'Moved to a lower grade as discipline.', { adv: 1 }],
      ['Reduction in Pay', 'Your basic pay was cut.', { adv: 1 }],
      ['Other Discipline', 'Any other action taken against you because of your conduct.']]],
    ['job', 'Job Change', 'Losing Your Job or a Job Change', 'briefcase', [
      ['Furlough of 30 Days or Less', 'Sent home without pay for up to 30 days in a row, or up to 22 workdays spread out, usually for lack of money or work.', { adv: 1 }],
      ['Reduction in Force or Longer Furlough', 'A reduction in force (RIF) cuts jobs by set rules: people are moved, downgraded or let go. A longer furlough is more than 30 days in a row or more than 22 workdays spread out.', { adv: 1 }],
      ['Position Abolished', 'Your job was eliminated.'],
      ['Downgrade (Reclassification)', 'Your job was reviewed and given a lower grade.'],
      ['Removal for Loss of Military Membership', 'Fired because you lost your Guard membership, which a dual-status technician must keep.', { adv: 1 }],
      ['Removal for Medical Inability to Do the Job', 'Fired because the agency says a medical condition keeps you from doing your job.', { adv: 1 }],
      ['Loss of a Security Clearance', 'Your clearance was suspended or taken away, or you were told it will be.'],
      ['Probationary Termination', 'Let go during your first year in the job (your trial period).'],
      ['Reassignment or Detail', 'Moved to another job or place, for good (reassignment) or for a while (detail).'],
      ['Other Job Change', 'Anything else about your job changing.']]],
    ['investigation', 'Investigation', 'Investigation', 'user-search', [
      ['Questioned as the Subject', 'You are the one being looked into.'],
      ['Questioned as a Witness', 'You were asked what you saw or know about someone else.'],
      ['AR 15-6 or Commander’s Inquiry', 'A fact-finding inquiry ordered by a commander (Air Guard: a Commander-Directed Investigation).'],
      ['CID or OSI Investigation', 'A criminal investigation by Army CID or Air Force OSI.'],
      ['Inspector General Complaint', 'Someone filed an Inspector General complaint about you, or the IG is asking you about one.'],
      ['Drug or Alcohol Test', 'You were ordered to test, or a test came back positive.'],
      ['Security Clearance Review', 'Your clearance is being reviewed.'],
      ['Other Investigation', 'Any other inquiry into you or your work.']]],
    ['discrimination', 'Discrimination', 'Discrimination and Harassment', 'scale', [
      ['Race', 'Treated worse because of your race.'],
      ['Color', 'Treated worse because of how light or dark your skin is.'],
      ['Religion', 'Treated worse because of your religion or beliefs, or for having none.'],
      ['Sex', 'Treated worse because you are a man or a woman.'],
      ['Sexual Orientation or Gender Identity', 'Treated worse because you are gay, lesbian, bisexual or transgender.'],
      ['Pregnancy', 'Treated worse because you are pregnant, recently gave birth, or have a related condition.'],
      ['National Origin', 'Treated worse because of where you or your family come from, your accent or your ethnicity.'],
      ['Age (40 or Older)', 'Treated worse because you are 40 or older.'],
      ['Disability or Medical Condition', 'Treated worse because of a physical or mental condition, or a history of one.'],
      ['Genetic Information', 'Treated worse because of your family medical history or a genetic test.'],
      ['Retaliation for an Earlier Complaint', 'Treated worse because you filed or helped with an EEO complaint, or spoke up about discrimination.'],
      ['Military Service (USERRA)', 'Treated worse because of your military service or duty.'],
      ['Sexual Harassment', 'Unwanted sexual comments, advances or touching, or being asked for sex in return for job favors.'],
      ['Hostile Work Environment', 'Harassment for any of the reasons above that is bad enough, or happens often enough, to make work hostile.']]],
    ['accommodation', 'Accommodation', 'Accommodation', 'hand-helping', [
      ['I Was Denied One', 'You asked your agency for a change at work because of a medical condition, pregnancy or religious practice, and they said no or never answered.',
        { oa: 1, eeo: 1, sub: { h: 'For What?', cols: 1, opts: KIND } }],
      ['I Need Help Asking for One', 'You want Local 1776 to help you ask your agency for a change at work.', { sub: { h: 'For What?', cols: 1, opts: KIND } }]]],
    ['pay', 'Pay', 'Pay and Benefits', 'circle-dollar-sign', [
      ['Missing or Wrong Pay', 'A paycheck that was short, late or missing.'],
      ['Back Pay Owed', 'Pay you should have gotten for time you were wrongly kept from working or paid too little.'],
      ['Overtime or Comp Time', 'Extra hours you worked that were not paid or credited correctly.'],
      ['Hazard or Environmental Pay', 'Extra pay for dangerous or dirty work: hazardous duty pay (GS) or environmental differential (wage grade).'],
      ['Debt or Overpayment Letter', 'A letter saying you were overpaid and must pay money back.'],
      ['Travel or TDY Pay', 'Travel orders, per diem or repayment for official travel.'],
      ['Retirement', 'Your retirement date, service credit, estimate or annuity.'],
      ['Thrift Savings Plan (TSP)', 'Your TSP account or the agency’s contributions to it.'],
      ['Health Benefits', 'Your health, dental, vision or life insurance coverage.'],
      ['Injury Compensation (OWCP)', 'Workers’ compensation for an injury or illness caused by your job.']]],
    ['leave', 'Leave', 'Leave and Hours', 'calendar-days', [
      ['Leave Denied', 'You asked for time off and were told no.', { sub: { h: 'Which Kind of Leave?', cols: 2, opts: ['Annual', 'Sick', 'Military', 'Court', 'Bereavement', 'FMLA',
        'Paid Parental', 'Unpaid (LWOP)', 'Comp Time', 'Credit Hours', 'Administrative', 'Donated'] } }],
      ['Leave Restoration', 'Annual leave you lost at the end of the year because work or an emergency kept you from using it.'],
      ['Military Leave', 'Problems with your paid leave for military duty (20 days a year), such as hours charged wrong.'],
      ['Family and Medical Leave (FMLA)', 'Up to 12 weeks of job-protected time off a year for a serious health condition, a new child, or a sick family member.'],
      ['Leave Without Pay', 'Unpaid time off that was refused, or that you were put on without asking.'],
      ['Marked AWOL', 'Marked absent without leave for time you believe was approved, or should have been.'],
      ['Work Schedule', 'Changes to your shift, hours or days off.'],
      ['Telework', 'Telework that was denied, cut back or ended.']]],
    ['promotion', 'Promotion', 'Hiring, Promotion and Performance', 'award', [
      ['Non-Selection', 'You applied for a job, promotion or training and someone else was picked. It matters when the hiring rules were not followed, or the pick was based on something other than merit, such as favoritism or discrimination.'],
      ['Promotion', 'Moving up to a higher grade. Pick this if a promotion you qualify for has not happened (such as a career-ladder step), or you do higher-graded work without the pay.'],
      ['Within-Grade Increase Denied', 'Your regular step increase was held back because your work was rated not acceptable.'],
      ['Appraisal Rating', 'You disagree with your yearly performance rating.'],
      ['Performance Improvement Plan (PIP)', 'You were given a set time to bring your work up to standard (also called an opportunity period).'],
      ['Removal for Performance', 'Fired or demoted because of how you do your job, not because of conduct.', { adv: 1 }]]],
    ['safety', 'Safety', 'Safety and Working Conditions', 'hard-hat', [
      ['Unsafe Conditions', 'Something at work could hurt or sicken someone.', { sub: { h: 'How Serious Is It?', one: 1, cols: 1, opts: [
        ['Danger Right Now', 'A risk of death or serious injury too close to wait for the normal hazard-reporting process.'],
        ['Needs to Be Fixed', 'A hazard that should be reported and fixed, but is not about to hurt someone right away.']] } }],
      ['Protective Gear', 'Gear your job requires to work safely (gloves, glasses, hearing protection, respirators) that you were not given, or that is worn out.'],
      ['Injury at Work', 'You were hurt or made sick by your job.'],
      ['Building or Work Area', 'Heat or air conditioning, lighting, restrooms, mold, crowding or other problems with the place you work.']]],
    ['retaliation', 'Retaliation', 'Retaliation', 'shield-alert', [
      ['For Union Activity', 'Treated worse because you asked for a union representative, or because you acted for the union: filing or helping with a grievance, serving as a steward or officer, or speaking up for the union.'],
      ['For Whistleblowing', 'Treated worse because you reported something you reasonably believe shows a broken law, rule or regulation; gross mismanagement; a gross waste of money; an abuse of authority; or a real danger to public health or safety. Usually not whistleblowing: disagreeing with a policy decision, or a personal dispute with your boss.'],
      ['Other Retaliation', 'Treated worse for something else the law protects, such as being a witness, filing an Inspector General complaint, using your leave rights, or refusing to break a law.']]],
    ['other', 'Other', 'Something Else', 'square-plus', []]
  ];
  // "Have You Filed Anything in Writing?" — each one checked asks for its date
  var FILED = [
    ['Grievance', 'A complaint under your union contract.'],
    ['EEO Complaint', 'A discrimination complaint with your agency’s EEO office.'],
    ['IG Complaint', 'A complaint to an Inspector General.'],
    ['MSPB Appeal', 'An appeal to the Merit Systems Protection Board.'],
    ['Special Counsel (OSC) Complaint', 'A complaint to the Office of Special Counsel, such as whistleblower reprisal.'],
    ['Safety Report', 'A written hazard report to your safety office.'],
    ['Letter to Congress', 'A letter or email to your Senator’s or Representative’s office.'],
    ['Written Reply', 'Your written answer to a proposed action.'],
    ['Something Else', 'Any other complaint, appeal or report in writing.']];
  var OTHER_AGENCY = ['discipline', 'job', 'discrimination', 'accommodation'];   // with no contract: adverse actions and discrimination only
  // grievance windows in each contract's Article 12 (calendar days; Michigan's steps are business days but filing is 30)
  var GRIEVE = { CA: 60, GU: 60, IL: 15, LA: 30, MI: 30, NV: 45, NM: 30, SC: 30, SD: 30, UT: 30 };

  var open = [];                       // topics picked, in the order picked; each gets its own page
  var tiles = $('.rq-topics'), tpages = $('.rq-tpages');
  var start = $('[data-page="start"]'), sign = $('[data-page="sign"]');
  var msg = $('.rq-nav .form-msg'), stepEl = $('[data-step]'), cur = 0;
  var isOther = function () { return form.elements.agency.value === 'OTHER'; };
  var code = function () { return form.elements.agency.value.replace(/-(ARMY|AIR|PEC|TARC)$/, ''); };
  var topic = function (k) { return TOPICS.filter(function (t) { return t[0] === k; })[0]; };
  var flag = function (i, f) { return !!(i[2] && i[2][f]); };
  var page = function (k) { return tpages.querySelector('[data-page="t:' + k + '"]'); };
  var pages = function () { return [start].concat(open.map(page)).concat([sign]); };
  var ADD = $('.rq-tpl-add').innerHTML;

  function drawTiles() {
    var list = TOPICS.filter(function (t) { return !isOther() || OTHER_AGENCY.indexOf(t[0]) >= 0; });
    open = open.filter(function (k) { return list.some(function (t) { return t[0] === k; }); });
    tiles.innerHTML = list.map(function (t) {
      return '<button type="button" class="itile" aria-pressed="' + (open.indexOf(t[0]) >= 0) + '" data-topic="' + t[0] + '" title="' + esc(t[2]) + '"><span class="box"><svg class="lu" viewBox="0 0 24 24" aria-hidden="true">' + ICON[t[3]] + '</svg></span><b>' + esc(t[1]) + '</b></button>';
    }).join('');
  }

  // ── one page per topic ──────────────────────────────────────────────────────────────────────────────────────────────
  // Everything on a topic page belongs to that topic. Its inputs carry data-tf (the field it fills in the topic's
  // object) and no plain name, so site.js never sends them one by one: they go out inside "topics".
  var radios = function (name, tf, opts) {
    return opts.map(function (o) { return '<label><input type="radio" name="' + name + '" value="' + o[0] + '" data-tf="' + tf + '"><span>' + o[1] + '</span></label>'; }).join('');
  };
  function makePage(k) {
    var t = topic(k), p = document.createElement('div'), id = function (s) { return 'rq-' + k + '-' + s; }, nm = function (s) { return '_' + k + '-' + s; };
    p.className = 'rq-page'; p.hidden = true;
    p.setAttribute('data-page', 't:' + k); p.setAttribute('data-k', k);
    p.innerHTML = '<fieldset class="fset"><legend><span class="rq-long">' + esc(t[2]) + '</span><span class="rq-short">' + esc(t[1]) + '</span></legend>' +   // short name on phones: one line
      '<div class="rq-checklist"></div>' +
      '<div class="rq-block" data-need="action" hidden><h3 class="ufig-h">About the Action</h3>' +
        '<fieldset class="seg"><legend>Where It Stands <i>*</i></legend><div class="seg-o">' + radios(nm('stage'), 'stage', [['proposed', 'Proposed'], ['decided', 'Decision Issued'], ['unsure', 'Not Sure']]) + '</div></fieldset>' +
        '<div class="fields">' +
          '<div class="field"><label for="' + id('got') + '">Date You Received It <i>*</i></label><input id="' + id('got') + '" data-tf="receivedDate" type="date" required></div>' +
          '<div class="field" data-stage="proposed" hidden><label for="' + id('reply') + '">Your Reply Is Due</label><input id="' + id('reply') + '" data-tf="replyDue" type="date"></div>' +
          '<div class="field" data-stage="decided" hidden><label for="' + id('eff') + '">Effective Date</label><input id="' + id('eff') + '" data-tf="effectiveDate" type="date"></div>' +
        '</div></div>' +
      (k === 'investigation' ? '<div class="rq-block"><h3 class="ufig-h">About the Investigation</h3><div class="fields"><div class="field"><label for="' + id('iv') + '">Interview Date, If Set</label><input id="' + id('iv') + '" data-tf="interviewDate" type="date"></div></div></div>' : '') +
      (k === 'discrimination' || k === 'accommodation' ? '<div class="rq-block" data-need="eeo" hidden><h3 class="ufig-h">' + (k === 'discrimination' ? 'About the Discrimination' : 'About the Denial') + '</h3>' +
        '<fieldset class="seg"><legend>Have You Contacted an EEO Counselor?</legend><div class="seg-o">' + radios(nm('eeo'), 'eeoContact', [['yes', 'Yes'], ['no', 'No']]) + '</div></fieldset></div>' : '') +
      '<div class="rq-block">' +
        '<h3 class="ufig-h">In Your Own Words</h3>' +
        '<p class="rq-explain">Tell us about each incident on its own card. If things happened on different days, add a card for each one.</p>' +
        '<div class="rq-incidents"></div>' +
        '<div class="rq-add">' + ADD + '<span>Add Another Incident</span></div>' +
        '<div class="fields"><div class="field full"><label for="' + id('want') + '">Outcome Desired <i>*</i></label><p class="rq-explain">For example: the removal taken back, the reprimand taken out of your file, back pay, leave restored, a move to another shift or supervisor, the harassment stopped. What you ask for should be reasonable: something the agency can actually do to fix the problem.</p><textarea id="' + id('want') + '" data-tf="outcome" maxlength="3000" required></textarea></div></div>' +
        '<fieldset class="seg"><legend>Have You Talked to Management About It? <i>*</i></legend><p class="rq-explain">Management means your supervisor, anyone above them in your chain of command, the Human Resources Office (HRO) or your commander. Pick Yes if you told any of them about this problem, in person, by phone or in writing.</p><div class="seg-o">' + radios(nm('mgmt'), 'talkedMgmt', [['yes', 'Yes'], ['no', 'No']]) + '</div></fieldset>' +
        '<div class="fields" data-show="mgmt" hidden>' +
          '<div class="field"><label for="' + id('mname') + '">Who You Talked To</label><input id="' + id('mname') + '" data-tf="mgmtName" maxlength="80"></div>' +
          '<div class="field"><label for="' + id('mpos') + '">Their Position</label><input id="' + id('mpos') + '" data-tf="mgmtPosition" maxlength="80"></div>' +
          '<div class="field two"><label for="' + id('msaid') + '">What They Said</label><input id="' + id('msaid') + '" data-tf="mgmtSaid" maxlength="300"></div>' +
        '</div>' +
        '<h3 class="ufig-h">Have You Filed Anything in Writing?</h3>' +
        '<p class="rq-explain">Check each one you have filed about this problem and give the date. Leave them all blank if you have not filed anything.</p>' +
        '<div class="rq-checks rq-filed">' + filedHtml(k) + '</div>' +
        '<p class="uf-note rq-copies" data-show="filed" hidden><b>Send us copies</b> of everything you filed, and any emails or replies, at <a href="mailto:documents@local1776.org">documents@local1776.org</a> with your name in the subject line.</p>' +
        '<div class="rq-dl" data-deadlines hidden><h3 class="ufig-h">Deadlines That May Apply</h3><ul></ul></div>' +
        '<p class="uf-note rq-docs" data-docs><b>Have papers?</b> Proposal letters, emails, photos: send them to <a href="mailto:documents@local1776.org">documents@local1776.org</a> with your name in the subject line.</p>' +
      '</div></fieldset>';
    drawChecklist(p);
    addIncident(p);
    return p;
  }
  // keep a page for every topic picked, in the order picked; drop the pages of topics taken off
  function syncPages() {
    [].slice.call(tpages.children).forEach(function (p) { if (open.indexOf(p.getAttribute('data-k')) < 0) p.remove(); });
    open.forEach(function (k) { tpages.appendChild(page(k) || makePage(k)); });
  }

  // one checklist row: the box, its name, the small explainer, and (once checked) its follow-up
  function row(key, label, note, attrs, sub, keep, extra) {
    var on = !!keep[key], h = '<div class="rq-item"><label class="chk"><input type="checkbox" data-key="' + esc(key) + '" value="' + esc(label) + '"' + attrs + (on ? ' checked' : '') +
      '><span><b>' + esc(label) + '</b><small>' + esc(note) + '</small></span></label>';
    if (sub) {
      h += '<div class="rq-sub" data-sub-of="' + esc(key) + '"' + (on ? '' : ' hidden') + '><p class="rq-sub-h">' + esc(sub.h) + ' <i>*</i></p><div class="rq-subgrid c' + (sub.cols || 2) + '">' +
        sub.opts.map(function (o) {
          var l = typeof o === 'string' ? o : o[0], n = typeof o === 'string' ? '' : o[1], sk = key + ' | ' + l;
          return '<label class="chk sm"><input type="' + (sub.one ? 'radio' : 'checkbox') + '" name="_' + esc(key) + '" data-key="' + esc(sk) + '" data-sub value="' + esc(l) + '"' + (keep[sk] ? ' checked' : '') +
            '><span>' + (n ? '<b>' + esc(l) + '</b><small>' + esc(n) + '</small>' : esc(l)) + '</span></label>';
        }).join('') + '</div>' + (extra || '') + '</div>';
    }
    return h + '</div>';
  }
  function kept(box) { var keep = {}; box.querySelectorAll('input[data-key]').forEach(function (c) { if (c.checked) keep[c.getAttribute('data-key')] = 1; }); return keep; }
  // the topic's checklist; "Other Agency" (no contract) shows only adverse actions, discrimination and a denied accommodation
  function drawChecklist(p) {
    var k = p.getAttribute('data-k'), t = topic(k), box = $('.rq-checklist', p), keep = kept(box), s = SAFETY[code()];
    var items = t[4].filter(function (i) { return !isOther() || k === 'discrimination' || flag(i, 'adv') || flag(i, 'oa'); });
    box.innerHTML = items.length ? '<div class="rq-checks">' + items.map(function (i) {
      var extra = i[0] === 'Unsafe Conditions' && s ? '<p class="rq-explain">Under your contract (<a href="' + s.href + '" target="_blank" rel="noopener">Section ' + s.sec + '</a>), an employee may decline a task that poses an imminent danger until it is made safe.</p>' : '';
      return row(k + ': ' + i[0], i[0], i[1], ' data-adverse="' + flag(i, 'adv') + '" data-eeo="' + flag(i, 'eeo') + '"', i[2] && i[2].sub, keep, extra);
    }).join('') + '</div>' : '<p class="uf-note">Tell us about it below.</p>';
  }
  function filedHtml(k) {
    return FILED.map(function (f, n) {
      var key = 'filed: ' + f[0], base = 'fd-' + k + '-' + n;
      var fld = function (x, l, type, max, ph, full) {
        return '<div class="field' + (full ? ' full' : '') + '"><label for="' + base + x + '">' + l + '</label><input id="' + base + x + '" data-ff="' + x + '"' +
          (type ? ' type="' + type + '"' : ' maxlength="' + max + '"') + (ph ? ' placeholder="' + ph + '"' : '') + '></div>';
      };
      return '<div class="rq-item"><label class="chk"><input type="checkbox" data-filed data-key="' + esc(key) + '" value="' + esc(f[0]) + '"><span><b>' + esc(f[0]) + '</b><small>' + esc(f[1]) + '</small></span></label>' +
        '<div class="rq-sub" data-sub-of="' + esc(key) + '" hidden><div class="rq-subfields">' +
        (f[0] === 'Something Else' ? fld('kind', 'What You Filed', '', 120, '', 1) : '') +
        fld('date', 'Date Filed', 'date') + fld('filedWith', 'Filed With', '', 80, 'Office or person') +
        fld('about', 'Who It’s About', '', 80, 'Person or office') + fld('reply', 'Any Reply So Far?', '', 200, '') +
        fld('summary', 'What It Says', '', 300, 'One or two lines', 1) + '</div></div></div>';
    }).join('');
  }
  function filings(p) {
    return [].slice.call(p.querySelectorAll('input[data-filed]:checked')).map(function (c) {
      var b = p.querySelector('.rq-filed [data-sub-of="' + c.getAttribute('data-key') + '"]'), o = { what: c.value };
      b.querySelectorAll('[data-ff]').forEach(function (i) { var x = i.value.trim(); if (i.getAttribute('data-ff') === 'kind') { if (x) o.what = x; } else o[i.getAttribute('data-ff')] = x; });
      return o;
    });
  }

  // "In Your Own Words": one card per incident (Ben, Nov 21 2026). Every card on a topic page belongs to that topic.
  var MAXINC = 10, seq = 0;
  var X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  function addIncident(p) {
    var n = ++seq, c = document.createElement('div');
    c.className = 'rq-inc';
    c.innerHTML = '<div class="rq-inc-h"><h4></h4><button type="button" class="btn icon sm alt" data-inc-drop title="Remove"><span class="ico">' + X + '</span><span class="lbl">Remove This Incident</span></button></div>' +
      '<div class="rq-inc-g"><div class="field"><label for="in-d' + n + '">Date <i>*</i></label><input id="in-d' + n + '" type="date" data-f="date"></div>' +
      '<label class="chk sm rq-ongoing"><input type="checkbox" data-f="ongoing"><span>Still Going On</span></label></div>' +
      '<p class="rq-explain">The day it happened. If it went on for a while, the day it started.</p>' +
      '<div class="field full"><label for="in-w' + n + '">What Happened <i>*</i></label><textarea id="in-w' + n + '" data-f="what" maxlength="4000" placeholder="Who, what, when and where."></textarea></div>';
    $('.rq-incidents', p).appendChild(c);
    numberIncidents(p);
    return c;
  }
  function numberIncidents(p) {
    var cards = p.querySelectorAll('.rq-inc');
    cards.forEach(function (c, i) { c.querySelector('h4').textContent = 'Incident ' + (i + 1); c.querySelector('[data-inc-drop]').hidden = cards.length < 2; });
    $('.rq-add', p).hidden = cards.length >= MAXINC;
  }
  function incidents(p) {
    return [].slice.call(p.querySelectorAll('.rq-inc')).map(function (c) {
      return { date: c.querySelector('[data-f="date"]').value, ongoing: c.querySelector('[data-f="ongoing"]').checked, what: c.querySelector('[data-f="what"]').value.trim() };
    });
  }

  function checked(p) { return [].slice.call(p.querySelectorAll('.rq-checklist input[data-key]:not([data-sub]):checked')); }
  function subs(p, c) { var b = p.querySelector('.rq-checklist [data-sub-of="' + c.getAttribute('data-key') + '"]'); return b ? [].slice.call(b.querySelectorAll('input:checked')).map(function (s) { return s.value; }) : null; }
  function show(sel, on, root) { (root || form).querySelectorAll(sel).forEach(function (el) { el.hidden = !on; }); }
  function tv(p, f) {
    var els = [].slice.call(p.querySelectorAll('[data-tf="' + f + '"]'));
    if (!els.length) return '';
    if (els[0].type === 'radio') { var c = els.filter(function (e) { return e.checked; })[0]; return c ? c.value : ''; }
    return els[0].value.trim();
  }

  // facts about time limits, from this topic's own dates (no advice)
  var fmt = function (d) { return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); };
  var plus = function (s, n) { if (!s) return null; var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d; };
  var iso = function (d) { return d.toISOString().slice(0, 10); };

  // read one topic page: show what applies to what they checked, and build the topic's object for Local 1776
  function readPage(p) {
    var k = p.getAttribute('data-k'), t = topic(k), ch = checked(p);
    p.querySelectorAll('[data-sub-of]').forEach(function (b) { var c = p.querySelector('input[data-key="' + b.getAttribute('data-sub-of') + '"]'); b.hidden = !(c && c.checked); });
    var adv = ch.some(function (c) { return c.getAttribute('data-adverse') === 'true'; });
    var denied = ch.some(function (c) { return c.getAttribute('data-eeo') === 'true'; });
    var action = adv || ((k === 'discipline' || k === 'job') && ch.length > 0);
    var eeo = k === 'discrimination' || (k === 'accommodation' && denied);
    show('[data-need="action"]', action, p);
    show('[data-need="eeo"]', eeo, p);
    var st = action ? tv(p, 'stage') : '';
    show('[data-stage="proposed"]', st === 'proposed', p);
    show('[data-stage="decided"]', st === 'decided', p);
    var talked = tv(p, 'talkedMgmt');
    show('[data-show="mgmt"]', talked === 'yes', p);
    var fl = filings(p), inc = incidents(p);
    show('[data-show="filed"]', fl.length > 0, p);
    $('[data-docs]', p).hidden = fl.length > 0;   // the copies line already says it
    // deadlines, listed as facts
    var dl = [], g = GRIEVE[code()];
    if (st === 'proposed' && tv(p, 'replyDue')) dl.push(['Reply to the proposed action', plus(tv(p, 'replyDue'), 0)]);
    if (adv && st === 'decided' && tv(p, 'effectiveDate')) dl.push(['MSPB appeal (30 days after the effective date, 5 CFR 1201.22)', plus(tv(p, 'effectiveDate'), 30)]);
    inc.forEach(function (n, i) {      // each dated incident that has ended; one still going on has no set date
      if (!n.date || n.ongoing) return;
      var which = inc.length > 1 ? ', Incident ' + (i + 1) : '';
      if (eeo) dl.push(['Contact with an EEO counselor (45 days' + which + ', 29 CFR 1614.105)', plus(n.date, 45)]);
      if (g) dl.push(['Grievance under your contract (' + g + ' days' + which + ', Article 12)', plus(n.date, g)]);
    });
    dl.sort(function (a, b) { return a[1] - b[1]; });
    $('[data-deadlines]', p).hidden = !dl.length;
    $('[data-deadlines] ul', p).innerHTML = dl.map(function (d) { return '<li><span>' + esc(d[0]) + '</span><b>' + fmt(d[1]) + '</b></li>'; }).join('');
    var soon = dl.some(function (d) { var n = (d[1] - Date.now()) / 864e5; return n > -1 && n <= 7; });   // today through 7 days out (passed ones are not "within 7 days")
    // what goes to Local 1776 for this topic (formVersion 2); a field this page did not ask is left out
    var o = { key: k, topic: t[2], items: ch.map(function (c) {
      var x = { item: c.value }, s = subs(p, c);
      if (c.getAttribute('data-adverse') === 'true') x.adverse = true;
      if (s) x.choices = s;
      return x;
    }), adverseAction: adv ? 'yes' : 'no' };
    if (action) {
      o.stage = st; o.receivedDate = tv(p, 'receivedDate');
      if (st === 'proposed') o.replyDue = tv(p, 'replyDue');
      if (st === 'decided') o.effectiveDate = tv(p, 'effectiveDate');
    }
    if (k === 'investigation') o.interviewDate = tv(p, 'interviewDate');
    if (eeo) o.eeoContact = tv(p, 'eeoContact');
    o.incidents = inc;
    o.outcome = tv(p, 'outcome');
    o.talkedMgmt = talked;
    if (talked === 'yes') { o.mgmtName = tv(p, 'mgmtName'); o.mgmtPosition = tv(p, 'mgmtPosition'); o.mgmtSaid = tv(p, 'mgmtSaid'); }
    o.filings = fl;
    o.deadlines = dl.map(function (d) { return { what: d[0], date: iso(d[1]) }; });
    o.urgent = soon ? 'yes' : 'no';   // flags the request for Local 1776; nothing is shown to the employee
    return o;
  }

  var MEDICAL = /Disability or Medical|Medical Inability|Pregnancy|Injury|OWCP|FMLA|Leave Denied: Sick|Drug or Alcohol/;
  function update() {
    var v = form.elements.agency.value, other = isOther();
    show('[data-show="other"]', other);
    var unlocked = !!v && (!other || form.elements.otherAgency.value.trim().length > 1);
    form.querySelectorAll('[data-gate]').forEach(function (el) { el.disabled = !unlocked; });
    $('[data-gate-note]').hidden = unlocked;
    var air = /-AIR$/.test(v), sel = form.elements.agency;
    form.querySelectorAll('[data-seal]').forEach(function (s) { s.classList.toggle('on', !!v && !other && (s.getAttribute('data-seal') === 'air') === air); });
    form.elements.agencyName.value = other ? form.elements.otherAgency.value.trim() : (v ? sel.options[sel.selectedIndex].text : '');
    show('[data-show="dst"]', val('status') === 'Title 32');
    show('[data-show="probation"]', val('probation') === 'yes');
    // hardship waiver of fees: the form opens only when they ask for one
    var hs = form.elements.hardship.checked;
    show('[data-show="hardship"]', hs);
    show('[data-show="hs-pay"]', hs && (val('hsRequest') === 'reduced' || val('hsRequest') === 'plan'));
    form.elements.hsReasons.value = hs ? JSON.stringify([].slice.call(form.querySelectorAll('[data-hsr]:checked')).map(function (c) { return c.value; })) : '';
    // each topic: [{key, topic, items, ...its own facts}], in the order picked
    var list = open.map(function (k) { return readPage(page(k)); });
    form.elements.topics.value = JSON.stringify(list);
    // medical permission, asked once on the last page when any topic touches medical
    var boxes = [];
    list.forEach(function (o) { o.items.forEach(function (i) { boxes.push(o.key + ': ' + i.item); (i.choices || []).forEach(function (s) { boxes.push(o.key + ': ' + i.item + ': ' + s); }); }); });
    var med = boxes.some(function (b) { return MEDICAL.test(b); });
    show('[data-need="medical"]', med);
    show('[data-show="records-no"]', val('recordsAuth') === 'no');
    show('[data-show="medical-no"]', med && val('medicalAuth') === 'no');
    drawStep();
  }

  // ── steps: Back / Next ──────────────────────────────────────────────────────────────────────────────────────────────
  function stepName(i) { var ps = pages(); return i === 0 ? 'Getting Started' : i >= ps.length - 1 || !open[i - 1] ? 'Sign and Send' : topic(open[i - 1])[1]; }
  function drawStep() {
    var n = pages().length;
    stepEl.innerHTML = '<b>Step ' + (cur + 1) + (open.length ? ' of ' + n : '') + ':</b> ' + esc(stepName(cur));
  }
  // a message; given as a list, each sentence keeps to its own line on phones (no mid-phrase breaks)
  function say(text, cls) { msg.className = 'form-msg' + (cls ? ' ' + cls : ''); msg.innerHTML = [].concat(text || '').map(function (s) { return '<span>' + esc(s) + '</span>'; }).join(' '); }
  function goTo(i, keepMsg, still) {
    var ps = pages();
    cur = Math.max(0, Math.min(i, ps.length - 1));
    [start, sign].concat([].slice.call(tpages.children)).forEach(function (p) { p.hidden = p !== ps[cur]; });
    form.querySelector('[data-act="back"]').hidden = cur === 0;
    form.querySelector('[data-act="next"]').hidden = cur === ps.length - 1;
    form.querySelector('button[type="submit"]').hidden = cur !== ps.length - 1;
    drawStep();
    if (!keepMsg) say('');
    if (!still) stepEl.scrollIntoView({ block: 'start' });
  }

  // what each page must have before Next (the last page is checked by Send)
  var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var missing = function (p) { return [].slice.call(p.querySelectorAll('input[required],select[required],textarea[required]')).filter(function (el) { return !el.matches(':disabled') && !el.closest('[hidden]') && (el.type === 'checkbox' ? !el.checked : !el.value.trim()); })[0]; };
  function check(p) {
    if (p === start) {
      if (!form.elements.agency.value) return [form.elements.agency, 'Please choose your employing agency.'];
      var m = missing(p);
      if (m) return [m, 'Please fill in every field marked *.'];
      var em = form.elements.email.value.trim();
      if (!EMAIL.test(em)) return [form.elements.email, 'Please check the email address.'];
      if (!val('status')) return [null, 'Please choose your status (Your Job).'];
      if (!val('probation')) return [null, 'Please answer Probationary or Trial Period (Your Job).'];
      if (!val('supervisorRole')) return [null, 'Please answer Are You a Supervisor or Manager (Your Job).'];
      if (!open.length) return [tiles, 'Please choose at least one topic under What’s Going On.'];
      return null;
    }
    if (p === sign) {
      if (!val('recordsAuth')) return [null, 'Please answer Permission to Get Your Records.'];
      if (!$('fieldset[data-need="medical"]').hidden && !val('medicalAuth')) return [null, 'Please answer Permission for Medical Information.'];
      if (form.elements.hardship.checked && !val('hsRequest')) return [null, 'Please choose what you are asking for in your hardship request.'];
      if (form.elements.hardship.checked && !form.querySelector('[data-hsr]:checked')) return [null, 'Please check why you are asking for a hardship waiver.'];
      return null;
    }
    var k = p.getAttribute('data-k'), ch = checked(p);
    if (k !== 'other' && !ch.length) return [null, 'Please choose at least one box.'];
    var noSub = ch.filter(function (c) { var s = subs(p, c); return s && !s.length; })[0];
    if (noSub) return [noSub, 'Please choose an answer under “' + noSub.value + '”.'];
    if (!$('[data-need="action"]', p).hidden && !tv(p, 'stage')) return [null, 'Please choose where the action stands.'];
    if (!$('[data-need="action"]', p).hidden && !tv(p, 'receivedDate')) return [$('[data-tf="receivedDate"]', p), 'Please give the date you received it.'];
    var bad = -1;
    incidents(p).some(function (n, i) { if (!n.date || !n.what) { bad = i; return true; } return false; });
    if (bad >= 0) return [p.querySelectorAll('.rq-inc')[bad], 'Please give the date and what happened for Incident ' + (bad + 1) + '.'];
    if (!tv(p, 'outcome')) return [$('[data-tf="outcome"]', p), 'Please tell us the outcome you want.'];
    if (!tv(p, 'talkedMgmt')) return [null, 'Please answer Have You Talked to Management About It?'];
    return null;
  }
  function fail(r) { say(r[1], 'err'); if (r[0] && r[0].focus) { if (r[0].scrollIntoView) r[0].scrollIntoView({ block: 'center' }); r[0].focus({ preventScroll: true }); } }

  // ── Save for Later: on this device only (the browser's own storage), never sent anywhere ─────────────────────────────
  var KEY = 'l1776-rep-draft', KEEP = 30 * 864e5;
  var skip = function (el) { return !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) || el.type === 'hidden' || el.name === 'signature' || el.name === 'website'; };   // the signature is never saved
  var shape = function () { return [].slice.call(form.elements).map(function (el) { return el.name || el.getAttribute('data-key') || el.getAttribute('data-tf') || el.getAttribute('data-f') || el.getAttribute('data-ff') || el.tagName; }).join('|'); };
  function save() {
    update();
    var els = [].slice.call(form.elements), named = {}, inc = {};
    els.forEach(function (el) {
      if (skip(el) || !el.name || el.name.charAt(0) === '_') return;
      if (el.type === 'radio') { if (el.checked) named[el.name] = el.value; } else named[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    open.forEach(function (k) { inc[k] = page(k).querySelectorAll('.rq-inc').length; });
    var d = { v: 2, at: Date.now(), step: cur, agency: form.elements.agency.value, otherAgency: form.elements.otherAgency.value, open: open.slice(), inc: inc, shape: shape(), named: named,
      vals: els.map(function (el) { return skip(el) ? null : (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value; }) };
    try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; }
  }
  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
    if (!d || d.v !== 2 || !(Date.now() - d.at < KEEP)) { drop(); return null; }   // older than 30 days: gone
    return d;
  }
  function drop() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function restore(d) {
    form.elements.agency.value = d.agency || ''; form.elements.otherAgency.value = d.otherAgency || '';
    update();
    open = (d.open || []).filter(function (k) { return !!topic(k); });
    drawTiles(); syncPages();
    open.forEach(function (k) { var p = page(k); while (p.querySelectorAll('.rq-inc').length < Math.min(MAXINC, d.inc[k] || 1)) addIncident(p); });
    var els = [].slice.call(form.elements);
    if (shape() === d.shape) els.forEach(function (el, i) {      // the same form as when it was saved: put every answer back
      var x = d.vals[i]; if (x === null || x === undefined || skip(el)) return;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!x; else el.value = x;
    });
    else Object.keys(d.named || {}).forEach(function (n) {      // the form changed since: put back what still fits
      var x = d.named[n], els2 = form.querySelectorAll('[name="' + n + '"]');
      els2.forEach(function (el) { if (el.type === 'radio') el.checked = el.value === x; else if (el.type === 'checkbox') el.checked = !!x; else el.value = x; });
    });
    update();
    goTo(Math.min(d.step || 0, pages().length - 1));
  }
  var resume = $('.rq-resume');
  function showResume(on) {
    resume.hidden = !on;
    [stepEl, $('.rq-nav')].concat(pages()).forEach(function (el) { el.hidden = on; });
    if (!on) goTo(cur, false, true);
  }

  // ── events ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  tiles.addEventListener('click', function (e) {
    var b = e.target.closest('[data-topic]'); if (!b) return;
    var k = b.getAttribute('data-topic'), i = open.indexOf(k);
    if (i >= 0) open.splice(i, 1); else open.push(k);
    b.setAttribute('aria-pressed', i < 0);
    syncPages(); update();
    if (msg.classList.contains('err') && open.length) say('');
  });
  tpages.addEventListener('click', function (e) {
    var d = e.target.closest('[data-inc-drop]');
    if (!d) return;
    var p = d.closest('.rq-page'); d.closest('.rq-inc').remove(); numberIncidents(p); update();
  });
  form.addEventListener('click', function (e) {
    var a = e.target.closest('[data-act]'); if (!a) return;
    var act = a.getAttribute('data-act');
    if (act === 'add-incident') { var p = a.closest('.rq-page'), c = addIncident(p); update(); c.querySelector('[data-f="date"]').focus(); }
    if (act === 'back') goTo(cur - 1);
    if (act === 'next') { update(); var r = check(pages()[cur]); if (r) fail(r); else goTo(cur + 1); }
    if (act === 'save') say(save() ? ['Saved on this device only.', 'Nothing is sent to Local 1776 until you press Send.'] : ['Sorry, this browser would not save it.', 'Private browsing can block saving.'], 'ok');
    if (act === 'resume') { var d = load(); showResume(false); if (d) restore(d); }
    if (act === 'restart') { drop(); showResume(false); goTo(0); }
  });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'agency') { drawTiles(); syncPages(); [].slice.call(tpages.children).forEach(drawChecklist); }
    update();
  });
  form.addEventListener('input', update);
  // Enter in a box moves to the next step instead of sending the form from the middle
  form.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || /^(checkbox|radio|submit|button)$/.test(e.target.type)) return;
    e.preventDefault();
    if (cur < pages().length - 1) form.querySelector('[data-act="next"]').click();
  });
  // a successful Send resets the form (site.js): forget the saved copy and start fresh, thanking them at the top
  form.addEventListener('reset', function () {
    setTimeout(function () {
      drop();
      var sent = msg.classList.contains('ok') ? [].slice.call(msg.childNodes) : [];
      open = []; cur = 0; tpages.innerHTML = ''; drawTiles(); update(); goTo(0);
      var box = $('.rq-sent'); box.textContent = ''; sent.forEach(function (n) { box.appendChild(n); }); box.hidden = !sent.length;
      if (sent.length) box.scrollIntoView({ block: 'start' });
    });
  });
  // Send: check every page in order (the last page's plain required boxes are checked by site.js)
  form.addEventListener('submit', function (e) {
    update();
    var ps = pages(), at = -1, r = null;
    ps.some(function (p, i) { r = check(p); if (r) at = i; return !!r; });
    if (r) { e.stopImmediatePropagation(); e.preventDefault(); if (at !== cur) goTo(at); fail(r); }
  }, true);
  form.dataset.ok = 'Thank you. We received your request and emailed you a copy. A representative will contact you.';

  drawTiles(); update(); goTo(0, false, true);
  var saved = load();
  if (saved) { $('[data-saved-at]').textContent = ' (saved ' + new Date(saved.at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ')'; showResume(true); }
})();
