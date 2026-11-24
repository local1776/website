// Contract pages: search the text, jump to a section by number, mark where you are in the contents.
(function () {
  var q = document.getElementById('cq');
  if (!q) return;
  var secs = [].slice.call(document.querySelectorAll('.ct-sec')), arts = [].slice.call(document.querySelectorAll('.ct-art'));
  var count = document.querySelector('.ct-find .rcount'), none = document.querySelector('.ct-none');
  var total = document.querySelectorAll('.ct-sec[id]').length;
  var toc = document.querySelector('.ct-toc');
  var strip = document.querySelector('.ct-strip'), bars = [].slice.call(document.querySelectorAll('.ct-nav'));

  var F = window.L1776_FIND, find = F.find;
  var text = secs.map(function (s) { return F.read(s, 'p,h3,h4,li,.ct-note,.mk,h3 a'); });
  var phone = window.matchMedia('(max-width: 900px)');
  if (phone.matches && toc) toc.open = false;

  var hits = [], now = -1, shown = 0, MAX = 5000;
  function paint() { F.paint(hits, now); }
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
    var ts = F.terms(q.value); hits = []; now = -1; shown = 0;
    secs.forEach(function (s, i) {
      var ok = ts.every(function (t) { return find(text[i], t).length; });
      s.hidden = !ok;
      if (!ok || !ts.length) return;
      if (s.id) shown++;
      F.places(text[i], ts).forEach(function (h) { if (hits.length < MAX) hits.push(F.range(text[i], h[0], h[1])); });
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
