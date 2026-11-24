// CSS helpers for the "app" pages (Reform, AGR Calculator) — pages that keep their own stylesheet inside the main
// site's header and footer (Ben, Nov 22 2026: the two sister sites folded into www.local1776.org).
//   scopeCss(css, '#main')   every rule of the page's own stylesheet applies only inside <main id="main">
//   chromeCss(siteCss, html) only the rules of site.css that style the header, menu, contact strip and footer,
//                            limited to those parts, so they never reach the page's own content
// No packages: a small parser that understands rules, @media/@supports blocks, strings and comments.

function skipString(s, i) {            // s[i] is a quote; returns the index after the closing quote
  const q = s[i];
  for (i++; i < s.length; i++) { if (s[i] === '\\') { i++; continue; } if (s[i] === q) return i + 1; }
  return i;
}
// index of the brace that closes the block opened at s[open] ('{')
function matchBrace(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") { i = skipString(s, i) - 1; continue; }
    if (c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); i = e < 0 ? s.length : e + 1; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  throw new Error('CSS: unclosed block at ' + open);
}
// the next '{' or ';' at the top level (outside strings, comments, parens and brackets)
function nextStop(s, i) {
  let depth = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") { i = skipString(s, i) - 1; continue; }
    if (c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); i = e < 0 ? s.length : e + 1; continue; }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (!depth && (c === '{' || c === ';')) return i;
  }
  return -1;
}
const GROUPS = new Set(['media', 'supports', 'container', 'layer', 'document']);
export function parseCss(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (s.startsWith('/*', i)) { const e = s.indexOf('*/', i + 2); i = e < 0 ? s.length : e + 2; continue; }
    if (i >= s.length) break;
    const stop = nextStop(s, i);
    if (stop < 0) break;
    const head = s.slice(i, stop).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (s[stop] === ';') { out.push({ stmt: head }); i = stop + 1; continue; }
    const end = matchBrace(s, stop), inner = s.slice(stop + 1, end);
    if (head.startsWith('@')) {
      const name = head.slice(1).split(/[\s(]/)[0].toLowerCase();
      out.push(GROUPS.has(name) ? { at: head, children: parseCss(inner) } : { at: head, body: inner });
    } else out.push({ sel: head, body: inner });
    i = end + 1;
  }
  return out;
}
export function printCss(nodes) {
  return nodes.map(n => n.stmt != null ? n.stmt + ';'
    : n.children ? (n.children.length ? `${n.at}{\n${printCss(n.children)}\n}` : '')
    : n.at ? `${n.at}{${n.body}}` : `${n.sel}{${n.body}}`).filter(Boolean).join('\n');
}
// split a selector list on its top-level commas
export function splitSelectors(sel) {
  const out = []; let depth = 0, from = 0;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === '"' || c === "'") { i = skipString(sel, i) - 1; continue; }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && !depth) { out.push(sel.slice(from, i).trim()); from = i + 1; }
  }
  out.push(sel.slice(from).trim());
  return out.filter(Boolean);
}
// the first compound selector ("body.printing" in "body.printing .wrap > p")
function firstCompound(sel) {
  let depth = 0;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === '"' || c === "'") { i = skipString(sel, i) - 1; continue; }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (!depth && /[\s>+~]/.test(c)) return sel.slice(0, i);
  }
  return sel;
}
function mapRules(nodes, fn) {
  return nodes.map(n => {
    if (n.children) return { ...n, children: mapRules(n.children, fn) };
    if (n.sel == null) return n;
    const sels = splitSelectors(n.sel).map(fn).filter(Boolean);
    return sels.length ? { ...n, sel: sels.join(',') } : null;
  }).filter(Boolean);
}

// The page's own stylesheet, limited to its content. :root and html rules stay as they are (same color names and
// values as site.css — and the way to write the rare rule that must reach the header or footer: ":root body.x>.print-head");
// "body" becomes "body <scope>" so rules written for the page body (font, "body > .wrap",
// "body.printing ...") now mean the content area. @font-face and @keyframes are left alone.
export function scopeCss(css, scope = '#main') {
  return printCss(mapRules(parseCss(css), sel => {
    const fc = firstCompound(sel), rest = sel.slice(fc.length);
    const tag = (fc.match(/^[a-zA-Z]+/) || [''])[0].toLowerCase();
    if (fc.startsWith(':root') || tag === 'html') return sel;
    if (tag === 'body') return `${fc} ${scope}${rest}`;
    return `${scope} ${sel}`;
  }));
}

// The header / menu / contact strip / footer rules from site.css, and nothing else. A rule is kept only when every
// class, id and tag it names appears in that markup; rules written for the page in general (a, .btn, .wrap...) are
// limited to those parts with :where(), which adds no weight, so the header looks exactly as on every other page.
const ROOTS = ['skip', 'print-head', 'mast', 'nav', 'find', 'strip', 'site-foot'];
const WHERE = ':where(.skip,.print-head,.mast,.nav,.find,body>.strip,.site-foot)';
export function chromeCss(siteCss, chromeHtml) {
  const classes = new Set(), ids = new Set(), tags = new Set(['html', 'body']);
  for (const m of chromeHtml.matchAll(/\bclass="([^"]*)"/g)) m[1].split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
  for (const m of chromeHtml.matchAll(/\bid="([^"]*)"/g)) ids.add(m[1]);
  for (const m of chromeHtml.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)/g)) tags.add(m[1].toLowerCase());
  const usable = sel => {
    const bare = sel.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '').replace(/\[[^\]]*\]/g, '[]').replace(/"[^"]*"|'[^']*'/g, '""');
    for (const m of bare.matchAll(/\.([\w-]+)/g)) if (!classes.has(m[1])) return false;
    for (const m of bare.matchAll(/#([\w-]+)/g)) if (!ids.has(m[1])) return false;
    for (const m of bare.matchAll(/(?:^|[\s>+~(])([a-zA-Z][a-zA-Z0-9]*)/g)) if (!tags.has(m[1].toLowerCase())) return false;
    return true;
  };
  const nodes = mapRules(parseCss(siteCss), sel => {
    if (!usable(sel)) return null;
    const fc = firstCompound(sel);
    if (/^(:root|html|body|\*)/i.test(fc) && !/\.[\w-]/.test(fc) || /^\[hidden\]$/.test(sel)) return sel;          // page basics
    if (ROOTS.some(r => new RegExp(`\\.${r}(?![\\w-])`).test(sel))) return sel.replace(/\.strip(?![\w-])/g, '.strip:where(body>*)');
    // a rule for the root element itself (the skip link is an <a>): match the root too, not only what is inside it
    const self = !/[\s>+~]/.test(sel) && !/::/.test(sel) ? `,${sel}${WHERE}` : '';
    return `${WHERE} ${sel}${self}`;
  });
  // keep @font-face / @keyframes; drop @media blocks that ended up empty
  const prune = ns => ns.map(n => n.children ? { ...n, children: prune(n.children) } : n).filter(n => !n.children || n.children.length);
  return printCss(prune(nodes));
}
