// Minimal ESRI shapefile reader (no packages): points, polylines and polygons, plus the .dbf attribute table.
// readShapefile('x.shp') -> [{ props: {FIELD: value}, type, parts: [[[lon, lat], ...], ...] }]
import fs from 'node:fs';

export function readDbf(path) {
  const b = fs.readFileSync(path);
  const n = b.readUInt32LE(4), hLen = b.readUInt16LE(8), rLen = b.readUInt16LE(10);
  const fields = []; let off = 32, pos = 1;
  while (b[off] !== 0x0d) { fields.push({ name: b.toString('latin1', off, off + 11).replace(/\0.*$/, ''), type: String.fromCharCode(b[off + 11]), pos, len: b[off + 16] }); pos += b[off + 16]; off += 32; }
  const rows = [];
  for (let i = 0; i < n; i++) {
    const r = hLen + i * rLen, row = {};
    for (const f of fields) {
      let v = b.toString('utf8', r + f.pos, r + f.pos + f.len).trim();
      if (f.type === 'N' || f.type === 'F') v = v === '' ? null : +v;
      row[f.name] = v;
    }
    rows.push(row);
  }
  return rows;
}

export function readShapefile(shpPath) {
  const b = fs.readFileSync(shpPath);
  const props = readDbf(shpPath.replace(/\.shp$/i, '.dbf'));
  const out = []; let p = 100, i = 0;
  while (p < b.length) {
    const len = b.readInt32BE(p + 4) * 2, c = p + 8, type = b.readInt32LE(c);
    let parts = [];
    if (type === 1) parts = [[[b.readDoubleLE(c + 4), b.readDoubleLE(c + 12)]]];
    else if (type === 3 || type === 5) {
      const nParts = b.readInt32LE(c + 36), nPts = b.readInt32LE(c + 40);
      const starts = [...Array(nParts)].map((_, k) => b.readInt32LE(c + 44 + 4 * k));
      const po = c + 44 + 4 * nParts;
      const pts = [...Array(nPts)].map((_, k) => [b.readDoubleLE(po + 16 * k), b.readDoubleLE(po + 16 * k + 8)]);
      parts = starts.map((s, k) => pts.slice(s, k + 1 < nParts ? starts[k + 1] : nPts));
    }
    out.push({ props: props[i], type, parts });
    p = c + len; i++;
  }
  return out;
}
