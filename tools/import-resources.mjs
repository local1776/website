// One-time import of the old Resources page into site/data/resources.json (sections -> groups -> links).
// After this, resources.json is the file to edit; the build turns it into the page.
// Reads the saved Duda page, keeps every link, copies every Duda-hosted document to site/files/ under a clean name,
// and records sub-items (the old page marked them with leading dashes).
// Run once: node tools/import-resources.mjs   (it refuses to overwrite an existing resources.json without --force)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isCdn, publishFile } from './lib/cdn.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'site', 'data', 'resources.json');
if (fs.existsSync(OUT) && !process.argv.includes('--force')) { console.log('resources.json exists — edit it directly (or pass --force)'); process.exit(0); }
const html = fs.readFileSync(path.join(ROOT, 'backup', 'pages', 'resources.html'), 'utf8');
const ent = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

// flatten the page body to a token stream: headings, plain text, links
const body = html.slice(html.indexOf('>Resources<'), html.indexOf('PO Box 1794, Abita Springs'));
const toks = [];
for (const m of body.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, '').matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>|<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>|>([^<]+)(?=<)/g)) {
  if (m[1]) { const t = ent(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim(); if (t) toks.push({ h: +m[1], t }); }
  else if (m[3] !== undefined) toks.push({ href: ent(m[3]).trim(), t: ent(m[4].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() });
  else { const t = ent(m[5]).replace(/\s+/g, ' ').trim(); if (t) toks.push({ t }); }
}

const sections = []; let sec = null, grp = null, depth = 0, pendingParen = null;
const SECTION_NAMES = ['Financials', 'Workplace Matters', 'Other Links & Documents', 'Existing Laws and US Gov Regulations', 'Agency Policies and Regulations', 'Local Level Policies and Regulations'];
const stats = { links: 0, files: 0, missing: [] };
for (let i = 0; i < toks.length; i++) {
  const k = toks[i];
  if (k.h && SECTION_NAMES.includes(k.t)) { sec = { title: k.t, groups: [] }; sections.push(sec); grp = null; continue; }
  if (!sec) continue;
  if (k.h) continue;
  if (!k.href) {
    if (/^-+$/.test(k.t)) { depth = k.t.length; continue; }
    if (/^[()]$/.test(k.t) || k.t === '(' || k.t === ')') continue;
    if (/^(VIDEO|Coming Soon|Frequently-referenced.*|Includes .*)$/i.test(k.t)) continue;
    if (/^Note: /.test(k.t)) { sec.note = k.t + ' '; continue; }
    if (sec.note && /^, the Contract shall govern\.?$|^the Contract shall govern/.test(k.t)) { sec.note += 'the contract governs.'; continue; }
    grp = { title: k.t.replace(/\s*\($/, ''), items: [] }; sec.groups.push(grp); depth = 0; continue;
  }
  if (!grp) { grp = { title: '', items: [] }; sec.groups.push(grp); }
  if (!k.t || k.href === '/' ) { depth = 0; continue; }            // stray "--" links to the home page
  let href = k.href;
  const item = { label: k.t };
  if (isCdn(href)) { const pub = publishFile(ROOT, href); if (pub) { href = pub; stats.files++; } else stats.missing.push(k.t + ' :: ' + href); }
  item.href = href.replace(/^https?:\/\/(www\.)?local1776\.org/i, '') || '/';
  if (depth) item.sub = depth;
  // a group title written as "Name ( LINK )": the link belongs to the title
  if (grp.items.length === 0 && /^\(?\s*$/.test(toks[i - 1]?.t || '') && toks[i - 2] && !toks[i - 2].href && toks[i - 2].t === grp.title.replace(/\s*\($/, '')) { grp.href = item.href; grp.short = item.label; depth = 0; continue; }
  grp.items.push(item); stats.links++; depth = 0;
}
fs.writeFileSync(OUT, JSON.stringify(sections, null, 1));
console.log(`sections: ${sections.length}  groups: ${sections.reduce((a, s) => a + s.groups.length, 0)}  links: ${stats.links}  documents copied: ${stats.files}`);
sections.forEach(s => console.log('  ' + s.title + ': ' + s.groups.map(g => `${g.title || '(untitled)'}(${g.items.length})`).join(', ')));
if (stats.missing.length) { console.log('MISSING documents:'); stats.missing.forEach(m => console.log('  ' + m)); }
