// ONE-TIME move of the two sister sites into this site (Ben, Nov 22 2026: "incorporate them into the main site").
//   reform.local1776.org      (repo local1776/reform)          → /reform          site/apps/reform.html + .css
//   calculator.local1776.org  (repo local1776/agr-calculator)  → /agr-calculator  site/apps/agr-calculator.html + .css
// Reads the LIVE pages (their index.html — the reform repo's source/ folder had fallen behind them) from the copies in
// backup/sister-sites/. Each page keeps its own content, styles and scripts; the build wraps it in this site's header,
// contact strip and footer and gives it its own menu (Home + its sections).
// After this has run, edit site/apps/ — never these old repos. Run: node tools/import-sister-sites.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const FROM = path.join(ROOT, 'backup', 'sister-sites');
const SITE = path.join(ROOT, 'site');
const APPS = path.join(SITE, 'apps');
fs.mkdirSync(APPS, { recursive: true });

const read = f => fs.readFileSync(f, 'utf8');
const attr = (h, re) => (h.match(re) || [])[1] || '';
const unesc = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function split(html) {
  const head = html.slice(0, html.indexOf('</head>'));
  const css = attr(head, /<style>([\s\S]*?)<\/style>/);
  const navAt = html.indexOf('<nav class="nav"'), navEnd = html.indexOf('</nav>', navAt) + '</nav>'.length;
  const menu = [...html.slice(navAt, navEnd).matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(m => [m[1], unesc(m[2])]);
  const body = html.slice(navEnd, html.lastIndexOf('</body>')).replace(/^\s+/, '');
  return {
    head, css, menu, body,
    title: unesc(attr(head, /<title>([^<]*)<\/title>/)).replace(/\s*\|\s*LIUNA Local 1776$/, ''),
    description: unesc(attr(head, /<meta name="description" content="([^"]*)"/)),
    ogTitle: unesc(attr(head, /<meta property="og:title" content="([^"]*)"/)),
    ogDescription: unesc(attr(head, /<meta property="og:description" content="([^"]*)"/)),
  };
}
// links to this site, and between the two old sites, become plain links on this site (same tab)
function relink(h) {
  return h
    .replace(/<a ([^>]*?)href="https:\/\/(?:www\.)?local1776\.org(\/[^"]*)?"([^>]*)>/g, (_, a, p, b) => `<a ${a}href="${p || '/'}"${b.replace(/\s*target="_blank"|\s*rel="noopener"/g, '')}>`.replace(/\s+>/, '>'))
    .replace(/<a ([^>]*?)href="https:\/\/calculator\.local1776\.org\/?"([^>]*)>/g, (_, a, b) => `<a ${a}href="/agr-calculator"${b.replace(/\s*target="_blank"|\s*rel="noopener"/g, '')}>`)
    .replace(/<a ([^>]*?)href="https:\/\/reform\.local1776\.org\/?(#[^"]*)?"([^>]*)>/g, (_, a, hash, b) => `<a ${a}href="/reform${hash || ''}"${b.replace(/\s*target="_blank"|\s*rel="noopener"/g, '')}>`);
}
// pictures written into the page as data: URIs become files under site/img/<dir>/ (lighter page, cached by the browser)
function pullImages(text, dir, known) {
  fs.mkdirSync(path.join(SITE, 'img', dir), { recursive: true });
  const seen = new Map(); let n = 0;
  const out = text.replace(/data:image\/(png|jpe?g|gif|webp);base64,([A-Za-z0-9+/=]+)/g, (all, ext, b64) => {
    const buf = Buffer.from(b64, 'base64'), sha = crypto.createHash('sha1').update(buf).digest('hex');
    if (!seen.has(sha)) {
      const name = known.get(sha) || `${dir}-${String(++n).padStart(2, '0')}.${ext === 'jpeg' ? 'jpg' : ext}`;
      fs.writeFileSync(path.join(SITE, 'img', dir, name), buf);
      seen.set(sha, `/img/${dir}/${name}`);
    }
    return seen.get(sha);
  });
  return { text: out, files: [...seen.values()] };
}
const hashes = d => new Map(fs.existsSync(d) ? fs.readdirSync(d).map(f => [crypto.createHash('sha1').update(fs.readFileSync(path.join(d, f))).digest('hex'), f]) : []);
const writePage = (name, meta, body, css) => {
  fs.writeFileSync(path.join(APPS, name + '.html'), `<!--page ${JSON.stringify(meta, null, 1).replace(/\n\s*/g, ' ')} -->\n${body.trimEnd()}\n`);
  fs.writeFileSync(path.join(APPS, name + '.css'), css.trim() + '\n');
};

// ---------- Reform ----------
{
  const src = path.join(FROM, 'reform');
  const p = split(read(path.join(src, 'index.html')));
  // the handouts: /files/reform/ (old address reform.local1776.org/handouts/... forwards there)
  fs.mkdirSync(path.join(SITE, 'files', 'reform'), { recursive: true });
  for (const f of fs.readdirSync(path.join(src, 'handouts'))) fs.copyFileSync(path.join(src, 'handouts', f), path.join(SITE, 'files', 'reform', f));
  let body = relink(p.body).replace(/(["'])handouts\//g, '$1/files/reform/');
  // the page note: the site footer already says who publishes it, that it is not a government website, and the DoD line
  body = body.replace(/Published by <a [^>]*>LIUNA Local 1776<\/a>\. This is not a U\.S\. government website\. /, '')
    .replace(/sponsors, approves or endorses this website or anything on it\. The appearance of U\.S\. Department of Defense visual information does not imply or constitute DoD endorsement\./,
      'sponsors, approves or endorses this page or anything on it.');
  const img = pullImages(body, 'reform', hashes(path.join(src, 'source', 'site', 'assets', 'img')));
  const css = pullImages(p.css, 'reform', hashes(path.join(src, 'source', 'site', 'assets', 'img')));
  fs.copyFileSync(path.join(src, 'og.png'), path.join(SITE, 'img', 'reform', 'og.png'));
  // menu labels in Title Case (house rule)
  const LABEL = { 'Who was hit': 'Who Was Hit', 'The fix': 'The Fix' };
  writePage('reform', {
    title: p.title, nav: 'reform', app: 'reform', description: p.description, ogTitle: p.ogTitle, ogDescription: p.ogDescription,
    image: 'img/reform/og.png', menu: p.menu.map(([h, l]) => [h, LABEL[l] || l]),
  }, img.text, css.text);
  console.log(`reform: ${p.menu.length} menu items, ${img.files.length + css.files.length} pictures → site/img/reform/, body ${(img.text.length / 1024).toFixed(0)} KB`);
}

// ---------- AGR Calculator ----------
{
  const src = path.join(FROM, 'agr-calculator');
  const p = split(read(path.join(src, 'index.html')));
  let body = relink(p.body);
  // Print / Save as PDF: the pop-up copies the page's <style> blocks, whose rules now apply inside <main id="main">;
  // the in-page fallback finds the content wrapper under <main> instead of directly under <body>
  const before = body;
  body = body.replace("document.querySelector('body > .wrap')", "document.querySelector('#main > .wrap')")
    .replace(`'<body class="printing"><div class="wrap">'+built.outerHTML+'</div></body></html>'`, `'<body class="printing"><main id="main"><div class="wrap">'+built.outerHTML+'</div></main></body></html>'`);
  if (body === before || !body.includes("'#main > .wrap'") || !body.includes('<main id="main"><div class="wrap">')) throw new Error('calculator: print code not found — check by hand');
  fs.mkdirSync(path.join(SITE, 'img', 'agr'), { recursive: true });
  fs.copyFileSync(path.join(src, 'og.png'), path.join(SITE, 'img', 'agr', 'og.png'));
  writePage('agr-calculator', {
    title: 'Technician vs. AGR Pay Calculator', nav: 'agr', app: 'agr', description: p.description, ogTitle: p.ogTitle, ogDescription: p.ogDescription,
    image: 'img/agr/og.png', menu: p.menu.filter(([h]) => h.startsWith('#')), current: '#top',
  }, body, p.css);
  console.log(`agr-calculator: menu ${JSON.stringify(p.menu)}, body ${(body.length / 1024).toFixed(0)} KB, css ${(p.css.length / 1024).toFixed(0)} KB (fonts built in)`);
}
