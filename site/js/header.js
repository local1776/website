// LIUNA Local 1776 — the header on every page (Ben, Nov 22 2026):
//  1. the rotating line between the logo and the buttons: Know Your Rights facts taking turns with the newest news
//     (computers and sideways tablets only). It changes every 8 seconds with a fade — never scrolls. The title row stays
//     put, with back / pause / forward at its right (Ben, Nov 22 2026); the text sits under it. It also holds still while
//     the mouse is on it, while someone is typing in a form or search is open, and for people who ask their device for
//     less motion. Clicking the text opens the fact's page or the story.
//  2. site search: the magnifying glass at the right end of the menu bar. Everything happens in the browser from
//     /data/search.json (made at build); nothing typed is sent anywhere. Forgives small typos and knows everyday words.
// No framework.
(function () {
  'use strict';
  var finder = document.getElementById('find');

  // ---------------------------------------------------------------- on the home screen, as an app
  // No browser means no Back button, so a PDF opened by itself is a dead end (Ben, Nov 24 2026): every PDF link on every page
  // opens in our own reader (/document), which keeps the header, the menu and a Back button. In a browser nothing changes.
  var asApp = navigator.standalone === true || !!(window.matchMedia && ['standalone', 'fullscreen', 'minimal-ui'].some(function (m) { return matchMedia('(display-mode: ' + m + ')').matches; }));
  window.L1776_AS_APP = asApp;
  if (asApp) document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.origin !== location.origin || !/\.pdf$/i.test(a.pathname)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    // the document's name: the link's own words; an icon button has none, so its handout's title or the page's
    var ho = a.closest('.ho'), t = a.matches('.btn,.ho-dl') ? '' : a.textContent.trim(); if (/signed pdf|full document/i.test(t)) t = '';
    if (!t) t = ((ho && ho.querySelector('h3,h4,b')) || document.querySelector('h1') || {}).textContent || '';
    try { sessionStorage.setItem('l1776-doc', JSON.stringify({ f: a.pathname, t: t.replace(/\s+/g, ' ').trim().slice(0, 120) })); } catch (x) {}
    location.href = '/document?f=' + encodeURIComponent(a.pathname);
  }, true);

  // iPhone home screen: pull the page down from the top to refresh it (Ben, Nov 24 2026). Android's own pull already works.
  // Never over a zoomed map, a window or a list that is scrolled, and never once something has been typed in a form.
  if (navigator.standalone === true) (function () {
    var tip = document.createElement('div'), sx = 0, sy = 0, pull = 0, on = false, typed = false, NEED = 64;
    tip.className = 'ptr'; tip.setAttribute('aria-hidden', 'true');
    tip.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 3.5V8h-4.5"/></svg>';
    document.body.appendChild(tip);
    document.addEventListener('input', function (e) { if (e.target.type !== 'search' && e.target.closest('main')) typed = true; });
    var blocked = function (el) {
      if (typed || (finder && !finder.hidden) || document.querySelector('dialog[open],[aria-modal="true"]:not([hidden])') || /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return true;
      for (; el && el !== document.body && el.nodeType === 1; el = el.parentNode) {
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.scrollTop > 0) return true;
        var c = getComputedStyle(el); if (c.touchAction === 'none') return true;
      }
      return false;
    };
    var draw = function () { tip.style.transform = 'translate(-50%,' + (pull - 48) + 'px) rotate(' + pull * 3 + 'deg)'; tip.style.opacity = Math.min(1, pull / 40); tip.classList.toggle('set', pull >= NEED); };
    var end = function () { on = false; pull = 0; tip.classList.remove('set'); tip.style.transform = ''; tip.style.opacity = ''; };
    document.addEventListener('touchstart', function (e) { on = e.touches.length === 1 && window.scrollY <= 0 && !blocked(e.target); if (on) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; pull = 0; } }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!on) return;
      var dx = Math.abs(e.touches[0].clientX - sx), dy = e.touches[0].clientY - sy;
      if (e.touches.length > 1 || window.scrollY > 0 || (pull === 0 && (dy < 0 || dx > dy + 4))) { end(); return; }
      pull = Math.max(0, Math.min(84, dy * 0.5)); draw();
    }, { passive: true });
    document.addEventListener('touchend', function () { if (!on) return; if (pull >= NEED) { on = false; tip.classList.add('spin'); location.reload(); } else end(); });
    document.addEventListener('touchcancel', end);
  })();

  // ---------------------------------------------------------------- the rotating line
  var hl = document.querySelector('.hline');
  if (hl && window.fetch) {
    fetch('/data/header-line.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (d && d.items && d.items.length) startLine(d.items);
    }).catch(function () {});
  }
  function startLine(items) {
    var a = hl.querySelector('.hl-item'), k = hl.querySelector('.hl-k'), t = hl.querySelector('.hl-t'), pb = hl.querySelector('.hl-p');
    var i = 0, hover = false, held = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches), last = Date.now();
    var PAUSE = pb.innerHTML, PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>';
    var setP = function () { pb.innerHTML = held ? PLAY : PAUSE; pb.setAttribute('aria-label', held ? 'Play' : 'Pause'); pb.title = held ? 'Play' : 'Pause'; };
    var show = function (n) {
      var it = items[n];
      k.textContent = it.k;
      if (it.d) {   // the day it was published, beside the title
        var d = document.createElement('span'); d.className = 'hl-d'; d.textContent = it.d;
        k.appendChild(document.createTextNode(' ')); k.appendChild(d);
      }
      t.textContent = it.t; a.href = it.u;
      if (it.ext) { a.target = '_blank'; a.rel = 'noopener'; } else { a.removeAttribute('target'); a.removeAttribute('rel'); }
    };
    var busy = function () {
      var e = document.activeElement;
      return held || hover || document.hidden || (e && hl.contains(e) && !e.classList.contains('hl-b')) || (finder && !finder.hidden) || (e && /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
    };
    var step = function (dir) {
      a.classList.add('out'); k.classList.add('out'); last = Date.now();
      setTimeout(function () { i = (i + (dir || 1) + items.length) % items.length; show(i); a.classList.remove('out'); k.classList.remove('out'); }, 250);
    };
    show(0); setP(); hl.hidden = false;
    setInterval(function () { if (!busy() && Date.now() - last >= 7900) step(1); }, 500);
    hl.addEventListener('mouseenter', function () { hover = true; });
    hl.addEventListener('mouseleave', function () { hover = false; });
    hl.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { step(+b.getAttribute('data-go')); }); });
    pb.addEventListener('click', function () { held = !held; setP(); });
  }

  // ---------------------------------------------------------------- site search
  var open = document.querySelector('.nav-find');
  if (!finder || !open) return;
  var input = finder.querySelector('input'), out = finder.querySelector('.find-out'), closeB = finder.querySelector('.find-x');
  var nav = document.querySelector('nav.nav');
  var IDX = null, VOCAB = null, loading = null, hits = [], cur = -1, timer = 0;

  var norm = function (s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9§.]+/g, ' ').replace(/\.(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var STOP = { a: 1, an: 1, the: 1, of: 1, to: 1, and: 1, or: 1, in: 1, on: 1, for: 1, my: 1, i: 1, is: 1, do: 1, how: 1, what: 1, where: 1, can: 1, me: 1, with: 1, about: 1 };
  // everyday words → where they live on the site
  var SYN = {
    calculator: ['agr', 'calculator'], calc: ['agr', 'calculator'], agr: ['agr', 'calculator'], pay: ['pay', 'agr'], salary: ['pay', 'agr'],
    dues: ['join', 'membership'], join: ['join', 'membership'], member: ['membership', 'join'], membership: ['membership', 'join'], sign: ['join'],
    grievance: ['grievance', 'representation'], complaint: ['grievance', 'representation', 'eeo'], help: ['help', 'representation'],
    lawyer: ['attorney', 'legal', 'lawyer'], attorney: ['attorney', 'legal'], fired: ['removal', 'adverse', 'representation'], suspended: ['suspension', 'adverse'],
    uniform: ['uniform'], uniforms: ['uniform'], ocp: ['uniform', 'ocp'], boots: ['uniform', 'boots'], clothing: ['uniform', 'clothing'],
    contract: ['contract', 'agreement'], cba: ['contract', 'agreement'], agreement: ['agreement', 'contract'],
    steward: ['representatives', 'steward'], rep: ['representatives', 'representation'], representative: ['representatives', 'representation'],
    leave: ['leave'], vacation: ['annual', 'leave'], sick: ['sick', 'leave'], military: ['military'], activated: ['emergency', 'activation', 'leave'],
    investigation: ['investigation', 'weingarten', 'garrity', 'kalkines'], questioned: ['weingarten', 'investigation'], interview: ['weingarten', 'investigation'],
    privacy: ['privacy', 'search'], congress: ['congress', 'legislation'], senator: ['senators', 'congress'], lawmaker: ['congress'],
    map: ['agencies', 'map'], location: ['work', 'sites', 'agencies'], directions: ['work', 'sites', 'agencies'], address: ['contact', 'sites'],
    phone: ['contact', 'phone'], email: ['contact', 'email'], contact: ['contact'], news: ['news'], video: ['video'], videos: ['video'],
    retirement: ['retirement', 'fers'], benefits: ['benefits'], dental: ['dental'], insurance: ['insurance', 'benefits']
  };
  var LABEL = { p: 'Pages', c: 'Contracts', r: 'Resources', n: 'News' };

  function load() {
    if (!loading) loading = fetch('/data/search.json').then(function (r) { return r.json(); }).then(function (d) {
      IDX = d.map(function (e) { return { e: e, T: ' ' + norm(e.t) + ' ', H: ' ' + norm(e.h) + ' ', D: ' ' + norm(e.d + ' ' + e.c) + ' ', X: ' ' + norm(e.x) + ' ' }; });
      VOCAB = {};
      IDX.forEach(function (o) { (o.T + o.H + o.D).split(' ').forEach(function (w) { if (w.length >= 4) VOCAB[w] = (VOCAB[w] || 0) + 1; }); });
    });
    return loading;
  }
  // edit distance (with swapped letters), stops early past the limit
  function dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      var low = 99;
      for (j = 1; j <= b.length; j++) {
        var c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        if (d[i][j] < low) low = d[i][j];
      }
      if (low > max) return max + 1;
    }
    return d[a.length][b.length];
  }
  // the words a query word may stand for: itself, its everyday meanings, and (when it matches nothing) the closest real word
  function alts(q) {
    var list = [q].concat(SYN[q] || []);
    var known = IDX.some(function (o) { return o.T.indexOf(' ' + q) >= 0 || o.H.indexOf(' ' + q) >= 0 || o.D.indexOf(' ' + q) >= 0; });
    if (!known && q.length >= 4) {
      var max = q.length >= 7 ? 2 : 1, best = null, bd = 9, bn = 0;
      for (var w in VOCAB) { var dd = dist(q, w, max); if (dd <= max && (dd < bd || (dd === bd && VOCAB[w] > bn))) { best = w; bd = dd; bn = VOCAB[w]; } }
      if (best) list.push(best);
    }
    return list;
  }
  function search(text) {
    var words = norm(text).split(' ').filter(function (w) { return w && !STOP[w]; });
    if (!words.length) return [];
    var groups = words.map(alts), phrase = ' ' + norm(text);
    var score = function (o, need) {
      var total = 0, matched = 0;
      for (var g = 0; g < groups.length; g++) {
        var best = 0;
        for (var a = 0; a < groups[g].length; a++) {
          var w = ' ' + groups[g][a], s = o.T.indexOf(w) >= 0 ? 12 : o.H.indexOf(w) >= 0 ? 5 : o.D.indexOf(w) >= 0 ? 4 : o.X.indexOf(w) >= 0 ? 1 : 0;
          if (a > 0 && s) s -= 0.5;          // the exact word a little ahead of a stand-in
          if (s > best) best = s;
        }
        if (best) { matched++; total += best; }
      }
      if (need && matched < groups.length) return 0;
      if (groups.length > 1 && o.T.indexOf(phrase) >= 0) total += 10;    // the whole phrase in the title
      if (o.e.k === 'p') total += 2; else if (o.e.k === 'n' || o.e.k === 'c') total -= 1;   // a page first, then contract text and news
      return total;
    };
    var run = function (need) { return IDX.map(function (o) { return { o: o, s: score(o, need) }; }).filter(function (r) { return r.s > 0; }); };
    var list = run(true);
    if (!list.length && words.length > 1) list = run(false);
    list.sort(function (a, b) { return b.s - a.s || (b.o.e.dt || '').localeCompare(a.o.e.dt || ''); });
    return { list: list, words: [].concat.apply([], groups) };
  }
  // a short line from the entry, around the first word that matched
  function snippet(e, words) {
    if (e.d) return e.c && e.k !== 'p' ? e.c + ' · ' + e.d : e.d;
    if (e.x) {
      var low = e.x.toLowerCase(), at = -1;
      words.forEach(function (w) { var i = low.indexOf(w); if (i >= 0 && (at < 0 || i < at)) at = i; });
      var s = at > 40 ? '…' + e.x.slice(at - 30, at + 130) : e.x.slice(0, 160);
      return (e.c ? e.c + ' · ' : '') + s;
    }
    return e.c || '';
  }
  function mark(s, words) {
    var h = esc(s);
    words.filter(function (w) { return w.length > 1; }).sort(function (a, b) { return b.length - a.length; }).forEach(function (w) {
      h = h.replace(new RegExp('(^|[^a-z0-9])(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '$1<mark>$2</mark>');
    });
    return h;
  }
  function render() {
    var q = input.value.trim();
    cur = -1;
    if (!q) { out.innerHTML = ''; hits = []; return; }
    if (!IDX) { out.innerHTML = '<p class="find-none">Searching…</p>'; return; }
    var r = search(q), list = r.list || [];
    if (!list.length) { out.innerHTML = '<p class="find-none">Nothing found for &ldquo;' + esc(q) + '&rdquo;. Try another word, or <a href="/contact-us">ask us</a>.</p>'; hits = []; return; }
    // groups in the order of their best result; up to 6 rows in each. The same section in several contracts ("8.4 Overtime
    // Work") is ONE row with a link to each state's contract.
    var order = [], by = {};
    list.forEach(function (x) {
      var e = x.o.e, k = e.k, rows = by[k] || (by[k] = []);
      if (!rows.length) order.push(k);
      if (k === 'c') {
        var same = rows.filter(function (g) { return g.t === e.t; })[0];
        if (same) { same.more.push(e); return; }
        if (rows.length < 6) rows.push({ t: e.t, e: e, more: [e] });
      } else if (rows.length < 6) rows.push({ t: e.t, e: e, more: [e] });
    });
    var short = function (e) { return String(e.c || '').replace(/ Contract$/, ''); };
    var html = '';
    order.forEach(function (k) {
      html += '<div class="find-g">' + LABEL[k] + '</div>';
      by[k].forEach(function (g) {
        var e = g.e;
        if (g.more.length > 1) {
          html += '<div class="find-r find-m"><b>' + mark(e.t, r.words) + '</b><span>In ' + g.more.map(function (x) { return '<a href="' + esc(x.u) + '">' + esc(short(x)) + '</a>'; }).join(' &middot; ') + '</span></div>';
          return;
        }
        var ext = /^https?:/i.test(e.u) || /\.pdf($|#)/i.test(e.u);
        html += '<a class="find-r" href="' + esc(e.u) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '><b>' + mark(e.t, r.words) + '</b><span>' + mark(snippet(e, r.words), r.words) + '</span></a>';
      });
    });
    out.innerHTML = html;
  }
  // a folder tab that drops from the magnifying glass (Ben, Nov 22 2026: "a little tab that pops down… from the magnifying
  // glass to just on the right-hand side of Contact"); on a phone it takes the full width
  function place() {
    var r = nav.getBoundingClientRect(), g = open.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    finder.style.top = Math.max(0, Math.floor(r.bottom) - 2) + 'px';   // overlaps the bar by a hair, so no seam at any display scaling
    if (vw <= 640) { finder.style.left = '0px'; finder.style.width = vw + 'px'; return; }
    var tabs = nav.querySelectorAll('.wrap > a'), end = tabs.length ? tabs[tabs.length - 1].getBoundingClientRect().right : g.left - 460;
    var w = Math.min(560, Math.max(380, g.right - end - 24));
    finder.style.left = Math.max(8, g.right - w) + 'px'; finder.style.width = w + 'px';
  }
  function show() {
    finder.hidden = false; open.setAttribute('aria-expanded', 'true'); place();
    input.focus(); input.select();
    load().then(render).catch(function () { out.innerHTML = '<p class="find-none">Search could not load. Please try again.</p>'; });
  }
  function hide(back) { finder.hidden = true; open.setAttribute('aria-expanded', 'false'); if (back) open.focus(); }
  var links = function () { return out.querySelectorAll('a.find-r, .find-m a'); };
  function move(n) {
    var rows = links(); if (!rows.length) return;
    cur = (cur + n + rows.length) % rows.length;
    rows.forEach(function (a, i) { a.classList.toggle('on', i === cur); });
    rows[cur].scrollIntoView({ block: 'nearest' });
  }

  open.addEventListener('mouseenter', load);
  open.addEventListener('focus', load);
  open.addEventListener('click', function () { if (finder.hidden) show(); else hide(true); });
  closeB.addEventListener('click', function () { hide(true); });
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(render, 90); });
  finder.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.stopPropagation(); hide(true); return; }
    if (e.target !== input) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      var rows = links(), a = rows[cur >= 0 ? cur : 0];
      if (a) { e.preventDefault(); a.click(); }
    }
  });
  // a result on this same page (a contract section): close search so the page can jump there
  out.addEventListener('click', function (e) { var a = e.target.closest('a'); if (a && a.pathname === location.pathname && a.hash) hide(false); });
  document.addEventListener('click', function (e) { if (!finder.hidden && !finder.contains(e.target) && !open.contains(e.target)) hide(false); });
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.key === '/' && finder.hidden && !(t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable))) { e.preventDefault(); show(); }
  });
  window.addEventListener('scroll', function () { if (!finder.hidden) place(); }, { passive: true });
  window.addEventListener('resize', function () { if (!finder.hidden) place(); });
})();
