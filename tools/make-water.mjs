// Detailed shorelines for lakes the Census state outlines treat as land, from OpenStreetMap (© OpenStreetMap
// contributors, ODbL). Ben, Nov 20 2026: "the Louisiana map doesn't show Lake Pontchartrain".
// Writes site/data/osm-lakes.json  [{ name, rings: [[[lng, lat], ...], ...] }]  — make-roads.mjs merges these with
// Natural Earth's lakes (and drops Natural Earth's rough copy of the same lake).
// Run: node tools/make-water.mjs   then   node tools/make-roads.mjs <natural earth dir>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAKES = ['Lake Pontchartrain', 'Lake Maurepas'];
const q = `[out:json][timeout:120];(${LAKES.map(n => `relation["natural"="water"]["name"="${n}"];way["natural"="water"]["name"="${n}"];`).join('')});out geom;`;
const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'User-Agent': 'local1776-site-build/1.0', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q) });
if (!r.ok) throw new Error('Overpass ' + r.status);
const j = await r.json();

// join a multipolygon's outer ways end-to-end into closed rings
function joinRings(lines) {
  const rings = [], pool = lines.map(l => l.slice());
  while (pool.length) {
    let ring = pool.shift();
    let grew = true;
    while (grew && !(ring.length > 3 && same(ring[0], ring[ring.length - 1]))) {
      grew = false;
      for (let i = 0; i < pool.length; i++) {
        const l = pool[i], end = ring[ring.length - 1];
        if (same(l[0], end)) { ring = ring.concat(l.slice(1)); }
        else if (same(l[l.length - 1], end)) { ring = ring.concat(l.slice().reverse().slice(1)); }
        else if (same(l[l.length - 1], ring[0])) { ring = l.concat(ring.slice(1)); }
        else if (same(l[0], ring[0])) { ring = l.slice().reverse().concat(ring.slice(1)); }
        else continue;
        pool.splice(i, 1); grew = true; break;
      }
    }
    if (ring.length > 3) rings.push(ring);
  }
  return rings;
}
const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7;

const out = [];
for (const e of j.elements) {
  const name = e.tags && e.tags.name;
  if (!name) continue;
  let rings = [];
  if (e.type === 'way' && e.geometry) rings = [e.geometry.map(g => [g.lon, g.lat])];
  if (e.type === 'relation') rings = joinRings(e.members.filter(m => m.type === 'way' && m.role !== 'inner' && m.geometry).map(m => m.geometry.map(g => [g.lon, g.lat])));
  if (!rings.length) continue;
  // light rounding (≈1 m) keeps the file small
  rings = rings.map(rg => rg.map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]));
  out.push({ name, rings });
  console.log(name, e.type, rings.length, 'rings', rings.reduce((a, rg) => a + rg.length, 0), 'points');
}
fs.writeFileSync(path.join(ROOT, 'site', 'data', 'osm-lakes.json'), JSON.stringify(out));
