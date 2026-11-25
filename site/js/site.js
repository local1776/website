// LIUNA Local 1776 — small page helpers. No framework.
(function () {
  // Text boxes grow to show their whole contents (house rule: no inner scrolling).
  function grow(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
  document.querySelectorAll('textarea').forEach(function (t) {
    t.addEventListener('input', function () { grow(t); });
    grow(t);
  });

  // Home photo slider: fades to the next photo every 6 seconds. Loads each photo just before it is shown.
  // Stops for people who ask their device for reduced motion, and has a pause button.
  var hero = document.querySelector('.hero .slides');
  if (hero) {
    var srcs = JSON.parse(hero.dataset.slides || '[]');
    if (window.matchMedia && matchMedia('(max-width: 640px)').matches) srcs = srcs.map(function (s) { return s.replace('/slides/', '/slides/m/'); });
    var imgs = [hero.querySelector('img')], cur = 0, timer = null;
    var ctl = document.querySelector('.hero-ctl');
    var PAUSE = ctl ? ctl.innerHTML : '';
    var PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>';
    var get = function (k) {
      if (!imgs[k]) { var im = new Image(); im.alt = ''; im.decoding = 'async'; watch(im, k); im.src = srcs[k]; hero.appendChild(im); imgs[k] = im; }
      return imgs[k];
    };
    // A photo that fails is asked for again. A phone often opens a home screen app before its connection is awake: the page
    // comes from the phone's own copy and the first photo fails, which left a blue box until the next one (Ben, Nov 24 2026).
    var ready = function (im) { return im && im.complete && im.naturalWidth > 0; };
    var again = function (k) {
      var im = imgs[k]; if (!im || ready(im)) return;
      if (im.parentNode.tagName === 'PICTURE') { [].forEach.call(im.parentNode.querySelectorAll('source'), function (s) { s.remove(); }); }
      im.src = srcs[k] + '?again=' + (im.tries = (im.tries || 0) + 1);
    };
    var watch = function (im, k) { im.addEventListener('load', function () { im.style.visibility = ''; }); im.addEventListener('error', function () { im.style.visibility = 'hidden'; if ((im.tries || 0) < 8) setTimeout(function () { again(k); }, Math.min(8000, 700 * ((im.tries || 0) + 1))); }); };
    watch(imgs[0], 0);
    if (imgs[0].complete && !imgs[0].naturalWidth) { imgs[0].style.visibility = 'hidden'; again(0); }
    var wake = function () { if (!document.hidden) { [cur, (cur + 1) % srcs.length].forEach(function (k) { if (imgs[k] && imgs[k].complete) again(k); }); } };
    ['online', 'pageshow'].forEach(function (e) { window.addEventListener(e, wake); });
    document.addEventListener('visibilitychange', wake);
    var show = function (k) {
      var next = get(k);
      var go = function () { imgs[cur].classList.remove('on'); next.classList.add('on'); cur = k; if (srcs.length > 1) get((k + 1) % srcs.length); };
      if (next.complete && next.naturalWidth) go(); else next.onload = go;
    };
    var play = function () { stop(); timer = setInterval(function () { show((cur + 1) % srcs.length); }, 6000); if (ctl) { ctl.innerHTML = PAUSE; ctl.setAttribute('aria-label', 'Pause the photos'); ctl.title = 'Pause'; } };
    var stop = function () { clearInterval(timer); timer = null; if (ctl) { ctl.innerHTML = PLAY; ctl.setAttribute('aria-label', 'Play the photos'); ctl.title = 'Play'; } };
    if (srcs.length > 1) {
      get(1);
      setTimeout(function () { if (cur === 0 && timer && !ready(imgs[0]) && ready(imgs[1])) { show(1); play(); } }, 2500);   // the second came first: don't wait on the first
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) stop(); else play();
      if (ctl) ctl.addEventListener('click', function () { if (timer) stop(); else play(); });
    } else if (ctl) ctl.hidden = true;
    // Desktop + tablet: the whole header and the photo hold still while the page slides over the photo (CSS). Here: the
    // heights, and the hand-over (.free) once the page reaches the bottom of the white strip.
    var mast = document.querySelector('.mast'), bar = document.querySelector('.nav'), strip = document.querySelector('.strip'),
        heroBox = document.querySelector('.hero'), sheet = document.querySelector('.over-photo');
    if (mast && bar && strip && heroBox && sheet) {
      var root = document.documentElement, headH = 0;
      var h = function (el) { return el.getBoundingClientRect().height; };
      var follow = function () {
        // the page's top stays at the same spot in both modes, so this never flickers at the hand-over
        root.classList.toggle('free', sheet.getBoundingClientRect().top <= headH);
      };
      var measure = function () {
        var m = h(mast), n = h(bar), s = h(strip);
        headH = m + n + s;
        root.style.setProperty('--mast-h', m + 'px');
        root.style.setProperty('--nav-h', n + 'px');
        root.style.setProperty('--strip-h', s + 'px');
        root.style.setProperty('--hero-h', h(heroBox) + 'px');
        follow();
      };
      root.classList.add('dock');
      measure();
      window.addEventListener('scroll', follow, { passive: true });
      if (window.ResizeObserver) { var ro = new ResizeObserver(measure); [mast, bar, strip, heroBox].forEach(function (el) { ro.observe(el); }); }
      window.addEventListener('resize', measure);
    }
  }

  // Agencies page — our own map, in the site's look (Ben, Nov 20 2026).
  // Choose a state: the US map zooms into it. Inside a state you can zoom further (+/− buttons, double-click, pinch,
  // Ctrl/⌘ + scroll) and drag; interstates show first, then U.S. and state highways and more town names as you zoom in.
  // Work sites are map pins; a pin or list row opens a card. Directions only when a street address is on file.
  var atlas = document.querySelector('[data-agencies]');
  var dataEl = document.getElementById('agency-data');
  if (atlas && dataEl) {
    var DATA = JSON.parse(dataEl.textContent);
    var panel = document.getElementById('panel'), PANEL_START = panel.innerHTML;
    var svg = atlas.querySelector('svg.usmap'), pinsG = svg.querySelector('.pins');
    var card = atlas.querySelector('.site-card'), mapBox = atlas.querySelector('.map-box');
    // work sites: listed UNDER the map in columns, like the representatives on Legislation (Ben, Nov 22 2026); hovering a
    // row lights its pin, hovering a pin lights its row and shows its name; the chosen one is navy-marked
    var siteList = atlas.querySelector('.site-list'), tip = atlas.querySelector('.map-tip');
    var zmTitle = atlas.querySelector('.zm-title'), usTab = atlas.querySelector('[data-us]'), zmCtl = atlas.querySelector('.zm-ctl');
    var NS = 'http://www.w3.org/2000/svg';
    var HOME = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var dirUrl = function (s) { return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(s.address); };
    var casesFor = function (code) { return (DATA.cases || []).filter(function (c) { return c.unit === code && c.status !== 'Closed'; }); };
    var ICON = {
      dir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 20v-6a5 5 0 0 1 5-5h8"/><path d="m16 5 4 4-4 4"/></svg>',
      close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
    };
    var PIN = 'M0,0 C-1.6,-5 -8,-8.6 -8,-14.6 A8,8 0 1,1 8,-14.6 C8,-8.6 1.6,-5 0,0Z';
    var mk = function (tag, attrs, parent) { var el = document.createElementNS(NS, tag); for (var k in attrs) el.setAttribute(k, attrs[k]); if (parent) parent.appendChild(el); return el; };

    var current = null, vb = HOME.slice(), stateVB = null, anim = null, openSite = -1, roadsCache = {};
    var defs = mk('defs', {}, null), clip = mk('clipPath', { id: 'sel-clip' }, defs);
    svg.insertBefore(defs, svg.firstChild);
    var waterG = mk('g', { 'class': 'water' }), streetsG = mk('g', { 'class': 'streets' });
    var roadsG = mk('g', { 'class': 'roads', 'clip-path': 'url(#sel-clip)' }), selLine = null, labelsG = mk('g', { 'class': 'labels' });
    svg.insertBefore(waterG, pinsG); svg.insertBefore(streetsG, pinsG); svg.insertBefore(roadsG, pinsG); svg.insertBefore(labelsG, pinsG);
    var credit = atlas.querySelector('.map-credit'), streetsCache = {};

    // ---------- view box, zoom levels and everything that keeps a constant on-screen size
    var pxPerUnit = function () { return (svg.getBoundingClientRect().width || 800) / vb[2]; };
    var setVB = function (v) { vb = v; svg.setAttribute('viewBox', v.map(function (n) { return Math.round(n * 1000) / 1000; }).join(' ')); redraw(); };
    var zoomLevel = function () { return stateVB ? stateVB[2] / vb[2] : 0; };
    var redraw = function () {
      var k = 1 / pxPerUnit(), z = zoomLevel();
      svg.classList.toggle('z2', z >= 1.8); svg.classList.toggle('z3', z >= 3.2); svg.classList.toggle('z5', z >= 5);
      if (z >= 1.8) roadsG.removeAttribute('clip-path'); else roadsG.setAttribute('clip-path', 'url(#sel-clip)');
      var gu = current && current.code === 'GU';
      svg.classList.toggle('is-gu', !!gu);
      svg.classList.toggle('w14', !gu && vb[2] < 14); svg.classList.toggle('w6', !gu && vb[2] < 6); svg.classList.toggle('w2', !gu && vb[2] < 2.2);
      if (current && !gu && vb[2] < 14) loadStreets(current.code);
      if (credit) credit.hidden = !(gu || (vb[2] < 14 && streetsG.childNodes.length));
      var small = (svg.getBoundingClientRect().width || 800) < 520;      // phones: slightly smaller pins
      svg.querySelectorAll('.scl').forEach(function (g) { var kk = small && g.classList.contains('pin') ? k * 0.78 : k, rot = g.getAttribute('data-r'); g.setAttribute('transform', 'translate(' + g.getAttribute('data-x') + ',' + g.getAttribute('data-y') + ') scale(' + kk + ')' + (rot ? ' rotate(' + rot + ')' : '')); });
      place();
    };
    // ---------- no overlapping names: every town name takes a free spot beside its dot (right, left, above, below); with
    // none free it stays hidden until zooming in makes room. Bigger towns choose first; pins and shields keep their place.
    var ctx = document.createElement('canvas').getContext('2d'), SANS = getComputedStyle(document.body).fontFamily;
    var place = function () {
      if (!current || !labelsG.childNodes.length) return;
      var R = svg.getBoundingClientRect(), W = R.width, H = R.height, kx = W / vb[2], ky = H / vb[3], small = W < 520, taken = [], pinBoxes = [];
      var shown = function (g) { return g.style.display !== 'none' && getComputedStyle(g).display !== 'none'; };
      var at = function (g) { return [(g.getAttribute('data-x') - vb[0]) * kx, (g.getAttribute('data-y') - vb[1]) * ky]; };
      var near = function (p) { return p[0] > -90 && p[0] < W + 90 && p[1] > -30 && p[1] < H + 30; };
      var hits = function (b, list, m) { return list.some(function (q) { return b[0] < q[2] + m && b[2] > q[0] - m && b[1] < q[3] + m && b[3] > q[1] - m; }); };
      var q = small ? 0.78 : 1;
      [zmCtl, credit].forEach(function (el) { if (!el || el.hidden) return; var r = el.getBoundingClientRect(); if (r.width) taken.push([r.left - R.left, r.top - R.top, r.right - R.left, r.bottom - R.top]); });
      pinsG.querySelectorAll('.pin').forEach(function (g) { var p = at(g); if (near(p)) pinBoxes.push([p[0] - 7 * q, p[1] - 21 * q, p[0] + 7 * q, p[1]]); });
      labelsG.querySelectorAll('.shield').forEach(function (g) {
        g.style.visibility = ''; var p = at(g); if (!near(p) || !shown(g)) return;
        var w = g.classList.contains('sh3') ? 13.5 : 11, b = [p[0] - w, p[1] - 11, p[0] + w, p[1] + 13];
        if (hits(b, taken, 1) || hits(b, pinBoxes, -2)) { g.style.visibility = 'hidden'; return; }
        taken.push(b);
      });
      var list = [];
      labelsG.querySelectorAll('.city').forEach(function (g) {
        var p = at(g); if (!near(p) || !shown(g)) return;
        if (p[0] < 0 || p[0] > W || p[1] < 0 || p[1] > H) { g.style.visibility = 'hidden'; return; }   // its dot is off the map
        list.push({ g: g, p: p, tier: g.classList.contains('t1') ? 0 : g.classList.contains('t2') ? 1 : 2, out: g.classList.contains('out') ? 1 : 0 });
      });
      list.forEach(function (c, i) { c.i = i; });
      list.sort(function (a, b) { return a.tier - b.tier || a.out - b.out || a.i - b.i; });
      list.forEach(function (c) {
        var t = c.g.lastChild, w = t.__w;
        if (!w) { ctx.font = (c.tier ? '500 11px ' : '700 12px ') + SANS; w = t.__w = ctx.measureText(t.textContent).width + 1; }
        var x = c.p[0], y = c.p[1], dot = [x - 3, y - 3, x + 3, y + 3];
        var spots = [['start', 5, 4], ['end', -5, 4], ['middle', 0, -7], ['middle', 0, 15], ['start', 4, -5], ['start', 4, 13], ['end', -4, -5], ['end', -4, 13],
          ['middle', 0, -19], ['middle', 0, 26], ['start', 14, 4], ['end', -14, 4], ['start', 12, -14], ['end', -12, -14], ['start', 12, 22], ['end', -12, 22]].map(function (o) {
          var l = x + o[1] - (o[0] === 'end' ? w : o[0] === 'middle' ? w / 2 : 0), b = [l, y + o[2] - 10, l + w, y + o[2] + 3];
          return { o: o, b: b, was: t.__o === o.join(), inside: b[0] >= 1 && b[2] <= W - 1 && b[1] >= 1 && b[3] <= H - 1 };
        }).filter(function (sp) { return sp.inside && !hits(sp.b, taken, 1); }).sort(function (a, b) { return b.was - a.was; });   // keeps its spot while the map moves
        // free of pins too; only at the whole-state view may a major city share a little room with a pin rather than vanish
        spots.forEach(function (sp) { sp.pins = pinBoxes.filter(function (p) { return hits(sp.b, [p], 0); }).length; });
        var best = spots.filter(function (sp) { return !sp.pins; })[0] || (c.tier || zoomLevel() > 1.1 ? null : spots.sort(function (a, b) { return a.pins - b.pins; })[0]);
        c.g.style.visibility = best && !hits(dot, taken, 0) ? '' : 'hidden';
        if (c.g.style.visibility) return;
        t.__o = best.o.join(); t.setAttribute('text-anchor', best.o[0]); t.setAttribute('x', best.o[1]); t.setAttribute('y', best.o[2]);
        taken.push(best.b, dot);
      });
      // street names last: never across a town name, a shield or another street name
      var pts = [];
      if (svg.classList.contains('w6')) streetsG.querySelectorAll('.sname').forEach(function (g) {
        var p = at(g); if (!near(p)) return; g.style.visibility = ''; if (!shown(g)) return;
        var t = g.lastChild, w = t.__w;
        if (!w) { ctx.font = '600 10px ' + SANS; w = t.__w = ctx.measureText(t.textContent).width; }
        var r = (g.getAttribute('data-r') || 0) * Math.PI / 180, mine = [];
        for (var d = -w / 2; d <= w / 2; d += 6) mine.push([p[0] + Math.cos(r) * d, p[1] + Math.sin(r) * d]);
        var bad = mine.some(function (m) { return hits([m[0] - 4, m[1] - 4, m[0] + 4, m[1] + 4], taken, 0) || pts.some(function (o) { return Math.abs(o[0] - m[0]) < 9 && Math.abs(o[1] - m[1]) < 9; }); });
        if (bad) g.style.visibility = 'hidden'; else pts = pts.concat(mine);
      });
    };
    var animateTo = function (target, done) {
      cancelAnimationFrame(anim);
      var from = vb.slice(), t0 = null, reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      var step = function (ts) {
        if (t0 === null) t0 = ts;
        var p = reduce ? 1 : Math.min(1, (ts - t0) / 600), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        setVB(from.map(function (f, i) { return f + (target[i] - f) * e; }));
        if (p < 1) anim = requestAnimationFrame(step); else if (done) done();
      };
      anim = requestAnimationFrame(step);
    };
    var fitBox = function (b) {
      var w = b[2] - b[0], h = b[3] - b[1], pad = Math.max(w, h) * 0.1 + 6;
      w += pad * 2; h += pad * 2;
      var aspect = HOME[2] / HOME[3];
      if (w / h > aspect) h = w / aspect; else w = h * aspect;
      return [(b[0] + b[2]) / 2 - w / 2, (b[1] + b[3]) / 2 - h / 2, w, h];
    };
    // zoom by `f` around map point (cx, cy); stays inside the state's frame, from the whole state down to street level
    var clampVB = function (v) {
      var s = stateVB, minW = current && current.code === 'GU' ? s[2] / 12 : 0.35;
      var w = Math.max(minW, Math.min(s[2], v[2])), h = w * HOME[3] / HOME[2];
      var x = Math.max(s[0], Math.min(s[0] + s[2] - w, v[0])), y = Math.max(s[1], Math.min(s[1] + s[3] - h, v[1]));
      return [x, y, w, h];
    };
    var zoomAt = function (f, cx, cy, animate) {
      if (!stateVB) return;
      var w = vb[2] / f, h = vb[3] / f;
      var t = clampVB([cx - (cx - vb[0]) / f, cy - (cy - vb[1]) / f, w, h]);
      if (animate) animateTo(t); else setVB(t);
    };
    var toMap = function (clientX, clientY) {
      var r = svg.getBoundingClientRect();
      return [vb[0] + (clientX - r.left) / r.width * vb[2], vb[1] + (clientY - r.top) / r.height * vb[3]];
    };

    // ---------- roads, city names and interstate shields for the chosen state (site/map/<CODE>.json)
    var drawLayer = function (code, L) {
      roadsG.innerHTML = ''; labelsG.innerHTML = ''; waterG.innerHTML = '';
      if (!L || !current || current.code !== code) return;
      if (L.w) mk('path', { d: L.w, 'class': 'lake' }, waterG);
      mk('path', { d: L.st, 'class': 'rd st-hwy' }, roadsG);
      mk('path', { d: L.us, 'class': 'rd us-hwy' }, roadsG);
      mk('path', { d: L.i, 'class': 'rd inter' }, roadsG);
      L.cities.forEach(function (c) {
        var tier = c[3] <= 5 ? 't1' : c[3] <= 7 ? 't2' : 't3';
        var g = mk('g', { 'class': 'scl city ' + tier + (c[4] ? ' out' : ''), 'data-x': c[0], 'data-y': c[1] }, labelsG);
        mk('circle', { r: 2.6 }, g);
        var t = mk('text', { x: 5, y: 4 }, g); t.textContent = c[2];
      });
      L.shields.forEach(function (s) {
        var big = s[2].length >= 3, w = big ? 13.5 : 11;   // half-width
        var g = mk('g', { 'class': 'scl shield ' + (big ? 'sh3' : 'sh2') + (s[3] ? ' out' : ''), 'data-x': s[0], 'data-y': s[1] }, labelsG);
        var crown = 'M' + (-w) + ',-9 C' + (-w * .6) + ',-11.5 ' + (-w * .25) + ',-11.5 0,-9.2 C' + (w * .25) + ',-11.5 ' + (w * .6) + ',-11.5 ' + w + ',-9';
        mk('path', { 'class': 'sh-body', d: crown + ' L' + w + ',-1 C' + w + ',6 ' + (w * .55) + ',10 0,13 C' + (-w * .55) + ',10 ' + (-w) + ',6 ' + (-w) + ',-1 Z' }, g);
        mk('path', { 'class': 'sh-band', d: crown + ' L' + w + ',-4.2 L' + (-w) + ',-4.2 Z' }, g);
        var t = mk('text', { x: 0, y: 6.2 }, g); t.textContent = s[2];
      });
      redraw();
    };
    var loadLayer = function (code) {
      if (roadsCache[code]) { drawLayer(code, roadsCache[code]); return; }
      fetch('/map/' + code + '.json').then(function (r) { return r.ok ? r.json() : null; })
        .then(function (L) { if (L) { roadsCache[code] = L; drawLayer(code, L); } }).catch(function () {});
    };

    var drawStreets = function (code, S) {
      streetsG.innerHTML = '';
      if (!S || !current || current.code !== code) return;
      [['t', 'st-t'], ['s', 'st-s'], ['p', 'st-p'], ['m', 'st-m']].forEach(function (c) { if (S[c[0]]) mk('path', { d: S[c[0]], 'class': 'str ' + c[1] }, streetsG); });
      (S.names || []).forEach(function (n) {
        var g = mk('g', { 'class': 'scl sname ' + n[4], 'data-x': n[0], 'data-y': n[1], 'data-r': n[2] }, streetsG);
        var t = mk('text', { x: 0, y: 3.5 }, g); t.textContent = n[3];
      });
      redraw();
    };
    var loadStreets = function (code) {
      if (streetsCache[code] === 'loading') return;
      if (streetsCache[code]) { if (!streetsG.childNodes.length) drawStreets(code, streetsCache[code]); return; }
      streetsCache[code] = 'loading';
      fetch('/map/streets/' + code + '.json').then(function (r) { return r.ok ? r.json() : null; })
        .then(function (S) { streetsCache[code] = S || {}; drawStreets(code, S); }).catch(function () { streetsCache[code] = {}; });
    };

    // ---------- pins
    var drawPins = function (u) {
      pinsG.innerHTML = '';
      u.sites.forEach(function (s, i) {
        if (s.x == null) return;
        var g = mk('g', { 'class': 'scl pin', 'data-site': i, 'data-x': s.x, 'data-y': s.y, tabindex: '0', role: 'button', 'aria-label': s.name + (s.place ? ', ' + s.place : '') }, pinsG);
        mk('circle', { 'class': 'hit', cx: 0, cy: -13, r: 14 }, g);
        mk('path', { d: PIN }, g);
        mk('circle', { 'class': 'dot', cx: 0, cy: -14.6, r: 3.1 }, g);
      });
      redraw();
    };

    // ---------- the facility card
    var closeCard = function () {
      card.hidden = true; openSite = -1;
      pinsG.querySelectorAll('.pin').forEach(function (p) { p.classList.remove('sel'); });
      siteList.querySelectorAll('li[data-site]').forEach(function (li) { li.classList.remove('sel'); });
    };
    var branchName = function (s) { return s.branch === 'Air' ? 'Air National Guard' : 'Army National Guard'; };
    var openCard = function (i, fromList) {
      var s = current && current.sites[i];
      if (!s) return;
      openSite = i;
      card.innerHTML =
        '<div class="sc-code">' + esc(current.code) + ' · ' + esc(current.code === 'ARNG' ? 'Army National Guard' : branchName(s)) + '</div>' +
        '<h3 id="site-card-title">' + esc(s.name) + '</h3>' +
        (s.place ? '<p class="sc-place">' + esc(s.place) + '</p>' : '') +
        (s.address ? '<p class="sc-addr">' + esc(s.address) + '</p>' : '<p class="sc-addr muted">No street address on file.</p>') +
        '<div class="sc-acts">' +
        (s.address ? '<a class="btn icon" href="' + dirUrl(s) + '" target="_blank" rel="noopener" title="Directions"><span class="ico">' + ICON.dir + '</span><span class="lbl">Directions</span></a>' : '') +
        '<button type="button" class="btn alt icon sc-close" title="Close"><span class="ico">' + ICON.close + '</span><span class="lbl">Close</span></button></div>';
      card.hidden = false;
      var pin = pinsG.querySelector('.pin[data-site="' + i + '"]');
      pinsG.querySelectorAll('.pin').forEach(function (p) { p.classList.toggle('sel', p === pin); });
      if (pin) pinsG.appendChild(pin);
      siteList.querySelectorAll('li[data-site]').forEach(function (li) { li.classList.toggle('sel', +li.getAttribute('data-site') === i); });
      tip.hidden = true;
      // from the list: bring the site into view if it is off the map's current frame
      if (fromList && s.x != null && (s.x < vb[0] || s.x > vb[0] + vb[2] || s.y < vb[1] || s.y > vb[1] + vb[3])) setVB(clampVB([s.x - vb[2] / 2, s.y - vb[3] / 2, vb[2], vb[3]]));
      placeCard(pin);
      if (fromList || window.innerWidth <= 640) mapBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    var placeCard = function (pin) {
      if (card.hidden) return;
      if (window.innerWidth > 640 && pin) {
        var box = mapBox.getBoundingClientRect(), pr = pin.getBoundingClientRect();
        var cw = card.offsetWidth, ch = card.offsetHeight;
        var x = pr.right - box.left + 12, y = pr.top - box.top + pr.height / 2 - ch / 2;
        if (x + cw > box.width - 8) x = pr.left - box.left - cw - 12;
        card.style.left = Math.max(8, x) + 'px';
        card.style.top = Math.max(8, Math.min(box.height - ch - 8, y)) + 'px';
      } else { card.style.left = ''; card.style.top = ''; }
    };

    // ---------- the side panel
    // a long name or address breaks only between its phrases (after a comma, before a parenthesis, after "National Guard")
    var phrases = function (t) { return String(t).replace(/(Army|Air) National Guard /g, '$&\n').replace(/, /g, ',\n').replace(/ \(/g, '\n(').split('\n').map(function (x) { return '<i class="ph">' + esc(x.trim()) + '</i>'; }).join(' '); };
    var siteRow = function (s, i) {
      // under the name: the street address in two set lines — street / city, state zip (Ben, Nov 22 2026: "put the actual
      // street address there underneath each one"); no address on file → the town
      // split before the city: "PO Box 105103, BLDG 7727, S. Loop Access Rd." / "Fort Irwin, CA 92310-5103"
      var parts = s.address ? s.address.split(', ') : [];
      var lines = parts.length >= 3 ? [parts.slice(0, -2).join(', '), parts.slice(-2).join(', ')] : parts.length ? (parts.length === 2 ? parts : [s.address]) : (s.place ? [s.place] : []);
      return '<li data-site="' + i + '"><button type="button" class="site-pick" data-site="' + i + '"><b>' + phrases(s.name) + '</b>' + lines.map(function (l) { return '<span>' + phrases(l) + '</span>'; }).join('') + '</button>' +
        // Directions: the small icon-only turn-arrow button, as on the site card (only when a street address is on file)
        (s.address ? '<a class="btn alt sm icon go" href="' + dirUrl(s) + '" target="_blank" rel="noopener" title="Directions"><span class="ico">' + ICON.dir + '</span><span class="lbl">Directions</span></a>' : '') + '</li>';
    };
    var render = function (u) {
      var sites = u.sites || [], open = casesFor(u.code);
      // each person in two lines (name · title / phone · email) so the panel stays within the map's height; past four
      // people the rest fold under "More Representatives (N)", as Legislation folds committees (Nov 22 2026)
      var person = function (r) {
        var tel = r.phone ? '<a href="tel:+1' + r.phone.replace(/\s*ext\.?\s*/i, ',').replace(/[^\d,]/g, '') + '">' + esc(r.phone) + '</a>' : '';
        var mail = r.email ? '<a href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a>' : '';
        return '<li><div class="rp-h"><b>' + esc(r.name) + '</b>' + (r.role ? '<span>' + esc(r.role) + '</span>' : '') + '</div>' +
          (tel || mail ? '<div class="rp-c">' + [tel, mail].filter(Boolean).join('<i aria-hidden="true">&middot;</i>') + '</div>' : '') + '</li>';
      };
      var first = u.reps.slice(0, 4).map(person).join(''), rest = u.reps.slice(4).map(person).join('');
      var more = rest ? '<details class="rp-more"><summary>More Representatives (' + (u.reps.length - 4) + ')</summary><ul class="plist rplist">' + rest + '</ul></details>' : '';
      // states with both Army and Air sites: separate lists under their own headings (Ben, Nov 20 2026)
      var army = [], air = [];
      sites.forEach(function (s, i) { (s.branch === 'Air' ? air : army).push(siteRow(s, i)); });
      var group = function (name, rows) { return rows.length ? '<h4 class="rhead">' + esc(u.code === 'ARNG' ? u.line1 + ' ' + u.line2 : u.line1 + ' ' + name) + ' &middot; ' + rows.length + (rows.length === 1 ? ' Work Site' : ' Work Sites') + '</h4><ul>' + rows.join('') + '</ul>' : ''; };
      siteList.innerHTML = group('Army National Guard', army) + group('Air National Guard', air);
      siteList.hidden = !sites.length;
      panel.innerHTML =
        '<div class="panel-head"><img src="' + esc(u.seal) + '" alt=""><div><div class="code">' + esc(u.code) + '</div><h2><span>' + esc(u.line1) + '</span><span>' + esc(u.line2) + '</span></h2></div></div>' +
        (u.full ? '<p class="panel-note">' + esc(u.full) + '</p>' : '') +
        '<div class="tiles"><div class="tile"><b>' + sites.length + '</b><span>Work Sites</span></div><div class="tile"><b>' + u.reps.length + '</b><span>Contacts</span></div><div class="tile"><b>' + open.length + '</b><span>Open Cases</span></div></div>' +
        '<div class="panel-sec"><h3>Union Contract</h3><a class="contract-link" href="' + esc(u.contract) + '"><b>Collective Bargaining Agreement</b><span>Read &rsaquo;</span></a></div>' +
        '<div class="panel-sec"><h3>Your Representatives</h3><ul class="plist rplist">' + first + '</ul>' + more + '</div>' +
        (sites.length ? '' : '<p class="panel-note">No work sites on file for this unit yet.</p>');
    };

    var select = function (code, fromClick) {
      var u = DATA.units.filter(function (x) { return x.code === code; })[0];
      if (!u) return;
      current = u; closeCard();
      render(u);
      atlas.querySelectorAll('[data-unit]').forEach(function (el) {
        var on = el.getAttribute('data-unit') === code;
        if (el.tagName === 'A') { if (on) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current'); }
        else el.classList.toggle('sel', on);
      });
      // chosen state: its fill under the roads, its outline over them
      if (selLine) { selLine.remove(); selLine = null; }
      var shapes = svg.querySelectorAll('[data-unit="' + code + '"]');
      shapes.forEach(function (el) { svg.insertBefore(el, waterG); });   // its fill sits under the lakes and roads
      selLine = mk('g', { 'class': 'sel-line' });
      clip.innerHTML = '';
      shapes.forEach(function (el) { (el.tagName === 'path' ? [el] : [].slice.call(el.querySelectorAll('path'))).forEach(function (p) { mk('path', { d: p.getAttribute('d') }, selLine); mk('path', { d: p.getAttribute('d') }, clip); }); });
      svg.insertBefore(selLine, labelsG);
      roadsG.innerHTML = ''; labelsG.innerHTML = ''; pinsG.innerHTML = ''; waterG.innerHTML = ''; streetsG.innerHTML = '';
      stateVB = fitBox(u.box);
      svg.classList.add('zoomed'); mapBox.classList.add('zoomed');
      animateTo(stateVB, function () { drawPins(u); loadLayer(code); });
      zmTitle.textContent = u.line1 + ' · ' + u.sites.length + (u.sites.length === 1 ? ' Work Site' : ' Work Sites');
      if (usTab) usTab.removeAttribute('aria-current'); zmCtl.hidden = false;
      if (fromClick && history.replaceState) history.replaceState(null, '', '#' + code);
    };
    var showUS = function () {
      closeCard(); pinsG.innerHTML = ''; roadsG.innerHTML = ''; labelsG.innerHTML = ''; waterG.innerHTML = ''; streetsG.innerHTML = ''; if (credit) credit.hidden = true;
      if (selLine) { selLine.remove(); selLine = null; }
      current = null; stateVB = null;
      svg.classList.remove('zoomed', 'z2', 'z3', 'z5'); mapBox.classList.remove('zoomed');
      atlas.querySelectorAll('[data-unit]').forEach(function (el) { el.classList.remove('sel'); if (el.tagName === 'A') el.removeAttribute('aria-current'); });
      animateTo(HOME);
      panel.innerHTML = PANEL_START; siteList.hidden = true; siteList.innerHTML = ''; tip.hidden = true;
      zmTitle.textContent = 'All Units'; if (usTab) usTab.setAttribute('aria-current', 'true'); zmCtl.hidden = true;
      if (history.replaceState) history.replaceState(null, '', location.pathname);
    };

    // ---------- pointer: drag to move, two fingers to pinch, taps still work
    var pointers = {}, drag = null, moved = false;
    svg.addEventListener('pointerdown', function (e) {
      if (!stateVB) return;
      pointers[e.pointerId] = [e.clientX, e.clientY];
      var ids = Object.keys(pointers);
      if (ids.length === 1) { drag = { x: e.clientX, y: e.clientY, vb: vb.slice() }; moved = false; }
      else if (ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        drag = { pinch: Math.hypot(a[0] - b[0], a[1] - b[1]), vb: vb.slice(), mid: toMap((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) };
        moved = true;
      }
    });
    svg.addEventListener('pointermove', function (e) {
      if (!drag || !pointers[e.pointerId]) return;
      pointers[e.pointerId] = [e.clientX, e.clientY];
      var ids = Object.keys(pointers), r = svg.getBoundingClientRect();
      if (drag.pinch && ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]], f = Math.hypot(a[0] - b[0], a[1] - b[1]) / drag.pinch;
        var w = drag.vb[2] / f, h = drag.vb[3] / f, m = drag.mid;
        setVB(clampVB([m[0] - (m[0] - drag.vb[0]) / f, m[1] - (m[1] - drag.vb[1]) / f, w, h]));
      } else if (!drag.pinch) {
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!moved && Math.hypot(dx, dy) < 5) return;
        if (!moved) { moved = true; try { svg.setPointerCapture(e.pointerId); } catch (x) {} }
        setVB(clampVB([drag.vb[0] - dx / r.width * drag.vb[2], drag.vb[1] - dy / r.height * drag.vb[3], drag.vb[2], drag.vb[3]]));
        if (!card.hidden) placeCard(pinsG.querySelector('.pin.sel'));
      }
    });
    var lift = function (e) { delete pointers[e.pointerId]; if (!Object.keys(pointers).length) drag = null; else if (drag && drag.pinch) drag = null; };
    svg.addEventListener('pointerup', lift); svg.addEventListener('pointercancel', lift);
    svg.addEventListener('wheel', function (e) {
      if (!stateVB || !(e.ctrlKey || e.metaKey)) return;              // Ctrl/⌘ + scroll, or a trackpad pinch
      e.preventDefault();
      var p = toMap(e.clientX, e.clientY);
      zoomAt(Math.exp(-e.deltaY * 0.0025), p[0], p[1], false);
      if (!card.hidden) placeCard(pinsG.querySelector('.pin.sel'));
    }, { passive: false });
    svg.addEventListener('dblclick', function (e) {
      if (!stateVB) return;
      e.preventDefault();
      var p = toMap(e.clientX, e.clientY);
      zoomAt(e.shiftKey ? 0.5 : 2, p[0], p[1], true);
    });

    // ---------- clicks and keys
    atlas.addEventListener('click', function (e) {
      if (moved) { moved = false; if (e.target.closest('svg')) return; }   // the end of a drag is not a click
      if (e.target.closest('[data-us]')) { e.preventDefault(); if (current) showUS(); return; }
      if (e.target.closest('.zm-in')) { e.preventDefault(); zoomAt(1.8, vb[0] + vb[2] / 2, vb[1] + vb[3] / 2, true); closeCard(); return; }
      if (e.target.closest('.zm-out')) { e.preventDefault(); zoomAt(1 / 1.8, vb[0] + vb[2] / 2, vb[1] + vb[3] / 2, true); closeCard(); return; }
      if (e.target.closest('.sc-close')) { closeCard(); return; }
      if (e.target.closest('.site-card')) return;
      var pin = e.target.closest('.pin');
      if (pin) { openCard(+pin.getAttribute('data-site'), false); return; }
      var pick = e.target.closest('.site-pick');
      if (pick) { openCard(+pick.getAttribute('data-site'), true); return; }
      var hit = e.target.closest('[data-hit]');   // a fingertip just beside a small state on the US map
      if (hit) { select(hit.getAttribute('data-hit'), true); return; }
      var t = e.target.closest('[data-unit]');
      if (t) {
        e.preventDefault();
        if (current && t.getAttribute('data-unit') === current.code && t.tagName !== 'A') { closeCard(); return; }
        select(t.getAttribute('data-unit'), true); return;
      }
      if (e.target.closest('.map-box')) {
        if (!card.hidden) closeCard();
        else if (current && (e.target === svg || e.target === mapBox)) showUS();
      }
    });
    atlas.addEventListener('keydown', function (e) {
      if ((e.key === '+' || e.key === '=') && stateVB) { zoomAt(1.8, vb[0] + vb[2] / 2, vb[1] + vb[3] / 2, true); return; }
      if (e.key === '-' && stateVB) { zoomAt(1 / 1.8, vb[0] + vb[2] / 2, vb[1] + vb[3] / 2, true); return; }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var pin = e.target.closest('.pin');
      if (pin) { e.preventDefault(); openCard(+pin.getAttribute('data-site'), false); return; }
      var t = e.target.closest('svg [data-unit]');
      if (t) { e.preventDefault(); select(t.getAttribute('data-unit'), true); }
    });
    // ---------- hover: a row lights its pin; a pin lights its row and shows its name (as on the Legislation map)
    var hoverSite = function (i, on, raise) {   // raise: bring the pin to the front (from the list only — never under the mouse)
      var pin = pinsG.querySelector('.pin[data-site="' + i + '"]'), li = siteList.querySelector('li[data-site="' + i + '"]');
      if (pin) { pin.classList.toggle('hov', on); if (on && raise && !pin.classList.contains('sel')) pinsG.appendChild(pin); }
      if (li) li.classList.toggle('hov', on);
    };
    var showTip = function (i, e) {
      var s = current && current.sites[i]; if (!s || drag) return;
      var r = mapBox.getBoundingClientRect();
      tip.innerHTML = '<b>' + esc(s.name) + '</b>' + (s.place ? ' &middot; ' + esc(s.place) : '');
      tip.hidden = false;
      var x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
      if (x + tip.offsetWidth > r.width - 6) x = e.clientX - r.left - tip.offsetWidth - 10;
      if (y + tip.offsetHeight > r.height - 6) y = e.clientY - r.top - tip.offsetHeight - 10;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    };
    pinsG.addEventListener('mouseover', function (e) { var p = e.target.closest('.pin'); if (p) hoverSite(p.getAttribute('data-site'), true); });
    pinsG.addEventListener('mouseout', function (e) { var p = e.target.closest('.pin'); if (p) { hoverSite(p.getAttribute('data-site'), false); tip.hidden = true; } });
    pinsG.addEventListener('mousemove', function (e) { var p = e.target.closest('.pin'); if (p && card.hidden) showTip(p.getAttribute('data-site'), e); });
    siteList.addEventListener('mouseover', function (e) { var li = e.target.closest('li[data-site]'); if (li) hoverSite(li.getAttribute('data-site'), true, true); });
    siteList.addEventListener('mouseout', function (e) { var li = e.target.closest('li[data-site]'); if (li) hoverSite(li.getAttribute('data-site'), false); });

    // Esc anywhere on the page: closes the card first, then returns to the full map
    document.addEventListener('keydown', function (e) { if (e.key !== 'Escape') return; if (!card.hidden) closeCard(); else if (current) showUS(); });
    window.addEventListener('resize', function () { redraw(); if (openSite >= 0) placeCard(pinsG.querySelector('.pin.sel')); });
    if (location.hash) select(location.hash.slice(1).toUpperCase(), false);
  }

  // Contact directory: tabs, one agency shown at a time. #LA (or #dir-LA) in the address opens that agency.
  var dir = document.querySelector('[data-dir]');
  if (dir) {
    var tabs = [].slice.call(dir.querySelectorAll('[role="tab"]'));
    var showTab = function (code, focus) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-code') === code;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById('dir-' + t.getAttribute('data-code')).hidden = !on;
        if (on && focus) t.focus();
      });
    };
    dir.classList.add('js');
    dir.addEventListener('click', function (e) {
      var t = e.target.closest('[role="tab"]');
      if (!t) return;
      showTab(t.getAttribute('data-code'));
      if (history.replaceState) history.replaceState(null, '', '#' + t.getAttribute('data-code'));
    });
    dir.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      showTab(n.getAttribute('data-code'), true);
    });
    var want = (location.hash || '').replace(/^#(dir-)?/, '').toUpperCase();
    showTab(tabs.some(function (t) { return t.getAttribute('data-code') === want; }) ? want : tabs[0].getAttribute('data-code'));
    if (want && tabs.some(function (t) { return t.getAttribute('data-code') === want; })) dir.scrollIntoView({ block: 'start' });
  }

  // Home videos: the YouTube player loads only when someone presses play
  document.querySelectorAll('.vid[data-yt] button').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.closest('.vid'), id = f.getAttribute('data-yt');
      var ifr = document.createElement('iframe');
      ifr.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      ifr.title = b.getAttribute('aria-label').replace(/^Play: /, '');
      ifr.allow = 'autoplay; encrypted-media; picture-in-picture'; ifr.allowFullscreen = true;
      b.replaceWith(ifr);
    });
  });

  // Resources: type to filter every document and link; sections and cards with no match hide
  var rq = document.getElementById('rq');
  if (rq && rq.tagName === 'INPUT') {   // (the Representation Request form is also #rq — not this)
    var rcount = document.querySelector('.rcount'), rnone = document.querySelector('.rnone');
    var total = document.querySelectorAll('.ritem').length;
    var norm = function (s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };
    // words in quotes (straight or a phone's curly ones) are an exact phrase, whole words only (Ben, Nov 24 2026)
    var termsOf = function (v) {
      var out = [], m, re = /"([^"]*)(?:"|$)|([^\s"]+)/g;
      v = v.replace(/[\u201c\u201d\u201e\u201f\u2033]/g, '"');
      while ((m = re.exec(v))) { if (m[1] !== undefined) { if (norm(m[1])) out.push(' ' + norm(m[1]) + ' '); } else norm(m[2]).split(' ').forEach(function (w) { if (w) out.push(w); }); }
      return out;
    };
    rq.addEventListener('input', function () {
      var words = termsOf(rq.value), shown = 0;
      document.querySelectorAll('.rrow').forEach(function (card) {
        var title = norm(card.querySelector('h3').textContent), any = 0;
        card.querySelectorAll('.ritem').forEach(function (li) {
          var part = li.closest('.rpart'), head = part && part.querySelector('.rhead');   // a part's heading ("Department of Labor Audits") counts too
          var t = ' ' + [title, head ? norm(head.textContent) : '', norm(li.textContent), norm(li.querySelector('a') ? li.querySelector('a').getAttribute('href') : '')].join(' | ') + ' ';   // a phrase never runs from one part into the next
          var ok = words.every(function (w) { return t.indexOf(w) >= 0; });
          li.hidden = !ok; if (ok) { any++; shown++; }
        });
        card.querySelectorAll('.rblock').forEach(function (b) { var p = b.querySelector('.ritem.p'); if (p && b.querySelector('.ritem.k:not([hidden]),.ritem.k2:not([hidden])')) p.hidden = false; });   // keep a match's heading
        card.querySelectorAll('.rblock,.rpart').forEach(function (b) { b.hidden = !b.querySelector('.ritem:not([hidden])'); });
        card.hidden = words.length > 0 && !any;
      });
      document.querySelectorAll('.rsec').forEach(function (s) { s.hidden = !s.querySelector('.rrow:not([hidden])'); });
      rcount.textContent = words.length ? shown + ' of ' + total + ' match' : total + ' documents and links';
      rnone.hidden = shown > 0 || !words.length;
    });
  }

  // Resources menu: the section being read is the bold one (Ben, Nov 24 2026); a section just picked stays marked until the reader scrolls
  var rtabs = document.querySelector('.rtabs');
  if (rtabs) {
    var rLinks = [].slice.call(rtabs.querySelectorAll('a')), picked = null, rTick = 0;
    var rMark = function () {
      rTick = 0;
      var line = rtabs.getBoundingClientRect().bottom + 60, now = null, shown = [];
      rLinks.forEach(function (a) { var s = document.getElementById(a.getAttribute('href').slice(1)); if (s && !s.hidden) { shown.push(a); if (s.getBoundingClientRect().top <= line) now = a; } });
      if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 2 && shown.length && window.pageYOffset > 0) now = shown[shown.length - 1];
      now = picked || now || shown[0];
      rLinks.forEach(function (a) { if (a === now) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      if (now && rtabs.scrollWidth > rtabs.clientWidth) {   // on a phone the marked word stays in view
        var l = now.offsetLeft - rtabs.offsetLeft, r = l + now.offsetWidth;
        if (l < rtabs.scrollLeft + 16) rtabs.scrollLeft = l - 16; else if (r > rtabs.scrollLeft + rtabs.clientWidth - 16) rtabs.scrollLeft = r - rtabs.clientWidth + 16;
      }
    };
    var rSoon = function () { if (!rTick) rTick = requestAnimationFrame(rMark); };
    rtabs.addEventListener('click', function (e) { var a = e.target.closest('a'); if (a) { picked = a; rMark(); } });
    ['wheel', 'touchmove', 'keydown', 'mousedown'].forEach(function (n) { window.addEventListener(n, function (e) { if (picked && !(e.target.nodeType && rtabs.contains(e.target))) { picked = null; rSoon(); } }, { passive: true }); });
    window.addEventListener('scroll', rSoon, { passive: true });
    window.addEventListener('resize', rSoon);
    if (rq) rq.addEventListener('input', function () { picked = null; rSoon(); });
    rMark();
  }

  // News page: All Stories / From Local 1776 / Elsewhere
  var nTabs = document.querySelector('.news-tabs');
  if (nTabs) nTabs.addEventListener('click', function (e) {
    var a = e.target.closest('[data-news]'); if (!a) return;
    e.preventDefault();
    var k = a.getAttribute('data-news');
    nTabs.querySelectorAll('[data-news]').forEach(function (t) { if (t === a) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
    document.querySelectorAll('.nrow').forEach(function (r) { r.hidden = k !== 'all' && !r.classList.contains(k); });
    document.querySelectorAll('.nyear').forEach(function (y) { y.hidden = !y.querySelector('.nrow:not([hidden])'); });
  });

  // Forms post to the Local 1776 form receiver (Firebase). Until it is connected, say so plainly.
  var ENDPOINT = window.L1776_FORMS_URL || '';
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var msg = form.querySelector('.form-msg');
    var btn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.className = 'form-msg';
      var bad = Array.prototype.find.call(form.elements, function (el) { return el.required && !el.closest('[hidden]') && (el.type === 'checkbox' ? !el.checked : !el.value.trim()); });
      if (bad) { msg.textContent = 'Please fill in every field marked *.'; msg.classList.add('err'); bad.focus(); return; }
      var email = form.querySelector('input[type="email"]');
      if (email && email.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) {
        msg.textContent = 'Please check the email address.'; msg.classList.add('err'); email.focus(); return;
      }
      if ((window.L1776_FORMS_ON || []).indexOf(form.dataset.form) < 0) return;   // a form that is switched off never posts
      if (!ENDPOINT) { msg.textContent = 'Preview only: this form is not connected yet.'; msg.classList.add('err'); return; }
      var data = {};
      form.dispatchEvent(new Event('collect'));   // a page script can fill hidden fields first (the uniform items)
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.name.charAt(0) === '_' || (el.type === 'radio' && !el.checked)) return;   // "_name" = page helper, not sent
        data[el.name] = el.type === 'checkbox' ? el.checked : el.value;
      });
      btn.disabled = true; msg.textContent = 'Sending…';
      fetch(ENDPOINT + '/' + form.dataset.form, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        // the app answers {ok, id?} or {ok:false, error}; 429 = its limit (5 an hour from one connection)
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { if (!r.ok) { var x = new Error(r.status); x.body = b; throw x; } return b; }); })
        // the request number, exactly as the app sends it, kept on one line (its hyphens would break on a phone); Contact Us has none
        .then(function (b) { form.reset(); msg.textContent = (form.dataset.ok || 'Thank you. We received your message and will get back to you as soon as possible.') + (b && b.id ? ' Your request number is ' : ''); if (b && b.id) { var no = document.createElement('b'); no.className = 'req-no'; no.textContent = b.id + '.'; msg.appendChild(no); } msg.classList.add('ok'); })
        .catch(function (e) {
          var said = e && e.message === '400' && e.body && typeof e.body.error === 'string' ? e.body.error : '';   // the app's own "Please fill in …" line
          msg.textContent = e && e.message === '429'
            ? 'Too many requests have been sent from your connection. Please wait an hour and try again, or email contact_us@local1776.org.'
            : said || 'Sorry, your message did not go through. Please try again, or email contact_us@local1776.org.';
          msg.classList.add('err');
        })
        .then(function () { btn.disabled = false; });
    });
  });
})();
