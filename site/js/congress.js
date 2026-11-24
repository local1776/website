// Legislation page — "Your Members of Congress" (Ben, Nov 20 2026).
// US map -> a state's congressional districts (/congress/districts/<ST>.json) and its senators + representatives
// (/congress/members.json, rebuilt with the site). The address box asks the U.S. Census Bureau's geocoder (JSONP, no
// key, nothing stored) which district an address is in. Armed Services members are flagged.
(function () {
  var root = document.querySelector('[data-congress]');
  if (!root) return;
  var us = root.querySelector('.cg-us'), stateBox = root.querySelector('.cg-state'), panel = root.querySelector('.cg-panel');
  var nav = root.querySelector('.cg-nav'), form = root.querySelector('.cg-find'), msg = root.querySelector('.cg-msg');
  var input = root.querySelector('#cg-addr'), msg0 = msg.textContent;
  var DATA = null, MAPS = {}, cur = null;
  var FIPS = { '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY', '60': 'AS', '66': 'GU', '69': 'MP', '72': 'PR', '78': 'VI' };
  var NOSEN = { DC: 1, PR: 1, GU: 1, VI: 1, AS: 1, MP: 1 };

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var members = function () { return DATA ? Promise.resolve(DATA) : fetch('/congress/members.json').then(function (r) { return r.json(); }).then(function (d) { DATA = d; return d; }); };
  var districts = function (st) { return MAPS[st] ? Promise.resolve(MAPS[st]) : fetch('/congress/districts/' + st + '.json').then(function (r) { return r.json(); }).then(function (d) { MAPS[st] = d; return d; }); };
  var distName = function (st, n) { return n ? 'District ' + n : (NOSEN[st] ? 'Delegate' : 'At Large'); };
  var role = function (t) { return /^Chair(man|woman)?$/i.test(t) ? 'Chair' : t; };

  // ---- Local 1776 member counts (Ben, Nov 21 2026). The Union App publishes COUNTS ONLY (never a name or address) to
  // one public Firestore document; it's read fresh on every page load. Until it answers with real data — or if it fails,
  // is slow (>5 s) or has no "states" — no numbers show at all. A missing state/district = 0, but only once it has loaded.
  // Districts are "01", "02"…; a single at-large seat (and a territory's delegate) is "AL".
  // the app's Firebase project id comes from site/data/site-config.json (set on every page by the build)
  var COUNTS_URL = 'https://firestore.googleapis.com/v1/projects/' + (window.L1776_FIREBASE_PROJECT || 'liuna-local-1776') + '/databases/(default)/documents/publicStats/memberCounts';
  var COUNTS = null;
  function unwrap(v) {
    if (v == null) return null;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('stringValue' in v) return v.stringValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('nullValue' in v) return null;
    if ('mapValue' in v) { var o = {}, f = v.mapValue.fields || {}; for (var k in f) o[k] = unwrap(f[k]); return o; }
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(unwrap);
    return null;
  }
  var cd = function (st, n) { return n ? (n < 10 ? '0' : '') + n : 'AL'; };
  var countLine = function (st, n, isSen) { return '<p class="cg-count" data-cst="' + st + '"' + (isSen ? '' : ' data-cd="' + cd(st, n) + '"') + ' hidden></p>'; };
  function fillCounts() {
    [].forEach.call(document.querySelectorAll('.cg-count'), function (p) {
      if (!COUNTS) { p.hidden = true; return; }
      var st = p.getAttribute('data-cst'), d = p.getAttribute('data-cd'), s = COUNTS.states[st] || {};
      var n = d ? ((s.districts || {})[d] || 0) : (s.members || 0);
      var name = (DATA && DATA.names[st]) || p.getAttribute('data-name') || st;
      p.innerHTML = 'Local 1776 members in ' + (d ? 'this district' : esc(name)) + ': <b>' + n.toLocaleString('en-US') + '</b>';
      p.hidden = false;
    });
  }
  function showSummary() {
    var box = root.querySelector('.cg-counts'); if (!box || !COUNTS) return;
    var list = Object.keys(COUNTS.states).map(function (st) { return [st, COUNTS.states[st].members || 0]; }).filter(function (x) { return x[1] > 0; })
      .sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); });
    var asOf = COUNTS.asOf ? new Date(COUNTS.asOf + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
    box.innerHTML = '<div class="cg-tot"><div class="tile"><span>Members</span><b>' + (COUNTS.total || 0).toLocaleString('en-US') + '</b></div><div class="tile"><span>States and Territories</span><b>' + list.length + '</b></div></div>'
      + '<h4 class="rhead">Local 1776 Members by State</h4><ul class="cg-sts">' + list.map(function (x) {
        return '<li><button type="button" data-st="' + x[0] + '" title="' + esc((DATA && DATA.names[x[0]]) || x[0]) + '"><span>' + x[0] + '</span><b>' + x[1].toLocaleString('en-US') + '</b></button></li>';
      }).join('') + '</ul>' + (asOf ? '<p class="cg-asof">Member counts as of ' + asOf + '</p>' : '');
    box.hidden = false;
  }
  function loadCounts() {
    // preview only: on this PC, /legislation?counts=sample uses the sample numbers so the layout can be checked
    var sample = /^(127\.0\.0\.1|localhost)$/.test(location.hostname) && /[?&]counts=sample\b/.test(location.search);
    var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 5000);
    fetch(sample ? '/congress/counts-sample.json' : COUNTS_URL, ctl ? { signal: ctl.signal, cache: 'no-store' } : { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (doc) {
        clearTimeout(timer);
        var d = unwrap({ mapValue: { fields: (doc && doc.fields) || {} } });
        if (!d || !d.states || typeof d.states !== 'object' || !Object.keys(d.states).length) return;
        COUNTS = d; members().then(function () { fillCounts(); showSummary(); }, function () { fillCounts(); showSummary(); });
      })
      .catch(function () { clearTimeout(timer); COUNTS = null; fillCounts(); });   // quietly: no numbers, no message
  }

  // Voteview left-right bar (same markup as vvHtml() in tools/lib/congress.mjs)
  function vv(v, chamberNow) {
    if (!v) return '<p class="cg-vv-c">Voting score: none yet.</p>';
    var pct = Math.max(2, Math.min(98, (v.x + 1) / 2 * 100)).toFixed(1);
    var was = chamberNow && v.ch !== chamberNow ? ' as a ' + (v.ch === 'House' ? 'House member' : 'senator') : '';
    return '<div class="cg-vv" role="img" aria-label="Voting score ' + v.x + ' on a scale from -1 (liberal) to +1 (conservative)"><span>Liberal</span><div class="cg-vv-t"><i style="left:' + pct + '%"></i></div><span>Conservative</span></div>'
      + '<p class="cg-vv-c"><a href="https://voteview.com/person/' + v.id + '" target="_blank" rel="noopener">Voteview (UCLA)</a> · ' + v.n.toLocaleString('en-US') + ' votes' + was + ', ' + v.c + 'th Congress</p>';
  }

  function card(m, st, n, isSen, bare) {   // bare = inside a representative row (the row already shows name and party)
    if (!m) return '<div class="cg-card empty"><p>Vacant</p></div>';
    var tags = '';
    if (m.asc) tags += '<span class="cg-tag navy">Armed Services</span>';
    if (m.isNew) tags += '<span class="cg-tag">New Member</span>';
    if (m.status === 'uncalled') tags += '<span class="cg-tag gold">Race Not Called</span>';
    if (m.status === 'runoff') tags += '<span class="cg-tag gold">Runoff</span>';
    if ((m.committees || []).some(function (c) { return /^Chair/i.test(c.title); })) tags += '<span class="cg-tag gold">Committee Chair</span>';
    var comm = (m.committees || []).map(function (c) {
      var t = c.title ? ' (' + esc(role(c.title)) + ')' : '';
      return /^Chair/i.test(c.title) || c.name === 'Armed Services' ? '<b>' + esc(c.name) + t + '</b>' : esc(c.name) + t;
    }).join(' · ');
    var ct = (m.phone ? '<a href="tel:+1' + m.phone.replace(/[^0-9]/g, '') + '">' + esc(m.phone) + '</a>' : '')
      + (m.url ? '<a href="' + esc(m.url) + '" target="_blank" rel="noopener">Website</a>' : '')
      + (m.contact ? '<a href="' + esc(m.contact) + '" target="_blank" rel="noopener">Contact Form</a>' : '');
    var where = isSen ? 'Senator' : distName(st, n);
    var cg = m.bio ? 'https://www.congress.gov/member/' + String(m.name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '/' + m.bio : '';
    var nm = cg ? '<a href="' + cg + '" target="_blank" rel="noopener" title="' + esc(m.name) + ' on Congress.gov">' + esc(m.name) + '</a>' : esc(m.name);
    if (cg && bare) ct += '<a href="' + cg + '" target="_blank" rel="noopener">Congress.gov</a>';   // the row's name is the open/close button
    var rowTags = tags.replace('<span class="cg-tag navy">Armed Services</span>', '');
    var head = bare ? (rowTags ? '<div class="cg-mh">' + rowTags + '</div>' : '')
      : '<div class="cg-mh"><b>' + nm + '</b><span class="cg-pty">' + esc(m.party) + ' · ' + where + '</span>' + tags + '</div>';
    return '<div class="cg-card' + (m.asc ? ' asc' : '') + '">' + head + countLine(st, n, isSen)
      + (m.lobby || []).map(function (t) { return '<p class="cg-lob">' + esc(t) + '</p>'; }).join('')   // "Sponsor of H.R. 8800 (Local 1776 Supports)", from the build
      + (m.note ? '<p class="cg-noteline">' + esc(m.note) + '</p>' : '')
      + (m.open ? '' : vv(m.vv, isSen ? 'Senate' : 'House'))
      + (comm ? '<details class="cg-cm"><summary>Committees (' + m.committees.length + ')</summary><p>' + comm + '</p></details>' : (m.isNew ? '<p class="cg-cm0">Committees: assigned in January</p>' : ''))
      + (ct ? '<p class="cg-ct">' + ct + '</p>' : (m.isNew ? '<p class="cg-ct muted">Office phone and website are posted after January 3.</p>' : ''))
      + '</div>';
  }

  function setNav(st) {
    [].forEach.call(nav.querySelectorAll('.cg-tile'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-st') === (st || 'US') ? 'true' : 'false'); });
    var t = nav.querySelector('.cg-tile.state'); if (t) t.remove();
    if (st && !nav.querySelector('[data-st="' + st + '"]')) nav.insertAdjacentHTML('beforeend', '<button type="button" class="cg-tile state" data-st="' + st + '" aria-pressed="true">' + st + '</button>');
  }

  // ---- the panel before a state is chosen: Congress at a glance, how to call, races still open (Ben, Nov 21 2026)
  var SEAL = '';   // the embossed seals were taken out (Ben, Nov 21 2026: "too much… keep graphics to a minimum")
  function fitSeal() {}
  var HINT = '<p class="cg-hint">Choose a state on the map, or enter your address above, to see your two senators and your representative.</p>';
  function intro() {
    if (!DATA) { panel.innerHTML = HINT; return; }
    var sen = [].concat.apply([], Object.keys(DATA.senate).map(function (k) { return DATA.senate[k]; }));
    var hs = [], open = [];
    Object.keys(DATA.house).forEach(function (st) { Object.keys(DATA.house[st]).forEach(function (n) {
      var m = DATA.house[st][n]; if (NOSEN[st]) return;                       // delegates don't count toward the 435
      if (m.open) open.push({ st: st, n: +n, m: m }); else hs.push(m);
    }); });
    var cnt = function (list, p) { return list.filter(function (m) { return m.party === p; }).length; };
    var tiles = function (cells) { return '<div class="cg-glance">' + cells.map(function (c) { return '<div class="tile"><b>' + c[1] + '</b><span>' + c[0] + '</span></div>'; }).join('') + '</div>'; };
    var start = new Date(DATA.congress.start + 'T12:00:00'), when = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    var sworn = new Date() >= start;
    var openList = open.sort(function (a, b) { return a.st.localeCompare(b.st) || a.n - b.n; }).map(function (o) {
      return '<li><button type="button" data-open="' + o.st + '|' + o.n + '"><b>' + o.st + '-' + (o.n || 'AL') + '</b><span>' + (o.m.status === 'runoff' ? 'Runoff' : 'Not Called') + '</span></button></li>';
    }).join('');
    panel.innerHTML = '<div class="cg-intro"><div class="kicker cg-k">' + (sworn ? 'In Session Since ' : 'Takes Office ') + when + '</div><h3 class="cg-sn">The ' + DATA.congress.number + 'th Congress</h3>'
      + '<h4 class="rhead">Senate</h4>' + tiles([['Democrats', cnt(sen, 'D')], ['Independents', cnt(sen, 'I')], ['Republicans', cnt(sen, 'R')]])
      + '<h4 class="rhead">House</h4>' + tiles([['Democrats', cnt(hs, 'D')], ['Republicans', cnt(hs, 'R')], ['Undecided', open.length]])
      + (openList ? '<h4 class="rhead">Still Being Decided</h4><ul class="cg-open">' + openList + '</ul>' : '')
      + '<div class="cg-call"><h4 class="rhead">Calling Capitol Hill</h4><p class="cg-tel">Capitol Switchboard <a href="tel:+12022243121">(202) 224-3121</a></p>'
      + '<p>Give your name and ZIP code, say you are a LIUNA Local 1776 member, and ask for the staffer who handles defense or National Guard issues.</p></div></div>' + SEAL; fitSeal();
  }

  // ---- layout (Ben, Nov 21 2026): the map sits in a fixed-height stage (every state fits inside it, so the panel beside
  // it always has the same room); beside it: senators + the chosen district's card; under both: every representative in
  // columns. Hovering a name lights its district (soft amber); hovering a district lights its row and shows who it is;
  // the chosen district is navy. Zoom: + / − buttons, double-click, Ctrl/⌘ + scroll, pinch, drag to move.
  var stage = root.querySelector('.cg-stage'), zoomCtl = root.querySelector('.cg-zoom'), tip = root.querySelector('.cg-tip');
  var replist = root.querySelector('.cg-replist');
  var HOUSE = {}, picked = null;

  function showUS() {
    cur = null; picked = null; stateBox.hidden = true; stateBox.innerHTML = ''; us.style.display = ''; setNav(null);
    zoomCtl.hidden = true; tip.hidden = true; replist.hidden = true; replist.innerHTML = '';
    intro();
  }

  function distCard(st, n) {
    var m = HOUSE[n];
    return '<h4 class="rhead">' + (NOSEN[st] ? 'Delegate to the House' : (Object.keys(HOUSE).length > 1 ? distName(st, n) : 'Representative')) + '</h4>' + card(m, st, n, false);
  }

  function showState(st, pick) {
    return Promise.all([members(), districts(st)]).then(function (r) {
      var d = r[0], map = r[1]; cur = st; picked = null;
      us.style.display = 'none'; stateBox.hidden = false; setNav(st); tip.hidden = true;
      var many = map.districts.length > 1;
      // the whole state, widened to the stage's shape so zooming uses the full box
      var sr = stage.getBoundingClientRect(), A = (sr.width || 600) / (sr.height || 560);
      var w = map.w + 8, h = map.h + 8, x = -4, y = -4;
      if (w / h < A) { var nw = h * A; x -= (nw - w) / 2; w = nw; } else { var nh = w / A; y -= (nh - h) / 2; h = nh; }
      FULL = [x, y, w, h]; VIEW = FULL.slice();
      stateBox.innerHTML = '<svg class="cg-svg" viewBox="' + FULL.join(' ') + '" role="group" aria-label="' + esc(map.name) + ' congressional districts">'
        + '<defs><clipPath id="cg-clip"><path d="' + map.land + '"/></clipPath></defs><path class="cg-land" d="' + map.land + '"/>'
        + '<g clip-path="url(#cg-clip)">' + map.districts.map(function (x) { return '<path class="cg-d" data-n="' + x.n + '" d="' + x.d + '" tabindex="0" role="button" aria-label="' + esc(distName(st, x.n)) + '"></path>'; }).join('') + '</g>'
        + '<path class="cg-edge" d="' + map.land + '"/>'
        + (many ? '<g class="cg-lbl">' + map.districts.map(function (x) { return '<text x="' + x.x + '" y="' + x.y + '" data-n="' + x.n + '">' + x.n + '</text>'; }).join('') + '</g>' : '')
        + '</svg>';
      zoomCtl.hidden = false; relabel(); touchMode();
      HOUSE = d.house[st] || {};
      var nums = Object.keys(HOUSE).map(Number).sort(function (a, b) { return a - b; });
      var sen = NOSEN[st] ? '' : '<h4 class="rhead">Senators</h4>' + ((d.senate[st] || []).map(function (m) { return card(m, st, null, true); }).join('') || '<p>No data.</p>');
      panel.innerHTML = '<h3 class="cg-sn">' + esc(map.name) + '</h3>' + sen + '<div class="cg-dslot">'
        + (nums.length > 1 ? '<h4 class="rhead">Your District</h4><p class="cg-pick">Tap a district on the map or a name in the list below.</p>' : '') + '</div>'
        + (NOSEN[st] ? '<p class="cg-noteline">' + esc(map.name) + ' has no senators. Its delegate serves in the House and can vote in committee.</p>' : '')
        + (nums.length > 1 ? SEAL : '');
      fitSeal();
      // every representative, in columns under the map (only when there's more than one)
      if (nums.length > 1) {
        replist.innerHTML = '<h4 class="rhead">' + esc(map.name) + ' Representatives</h4><ul>' + nums.map(function (n) {
          var m = HOUSE[n];
          return '<li><button type="button" class="cg-rr" data-n="' + n + '"><span class="cg-dn">' + n + '</span><span class="cg-rn">' + esc(m ? m.name : 'Vacant') + '</span><span class="cg-pty">' + esc(m ? m.party : '') + '</span>' + (m && m.asc ? '<span class="cg-tag navy">Armed Services</span>' : '') + '</button></li>';
        }).join('') + '</ul>';
        replist.hidden = false;
      } else { replist.hidden = true; replist.innerHTML = ''; }
      fillCounts();
      if (pick != null) select(pick, 'zoom'); else if (nums.length === 1) select(nums[0]);
    }).catch(function () { panel.innerHTML = '<p class="cg-hint">That map could not be loaded. Please try again.</p>'; });
  }

  // ---- zoom
  var FULL = null, VIEW = null, anim = 0;
  var svgEl = function () { return stateBox.querySelector('svg'); };
  function relabel() {
    var svg = svgEl(); if (!svg) return;
    var k = VIEW[2] / (svg.getBoundingClientRect().width || 1), nums = [];
    [].forEach.call(svg.querySelectorAll('.cg-lbl text'), function (t) {
      t.style.fontSize = (12 * k) + 'px';
      var p = svg.querySelector('.cg-d[data-n="' + t.getAttribute('data-n') + '"]').getBBox();
      t.style.display = Math.min(p.width, p.height) < 26 * k ? 'none' : '';   // only where the number fits
      if (!t.style.display) nums.push({ t: t, x: +t.getAttribute('x'), y: +t.getAttribute('y'), w: t.textContent.length * 7.5 * k, a: p.width * p.height });
    });
    nums.sort(function (a, b) { return b.a - a.a; }).forEach(function (n, i) {   // and never over another number (the larger district keeps its own)
      if (nums.slice(0, i).some(function (o) { return !o.t.style.display && Math.abs(o.x - n.x) < (o.w + n.w) / 2 && Math.abs(o.y - n.y) < 12 * k; })) n.t.style.display = 'none';
    });
  }
  var zoomed = function () { return FULL && VIEW[2] < FULL[2] * 0.999; };
  // one finger scrolls the page until the map is zoomed in; then it moves the map (two fingers always pinch)
  function touchMode() { var s = svgEl(); if (s) s.style.touchAction = zoomed() ? 'none' : 'pan-y'; }
  function clampVB(v) {
    var w = Math.min(FULL[2], Math.max(FULL[2] / 40, v[2])), h = w * FULL[3] / FULL[2];
    var cx = v[0] + v[2] / 2, cy = v[1] + v[3] / 2, x = cx - w / 2, y = cy - h / 2;
    x = Math.min(Math.max(x, FULL[0]), FULL[0] + FULL[2] - w); y = Math.min(Math.max(y, FULL[1]), FULL[1] + FULL[3] - h);
    return [x, y, w, h];
  }
  function setVB(v) { VIEW = v; var s = svgEl(); if (s) s.setAttribute('viewBox', v.join(' ')); }
  var relabelSoon = (function () { var t; return function () { clearTimeout(t); t = setTimeout(function () { relabel(); touchMode(); }, 120); }; })();
  function setView(to) {
    var svg = svgEl(); if (!svg) return;
    var from = VIEW.slice(), t0 = performance.now(), id = ++anim;
    (function step(now) {
      if (id !== anim) return;
      var t = Math.min(1, (now - t0) / 380), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setVB(from.map(function (v, i) { return v + (to[i] - v) * e; }));
      if (t < 1) requestAnimationFrame(step); else { relabel(); touchMode(); }
    })(t0);
  }
  function toMap(cx, cy) { var r = svgEl().getBoundingClientRect(); return [VIEW[0] + (cx - r.left) / r.width * VIEW[2], VIEW[1] + (cy - r.top) / r.height * VIEW[3]]; }
  function zoomAt(f, px, py, smooth) {
    var w = VIEW[2] / f, h = VIEW[3] / f;
    var v = clampVB([px - (px - VIEW[0]) / f, py - (py - VIEW[1]) / f, w, h]);
    if (smooth) setView(v); else { anim++; setVB(v); relabelSoon(); }
  }
  // show a district: zoom in when it's small; when the map is already zoomed, only move if it's out of view
  function zoomTo(n, force) {
    var p = stateBox.querySelector('.cg-d[data-n="' + n + '"]'); if (!p || !FULL) return;
    var b = p.getBBox(), small = Math.max(b.width / FULL[2], b.height / FULL[3]) < .2;
    var inView = b.x >= VIEW[0] && b.y >= VIEW[1] && b.x + b.width <= VIEW[0] + VIEW[2] && b.y + b.height <= VIEW[1] + VIEW[3];
    if (zoomed() && inView && !force) return;
    if (!small) { if (zoomed()) setView(FULL); return; }
    var w = Math.max(b.width, b.height * FULL[2] / FULL[3]) * 2.4;
    setView(clampVB([b.x + b.width / 2 - w / 2, b.y + b.height / 2 - w * FULL[3] / FULL[2] / 2, w, w * FULL[3] / FULL[2]]));
  }

  // ---- choose / point at a district
  function select(n, how) {
    picked = +n;
    if (how === 'zoom') zoomTo(n, true); else if (how === 'list') zoomTo(n, false);
    [].forEach.call(root.querySelectorAll('.cg-d,.cg-lbl text,.cg-rr'), function (p) { p.classList.toggle('sel', +p.getAttribute('data-n') === picked); });
    var slot = panel.querySelector('.cg-dslot'); if (slot) { slot.innerHTML = distCard(cur, picked); fillCounts(); }
    var seal = panel.querySelector('.cg-seal'); if (seal) seal.remove();
  }
  function hover(n, on) {
    [].forEach.call(root.querySelectorAll('.cg-d[data-n="' + n + '"],.cg-rr[data-n="' + n + '"]'), function (p) { p.classList.toggle('hov', on); });
  }
  function showTip(n, e) {
    var m = HOUSE[n], r = stage.getBoundingClientRect();
    tip.innerHTML = '<b>' + esc(distName(cur, +n)) + '</b>' + (m ? ' · ' + esc(m.name) + (m.party ? ' (' + esc(m.party) + ')' : '') : '');
    tip.hidden = false;
    var x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
    if (x + tip.offsetWidth > r.width - 6) x = e.clientX - r.left - tip.offsetWidth - 10;
    if (y + tip.offsetHeight > r.height - 6) y = e.clientY - r.top - tip.offsetHeight - 10;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }

  // ---- map events
  us.addEventListener('click', function (e) { var p = e.target.closest('[data-st]'); if (p) showState(p.getAttribute('data-st')); });
  us.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute('data-st')) { e.preventDefault(); showState(e.target.getAttribute('data-st')); } });
  nav.addEventListener('click', function (e) { var b = e.target.closest('.cg-tile'); if (!b) return; var st = b.getAttribute('data-st'); if (st === 'US') showUS(); else if (st === cur && FULL) setView(FULL); else showState(st); });
  var pointers = {}, drag = null, moved = false;
  stateBox.addEventListener('click', function (e) { if (moved) { moved = false; return; } var p = e.target.closest('.cg-d'); if (p) select(p.getAttribute('data-n')); });
  stateBox.addEventListener('keydown', function (e) { var p = e.target.closest('.cg-d'); if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(p.getAttribute('data-n')); } });
  stateBox.addEventListener('mouseover', function (e) { var p = e.target.closest('.cg-d'); if (p) hover(p.getAttribute('data-n'), true); });
  stateBox.addEventListener('mouseout', function (e) { var p = e.target.closest('.cg-d'); if (p) { hover(p.getAttribute('data-n'), false); tip.hidden = true; } });
  stateBox.addEventListener('mousemove', function (e) { var p = e.target.closest('.cg-d'); if (p && !drag) showTip(p.getAttribute('data-n'), e); });
  stateBox.addEventListener('pointerdown', function (e) {
    if (!svgEl()) return;
    pointers[e.pointerId] = [e.clientX, e.clientY];
    var ids = Object.keys(pointers);
    if (ids.length === 1) { drag = { x: e.clientX, y: e.clientY, vb: VIEW.slice() }; moved = false; }
    else if (ids.length === 2) { var a = pointers[ids[0]], b = pointers[ids[1]]; drag = { pinch: Math.hypot(a[0] - b[0], a[1] - b[1]), vb: VIEW.slice(), mid: toMap((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) }; moved = true; }
  });
  stateBox.addEventListener('pointermove', function (e) {
    if (!drag || !pointers[e.pointerId]) return;
    pointers[e.pointerId] = [e.clientX, e.clientY];
    var ids = Object.keys(pointers), r = svgEl().getBoundingClientRect();
    if (drag.pinch && ids.length === 2) {
      var a = pointers[ids[0]], b = pointers[ids[1]], f = Math.hypot(a[0] - b[0], a[1] - b[1]) / drag.pinch, m = drag.mid;
      anim++; setVB(clampVB([m[0] - (m[0] - drag.vb[0]) / f, m[1] - (m[1] - drag.vb[1]) / f, drag.vb[2] / f, drag.vb[3] / f])); relabelSoon();
    } else if (!drag.pinch && zoomed()) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      if (!moved) { moved = true; tip.hidden = true; try { e.target.setPointerCapture(e.pointerId); } catch (x) {} }
      anim++; setVB(clampVB([drag.vb[0] - dx / r.width * drag.vb[2], drag.vb[1] - dy / r.height * drag.vb[3], drag.vb[2], drag.vb[3]]));
    }
  });
  var lift = function (e) { delete pointers[e.pointerId]; if (!Object.keys(pointers).length) { drag = null; relabelSoon(); } else if (drag && drag.pinch) drag = null; };
  stateBox.addEventListener('pointerup', lift); stateBox.addEventListener('pointercancel', lift);
  stateBox.addEventListener('wheel', function (e) {
    if (!svgEl() || !(e.ctrlKey || e.metaKey)) return;              // Ctrl/⌘ + scroll, or a trackpad pinch; plain scrolling scrolls the page
    e.preventDefault(); var p = toMap(e.clientX, e.clientY); zoomAt(Math.exp(-e.deltaY * 0.0025), p[0], p[1], false);
  }, { passive: false });
  stateBox.addEventListener('dblclick', function (e) { if (!svgEl()) return; e.preventDefault(); var p = toMap(e.clientX, e.clientY); zoomAt(2, p[0], p[1], true); });
  zoomCtl.addEventListener('click', function (e) {
    var b = e.target.closest('a,button'); if (!b) return; e.preventDefault();
    zoomAt(/cg-zin/.test(b.className) ? 1.8 : 1 / 1.8, VIEW[0] + VIEW[2] / 2, VIEW[1] + VIEW[3] / 2, true);
  });
  // ---- the list under the map
  replist.addEventListener('click', function (e) {
    var b = e.target.closest('.cg-rr'); if (!b) return;
    select(b.getAttribute('data-n'), 'list');
    if (window.matchMedia('(max-width: 1000px)').matches) root.querySelector('.cg-mapbox').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  replist.addEventListener('mouseover', function (e) { var b = e.target.closest('.cg-rr'); if (b) hover(b.getAttribute('data-n'), true); });
  replist.addEventListener('mouseout', function (e) { var b = e.target.closest('.cg-rr'); if (b) hover(b.getAttribute('data-n'), false); });
  window.addEventListener('resize', function () { if (cur && svgEl()) relabelSoon(); fitSeal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cur && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) showUS(); });

  // ---- address finder (U.S. Census Bureau geocoder, JSONP)
  var seq = 0;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim(); if (q.length < 5) { msg.textContent = 'Enter a street address with a city and state, or a ZIP code.'; return; }
    var cb = 'cgGeo' + (++seq), s = document.createElement('script'), done = false;
    msg.textContent = 'Looking up your district…';
    window[cb] = function (j) {
      done = true; delete window[cb]; s.remove();
      var m = j && j.result && j.result.addressMatches && j.result.addressMatches[0];
      if (!m) { msg.textContent = 'We couldn’t find that address. Check the spelling and add the city and state or ZIP code.'; return; }
      var g = m.geographies, key = Object.keys(g).filter(function (k) { return /Congressional Districts/.test(k); }).sort().pop();
      var cd = key && g[key][0]; if (!cd) { msg.textContent = 'We found the address but not its district. Try the map instead.'; return; }
      var st = FIPS[cd.STATE], fld = Object.keys(cd).filter(function (k) { return /^CD\d+$/.test(k); })[0], n = +cd[fld]; if (n === 98) n = 0;
      msg.textContent = m.matchedAddress + ' is in ' + (n ? 'Congressional District ' + n : 'the at-large district') + ' of ' + (DATA && DATA.names[st] || st) + '.';
      showState(st, n).then(function () { if (window.matchMedia('(max-width: 1000px)').matches) root.querySelector('.cg-mapbox').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    };
    s.src = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=' + encodeURIComponent(q) + '&benchmark=Public_AR_Current&vintage=Current_Current&layers=all&format=jsonp&callback=' + cb;
    s.onerror = function () { msg.textContent = 'The address lookup isn’t answering right now. Please try again, or use the map.'; };
    setTimeout(function () { if (!done) { msg.textContent = 'The address lookup is taking too long. Please try again, or use the map.'; } }, 15000);
    document.head.appendChild(s);
    members();
  });
  input.addEventListener('input', function () { if (!input.value) msg.textContent = msg0; });

  panel.addEventListener('click', function (e) { var b = e.target.closest('[data-open]'); if (!b) return; var p = b.getAttribute('data-open').split('|'); showState(p[0], +p[1]); });
  // the members-by-state tiles open that state
  root.addEventListener('click', function (e) { var b = e.target.closest('.cg-sts [data-st]'); if (b) { showState(b.getAttribute('data-st')); root.querySelector('.cg-main').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });

  // ---- committee tabs
  var tabs = root.querySelector('.cg-tabs');
  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('[role="tab"]'); if (!b) return;
    [].forEach.call(tabs.querySelectorAll('[role="tab"]'), function (t) { var on = t === b; t.setAttribute('aria-selected', on ? 'true' : 'false'); root.querySelector('#cg-' + t.getAttribute('data-tab')).hidden = !on; });
  });
  members().then(function () { if (!cur) intro(); });
  loadCounts();
})();
