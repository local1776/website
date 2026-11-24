// Pull Guam's coastline out of the U.S. Census Bureau cartographic boundary file (1:500,000) and save it as
// site/data/guam-outline.json (longitude/latitude rings). make-map.mjs draws the map's Guam inset from it.
// Source: https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_state_500k.zip  (unzip, then pass the .shp path)
// Run: node tools/guam-outline.mjs <path-to>/cb_2023_us_state_500k.shp
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shpPath = process.argv[2];
const shp = fs.readFileSync(shpPath), dbf = fs.readFileSync(shpPath.replace(/\.shp$/i, '.dbf'));

// --- DBF: find the record whose STUSPS is GU
const nRec = dbf.readUInt32LE(4), hLen = dbf.readUInt16LE(8), rLen = dbf.readUInt16LE(10);
const fields = []; let off = 32, pos = 1;
while (dbf[off] !== 0x0d) { const name = dbf.toString('latin1', off, off + 11).replace(/\0.*$/, ''); const len = dbf[off + 16]; fields.push({ name, pos, len }); pos += len; off += 32; }
const fld = fields.find(f => f.name === 'STUSPS');
let target = -1;
for (let i = 0; i < nRec; i++) { const r = hLen + i * rLen; if (dbf.toString('latin1', r + fld.pos, r + fld.pos + fld.len).trim() === 'GU') { target = i; break; } }
if (target < 0) throw new Error('Guam not found');

// --- SHP: walk records to the same index; polygon = parts + points
let p = 100, idx = 0, rings = null;
while (p < shp.length) {
  const len = shp.readInt32BE(p + 4) * 2, c = p + 8;
  if (idx === target) {
    const type = shp.readInt32LE(c); if (type !== 5) throw new Error('not a polygon: ' + type);
    const nParts = shp.readInt32LE(c + 36), nPts = shp.readInt32LE(c + 40);
    const parts = [...Array(nParts)].map((_, k) => shp.readInt32LE(c + 44 + 4 * k));
    const ptsOff = c + 44 + 4 * nParts;
    const pts = [...Array(nPts)].map((_, k) => [shp.readDoubleLE(ptsOff + 16 * k), shp.readDoubleLE(ptsOff + 16 * k + 8)]);
    rings = parts.map((s, k) => pts.slice(s, k + 1 < nParts ? parts[k + 1] : nPts).map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]));
    break;
  }
  p = c + len; idx++;
}
fs.writeFileSync(path.join(ROOT, 'site', 'data', 'guam-outline.json'), JSON.stringify({ source: 'U.S. Census Bureau, cb_2023_us_state_500k (1:500,000)', rings }));
console.log('rings:', rings.length, 'points:', rings.reduce((a, r) => a + r.length, 0), 'largest ring:', Math.max(...rings.map(r => r.length)));
