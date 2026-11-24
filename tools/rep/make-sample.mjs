// Sample Representation Request PDFs (Ben, Nov 21 2026; per topic Nov 22 2026). For each case file it fills in the REAL
// form at /assistance-request in headless Chrome, step by step (Next on every page, so the page checks run), collects
// exactly what the form would send, then prints the two PDFs from tools/rep/packet.mjs ONCE PER TOPIC, as the Union App
// does. Case files: given-once "fields"/"radios"/"checks", and "topics": [{key, boxes, radios, fields, incidents, filings}]. Build the site first (node tools/build.mjs). Then:
//   node tools/rep/make-sample.mjs                       → tools/rep/samples/*.json + private/rep-samples/*.json
//   node tools/rep/make-sample.mjs path/to/case.json     → just that case
// Output: review/representation-samples/<name> - <n> <Topic> - 1 Designation.pdf and - 2 Request Details.pdf (review/ is not committed).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { start } from '../serve.mjs';
import { designationHtml, packetHtml, header, footer } from './packet.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'review', 'representation-samples');   // review/ = what Ben opens (not committed)
const dirFiles = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => path.join(d, f)) : [];
const cases = process.argv.slice(2).filter(a => !a.startsWith('--'));
const files = cases.length ? cases.map(c => path.resolve(c)) : [...dirFiles(path.join(ROOT, 'tools/rep/samples')), ...dirFiles(path.join(ROOT, 'private/rep-samples'))];
fs.mkdirSync(OUT, { recursive: true });
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'site/img/logo.png')).toString('base64');

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const PORT = 8779, DBG = 9335;
const server = await start(PORT);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'l1776-rep-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wsUrl() {
  for (let i = 0; i < 50; i++) {
    try { const t = (await (await fetch(`http://127.0.0.1:${DBG}/json/list`)).json()).find(x => x.type === 'page'); if (t) return t.webSocketDebuggerUrl; } catch {}
    await sleep(200);
  }
  throw new Error('Chrome did not start');
}
const ws = new WebSocket(await wsUrl());
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const waiting = new Map(); const events = [];
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } else if (m.method) events.push(m); });
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; waiting.set(i, m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
async function go(url) {
  events.length = 0;
  await send('Page.navigate', { url });
  for (let i = 0; i < 100 && !events.some(e => e.method === 'Page.loadEventFired'); i++) await sleep(100);
  await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>true)', awaitPromise: true });
}

// runs inside the page: fill the form like a person would, step by step (Next on every page, so the page checks run),
// then read it the way site.js does when it sends. Returns { data, errors, steps }.
function fill(c) {
  const f = document.getElementById('rq'), fire = (el, t) => el.dispatchEvent(new Event(t || 'change', { bubbles: true }));
  const tick = el => { el.checked = true; fire(el); };
  const msg = () => f.querySelector('.rq-nav .form-msg'), steps = [], errors = [];
  const next = () => { f.querySelector('[data-act="next"]').click(); const m = msg(); steps.push(f.querySelector('[data-step]').textContent); if (m.classList.contains('err')) errors.push(steps[steps.length - 1] + ' → ' + m.textContent); };
  f.agency.value = c.agency; fire(f.agency);
  if (c.otherAgency) { f.otherAgency.value = c.otherAgency; fire(f.otherAgency, 'input'); }
  Object.entries(c.radios || {}).forEach(([n, v]) => { const r = f.querySelector('input[name="' + n + '"][value="' + v + '"]'); if (!r) throw new Error('no radio: ' + n + '=' + v); tick(r); });
  Object.entries(c.fields || {}).forEach(([n, v]) => { const el = f.elements[n]; if (!el) throw new Error('no field: ' + n); el.value = v; fire(el, 'input'); });
  c.topics.forEach(t => f.querySelector('[data-topic="' + t.key + '"]').click());
  next();
  c.topics.forEach(t => {
    const p = f.querySelector('[data-page="t:' + t.key + '"]');
    const box = k => { const i = [...p.querySelectorAll('input[data-key]')].find(x => x.getAttribute('data-key') === k); if (!i) throw new Error('no box: ' + k); return i; };
    t.boxes.forEach(k => tick(box(k)));
    Object.entries(t.radios || {}).forEach(([n, v]) => { const r = p.querySelector('input[data-tf="' + n + '"][value="' + v + '"]'); if (!r) throw new Error(t.key + ': no radio ' + n + '=' + v); tick(r); });
    Object.entries(t.fields || {}).forEach(([n, v]) => { const el = p.querySelector('[data-tf="' + n + '"]'); if (!el) throw new Error(t.key + ': no field ' + n); el.value = v; fire(el, 'input'); });
    (t.incidents || []).forEach((n, i) => {
      if (i) p.querySelector('[data-act="add-incident"]').click();
      const card = p.querySelectorAll('.rq-inc')[i];
      card.querySelector('[data-f="date"]').value = n.date || '';
      if (n.ongoing) card.querySelector('[data-f="ongoing"]').checked = true;
      card.querySelector('[data-f="what"]').value = n.what; fire(card.querySelector('[data-f="what"]'), 'input');
    });
    (t.filings || []).forEach(x => {
      tick(box('filed: ' + x.what));
      const s = p.querySelector('.rq-filed [data-sub-of="filed: ' + x.what + '"]');
      Object.entries(x).forEach(([k, v]) => { const el = s.querySelector('[data-ff="' + k + '"]'); if (el) el.value = v; });
      fire(s.querySelector('[data-ff]'), 'input');
    });
    next();
  });
  (c.checks || []).forEach(n => tick(f.elements[n]));
  (c.hsReasons || []).forEach(x => tick(f.querySelector('[data-hsr][value="' + x + '"]')));
  f.dispatchEvent(new Event('collect'));
  const data = {};
  [...f.elements].forEach(el => { if (!el.name || el.name.charAt(0) === '_' || (el.type === 'radio' && !el.checked)) return; data[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
  return { data, errors, steps };
}

await send('Page.enable');
const pdf = async (r, base) => {
  for (const [n, label, html, packet] of [['1 Designation', 'Designation of Representation', designationHtml(r, { logo }), false], ['2 Request Details', 'Request Details · Confidential', packetHtml(r, { logo }), true]]) {
    const h = path.join(OUT, `${base} - ${n}.html`);
    fs.writeFileSync(h, html);
    await go(pathToFileURL(h).href);
    await sleep(300);
    const { data } = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: packet ? header(r) : '<span></span>', footerTemplate: footer(label, r, packet) });
    const out = path.join(OUT, `${base} - ${n}.pdf`);
    fs.writeFileSync(out, Buffer.from(data, 'base64'));
    console.log(path.relative(ROOT, out));
  }
};
for (const file of files) {
  const c = JSON.parse(fs.readFileSync(file, 'utf8'));
  await go(`http://127.0.0.1:${PORT}/assistance-request`);
  // the form works out deadlines against "today": make today the day this request was sent
  const res = await send('Runtime.evaluate', { expression: `Date.now = () => ${Date.parse(c.submittedAt)}; try { localStorage.clear(); } catch (e) {} (${fill})(${JSON.stringify(c)})`, returnByValue: true });
  if (res.exceptionDetails) throw new Error(path.basename(file) + ': ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text));
  const { data, errors, steps } = res.result.value;
  console.log(path.basename(file) + ': ' + steps.join(' → '));
  if (errors.length) throw new Error(path.basename(file) + ': the form stopped: ' + errors.join('; '));
  const r = { ...data, submittedAt: c.submittedAt, id: c.id };
  const name = r.lastName + ', ' + r.firstName;
  fs.writeFileSync(path.join(OUT, name + ' - request.json'), JSON.stringify(r, null, 2));   // what the app would receive
  // the app makes the two PDFs once PER TOPIC: the given-once fields plus that one topic
  const topics = JSON.parse(r.topics);
  for (const [i, t] of topics.entries()) await pdf({ ...r, topics: JSON.stringify([t]), id: c.id + (topics.length > 1 ? '-' + (i + 1) : '') }, `${name} - ${i + 1} ${t.topic}`);
}
ws.close(); chrome.kill(); server.close();
try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
process.exit(0);
