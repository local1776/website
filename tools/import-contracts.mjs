// Turn each signed contract PDF into structured text for its web page (Ben, Nov 21 2026: "the contract will be on the
// page dynamically", plus the PDF to download). Source of truth = the signed PDF (site/files), not the old Duda copy.
// Writes site/data/contracts/<CODE>.json  { code, slug, pdf, extras[], executed, approved, preamble[], articles[] }
//   articles: [{ n, title, intro[], sections: [{ n, title, paras: [{ lv, t }] }] }]   lv = list depth for indenting
// Run once (or when a contract changes): node tools/import-contracts.mjs   (needs pdftotext, from Git for Windows)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isCdn, publishFile } from './lib/cdn.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const units = JSON.parse(fs.readFileSync(path.join(ROOT, 'site', 'data', 'units.json'), 'utf8'));
const OUT = path.join(ROOT, 'site', 'data', 'contracts');
fs.mkdirSync(OUT, { recursive: true });
const MONTH = '(January|February|March|April|May|June|July|August|September|October|November|December)';

// list depth: "1." → 1, "a." → 2, "(1)" / "(a)" → 3, "i." → 4
const lv = t => /^\d{1,2}\.\s/.test(t) ? 1 : /^[a-z]\.\s/.test(t) ? 2 : /^\(\d{1,2}\)\s|^\([a-z]\)\s/.test(t) ? 3 : /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)\.\s/.test(t) ? 4 : 0;
const tidy = t => t.replace(/\s+/g, ' ').replace(/ ([,;:])/g, '$1').replace(/([a-z])- ([a-z])/g, '$1-$2').trim();   // "sub- paragraph" split at a line end
// a title printed in capitals ("HOURS OF WORK AND COMPENSATION") → Title Case, keeping acronyms ("(EDP & HDP)", "TDY")
const ACR = new Set(['TDY', 'EAP', 'EDP', 'HDP', 'MPP', 'LMR', 'USERRA', 'PD', 'PDS', 'DST', 'DSTS', 'CWS', 'AWS', 'EEO', 'OWCP', 'FMLA', 'RIF', 'ULP', 'II', 'III', 'IV', 'USC', 'CFR', 'TAG', 'LIUNA']);
const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'in', 'to', 'for', 'by', 'at', 'from', 'with']);
const unshout = t => t !== t.toUpperCase() || !/[A-Z]{3}/.test(t) ? t : t.toLowerCase().replace(/[a-z][a-z'’]*/g, (w, i) => {
  const W = w.toUpperCase();
  return ACR.has(W.replace(/S$/, '')) || ACR.has(W) ? W : i && SMALL.has(w) ? w : w[0].toUpperCase() + w.slice(1);
}).replace(/\(([^)]*)\)/g, (m, x) => '(' + x.toUpperCase() + ')').replace(/\/([a-z])/g, (m, c) => '/' + c.toUpperCase());
const isArt = t => t.match(/^ARTICLES?\s+(\d+)\s*(?:[-–—:.]\s*(.*))?$/i);
const isSec = t => t.length < 140 && !/[.;,]$/.test(t) && (t.match(/^Section\s+(\d+\.\d+)\s*(?:[-–—:.]\s*)?([A-Z(].*|)$/i) || t.match(/^(\d+\.\d+)\s+[-–—]\s+([A-Z].*)$/));

function parse(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  // running headers/footers are the lines repeated on many pages (e.g. "Agreement Between NVARNG and LIUNA - July 11, 2023")
  const freq = {};
  for (const l of lines) { const k = l.replace(/^\f/, '').trim().replace(/\s+\d{1,3}$/, ''); if (k.length > 12 && !isSec(k) && !isArt(k)) freq[k] = (freq[k] || 0) + 1; }
  const footers = new Set(Object.entries(freq).filter(([, c]) => c >= 6).map(([k]) => k));
  const out = [];
  for (const l of lines) {
    const t = l.replace(/^\f/, '').trim();
    if (!t || footers.has(t) || footers.has(t.replace(/\s+\d{1,3}$/, '')) || /^[ivxlc\d]+$/i.test(t) || /^Page \d+( of \d+)?$/i.test(t) || /\.{5,}\s*[ivxlc\d]*$/i.test(t)) continue;
    out.push(t);
  }
  // the body starts at the LAST "Article 1" heading that is followed closely by "Section 1.1"
  let start = -1;
  for (let i = 0; i < out.length; i++) { const a = isArt(out[i]); if (a && +a[1] === 1 && out.slice(i + 1, i + 5).some(x => /^Section\s+1\.1\b/i.test(x) && isSec(x))) start = i; }
  if (start < 0) throw new Error('no Article 1 in body');

  // raw mode keeps the printed line breaks: a line joins the one before it unless it starts a list item, or the line
  // before it ended a sentence well short of the full width (wrapped lines run close to the right margin)
  const lens = out.map(x => x.length).sort((p, q) => p - q), full = lens[Math.floor(lens.length * 0.9)];
  const ends = prev => /[.:;!?]["”)]?$/.test(prev) && prev.length < full * 0.8 || /:$/.test(prev);
  // "within thirty" + "(30) days…" on the next line is one sentence, not a list item "(30)"
  const NUMWORD = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)$/i;
  const item = (t, prev) => lv(t) && !(/^\(\d+\)/.test(t) && NUMWORD.test(prev));
  const flow = (arr, t, prev) => { const last = arr[arr.length - 1]; if (last && !item(t, prev) && !ends(prev)) last.t = tidy(last.t + ' ' + t); else arr.push({ lv: item(t, prev) ? lv(t) : 0, t: tidy(t) }); };

  let pre = -1; for (let i = 0; i < start; i++) if (/^preamble$/i.test(out[i])) pre = i;
  const preamble = [];
  if (pre >= 0) for (let i = pre + 1; i < start; i++) flow(preamble, out[i], out[i - 1]);

  // the table of contents says how many articles there are; appendices can only start after the last one
  // (when the contents lines had dot leaders they were dropped, so assume at least 20 articles)
  const lastArt = Math.max(20, ...out.slice(0, start).map(t => +(isArt(t) || [0, 0])[1]));
  const articles = []; let art = null, sec = null, prev = '';
  const stop = /^(IN WITNESS WHEREOF|FOR THE AGENCY:?$|FOR THE UNION:?$|SIGNATURES?:?$|SIGNATURE PAGE|APPROVED BY:?$|APPENDIX\s+[A-Z]\b)/i;
  for (let i = start; i < out.length; i++) {
    const t = out[i];
    if (stop.test(t) && !/\.$/.test(t) && art && art.n >= lastArt) break;
    const a = isArt(t);
    // only the next article number counts as a heading ("Article 12 applies…" inside the text does not)
    if (a && (!art || +a[1] > art.n && +a[1] <= art.n + 3)) {
      let title = (a[2] || '').trim();
      if (!title && out[i + 1] && !isSec(out[i + 1])) title = out[++i];
      // a wrapped title: "(EDP & HDP)" on its own line, or a title ending in "and" / "," carried onto the next line
      while (out[i + 1] && !isSec(out[i + 1]) && (/^\([^)]*\)$/.test(out[i + 1]) || /(,|\band|&)$/i.test(title))) title += ' ' + out[++i];
      art = { n: +a[1], title: unshout(tidy(title)), intro: [], sections: [] }; articles.push(art); sec = null; prev = ''; continue;
    }
    // a heading belongs to this article and comes once ("Section 8.6, an employee…" in the text is a cross-reference)
    const s = art && isSec(t);
    if (s && +s[1].split('.')[0] === art.n && !art.sections.some(x => x.n === s[1]) && /^[A-Z]|^$/.test(s[2])) {
      sec = { n: s[1], title: unshout(tidy(s[2])), paras: [] }; art.sections.push(sec); prev = '';
      // a long title can wrap onto a short second line
      const nx = out[i + 1];
      if (nx && sec.title.length > 45 && nx.length < 50 && !lv(nx) && !isSec(nx) && !isArt(nx) && !/[.:;]$/.test(nx)) sec.title = tidy(sec.title + ' ' + out[++i]);
      continue;
    }
    if (!art) continue;
    flow(sec ? sec.paras : art.intro, t.replace(/^l\.\s/, '1. '), prev); prev = t;     // "l." typed for "1."
  }
  // indent by the order list styles appear in a section ("1." then "a." then "(1)"…), not by a fixed table, so a list
  // that goes straight from "a." to "i." is one step in. "i." after "h." is a letter, not a Roman numeral.
  const kind = (t, last) => /^\d+\./.test(t) ? 'n' : /^\(\d+\)/.test(t) ? 'pn' : /^\([a-z]\)/.test(t) ? 'pa'
    : /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)\.\s/.test(t) && !(/^i\./.test(t) && last === 'h') && !(/^v\./.test(t) && last === 'u') && !(/^x\./.test(t) && last === 'w') ? 'r' : 'a';
  const depth = paras => {
    let stack = [], lastLetter = '';
    for (const p of paras) {
      if (!p.lv) continue;
      const k = kind(p.t, lastLetter);
      if (k === 'a') lastLetter = p.t[0];
      const at = stack.indexOf(k);
      if (at >= 0) stack = stack.slice(0, at + 1); else stack.push(k);
      p.lv = Math.min(stack.length, 4);
    }
  };
  depth(preamble);
  for (const a of articles) { depth(a.intro); a.sections.forEach(s => depth(s.paras)); }
  return { preamble, articles };
}

const TYPOS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'contract-typos.json'), 'utf8')).fixes;
const used = {};
process.on('exit', () => { const unused = TYPOS.filter(([a]) => !used[a]).map(([a]) => a); console.log(`typo fixes used: ${Object.values(used).reduce((x, y) => x + y, 0)}${unused.length ? ' · not found: ' + unused.join(' | ') : ''}`); });
for (const u of units) {
  const page = fs.readFileSync(path.join(ROOT, 'backup', 'pages', u.contract.slice(1) + '.html'), 'utf8');
  const pdfs = [...new Set([...page.matchAll(/href="([^"]+\.pdf)"/gi)].map(x => x[1]))].filter(isCdn).map(p => ({ href: publishFile(ROOT, p), name: decodeURIComponent(p.split('/').pop()).replace(/\.pdf$/i, '') }));
  const text = execFileSync('pdftotext', ['-raw', '-enc', 'UTF-8', path.join(ROOT, 'site', pdfs[0].href), '-'], { encoding: 'utf8', maxBuffer: 64 << 20 });
  // dates from the signed cover page first (the old Duda pages had typos, e.g. "June 10, 202"), then the old page
  const txt = text.split('\n').slice(0, 40).join(' ') + ' ' + page.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const executed = (txt.match(new RegExp('Executed:?\\s*(' + MONTH + '\\s+\\d{1,2},\\s*\\d{4})')) || [])[1] || '';
  const ap = txt.match(new RegExp('(Approved by DoD|Effective Date|Approved by DCPAS|Approved):?\\s*(' + MONTH + '\\s+\\d{1,2},\\s*\\d{4})'));
  const c = parse(text);
  // typo fixes (tools/contract-typos.json); counts which ones were used so a stale entry shows up
  const fixP = p => { for (const [a, b] of TYPOS) if (p.t.includes(a)) { p.t = p.t.split(a).join(b); used[a] = (used[a] || 0) + 1; } };
  c.preamble.forEach(fixP);
  for (const a of c.articles) { a.intro.forEach(fixP); for (const s of a.sections) { s.paras.forEach(fixP); const t = { t: s.title }; fixP(t); s.title = t.t; } }
  const data = { code: u.code, slug: u.contract.slice(1), pdf: pdfs[0].href, extras: pdfs.slice(1), executed, approved: ap ? ap[2] : '', approvedLabel: ap ? (/Effective/.test(ap[1]) ? 'Effective' : 'Approved by DoD') : '', ...c };
  fs.writeFileSync(path.join(OUT, u.code + '.json'), JSON.stringify(data, null, 1));
  const secs = c.articles.reduce((a, x) => a + x.sections.length, 0);
  console.log(u.code.padEnd(5), `${c.articles.length} articles (${c.articles.map(a => a.n).join(',')}), ${secs} sections, preamble ${c.preamble.length}, executed ${executed || '?'}, ${data.approvedLabel} ${data.approved || '?'}`);
}
