// The searches that highlight and step through matches (contract pages, Reform's list of agencies) share this.
(function () {
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
  // an element's text as one line, with the place of each piece of text in it; blocks = what starts a new line
  function read(el, blocks) {
    var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n, t = '', at = [], last = null;
    while ((n = walk.nextNode())) {
      var b = n.parentNode.closest(blocks);
      if (b !== last) t += '\n';   // a new paragraph, heading or number never joins the word before it
      last = b; at.push([t.length, n]); t += n.data.replace(/\n/g, ' ');
    }
    return { t: t, at: at };
  }
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
  // the places all the terms are found in one element, in order; one match per place, even when two terms meet there
  function places(T, ts) {
    var here = [], out = [], end = -1;
    ts.forEach(function (x) { if (x.n > 1) here = here.concat(find(T, x, true)); });
    here.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; }).forEach(function (h) { if (h[0] >= end) { out.push(h); end = h[1]; } });
    return out;
  }
  // the matches are colored without changing the page's text (a browser without the Highlight API still filters and steps)
  function paint(hits, now) {
    if (!(window.CSS && CSS.highlights && window.Highlight)) return;
    CSS.highlights.delete('ct'); CSS.highlights.delete('ct-now');
    if (hits.length) CSS.highlights.set('ct', new Highlight(...hits));
    if (now >= 0) { var h = new Highlight(hits[now]); h.priority = 1; CSS.highlights.set('ct-now', h); }
  }
  window.L1776_FIND = { terms: terms, read: read, find: find, range: range, places: places, paint: paint };
})();
