// Make the US state outlines used by the Agencies map: site/data/us-states.json  [{fips, abbr, name, d}]
// Source: us-atlas 3.0.1 "states-albers-10m" (US Census boundaries, already projected to a 975x610 Albers USA map),
// fetched once from jsDelivr and decoded here (TopoJSON -> SVG paths). Re-run only if the outlines need remaking.
// Run: node tools/make-map.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL_ = 'https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-albers-10m.json';
const topo = await (await fetch(URL_)).json();

const FIPS = { '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY', '72': 'PR' };

// decode quantized, delta-encoded arcs
const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
const arcs = topo.arcs.map(arc => { let x = 0, y = 0; return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
const ring = idx => {
  const pts = [];
  for (const i of idx) {
    const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
    a.forEach((p, k) => { if (k || !pts.length) pts.push(p); });
  }
  return pts;
};
const r1 = n => Math.round(n * 10) / 10;
const pathOf = rings => rings.map(r => {
  const pts = ring(r); let out = '', last = '';
  pts.forEach((p, k) => { const s = `${r1(p[0])},${r1(p[1])}`; if (s !== last) { out += (k ? 'L' : 'M') + s; last = s; } });
  return out + 'Z';
}).join('');

const states = topo.objects.states.geometries.map(g => {
  const polys = g.type === 'Polygon' ? [g.arcs] : g.arcs;
  return { fips: g.id, abbr: FIPS[g.id] || g.id, name: g.properties.name, d: polys.map(pathOf).join('') };
}).sort((a, b) => a.name.localeCompare(b.name));

fs.mkdirSync(path.join(ROOT, 'site', 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'site', 'data', 'us-states.json'), JSON.stringify(states));
console.log(`states: ${states.length}  bytes: ${fs.statSync(path.join(ROOT, 'site', 'data', 'us-states.json')).size}`);

// ---------- Guam (Ben, Nov 20 2026: on the Pacific side, in its real shape) ----------
// Outline: U.S. Census Bureau 1:500,000 coastline (site/data/guam-outline.json, made by tools/guam-outline.mjs —
// Ben, Nov 20 2026: the 1:10m world-map outline was "too smooth"). Drawn as an inset WEST of California (the map's
// viewBox is widened to the left for it). Saved with its own lon/lat -> map conversion so Guam work sites land on it.
const gRings = JSON.parse(fs.readFileSync(path.join(ROOT, 'site', 'data', 'guam-outline.json'), 'utf8')).rings;
const all = gRings.flat();
const lon0 = Math.min(...all.map(p => p[0])), lon1 = Math.max(...all.map(p => p[0]));
const lat0 = Math.min(...all.map(p => p[1])), lat1 = Math.max(...all.map(p => p[1]));
const cosLat = Math.cos(((lat0 + lat1) / 2) * Math.PI / 180);
const BOX = { x: -100, y: 285, w: 74, h: 96 };                         // where the island is drawn (map units)
const k = Math.min(BOX.w / ((lon1 - lon0) * cosLat), BOX.h / (lat1 - lat0));
const ox = BOX.x + (BOX.w - (lon1 - lon0) * cosLat * k) / 2, oy = BOX.y + (BOX.h - (lat1 - lat0) * k) / 2;
const gp = (lon, lat) => [ox + (lon - lon0) * cosLat * k, oy + (lat1 - lat) * k];
const gd = gRings.map(r => r.map((p, i) => { const [x, y] = gp(p[0], p[1]); return (i ? 'L' : 'M') + r1(x) + ',' + r1(y); }).join('') + 'Z').join('');
fs.writeFileSync(path.join(ROOT, 'site', 'data', 'guam.json'), JSON.stringify({ d: gd, box: BOX, proj: { lon0, lat1, cosLat, k, ox, oy } }));
console.log('guam: points', all.length, 'box', BOX);
