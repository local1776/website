// One-time cleanup of the imported Resources list (tools/import-resources.mjs -> site/data/resources.json).
// Fixes the grouping Duda's layout scrambled, spells labels out in Title Case, drops links to pages that are moving into
// the Union App (Profile Update, PayPal, Travel Request — Ben, Nov 20 2026). After this, edit resources.json directly.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = path.join(ROOT, 'site', 'data', 'resources.json');
const raw = JSON.parse(fs.readFileSync(F, 'utf8'));
const sec = t => raw.find(s => s.title === t);
const grp = (s, t) => s.groups.find(g => g.title === t);
const flat = items => items.map(i => { const { sub, ...rest } = i; return rest; });
const LABELS = {
  "Fed Employees' Group Life Ins (FEGLI)": "Federal Employees' Group Life Insurance (FEGLI)",
  'Fed Employees Health Benefit (FEHB)': 'Federal Employees Health Benefits (FEHB)',
  'Fed Employee Retirement System (FERS)': 'Federal Employees Retirement System (FERS)',
  'OPM Retirement Guide (web)': 'OPM Retirement Guide',
  "LHSFNA's COVID-19 Resources": 'LHSFNA COVID-19 Resources',
  'OSHA: COVID-19 Guidance': 'OSHA COVID-19 Guidance', 'OSHA: PPE': 'OSHA Personal Protective Equipment',
  'PASGT/ACH Blunt Impact Tests': 'PASGT/ACH Helmet Blunt Impact Tests',
  'Employment Rights - NG/Reserves': 'Employment Rights for the Guard and Reserves (DOJ)',
  'USA Jobs': 'USAJOBS', 'Feds Hire Vets (OPM)': 'Feds Hire Vets (OPM)', 'SCOTUS': 'Supreme Court Docket: Ohio v. FLRA',
  'US House of Representatives': 'U.S. House of Representatives', 'US Senate': 'U.S. Senate',
  'Title 5 - Gov Organization/Employees': 'Title 5: Government Organization and Employees',
  'Title 10 - Armed Forces': 'Title 10: Armed Forces', 'Title 32 - National Guard': 'Title 32: National Guard', 'Title 38 - USERRA': 'Title 38: USERRA',
  '5 CFR Subchapter B - Civil Service Regs': '5 CFR Subchapter B: Civil Service Regulations', '5 CFR Ch XIV - FLRA Regulations': '5 CFR Chapter XIV: FLRA Regulations',
  'Ch 71 - Labor/Management Relations': 'Chapter 71: Labor-Management Relations', 'Ch 75 - Adverse Actions': 'Chapter 75: Adverse Actions',
  'Ch 1011 - National Guard Bureau': 'Chapter 1011: National Guard Bureau',
};
const tidy = l => (LABELS[l] || l).replace(/^Sec (\d+) - /, 'Section $1: ').replace(/^Part (\d+) - /, 'Part $1: ').replace(/^Ch (\d+) /, 'Chapter $1 ')
  .replace(/^(Vol \d+) - /, '$1: ').replace(/^(\d{4}\.\d{2}[A-Z]?) - /, '$1: ').replace(/^(TPR [\d-]+) - /, '$1: ').replace(/^(CNGFPR \d+) - /, '$1: ')
  .replace(/^(CMD[IMN] [\d.]+) - /, '$1: ').replace(/\bMgt\b/g, 'Management').replace(/\bMgmt\b/g, 'Management');
const clean = items => items.map(i => ({ ...i, label: tidy(i.label) }));

// ---- Financials
const fin = sec('Financials');
const filings = grp(fin, 'Department of Labor (DOL) Filings').items;
const financials = { id: 'financials', title: 'Financials and Filings', groups: [
  { title: 'Legal Information', items: [
    { label: '501(c)(5) Labor Organization', href: grp(fin, 'Local 1776 is a').items[0].href },
    { fact: 'IRS EIN', value: '27-3964267' }, { fact: 'DOL File Number', value: '544-423' }, { fact: 'Louisiana Charter Number', value: '40508107N' } ] },
  { title: 'Labor Department Filings', note: 'Annual LM reports filed with the U.S. Department of Labor.', items: [
    ...filings.filter(i => /^CY/.test(i.label)).reverse().map(i => ({ label: i.label.replace('CY', '') + (i.label === 'CY2010' ? ' LM-3' : ' LM-2'), href: i.href })) ] },
  { title: 'Labor Department Audit', items: [
    { label: '2025 Audit Report', href: filings.find(i => i.label === '2025 Audit').href },
    { label: 'Closing Letter (March 10, 2025)', href: filings.find(i => i.label === 'Closing Letter').href } ] },
] };

// ---- Workplace Matters
const wm = sec('Workplace Matters');
const workplace = { id: 'workplace', title: 'Workplace Matters', groups: [
  { title: 'Employee Representation', items: clean(grp(wm, 'Employee Representation').items) },
  { title: 'Emergency Activation', items: clean(grp(wm, 'Emergency Activation').items) },
  { title: 'Pay and Benefits', items: clean(grp(wm, 'Pay and Benefits').items) },
  { title: 'Pay Schedules', items: clean(grp(wm, 'Pay Schedules').items) },
  { title: 'Severance Pay', items: clean(flat(grp(wm, 'Severance Pay').items)) },
  { title: 'Safety', items: clean(grp(wm, 'Safety').items) },
  { title: 'USERRA', items: clean([...grp(wm, 'USERRA').items, ...grp(wm, '(DOJ)').items]) },
] };

// ---- Links and documents
const ol = sec('Other Links & Documents');
const links = { id: 'links', title: 'Links and Documents', groups: [
  { title: 'LIUNA Local 1776', items: clean(grp(ol, 'LIUNA Local 1776').items.filter(i => !['/profile', '/paypal-payment-options', '/travel-request'].includes(i.href))) },
  { title: 'LIUNA Constitutions', note: 'September 2021 editions.', items: clean(grp(ol, 'LIUNA Constitutions').items) },
  { title: 'Job Search', items: clean(grp(ol, 'Job Search').items) },
  { title: 'Congress', items: clean(grp(ol, 'Legislation').items) },
  { title: 'Other', items: clean(grp(ol, 'Other').items) },
] };

// ---- Laws and regulations
const lr = sec('Existing Laws and US Gov Regulations');
const opm = grp(lr, 'Office of Personnel Mgt'), covid = grp(lr, 'Coronavirus Disease 2019 (COVID-19)');
const laws = { id: 'laws', title: 'Laws and Regulations', groups: [
  { title: 'United States Code', href: grp(lr, 'United States Code').href, items: clean(grp(lr, 'United States Code').items) },
  { title: 'Code of Federal Regulations', href: grp(lr, 'Code of Federal Regulations').href, items: clean(grp(lr, 'Code of Federal Regulations').items) },
  { title: 'Office of Personnel Management', href: opm.href, items: clean([...opm.items, ...covid.items]) },
  { title: 'Department of Defense', href: grp(lr, 'Department of Defense').href, items: clean(grp(lr, 'Department of Defense').items) },
  { title: 'Director of National Intelligence', items: clean(flat(grp(lr, '(DNI)').items)).map(i => ({ ...i, label: 'DNI Security Policy' })) },
  { title: 'National Defense Authorization Acts', items: clean(flat(grp(lr, '(NDAA)').items)).map(i => ({ ...i, label: i.label.replace(/^FY(\d\d) - Public Law No\. /, 'FY20$1: Public Law ') })) },
] };

// ---- Agency policies
const ap = sec('Agency Policies and Regulations');
const cngbi = grp(ap, 'Chief NGB Instructions'), tpr = ap.groups.find(g => /^Technician Personnel/.test(g.title));
const agency = { id: 'agency', title: 'Agency Policies', groups: [
  { title: 'Department of the Air Force', items: clean(grp(ap, 'Department of the Air Force').items) },
  { title: 'Department of the Army', items: clean(grp(ap, 'Department of the Army').items) },
  { title: 'National Guard Bureau', href: 'https://www.ngbpmc.ng.mil/', items: [
    { head: 'Chief NGB Instructions (CNGBIs)' }, ...clean(cngbi.items.map(i => ({ ...i, sub: Math.max(0, (i.sub || 0) - 1) || undefined }))),
    { head: 'Technician Personnel Regulations (TPRs)' }, ...clean(flat(tpr.items)) ] },
] };

// ---- Local policies: one group per state/unit, sub-headings for the kinds of document
const lp = sec('Local Level Policies and Regulations');
const local = { id: 'local', title: 'Local Policies', note: 'When a local policy or regulation conflicts with one of our union contracts, the contract governs.', groups: [] };
let cur = null;
for (const g of lp.groups) {
  if (!g.title || /Cases/.test(g.title)) continue;
  if (!g.items.length) { cur = { title: g.title === 'PEC' ? 'Professional Education Center' : g.title, items: [] }; local.groups.push(cur); continue; }
  cur.items.push({ head: g.title }, ...clean(flat(g.items)));
}

const out = [financials, workplace, links, laws, agency, local];
fs.writeFileSync(F, JSON.stringify(out, null, 1));
for (const s of out) console.log(s.id, s.groups.map(g => `${g.title}(${g.items.filter(i => i.href).length})`).join(', '));
console.log('links:', out.reduce((a, s) => a + s.groups.reduce((b, g) => b + g.items.filter(i => i.href).length + (g.href ? 1 : 0), 0), 0));
