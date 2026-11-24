// Duda CDN links -> our own copies. Every file the old site stored on Duda's servers was saved in backup/files/;
// the new site serves the ones it uses from site/files/ (documents) under clean names.
import fs from 'node:fs';
import path from 'node:path';

export const SITE_ID = 'c40090aa';
export const isCdn = u => /(cdn-website\.com|multiscreensite\.com)\/+c40090aa\//i.test(u);

// backup file for a CDN url (originals first, then Duda's resized copy)
export function backupFileFor(root, url) {
  let p;
  try { p = decodeURIComponent(new URL(url.replace(/^\/\//, 'https://')).pathname); } catch { return null; }
  const rel = p.split('/' + SITE_ID + '/')[1];
  if (!rel) return null;
  const tries = [rel];
  const m = rel.match(/^(.*\/multi\/)opt\/(.+?)-\d+w(\.[A-Za-z0-9]+)$/);
  if (m) tries.push(m[1] + m[2] + m[3]);
  tries.push(rel.replace(/ /g, '+'), rel.replace(/\+/g, ' '));
  for (const t of tries) { const f = path.join(root, 'backup', 'files', ...t.split('/')); if (fs.existsSync(f)) return f; }
  return null;
}

// a clean public name: "Legislative Priorities FY25 NDAA.pdf" -> "legislative-priorities-fy25-ndaa.pdf"
export function cleanName(file) {
  const ext = path.extname(file).toLowerCase();
  const base = path.basename(file, path.extname(file)).replace(/[+_]+/g, ' ').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return (base || 'file') + ext;
}

// copy a backup document into site/files and return its public path ("/files/name.pdf")
export function publishFile(root, url) {
  const src = backupFileFor(root, url);
  if (!src) return null;
  const name = cleanName(src);
  const dest = path.join(root, 'site', 'files', name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!fs.existsSync(dest) || fs.statSync(dest).size !== fs.statSync(src).size) fs.copyFileSync(src, dest);
  return '/files/' + name;
}
