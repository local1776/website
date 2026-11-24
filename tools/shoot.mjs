// Full-page screenshots of the built site at phone and desktop widths, using the installed Chrome.
// Talks to Chrome over its DevTools protocol with Node's built-in WebSocket (no packages needed).
// Run: node tools/shoot.mjs <outDir> /path1 /path2 ...   [--widths=390,1280] [--max=0 (full page) | pixels]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { start } from './serve.mjs';

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const s = a.slice(2), i = s.indexOf('='); return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)]; }));
const [outDir, ...paths] = args.filter(a => !a.startsWith('--'));
const widths = (opt.widths || '390,1280').split(',').map(Number);
const maxH = +(opt.max || 0);
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
fs.mkdirSync(outDir, { recursive: true });

const PORT = 8777, DBG = 9333;
const server = await start(PORT);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'l1776-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${prof}`, '--hide-scrollbars', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });

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

await send('Page.enable');
for (const p of paths) {
  for (const w of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 });
    events.length = 0;
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}${p}` });
    for (let i = 0; i < 100 && !events.some(e => e.method === 'Page.loadEventFired'); i++) await sleep(100);
    await send('Runtime.evaluate', { expression: "Promise.all([...document.images].map(i=>{i.loading='eager';return i.complete?0:new Promise(r=>{i.onload=i.onerror=r;})})).then(()=>document.fonts.ready).then(()=>true)", awaitPromise: true });
    if (opt.eval) { const r = await send('Runtime.evaluate', { expression: opt.eval, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) console.log('  eval error:', r.exceptionDetails.exception?.description || r.exceptionDetails.text); else if (r.result?.value !== undefined) console.log('  eval:', JSON.stringify(r.result.value)); }   // --eval="js" runs before the shot
    await sleep(+(opt.wait || 400));                                                               // --wait=3000 for map tiles etc.
    const { result } = await send('Runtime.evaluate', { expression: 'Math.ceil(document.documentElement.scrollHeight)', returnByValue: true });
    const h = maxH ? Math.min(result.value, maxH) : result.value;
    const base = (p === '/' ? 'home' : p.replace(/^\//, '').replace(/[\/?#=&]/g, '_')) + `-${w}`;
    const slice = +(opt.slice || 0);   // --slice=1400 cuts the page into readable sections
    const tail = +(opt.tail || 0);     // --tail=700 shoots only the bottom of the page (e.g. the footer)
    const parts = slice && !tail ? Math.ceil(h / slice) : 1;
    for (let k = 0; k < parts; k++) {
      let y = slice ? k * slice : 0, ph = slice ? Math.min(slice, h - y) : h;
      if (tail) { y = Math.max(0, result.value - tail); ph = result.value - y; }
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y, width: w, height: ph, scale: 1 } });
      const name = base + (parts > 1 ? `-${k + 1}` : '') + '.png';
      fs.writeFileSync(path.join(outDir, name), Buffer.from(shot.data, 'base64'));
      console.log(`${name}  ${w}x${ph}`);
    }
  }
}
ws.close(); chrome.kill(); server.close();
setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} process.exit(0); }, 500);
