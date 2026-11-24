// Longitude/latitude -> our US map's coordinates (the us-atlas "Albers USA" layout, 975x610, lower 48 states).
// Same as d3.geoAlbers(): parallels 29.5/45.5, rotate 96, center (-0.6, 38.7), scale 1300, translate (487.5, 305).
const rad = Math.PI / 180;
const sy0 = Math.sin(29.5 * rad), n = (sy0 + Math.sin(45.5 * rad)) / 2, c = 1 + sy0 * (2 * n - sy0), r0 = Math.sqrt(c) / n;
const raw = (lam, phi) => { const r = Math.sqrt(c - 2 * n * Math.sin(phi)) / n; return [r * Math.sin(lam * n), r0 - r * Math.cos(lam * n)]; };
const [cx, cy] = raw(-0.6 * rad, 38.7 * rad);
export function project(lng, lat) {
  let lam = (lng + 96) * rad;
  if (lam > Math.PI) lam -= 2 * Math.PI;
  const [x, y] = raw(lam, lat * rad);
  return [487.5 + 1300 * (x - cx), 305 - 1300 * (y - cy)];
}
export const round = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
