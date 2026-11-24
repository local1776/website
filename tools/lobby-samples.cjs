// node tools/lobby-samples.cjs → site/congress/lobby-sample-*.json
// Sample lobbying documents in Firestore REST format, for previewing on this PC only (/legislation?lobby=sample,
// node tools/build.mjs --lobby-sample). Plain JSON in, Firestore "fields" out, so unwrap() is exercised for real.
const fs = require('fs'); const D = require('path').resolve(__dirname, '../site/congress') + '/';
const wrap = v => v === null ? { nullValue: null } : Array.isArray(v) ? { arrayValue: { values: v.map(wrap) } }
  : typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, wrap(x)])) } }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : typeof v === 'boolean' ? { booleanValue: v } : { stringValue: String(v) };
const doc = (name, o) => fs.writeFileSync(D + 'lobby-sample-' + name + '.json', JSON.stringify({ name: 'projects/liuna-local-1776/databases/(default)/documents/publicLobbying/' + name,
  fields: wrap(o).mapValue.fields }, null, 1));
const T = '2026-11-21T18:00:00Z';
doc('positions', { updatedAt: T, positions: [
  { billId: 'hr2550-119', congress: 119, label: 'H.R. 2550', title: 'Protect America’s Workforce Act', position: 'support',
    line: 'Cancels the 2025 executive orders that took bargaining rights from more than a million federal workers.',
    url: 'https://www.congress.gov/bill/119th-congress/house-bill/2550', since: '2025-04-15',
    letters: [{ date: '2025-12-08', title: 'Letter to the House in Support of H.R. 2550', pdfUrl: '/files/sample-letter.pdf' }] },
  { billId: 's4784-119', congress: 119, label: 'S. 4784', title: 'Sample: Senate Defense Bill, Section 513', position: 'oppose',
    line: 'Sample line: section 513 would phase out National Guard technicians. Shown only on the preview.',
    url: '', since: '2026-07-01', letters: [] }] });
doc('campaigns', { updatedAt: T, campaigns: [
  { slug: 'protect-americas-workforce', title: 'Tell Congress: Pass the Protect America’s Workforce Act',
    summary: 'The House passed H.R. 2550 in December 2025. Ask your senators to pass it and your representative to keep it in the final bill.',
    talkingPoints: ['I am a federal employee and a constituent.', 'Executive orders in 2025 took bargaining rights from more than a million federal workers.', 'Please support H.R. 2550 and restore those rights.'],
    billIds: ['hr2550-119'], audience: { chambers: ['house', 'senate'], states: 'all', committees: [] },
    starts: '2026-11-01', ends: '2027-01-31', status: 'active', participation: { total: 212, byState: { LA: 61, CA: 40 } } },
  { slug: 'guard-technicians-asc', title: 'Armed Services: Keep National Guard Technicians',
    summary: 'Sample campaign aimed only at Armed Services Committee members.', talkingPoints: ['Sample point one.', 'Sample point two.'],
    billIds: ['s4784-119'], audience: { chambers: ['senate', 'house'], states: 'all', committees: ['SSAS', 'HSAS'] },
    starts: '2026-11-01', ends: '2026-12-31', status: 'active', participation: null },
  { slug: 'closed-sample', title: 'Sample Closed Campaign', summary: 'This one has closed.', talkingPoints: ['Point.'], billIds: [],
    audience: { chambers: ['house'], states: ['LA'], committees: [] }, starts: '2026-01-01', ends: '2026-03-01', status: 'closed', participation: { total: 40, byState: { LA: 40 } } }] });
doc('activity', { updatedAt: T, year: 2026, officesMet: 46, visits: 58, trips: 2 });
console.log('ok');
