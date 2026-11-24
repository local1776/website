// News stories published from the Union App (Ben, Nov 22 2026; contract confirmed by the app agent the same day).
// The app publishes one public Firestore document per story at publicPosts/{slug} and an index at publicStats/newsIndex
// ({updatedAt, stories:[{slug,title,excerpt,date,kind,tags,image,imageAlt}] newest first (max 200), withdrawn:[slug]}).
// At every build this reads the index and each story, cleans the story HTML down to plain story formatting, and hands the
// build regular story objects. Photos: lib/photos.mjs makes our own small copies. Withdrawn stories get a
// "no longer available" page, not a 404. Nothing published yet (404) = no app stories. Last good copies are cached in
// site/data/news-cache/ for an offline build. --news-sample (this PC only) reads site/data/news-sample/ instead.
import fs from 'node:fs';
import path from 'node:path';
import { unwrap } from './lobby.mjs';

const docValue = doc => unwrap({ mapValue: { fields: (doc && doc.fields) || {} } });

// story HTML → only plain story formatting (the app's editor makes this; never trust it blindly)
const ALLOWED = { p: [], h2: [], h3: [], h4: [], ul: [], ol: [], li: [], a: ['href'], strong: [], b: [], em: [], i: [], blockquote: [],
  br: [], hr: [], figure: [], figcaption: [], img: ['src', 'alt'] };
export function cleanHtml(html) {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|form|template)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (m, tag, attrs) => {
      tag = tag.toLowerCase();
      if (!ALLOWED[tag]) return '';
      if (m.startsWith('</')) return `</${tag}>`;
      const keep = [];
      for (const name of ALLOWED[tag]) {
        const a = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(attrs);
        if (!a) continue;
        const v = (a[1] ?? a[2]).trim();
        if ((name === 'href' || name === 'src') && !/^(https?:\/\/|mailto:|\/)/i.test(v)) continue;   // no javascript: etc.
        keep.push(`${name}="${v.replace(/"/g, '&quot;')}"`);
      }
      if (tag === 'a') { const h = keep.find(k => k.startsWith('href=')); if (h && /^href="https?:/i.test(h) && !/^href="https?:\/\/(www\.)?local1776\.org/i.test(h)) keep.push('target="_blank" rel="noopener"'); }
      return `<${tag}${keep.length ? ' ' + keep.join(' ') : ''}>`;
    });
}

export async function appNews(src, offline, sample, project = 'liuna-local-1776') {
  const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/`;
  const dir = sample ? path.join(src, 'data', 'news-sample') : path.join(src, 'data', 'news-cache');
  fs.mkdirSync(dir, { recursive: true });
  const file = p => path.join(dir, p.replace(/\//g, '__') + '.json');
  let failed = false;
  // one document: null when it isn't published (404) or not readable (403); the cached copy when the network fails
  async function get(p) {
    if (sample || offline) return fs.existsSync(file(p)) ? JSON.parse(fs.readFileSync(file(p), 'utf8')) : null;
    try {
      const r = await fetch(base + p, { signal: AbortSignal.timeout(15000) });
      if (r.status === 404 || r.status === 403) { if (fs.existsSync(file(p))) fs.unlinkSync(file(p)); return null; }
      if (!r.ok) throw new Error(r.status);
      const doc = await r.json(); fs.writeFileSync(file(p), JSON.stringify(doc)); return doc;
    } catch (e) { failed = true; return fs.existsSync(file(p)) ? JSON.parse(fs.readFileSync(file(p), 'utf8')) : null; }
  }
  const index = await get('publicStats/newsIndex');
  if (!index) return { stories: [], withdrawn: [] };
  const ix = docValue(index), stories = [];
  for (const s of (ix.stories || []).slice(0, 200)) {
    if (!s || !/^[a-z0-9][a-z0-9-]*$/.test(s.slug || '')) continue;
    const doc = await get('publicPosts/' + s.slug);
    if (!doc) continue;
    const v = docValue(doc);
    if (v.status !== 'published') continue;
    const html = cleanHtml(v.body), img = v.image || {};
    stories.push({
      slug: s.slug, title: v.title || s.title || '', subtitle: v.subtitle || '', excerpt: v.excerpt || s.excerpt || '',
      date: v.date || s.date, updated: v.updated || '', author: v.author || '',
      source: v.kind === 'repost' ? (v.source || '') : '', sourceUrl: v.kind === 'repost' ? (v.sourceUrl || '') : '',
      image: img.url || '', imageAlt: img.alt || '', imageCaption: img.caption || '', imageCredit: img.credit || '',
      html, words: html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length, tags: v.tags || [], app: true,
    });
  }
  if (failed) console.warn('news: the app\'s stories were not refreshed — using the cached copies');
  return { stories, withdrawn: (ix.withdrawn || []).filter(x => /^[a-z0-9][a-z0-9-]*$/.test(x)) };
}
