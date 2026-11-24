// Lobbying on the website (Ben, Nov 21 2026; contract agreed with the Union App — see CLAUDE.md "Union App LOBBYING").
// The app publishes three public Firestore documents; this page reads them LIVE (one GET each, no sign-in):
//   publicLobbying/positions  → "Our Positions" (Legislation page)
//   publicLobbying/campaigns  → the active campaigns (Legislation page) and /take-action?c=<slug>
//   publicLobbying/activity   → one line under "Our Work on Capitol Hill" (current year only)
// Anything missing, empty, slow (over 5 s) or failed shows NOTHING: no zeros, no "coming soon", no error.
// The website sends nothing and writes nothing: Take Action shows official contact links, phone numbers and the
// talking points. Members of Congress come from /data/congress.json (the shared list the build publishes).
// Preview only, on this PC: add ?lobby=sample to use site/congress/lobby-sample-*.json.
(function () {
  var BASE = 'https://firestore.googleapis.com/v1/projects/' + (window.L1776_FIREBASE_PROJECT || 'liuna-local-1776') + '/databases/(default)/documents/publicLobbying/';   // project id: site/data/site-config.json
  var SAMPLE = /^(127\.0\.0\.1|localhost)$/.test(location.hostname) && /[?&]lobby=sample\b/.test(location.search);
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
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
  // one document → its plain value, or null for anything that isn't there (quietly)
  function get(name) {
    var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 5000);
    var url = SAMPLE ? '/congress/lobby-sample-' + name + '.json' : BASE + name;
    return fetch(url, ctl ? { signal: ctl.signal, cache: 'no-store' } : { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (doc) { clearTimeout(timer); return unwrap({ mapValue: { fields: (doc && doc.fields) || {} } }); })
      .catch(function () { clearTimeout(timer); return null; });
  }
  var day = function (s) { return s ? new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''; };
  var num = function (n) { return Number(n).toLocaleString('en-US'); };

  // bills: "hr8800-119" → label and Congress.gov address
  var TYPES = { hr: ['H.R.', 'house-bill'], s: ['S.', 'senate-bill'], hjres: ['H.J.Res.', 'house-joint-resolution'], sjres: ['S.J.Res.', 'senate-joint-resolution'],
    hconres: ['H.Con.Res.', 'house-concurrent-resolution'], sconres: ['S.Con.Res.', 'senate-concurrent-resolution'], hres: ['H.Res.', 'house-resolution'], sres: ['S.Res.', 'senate-resolution'] };
  var nth = function (n) { var t = n % 100, o = n % 10; return n + (t > 10 && t < 14 ? 'th' : o === 1 ? 'st' : o === 2 ? 'nd' : o === 3 ? 'rd' : 'th'); };
  function bill(id) {
    var m = /^(hr|s|hjres|sjres|hconres|sconres|hres|sres)(\d+)-(\d+)$/.exec(String(id || '').toLowerCase());
    return m ? { label: TYPES[m[1]][0] + ' ' + m[2], url: 'https://www.congress.gov/bill/' + nth(+m[3]) + '-congress/' + TYPES[m[1]][1] + '/' + m[2] } : null;
  }
  var ICON = {
    go: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>'
  };
  var btn = function (href, icon, word, cls) { return '<a class="btn' + (cls ? ' ' + cls : '') + '" href="' + href + '"><span class="ico">' + ICON[icon] + '</span><span class="lbl">' + word + '</span></a>'; };
  var tag = function (p) { return '<span class="lb-tag ' + p + '">' + (p === 'support' ? 'Support' : 'Oppose') + '</span>'; };
  var taken = function (c) { var t = c.participation && c.participation.total; return t > 0 ? '<p class="lb-part"><b>' + num(t) + '</b> Local 1776 members have taken part.</p>' : ''; };
  var active = function (list) { return (list || []).filter(function (c) { return c && c.slug && c.title && c.status === 'active'; }); };
  var camLink = function (c) { return '/take-action?c=' + encodeURIComponent(c.slug) + (SAMPLE ? '&lobby=sample' : ''); };

  // ---------- Legislation page ----------
  var pri = document.querySelector('[data-lobby-priorities]');
  if (pri) {
    Promise.all([get('positions'), get('campaigns')]).then(function (r) {
      var pos = ((r[0] && r[0].positions) || []).filter(function (p) { return p && bill(p.billId) && /^(support|oppose)$/.test(p.position); });
      var cams = active(r[1] && r[1].campaigns);
      if (cams.length) {
        var cb = pri.querySelector('.lb-camps');
        cb.innerHTML = '<h3 class="lb-h">Take Action</h3>' + cams.map(function (c) {
          return '<div class="lb-cam"><div><h4>' + esc(c.title) + '</h4><p>' + esc(c.summary) + '</p>' + (c.ends ? '<p class="lb-when">Through ' + esc(day(c.ends)) + '</p>' : '') + taken(c) + '</div>' + btn(camLink(c), 'go', 'Act') + '</div>';
        }).join('');
        cb.hidden = false;
      }
      if (pos.length) {
        var pb = pri.querySelector('.lb-pos');
        pb.innerHTML = '<h3 class="lb-h">Bills We Support or Oppose</h3>' + pos.map(function (p) {
          var b = bill(p.billId), url = p.url || b.url;
          var letters = (p.letters || []).filter(function (l) { return l && l.pdfUrl; }).map(function (l) {
            return '<a href="' + esc(l.pdfUrl) + '" target="_blank" rel="noopener">' + esc(l.title || 'Letter') + (l.date ? ' (' + esc(day(l.date)) + ')' : '') + '</a>';
          }).join('');
          return '<div class="lb-row"><div class="lb-l">' + tag(p.position) + '<b>' + esc(p.label || b.label) + '</b></div><div class="lb-r"><h4>' + esc(p.title) + '</h4>' + (p.line ? '<p>' + esc(p.line) + '</p>' : '')
            + '<p class="lb-links"><a href="' + esc(url) + '" target="_blank" rel="noopener">Read It on Congress.gov</a>' + letters + '</p></div></div>';
        }).join('');
        pb.hidden = false;
      }
      if (cams.length || pos.length) pri.hidden = false;
    });
  }
  var act = document.querySelector('[data-lobby-activity]');
  if (act) get('activity').then(function (a) {
    if (!a || +a.year !== new Date().getFullYear() || !(a.officesMet > 0)) return;
    act.textContent = 'In ' + a.year + ', Local 1776 members met with ' + num(a.officesMet) + ' congressional ' + (a.officesMet === 1 ? 'office' : 'offices') + '.';
    act.hidden = false;
  });

  // ---------- Take Action page ----------
  var ta = document.querySelector('[data-take-action]');
  if (!ta) return;
  var NAMES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', PR: 'Puerto Rico', GU: 'Guam', VI: 'U.S. Virgin Islands', AS: 'American Samoa', MP: 'Northern Mariana Islands' };
  var FIPS = { '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY', '60': 'AS', '66': 'GU', '69': 'MP', '72': 'PR', '78': 'VI' };
  var head = document.querySelector('[data-ta-head]'), slug = (/[?&]c=([^&]+)/.exec(location.search) || [])[1];
  slug = slug ? decodeURIComponent(slug) : '';
  var none = '<p class="ta-none">There is no campaign open right now. You can still find your members of Congress on the <a href="/legislation#congress">Legislation page</a>.</p>';

  Promise.all([get('campaigns'), get('positions')]).then(function (r) {
    var all = (r[0] && r[0].campaigns) || [], pos = (r[1] && r[1].positions) || [];
    if (!slug) {   // no campaign named: list the open ones
      var cams = active(all);
      ta.innerHTML = cams.length ? cams.map(function (c) {
        return '<div class="lb-cam"><div><h4>' + esc(c.title) + '</h4><p>' + esc(c.summary) + '</p>' + (c.ends ? '<p class="lb-when">Through ' + esc(day(c.ends)) + '</p>' : '') + taken(c) + '</div>' + btn(camLink(c), 'go', 'Act') + '</div>';
      }).join('') : none;
      return;
    }
    var c = all.filter(function (x) { return x && x.slug === slug; })[0];
    if (!c) { ta.innerHTML = none; return; }
    document.title = c.title + ' | LIUNA Local 1776';
    head.querySelector('h1').textContent = c.title;
    var deck = head.querySelector('.deck'); deck.textContent = c.summary || ''; deck.hidden = !c.summary;
    var bills = (c.billIds || []).map(function (id) {
      var b = bill(id); if (!b) return '';
      var p = pos.filter(function (x) { return x && x.billId === id; })[0];
      return '<li><a href="' + esc((p && p.url) || b.url) + '" target="_blank" rel="noopener">' + esc((p && p.label) || b.label) + '</a>' + (p && p.title ? ' · ' + esc(p.title) : '') + (p ? ' ' + tag(p.position) : '') + '</li>';
    }).join('');
    if (c.status !== 'active') {
      ta.innerHTML = '<p class="ta-closed">This campaign has closed. Thank you to everyone who took part.</p>' + taken(c) + (bills ? '<h3 class="lb-h">The Bill</h3><ul class="ta-bills">' + bills + '</ul>' : '');
      return;
    }
    var points = (c.talkingPoints || []).filter(Boolean);
    ta.innerHTML = taken(c) + (c.ends ? '<p class="lb-when">Through ' + esc(day(c.ends)) + '</p>' : '')
      + (bills ? '<h3 class="lb-h">' + ((c.billIds || []).length > 1 ? 'The Bills' : 'The Bill') + '</h3><ul class="ta-bills">' + bills + '</ul>' : '')
      + '<div class="ta-grid"><div class="ta-step"><h3 class="lb-h">1 · Find Your Members of Congress</h3>'
      + '<div class="fields ta-where"><div class="field"><label for="ta-st">State or Territory</label><select id="ta-st"><option value="">Choose One</option>'
      + Object.keys(NAMES).sort(function (a, b) { return NAMES[a].localeCompare(NAMES[b]); }).map(function (k) { return '<option value="' + k + '">' + esc(NAMES[k]) + '</option>'; }).join('')
      + '</select></div><div class="field" hidden><label for="ta-cd">Congressional District</label><select id="ta-cd"></select></div></div>'
      + '<form class="ta-find" novalidate><label for="ta-addr">Or Find Them by Address</label><div class="cg-row"><input id="ta-addr" type="text" autocomplete="street-address" maxlength="120" placeholder="Street address, city, state or ZIP">'
      + '<button type="submit" class="btn"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></span><span class="lbl">Find</span></button></div>'
      + '<p class="ta-msg" aria-live="polite">Your address goes only to the U.S. Census Bureau&rsquo;s address lookup. We don&rsquo;t keep it.</p></form>'
      + '<div class="ta-members" aria-live="polite"></div></div>'
      + '<div class="ta-step"><h3 class="lb-h">2 · What to Say</h3><ol class="ta-points">' + points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ol>'
      + (points.length ? '<div class="ta-copy"><button type="button" class="btn alt" data-copy><span class="ico">' + ICON.copy + '</span><span class="lbl">Copy</span></button><span class="ta-copied" aria-live="polite"></span></div>' : '') + '</div></div>';
    wire(c, points);
  });

  function wire(c, points) {
    var stSel = ta.querySelector('#ta-st'), cdSel = ta.querySelector('#ta-cd'), list = ta.querySelector('.ta-members'), msg = ta.querySelector('.ta-msg');
    var DATA = null, aud = c.audience || {}, chambers = aud.chambers && aud.chambers.length ? aud.chambers : ['house', 'senate'];
    var comms = aud.committees || [], states = aud.states === 'all' || !aud.states ? null : aud.states;
    var load = function () { return DATA ? Promise.resolve(DATA) : fetch('/data/congress.json').then(function (r) { return r.json(); }).then(function (d) { DATA = d; return d; }); };
    var onComm = function (m) { return !comms.length || (m.committees || []).some(function (x) { return comms.indexOf(x.code) >= 0; }); };
    function contact(m) {
      var where = m.chamber === 'senate' ? 'Senator' : (m.district === 'AL' ? 'At-Large' : 'District ' + (+m.district));
      var links = (m.phone ? '<a href="tel:+1' + m.phone.replace(/[^0-9]/g, '') + '">' + esc(m.phone) + '</a>' : '')
        + (m.contactForm ? '<a href="' + esc(m.contactForm) + '" target="_blank" rel="noopener">Contact Form</a>' : m.website ? '<a href="' + esc(m.website) + '" target="_blank" rel="noopener">Website</a>' : '');
      return '<div class="ta-m"><b>' + esc(m.name) + '</b><span class="cg-pty">' + esc(m.party) + ' · ' + where + '</span>' + (links ? '<p class="cg-ct">' + links + '</p>' : '<p class="ta-later">Contact details are posted after January 3.</p>') + '</div>';
    }
    function show() {
      var st = stSel.value;
      if (!st) { list.innerHTML = ''; return; }
      load().then(function (d) {
        var mine = d.members.filter(function (m) { return m.state === st; });
        var houseSeats = mine.filter(function (m) { return m.chamber === 'house'; });
        // the district picker: only for states with more than one House seat
        if (houseSeats.length > 1 && cdSel.getAttribute('data-st') !== st) {
          cdSel.setAttribute('data-st', st);
          cdSel.innerHTML = '<option value="">Choose One</option>' + houseSeats.map(function (m) { return m.district; }).sort().map(function (n) { return '<option value="' + n + '">District ' + (+n) + '</option>'; }).join('');
        }
        cdSel.parentNode.hidden = houseSeats.length < 2;
        if (states && states.indexOf(st) < 0) {
          list.innerHTML = '<p class="ta-note">This campaign asks members of Congress from ' + esc(states.map(function (s) { return NAMES[s] || s; }).join(', ')) + ' to act.</p>';
          return;
        }
        var cd = houseSeats.length < 2 ? (houseSeats[0] && houseSeats[0].district) : cdSel.value;
        var sen = chambers.indexOf('senate') >= 0 ? mine.filter(function (m) { return m.chamber === 'senate' && onComm(m); }) : [];
        var rep = chambers.indexOf('house') >= 0 && cd ? mine.filter(function (m) { return m.chamber === 'house' && m.district === cd && onComm(m); }) : [];
        var out = sen.concat(rep).map(contact).join('');
        var askCd = chambers.indexOf('house') >= 0 && houseSeats.length > 1 && !cd ? '<p class="ta-note">Choose your district to see your representative.</p>' : '';
        list.innerHTML = out + askCd + (!out && !askCd ? '<p class="ta-note">' + (comms.length ? 'None of your members of Congress sit on the committees this campaign is aimed at.' : 'No one to show for this choice.') + '</p>' : '');
      });
    }
    stSel.addEventListener('change', function () { cdSel.value = ''; show(); });
    cdSel.addEventListener('change', show);
    // address → state and district (U.S. Census Bureau geocoder, JSONP), as on the Legislation page
    var seq = 0, input = ta.querySelector('#ta-addr'), msg0 = msg.textContent;
    ta.querySelector('.ta-find').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim(); if (q.length < 5) { msg.textContent = 'Enter a street address with a city and state, or a ZIP code.'; return; }
      var cb = 'taGeo' + (++seq), s = document.createElement('script'), done = false;
      msg.textContent = 'Looking up your district…';
      window[cb] = function (j) {
        done = true; delete window[cb]; s.remove();
        var m = j && j.result && j.result.addressMatches && j.result.addressMatches[0];
        if (!m) { msg.textContent = 'We couldn’t find that address. Check the spelling and add the city and state or ZIP code.'; return; }
        var g = m.geographies, key = Object.keys(g).filter(function (k) { return /Congressional Districts/.test(k); }).sort().pop();
        var cdg = key && g[key][0]; if (!cdg) { msg.textContent = 'We found the address but not its district. Choose your state above.'; return; }
        var st = FIPS[cdg.STATE], fld = Object.keys(cdg).filter(function (k) { return /^CD\d+$/.test(k); })[0], n = +cdg[fld]; if (n === 98) n = 0;
        msg.textContent = m.matchedAddress + ' is in ' + (n ? 'Congressional District ' + n : 'the at-large district') + ' of ' + (NAMES[st] || st) + '.';
        stSel.value = st; show();
        load().then(function () { setTimeout(function () { if (n && cdSel.querySelector('option[value="' + (n < 10 ? '0' : '') + n + '"]')) { cdSel.value = (n < 10 ? '0' : '') + n; show(); } }, 0); });
      };
      s.src = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=' + encodeURIComponent(q) + '&benchmark=Public_AR_Current&vintage=Current_Current&layers=all&format=jsonp&callback=' + cb;
      s.onerror = function () { msg.textContent = 'The address lookup isn’t answering right now. Please choose your state above.'; };
      setTimeout(function () { if (!done) msg.textContent = 'The address lookup is taking too long. Please choose your state above.'; }, 15000);
      document.head.appendChild(s);
    });
    input.addEventListener('input', function () { if (!input.value) msg.textContent = msg0; });
    var cp = ta.querySelector('[data-copy]');
    if (cp) cp.addEventListener('click', function () {
      var txt = points.join('\n'), note = ta.querySelector('.ta-copied');
      var ok = function () { note.textContent = 'Copied.'; setTimeout(function () { note.textContent = ''; }, 2500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, function () { note.textContent = 'Select the points and copy them.'; });
      else note.textContent = 'Select the points and copy them.';
    });
  }
})();
