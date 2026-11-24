// Make the downloadable PDFs FROM their web pages, so a page and its PDF always say the same thing (Ben, Nov 21 2026).
// Every PDF gets the standard Local 1776 document look: the page's print layout (current logo, contact line, title,
// white paper, navy/amber accents) and a footer on every page with the web address and "Page X of Y".
// Build the site first (node tools/build.mjs), then: node tools/make-pdfs.mjs   (writes into site/files/, then rebuild)
// Add a document by adding a line to DOCS.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { start } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DOCS = [
  { page: '/formal-meeting-checklist', out: 'liuna-local-1776-formal-meeting-checklist.pdf' },
  { page: '/weingarten-checklist', out: 'liuna-local-1776-weingarten-checklist.pdf' },
  { page: '/law-enforcement-leave-fact-sheet', out: 'liuna-local-1776-law-enforcement-leave-fact-sheet.pdf' },
  { page: '/rules-for-the-use-of-force', out: 'liuna-local-1776-rules-for-the-use-of-force-2020.pdf' },
];
// a one-off test print: node tools/make-pdfs.mjs --page=/emergency-leave-tracker --out=C:/temp/test.pdf
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
if (arg('page')) DOCS.splice(0, DOCS.length, { page: arg('page'), out: arg('out') });
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const PORT = 8778, DBG = 9334;
const server = await start(PORT);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'l1776-pdf-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
async function wsUrl() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${DBG}/json/list`); const t = (await r.json()).find(x => x.type === 'page'); if (t) return t.webSocketDebuggerUrl; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome did not start');
}
const ws = new WebSocket(await wsUrl());
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const waiting = new Map(); const events = [];
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } else if (m.method) events.push(m); });
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; waiting.set(i, m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const footer = page => `<div style="width:100%;font-family:Arial,sans-serif;font-size:8px;color:#5f6672;padding:0 0.6in;display:flex;justify-content:space-between">
  <span>LIUNA Local 1776 &middot; www.local1776.org${page}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;

await send('Page.enable');
for (const d of DOCS.filter(d => !only.length || only.some(o => d.page.includes(o)))) {
  events.length = 0;
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}${d.page}` });
  for (let i = 0; i < 100 && !events.some(e => e.method === 'Page.loadEventFired'); i++) await sleep(100);
  await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>true)', awaitPromise: true });
  await sleep(300);
  const { data } = await send('Page.printToPDF', {
    printBackground: true, preferCSSPageSize: true, paperWidth: 8.5, paperHeight: 11,
    marginTop: 0.5, marginBottom: 0.6, marginLeft: 0.6, marginRight: 0.6,
    displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer(d.page),
  });
  const out = path.isAbsolute(d.out) ? d.out : path.join(ROOT, 'site', 'files', d.out);
  fs.writeFileSync(out, Buffer.from(data, 'base64'));
  console.log(`${d.out}  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}
ws.close(); chrome.kill(); server.close();
setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} process.exit(0); }, 500);
