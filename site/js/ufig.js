// Uniform Request: "What You Need" (Ben, Nov 21 2026). Square toggles for Branch, Uniform and Sex; square icon tiles
// for each item the regulations call for (AR / DA PAM 670-1, DAFI 36-2903) and the contract's Section 11.3 gear.
// Every pick goes into one order list with size and quantity, and into the hidden "items" field the form sends:
// [{ group, item, size, qty }].  The icons are one matching line set (48 x 48, stroke only).
(function () {
  var root = document.querySelector('[data-ufig]');
  if (!root) return;
  var form = root.closest('form');
  var units = window.L1776_CONTRACTS || {};

  var BOOT = '<path d="M16 5h12v14q1 6 9 8 7 2 7 8v3H12l2-8z"/><path d="M11 38h34v4H11zM16 9h12M19 13h6M19 17h6M20 21h7M15 42v-4M21 42v-4M27 42v-4M33 42v-4M39 42v-4"/>';
  var GLOVE = '<path d="M15 41V31l-6-7q-2-3 1-5l6 4V10q0-3 2.5-3T21 10v12V7q0-3 2.5-3T26 7v15V8q0-3 2.5-3T31 8v15V12q0-3 2.5-3t2.5 3v19q0 5-3 8v2"/>';
  var COVERALL = '<path d="M17 4 10 7q-4 2-5 6L4 34l5 1 3-15v6l-1 18h10l3-16 3 16h10l-1-18v-6l3 15 5-1-1-21q-1-4-5-6l-7-3"/>';
  var LONGSLEEVE = '<path d="M18 5 11 8q-4 2-5 6L4 41l6 1 2-20v21h24V22l2 20 6-1-2-27q-1-4-5-6l-7-3"/>';
  var TAPE = function (t) { return '<rect x="4" y="16" width="40" height="15" rx="2"/><text x="24" y="27" text-anchor="middle" font-size="10" font-weight="700" font-family="Arial,sans-serif" fill="currentColor" stroke="none">' + t + '</text>'; };
  var ICON = {
    cap: '<path d="M6 31 8 14q0-3 3-3h22q3 0 4 3l2 15"/><path d="M38 28q5 0 8 4l-9 1M6 31h33M7 25h31"/>',
    coat: LONGSLEEVE + '<path d="M18 5l6 6 6-6M24 11v32M14 16h7l-1 7h-5zM27 16h7l-1 7h-5zM4.5 37h6M37.5 37h6"/>',
    trousers: '<path d="M13 5h22l3 39H27L24 18l-3 26H10z"/><path d="M13 9h22M11.5 24h6v9h-6zM30.5 24h6v9h-6z"/>',
    boots: BOOT,
    name: TAPE('NAME'),
    branch: TAPE('U.S.'),
    rank: '<rect x="14" y="6" width="20" height="36" rx="2"/><path d="M18 18l6-5 6 5M18 24l6-5 6 5M18 30l6-5 6 5"/>',
    patches: '<path d="M6 12h15v12q0 8-7.5 11Q6 32 6 24z"/><rect x="26" y="12" width="17" height="11" rx="1"/><path d="M26 15.5h17M26 19h17M26 12v4.5h7V12"/>',
    matcoat: '<path d="M18 5 11 8q-4 2-5 6L4 41l6 1 2-20-3 21h30l-3-21 2 20 6-1-2-27q-1-4-5-6l-7-3"/><path d="M18 5l6 6 6-6M24 11v32M14 16h7l-1 7h-5zM27 16h7l-1 7h-5zM4.5 37h6M37.5 37h6"/>',
    mattrousers: '<path d="M12 5h24v11H12z"/><path d="M16 7v7M20 7v7M24 7v7M28 7v7M32 7v7"/><path d="M12 16 10 44h11l3-24 3 24h11l-2-28"/>',
    undershirt: '<path d="M17 6 8 10 4 19l6 3 2-4v24h24V18l2 4 6-3-4-9-9-4q-7 5-14 0z"/>',
    socks: '<path d="M18 4h12v24l6 4q6 4 2 10-3 3-8 1L16 35q-3-2-1-6l3-3z"/><path d="M18 9h12"/>',
    belt: '<path d="M3 20h15M3 28h15M30 20h15M30 28h15"/><rect x="18" y="15" width="12" height="18" rx="2"/><rect x="21.5" y="19" width="5" height="10" rx="1"/>',
    shirtSS: '<path d="M17 6 8 10 4 20l7 3 2-4v24h22V19l2 4 7-3-4-10-9-4"/><path d="M17 6l3 6 4-3 4 3 3-6q-7-3-14 0M24 9v34M15 18h7v6h-7zM26 18h7v6h-7zM10 10l6-2M38 10l-6-2"/>',
    shirtLS: '<path d="M17 6 10 9q-3 2-4 5L4 41l6 1 3-21v22h22V21l3 21 6-1-2-27q-1-3-4-5l-7-3"/><path d="M17 6l3 6 4-3 4 3 3-6q-7-3-14 0M24 9v34M15 18h7v6h-7zM26 18h7v6h-7zM4.5 37h6M37.5 37h6"/>',
    slacks: '<path d="M13 5h22l3 39H27L24 16l-3 28H10z"/><path d="M13 9h22M17.5 12l-2.5 31M30.5 12l2.5 31"/>',
    skirt: '<path d="M15 8h18l5 32H10z"/><path d="M15 12h18M24 33v7"/>',
    tie: '<path d="M20 5h8l-2 6 4 23-6 8-6-8 4-23z"/><path d="M22 11h4"/>',
    tab: '<path d="M14 12l10 5 10-5-3 20-7-9-7 9z"/>',
    garrison: '<path d="M3 31q3-11 9-13l26-2q6 2 7 15z"/><path d="M10 23q14 4 32-1"/>',
    oxfords: '<path d="M3 31q0-8 6-9l8-1q4-5 9-5h3q4 6 11 8 5 1.5 5 6v1z"/><path d="M3 31h42v3H3zM3 34v3h8v-3M19 19l3 3M23 17.5l3 3M17 21q5 3 12-5"/>',
    pumps: '<path d="M4 33q0-4 4-4l12 1q8-1 14-8l5-4q5-1 5 4v2l-3 1-1 14h-2l-1-12q-7 7-17 8H4z"/>',
    nameplate: '<rect x="6" y="17" width="36" height="14" rx="2"/><path d="M12 24h24"/>',
    insignia: '<circle cx="14" cy="24" r="9"/><circle cx="14" cy="24" r="5.5"/><circle cx="34" cy="24" r="9"/><path d="M29 29l10-10M29 19l10 10"/>',
    servicecoat: '<path d="M17 6 9 10 5 37h6l3-17v23h20V20l3 17h6l-4-27-8-4"/><path d="M17 6l4 10-3 2 6 9 6-9-3-2 4-10M24 27v16"/><circle cx="24" cy="31" r="1"/><circle cx="24" cy="36" r="1"/>',
    flightsuit: COVERALL + '<path d="M17 4l7 5 7-5M24 9v19M13 14h7l-1 6h-5zM28 14h7l-1 6h-5zM12 34h7M29 34h7"/>',
    gloves: GLOVE,
    jacket: '<path d="M16 7 8 11 5 32l5 1 2-12v17h24V21l2 12 5-1-3-21-8-4q-8 5-16 0z"/><path d="M12 38v4h24v-4M24 9v29M16 7l2-3h12l2 3"/>',
    safetyboots: BOOT + '<path d="M33 27q8 2 9 11" stroke-dasharray="2 2.2"/>',
    glasses: '<path d="M4 20h40M6 20q0 10 8 10 6 0 8-8M42 20q0 10-8 10-6 0-8-8"/>',
    coveralls: COVERALL + '<path d="M17 4l7 5 7-5M24 9v19M12 22h24"/>',
    insulated: COVERALL + '<path d="M17 4l7 5 7-5M24 9v19M11 14h26M11 20h26M12 26h24M12 32h9M27 32h9M11 38h10M27 38h10"/>',
    rain: '<path d="M17 9q7-9 14 0l6 3q3 2 4 5l2 24-6 1-3-19v20H14V23l-3 19-6-1 2-24q1-3 4-5z"/><path d="M17 9q7 6 14 0M24 14v29"/><path d="M42 3q2 3 0 4-2-1 0-4M46 9q2 3 0 4-2-1 0-4"/>',
    parka: '<path d="M16 10q8-11 16 0l6 3q3 2 4 5l2 24-6 1-3-19v21H13V24l-3 19-6-1 2-24q1-3 4-5z"/><path d="M16 10q8 7 16 0M14 9q10-12 20 0M24 16v29M13 24h22M13 31h22M13 38h22"/>',
    coldtrousers: '<path d="M13 5h22l3 39H27L24 18l-3 26H10z"/><path d="M13 9h22M12 16h9.5M26.5 16H36M11.5 24h9M27.5 24h9M11 32h9M28 32h9M10.5 40h9M28.5 40h9"/>',
    coldgloves: GLOVE + '<path d="M13 46l2-6h21l2 6z"/>',
    watchcap: '<path d="M10 32q0-22 14-23 14 1 14 23z"/><path d="M9 32h30v7H9zM14 32v7M19 32v7M24 32v7M29 32v7M34 32v7"/>',
    helmet: '<path d="M5 27q1-18 19-19 17 1 19 17l2 3q0 3-3 3l-5-1q-2 7-8 8h-9q-5-1-7-7H8q-4 0-3-4z"/><path d="M8 26q16-5 33-1M19 38q5 6 10 0"/>',
    other: '<rect x="10" y="10" width="28" height="28" rx="3"/><path d="M24 17v14M17 24h14"/>'
  };

  // [key, icon, tile label, order name (army / air), size hint]
  var A = function (k, icon, label, name, size) { return { k: k, icon: icon, label: label, name: name, size: size }; };
  var BR = function (army, air) { return function (b) { return b === 'air' ? air : army; }; };
  var SX = function (m, f) { return function (b, s) { return s === 'f' ? f : m; }; };   // women's sizes (ACU-F) when Female is picked
  // Rank: enlisted only (Ben, Nov 21 2026: technician officers are not entitled to free uniforms). [grade, abbreviation, title]
  var RANKS = {
    army: [['E-1', 'PV1', 'Private (no insignia)'], ['E-2', 'PV2', 'Private'], ['E-3', 'PFC', 'Private First Class'], ['E-4', 'SPC', 'Specialist'], ['E-4', 'CPL', 'Corporal'], ['E-5', 'SGT', 'Sergeant'],
      ['E-6', 'SSG', 'Staff Sergeant'], ['E-7', 'SFC', 'Sergeant First Class'], ['E-8', 'MSG', 'Master Sergeant'], ['E-8', '1SG', 'First Sergeant'], ['E-9', 'SGM', 'Sergeant Major'], ['E-9', 'CSM', 'Command Sergeant Major']],
    air: [['E-1', 'AB', 'Airman Basic (no insignia)'], ['E-2', 'Amn', 'Airman'], ['E-3', 'A1C', 'Airman First Class'], ['E-4', 'SrA', 'Senior Airman'], ['E-5', 'SSgt', 'Staff Sergeant'], ['E-6', 'TSgt', 'Technical Sergeant'],
      ['E-7', 'MSgt', 'Master Sergeant'], ['E-7', 'MSgt', 'First Sergeant'], ['E-8', 'SMSgt', 'Senior Master Sergeant'], ['E-8', 'SMSgt', 'First Sergeant'], ['E-9', 'CMSgt', 'Chief Master Sergeant'], ['E-9', 'CMSgt', 'First Sergeant'], ['E-9', 'CCM', 'Command Chief Master Sergeant']]
  };
  // Patches the regulations allow on OCP: Army AR 670-1 / DA PAM 670-1 ch. 21; Air Force DAFI 36-2903 + DAFGM 2025-03 / 2026-05
  var PATCHES = {
    army: ['Flag and Unit Patch', 'U.S. Flag Only', 'Unit Patch Only', 'Combat Patch', 'Skill Tab'],
    air: ['Flag, Unit and HQ Patches', 'U.S. Flag Only', 'Unit Patch Only', 'HQ Patch (ANG or MAJCOM)', 'Duty Identifier Tab']
  };
  var DETAIL = { rank: 'rank', bRank: 'rank', patches: 'patches', branch: 'fixed', coat: 'typed', trousers: 'typed' };
  var BASE = ['coat', 'trousers', 'fCoat', 'fTrousers', 'fSuit'];   // the uniform itself: four sets, less what they have
  var NAMES = { name: 'upper', fName: 'upper', bName: 'as typed' };   // filled from their last name
  var SETS = {
    ocp: [A('cap', 'cap', 'Cap', 'Patrol Cap', 'Size, like 7 1/4'), A('coat', 'coat', 'Coat', 'OCP Coat', SX('Like Medium-Regular', 'Women\'s 34 Regular')), A('trousers', 'trousers', 'Trousers', 'OCP Trousers', SX('Like Medium-Regular', 'Women\'s 28 Regular')),
      A('boots', 'boots', 'Boots', 'Boots', SX('Size, like 10.5 W', 'Size, like 8 W')), A('name', 'name', 'Name', 'Name Tape', 'Last name on the tape'), A('branch', 'branch', 'Branch', BR('U.S. Army Tape', 'U.S. Air Force Tape'), 'How many'),
      A('rank', 'rank', 'Rank', 'Rank Insignia', 'Your rank, like SSG'), A('patches', 'patches', 'Patches', BR('Flag and Unit Patch', 'Flag, Unit and Higher-HQ Patches'), 'Which patches')],
    maternity: [A('matcoat', 'matcoat', 'Coat', 'Maternity Coat (OCP)', 'Size'), A('mattrousers', 'mattrousers', 'Trousers', 'Maternity Trousers (OCP)', 'Size')],
    under: [A('undershirt', 'undershirt', 'Undershirt', 'Undershirts (Tan 499)', 'Size, like Medium'), A('socks', 'socks', 'Socks', 'Socks', 'Shoe size'), A('belt', 'belt', 'Belt', 'Rigger Belt', 'Waist size')],
    underB: [A('bUnder', 'undershirt', 'Undershirt', 'White Undershirts', 'Size, like Medium'), A('bSocks', 'socks', 'Socks', BR('Dress Socks', 'Black Socks'), 'Shoe size'), A('bBelt', 'belt', 'Belt', 'Belt and Buckle', 'Waist size')],
    classbM: [A('bSS', 'shirtSS', 'Short', BR('AGSU Short-Sleeve Shirt', 'Light Blue Short-Sleeve Shirt'), 'Neck size, like 15 1/2'), A('bLS', 'shirtLS', 'Long', BR('AGSU Long-Sleeve Shirt', 'Light Blue Long-Sleeve Shirt'), 'Neck and sleeve, like 15 1/2 x 34'),
      A('bTrousers', 'slacks', 'Trousers', BR('AGSU Trousers', 'Blue Trousers'), 'Waist and inseam'), A('bTie', 'tie', 'Tie', 'Necktie', 'One size'), A('bCap', 'garrison', 'Cap', BR('Garrison Cap', 'Flight Cap'), 'Size, like 7 1/4'),
      A('bShoes', 'oxfords', 'Shoes', BR('Oxford Shoes', 'Low Quarters'), 'Size, like 10.5 W'), A('bName', 'nameplate', 'Nameplate', BR('Nameplate', 'Nametag'), 'Last name'), A('bRank', 'rank', 'Rank', 'Rank Insignia (Sleeve Chevrons)', ''), A('bIns', 'insignia', 'Insignia', 'U.S. and Branch Insignia', BR('Your branch, like Infantry', 'Officer or enlisted')),
      A('bCoat', 'servicecoat', 'Coat', BR('AGSU Coat', 'Service Coat'), 'Size, like 40R')],
    classbF: [A('bSS', 'shirtSS', 'Short', BR('AGSU Short-Sleeve Shirt', 'Light Blue Short-Sleeve Blouse'), 'Size'), A('bLS', 'shirtLS', 'Long', BR('AGSU Long-Sleeve Shirt', 'Light Blue Long-Sleeve Blouse'), 'Size and sleeve'),
      A('bSlacks', 'slacks', 'Slacks', BR('AGSU Slacks', 'Blue Slacks'), 'Size'), A('bSkirt', 'skirt', 'Skirt', BR('AGSU Skirt', 'Blue Skirt'), 'Size'), A('bTab', 'tab', 'Tab', BR('Neck Tab', 'Tie Tab'), 'One size'),
      A('bCap', 'garrison', 'Cap', BR('Garrison Cap', 'Flight Cap'), 'Size, like 7 1/4'), A('bPumps', 'pumps', 'Pumps', 'Pumps', 'Size, like 8 M'), A('bShoes', 'oxfords', 'Shoes', BR('Oxford Shoes', 'Low Quarters'), 'Size, like 8 M'),
      A('bName', 'nameplate', 'Nameplate', BR('Nameplate', 'Nametag'), 'Last name'), A('bRank', 'rank', 'Rank', 'Rank Insignia (Sleeve Chevrons)', ''), A('bIns', 'insignia', 'Insignia', 'U.S. and Branch Insignia', BR('Your branch, like Infantry', 'Officer or enlisted')), A('bCoat', 'servicecoat', 'Coat', BR('AGSU Coat', 'Service Coat'), 'Size')],
    flightArmy: [A('fCoat', 'coat', 'Coat', 'Flight Coat (OCP)', SX('Size, like Medium-Regular', 'Women\'s size, like 34 Regular')), A('fTrousers', 'trousers', 'Trousers', 'Flight Trousers (OCP)', SX('Size, like Medium-Regular', 'Women\'s size, like 28 Regular')), A('boots', 'boots', 'Boots', 'Boots', SX('Size, like 10.5 W', 'Size, like 8 W')),
      A('fGloves', 'gloves', 'Gloves', 'Flight Gloves', 'Size, like 9'), A('fJacket', 'jacket', 'Jacket', 'Flight Jacket', 'Size, like Large'), A('name', 'name', 'Name', 'Name Tape', 'Last name on the tape'), A('branch', 'branch', 'Branch', 'U.S. Army Tape', ''), A('rank', 'rank', 'Rank', 'Rank Insignia', ''), A('patches', 'patches', 'Patches', 'Flag and Unit Patch', '')],
    flightAir: [A('fSuit', 'flightsuit', 'Flight Suit', 'Flight Suit (One Piece)', 'Size, like 42R'), A('boots', 'boots', 'Boots', 'Boots', SX('Size, like 10.5 W', 'Size, like 8 W')), A('fGloves', 'gloves', 'Gloves', 'Flight Gloves', 'Size, like 9'),
      A('fJacket', 'jacket', 'Jacket', 'Flight Jacket', 'Size, like Large'), A('fName', 'name', 'Name', 'Leather Name Tag', 'Name and badge'), A('rank', 'rank', 'Rank', 'Rank Insignia', ''), A('patches', 'patches', 'Patches', 'Flag and Unit Patches', 'Which patches')],
    safety: [A('sBoots', 'safetyboots', 'Boots', 'Safety-Toe Boots', SX('Size, like 10.5 W', 'Size, like 8 W')), A('sGlasses', 'glasses', 'Glasses', 'Prescription Safety Glasses', 'We will ask for your prescription'), A('sCoveralls', 'coveralls', 'Coveralls', 'Cotton Coveralls', 'Size, like 42R'),
      A('sInsulated', 'insulated', 'Insulated', 'Insulated Coveralls', 'Size, like 42R'), A('sRain', 'rain', 'Rain', 'Rain Jacket (Gore-Tex)', 'Size, like Large'), A('sParka', 'parka', 'Parka', 'Cold-Weather Jacket', 'Size, like Large'),
      A('sTrousers', 'coldtrousers', 'Trousers', 'Cold-Weather Trousers', 'Size, like Large'), A('sGloves', 'coldgloves', 'Gloves', 'Cold-Weather Gloves', 'Size, like Large'), A('sWatch', 'watchcap', 'Watch Cap', 'Watch Cap', 'One size'), A('sHelmet', 'helmet', 'Helmet', 'DOT Head Protection', 'Size, like Large')]
  };
  var GROUP = { main: 'Uniform', maternity: 'Maternity', under: 'Worn Underneath', safety: 'Safety and Cold-Weather Gear (Section 11.3)', custom: 'Other' };

  var picked = [], customs = {}, customN = 0, meta = {};
  var $ = function (s) { return root.querySelector(s); };
  var order = $('.ufig-order'), itemsField = form && form.elements.items;
  var MINUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';   // an X: "remove this line" (Ben, Nov 21 2026)
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  var val = function (n) { var c = form && form.querySelector('input[name="' + n + '"]:checked'); return c ? c.value : ''; };
  // the branch comes from the State or Territory pick ("LA-AIR" = Louisiana Air National Guard; plain codes are Army)
  var branch = function () { return form && /-AIR$/.test(form.elements.agency.value) ? 'air' : 'army'; };
  var txt = function (v) { return typeof v === 'function' ? v(branch(), val('sex')) : v; };

  function sets() {
    var u = val('uniform') || 'ocp', sex = val('sex');
    var main = u === 'classb' ? (sex === 'f' ? SETS.classbF : SETS.classbM) : u === 'flight' ? (branch() === 'air' ? SETS.flightAir : SETS.flightArmy) : SETS.ocp;
    return { main: main, maternity: u === 'ocp' && sex === 'f' ? SETS.maternity : [], under: u === 'classb' ? SETS.underB : SETS.under, safety: SETS.safety, flight: u === 'flight' };
  }
  function tiles(box, list, group, withOther) {
    box.innerHTML = list.map(function (t) {
      meta[t.k] = { t: t, group: group };
      return '<button type="button" class="itile" data-k="' + t.k + '" aria-pressed="false" title="' + esc(txt(t.name)) + '"><span class="box"><svg viewBox="0 0 48 48" aria-hidden="true">' + ICON[t.icon] + '</svg></span><b>' + esc(t.label) + '</b></button>';
    }).join('') + (withOther ? '<button type="button" class="itile" data-custom title="Something not listed"><span class="box"><svg viewBox="0 0 48 48" aria-hidden="true">' + ICON.other + '</svg></span><b>Other</b></button>' : '');
  }
  function layout() {
    var s = sets(); meta = {};
    tiles($('[data-group="main"]'), s.main, 'main', true);
    $('[data-wrap="maternity"]').hidden = !s.maternity.length;
    tiles($('[data-group="maternity"]'), s.maternity, 'maternity');
    tiles($('[data-group="under"]'), s.under, 'under');
    tiles($('[data-group="safety"]'), s.safety, 'safety');
    $('[data-flight-note]').hidden = !s.flight;
    picked = picked.filter(function (k) { return customs[k] !== undefined || meta[k]; });   // drop what this uniform doesn't have
    paint();
  }
  function paint() {
    root.querySelectorAll('[data-k]').forEach(function (b) { if (b.classList.contains('itile')) b.setAttribute('aria-pressed', picked.indexOf(b.getAttribute('data-k')) >= 0); });
    var keep = {};
    order.querySelectorAll('.ufig-row').forEach(function (r) { syncTyped(r); var n = r.querySelector('.nm'); keep[r.getAttribute('data-row')] = [r.querySelector('.sz').value, r.querySelector('.qt').value, n ? n.value : null, r.hasAttribute('data-touched'), r.hasAttribute('data-autoname')]; });
    order.innerHTML = picked.length ? '<div class="ufig-oh" aria-hidden="true"><span>Item</span><span>Size or Details</span><span>Qty</span><span></span></div>' : '<p class="ufig-empty">Nothing yet. Tap the items you need above.</p>';
    picked.forEach(function (k) {
      var custom = customs[k] !== undefined, m = meta[k], nm = custom ? 'Other Item' : txt(m.t.name), row = document.createElement('div');
      row.className = 'ufig-row'; row.setAttribute('data-row', k);
      row.innerHTML = (custom ? '<input class="nm" maxlength="60" placeholder="What item?" aria-label="Other item: what it is">' : '<b>' + esc(nm) + '</b>') +
        detail(k, custom, m, nm) +
        '<input class="qt" type="number" min="1" max="20" inputmode="numeric" value="1" aria-label="' + esc(nm) + ': quantity">' +
        '<button type="button" class="btn icon sm alt" data-drop="' + k + '" title="Remove"><span class="ico">' + MINUS + '</span><span class="lbl">Remove ' + esc(nm) + '</span></button>';
      if (keep[k]) {
        var sz = row.querySelector('.sz'); if (sz.type !== 'hidden') sz.value = keep[k][0];
        if (row.querySelector('.rk')) setRank(row.querySelector('.rk'), keep[k][0]);
        if (sz.tagName === 'SELECT' && sz.selectedIndex < 0) sz.selectedIndex = 0;   // e.g. an Army patch after switching to Air Force
        row.querySelector('.qt').value = keep[k][1];
        if (custom && keep[k][2] !== null) row.querySelector('.nm').value = keep[k][2];
        if (keep[k][3]) row.setAttribute('data-touched', '');
        if (keep[k][4]) row.setAttribute('data-autoname', '');
        var sz2 = row.querySelector('.sz2'); if (sz2) { var parts = String(keep[k][0]).split(', '); sz2.querySelector('.ty').value = parts[0] === 'Hot Weather' ? 'Hot Weather' : 'ACU'; sz2.querySelector('.szi').value = parts.slice(1).join(', '); }
      } else if (NAMES[k]) { row.setAttribute('data-autoname', ''); }
      if (row.hasAttribute('data-autoname')) fillName(row);
      order.appendChild(row);
    });
    applyAuto();
    save();
  }
  // the "size or details" box: a rank or patch list, a fixed branch tape, or a text box
  function detail(k, custom, m, nm) {
    var kind = custom ? '' : DETAIL[k], b = branch(), lab = ' aria-label="' + esc(nm) + ': details"';
    // rank: a list with three lined-up columns (grade, abbreviation, title) — a plain dropdown can't line them up
    if (kind === 'rank') return '<div class="rk"><button type="button" class="rk-btn" aria-haspopup="listbox" aria-expanded="false"' + lab + '><span class="rk-v"><span class="rk-ph">Choose Your Rank</span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>' +
      '<ul class="rk-list" role="listbox" hidden>' + RANKS[b].map(function (r) { return '<li role="option" tabindex="-1" aria-selected="false" data-v="' + esc(r.join(' ')) + '"><span>' + r[0] + '</span><span>' + esc(r[1]) + '</span><span>' + esc(r[2]) + '</span></li>'; }).join('') + '</ul>' +
      '<input type="hidden" class="sz" value=""></div>';
    if (kind === 'typed') return '<div class="sz2"><select class="ty" aria-label="' + esc(nm) + ': type"><option>ACU</option><option>Hot Weather</option></select><input class="szi" maxlength="40" placeholder="' + esc(txt(m.t.size)) + '"' + lab + '></div><input type="hidden" class="sz" value="">';
    if (kind === 'patches') return '<select class="sz"' + lab + '>' + PATCHES[b].map(function (p) { return '<option>' + esc(p) + '</option>'; }).join('') + '</select>';
    if (kind === 'fixed') { var t = b === 'air' ? 'U.S. AIR FORCE' : 'U.S. ARMY'; return '<span class="sz-fixed">' + t + '</span><input type="hidden" class="sz" value="' + t + '">'; }
    return '<input class="sz" maxlength="60" placeholder="' + esc(custom ? 'Size or details' : txt(m.t.size)) + '"' + lab + '>';
  }
  function syncTyped(r) { var b = r.querySelector('.sz2'); if (!b) return; var z = b.querySelector('.szi').value.trim(); r.querySelector('.sz').value = b.querySelector('.ty').value + (z ? ', ' + z : ''); }
  function lastName() { return form && form.elements.lastName ? form.elements.lastName.value.trim() : ''; }
  function fillName(r) { var k = r.getAttribute('data-row'), i = r.querySelector('input.sz'); if (!i || !NAMES[k]) return; var n = lastName(); i.value = NAMES[k] === 'upper' ? n.toUpperCase() : n; }
  // lines that still need a size or a choice before the request can go (Ben: "a request without sizes means a phone call back")
  var NEEDS = /^(Size|Like|Women|Neck|Waist|Shoe|Last name|Name)/;
  function missing(mark) {
    var out = [];
    order.querySelectorAll('.ufig-row').forEach(function (r) {
      syncTyped(r);
      var box = r.querySelector('.szi') || r.querySelector('input.sz:not([type=hidden])'), rk = r.querySelector('.rk'), name = r.querySelector('b'), nm = r.querySelector('.nm');
      var need = (rk && !r.querySelector('.sz').value) || (box && !box.value.trim() && NEEDS.test(box.placeholder || '')) || (nm && !nm.value.trim());
      if (mark) r.classList.toggle('need', !!need);
      if (need) out.push(name ? name.textContent : 'Other Item');
    });
    return out;
  }

  // ---- the rank list ----
  function setRank(rk, v) {
    var li = v && rk.querySelector('li[data-v="' + v.replace(/"/g, '') + '"]');   // a rank from the other branch isn't kept
    rk.querySelector('.sz').value = li ? v : '';
    rk.querySelectorAll('li').forEach(function (x) { x.setAttribute('aria-selected', x === li); });
    rk.querySelector('.rk-v').innerHTML = li ? li.innerHTML : '<span class="rk-ph">Choose Your Rank</span>';
  }
  function openRank(rk, on) {
    var list = rk.querySelector('.rk-list'), btn = rk.querySelector('.rk-btn');
    root.querySelectorAll('.rk-list').forEach(function (l) { if (l !== list) { l.hidden = true; l.parentNode.querySelector('.rk-btn').setAttribute('aria-expanded', 'false'); } });
    list.hidden = !on; btn.setAttribute('aria-expanded', on);
    if (on) { var cur = list.querySelector('[aria-selected="true"]') || list.firstChild; cur.focus(); }
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('.rk-btn'), li = e.target.closest('.rk-list li');
    if (b) { var rk = b.parentNode; openRank(rk, rk.querySelector('.rk-list').hidden); }
    if (li) { var r = li.closest('.rk'); setRank(r, li.getAttribute('data-v')); openRank(r, false); r.querySelector('.rk-btn').focus(); save(); }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.rk')) root.querySelectorAll('.rk-list').forEach(function (l) { if (!l.hidden) openRank(l.parentNode, false); }); });
  root.addEventListener('keydown', function (e) {
    var li = e.target.closest('.rk-list li'); if (!li) return;
    var rk = li.closest('.rk');
    if (e.key === 'ArrowDown' && li.nextSibling) { e.preventDefault(); li.nextSibling.focus(); }
    else if (e.key === 'ArrowUp' && li.previousSibling) { e.preventDefault(); li.previousSibling.focus(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); }
    else if (e.key === 'Escape' || e.key === 'Tab') { openRank(rk, false); if (e.key === 'Escape') rk.querySelector('.rk-btn').focus(); }
  });

  // insignia quantities follow the regulations and what's on the order (people can still change them):
  // OCP rank one per coat (+ one per patrol cap for Army; Air Force enlisted wear none on the cap), name tape one per
  // coat and cap, branch tape and patch set one per coat; Class B chevrons on both sleeves of every shirt and coat,
  // a nameplate on each, collar insignia one set per coat; flight one per flight coat or flight suit
  function q(k) { var r = order.querySelector('[data-row="' + k + '"] .qt'); return r ? (+r.value || 0) : 0; }
  function autoQty(k) {
    var u = val('uniform') || 'ocp', army = branch() === 'army';
    if (BASE.indexOf(k) >= 0) { var have = form && form.elements.setsOnHand ? form.elements.setsOnHand.value : ''; return have === '' ? undefined : Math.max(1, 4 - (parseInt(have, 10) || 0)); }
    if (u === 'classb') { var tops = q('bSS') + q('bLS') + q('bCoat'); return { bRank: 2 * tops, bName: tops, bIns: q('bCoat') }[k]; }
    var coats = u === 'flight' ? (army ? q('fCoat') : q('fSuit')) : q('coat') + q('matcoat'), cap = u === 'ocp' ? q('cap') : 0;
    return { rank: coats + (army ? cap : 0), name: coats + cap, fName: coats, branch: coats, patches: coats }[k];
  }
  function applyAuto() {
    // the coats and trousers first, then the insignia that follow them
    var rows = [].slice.call(order.querySelectorAll('.ufig-row'));
    rows.sort(function (a, b) { return (BASE.indexOf(b.getAttribute('data-row')) >= 0) - (BASE.indexOf(a.getAttribute('data-row')) >= 0); });
    rows.forEach(function (r) {
      var n = autoQty(r.getAttribute('data-row'));
      if (n === undefined || r.hasAttribute('data-touched')) return;
      r.querySelector('.qt').value = Math.max(1, n);
    });
  }
  function save() {
    if (!itemsField) return;
    var list = [];
    order.querySelectorAll('.ufig-row').forEach(function (r) {
      syncTyped(r);
      var k = r.getAttribute('data-row'), n = r.querySelector('.nm');
      var item = n ? n.value.trim() : txt(meta[k].t.name);
      if (!item) return;
      list.push({ group: GROUP[customs[k] !== undefined ? 'custom' : meta[k].group], item: item, size: r.querySelector('.sz').value.trim(), qty: r.querySelector('.qt').value || '1' });
    });
    itemsField.value = JSON.stringify(list);
  }
  function toggle(k) { var i = picked.indexOf(k); if (i >= 0) { picked.splice(i, 1); delete customs[k]; } else picked.push(k); paint(); }

  root.addEventListener('click', function (e) {
    var t = e.target.closest('.itile[data-k]'), d = e.target.closest('[data-drop]');
    if (t) toggle(t.getAttribute('data-k'));
    if (d) toggle(d.getAttribute('data-drop'));
    if (e.target.closest('[data-custom]')) { var k = 'x' + (++customN); customs[k] = ''; picked.push(k); paint(); var r = order.querySelector('[data-row="' + k + '"] .nm'); if (r) r.focus(); }
    if (e.target.closest('[data-act="clear-order"]')) {
      picked = []; customs = {};
      ['under', 'safety'].forEach(function (n) { $('[data-' + n + ']').checked = false; $('[data-group="' + n + '"]').hidden = true; });
      paint();
    }
  });
  root.addEventListener('input', function (e) {
    // a quantity typed by hand on an insignia line stays as typed
    var row = e.target.closest('.ufig-row');
    if (row && e.target.classList.contains('qt') && (autoQty(row.getAttribute('data-row')) !== undefined || BASE.indexOf(row.getAttribute('data-row')) >= 0)) row.setAttribute('data-touched', '');
    if (row && e.target.classList.contains('sz')) row.removeAttribute('data-autoname');   // they typed their own
    if (row) row.classList.remove('need');
    applyAuto(); save();
  });
  root.addEventListener('change', function (e) { if (e.target.closest('.ufig-row')) save(); });
  ['under', 'safety'].forEach(function (n) {
    $('[data-' + n + ']').addEventListener('change', function (e) {
      $('[data-group="' + n + '"]').hidden = !e.target.checked;
      if (!e.target.checked) { picked = picked.filter(function (k) { return !meta[k] || meta[k].group !== n; }); paint(); }
    });
  });
  if (form) {
    var fixBranch = function () { var v = form.elements.agency.value; form.elements.branch.value = v ? branch() : ''; };
    form.addEventListener('change', function (e) {
      if (e.target.name === 'agency') fixBranch();
      if (['agency', 'uniform', 'sex'].indexOf(e.target.name) >= 0) layout();
      if (e.target.name === 'setsOnHand') { applyAuto(); save(); }
    });
    form.addEventListener('input', function (e) { if (e.target.name === 'lastName') { order.querySelectorAll('.ufig-row[data-autoname]').forEach(fillName); save(); } });
    form.addEventListener('collect', save);
    form.addEventListener('reset', function () { setTimeout(function () { picked = []; customs = {}; fixBranch(); layout(); }); });
    fixBranch();
  }
  layout();
  window.L1776_ufigMissing = function () { return missing(true); };
  window.L1776_ufigItems = function () { save(); try { return JSON.parse(itemsField.value || '[]'); } catch (e) { return []; } };
})();
