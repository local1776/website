// Lobbying data the BUILD needs (Ben, Nov 21 2026; contract agreed with the Union App, see CLAUDE.md "Union App LOBBYING").
// The app publishes our positions on bills to one public Firestore document, publicLobbying/positions. The positions
// themselves are read live in the browser (site/js/lobby.js). The build reads the same document only to print
// "Sponsor of H.R. 8800 (Local 1776 Supports)" / "Cosponsor of ..." on members' cards and in the Armed Services rosters:
// for each bill it fetches the sponsor and cosponsors from GovInfo's public BILLSTATUS records (no key), by Bioguide ID.
// Last good copies are cached in site/data/lobby-cache/ so an offline build still works. Nothing exists yet = no lines.
// --lobby-sample (this PC only) uses site/congress/lobby-sample-positions.json instead of the live document.
import fs from 'node:fs';
import path from 'node:path';

// the project id comes from site/data/site-config.json (passed in by the build)
const docUrl = project => `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/publicLobbying/positions`;
const TYPES = { hr: 'H.R.', s: 'S.', hjres: 'H.J.Res.', sjres: 'S.J.Res.', hconres: 'H.Con.Res.', sconres: 'S.Con.Res.', hres: 'H.Res.', sres: 'S.Res.' };

// Firestore REST value → plain value (same as unwrap() in site/js/congress.js)
export function unwrap(v) {
  if (v == null) return null;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) { const o = {}; for (const [k, f] of Object.entries(v.mapValue.fields || {})) o[k] = unwrap(f); return o; }
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(unwrap);
  return null;
}
const docValue = doc => unwrap({ mapValue: { fields: (doc && doc.fields) || {} } });

// "hr8800-119" → { type, num, congress, label: "H.R. 8800" }
export function billParts(id) {
  const m = /^(hr|s|hjres|sjres|hconres|sconres|hres|sres)(\d+)-(\d+)$/.exec(String(id || '').toLowerCase());
  return m ? { type: m[1], num: m[2], congress: m[3], label: `${TYPES[m[1]]} ${m[2]}` } : null;
}

// the bill's own sponsor and (still-standing) cosponsors; amendments and related bills carry sponsors of their own
function sponsorsFromXml(xml) {
  const top = xml.replace(/<(amendments|relatedBills|committeeReports|actions)>[\s\S]*?<\/\1>/g, '');
  const ids = block => (block ? [...block.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(i => i[1])
    .filter(i => !/<sponsorshipWithdrawnDate>\s*\d/.test(i)).map(i => (/<bioguideId>(\w+)<\/bioguideId>/.exec(i) || [])[1]).filter(Boolean) : []);
  return { sponsors: ids((/<sponsors>([\s\S]*?)<\/sponsors>/.exec(top) || [])[1]), cosponsors: ids((/<cosponsors>([\s\S]*?)<\/cosponsors>/.exec(top) || [])[1]) };
}

export async function lobbyData(src, offline, sample, project = 'liuna-local-1776') {
  // sample runs keep their copies in previews/ (not committed); real ones in site/data/lobby-cache/
  const dir = sample ? path.join(src, '..', 'previews', 'lobby-sample-cache') : path.join(src, 'data', 'lobby-cache'); fs.mkdirSync(dir, { recursive: true });
  const posFile = path.join(dir, 'positions.json');
  let doc = null, failed = false;
  if (sample) doc = JSON.parse(fs.readFileSync(path.join(src, 'congress', 'lobby-sample-positions.json'), 'utf8'));
  else if (!offline) {
    try {
      const r = await fetch(docUrl(project), { signal: AbortSignal.timeout(15000) });
      if (r.ok) { doc = await r.json(); fs.writeFileSync(posFile, JSON.stringify(doc)); }
      else if (r.status === 403 || r.status === 404) { doc = null; if (fs.existsSync(posFile)) fs.unlinkSync(posFile); }   // not published (yet): no lines
      else throw new Error(r.status);
    } catch (e) { failed = true; console.warn(`lobby: positions not refreshed (${e.message}) — using the cached copy`); }
  }
  if (!doc && !sample && fs.existsSync(posFile) && (offline || failed)) doc = JSON.parse(fs.readFileSync(posFile, 'utf8'));
  const positions = ((doc && docValue(doc).positions) || []).filter(p => p && billParts(p.billId) && /^(support|oppose)$/.test(p.position));
  const bills = {};
  for (const p of positions) {
    const b = billParts(p.billId), file = path.join(dir, `${p.billId}.json`);
    let s = null;
    if (!offline) {
      try {
        const r = await fetch(`https://www.govinfo.gov/bulkdata/BILLSTATUS/${b.congress}/${b.type}/BILLSTATUS-${b.congress}${b.type}${b.num}.xml`, { signal: AbortSignal.timeout(30000) });
        if (!r.ok) throw new Error(r.status);
        s = sponsorsFromXml(await r.text()); fs.writeFileSync(file, JSON.stringify(s));
      } catch (e) { console.warn(`lobby: ${p.billId} sponsors not refreshed (${e.message})`); }
    }
    if (!s && fs.existsSync(file)) s = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (s) bills[p.billId] = { label: p.label || b.label, position: p.position, ...s };
  }
  return { bills, count: positions.length };
}

// the lines shown for one member: "Sponsor of H.R. 8800 (Local 1776 Supports)"
export function lobbyLines(lobby, bio) {
  if (!bio || !lobby) return [];
  const out = [];
  for (const b of Object.values(lobby.bills)) {
    const role = b.sponsors.includes(bio) ? 'Sponsor' : b.cosponsors.includes(bio) ? 'Cosponsor' : '';
    if (role) out.push(`${role} of ${b.label} (Local 1776 ${b.position === 'support' ? 'Supports' : 'Opposes'})`);
  }
  return out;
}
