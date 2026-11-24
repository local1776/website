// Link check for the built site (Ben, Nov 22 2026: launch prep). Build first (node tools/build.mjs), then:
//   node tools/check-links.mjs            internal links + anchors + outside links → review/link-report.md
//   node tools/check-links.mjs --internal only the site's own links (fast, no network)
// Internal links are checked the way GitHub Pages serves them: /name → name.html, CASE-SENSITIVE (Windows isn't; Pages is),
// and #anchors must exist on the target page. Outside links get one request each; sites that refuse automated checks
// (401/403/429/999) are listed as "check in a browser", not as broken.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');
const INTERNAL_ONLY = process.argv.includes('--internal');
const SITE = /^https?:\/\/(www\.)?local1776\.org/i;
// pages whose #hash is read by their script (the Agencies map opens #LA etc.), not an anchor in the HTML
const HASH_ROUTES = ['agencies.html', 'reform.html'];   // reform: #summary, #timeline… are its tabs (sections are #v-summary…)

// every file in dist, with its exact-case path
const files = new Set();
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else files.add(path.relative(OUT, p).split(path.sep).join('/')); } })(OUT);
const pages = [...files].filter(f => f.endsWith('.html'));
const html = Object.fromEntries(pages.map(f => [f, fs.readFileSync(path.join(OUT, f), 'utf8')]));
const ids = f => { const s = new Set(); for (const m of html[f].matchAll(/\sid="([^"]+)"/g)) s.add(m[1]); for (const m of html[f].matchAll(/\sname="([^"]+)"/g)) s.add(m[1]); return s; };
const idCache = {};

// a site path → the file GitHub Pages would serve (exact case), or null
function target(p) {
  p = decodeURI(p.replace(/[?#].*$/, ''));
  if (p === '' || p === '/') return 'index.html';
  const rel = p.replace(/^\//, '');
  if (files.has(rel)) return rel;
  if (files.has(rel + '.html')) return rel + '.html';
  if (files.has(rel.replace(/\/$/, '') + '/index.html')) return rel.replace(/\/$/, '') + '/index.html';
  return null;
}

const broken = [], outside = new Map();
for (const f of pages) {
  const from = '/' + f.replace(/(index)?\.html$/, '');
  // skip what the page script builds and code inside <script>
  const doc = html[f].replace(/<script[\s\S]*?<\/script>/g, '').replace(/<link[^>]*rel="(preconnect|dns-prefetch)"[^>]*>/g, '');
  for (const m of doc.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    let u = m[1].replace(/&amp;/g, '&');
    if (/^(mailto|tel|javascript|data):/i.test(u) || u.startsWith('{{')) continue;
    if (SITE.test(u)) u = u.replace(SITE, '') || '/';
    if (/^https?:/i.test(u)) { if (!outside.has(u)) outside.set(u, new Set()); outside.get(u).add(from); continue; }
    if (u.startsWith('//')) continue;
    const [p, hash] = u.split('#');
    const abs = p === '' ? '/' + f : p.startsWith('/') ? p : path.posix.join(path.posix.dirname('/' + f), p);
    const t = p === '' ? f : target(abs);
    if (!t) { broken.push([from, u, 'no such page or file']); continue; }
    if (hash && t.endsWith('.html') && !HASH_ROUTES.includes(t)) {
      idCache[t] ||= ids(t);
      if (!idCache[t].has(decodeURIComponent(hash))) broken.push([from, u, `no #${hash} on that page`]);
    }
  }
}

const results = [];
if (!INTERNAL_ONLY) {
  // sites Ben trusts to keep their addresses (Nov 22 2026: Cornell LII "has been working for decades") are not checked
  const TRUSTED = /^https?:\/\/(www\.)?law\.cornell\.edu\//i;
  const list = [...outside.keys()].filter(u => !TRUSTED.test(u));
  let i = 0;
  const check = async u => {
    const go = method => fetch(u, { method, redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 (link check)' } });
    try {
      let r = await go('HEAD');
      if (r.status === 405 || r.status === 404 || r.status >= 500) r = await go('GET');
      return r.status;
    } catch (e) { const c = e.cause && e.cause.code; return e.name === 'TimeoutError' ? 'timeout' : c === 'ENOTFOUND' ? 'no such site' : 'refused'; }
  };
  await Promise.all(Array.from({ length: 10 }, async () => { while (i < list.length) { const u = list[i++]; results.push([u, await check(u)]); } }));
}
// only a hard "not found" counts as broken; refusals, rate limits, timeouts and server errors are for a person to check
const bad = results.filter(([, s]) => s === 404 || s === 410 || s === 'no such site');
const blocked = results.filter(r => !(typeof r[1] === 'number' && r[1] < 400) && !bad.includes(r));

const where = u => [...outside.get(u)].slice(0, 3).join(', ') + (outside.get(u).size > 3 ? ` +${outside.get(u).size - 3} more` : '');
const md = [`# Link check — ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, '',
  `Pages checked: ${pages.length} · internal problems: ${broken.length}` + (INTERNAL_ONLY ? '' : ` · outside links: ${results.length}, broken: ${bad.length}, blocked automated checks: ${blocked.length}`), '',
  '## Broken links inside the site', '', broken.length ? broken.map(([f, u, w]) => `- ${f} → \`${u}\` (${w})`).join('\n') : 'None.', ''];
if (!INTERNAL_ONLY) md.push('## Broken outside links', '', bad.length ? bad.map(([u, s]) => `- ${s} · ${u} — on ${where(u)}`).join('\n') : 'None.', '',
  '## Outside links to check in a browser (the site refused an automated check)', '', blocked.length ? blocked.map(([u, s]) => `- ${s} · ${u} — on ${where(u)}`).join('\n') : 'None.', '');
fs.mkdirSync(path.join(ROOT, 'review'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'review', 'link-report.md'), md.join('\n'));
console.log(md.slice(0, 3).join('\n'));
console.log(`report: review/link-report.md`);
// for GitHub: --strict fails the build on a broken INTERNAL link (so a broken link is never published);
// --issue writes review/link-broken.md (only what is truly broken) and exits 3 when there is anything, so the monthly
// workflow can open an issue for Ben
if (process.argv.includes('--issue') && (broken.length || bad.length)) {
  fs.writeFileSync(path.join(ROOT, 'review', 'link-broken.md'), [
    `Found on ${new Date().toISOString().slice(0, 10)} by the monthly link check. Decide one by one: fix the link or remove it.`, '',
    ...(broken.length ? ['## Inside the site', '', ...broken.map(([f, u, w]) => `- ${f} → \`${u}\` (${w})`), ''] : []),
    ...(bad.length ? ['## Outside links that no longer exist', '', ...bad.map(([u, s]) => `- ${s} · ${u} — on ${where(u)}`), ''] : []),
  ].join('\n'));
  process.exit(3);
}
if (process.argv.includes('--strict') && broken.length) { console.error('broken internal links: build stopped'); process.exit(1); }
