// Rebuild every blog post from the Duda backup in the new site's format (Ben, Nov 20 2026: "make sure you rebuild each
// story in the new format").
//   site/data/posts.json   — the list: slug, title (source prefix split off), source, date, author, subtitle, excerpt,
//                            image, video flag
//   site/posts/<slug>.html — each story's body, cleaned to plain p / h2 / h3 / lists / quotes / figures / links
// Pictures go to site/img/posts/ (web size), linked documents to site/files/, old-site links become new-site links,
// and the known typos in tools/typos.json are fixed. Duda's markup, spacing hacks and inline styles are dropped.
// Run: node tools/import-posts.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isCdn, backupFileFor, publishFile } from './lib/cdn.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BK = path.join(ROOT, 'backup');
const rss = fs.readFileSync(path.join(BK, 'blog-feed-rss2.xml'), 'utf8');
const EDITS = fs.existsSync(path.join(ROOT, 'tools', 'post-edits.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'post-edits.json'), 'utf8')) : {};
const TYPOS =fs.existsSync(path.join(ROOT, 'tools', 'typos.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'typos.json'), 'utf8')) : {};

const ent = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const text = h => ent(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const tag = (s, t) => { const m = s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? m[1] : ''; };
const escText = s => s.replace(/&(?!(#\d+|#x[0-9a-f]+|[a-z]+);)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- typo fixes (whole words, case kept)
function fixTypos(s) {
  // word boundaries only where the key starts/ends with a letter (keys like ". T he" start with punctuation)
  const rx = k => new RegExp((/^\w/.test(k) ? '\\b' : '') + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (/\w$/.test(k) ? '\\b' : ''), 'g');
  for (const [bad, good] of Object.entries(TYPOS)) {
    s = s.replace(rx(bad), good);
    const cap = bad[0].toUpperCase() + bad.slice(1);
    if (cap !== bad) s = s.replace(rx(cap), good[0].toUpperCase() + good.slice(1));
  }
  return s;
}

// ---------- source prefix on reposts: "GovExec: Title" -> source + title
const SOURCES = [
  [/^Gove?Exec:\s*/i, 'Government Executive'], [/^AP News:\s*/i, 'Associated Press'], [/^AP:\s*/i, 'Associated Press'],
  [/^CNS:\s*/i, 'Courthouse News Service'], [/^FEDWeek:\s*/i, 'FedWeek'], [/^Defense[- ]?One:\s*/i, 'Defense One'],
  [/^cyberFEDS:\s*/i, 'cyberFEDS'], [/^Stars and Stripes:\s*/i, 'Stars and Stripes'], [/^US Army:\s*/i, 'U.S. Army'],
  [/^LIUNA:\s*/i, 'LIUNA'], [/^Flashback 2005:\s*Seattle Times\s*-\s*/i, 'The Seattle Times, 2005'],
];
function splitSource(title) {
  for (const [re, src] of SOURCES) if (re.test(title)) return { source: src, title: title.replace(re, '') };
  return { source: '', title };
}

// ---------- links: old-site pages -> new paths; Duda files -> our copies
const OLD_PAGES = { 'contact_us.html': '/contact-us', 'resources.html': '/resources', 'index.html': '/', 'join.html': '/join-now' };
function fixHref(h) {
  h = ent(h).trim();
  if (!h || h.startsWith('#') || /^(mailto|tel):/i.test(h)) return h;
  if (isCdn(h)) return publishFile(ROOT, h) || h;
  const m = h.match(/^(?:https?:)?\/\/(?:www\.)?local1776\.org(\/[^?#]*)?/i);
  if (m || h.startsWith('/')) {
    let p = m ? (m[1] || '/') : h;
    const leaf = p.replace(/^\//, '');
    if (OLD_PAGES[leaf]) return OLD_PAGES[leaf];
    return p.replace(/\/$/, '') || '/';
  }
  return h.replace(/^http:\/\/(www\.)?(govexec|defenseone|opm|eeoc|nasa|apnews)\./i, 'https://$1$2.');
}

// ---------- clean one story's HTML
const BLOCKS = new Set(['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote']);
const INLINE = { strong: 'strong', b: 'strong', em: 'em', i: 'em', a: 'a' };
function clean(html, slug, images) {
  const out = []; const stack = []; let curHref = '';
  const open = t => stack.includes(t);
  const closeTo = t => { while (stack.length) { const x = stack.pop(); out.push(`</${x}>`); if (x === t) break; } };
  const inBlock = () => stack.some(t => BLOCKS.has(t));
  const ensureP = () => { if (!inBlock()) { out.push('<p>'); stack.push('p'); } };
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<!--')) continue;
    if (m[5] !== undefined) {                                 // text
      const t = m[5].replace(/ |&nbsp;/g, ' ');
      if (!t.trim()) { if (inBlock()) out.push(' '); continue; }
      ensureP();
      let s = escText(ent(t)).replace(/\s+/g, ' ');
      // bare web addresses typed as text become links (outside an existing link)
      if (!open('a')) s = s.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:)!?'"]/g, u => { const h = fixHref(u.replace(/&amp;/g, '&')); return `<a href="${escText(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}>${u}</a>`; });
      out.push(s); continue;
    }
    const close = m[1] === '/', name = m[2].toLowerCase(), attrs = m[3] || '';
    let t = name === 'h1' ? 'h2' : name;
    if (t === 'img') {
      const src = (attrs.match(/src="([^"]+)"/) || [])[1];
      const alt = ent((attrs.match(/alt="([^"]*)"/) || [])[1] || '').trim();
      const file = src && backupFileFor(ROOT, ent(src));
      if (!file) continue;
      const pub = `img/posts/${slug}-${images.length + 1}.jpg`;
      images.push([file, pub]);
      // a picture that was a link (to a report, a video, a story) keeps its link, with a plain caption saying where it goes
      let link = open('a') ? curHref : linkedImages(slug)[path.basename(decodeURIComponent(src)).replace(/-\d+w(\.\w+)$/, '$1')] || '';
      while (stack.length && !['li', 'blockquote'].includes(stack[stack.length - 1])) closeTo(stack[stack.length - 1]);
      const img = `<img src="/${pub}" alt="${escText(alt)}" loading="lazy">`;
      if (link) {
        const ext = /^https?:/i.test(link) ? ' target="_blank" rel="noopener"' : '';
        const what = /\.pdf$/i.test(link) ? 'Read the Full Document (PDF)' : (/youtu|vimeo|video/i.test(link) || /^video-/.test(slug)) ? 'Watch the Video' : 'Read the Full Story';
        out.push(`<figure class="linked"><a href="${escText(link)}"${ext}>${img}</a><figcaption><a href="${escText(link)}"${ext}>${what} &rsaquo;</a></figcaption></figure>`);
      } else out.push(`<figure>${img}</figure>`);
      continue;
    }
    if (t === 'br') { if (inBlock()) out.push('<br>'); continue; }
    if (BLOCKS.has(t)) {
      if (close) { if (open(t)) closeTo(t); continue; }
      if (t === 'li') { if (!open('ul') && !open('ol')) { closeTo(stack[0] || 'p'); out.push('<ul>'); stack.push('ul'); } }
      else if (t === 'p' || t.startsWith('h')) { while (stack.length && !['li', 'blockquote'].includes(stack[stack.length - 1])) closeTo(stack[stack.length - 1]); }
      else if (t === 'ul' || t === 'ol') { while (stack.length && !['li', 'blockquote'].includes(stack[stack.length - 1])) closeTo(stack[stack.length - 1]); }
      out.push(`<${t}>`); stack.push(t); continue;
    }
    if (INLINE[t]) {
      t = INLINE[t];
      if (close) { if (open(t)) closeTo(t); continue; }
      ensureP();
      if (t === 'a') {
        const href = fixHref((attrs.match(/href="([^"]*)"/) || [])[1] || '');
        if (!href) { out.push('<a>'); stack.push('a'); continue; }
        const ext = /^https?:/i.test(href);
        curHref = href;
        out.push(`<a href="${escText(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>`);
      } else out.push(`<${t}>`);
      stack.push(t); continue;
    }
    // div, span, font, u ... : dropped, content kept
  }
  while (stack.length) out.push(`</${stack.pop()}>`);
  let h = out.join('');
  // tidy: no <a> without href, no empty tags, paragraph breaks instead of <br><br>, no stray spaces
  h = h.replace(/<a>([\s\S]*?)<\/a>/g, '$1');
  for (let k = 0; k < 4; k++) h = h.replace(/<(strong|em|a)\b[^>]*>(\s|<br>)*<\/\1>/g, '$2').replace(/<(p|h2|h3|h4|li|blockquote)>(\s|<br>)*<\/\1>/g, '').replace(/<(ul|ol)>\s*<\/\1>/g, '');
  h = h.replace(/(\s*<br>\s*){2,}/g, '</p><p>').replace(/<p>(\s*<br>)+/g, '<p>').replace(/(<br>\s*)+<\/p>/g, '</p>');
  h = h.replace(/<p>\s*<\/p>/g, '').replace(/>\s+</g, m => m.includes('\n') ? '><' : m).replace(/\s+<\/(p|li|h2|h3|h4)>/g, '</$1>').replace(/<(p|li|h2|h3|h4)>\s+/g, '<$1>');
  // headings that are entirely bold: just the heading
  h = h.replace(/<(h2|h3|h4)><strong>([\s\S]*?)<\/strong><\/\1>/g, '<$1>$2</$1>');
  // collapse stray spaces first: Duda split some words across <span>s ("e   ven"), which typos.json then joins
  h = h.replace(/ {2,}/g, ' ').replace(/ ([,.;:!?])(?=\s|<|$)/g, '$1');
  return fixTypos(h).replace(/<\/(p|h2|h3|h4|ul|ol|blockquote|figure)>/g, '</$1>\n');
}

// ---------- pictures that were links on the old page (the feed drops those links): { "image-file.jpg": "link" }
const linkCache = {};
function linkedImages(slug) {
  if (linkCache[slug]) return linkCache[slug];
  const out = {}, f = path.join(BK, 'pages', slug + '.html');
  if (fs.existsSync(f)) {
    const t = fs.readFileSync(f, 'utf8'), i = t.indexOf('blog-post-row'), j = t.indexOf('Older Post', i);
    const body = i < 0 ? '' : t.slice(i, j > 0 ? j : t.length);
    for (const m of body.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>((?:(?!<\/a>)[\s\S])*?<img\b[^>]*src="([^"]+)")/g)) {
      const name = path.basename(decodeURIComponent(ent(m[3]))).replace(/-\d+w(\.\w+)$/, '$1');
      out[name] = fixHref(m[1]);
    }
  }
  return (linkCache[slug] = out);
}

// ---------- YouTube embeds Duda's feed left out: find them in the saved page, put them back after the text before them
function videosFromPage(slug) {
  const f = path.join(BK, 'pages', slug + '.html');
  if (!fs.existsSync(f)) return [];
  const t = fs.readFileSync(f, 'utf8');
  const i = t.indexOf('blog-post-row'); if (i < 0) return [];
  const j = t.indexOf('Older Post', i), body = t.slice(i, j > 0 ? j : t.length);
  const out = [];
  for (const m of body.matchAll(/<iframe[^>]+src="[^"]*youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/g)) {
    const before = text(body.slice(Math.max(0, m.index - 1500), m.index)).slice(-60);
    out.push({ id: m[1], before });
  }
  return out;
}

// ---------- run
const items = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
const posts = [], resize = [];
fs.mkdirSync(path.join(ROOT, 'site', 'posts'), { recursive: true });
for (const it of items) {
  const link = text(tag(it, 'link'));
  const slug = new URL(link).pathname.replace(/^\/|\/$/g, '');
  const rawTitle = fixTypos(ent(tag(it, 'title')).trim());
  const { source, title } = splitSource(rawTitle);
  const date = new Date(text(tag(it, 'pubDate')));
  const bodyRaw = ent(tag(it, 'content:encoded'));
  const h3 = bodyRaw.match(/^\s*<div[^>]*>\s*<h3[^>]*>([\s\S]*?)<\/h3>/);
  const subtitle = fixTypos(h3 ? text(h3[1]) : '');
  let author = '';
  const pg = path.join(BK, 'pages', slug + '.html');
  if (fs.existsSync(pg)) { const m = fs.readFileSync(pg, 'utf8').match(/data-blog-template="bind-author"[^>]*>\s*([^<&]+?)\s*&bull;/); if (m) author = ent(m[1]).trim(); }
  const images = [];
  let body = clean(bodyRaw, slug, images);
  // the subtitle is shown under the headline, so drop its copy at the top of the story
  if (subtitle) body = body.replace(/^\s*<h[23]>([\s\S]*?)<\/h[23]>\n?/, (all, inner) => text(inner) === subtitle ? '' : all);
  // reposts: their opening subhead becomes the deck, "By NAME" goes into the byline, the duplicate date line goes
  let subtitleOut = subtitle, reporter = '';
  if (source) {
    if (!subtitleOut) body = body.replace(/^\s*<h[23]>([\s\S]*?)<\/h[23]>\n?/, (all, inner) => { subtitleOut = text(inner); return ''; });
    const head = body.slice(0, 1200);
    const dl = head.match(/<p>\s*[A-Z][A-Za-z]+\.? \d{1,2}, \d{4}(?:[^<]{0,30}(?:AM|PM|ET))?\s*<\/p>\n?/);
    if (dl) body = body.replace(dl[0], '');
    const by = body.slice(0, 1200).match(/<p>\s*By\s+(?:<a[^>]*>)?([A-Za-z.'\- ]{3,40})(?:<\/a>)?\s*<\/p>\n?/i);
    if (by) { reporter = by[1].trim().toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()); body = body.replace(by[0], ''); }
  }
  // story-by-story changes Ben approved (tools/post-edits.json): dead links removed, update notes added
  const edit = EDITS[slug];
  if (edit) {
    for (const u of edit.unlink || []) body = body.split(`<a href="${escText(u)}" target="_blank" rel="noopener">`).map((part, k) => k ? part.replace('</a>', '') : part).join('');
    for (const [from, to] of Object.entries(edit.relink || {})) body = body.split(`<a href="${escText(from)}" target="_blank" rel="noopener">`).join(`<a href="${escText(to)}"${/^https?:/.test(to) ? ' target="_blank" rel="noopener"' : ''}>`);
    for (const [from, to] of Object.entries(edit.relabel || {})) body = body.split(escText(from)).join(escText(to));
    if (edit.note) body = `<p class="update-note">${escText(edit.note)}</p>\n` + body;
  }
  let video = false;
  for (const v of videosFromPage(slug)) {
    const embed = `<figure class="video"><iframe src="https://www.youtube-nocookie.com/embed/${v.id}" title="Video" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></figure>\n`;
    const key = v.before.slice(-30).trim();
    const at = key ? body.indexOf(escText(key)) : -1;
    const end = at >= 0 ? body.indexOf('\n', at) : -1;
    body = end >= 0 ? body.slice(0, end + 1) + embed + body.slice(end + 1) : body + embed;
    video = true;
  }
  fs.writeFileSync(path.join(ROOT, 'site', 'posts', slug + '.html'), body);
  // the main picture (feed enclosure) for cards and the top of the story
  const enc = it.match(/<enclosure url="([^"]+)"/);
  let image = '';
  if (enc) { const src = backupFileFor(ROOT, ent(enc[1])); if (src) { image = `img/posts/${slug}.jpg`; resize.push(`${src}|${path.join(ROOT, 'site', image)}|1400`); } }
  images.forEach(([src, pub]) => resize.push(`${src}|${path.join(ROOT, 'site', pub)}|1400`));
  const firstP = text((body.match(/<p>([\s\S]*?)<\/p>/g) || []).find(p => text(p).length > 60) || '');
  posts.push({ slug, title, source, date: date.toISOString(), author: reporter || author, subtitle: subtitleOut, excerpt: firstP.slice(0, 280), image, video, words: text(body).split(' ').length });
}
posts.sort((a, b) => b.date.localeCompare(a.date));
fs.mkdirSync(path.join(ROOT, 'site', 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'site', 'data', 'posts.json'), JSON.stringify(posts, null, 1));
const list = path.join(ROOT, 'tools', '.resize-list.txt');
fs.writeFileSync(list, resize.join('\n'), 'utf8');
const out = execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'tools', 'resize-batch.ps1'), '-List', list], { encoding: 'utf8' });
fs.unlinkSync(list);
const fails = out.split('\n').filter(l => l.startsWith('FAIL'));
console.log(`posts: ${posts.length}  sourced reposts: ${posts.filter(p => p.source).length}  pictures: ${resize.length}  picture failures: ${fails.length}  videos: ${posts.filter(p => p.video).length}`);
fails.forEach(f => console.log('  ' + f));
