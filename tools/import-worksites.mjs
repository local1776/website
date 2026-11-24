// Import the work-site facilities from the old Google "My Map" (backup/worksites-map.kml, "Facilities" folder)
// into site/data/facilities.json, with each site's map position on the Agencies map (Albers USA, 975x610 —
// the same projection the us-atlas state outlines use).
// Source map: https://www.google.com/maps/d/viewer?mid=1OtN0IHwNngPm7Oz7WaJCIU9jJGc  (Ben's; data last edited years ago)
// Run: node tools/import-worksites.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kml = fs.readFileSync(path.join(ROOT, 'backup', 'worksites-map.kml'), 'utf8');

import { project, round } from './lib/albers.mjs';

const unCdata = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
const ent = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'");
const folder = [...kml.matchAll(/<Folder>\s*<name>([\s\S]*?)<\/name>([\s\S]*?)<\/Folder>/g)].find(m => /Facitilies|Facilities/i.test(m[1]))[2];

const out = [];
for (const [, pm] of folder.matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)) {
  const raw = ent(unCdata(pm.match(/<name>([\s\S]*?)<\/name>/)[1])).replace(/\s+/g, ' ').trim();
  const data = Object.fromEntries([...pm.matchAll(/<Data name="([^"]+)">\s*<value>([\s\S]*?)<\/value>/g)].map(m => [m[1], ent(unCdata(m[2])).trim()]));
  const coord = (pm.match(/<coordinates>\s*([-\d.]+),([-\d.]+)/) || []);
  const lng = +coord[1], lat = +coord[2];
  let unit, rest;
  if (/^NGB PEC/.test(raw)) { unit = 'ARNG'; rest = 'Professional Education Center (PEC) - Camp Robinson, North Little Rock'; }
  else if (/^LIUNA/.test(raw)) continue;                          // union offices, not work sites
  else { const m = raw.match(/^([A-Z]{2})\s*-?\s+(.*)$/); if (!m) { console.warn('skipped:', raw); continue; } unit = m[1]; rest = m[2]; }
  const parts = rest.split(/\s+-\s+/);
  const name = parts.length > 1 ? parts.slice(0, -1).join(' - ') : parts[0];
  const place = parts.length > 1 ? parts[parts.length - 1] : '';
  const f = { unit, name, place, lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 };
  if (data.Address) f.address = data.Address;
  // Army or Air (Ben, Nov 20 2026: split them in states with both). Air units here are wings and squadrons.
  f.branch = /\b(FW|ASOS|CBCS|ATCS|ANG HQ|ARW|AW|RQW|ACS)\b/.test(name) ? 'Air' : 'Army';
  if (unit !== 'GU') { const [x, y] = project(lng, lat); f.x = round(x); f.y = round(y); }
  out.push(f);
}
// TARC is not on the old map. Herbert R. Temple, Jr. Army National Guard Readiness Center, 111 S. George Mason Dr., Arlington, VA.
{ const lat = 38.87005, lng = -77.10519; const [x, y] = project(lng, lat);
  out.push({ unit: 'ARNG', name: 'Army National Guard Readiness Center (TARC)', place: 'Arlington, VA', address: '111 S. George Mason Dr., Arlington, VA 22204', lat, lng, branch: 'Army', x: round(x), y: round(y) }); }

// street addresses the old map left blank, checked by Ben (site/data/facility-addresses.json, Nov 22 2026)
{
  const extra = JSON.parse(fs.readFileSync(path.join(ROOT, 'site', 'data', 'facility-addresses.json'), 'utf8')).sites;
  let used = 0;
  for (const a of extra) {
    const f = out.find(o => o.unit === a.unit && o.name === a.name && (o.place || '') === a.place);
    if (!f) { console.warn('facility-addresses.json: no such site', a.unit, a.name, a.place); continue; }
    if (!f.address) { f.address = a.address; used++; }
  }
  console.log('checked addresses added:', used);
}
out.sort((a, b) => a.unit.localeCompare(b.unit) || a.name.localeCompare(b.name, undefined, { numeric: true }));
fs.writeFileSync(path.join(ROOT, 'site', 'data', 'facilities.json'), JSON.stringify(out, null, 1));
const by = {}; out.forEach(f => by[f.unit] = (by[f.unit] || 0) + 1);
console.log('facilities:', out.length, by);
