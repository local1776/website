// Main streets around every work site, for the zoomed-in map (Ben, Nov 20 2026: "be able to see the roads around it —
// not every street, just the main streets, like highways, interstates and major avenues").
// Source: OpenStreetMap via the Overpass API (© OpenStreetMap contributors, ODbL — the map shows that credit).
// Writes:
//   site/map/streets/<CODE>.json  { m: "path d" (motorways/trunks), p: primary, s: secondary, t: tertiary,
//                                   names: [[x, y, angleDeg, "Name", cls]] }   — lower-48 units, around each site
//   site/map/GU.json              Guam's main roads + village names, in the same shape as the other road layers
// Run: node tools/make-streets.mjs [CODE ...]   (all units + Guam, or only the codes given; GU = Guam)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { project } from './lib/albers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facilities = JSON.parse(fs.readFileSync(path.join(ROOT, 'site', 'data', 'facilities.json'), 'utf8'));
const guam = JSON.parse(fs.readFileSync(path.join(ROOT, 'site', 'data', 'guam.json'), 'utf8'));
const ENDPOINT = 'https://overpass-api.de/api/interpreter';
const UA = 'local1776-site-build/1.0';
const RADIUS = 4500;                                   // metres around each work site
const HW = 'motorway|trunk|primary|secondary|tertiary';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function overpass(q) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q) });
    if (r.ok) return r.json();
    console.warn('  overpass', r.status, '— retrying');
    await sleep(8000 * (i + 1));
  }
  throw new Error('Overpass failed');
}

const cls = h => /^(motorway|trunk)/.test(h) ? 'm' : h.startsWith('primary') ? 'p' : h.startsWith('secondary') ? 's' : 't';
const rd = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

// turn OSM ways into simplified path strings per class + one label per street name (its longest piece, mid-point)
function build(ways, proj, digits, tol) {
  const out = { m: '', p: '', s: '', t: '', names: [] };
  const best = {};
  for (const w of ways) {
    if (!w.geometry || w.geometry.length < 2) continue;
    const c = cls(w.tags.highway);
    const pts = w.geometry.map(g => proj(g.lon, g.lat));
    const keep = [pts[0]];
    for (let k = 1; k < pts.length; k++) { const a = keep[keep.length - 1], b = pts[k]; if (k === pts.length - 1 || Math.hypot(b[0] - a[0], b[1] - a[1]) >= tol) keep.push(b); }
    out[c] += 'M' + keep.map(p => rd(p[0], digits) + ',' + rd(p[1], digits)).join('L');
    const name = w.tags.ref && c === 'm' ? w.tags.ref.split(';')[0] : (w.tags.name || '');
    if (!name || c === 't') continue;
    let len = 0; for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    if (!best[name] || len > best[name].len) best[name] = { len, pts, c };
  }
  for (const [name, b] of Object.entries(best)) {
    const i = Math.floor((b.pts.length - 1) / 2), a = b.pts[i], z = b.pts[Math.min(i + 1, b.pts.length - 1)];
    let ang = Math.atan2(z[1] - a[1], z[0] - a[0]) * 180 / Math.PI;
    if (ang > 90) ang -= 180; if (ang < -90) ang += 180;          // keep text upright
    out.names.push([rd((a[0] + z[0]) / 2, digits), rd((a[1] + z[1]) / 2, digits), Math.round(ang), name, b.c]);
  }
  return out;
}

const only = process.argv.slice(2).map(a => a.toUpperCase());
const units = [...new Set(facilities.filter(f => f.unit !== 'GU').map(f => f.unit))].filter(u => !only.length || only.includes(u));
fs.mkdirSync(path.join(ROOT, 'site', 'map', 'streets'), { recursive: true });
for (const u of units) {
  const sites = facilities.filter(f => f.unit === u && f.lat);
  // a few sites per request (a big state in one request times out and comes back empty)
  const seen = new Map();
  for (let k = 0; k < sites.length; k += 6) {
    const batch = sites.slice(k, k + 6);
    const q = `[out:json][timeout:180];(${batch.map(f => `way(around:${RADIUS},${f.lat},${f.lng})[highway~"^(${HW})(_link)?$"];`).join('')});out geom;`;
    const j = await overpass(q);
    if (j.remark) console.warn('  note:', j.remark);
    j.elements.filter(e => e.type === 'way').forEach(e => seen.set(e.id, e));
    await sleep(3000);
  }
  const j = { elements: [...seen.values()] };
  const layer = build(j.elements, (lng, lat) => project(lng, lat), 3, 0.004);
  const file = path.join(ROOT, 'site', 'map', 'streets', u + '.json');
  fs.writeFileSync(file, JSON.stringify(layer));
  console.log(u, j.elements.length, 'ways', Math.round(fs.statSync(file).size / 1024) + ' KB', layer.names.length, 'names');
  await sleep(4000);
}

// Guam: the whole island's main roads and villages, drawn in the Guam inset's own coordinates
if (!only.length || only.includes('GU')) {
  const g = guam.proj;
  const gp = (lng, lat) => [g.ox + (lng - g.lon0) * g.cosLat * g.k, g.oy + (g.lat1 - lat) * g.k];
  const q = `[out:json][timeout:120];(way(13.2,144.6,13.7,145.0)[highway~"^(${HW})$"];node(13.2,144.6,13.7,145.0)[place~"^(city|town|village)$"];);out geom;`;
  const j = await overpass(q);
  const roads = build(j.elements.filter(e => e.type === 'way'), gp, 2, 0.08);
  const villages = j.elements.filter(e => e.type === 'node' && e.tags && e.tags.name).map(e => {
    const [x, y] = gp(e.lon, e.lat);
    const rank = e.tags.place === 'city' ? 3 : e.tags.place === 'town' ? 5 : 7;
    return [rd(x, 2), rd(y, 2), e.tags['name:en'] || e.tags.name, rank];
  });
  // same shape as the lower-48 road layers: main roads as "interstates", primary as "U.S.", the rest as "state"
  const seen = new Set();   // OSM lists a few villages twice (e.g. Barrigada)
  const unique = villages.sort((a, b) => a[3] - b[3]).filter(v => !seen.has(v[2]) && seen.add(v[2]));
  const layer = { i: roads.m + roads.p, us: roads.s, st: roads.t, shields: [], cities: unique, osm: 1 };
  fs.writeFileSync(path.join(ROOT, 'site', 'map', 'GU.json'), JSON.stringify(layer));
  console.log('GU', j.elements.length, 'elements', villages.length, 'villages');
}
