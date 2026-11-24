// The document reader (/document?f=/files/x.pdf). When the website runs as a home screen app there is no browser Back
// button, so a PDF opened by itself is a dead end (Ben, Nov 24 2026). header.js sends PDF links here in that case: the
// pages are drawn inside our own page, with the header, the menu and a Back button. Reader: pdf.js 4.10.38 (Mozilla,
// Apache-2.0, kept in /vendor/pdfjs). Nothing leaves the site.
import * as pdfjs from '/vendor/pdfjs/pdf.min.js';
pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.js';

const box = document.querySelector('.dv'), msg = document.querySelector('.dv-msg'), num = document.querySelector('.dv-n');
const back = document.querySelector('[data-act="back"]'), share = document.querySelector('[data-act="share"]');
const f = new URLSearchParams(location.search).get('f') || '';
let url = null;
try { const u = new URL(f, location.origin); if (u.origin === location.origin && /\.pdf$/i.test(u.pathname)) url = u; } catch { /* not an address */ }

// the name of the link that was tapped; opened any other way, the file's own name
let title = '';
try { const s = JSON.parse(sessionStorage.getItem('l1776-doc') || 'null'); if (s && url && s.f === url.pathname) title = s.t; } catch { /* no storage */ }
if (!title && url) title = decodeURIComponent(url.pathname.split('/').pop()).replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ');
if (title) { document.querySelector('.dv-t').textContent = title; document.title = title + ' | LIUNA Local 1776'; }

back.addEventListener('click', () => {
  const here = location.href;
  if (history.length > 1) { history.back(); setTimeout(() => { if (location.href === here) location.href = '/'; }, 700); } else location.href = '/';
});
if (navigator.share && url) share.addEventListener('click', () => navigator.share({ title, url: url.href }).catch(() => {}));
else share.hidden = true;

const fail = () => { msg.hidden = false; msg.textContent = 'This document could not be opened here. Please try again, or ask us for a copy at contact_us@local1776.org.'; };

(async () => {
  if (!url) return fail();
  let doc, first;
  try {
    doc = await pdfjs.getDocument({ url: url.href, standardFontDataUrl: '/vendor/pdfjs/standard_fonts/', isEvalSupported: false, disableAutoFetch: true, disableStream: true }).promise;
    first = await doc.getPage(1);
  } catch { return fail(); }
  msg.hidden = true;
  const n = doc.numPages, s1 = first.getViewport({ scale: 1 }), pages = [];
  for (let i = 1; i <= n; i++) {   // a blank sheet for every page, so the scroll bar is right from the start
    const d = document.createElement('div');
    d.className = 'dv-p'; d.style.aspectRatio = s1.width + '/' + s1.height;
    d.setAttribute('role', 'img'); d.setAttribute('aria-label', 'Page ' + i + ' of ' + n);
    box.appendChild(d); pages.push({ d, i, state: 0 });
  }
  num.textContent = '1 / ' + n;

  // only the pages near the screen are drawn, and far ones are let go (a phone has little memory)
  async function draw(p) {
    if (p.state) return;
    p.state = 1;
    try {
      const pg = p.i === 1 ? first : await doc.getPage(p.i);
      const v1 = pg.getViewport({ scale: 1 });
      p.d.style.aspectRatio = v1.width + '/' + v1.height;
      const scale = Math.min(p.d.clientWidth / v1.width * Math.max(2, Math.min(3, window.devicePixelRatio || 1)), 4000 / Math.max(v1.width, v1.height));
      const v = pg.getViewport({ scale }), c = document.createElement('canvas');
      c.width = Math.floor(v.width); c.height = Math.floor(v.height);
      p.task = pg.render({ canvasContext: c.getContext('2d'), viewport: v });
      await p.task.promise;
      if (p.state === 1) { p.d.replaceChildren(c); p.state = 2; }
    } catch { if (p.state === 1) p.state = 0; }
  }
  const drop = p => { if (p.task) p.task.cancel(); p.task = null; if (p.state) { const c = p.d.querySelector('canvas'); if (c) c.width = c.height = 0; p.d.replaceChildren(); p.state = 0; } };
  const io = new IntersectionObserver(es => es.forEach(e => { const p = e.target.__p; if (e.isIntersecting) draw(p); else drop(p); }), { rootMargin: '1200px 0px' });
  pages.forEach(p => { p.d.__p = p; io.observe(p.d); });

  let t;
  addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => {
    const mid = innerHeight / 2; let lo = 0, hi = n - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (pages[m].d.getBoundingClientRect().bottom < mid) lo = m + 1; else hi = m; }
    num.textContent = (lo + 1) + ' / ' + n;
  }, 60); }, { passive: true });
  let w = innerWidth;
  addEventListener('resize', () => { if (innerWidth === w) return; w = innerWidth; pages.forEach(p => { if (p.state) { drop(p); draw(p); } }); });
})();
