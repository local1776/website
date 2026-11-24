// Regroup Resources by WHO PUBLISHES each item (Ben, Nov 20 2026: never mix Local 1776/LIUNA documents with federal
// ones). One-time; after this, edit site/data/resources.json directly.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = path.join(ROOT, 'site', 'data', 'resources.json');
const R = JSON.parse(fs.readFileSync(F, 'utf8'));
const g = (sid, title) => { const s = R.find(x => x.id === sid); const x = s && s.groups.find(y => y.title === title); if (!x) throw new Error(sid + '/' + title); return x; };
const items = (sid, title) => g(sid, title).items;
const pick = (list, re) => list.filter(i => i.label && re.test(i.label));
const drop = (list, re) => list.filter(i => !(i.label && re.test(i.label)));
const top = list => list.map(i => { const { sub, ...r } = i; return r; });

const er = items('workplace', 'Employee Representation'), ea = items('workplace', 'Emergency Activation');
const safety = items('workplace', 'Safety'), pb = items('workplace', 'Pay and Benefits');

const out = [
  { id: 'ours', title: 'Local 1776 and LIUNA', groups: [
    { title: 'Legal Information', items: items('financials', 'Legal Information') },
    { title: 'Labor Department Filings', note: 'Annual LM reports filed with the U.S. Department of Labor.', items: items('financials', 'Labor Department Filings') },
    { title: 'Labor Department Audit', items: items('financials', 'Labor Department Audit') },
    { title: 'Know Your Rights', items: [...er, ...ea] },
    { title: 'Union Documents', items: [...items('links', 'LIUNA Local 1776'), ...items('links', 'LIUNA Constitutions').map(i => ({ ...i, label: 'LIUNA ' + i.label + ' Constitution (2021)' }))] },
    { title: 'Health and Safety', items: top(pick(safety, /LIUNA|LHSFNA/)) },
  ] },
  { id: 'pay', title: 'Federal Pay and Benefits', groups: [
    { title: 'Benefits', items: drop(pb, /Back-Pay|Pay Period/) },
    { title: 'Pay', items: [...top(pick(pb, /Back-Pay|Pay Period/)), ...items('workplace', 'Pay Schedules')] },
    { title: 'Severance Pay', items: items('workplace', 'Severance Pay') },
  ] },
  { id: 'protections', title: 'Workplace Protections', groups: [
    { title: 'USERRA and Military Leave', items: items('workplace', 'USERRA') },
    { title: 'Workplace Safety', items: drop(safety, /LIUNA|LHSFNA/) },
  ] },
  { id: 'laws', title: 'Laws and Regulations', groups: [
    { ...g('laws', 'United States Code') }, { ...g('laws', 'Code of Federal Regulations') },
    { ...g('laws', 'National Defense Authorization Acts') }, { ...g('laws', 'Director of National Intelligence') },
  ] },
  { id: 'agency', title: 'Agency Policies', groups: [
    { ...g('laws', 'Office of Personnel Management') }, { ...g('laws', 'Department of Defense') },
    { ...g('agency', 'Department of the Air Force') }, { ...g('agency', 'Department of the Army') }, { ...g('agency', 'National Guard Bureau') },
  ] },
  { ...R.find(x => x.id === 'local') },
  { id: 'more', title: 'Congress and Careers', groups: [
    { title: 'Congress', items: items('links', 'Congress') },
    { title: 'Federal Jobs', items: items('links', 'Job Search') },
    { title: 'Other', items: items('links', 'Other') },
  ] },
];
const count = s => s.reduce((a, x) => a + x.groups.reduce((b, y) => b + y.items.filter(i => i.href).length, 0), 0);
if (count(out) !== count(R)) throw new Error(`lost links: ${count(R)} -> ${count(out)}`);
fs.writeFileSync(F, JSON.stringify(out, null, 1));
out.forEach(s => console.log(s.title + ': ' + s.groups.map(x => `${x.title}(${x.items.filter(i => i.href).length})`).join(', ')));
console.log('links', count(out));
