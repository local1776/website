// Bring the Resources regulations up to date (Ben approved Nov 20 2026: remove obsolete, replace with current, link
// blocked publishers to the official current edition). Findings: notes/regs-check-*.md. One-time; edits resources.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = path.join(ROOT, 'site', 'data', 'resources.json');
const R = JSON.parse(fs.readFileSync(F, 'utf8'));
const AF = 'https://static.e-publishing.af.mil/production/1/';
const ARMY = 'https://armypubs.army.mil/epubs/DR_pubs/DR_a/';
const NGB = 'https://www.ngbpmc.ng.mil/Portals/27/Publications/';

// label (exact, as now on the page) -> null to remove, or the new item
const CHANGES = {
  // ---- removed: rescinded, cancelled or obsolete
  'ALARACT 061-2019 Online Conduct': null,                                   // expired Sep 2020
  'DoDI 1241.02 RC INCAP Sys Management (5/30/01)': null,                    // cancelled by DoDI 1241.01 (2016)
  'BUS Code Guide (2006)': null,                                             // no longer published
  'OSHA COVID-19 Guidance': null,                                            // OSHA archived it
  'TDY Travel (Deployments/Exercises/Field)': null,                          // JTR changes monthly — link the live JTR
  'Chapter 2 Time and Attendance (T&A)': null,                               // old address dead; Volume 8 link covers it
  'TPR 511: Classification/Workforce Management': null,                      // replaced by Vol 511
  'TPR 715: Voluntary/Non-Disciplinary Actions': null,                       // replaced by Vol 715
  'TPR 752: Discipline and Adverse Actions': null,                           // replaced by Vol 752
  'TPR 752-1: Appeals/Hearing Examiner': null,                               // replaced by Vol 753
  'TPR 300: Employment': { label: 'RIF Procedures for NG Employees (NGB-J1-TN Memo, 2020)', href: '/files/ngb-j1-tn-rif-procedures-20200414.pdf' },
  // ---- replaced with the current edition
  'Employment Rights for the Guard and Reserves (DOJ)': { label: 'USERRA Guidance (Department of Labor)', href: 'https://www.dol.gov/agencies/vets/programs/userra' },
  'OSHA Personal Protective Equipment': { label: 'OSHA 3151 Personal Protective Equipment (2023)', href: '/files/osha-3151-ppe-2023.pdf' },
  'DoDD 1020.02E Diversity/EO in DoD (2018)': { label: 'DoDD 1020.02E Civil Rights and Equal Opportunity (2025)', href: 'https://www.esd.whs.mil/Portals/54/Documents/DD/issuances/dodd/102002p.PDF' },
  'DoDI 1035.01 Telework (2012)': { label: 'DoDI 1035.01 Telework and Remote Work (2024)', href: '/files/dodi-1035-01-telework-remote-work-2024.pdf' },
  'DoDI 1400.25 V591 Uniform Allowances (2017)': { label: 'DoDI 1400.25 V591 Uniform Allowances (2024)', href: 'https://www.esd.whs.mil/Portals/54/Documents/DD/issuances/140025/140025_vol591.PDF' },
  'AFMAN 16-405 Personnel Security (11/30/22)': { label: 'DoDM 5200.02/DAFMAN 16-1405 Personnel Security', href: AF + 'saf_oc/publication/dodman5200.02_dafman16-1405/dodman5200.02_dafman16-1405.pdf' },
  'Chapter 57 Reserve Entitlements for AD': { label: 'Chapter 57 Reserve Entitlements for AD (2025)', href: 'https://comptroller.war.gov/Portals/45/documents/fmr/current/07a/07a_57.pdf' },
  'AFI 36-2606 Re-Enlistment/Extension (9/20/19)': { label: 'DAFI 36-2606 Reenlistment/Extension (2024)', href: AF + 'af_a1/publication/dafi36-2606/dafi36-2606.pdf' },
  'AFI 36-2903 Dress and Appearance (4/8/20)': { label: 'DAFI 36-2903 Dress and Personal Appearance (2024)', href: AF + 'af_a1/publication/dafi36-2903/dafi36-2903.pdf' },
  'AFI 36-2910 LOD/MEDCON/INCAP Pay (10/8/15)': { label: 'DAFI 36-2910 LOD/MEDCON/INCAP Pay (2021)', href: AF + 'af_a1/publication/dafi36-2910/dafi36-2910.pdf' },
  'ANGI 36-101 AGR Program (8/14/14)': { label: 'ANGI 36-101 AGR Program (2022)', href: AF + 'ang/publication/angi36-101/angi36-101.pdf' },
  'ANGI 36-2001 Training/Op Support (4/30/19)': { label: 'ANGI 36-2001 Training/Op Support (2025)', href: AF + 'ang/publication/angi36-2001/angi36-2001.pdf' },
  'AR 58-1 M/A Use of Motor Vehicles (3/23/20)': { label: 'AR 58-1 Use of Motor Vehicles (2025)', href: 'https://armypubs.army.mil/ProductMaps/PubForm/AR.aspx' },
  'AR 95-2 ATC AF/HP Airspace Ops (3/31/16)': { label: 'AR 95-2 Air Traffic Control and Airspace (2026)', href: 'https://armypubs.army.mil/ProductMaps/PubForm/Details.aspx?PUB_ID=64645' },
  'AR 135-18 Army AGR program (10/11/19)': { label: 'AR 135-18 AGR Program (2025)', href: ARMY + 'ARN42904-AR_135-18-000-WEB-1.pdf' },
  'AR 135-178 Enlisted Admin Separations (11/7/17)': { label: 'AR 135-178 Enlisted Admin Separations (2025)', href: 'https://armypubs.army.mil/ProductMaps/PubForm/AR.aspx' },
  'AR 135-180 Retirement Non-Regular (4/28/15)': { label: 'AR 135-180 Non-Regular Retirement (2024)', href: ARMY + 'ARN43635-AR_135-180-001-WEB-2.pdf' },
  'AR 385-10 Army Safety Program (2/24/17)': { label: 'AR 385-10 Safety and Occupational Health (2023)', href: ARMY + 'ARN34981-AR_385-10-000-WEB-1.pdf' },
  'AR 570-4 Manpower Management (2/8/06)': { label: 'AR 570-4 Manpower Management (2024)', href: 'https://armypubs.army.mil/ProductMaps/PubForm/AR.aspx' },
  'AR 600-20 Army Command Policy (7/24/20)': { label: 'AR 600-20 Army Command Policy (2026)', href: ARMY + 'ARN46266-AR_600-20-000-WEB-1.pdf' },
  'AR 600-85 Substance Abuse (11/28/16)': { label: 'AR 600-85 Substance Abuse Program (2024)', href: 'https://armypubs.army.mil/ProductMaps/PubForm/Details.aspx?PUB_ID=1029227' },
  'AR 670-1 Uniform Wear/Appearance (1/26/21)': { label: 'AR 670-1 Uniform Wear/Appearance (2021, rev. 2025)', href: ARMY + 'ARN30302-AR_670-1-001-WEB-3.pdf' },
  'DA PAM 135-381 Incap Processing (5/22/08)': { label: 'DA PAM 135-381 Incap Processing (2021)', href: 'https://armypubs.army.mil/ProductMaps/PubForm/PAM.aspx' },
  '1101.01: Telework (NGB Only)': { label: 'NGB-DTM 1101.01: Telework and Remote Work (NGB Only, 2023)', href: NGB + 'NGB-DTM/NGBDTM%201101.01_20230518p.pdf' },
  'Vol 303: Mil Tech Compatibility': { label: 'Vol 303A: Mil Tech Compatibility (2023)', href: '/files/cngbi-1400-25-vol-303a-20230712.pdf', sub: 1 },
};
const ADD_AFTER = {
  // Army Directive 2026-18 rescinded AR 690-752's table of penalties (Chapter 3)
  'AR 690-752 Discipline/Adverse Actions (2/10/22)': { label: 'Army Directive 2026-18 (Rescinds Ch. 3 Table of Penalties)', href: ARMY + 'ARN47111-ARMY_DIR_2026-18-000-WEB-1.pdf', sub: 1 },
  // new NGB volume (Excepted Service), placed with the other 1400.25 volumes
  'Vol 293: Supervisor Employee Folder': { label: 'Vol 213: Excepted Service Employment (2024)', href: '/files/cngbi-1400-25-vol-213-20240731.pdf', sub: 1, before: true },
};

let removed = 0, replaced = 0, added = 0;
const seen = new Set();
for (const s of R) for (const g of s.groups) {
  const out = [];
  for (const i of g.items) {
    if (i.label && i.label in CHANGES) {
      seen.add(i.label);
      const c = CHANGES[i.label];
      if (c === null) { removed++; continue; }
      out.push({ ...c, ...(i.sub && !('sub' in c) ? { sub: i.sub } : {}) }); replaced++; continue;
    }
    const a = i.label && ADD_AFTER[i.label];
    if (a && a.before) { const { before, ...x } = a; out.push(x, i); added++; seen.add(i.label); continue; }
    out.push(i);
    if (a) { out.push(a); added++; seen.add(i.label); }
  }
  g.items = out;
}
// the TPR heading now holds only the RIF memo
for (const s of R) for (const g of s.groups) g.items = g.items.map(i => i.head === 'Technician Personnel Regulations (TPRs)' ? { head: 'NGB Technician Memoranda' } : i);
const missed = [...Object.keys(CHANGES), ...Object.keys(ADD_AFTER)].filter(k => !seen.has(k));
fs.writeFileSync(F, JSON.stringify(R, null, 1));
console.log({ removed, replaced, added, missed });
