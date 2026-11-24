// Contract pages: search the text, jump to a section by number, mark where you are in the contents.
(function () {
  var q = document.getElementById('cq');
  if (!q) return;
  var secs = [].slice.call(document.querySelectorAll('.ct-sec')), arts = [].slice.call(document.querySelectorAll('.ct-art'));
  var count = document.querySelector('.ct-find .rcount'), none = document.querySelector('.ct-none');
  var total = document.querySelectorAll('.ct-sec[id]').length;
  var toc = document.querySelector('.ct-toc');
  var strip = document.querySelector('.ct-strip'), bars = [].slice.call(document.querySelectorAll('.ct-nav'));

  // what was typed → terms. "annual leave" in quotes (straight or a phone's curly ones) = those words together, in that
  // order, whole words only; a word without quotes is found anywhere, even inside a longer word (Ben, Nov 24 2026).
  var SEP = "[^A-Za-z0-9\\n]+", APO = "['\u2019]?";
  var esc = function (w) { return w.split('').join(APO); };   // employees also finds employee's
  function terms(v) {
    var out = [], m, re = /"([^"]*)(?:"|$)|([^\s"]+)/g;
    v = v.replace(/[\u201c\u201d\u201e\u201f\u2033]/g, '"');
    while ((m = re.exec(v))) {
      var w = (m[1] !== undefined ? m[1] : m[2]).replace(/['\u2019]/g, '').split(/[^A-Za-z0-9]+/).filter(Boolean);
      if (w.length) out.push({ q: m[1] !== undefined, n: w.join('').length, re: new RegExp(w.map(esc).join(SEP), 'gi') });
    }
    return out;
  }
  // every section's text as one line, with the place of each piece of text in it
  var text = secs.map(function (s) {
    var walk = document.createTreeWalker(s, NodeFilter.SHOW_TEXT), n, t = '', at = [], last = null;
    while ((n = walk.nextNode())) {
      var b = n.parentNode.closest('p,h3,h4,li,.ct-note,.mk,h3 a');
      if (b !== last) t += '\n';   // a new paragraph, heading or number never joins the word before it
      last = b; at.push([t.length, n]); t += n.data.replace(/\n/g, ' ');
    }
    return { t: t, at: at };
  });
  var word = /[A-Za-z0-9]/;
  function find(T, term, all) {   // where a term is in one section's text ([start, end]…); only the first unless all
    var m, out = [], t = T.t; term.re.lastIndex = 0;
    while ((m = term.re.exec(t))) {
      var a = m.index, z = a + m[0].length;
      if (!term.q || !(word.test(t.charAt(a - 1)) || word.test(t.charAt(z)) || (/['\u2019]/.test(t.charAt(z)) && word.test(t.charAt(z + 1))))) { out.push([a, z]); if (!all) break; }
      else term.re.lastIndex = a + 1;
    }
    return out;
  }
  function range(T, a, z) {   // a piece of the section's text → a Range on the page (it may cross a link)
    var r = new Range(), k = T.at.length - 1, e;
    while (k > 0 && T.at[k][0] > a) k--;
    for (e = k; e < T.at.length - 1 && T.at[e + 1][0] < z; e++);
    r.setStart(T.at[k][1], a - T.at[k][0]); r.setEnd(T.at[e][1], Math.min(z - T.at[e][0], T.at[e][1].length));
    return r;
  }
  var phone = window.matchMedia('(max-width: 900px)');
  if (phone.matches && toc) toc.open = false;

  // the matches are colored without changing the page's text (a browser without the Highlight API still filters and steps)
  var hl = window.CSS && CSS.highlights && window.Highlight, hits = [], now = -1, shown = 0, MAX = 5000;
  function paint() {
    if (!hl) return;
    CSS.highlights.delete('ct'); CSS.highlights.delete('ct-now');
    if (hits.length) CSS.highlights.set('ct', new Highlight(...hits));
    if (now >= 0) { var h = new Highlight(hits[now]); h.priority = 1; CSS.highlights.set('ct-now', h); }
  }
  var num = function (n) { return n.toLocaleString('en-US') + (n === MAX ? '+' : ''); };
  function tell() {
    var typed = !!q.value.trim(), n = hits.length;
    var where = n ? (now >= 0 ? num(now + 1) + ' of ' + num(n) : num(n) + (n === 1 ? ' match' : ' matches')) : '';
    var inSecs = shown + (shown === 1 ? ' section' : ' sections');
    count.textContent = !typed ? total + ' sections' : where ? where + (shown && now < 0 && n < 100 ? ' · ' + inSecs : '') : shown ? inSecs : 'No matches';
    bars.forEach(function (b) { b.hidden = !n; });
    strip.hidden = !n;
    strip.querySelector('.ct-sq').textContent = q.value.trim(); strip.querySelector('.ct-sc').textContent = where;
  }
  function filter() {
    var ts = terms(q.value); hits = []; now = -1; shown = 0;
    secs.forEach(function (s, i) {
      var ok = ts.every(function (t) { return find(text[i], t).length; });
      s.hidden = !ok;
      if (!ok || !ts.length) return;
      if (s.id) shown++;
      var here = [];
      ts.forEach(function (t) { if (t.n > 1) here = here.concat(find(text[i], t, true)); });
      var end = -1;   // one match per place, even when two terms meet there
      here.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; }).forEach(function (h) {
        if (h[0] >= end && hits.length < MAX) { hits.push(range(text[i], h[0], h[1])); end = h[1]; }
      });
    });
    arts.forEach(function (a) { a.hidden = !a.querySelector('.ct-sec:not([hidden])'); });
    none.hidden = !ts.length || arts.some(function (a) { return !a.hidden; });
    paint(); tell();
  }
  function step(d) {
    if (!hits.length) return;
    now = now < 0 ? (d > 0 ? 0 : hits.length - 1) : (now + d + hits.length) % hits.length;
    paint(); tell();
    var r = hits[now].getBoundingClientRect(), y = r.top - innerHeight * 0.35;   // a third of the way down: clear of the bars, with the lines around it
    if (r.top < 90 || r.bottom > innerHeight - 70) window.scrollTo({ top: Math.max(0, scrollY + y), behavior: Math.abs(y) > innerHeight * 1.5 ? 'instant' : 'smooth' });
  }
  function clear() { q.value = ''; filter(); }

  function go(el) { if (el) { el.scrollIntoView({ block: 'start' }); history.replaceState(null, '', '#' + el.id); } }

  q.addEventListener('input', filter);
  // the Search button, or Enter: a number ("12.4" or "12") jumps straight to that section or article; words go to the first
  // match, then to the next one each time. On a phone the keyboard is put away so the results show.
  function search(back) {
    if (!q.value.trim()) { q.focus(); return; }
    var v = q.value.trim().replace(/^(section|sec\.?|article|art\.?)\s*/i, '');
    var m = v.match(/^(\d+)(?:\.(\d+))?$/);
    if (phone.matches || window.matchMedia('(pointer: coarse)').matches) q.blur();
    var el = m && document.getElementById(m[2] ? 's' + m[1] + '-' + m[2] : 'a' + m[1]);
    if (el) { clear(); go(el); return; }
    if (hits.length) step(back ? -1 : 1);
    else { var first = document.querySelector('.ct-art:not([hidden])'); (first || none).scrollIntoView({ block: 'start' }); }
  }
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); search(e.shiftKey); }
    else if (e.key === 'Escape' && q.value) { e.preventDefault(); clear(); }
  });
  document.querySelector('[data-find]').addEventListener('click', function () { search(); });
  bars.forEach(function (b) {
    b.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      var d = t.getAttribute('data-step');
      if (d === 'x') { var at = now >= 0 ? hits[now].startContainer.parentNode : null; clear(); if (at) at.scrollIntoView({ block: 'center', behavior: 'instant' }); }   // stay where they were reading
      else step(+d);
    });
  });

  // on a phone the contents fold away after you pick an article
  if (toc) toc.addEventListener('click', function (e) { if (e.target.closest('a') && phone.matches) toc.open = false; });

  // the contents list shows which article you are reading
  var links = {};
  [].forEach.call(document.querySelectorAll('.ct-toc a'), function (a) { links[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var cur = null;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var a = links[e.target.id];
        if (!a || a === cur) return;
        if (cur) cur.removeAttribute('aria-current');
        a.setAttribute('aria-current', 'true'); cur = a;
        if (!phone.matches) { var box = a.closest('ol'); if (a.offsetTop < box.scrollTop || a.offsetTop > box.scrollTop + box.clientHeight - 30) box.scrollTop = a.offsetTop - box.clientHeight / 3; }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });
    arts.forEach(function (a) { io.observe(a); });
  }

  // Back to Top: shows after about a screen of scrolling
  var top = document.querySelector('[data-top]');
  if (top) {
    var check = function () { top.hidden = window.scrollY < window.innerHeight; };
    window.addEventListener('scroll', check, { passive: true }); check();
    top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); history.replaceState(null, '', location.pathname); });
  }
})();
