// Congressional district maps for the Legislation page's "Your Members of Congress" section (Ben, Nov 20 2026).
// One file per state/territory: site/congress/districts/<ST>.json  { st, name, w, h, land, districts: [{ n, d, x, y }] }
//   land      = the state's shoreline outline (used as a clip path, so districts stop at the water's edge)
//   districts = n: district number (0 = at-large / delegate), d: SVG path, x/y: label point
// Each state is drawn in its own simple projection (longitude scaled by cos(mid-latitude)), fitted to 600 units wide.
// Sources (public domain, U.S. Census Bureau):
//   districts: TIGER/Line 2026, 120th Congress  https://www2.census.gov/geo/tiger/TIGER2026/CD/tl_2026_<FIPS>_cd120.zip
//   shoreline: cartographic boundary 1:500,000  https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_500k.zip
// Run: node tools/make-congress-map.mjs <folder with the unzipped .shp/.dbf files>
// When Congress changes (new lines after a census or a mid-decade redraw), download the new files and re-run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readShapefile } from './lib/shp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = process.argv[2];
if (!DIR) { console.error('usage: node tools/make-congress-map.mjs <folder>'); process.exit(1); }
const OUT = path.join(ROOT, 'site', 'congress', 'districts');
fs.mkdirSync(OUT, { recursive: true });

const W = 600, MAXH = 640, TOL = 0.45;   // map units; TOL = how much detail to drop (Douglas-Peucker)
const r1 = v => Math.round(v * 10) / 10;

// Douglas-Peucker on one ring. A closed ring (first point = last) is split at its farthest point first, or the
// first/last anchor line has zero length and the whole ring collapses.
function simplify(pts, tol) {
  if (pts.length > 3) {
    let m = 0, far = -1;
    pts.forEach((p, i) => { const d = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]); if (d > far) { far = d; m = i; } });
    if (m > 0 && m < pts.length - 1) return [...dp(pts.slice(0, m + 1), tol).slice(0, -1), ...dp(pts.slice(m), tol)];
  }
  return dp(pts, tol);
}
function dp(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let max = 0, idx = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len; if (d > max) { max = d; idx = i; } }
    if (max > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const area = r => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(s / 2); };
const pathOf = (rings, proj) => rings.map(r => r.map(([lo, la]) => proj(lo, la))).map(r => simplify(r, TOL))
  .filter(r => r.length > 3 && area(r) > 0.6)   // drop specks (tiny islands) — the clip and the address finder still cover them
  .map(r => r.map((p, i) => (i ? 'L' : 'M') + r1(p[0]) + ',' + r1(p[1])).join('') + 'Z').join('');
const fixLon = lo => (lo > 0 ? lo - 360 : lo);   // Alaska's Aleutians and Guam-side longitudes stay on one side

const land = readShapefile(path.join(DIR, 'cb_2024_us_state_500k.shp'));
const landBy = Object.fromEntries(land.map(f => [f.props.STATEFP, f]));
let total = 0;
for (const f of fs.readdirSync(DIR).filter(n => /^tl_\d{4}_\d\d_cd\d+\.shp$/.test(n))) {
  const feats = readShapefile(path.join(DIR, f));
  const fips = feats[0].props.STATEFP, L = landBy[fips];
  if (!L) { console.warn('no shoreline for', fips); continue; }
  const st = L.props.STUSPS, west = !['60', '66', '69'].includes(fips);   // Pacific territories sit east of 180°
  const lonOf = lo => (west ? fixLon(lo) : (lo < 0 ? lo + 360 : lo));
  // bounds from the LAND outline (districts run out into lakes and the sea)
  const pts = L.parts.flat().map(([lo, la]) => [lonOf(lo), la]);
  const lo0 = Math.min(...pts.map(p => p[0])), lo1 = Math.max(...pts.map(p => p[0]));
  const la0 = Math.min(...pts.map(p => p[1])), la1 = Math.max(...pts.map(p => p[1]));
  const k0 = Math.cos(((la0 + la1) / 2) * Math.PI / 180);
  let s = W / ((lo1 - lo0) * k0); if ((la1 - la0) * s > MAXH) s = MAXH / (la1 - la0);
  const w = Math.ceil((lo1 - lo0) * k0 * s), h = Math.ceil((la1 - la0) * s);
  const proj = (lo, la) => [(lonOf(lo) - lo0) * k0 * s, (la1 - la) * s];
  const fld = Object.keys(feats[0].props).find(k => /^CD\d+FP$/.test(k));
  const districts = feats.filter(x => x.props[fld] !== 'ZZ').map(x => {
    const n = +x.props[fld] === 98 ? 0 : +x.props[fld];       // 98 = non-voting delegate (DC, territories)
    const [lx, ly] = proj(+x.props.INTPTLON, +x.props.INTPTLAT);
    return { n, d: pathOf(x.parts, proj), x: r1(lx), y: r1(ly) };
  }).sort((a, b) => a.n - b.n);
  const out = { st, name: L.props.NAME, w, h, land: pathOf(L.parts, proj), districts };
  const file = path.join(OUT, st + '.json');
  fs.writeFileSync(file, JSON.stringify(out));
  total += fs.statSync(file).size;
  console.log(st.padEnd(3), String(districts.length).padStart(3), 'districts', (fs.statSync(file).size / 1024).toFixed(0).padStart(4) + ' KB', `${w}x${h}`);
}
console.log('total', (total / 1024 / 1024).toFixed(2), 'MB');
