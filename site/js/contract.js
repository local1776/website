// Contract pages: search the text, jump to a section by number, mark where you are in the contents.
(function () {
  var q = document.getElementById('cq');
  if (!q) return;
  var secs = [].slice.call(document.querySelectorAll('.ct-sec')), arts = [].slice.call(document.querySelectorAll('.ct-art'));
  var count = document.querySelector('.ct-find .rcount'), none = document.querySelector('.ct-none');
  var total = document.querySelectorAll('.ct-sec[id]').length;
  var toc = document.querySelector('.ct-toc');
  var norm = function (s) { return s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); };
  var text = secs.map(function (s) { return norm(s.textContent); });
  var phone = window.matchMedia('(max-width: 900px)');
  if (phone.matches && toc) toc.open = false;

  // highlight matches without changing the page text (browsers without the Highlight API just filter)
  var hl = window.CSS && CSS.highlights && window.Highlight;
  function mark(words) {
    if (!hl) return;
    CSS.highlights.delete('ct');
    if (!words.length) return;
    var ranges = [], re = new RegExp(words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'gi');
    secs.forEach(function (s) {
      if (s.hidden || ranges.length > 3000) return;
      var walk = document.createTreeWalker(s, NodeFilter.SHOW_TEXT), n;
      while ((n = walk.nextNode())) {
        var m; re.lastIndex = 0;
        while ((m = re.exec(n.data)) && ranges.length < 3000) { var r = new Range(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); ranges.push(r); }
      }
    });
    CSS.highlights.set('ct', new Highlight(...ranges));
  }

  function go(el) { if (el) { el.scrollIntoView({ block: 'start' }); history.replaceState(null, '', '#' + el.id); } }

  q.addEventListener('input', function () {
    var v = q.value.trim(), words = norm(v).split(' ').filter(Boolean), shown = 0;
    secs.forEach(function (s, i) { var ok = words.every(function (w) { return text[i].indexOf(w) >= 0; }); s.hidden = !ok; if (ok && s.id) shown++; });
    arts.forEach(function (a) { a.hidden = !a.querySelector('.ct-sec:not([hidden])'); });
    count.textContent = words.length ? shown + ' of ' + total + ' sections' : total + ' sections';
    none.hidden = shown > 0 || !words.length;
    mark(words.filter(function (w) { return w.length > 1; }));
  });
  // the Search button, or Enter: a number ("12.4" or "12") jumps straight to that section or article; words go to the
  // first match, with the phone's keyboard put away so the results show
  function search() {
    if (!q.value.trim()) { q.focus(); return; }
    var v = q.value.trim().replace(/^(section|sec\.?|article|art\.?)\s*/i, '');
    var m = v.match(/^(\d+)(?:\.(\d+))?$/);
    q.blur();
    if (!m) { var first = document.querySelector('.ct-sec:not([hidden])'); if (first) first = first.closest('.ct-art') || first; (first || none).scrollIntoView({ block: 'start' }); return; }
    q.value = ''; q.dispatchEvent(new Event('input'));
    go(document.getElementById(m[2] ? 's' + m[1] + '-' + m[2] : 'a' + m[1]));
  }
  q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); search(); } });
  document.querySelector('[data-find]').addEventListener('click', search);

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
