// Story photos from the Union App (Ben, Nov 24 2026): the app stores the full-size original (2 MB and up). At every build this
// downloads each one and makes our own small copy: at most 1400px on the long side, JPEG, turned the right way up, camera and
// location details removed. Served from /img/news/. If anything fails, the story keeps the app's original, so it still shows.
// Resizing: ImageMagick on GitHub (installed by the workflow), tools/resize-image.ps1 on Ben's PC. No packages.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const MAX = 1400, LIMIT = 30 * 1048576;
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
const APP_PHOTO = /^https:\/\/firebasestorage\.googleapis\.com\//;   // only the app's own storage, never any other address

function resize(from, to, root) {
  if (process.platform === 'win32') {
    execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'tools', 'resize-image.ps1'), '-In', from, '-Out', to, '-Max', String(MAX)], { stdio: 'pipe', timeout: 60000 });
    return;
  }
  const args = [from + '[0]', '-auto-orient', '-resize', `${MAX}x${MAX}>`, '-background', 'white', '-alpha', 'remove', '-strip', '-interlace', 'Plane', '-quality', '82', to];
  try { execFileSync('magick', args, { stdio: 'pipe', timeout: 60000 }); }
  catch (e) { if (e.code !== 'ENOENT') throw e; execFileSync('convert', args, { stdio: 'pipe', timeout: 60000 }); }   // older ImageMagick
}

// url → 'img/news/<slug>-<id>.jpg' (our copy, written into out), or the same url when it could not be made
async function shrink(url, slug, out, root, tmp) {
  if (!APP_PHOTO.test(url)) return url;
  try {
    const rel = `img/news/${slug}-${createHash('sha1').update(url).digest('hex').slice(0, 10)}.jpg`, to = path.join(out, rel);
    if (fs.existsSync(to)) return rel;
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error('answered ' + r.status);
    const ext = TYPES[(r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()];
    if (!ext) throw new Error('not a photo (' + r.headers.get('content-type') + ')');
    const bytes = Buffer.from(await r.arrayBuffer());
    if (bytes.length > LIMIT) throw new Error('too large');
    const from = path.join(tmp, path.basename(rel, '.jpg') + '-original.' + ext);
    fs.writeFileSync(from, bytes);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    resize(from, to, root);
    if (!fs.existsSync(to) || !fs.statSync(to).size) throw new Error('no copy was made');
    console.log(`photo: ${rel} (${Math.round(bytes.length / 1024)} KB → ${Math.round(fs.statSync(to).size / 1024)} KB)`);
    return rel;
  } catch (e) { console.warn(`photo: the app's original is used for "${slug}" (${e.message})`); return url; }
}

// every app story's main photo and the photos inside its text
export async function storyPhotos(stories, out, root, offline) {
  if (offline || !stories.length) return;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'l1776-photos-'));
  try {
    for (const s of stories) {
      if (s.image) s.image = await shrink(s.image, s.slug, out, root, tmp);
      const inside = [...new Set([...s.html.matchAll(/<img\b[^>]*?\bsrc="([^"]+)"/g)].map(m => m[1]))];
      for (const src of inside) {
        const got = await shrink(src.replace(/&amp;/g, '&'), s.slug, out, root, tmp);
        if (!/^https?:/.test(got) && got !== src) s.html = s.html.split(`src="${src}"`).join(`src="/${got}"`);
      }
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
