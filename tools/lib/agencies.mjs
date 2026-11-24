// The Agencies page from the Union App (Ben, Nov 22 2026): work sites, representatives and active cases.
// The app publishes three public, read-only Firestore documents (server-only writes; contract in
// review/prompts/app-agencies-feeds-prompt.md):
//   publicAgencies/workSites        { updatedAt, sites: [{ id, agency, name, place, street, building, city, state, zip, phone, lat, lng }] }
//   publicAgencies/representatives  { updatedAt, reps:  [{ id, name, title, agencies: ["LA-ARMY"…] | ["ALL"], phone, email, order }] }
//   publicAgencies/cases            { updatedAt, cases: [{ id, agency, type, subject, filed, status }] }
// "agency" = the same codes the site's forms send: "LA-ARMY" / "LA-AIR" for two-branch units, a plain code like "MI",
// "ARNG-PEC" / "ARNG-TARC". Read at every build (the app triggers a rebuild when it publishes, as it does for news).
// Missing, unreadable or failed = the site keeps what it has today (units.json reps, facilities.json sites, no cases);
// a failed fetch uses the last good copy in site/data/agencies-cache/. Each unit switches over on its own: a unit the
// app lists sites (or reps) for uses the app's list; the others keep the old data until the app covers them.
// --agencies-sample (this PC only) reads site/data/agencies-sample/ (made-up data from tools/agencies-samples.cjs).
import fs from 'node:fs';
import path from 'node:path';
import { unwrap } from './lobby.mjs';

const docValue = doc => unwrap({ mapValue: { fields: (doc && doc.fields) || {} } });
const UNITS = ['ARNG', 'CA', 'GU', 'IL', 'LA', 'MI', 'NV', 'NM', 'SC', 'SD', 'UT'];

// "LA-ARMY" → { unit: "LA", branch: "Army" }; "ARNG-PEC" → { unit: "ARNG", branch: "Army" }; "MI" → { unit: "MI", branch: "Army" }
export function splitAgency(a) {
  const m = String(a || '').toUpperCase().trim().match(/^([A-Z]{2,4})(?:-(ARMY|AIR|PEC|TARC))?$/);
  if (!m || !UNITS.includes(m[1])) return null;
  return { unit: m[1], branch: m[2] === 'AIR' ? 'Air' : 'Army' };
}
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
// one address line set: "4102 Constitution Ave, Bldg 912, Los Alamitos, CA 90720"
export function joinAddress(s) {
  const street = [clean(s.street), clean(s.building)].filter(Boolean).join(', ');
  const tail = [clean(s.city), [clean(s.state), clean(s.zip)].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return street && tail ? street + ', ' + tail : '';
}

export async function appAgencies(src, offline, sample, project = 'liuna-local-1776') {
  const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/`;
  const dir = sample ? path.join(src, 'data', 'agencies-sample') : path.join(src, 'data', 'agencies-cache');
  fs.mkdirSync(dir, { recursive: true });
  const file = p => path.join(dir, p.replace(/\//g, '__') + '.json');
  async function get(p) {
    if (sample || offline) return fs.existsSync(file(p)) ? JSON.parse(fs.readFileSync(file(p), 'utf8')) : null;
    try {
      const r = await fetch(base + p, { signal: AbortSignal.timeout(15000) });
      if (r.status === 404 || r.status === 403) { if (fs.existsSync(file(p))) fs.unlinkSync(file(p)); return null; }
      if (!r.ok) throw new Error(r.status);
      const doc = await r.json(); fs.writeFileSync(file(p), JSON.stringify(doc)); return doc;
    } catch { return fs.existsSync(file(p)) ? JSON.parse(fs.readFileSync(file(p), 'utf8')) : null; }
  }
  const [ws, rp, cs] = await Promise.all(['publicAgencies/workSites', 'publicAgencies/representatives', 'publicAgencies/cases'].map(get));

  const sites = ws ? (docValue(ws).sites || []).map(s => {
    const a = splitAgency(s.agency); if (!a || !clean(s.name)) return null;
    const lat = Number(s.lat), lng = Number(s.lng);
    return { unit: a.unit, branch: a.branch, name: clean(s.name), place: clean(s.place) || clean(s.city), address: joinAddress(s),
      phone: clean(s.phone), lat: Number.isFinite(lat) && lat ? lat : null, lng: Number.isFinite(lng) && lng ? lng : null };
  }).filter(Boolean) : null;

  const reps = rp ? (docValue(rp).reps || []).map(r => {
    const name = clean(r.name); if (!name) return null;
    const all = (r.agencies || []).some(x => String(x).toUpperCase() === 'ALL');
    const units = all ? UNITS.slice() : [...new Set((r.agencies || []).map(splitAgency).filter(Boolean).map(a => a.unit))];
    return units.length ? { name, role: clean(r.title), phone: clean(r.phone), email: clean(r.email), units, order: Number(r.order) || 99, all } : null;
  }).filter(Boolean) : null;

  const cases = cs ? (docValue(cs).cases || []).map(c => {
    const a = splitAgency(c.agency); if (!a || !clean(c.subject)) return null;
    const filed = String(c.filed || '').slice(0, 10);
    return { unit: a.unit, type: clean(c.type), subject: clean(c.subject), filed: /^\d{4}-\d{2}-\d{2}$/.test(filed) ? filed : '', status: clean(c.status) || 'Open' };
  }).filter(Boolean) : null;

  return { sites, reps, cases };
}

// Merge into the site's own lists. Positions: the app's lat/lng; else the old map's pin for the same site (same unit and
// name, and the same town when the name repeats); else the site is listed without a pin.
export function mergeAgencies(units, facilities, feed, project) {
  const out = { facilities, units, cases: [], casesLive: false };
  if (feed.sites && feed.sites.length) {
    const fromApp = new Set(feed.sites.map(s => s.unit));
    const key = (u, n) => u + '|' + n.toLowerCase().replace(/[^a-z0-9]/g, '');
    const old = new Map(); for (const f of facilities) { const k = key(f.unit, f.name); old.set(k, [...(old.get(k) || []), f]); }
    const placed = feed.sites.map(s => {
      let lat = s.lat, lng = s.lng;
      if (lat == null) {
        const c = old.get(key(s.unit, s.name)) || [];
        const m = c.length === 1 ? c[0] : c.find(f => f.place && s.place && f.place.toLowerCase() === s.place.toLowerCase());
        if (m) { lat = m.lat; lng = m.lng; }
      }
      const f = { unit: s.unit, name: s.name, place: s.place, branch: s.branch, lat, lng };
      if (s.address) f.address = s.address;
      if (lat != null && s.unit !== 'GU') [f.x, f.y] = project(lng, lat);   // the Agencies map's projection (Guam has its own, in build.mjs)
      return f;
    });
    out.facilities = facilities.filter(f => !fromApp.has(f.unit)).concat(placed)
      .sort((a, b) => a.unit.localeCompare(b.unit) || a.name.localeCompare(b.name, undefined, { numeric: true }));
  }
  if (feed.reps && feed.reps.length) {
    const byUnit = {};
    for (const r of [...feed.reps].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)))
      for (const u of r.units) (byUnit[u] = byUnit[u] || []).push({ name: r.name, role: r.role, phone: r.phone, email: r.email, all: r.all });
    // once the app publishes the list it is the list (Local-wide officers + each unit's own people); a unit with nobody on it
    // keeps what it had
    out.units = units.map(u => byUnit[u.code] ? { ...u, reps: byUnit[u.code].map(({ all, ...r }) => r) } : u);
  }
  if (feed.cases) out.cases = feed.cases.filter(c => !/^closed$/i.test(c.status));
  out.casesLive = !!feed.cases;   // the app has published its list (even an empty one)
  return out;
}
