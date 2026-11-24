// Links to check by hand (Ben, Nov 22 2026 — on his to-do list for later). Run: node tools/link-review.mjs, then open
// http://127.0.0.1:8792/. Lists the outside links from review/link-report.md that refused an automated check (run
// node tools/check-links.mjs first for a fresh list). Ben marks each Works / Not Useful / Broken; answers are saved in
// review/link-answers.json. Nothing on the website changes from here; Claude applies the answers afterwards.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPORT = 'c:/dev/local 1776/review/link-report.md';
const ANS = 'c:/dev/local 1776/review/link-answers.json';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const posts = new Set(JSON.parse(fs.readFileSync('c:/dev/local 1776/site/data/posts.json', 'utf8')).map(p => '/' + p.slug));

// "- 403 · URL — on /a, /b +7 more"
const md = fs.readFileSync(REPORT, 'utf8');
const sec = md.slice(md.indexOf('## Outside links to check in a browser'));
const links = [...sec.matchAll(/^- (\S+) · (\S+) — on (.+)$/gm)].map((m, i) => {
  const on = m[3].split(/,\s*/).map(s => s.trim());
  const pages = on.filter(s => s.startsWith('/')).map(s => s.replace(/\s*\+\d+ more$/, ''));
  const more = (m[3].match(/\+(\d+) more/) || [])[1];
  const news = pages.every(p => posts.has(p) || p.startsWith('/video/'));
  return { i, code: m[1], url: m[2], pages, more: more ? +more : 0, news };
});
// Cornell LII: Ben trusts it (Nov 22 2026) — not on the list
for (const l of links.filter(l => /law\.cornell\.edu/i.test(l.url))) links.splice(links.indexOf(l), 1);
// Congress.gov member pages are all made from one pattern: three stand for the rest
const cg = links.filter(l => /congress\.gov\/member\//.test(l.url));
for (const l of cg.slice(3)) links.splice(links.indexOf(l), 1);
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

function page() {
  const ans = fs.existsSync(ANS) ? JSON.parse(fs.readFileSync(ANS, 'utf8')) : {};
  const row = l => {
    const a = ans[l.url] || {};
    const opt = (v, label) => `<label class="opt"><input type="radio" name="r${l.i}" value="${v}"${a.v === v ? ' checked' : ''}> ${label}</label>`;
    return `<tr data-url="${esc(l.url)}"><td class="lk"><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(host(l.url))}</a><span>${esc(l.url.replace(/^https?:\/\/(www\.)?[^/]+/, '') || '/')}</span></td>
      <td class="on">${l.pages.slice(0, 2).map(p => `<a href="http://127.0.0.1:8776${esc(p)}" target="_blank" rel="noopener">${esc(p.length > 42 ? p.slice(0, 40) + '…' : p)}</a>`).join('')}${l.pages.length > 2 || l.more ? `<span>+${l.pages.length - 2 + l.more} more</span>` : ''}</td>
      <td class="ch">${opt('ok', 'Works')}${opt('drop', 'Not Useful')}${opt('broken', 'Broken')}</td>
      <td><input class="note" maxlength="80" value="${esc(a.note || '')}" placeholder="Note (optional)"></td></tr>`;
  };
  const group = (title, list) => list.length ? `<tr class="gh"><td colspan="4">${title} &middot; ${list.length}</td></tr>` + list.map(row).join('') : '';
  const main = links.filter(l => !l.news), news = links.filter(l => l.news);
  const done = Object.values(ans).filter(a => a.v).length;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Links to Check</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Libre+Franklin:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--navy:#0b2a55;--gold:#ff9e0b;--gold-text:#b45f00;--ink:#121212;--muted:#5f6672;--rule:#dcdfe4}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font:14.5px/1.45 "Libre Franklin",Arial,sans-serif}
.wrap{max-width:1280px;margin:0 auto;padding:28px 28px 60px}
.k{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-text)}
h1{font-family:"Playfair Display",Georgia,serif;font-size:36px;line-height:1.1;margin:6px 0 10px}
p.lede{margin:0 0 14px;color:#2a2a2a}
table{width:100%;border-collapse:collapse;table-layout:fixed}
col.c1{width:38%}col.c2{width:22%}col.c3{width:24%}col.c4{width:16%}
td{padding:7px 8px;border-bottom:1px solid var(--rule);vertical-align:middle}
tr.gh td{padding:20px 8px 6px;font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-text)}
.lk a{display:block;font-weight:700;color:var(--navy);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lk a:visited{color:#6b4c9a}.lk a:hover{text-decoration:underline}
.lk span,.on span{display:block;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.on a{display:block;font-size:12.5px;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.opt{display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:13px;white-space:nowrap;cursor:pointer}
input.note{width:100%;height:32px;padding:4px 8px;font:inherit;font-size:13px;border:1px solid #b9c0cb;border-radius:6px}
tr.done{background:#f7f9fb}
.bar{position:sticky;top:0;background:#fff;z-index:2;display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--rule)}
.btn{display:inline-flex;flex-direction:column;align-items:center;gap:5px;background:none;border:0;padding:0;cursor:pointer;color:var(--navy);font:400 9px/1 "Libre Franklin",Arial,sans-serif;text-transform:uppercase}
.btn .ico{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:6px;background:var(--navy);color:var(--gold)}
.btn:hover .ico{background:#071d3d}.btn svg{width:20px;height:20px}
#msg{font-size:13px;color:var(--muted)}
</style></head><body><div class="wrap">
<div class="k">Before Launch &middot; For Ben</div>
<h1>Links to Check</h1>
<p class="lede">These ${links.length} outside links block automatic checks, so a person has to open them. Click each link (it opens in a new tab), then mark it <b>Works</b>, <b>Not Useful</b> (works, but we should drop it) or <b>Broken</b>. The links your members use most are first; old news stories are last and matter least. Your answers save as you go; Save also saves. Nothing on the website changes until you tell me.</p>
<div class="bar"><button class="btn" id="save" type="button" aria-label="Save"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></svg></span><span>Save</span></button><span id="msg">${done} of ${links.length} checked.</span></div>
<table><colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"></colgroup><tbody>
${cg.length > 3 ? `<tr class="gh"><td colspan="4">Note &middot; Only 3 of the ${cg.length} Congress.gov member pages are listed. All ${cg.length} are built the same way, so if these 3 open, they all do.</td></tr>` : ''}${group('Pages Members Use: Resources, Contracts, Guides', main)}${group('Old News Stories', news)}
</tbody></table></div>
<script>
var total = ${links.length};
function collect() {
  var out = {};
  document.querySelectorAll('tr[data-url]').forEach(function (tr) {
    var c = tr.querySelector('input[type=radio]:checked'), n = tr.querySelector('.note').value.trim();
    tr.classList.toggle('done', !!c);
    if (c || n) out[tr.getAttribute('data-url')] = { v: c ? c.value : '', note: n };
  });
  return out;
}
function save() {
  var a = collect();
  fetch('/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) })
    .then(function (r) { if (!r.ok) throw 0; var n = Object.values(a).filter(function (x) { return x.v; }).length; document.getElementById('msg').textContent = n + ' of ' + total + ' checked. Saved ' + new Date().toLocaleTimeString('en-US') + '.'; })
    .catch(function () { document.getElementById('msg').textContent = 'Could not save. Tell Claude.'; });
}
document.addEventListener('change', save);
document.getElementById('save').addEventListener('click', save);
collect();
</script></body></html>`;
}

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/save') {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => { try { fs.writeFileSync(ANS, JSON.stringify(JSON.parse(b), null, 1)); res.writeHead(200); res.end('ok'); } catch { res.writeHead(400); res.end('bad'); } });
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(page());
}).listen(8792, '127.0.0.1', () => console.log('links page at http://127.0.0.1:8792/'));
