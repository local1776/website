// node tools/agencies-samples.cjs → site/data/agencies-sample/ (Firestore REST format), to preview the Union App's Agencies
// feeds on this PC only: node tools/build.mjs --agencies-sample. MADE-UP data — never published.
const fs = require('fs'); const path = require('path');
const D = path.resolve(__dirname, '../site/data/agencies-sample') + '/';
fs.mkdirSync(D, { recursive: true });
const wrap = (v, k) => v === null ? { nullValue: null } : k === 'updatedAt' ? { timestampValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(x => wrap(x)) } }
  : typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([kk, x]) => [kk, wrap(x, kk)])) } }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : typeof v === 'boolean' ? { booleanValue: v } : { stringValue: String(v) };
const save = (name, o) => fs.writeFileSync(D + name.replace(/\//g, '__') + '.json', JSON.stringify({ name: 'projects/liuna-local-1776/databases/(default)/documents/' + name, fields: wrap(o).mapValue.fields }, null, 1));
const T = '2026-11-22T18:00:00Z';

// Louisiana only, so the preview shows one unit switching to the app's list. Two sites without lat/lng (they take the
// old map's pin by name), one with its own position, one Air site, one with no street yet.
save('publicAgencies/workSites', { updatedAt: T, sites: [
  { id: 'ws1', agency: 'LA-ARMY', name: 'FMS 6', place: 'Jena', street: '100 Sample Armory Rd', building: 'Bldg 1', city: 'Jena', state: 'LA', zip: '71342', phone: '', lat: null, lng: null },
  { id: 'ws2', agency: 'LA-ARMY', name: 'FMS 8', place: 'Baton Rouge', street: '200 Sample Ave', building: '', city: 'Baton Rouge', state: 'LA', zip: '70807', phone: '', lat: null, lng: null },
  { id: 'ws3', agency: 'LA-ARMY', name: 'Sample New Site', place: 'Alexandria', street: '300 Sample St', building: '', city: 'Alexandria', state: 'LA', zip: '71301', phone: '', lat: 31.3113, lng: -92.4451 },
  { id: 'ws4', agency: 'LA-AIR', name: '159th FW', place: 'NAS JRB New Orleans', street: '400 Sample Dr', building: 'Bldg 4', city: 'Belle Chasse', state: 'LA', zip: '70037', phone: '', lat: null, lng: null },
  { id: 'ws5', agency: 'LA-ARMY', name: 'UTES Villere (South)', place: 'New Orleans', street: '', building: '', city: 'New Orleans', state: 'LA', zip: '', phone: '', lat: null, lng: null },
] });
save('publicAgencies/representatives', { updatedAt: T, reps: [
  { id: 'r1', name: 'Ben Banchs', title: 'Business Manager', agencies: ['ALL'], phone: '(800) 569-5861 ext. 1001', email: 'bbanchs@local1776.org', order: 1 },
  { id: 'r2', name: 'Sample Assistant', title: 'Assistant Business Manager', agencies: ['ALL'], phone: '(800) 569-5861', email: 'sample@local1776.org', order: 2 },
  { id: 'r3', name: 'Sample Steward', title: 'Steward', agencies: ['LA-ARMY', 'LA-AIR'], phone: '', email: 'sample.steward@local1776.org', order: 10 },
] });
save('publicAgencies/cases', { updatedAt: T, cases: [
  { id: 'c1', agency: 'LA-ARMY', type: 'Grievance', subject: 'Sample: Annual leave denied during drill weekend', filed: '2026-11-03', status: 'Open' },
  { id: 'c2', agency: 'MI', type: 'Unfair Labor Practice', subject: 'Sample: Schedule change without notice', filed: '2026-10-14', status: 'Pending Decision' },
  { id: 'c3', agency: 'SC-AIR', type: 'MSPB Appeal', subject: 'Sample: Removal action', filed: '2026-09-28', status: 'Open' },
  { id: 'c4', agency: 'CA', type: 'Grievance', subject: 'Sample: closed case (should not show)', filed: '2026-06-01', status: 'Closed' },
] });
console.log('ok — made-up Agencies feeds in site/data/agencies-sample/');
