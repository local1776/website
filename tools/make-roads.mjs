// Make the zoomed-map layer (Ben, Nov 20 2026: zoom in to see interstates and highways — not every road):
// site/map/<CODE>.json  { { i: "path d", us: "...", st: "...", shields: [[x,y,"10"]], cities: [[x,y,"Name",rank]] } }
// Source: Natural Earth 1:10m roads + populated places (public domain), naturalearthdata.com. Download and unzip
//   https://naciscdn.org/naturalearth/10m/cultural/ne_10m_roads.zip
//   https://naciscdn.org/naturalearth/10m/cultural/ne_10m_populated_places_simple.zip
// Run: node tools/make-roads.mjs <dir containing both unzipped folders>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readShapefile } from './lib/shp.mjs';
import { project } from './lib/albers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2];
const units = JSON.parse(fs.readFileSync(path.join(ROOT, 'site', 'data', 'units.json'), 'utf8'));
const usStates = JSON.parse(fs.readFileSync(path.join(ROOT, 'site', 'data', 'us-states.json'), 'utf8'));
const STATE_NAME = Object.fromEntries(usStates.map(s => [s.abbr, s.name]));

const box = d => { const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number); const xs = n.filter((_, i) => !(i % 2)), ys = n.filter((_, i) => i % 2); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const pad = (b, p) => { const w = b[2] - b[0], h = b[3] - b[1], m = Math.max(w, h) * p; return [b[0] - m, b[1] - m, b[2] + m, b[3] + m]; };
const inBox = (b, [x, y]) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
const r2 = v => Math.round(v * 100) / 100;

// roads in the US, projected once
const roads = readShapefile(path.join(dir, 'ne_10m_roads', 'ne_10m_roads.shp'))
  .filter(f => f.props.sov_a3 === 'USA' && /Highway|Beltway|Bypass|Road/.test(f.props.type))
  .map(f => {
    const lvl = f.props.level;
    const cls = lvl === 'Interstate' ? 'i' : lvl === 'Federal' ? 'us' : 'st';
    return { cls, num: String(f.props.name || '').trim(), parts: f.parts.map(pt => pt.map(([lng, lat]) => project(lng, lat))) };
  })
  .filter(f => f.parts.length && f.parts[0].length);

const places = readShapefile(path.join(dir, 'ne_10m_populated_places_simple', 'ne_10m_populated_places_simple.shp'))
  .filter(f => f.props.adm0_a3 === 'USA')
  .map(f => ({ name: f.props.nameascii || f.props.name, state: f.props.adm1name, rank: f.props.scalerank, pop: f.props.pop_max, xy: project(f.props.longitude, f.props.latitude) }));

// lakes (Ben, Nov 20 2026: Lake Pontchartrain was missing — the Census outlines count it as land)
const neLakes = ['ne_10m_lakes', 'ne_10m_lakes_north_america'].flatMap(z => {
  const p = path.join(dir, z, z + '.shp');
  return fs.existsSync(p) ? readShapefile(p).map(f => f.parts) : [];
});
const osmFile = path.join(ROOT, 'site', 'data', 'osm-lakes.json');
const osmLakes = fs.existsSync(osmFile) ? JSON.parse(fs.readFileSync(osmFile, 'utf8')).map(l => l.rings) : [];
const llBox = parts => { const pts = parts.flat(); return [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))]; };
const overlaps = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const osmBoxes = osmLakes.map(llBox);
const lakes = neLakes.filter(parts => !osmBoxes.some(b => overlaps(llBox(parts), b)))   // drop rough copies of lakes OSM has
  .concat(osmLakes).map(parts => parts.map(pt => pt.map(([lng, lat]) => project(lng, lat))));

// a path, simplified: drop points closer than `tol` map units to the last kept one
const toD = (parts, tol) => parts.map(pt => {
  const keep = [pt[0]];
  for (let k = 1; k < pt.length; k++) { const a = keep[keep.length - 1], b = pt[k]; if (k === pt.length - 1 || Math.hypot(b[0] - a[0], b[1] - a[1]) >= tol) keep.push(b); }
  return 'M' + keep.map(p => r2(p[0]) + ',' + r2(p[1])).join('L');
}).join('');

const out = {};
for (const u of units) {
  if (u.code === 'GU') continue;                         // no roads for Guam in this dataset
  const boxes = u.states.map(s => pad(box(usStates.find(x => x.abbr === s).d), 0.18));
  const touches = f => f.parts.some(pt => pt.some(p => boxes.some(b => inBox(b, p))));
  const mine = roads.filter(touches);
  const wet = lakes.filter(parts => parts.some(pt => pt.some(p => boxes.some(b => inBox(b, p)))));
  const layer = { w: toD(wet.flat(), 0.03), i: toD(mine.filter(f => f.cls === 'i').flatMap(f => f.parts), 0.08), us: toD(mine.filter(f => f.cls === 'us').flatMap(f => f.parts), 0.08), st: toD(mine.filter(f => f.cls === 'st').flatMap(f => f.parts), 0.08), shields: [], cities: [] };
  // one interstate shield per number per state: the middle of its longest stretch inside the state's box
  const inner = u.states.map(s => box(usStates.find(x => x.abbr === s).d));
  const best = {};
  // shields come from the whole padded area; a 4th value 1 marks one outside the state (shown only when zoomed in)
  mine.filter(f => f.cls === 'i' && /^\d+$/.test(f.num)).forEach(f => f.parts.forEach(pt => {
    const inside = pt.filter(p => inner.some(b => inBox(b, p)));
    const near = pt.filter(p => boxes.some(b => inBox(b, p)));
    const cand = inside.length >= 3 ? { pts: inside, out: 0 } : near.length >= 3 ? { pts: near, out: 1 } : null;
    if (!cand) return;
    const cur = best[f.num];
    if (!cur || (cur.out && !cand.out) || (cur.out === cand.out && cand.pts.length > cur.pts.length)) best[f.num] = cand;
  }));
  // cities in the padded area (biggest first; rank: lower = bigger, Natural Earth scalerank).
  // A 5th value 1 marks a city across the state line — shown only when zoomed in (Ben: Arlington → see DC).
  const names = u.states.map(s => STATE_NAME[s]);
  layer.cities = places.filter(p => names.includes(p.state) || boxes.some(b => inBox(b, p.xy))).sort((a, b) => a.rank - b.rank || b.pop - a.pop)
    .map(p => [r2(p.xy[0]), r2(p.xy[1]), p.name, p.rank, names.includes(p.state) ? 0 : 1]);
  // put each shield on its road where it stays clear of the city names: walk out from the middle of the stretch
  // and take the first point far enough from every city label (labels run to the right of their dot)
  const stateW = Math.max(...inner.map(b => b[2] - b[0]));
  const clear = stateW * 0.07;
  const farFromCities = p => layer.cities.every(c => Math.hypot(p[0] - (c[0] + clear * 0.6), p[1] - c[1]) > clear);
  layer.shields = Object.entries(best).map(([num, { pts, out }]) => {
    const mid = Math.floor(pts.length / 2);
    let p = pts[mid];
    for (let d = 0; d < pts.length; d++) {
      const a = pts[mid + d], b = pts[mid - d];
      if (a && farFromCities(a)) { p = a; break; }
      if (b && farFromCities(b)) { p = b; break; }
    }
    return [r2(p[0]), r2(p[1]), num, out];
  });
  out[u.code] = layer;
}
// one small file per unit (site/map/LA.json ...) so a visitor only downloads the state they open
fs.mkdirSync(path.join(ROOT, 'site', 'map'), { recursive: true });
for (const [k, v] of Object.entries(out)) {
  const file = path.join(ROOT, 'site', 'map', k + '.json');
  fs.writeFileSync(file, JSON.stringify(v));
  console.log(k, Math.round(fs.statSync(file).size / 1024) + ' KB', 'shields', v.shields.length, 'cities', v.cities.length);
}
