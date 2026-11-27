// Build www.local1776.org into dist/.
// Each page in site/pages/*.html starts with a settings comment:  <!--page {"title": "...", "nav": "contact", ...} -->
// and is wrapped in the shared band, masthead, menu and footer below.
// Placeholders a page can use:  {{POSTS:n}} latest n blog posts · {{FEEDS}} outside federal-news headlines.
// The headlines are fetched at build time; the published site is rebuilt on a schedule so they stay current.
// Run: node tools/build.mjs            (add --offline to skip fetching headlines)
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { congressData, vvHtml, congressGovUrl } from './lib/congress.mjs';
import { lobbyData, lobbyLines } from './lib/lobby.mjs';
import { appNews } from './lib/news.mjs';
import { storyPhotos } from './lib/photos.mjs';
import { scopeCss, chromeCss } from './lib/scope-css.mjs';
import { appAgencies, mergeAgencies } from './lib/agencies.mjs';
import { project as albers, round as rnd } from './lib/albers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'site');
const OUT = path.join(ROOT, 'dist');
const SITE = 'https://www.local1776.org';
const OFFLINE = process.argv.includes('--offline');
// the website's links to the Union App, in ONE file: site/data/site-config.json (Firebase project id, forms address)
const CONFIG = JSON.parse(fs.readFileSync(path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site'), 'data', 'site-config.json'), 'utf8'));
// THE LAUNCH SWITCH. Until Ben launches, every page says noindex and robots.txt keeps search engines out. At launch, set
// L1776_LIVE=1 in .github/workflows/build.yml (or build with --live): pages become indexable and robots.txt points at the sitemap.
const LIVE = process.env.L1776_LIVE === '1' || process.argv.includes('--live');

// THE TWO REQUEST FORMS' SWITCHES (Nov 23 2026): site-config.json representationForm / uniformForm. Anything but "on" = off:
// the published page has no form and no script, every link to it is grayed out with "Coming Soon" (offLinks), and it is left
// out of the sitemap, the site search and the header's rotating line. Pages say different things with
// {{IF:representation}}…{{ELSE}}…{{END}}; {{OFFNOTE}} = the box shown in place of a form.
// --forms-on builds with both on, for this PC's own tests and samples (the Actions build never uses it).
// our cases (site/data/cases.json): draft:true shows only with --cases
const CASES_PAGES = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'cases.json'), 'utf8')).filter(c => !c.draft || process.argv.includes('--cases'));
const FORMS_ON = Object.fromEntries(['representation', 'uniform'].map(k => [k, CONFIG[k + 'Form'] === 'on' || process.argv.includes('--forms-on')]));
const FORM_PAGE = { representation: '/assistance-request', uniform: '/request-uniforms-and-other-personal-items' };
const FORM_JS = { representation: ['rep.js'], uniform: ['uniform.js', 'ufig.js'] };
const OFF = Object.keys(FORMS_ON).filter(k => !FORMS_ON[k]), OFF_PAGES = OFF.map(k => FORM_PAGE[k]);
const HELP = '/assistance-request-portal';   // the Help page goes off with the Representation Request (Ben, Nov 23 2026): its buttons are gray, its text links go to Contact Us
if (!FORMS_ON.representation) OFF_PAGES.push(HELP);
const OFFNOTE = '<div class="off-note"><p class="off-h">Online requests are coming soon.</p><p><span>Need help now? Deadlines can be short.</span> <span>Call <a href="tel:+18005695861">(800) 569-5861</a> or <a href="/contact-us#message">send us a message</a>.</span></p></div>';
const formIf = src => src.replace(/\{\{IF:(\w+)\}\}([\s\S]*?)\{\{ELSE\}\}([\s\S]*?)\{\{END\}\}/g, (_, k, on, off) => { if (!(k in FORMS_ON)) throw new Error('{{IF:' + k + '}}: no such form'); return FORMS_ON[k] ? on : off; })
  .replace(/\{\{OFFNOTE\}\}/g, OFFNOTE);
// every link to a form that is off: same place and size, gray, no href (so no click and no Tab stop), "Coming Soon" beside it
function offLinks(html) {
  if (!OFF.length) return html;
  return html.replace(/<a\b([^>]*?)\shref="(?:https?:\/\/(?:www\.)?local1776\.org)?(\/[\w-]+)\/?(?:[#?][^"]*)?"([^>]*)>([\s\S]*?)<\/a>/g, (m, a, href, b, inner) => {
    if (!OFF_PAGES.includes(href)) return m;
    const soon = '<span class="soon">Coming Soon</span>';
    let at = (a + b).replace(/\s(?:target|rel|title)="[^"]*"/g, '');
    at = /class="/.test(at) ? at.replace(/class="/, 'class="off ') : at + ' class="off"';
    if (href === HELP && !/class="btn/.test(a + b) && inner !== 'Request Help') return '<a' + a + ' href="/contact-us#message"' + b + '>' + inner + '</a>';
    const open = '<a' + at + ' role="link" aria-disabled="true">';
    if (/class="off btn\b/.test(at)) return open + inner + soon + '</a>';
    if (/class="off hp-card\b/.test(at)) return open + inner.replace(/<span class="hp-go"[^>]*>[\s\S]*?<\/span>/, '<span class="hp-go">Coming Soon</span>') + '</a>';
    return open + inner + ' ' + soon + '</a>';
  });
}

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
const imgUrl = i => (/^(https?:)?\/\//.test(i) || i.startsWith('/') ? i : '/' + i);   // our pictures (img/...) or the app's (https://...)
const apDate = d => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;   // newspaper style, as on reform
// an outside headline's day, Eastern time (a late-evening story keeps its own day wherever the build runs); null = no date
const easternDay = d => d && !isNaN(d) ? new Date(d.toLocaleDateString('en-US', { timeZone: 'America/New_York' }) + ' UTC') : null;

// ---------- the menu (Ben, Nov 20 2026) ----------
const NAV = [
  ['home', '/', 'Home'], ['news', '/blog', 'News'], ['legislation', '/legislation', 'Legislation'],
  // the two sister sites, folded in (Ben, Nov 22 2026); on their own pages the menu becomes Home + that page's sections
  ['reform', '/reform', 'Reform'], ['agr', '/agr-calculator', 'AGR'],
  ['agencies', '/agencies', 'Agencies'], ['resources', '/resources', 'Resources'],
  ['benefits', '/benefits', 'Benefits'], ['about', '/about', 'About'], ['contact', '/contact-us', 'Contact'],
];
const ICON = {
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6z"/><path d="m8.8 12.2 2.3 2.3 4.3-4.6"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.6l.4-3H13.5V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
  // the signed PDF, no label under it: a page with PDF written on it (Ben, Nov 24 2026)
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 11V4a2 2 0 0 1 2-2h7l5 5v4"/><path d="M14 2v5h5"/><path d="M5 20.5A1.5 1.5 0 0 0 6.5 22h11a1.5 1.5 0 0 0 1.5-1.5"/><text x="12" y="18.6" text-anchor="middle" font-family="Libre Franklin,Arial,sans-serif" font-size="8.4" font-weight="800" letter-spacing=".2" fill="currentColor" stroke="none">PDF</text></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"/><path d="m8 6.5 4-3.5 4 3.5"/><path d="M7 10.5H5.5V21h13V10.5H17"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  // sign in to the Union App: an arrow going in through a doorway (Lucide "log-in", ISC; Ben, Nov 26 2026: not a person, not a key).
  // Not used yet: Ben wants the app only as a quiet footer link for now ("don't put it in the header yet"); the tile goes between Help and Join.
  login: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/></svg>',
  join: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h12l4 4v12H4z"/><path d="M8 12h8M8 16h5"/></svg>',
  calc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01M8.5 18h.01M12 18h.01"/><path d="M15.5 15v3"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M7 14h10v7H7z"/></svg>',
  clear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>',
  restart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  upc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  shirt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3 4 5.5l1.8 4.2L8 8.8V21h8V8.8l2.2.9L20 5.5 15 3c-.4 1.4-1.6 2.3-3 2.3S9.4 4.4 9 3z"/></svg>',
  news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M8 9h5M8 13h5"/></svg>',
};
// The word is always there for screen readers; class "icon" hides it on screen (Ben: Back, Close, Directions need no label)
// a button to another website opens in a new tab (Ben, Nov 21 2026: the reform card's Plan button)
const button = (href, icon, word, cls = '') => `<a class="btn${cls ? ' ' + cls : ''}" href="${href}"${/^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : ''}${/icon/.test(cls) ? ` title="${word}"` : ''}><span class="ico">${ICON[icon]}</span><span class="lbl">${word}</span></a>`;
const submit = (icon, word) => `<button class="btn" type="submit"><span class="ico">${ICON[icon]}</span><span class="lbl">${word}</span></button>`;

// every link to a PDF opens in a new tab (Ben, Nov 21 2026)
// every link to a page OUTSIDE our website opens in a new tab (Ben, Nov 25 2026: "any links to pages outside of our website should
// always open in a new tab"). Run over every built page; header.js does the same for links scripts add while the page is open.
const OWN_HOST = /^https?:\/\/(www\.)?local1776\.org(\/|$)/i;
const extNewTab = html => html.replace(/<a\b[^>]*>/gi, tag => {
  const m = tag.match(/\shref="(https?:\/\/[^"]+)"/i);
  if (!m || OWN_HOST.test(m[1]) || /\starget=/i.test(tag)) return tag;
  return tag.replace(/>$/, ' target="_blank"' + (/\srel=/i.test(tag) ? '' : ' rel="noopener"') + '>');
});
const pdfNewTab = html => html.replace(/<a ((?:(?!target=)[^>])*?)href="([^"]+\.pdf)"((?:(?!target=)[^>])*)>/gi, '<a $1href="$2" target="_blank" rel="noopener"$3>');
function layout(meta, body) {
  // section rules: only the FIRST one on a page is thick; the rest are thin (Ben, Nov 22 2026: thick dividers only where needed)
  if (!meta.app) body = body.replace('class="sec-head', 'class="sec-head lead');
  // the header tile filled navy (amber icon) means ONLY "you are here": AGR on the calculator, Uniform on the Uniform Request,
  // Help on the Help page and the Representation Request; on every other page all three are outlined. Amber means "notice
  // this" and belongs to Join alone, on every page (Ben, Nov 22 2026: "We need to be consistent… Let's do it your way").
  if (OFF_PAGES.includes(meta.path)) meta.noindex = true;
  const onTile = meta.app === 'agr' ? 'agr' : meta.path === FORM_PAGE.uniform && FORMS_ON.uniform ? 'uniform'
    : FORMS_ON.representation && [HELP, FORM_PAGE.representation].includes(meta.path) ? 'help' : '';
  const url = SITE + (meta.path === '/' ? '/' : meta.path);
  const title = meta.title === 'LIUNA Local 1776' ? meta.title : `${meta.title} | LIUNA Local 1776`;
  // App pages (Reform, AGR Calculator — site/apps/): the menu is Home + the page's own sections (Ben, Nov 22 2026: "collapse
  // all of those… leave the home button there so they can go back home"). id="nav": reform's script routes its tabs from it.
  const nav = meta.app
    ? [['/', 'Home'], ...meta.menu].map(([href, label]) => `<a href="${href}" data-t="${esc(label)}"${href === meta.current ? ' aria-current="true"' : ''}>${esc(label)}</a>`).join('\n    ')
    : NAV.map(([k, href, label]) => `<a href="${href}" data-t="${label}"${k === meta.nav ? ' aria-current="page"' : ''}>${label}</a>`).join('\n    ');
  return offLinks(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(meta.description)}">
${LIVE && !meta.noindex ? '' : '<meta name="robots" content="noindex">\n'}<link rel="canonical" href="${url}">
<link rel="icon" type="image/png" href="/img/favicon.png?v=2">
<link rel="apple-touch-icon" href="/img/home-icon.png">
<meta property="og:type" content="${meta.ogType || 'website'}">
<meta property="og:site_name" content="LIUNA Local 1776">
<meta property="og:title" content="${esc(meta.ogTitle || meta.title)}">
<meta property="og:description" content="${esc(meta.ogDescription || meta.description)}">
<meta property="og:url" content="${url}">${meta.image ? `\n<meta property="og:image" content="${/^https?:/.test(meta.image) ? meta.image : SITE + '/' + meta.image}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=Libre+Franklin:wght@400;500;600;700&display=swap" rel="stylesheet">
${meta.app ? `<link rel="stylesheet" href="/css/chrome.css">\n<style>\n${meta.css}\n</style>` : '<link rel="stylesheet" href="/css/site.css">'}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="print-head" aria-hidden="true"><img src="/img/logo.png" width="624" height="160" alt=""><div><b>LIUNA Local 1776</b><span>PO Box 1794, Abita Springs, LA 70420 &middot; 1 (800) 569-5861 &middot; www.local1776.org</span></div></div>
<div class="mast"><div class="wrap">
  <a class="logo-link" href="/"><img class="logo" src="/img/logo-white.png" width="624" height="160" alt="LIUNA Local 1776. We represent U.S. government employees. Feel the power."></a>
  <div class="hline" hidden><div class="hl-top"><span class="hl-k"></span><span class="hl-ctl"><button type="button" class="hl-b" data-go="-1" aria-label="Previous" title="Previous">${ICON.prev}</button><button type="button" class="hl-b hl-p" aria-label="Pause" title="Pause">${ICON.pause}</button><button type="button" class="hl-b" data-go="1" aria-label="Next" title="Next">${ICON.next}</button></span></div><a class="hl-item" href="/"><span class="hl-t"></span></a></div>
  <div class="acts">${button('/agr-calculator', 'calc', 'AGR', onTile === 'agr' ? '' : 'alt').replace('<a ', '<a title="AGR Calculator" ')}${button('/request-uniforms-and-other-personal-items', 'shirt', 'Uniform', onTile === 'uniform' ? '' : 'alt').replace('<a ', '<a title="Request Uniforms" ')}${button('/assistance-request-portal', 'help', 'Help', onTile === 'help' ? '' : 'alt')}${button('/join-now', 'join', 'Join', 'join')}</div>
</div></div>
<nav class="nav"${meta.app ? ' id="nav"' : ''} aria-label="${meta.app ? 'Sections' : 'Site'}">
  <div class="wrap">
    ${nav}
    <button type="button" class="nav-find" aria-label="Search the site" title="Search" aria-expanded="false" aria-controls="find">${ICON.search}</button>
  </div>
</nav>
<div class="find" id="find" role="search" hidden><div class="find-in">
  <div class="find-row"><input type="search" autocomplete="off" spellcheck="false" maxlength="80" aria-label="Search the site" placeholder="Search the site"><button type="button" class="find-x" aria-label="Close search" title="Close">${ICON.close}</button></div>
  <div class="find-out" aria-live="polite"></div>
</div></div>
<div class="strip"><div class="wrap">
  <span class="who"><span class="lo">LIUNA Local 1776 &middot; </span>We represent U.S. government employees</span>
  <span class="reach"><a href="tel:+18005695861">1 (800) 569-5861</a><a href="mailto:contact_us@local1776.org">contact_us@local1776.org</a></span>
</div></div>
<main id="main">
${pdfNewTab(body)}
</main>
<footer class="site-foot">
  <div class="wrap ft-grid">
    <div class="ft-brand">
      <a href="/"><img src="/img/logo-white.png" width="624" height="160" alt="LIUNA Local 1776"></a>
      <p>Representing U.S. government employees, including the Department of Defense and the National Guard.</p>
      <div class="ft-social">
        <a class="btn light sm icon" href="https://facebook.com/Local1776" rel="noopener" aria-label="LIUNA Local 1776 on Facebook" title="Facebook"><span class="ico"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.6 21v-7.6h2.6l.5-3.2h-3.1V8.1c0-.9.4-1.7 1.8-1.7h1.4V3.7s-1.3-.2-2.5-.2c-2.6 0-4.2 1.6-4.2 4.4v2.3H7.2v3.2h2.9V21z"/></svg></span></a>
        <a class="btn light sm icon" href="https://twitter.com/LIUNA_Local1776" rel="noopener" aria-label="LIUNA Local 1776 on X" title="X"><span class="ico"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.2 4h2.9l-6.3 7.2L21.2 20h-5.8l-4.5-5.9L5.7 20H2.8l6.7-7.7L2.4 4h5.9l4.1 5.4zm-1 14.3h1.6L7.4 5.6H5.7z"/></svg></span></a>
      </div>
    </div>
    <nav class="ft-col" aria-label="Get help">
      <h2>Get Help</h2>
      <a href="/assistance-request-portal">Request Help</a>
      <a href="/resources#know-your-rights">Know Your Rights</a>
      <a href="/request-uniforms-and-other-personal-items">Request Uniforms</a>
      <a href="/join-now">Join Local 1776</a>
      <a href="/agencies">Representatives</a>
      <a href="/contact-us">Contact Us</a>
    </nav>
    <nav class="ft-col" aria-label="About">
      <h2>About</h2>
      <a href="/about">About Local 1776</a>
      <a href="/local-1776-terms-of-membership">Terms of Membership</a>
      <a href="/privacy">Privacy Policy</a>
      <a href="/sms-terms">SMS Terms</a>
      <a href="/reform">Bargaining Reform</a>
      <a href="/agr-calculator">AGR Pay Calculator</a>${CONFIG.appUrl ? `
      <a href="${CONFIG.appUrl}" target="_blank" rel="noopener">Local 1776 App</a>` : ''}
    </nav>
    <div class="ft-reach">
      <h2>Reach Us</h2>
      <dl>
        <div><dt>Phone</dt><dd><a href="tel:+18005695861">1 (800) 569-5861</a></dd></div>
        <div><dt>Fax</dt><dd>1 (888) 506-6082</dd></div>
        <div><dt>Email</dt><dd><a href="mailto:contact_us@local1776.org">contact_us@local1776.org</a></dd></div>
        <div><dt>Mail</dt><dd><span>LIUNA Local 1776</span><span>PO Box 1794</span><span>Abita Springs, LA 70420</span></dd></div>
      </dl>
    </div>
  </div>
  <div class="ft-legal"><div class="wrap">
    <p><span>LIUNA Local 1776 is part of the <a href="https://www.liuna.org/" target="_blank" rel="noopener">Laborers&rsquo; International Union of North America</a>. This is not a U.S. government website.</span> <span>The appearance of U.S. Department of Defense (DoD) visual information does not imply or constitute DoD endorsement.</span></p>
    <p class="ft-copy">&copy; ${new Date().getFullYear()} LIUNA Local 1776. All rights reserved.</p>
  </div></div>
</footer>
${meta.app ? '' : `<script>window.L1776_FIREBASE_PROJECT=${JSON.stringify(CONFIG.firebaseProject)};window.L1776_FORMS_URL=${JSON.stringify(CONFIG.formsUrl || '')};window.L1776_FORMS_ON=${JSON.stringify(['contact', ...Object.keys(FORMS_ON).filter(k => FORMS_ON[k])])};</script>
<script src="/js/site.js" defer></script>`}
<script src="/js/header.js" defer></script>
</body>
</html>
`);
}

// ---------- blog posts ----------
let posts = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'posts.json'), 'utf8'));   // videos are added below (readVideos)
// Title Case for titles (Ben, Nov 20 2026): every word capitalized except small words (a, the, and, of, on, by...),
// unless first. Leaves words that already have capitals alone (DoD, AASF, 60k).
const SMALL = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet', 'as', 'at', 'by', 'in', 'of', 'on', 'to', 'up', 'via', 'vs', 'from', 'with', 'into', 'per']);
function titleCase(t) {
  let first = true;
  return t.split(/(\s+)/).map(w => {
    if (!w.trim()) return w;
    const bare = w.toLowerCase().replace(/[^a-z]/g, '');
    const out = !first && SMALL.has(bare) && w === w.toLowerCase() ? w : w.replace(/^([^A-Za-z0-9]*)([a-z])/, (_, p, c) => p + c.toUpperCase());
    first = /[:?!.]$/.test(w);   // a new clause starts after a colon or sentence end
    return out;
  }).join('');
}
function postCards(n) {
  return `<div class="teasers">${posts.filter(p => !p.yt).slice(0, n).map(p => `
      <article class="tease">
        ${p.image ? `<a class="pic-link" href="/${p.slug}" tabindex="-1" aria-hidden="true"><img class="pic" src="${imgUrl(p.image)}" alt="" loading="lazy"></a>` : ''}
        <span class="n">${apDate(new Date(p.date))} &middot; ${esc(byWho(p))}</span>
        <h3><a href="/${p.slug}">${esc(titleCase(p.title))}</a></h3>
        <p>${esc(p.subtitle || p.excerpt)}</p>
      </article>`).join('')}
    </div>`;
}
const byWho = p => p.source || p.author || 'Local 1776';

// ---------- the News page and one page per story (Ben, Nov 20 2026: every story rebuilt in the new format) ----------
// short names for the News list on a phone (no cut-off labels)
const SHORT_SOURCE = { 'Government Executive': 'GovExec', 'Courthouse News Service': 'Courthouse News', 'Associated Press': 'AP', 'The Seattle Times, 2005': 'Seattle Times' };
// a title that may need a second line breaks only between its phrases (before "and" or a parenthesis, after a comma)
const phrases = t => t.split(/(?<=,) |(?<=^.{12,}) (?=and )| (?=\()/).map(x => `<i class="ph">${esc(x)}</i>`).join(' ');
const minutes = p => Math.max(1, Math.round((p.words || 200) / 230));
function newsIndex() {
  const years = [...new Set(posts.map(p => new Date(p.date).getUTCFullYear()))];
  const row = p => `
        <li class="nrow${p.source ? ' repost' : ' ours'}">
          <a href="/${p.slug}">
            ${p.image ? `<img src="${imgUrl(p.image)}" alt="" loading="lazy">` : '<span class="noimg" aria-hidden="true"></span>'}
            <span class="nmeta"><span>${apDate(new Date(p.date))}</span><span class="sep"> &middot; </span><span class="ns">${p.source && SHORT_SOURCE[p.source] ? `<span class="long">${esc(p.source)}</span><span class="short">${SHORT_SOURCE[p.source]}</span>` : esc(byWho(p))}${p.video ? ' &middot; Video' : ''}</span></span>
            <b>${esc(titleCase(p.title))}</b>
            <span class="nsub">${esc(p.subtitle || p.excerpt)}</span>
          </a>
        </li>`;
  return `<nav class="tabs news-tabs" aria-label="Show"><a href="#" data-news="all" data-t="All Stories" aria-current="true">All Stories</a><a href="#" data-news="ours" data-t="From Local 1776">From Local 1776</a><a href="#" data-news="repost" data-t="Elsewhere">Elsewhere</a></nav>
    ${years.map(y => `<section class="nyear" id="y${y}"><h2>${y}</h2><ul class="nlist">${posts.filter(p => new Date(p.date).getUTCFullYear() === y).map(row).join('')}
      </ul></section>`).join('\n    ')}`;
}
const linkify = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, u => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\/(www\.)?/, '')}</a>`);
const videoBody = p => `<figure class="vid big story-vid" data-yt="${p.yt}"><button type="button" aria-label="Play: ${esc(p.fullTitle)}"><img src="/${p.image}" alt=""><span class="play" aria-hidden="true"></span></button></figure>
${(p.desc || '').split(/\n\s*\n/).map(par => par.trim()).filter(Boolean).map(par => '<p>' + linkify(par).replace(/\n/g, '<br>') + '</p>').join('\n')}
<p class="note"><a class="more" href="https://www.youtube.com/watch?v=${p.yt}" target="_blank" rel="noopener">Watch on YouTube &rsaquo;</a></p>`;
function postPage(p, i) {
  // a story from the Union App carries its (cleaned) HTML; the 90 imported stories live in site/posts/
  const body = p.html !== undefined ? p.html : p.yt ? videoBody(p) : fs.readFileSync(path.join(SRC, 'posts', p.slug + '.html'), 'utf8');
  const cap = [p.imageCaption, p.imageCredit ? 'Photo: ' + p.imageCredit : ''].filter(Boolean).map(esc).join(' &middot; ');
  const newer = posts[i - 1], older = posts[i + 1];
  const latest = posts.filter(x => x.slug !== p.slug).slice(0, 5);
  const html = `<article class="story">
  <header class="top"><div class="wrap">
    <div class="kicker">${p.yt ? (p.kicker && p.kicker !== 'Video' ? p.kicker + ' &middot; Video' : 'From Local 1776 &middot; Video') : (p.source ? esc(p.source) : 'From Local 1776') + (p.video ? ' &middot; Video' : '')}</div>
    <h1>${esc(titleCase(p.title))}</h1>
    ${p.subtitle ? `<p class="deck sub">${esc(p.subtitle)}</p>` : ''}
    <div class="byline"><span><b>${esc(p.source ? (p.author ? p.author + ', ' + p.source : p.source) : (p.author || 'LIUNA Local 1776'))}</b></span><span>${apDate(new Date(p.date))}</span><span>${p.yt ? 'Video' : minutes(p) + ' min read'}</span></div>
  </div></header>
  <div class="wrap split story-split">
    <div class="story-main">
      ${p.image && !p.yt ? `<figure class="lead"><img src="${imgUrl(p.image)}" alt="${esc(p.imageAlt || '')}">${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>` : ''}
      <div class="prose story-body">
${body}
      </div>
      ${p.source ? `<p class="note repost-note">This story was originally published by ${p.sourceUrl ? `<a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">${esc(p.source)}</a>` : esc(p.source)} and is shared here for Local 1776 members.</p>` : ''}
      <nav class="pager" aria-label="More stories">
        ${newer ? `<a href="/${newer.slug}"><span>Newer</span>${esc(titleCase(newer.title))}</a>` : '<span></span>'}
        ${older ? `<a class="nx" href="/${older.slug}"><span>Older</span>${esc(titleCase(older.title))}</a>` : '<span></span>'}
      </nav>
    </div>
    <aside class="story-side">
      <div class="aside help-box">
        <h3>Need Help at Work?</h3>
        <p>Local 1776 represents National Guard and Defense Department employees. Tell us what happened.</p>
        ${FORMS_ON.representation ? '{{BTN:/assistance-request-portal|help|Help}}' : '{{BTN:/contact-us#message|send|Contact}}'}
      </div>
      <div class="aside">
        <h3>Latest News</h3>
        <ul class="side-list">${latest.map(x => `<li><a href="/${x.slug}"><span>${apDate(new Date(x.date))}</span>${esc(titleCase(x.title))}</a></li>`).join('')}</ul>
        <a class="more" href="/blog">All News &rsaquo;</a>
      </div>
    </aside>
  </div>
</article>`;
  return { meta: { title: titleCase(p.title), nav: 'news', ogType: 'article', image: p.image, description: p.subtitle || p.excerpt || titleCase(p.title) }, html };
}

// ---------- outside headlines ----------
const FEEDS = [
  { name: 'Government Executive', sub: 'Workforce', url: 'https://www.govexec.com/rss/workforce/', home: 'https://www.govexec.com/workforce/' },
  { name: 'Government Executive', sub: 'Pay & Benefits', url: 'https://www.govexec.com/rss/pay-benefits/', home: 'https://www.govexec.com/pay-benefits/' },
  { name: 'Federal News Network', sub: 'Latest News', url: 'https://federalnewsnetwork.com/category/all-news/feed/', home: 'https://federalnewsnetwork.com/category/all-news/' },
];
const unCdata = s => s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
const plain = s => unCdata(s).replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const pick = (s, t) => { const m = s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? plain(m[1]) : ''; };
async function readFeed(f, n = 5) {
  const r = await fetch(f.url, { headers: { 'User-Agent': 'Mozilla/5.0 (LIUNA Local 1776 site build)' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${f.url} ${r.status}`);
  const xml = await r.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, n).map(m => ({
    title: pick(m[1], 'title'), link: pick(m[1], 'link'), by: pick(m[1], 'dc:creator'), date: new Date(pick(m[1], 'pubDate')),
  })).filter(i => i.title && i.link);
}
let FEED_ITEMS = [];
async function feedsHtml() {
  if (OFFLINE) return '<p class="note">Headlines are fetched when the site is published.</p>';
  const blocks = await Promise.all(FEEDS.map(async f => {
    try { return { f, items: await readFeed(f) }; } catch (e) { console.warn('  headline feed failed:', e.message); return { f, items: [] }; }
  }));
  FEED_ITEMS = blocks;   // the header's rotating line uses the newest of these too
  const col = (list) => list.map(({ f, items }) => `
        <div class="feed">
          <h3><span>${esc(f.name)}</span><a class="more" href="${f.home}" rel="noopener">More &rsaquo;</a></h3>
          <p class="sub">${esc(f.sub)}</p>
          <ul>${items.length ? items.map(i => `
            <li><time datetime="${i.date.toISOString()}">${MONTHS[easternDay(i.date).getUTCMonth()].replace('.', '')} ${easternDay(i.date).getUTCDate()}</time><a href="${esc(i.link)}" rel="noopener">${esc(i.title)}${i.by ? `<small>${esc(i.by)}</small>` : ''}</a></li>`).join('') : '<li><span></span><span class="note">Headlines are unavailable right now.</span></li>'}
          </ul>
        </div>`).join('');
  return `<div class="feeds">${col(blocks)}</div>`;
}

// ---------- units, work sites and the US map ----------
// site/data/units.json = the eleven units we represent (reps, contract page, which map states). One list feeds the
// Contact directory, the Agencies map and the home page's small map.
// From the Union App (Ben, Nov 22 2026; tools/lib/agencies.mjs): work sites, representatives and active cases replace
// these unit by unit once the app publishes them; until then nothing changes.
const AGENCIES = mergeAgencies(JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'units.json'), 'utf8')),
  JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'facilities.json'), 'utf8')),
  await appAgencies(SRC, OFFLINE, process.argv.includes('--agencies-sample'), CONFIG.firebaseProject),
  (lng, lat) => albers(lng, lat).map(v => rnd(v)));
const units = AGENCIES.units, facilities = AGENCIES.facilities;
const usStates = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'us-states.json'), 'utf8'));
const guam = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'guam.json'), 'utf8'));
const guamXY = (lng, lat) => { const p = guam.proj; return [Math.round((p.ox + (lng - p.lon0) * p.cosLat * p.k) * 10) / 10, Math.round((p.oy + (p.lat1 - lat) * p.k) * 10) / 10]; };
const unitOfState = {};
units.forEach(u => u.states.forEach(s => { unitOfState[s] = u.code; }));
const unitName = u => `${u.line1} ${u.line2}`;

// kind 'mini' = home page (each state is a link); 'full' = Agencies page (states are buttons, work sites are dots)
function usMap(kind) {
  const full = kind === 'full';
  const shapes = usStates.map(s => {
    const code = unitOfState[s.abbr];
    if (!code) return `<path class="st" d="${s.d}"/>`;
    const u = units.find(x => x.code === code);
    const label = `${s.name}: ${unitName(u)}`;
    return full
      ? `<path class="st on" data-unit="${code}" d="${s.d}" tabindex="0" role="button" aria-label="${esc(label)}"><title>${esc(label)}</title></path>`
      : `<a href="/agencies#${code}" aria-label="${esc(label)}"><path class="st on" d="${s.d}"><title>${esc(label)}</title></path></a>`;
  }).join('');
  // Guam: its real outline, in an inset on the Pacific side (west of California). See tools/make-map.mjs.
  const gu = units.find(u => u.code === 'GU');
  const b = guam.box;
  const guInner = `<rect class="inset" x="${b.x - 10}" y="${b.y - 10}" width="${b.w + 20}" height="${b.h + 42}" rx="4"/><path class="st on" d="${guam.d}"/><text x="${b.x + b.w / 2}" y="${b.y + b.h + 24}">GUAM</text>`;
  const guShape = full
    ? `<g class="gu" data-unit="GU" tabindex="0" role="button" aria-label="Guam: ${esc(unitName(gu))}"><title>Guam: ${esc(unitName(gu))}</title>${guInner}</g>`
    : `<a href="/agencies#GU" aria-label="Guam: ${esc(unitName(gu))}"><g class="gu"><title>Guam: ${esc(unitName(gu))}</title>${guInner}</g></a>`;
  // phones and tablets: a fingertip-size invisible area under each small state (under every state, so a real shape always wins)
  const hits = usStates.map(s => {
    const code = unitOfState[s.abbr]; if (!code) return '';
    const b = pathBox(s.d), w = b[2] - b[0], h = b[3] - b[1];
    if (Math.min(w, h) >= 110) return '';
    const c = `<circle class="hit"${full ? ` data-hit="${code}"` : ''} cx="${Math.round((b[0] + b[2]) / 2)}" cy="${Math.round((b[1] + b[3]) / 2)}" r="54"/>`;
    return full ? c : `<a href="/agencies#${code}" tabindex="-1" aria-hidden="true">${c}</a>`;
  }).join('');
  // No work-site dots on the US map (Ben: "chicken pox"). Sites appear on the zoomed street map instead.
  return `<svg class="usmap ${kind}" viewBox="-120 0 1095 610" role="group" aria-label="Map of the United States and Guam. Highlighted places are where Local 1776 represents employees.">${hits}${shapes}${guShape}${full ? '<g class="pins"></g>' : ''}</svg>`;
}
const unitTabs = (hrefBase) => `<nav class="tabs unit-tabs" aria-label="Choose a state or unit">${hrefBase ? '' : '<a href="#" data-us aria-current="true">US</a>'}${units.map(u => `<a href="${hrefBase}#${u.code}" data-unit="${u.code}">${u.code}</a>`).join('')}</nav>`;

// Contact page directory, built from units.json
// Contact page directory, built from units.json: tabs, one agency shown at a time (Ben, Nov 20 2026 —
// "just have the tabs, and for each tab, you only show one agency at a time"). Without JavaScript every panel shows.
function repsHtml() {
  const tel = p => 'tel:+1' + p.replace(/\s*ext\.?\s*/i, ',').replace(/[^\d,]/g, '');
  return `<div class="dir" data-dir>
      <div class="tabs dir-tabs" role="tablist" aria-label="States and territories">${units.map((u, i) => `<button type="button" role="tab" id="tab-${u.code}" aria-controls="dir-${u.code}" aria-selected="${i === 0}" data-code="${u.code}" data-t="${u.code}">${u.code}</button>`).join('')}</div>${units.map((u, i) => `
      <section class="dir-panel" id="dir-${u.code}" role="tabpanel" aria-labelledby="tab-${u.code}">
        <header class="dir-head">
          <img src="${u.seal}" alt="">
          <div><div class="code">${u.code}</div><h3><span>${esc(u.line1)}</span><span>${esc(u.line2)}</span></h3></div>
          <nav class="dir-links"><a class="more" href="${u.contract}">Union Contract &rsaquo;</a><a class="more" href="/agencies#${u.code}">Work Sites &rsaquo;</a></nav>
        </header>
        <ul class="dir-people">${u.reps.map(r => `
          <li><b>${esc(r.name)}</b><span>${esc(r.role)}</span>${r.phone ? `<a href="${tel(r.phone)}">${esc(r.phone)}</a>` : ''}${r.email ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : ''}</li>`).join('')}
        </ul>
      </section>`).join('')}
    </div>`;
}

// Data the Agencies page's script reads (later this can come from the Union App)
// The outline box of each unit's states on our own map (viewBox units), so the page can zoom into it
const pathBox = d => { const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number); const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
function unitBox(u) {
  if (u.code === 'GU') { const b = guam.box; return [b.x - 4, b.y - 4, b.x + b.w + 4, b.y + b.h + 4]; }
  const boxes = u.states.map(s => pathBox(usStates.find(x => x.abbr === s).d));
  return [Math.min(...boxes.map(b => b[0])), Math.min(...boxes.map(b => b[1])), Math.max(...boxes.map(b => b[2])), Math.max(...boxes.map(b => b[3]))].map(v => Math.round(v * 10) / 10);
}
function agencyData() {
  const data = units.map(u => ({ ...u, name: unitName(u), box: unitBox(u), sites: facilities.filter(f => f.unit === u.code).map(f => {
    const [x, y] = f.unit === 'GU' ? guamXY(f.lng, f.lat) : [f.x, f.y];
    return { name: f.name, place: f.place, address: f.address, branch: f.branch, lat: f.lat, lng: f.lng, x, y };
  }) }));
  return `<script type="application/json" id="agency-data">${JSON.stringify({ units: data, cases: AGENCIES.cases }).replace(/</g, '\\u003c')}</script>`;
}
// Active Cases table (Agencies): open cases from the Union App, by subject only — never a name (Ben, Nov 20 2026)
function casesRows() {
  if (!AGENCIES.casesLive) return '<tr><td colspan="5" class="empty-row">This list will fill in from the Local 1776 case system once it is connected.</td></tr>';
  if (!AGENCIES.cases.length) return '<tr><td colspan="5" class="empty-row">No open cases right now.</td></tr>';
  const unitName = code => { const u = units.find(x => x.code === code); return u ? (u.code === 'ARNG' ? 'Army National Guard' : u.line1) : code; };
  return [...AGENCIES.cases].sort((a, b) => unitName(a.unit).localeCompare(unitName(b.unit)) || b.filed.localeCompare(a.filed)).map(k =>
    `<tr><td data-l="Unit">${esc(unitName(k.unit))}</td><td data-l="Type">${esc(k.type)}</td><td data-l="Subject">${esc(k.subject)}</td><td data-l="Filed">${k.filed ? esc(apDate(new Date(k.filed + 'T12:00:00Z'))) : ''}</td><td data-l="Status">${esc(k.status)}</td></tr>`).join('');
}
const STATS = { units: units.length, sites: facilities.length, places: units.filter(u => u.code !== 'ARNG').length, cases: AGENCIES.cases.length };   // cases: from the Union App

// ---------- Legislation page: members of Congress + the Armed Services committees (Ben, Nov 20 2026) ----------
// The map, the address finder and the state panels run in /js/congress.js from /congress/members.json (written below) and
// /congress/districts/<ST>.json (tools/make-congress-map.mjs). The committee rosters are plain HTML so they read without JS.
const congress = await congressData(SRC, OFFLINE);
// our positions on bills (Union App, publicLobbying/positions) → "Sponsor of H.R. 8800 (Local 1776 Supports)" lines
const LOBBY = await lobbyData(SRC, OFFLINE, process.argv.includes('--lobby-sample'), CONFIG.firebaseProject);
for (const m of [...Object.values(congress.senate).flat(), ...Object.values(congress.house).flatMap(o => Object.values(o))]) { const l = lobbyLines(LOBBY, m.bio); if (l.length) m.lobby = l; }
const lobHtml = bio => lobbyLines(LOBBY, bio).map(t => `<p class="cg-lob">${esc(t)}</p>`).join('');
const ST_NAME = Object.fromEntries(usStates.map(s => [s.abbr, s.name]));
Object.assign(ST_NAME, { DC: 'District of Columbia', PR: 'Puerto Rico', GU: 'Guam', VI: 'U.S. Virgin Islands', AS: 'American Samoa', MP: 'Northern Mariana Islands' });
const TERR = ['DC', 'PR', 'GU', 'VI', 'AS', 'MP'];
const roleName = t => (/^Chair(man|woman)?$/i.test(t) ? 'Chair' : t);
function congressHtml() {
  const shapes = usStates.filter(s => !TERR.includes(s.abbr)).map(s => `<path class="st on" data-st="${s.abbr}" d="${s.d}" tabindex="0" role="button" aria-label="${esc(s.name)}"><title>${esc(s.name)}</title></path>`).join('');
  const tiles = TERR.map(t => `<button type="button" class="cg-tile" data-st="${t}" title="${esc(ST_NAME[t])}">${t}</button>`).join('');
  const where = m => (m.district === null ? m.st : `${m.st}-${m.district || 'AL'}`);
  const roster = (c, key, hidden) => {
    const card = m => {
      const exAll = m.subs.length >= c.subcommittees.length && m.subs.every(x => /Ex Officio/i.test(x.title));
      const subs = exAll ? 'Ex Officio, All Subcommittees' : m.subs.map(x => esc(x.name) + (x.title ? ` (${esc(roleName(x.title))})` : '')).join(' · ');
      const other = m.other.map(x => (/^Chair/i.test(x.title) ? `<b>${esc(x.name)} (Chair)</b>` : esc(x.name) + (x.title ? ` (${esc(roleName(x.title))})` : ''))).join(' · ');
      const tags = (m.title ? `<span class="cg-tag gold">${esc(roleName(m.title))}</span>` : '') + (m.leaving ? '<span class="cg-tag gray">Leaving Jan. 3</span>' : '') + (m.pending ? '<span class="cg-tag gold">Race Not Called</span>' : '');
      const ct = [m.phone ? `<a href="tel:+1${m.phone.replace(/[^0-9]/g, '')}">${esc(m.phone)}</a>` : '', m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">Website</a>` : '', m.contact ? `<a href="${esc(m.contact)}" target="_blank" rel="noopener">Contact Form</a>` : ''].join('');
      const nm = m.bio ? `<a href="${congressGovUrl(m.name, m.bio)}" target="_blank" rel="noopener" title="${esc(m.name)} on Congress.gov">${esc(m.name)}</a>` : esc(m.name);
      // member count for the seat they hold in the NEXT Congress (new district lines); none for members who are leaving
      const nx = m.next;
      const cnt = nx ? `<p class="cg-count" data-cst="${nx.st}"${nx.d === null ? ` data-name="${esc(ST_NAME[nx.st] || nx.st)}"` : ` data-cd="${nx.d ? String(nx.d).padStart(2, '0') : 'AL'}"`} hidden></p>` : '';
      return `<li class="cg-m${m.leaving ? ' leaving' : ''}"><div class="cg-mh"><b>${nm}</b><span class="cg-pty">${m.party}-${where(m)}</span>${tags}</div>${cnt}${lobHtml(m.bio)}`
        + vvHtml(m.vv, m.district === null ? 'Senate' : 'House') + (subs ? `<p><span>Subcommittees</span>${subs}</p>` : '') + (other ? `<p><span>Also Serves On</span>${other}</p>` : '')
        + (ct ? `<p class="cg-ct">${ct}</p>` : '') + '</li>';
    };
    const maj = c.members.filter(m => m.side === 'majority'), min = c.members.filter(m => m.side !== 'majority');
    return `<div class="cg-roster" id="cg-${key}" role="tabpanel"${hidden ? ' hidden' : ''}>
        <p class="cg-sub"><span>Subcommittees</span>${c.subcommittees.map(esc).join(' · ')}</p>
        <div class="cg-cols"><div><h4 class="rhead">Majority</h4><ul>${maj.map(card).join('')}</ul></div><div><h4 class="rhead">Minority</h4><ul>${min.map(card).join('')}</ul></div></div>
      </div>`;
  };
  const leaving = congress.sasc.members.concat(congress.hasc.members).some(m => m.leaving);
  return `<div class="cg" data-congress>
    <div class="cg-counts" hidden></div>
    <div class="cg-top">
      <form class="cg-find" novalidate>
        <label for="cg-addr">Find Your Members of Congress</label>
        <div class="cg-row"><input id="cg-addr" type="text" autocomplete="street-address" maxlength="120" placeholder="Street address, city, state or ZIP">${submit('search', 'Find')}</div>
        <p class="cg-msg" aria-live="polite">Your address goes only to the U.S. Census Bureau's address lookup. We don't keep it.</p>
      </form>
      <ul class="cg-links">
        <li><a href="https://www.house.gov/" target="_blank" rel="noopener">U.S. House of Representatives</a></li>
        <li><a href="https://www.senate.gov/" target="_blank" rel="noopener">U.S. Senate</a></li>
        <li><a href="https://armedservices.house.gov/" target="_blank" rel="noopener">House Armed Services Committee</a></li>
        <li><a href="https://www.armed-services.senate.gov/" target="_blank" rel="noopener">Senate Armed Services Committee</a></li>
      </ul>
    </div>
    <div class="cg-results" hidden></div>
    <div class="cg-main">
      <div class="cg-mapbox">
        <div class="cg-stage">
          <svg class="usmap cg-us" viewBox="0 0 975 610" role="group" aria-label="Map of the United States. Choose a state to see its members of Congress.">${shapes}</svg>
          <div class="cg-state" hidden></div>
          <div class="zm-ctl cg-zoom" hidden>${button('#', 'plus', 'Zoom In', 'alt sm icon cg-zin')}${button('#', 'minus', 'Zoom Out', 'alt sm icon cg-zout')}</div>
          <div class="cg-tip" hidden></div>
        </div>
        <div class="cg-nav"><button type="button" class="cg-tile us" data-st="US" aria-pressed="true">US</button>${tiles}</div>
      </div>
      <aside class="cg-panel" aria-live="polite"><p class="cg-hint">Choose a state on the map, or enter your address above, to see your two senators and your representative.</p></aside>
    </div>
    <div class="cg-replist" hidden></div>
    <div class="cg-comm">
      <h3>The Armed Services Committees</h3>
      <p class="cg-note">These committees write the defense bill every year, including the laws that govern National Guard technicians. If your senator or representative sits on one, your call carries extra weight.${leaving ? ' The lists show the current members; the new Congress sets its committees in January, and these lists update on their own when it does.' : ''}</p>
      <div class="tabs dir-tabs cg-tabs" role="tablist"><button type="button" role="tab" aria-selected="true" data-tab="sasc" data-t="Senate">Senate</button><button type="button" role="tab" aria-selected="false" data-tab="hasc" data-t="House">House</button></div>
      ${roster(congress.sasc, 'sasc', false)}${roster(congress.hasc, 'hasc', true)}
    </div>
  </div>
  <script src="/js/congress.js" defer></script>`;
}

// Old addresses that now live elsewhere
const REDIRECTS = { 'union-contracts': '/agencies', 'membership-portal': '/join-now', 'paypal-payment-options': '/join-now', 'california-dental-plans': '/benefits' };   // old Duda addresses still in YouTube descriptions and emails

// ---------- Resources: site/data/resources.json -> search, jump tabs, one section per topic, cards of links ----------
function resourcesHtml() {
  const R = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'resources.json'), 'utf8'));
  // our own cases (site/data/cases.json), one row per forum, each with its own page (Ben, Nov 24 2026)
  if (CASES_PAGES.length) {
    const rows = [['Federal Courts', /Court/], ['MSPB', /Merit/], ['FLRA', /Labor Relations/]].map(([title, re]) => ({ title, items: CASES_PAGES.filter(c => re.test(c.forum)).flatMap(c => [
      { label: (c.short || c.title.join(' ')) + ', ' + c.year, href: '/cases/' + c.slug, bold: true }, { label: c.topic, href: '/cases/' + c.slug, sub: 1 }]) })).filter(g => g.items.length);
    R.splice(1, 0, { id: 'cases', title: 'Our Cases', tab: 'Our Cases', groups: rows });
  }
  const isPdf = h => /\.pdf($|[?#])/i.test(h);
  const ext = h => /^https?:/i.test(h);
  const link = i => `<a href="${esc(i.href)}"${ext(i.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(i.label)}</a>`;
  const item = (i, cls) => i.fact ? `<li class="ritem rfact"><span>${esc(i.fact)}</span><b>${i.href ? link({ ...i, label: i.value }) : esc(i.value)}</b></li>`
    : `<li class="ritem${cls ? ' ' + cls : ''}">${i.href ? link(i) : `<span class="rlabel">${esc(i.label)}</span>`}</li>`;   // no href = a plain bold heading ("Severance Pay")
  // Structure a topic's items (Ben, Nov 20 2026: a heading and its items must never be split apart):
  //   parts  — split at each {head}, or at a parent with many children (that parent becomes the part's heading)
  //   blocks — a top-level item with its sub-items; a block never breaks across columns; parent bold, children under it
  const MAX_BLOCK = 6;
  function parts(items, split) {   // split rows keep every family whole (the columns are set by hand)
    // depths are relative to the shallowest item between headings (an all-indented list is a flat list)
    items = items.map(i => ({ ...i })); let seg = [];
    const flush = () => { const m = Math.min(...seg.map(i => i.sub || 0)); seg.forEach(i => { i.sub = (i.sub || 0) - m; }); seg = []; };
    for (const i of items) { if (i.head || i.col) flush(); else seg.push(i); } flush();
    const out = []; let cur = { blocks: [] };
    const push = () => { if (cur.title || cur.blocks.length) out.push(cur); };
    for (let k = 0; k < items.length; k++) {
      const i = items[k];
      if (i.head || i.col) { push(); cur = { title: i.head, href: i.href, cols: i.cols, stack: i.stack, blocks: [] }; continue; }   // {col:1} = next column; {head, stack:true} = stays in the same column
      const depth = i.sub || 0;
      if (depth === 0) {
        const kids = []; let m = k + 1;
        while (m < items.length && !items[m].head && (items[m].sub || 0) > 0) kids.push(items[m++]);
        if (kids.length > MAX_BLOCK && !split) {                // a big family: its parent becomes a heading, kids flow below
          push(); cur = { title: i.label, href: i.href, blocks: [] };
          for (const kid of kids) {
            const d = (kid.sub || 0) - 1;
            if (d === 0) cur.blocks.push({ top: kid, kids: [] }); else if (cur.blocks.length) cur.blocks[cur.blocks.length - 1].kids.push({ ...kid, sub: d });
          }
          push(); cur = { blocks: [] }; k = m - 1; continue;
        }
        cur.blocks.push({ top: i, kids }); k = m - 1; continue;
      }
    }
    push();
    return out;
  }
  const blockHtml = (b, bold) => b.kids.length
    ? `<li class="rblock fam"><ul>${item(b.top, 'p')}${b.kids.map(x => item(x, x.sub > 1 ? 'k2' : 'k')).join('')}</ul></li>`
    : `<li class="rblock"><ul>${item(b.top, bold || b.top.bold ? 'p' : '')}</ul></li>`;
  const partHtml = (p, split, bold) => {
    const lines = p.blocks.reduce((a, b) => a + 1 + b.kids.length, 0);
    const cols = split ? (p.cols || 1)   // hand-set rows: one column unless the heading asks for more ({head, cols:3} — the LM reports)
      : p.blocks.length < 2 ? 1 : 2;   // every row is two columns (Ben, Nov 20 2026)
    return `<div class="rpart">${p.title ? `<h4 class="rhead">${p.href ? `<a href="${esc(p.href)}"${ext(p.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(p.title)}</a>` : esc(p.title)}</h4>` : ''}<ul class="c${cols}">${p.blocks.map(b => blockHtml(b, bold)).join('')}</ul></div>`;
  };
  // hand-arranged row: each {col} or {head} starts a column (a {head, stack:true} stacks under the one before)
  function splitHtml(g) {
    const cols = [];
    for (const p of parts(g.items, true)) { if (p.stack && cols.length) cols[cols.length - 1].push(p); else cols.push([p]); }
    return `<div class="rparts split" style="--n:${cols.length}">${cols.map(c => `<div class="rcol">${c.map(p => partHtml(p, true, g.bold)).join('')}</div>`).join('')}</div>`;
  }
  const count = R.reduce((a, s) => a + s.groups.reduce((b, g) => b + g.items.filter(i => i.href).length, 0), 0);
  return `<div class="rsearch"><label for="rq">Find a Document or Link</label><input id="rq" type="search" placeholder="Type a name or number, like &ldquo;LM-2,&rdquo; &ldquo;telework&rdquo; or &ldquo;752&rdquo;" autocomplete="off"><span class="rcount" aria-live="polite">${count} documents and links</span></div>
    <nav class="tabs rtabs" aria-label="Sections">${R.map((s, i) => `<a href="#${s.id}" data-t="${esc(s.tab || s.title)}"${i ? '' : ' aria-current="true"'}>${esc(s.tab || s.title)}</a>`).join('')}</nav>
    ${R.map(s => `<section class="rsec" id="${s.id}">
      <h2 class="rsec-title">${esc(s.title)}</h2>${s.note ? `\n      <p class="rnote">${esc(s.note)}</p>` : ''}
      <div class="rbox">${s.groups.map(g => {
        // one full-width row per topic: name on the left, links in even columns on the right (Ben, Nov 20 2026)
        return `
        <div class="rrow" id="${g.title.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}"><div class="rname"><h3>${g.href ? `<a href="${esc(g.href)}"${ext(g.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(g.title)}</a>` : esc(g.title)}</h3>${g.note ? `<p>${esc(g.note)}</p>` : ''}</div>
          ${g.split ? splitHtml(g) : `<div class="rparts">${parts(g.items).map(p => partHtml(p, false, g.bold)).join('')}</div>`}</div>`; }).join('')}
      </div>
    </section>`).join('\n    ')}
    <p class="rnone" hidden>Nothing matches. Try fewer letters, or <a href="/contact-us#message">ask us</a>.</p>`;
}

// ---------- home videos: the newest uploads on the Local 1776 YouTube channel (Ben, Nov 20 2026) ----------
// Only videos published on/after the cutoff ("What Tuesday's Election Means for Us") are shown; older ones live on
// the channel behind "More Videos". The newest three show (one large, two beside it). Each build re-reads the channel
// feed; if YouTube can't be reached the last good list (site/data/videos.json) is used.
const YT_CHANNEL = 'UCYFZgSMNMB9ZA171FO0S5-w', YT_HANDLE = 'https://www.youtube.com/@LIUNANGDC/videos', VIDEO_CUTOFF = '2026-11-06';
function videoLabel(title) {
  if (title.includes('|')) {
    const [main, ...rest] = title.split('|').map(s => s.trim());
    const kicker = rest.join(' ').replace(/LIUNA Local 1776/i, '').trim() || 'Video';
    return { kicker, title: main };
  }
  const i = title.indexOf(':');
  if (i > 0 && i < 40) return { kicker: title.slice(0, i).replace(/,\s*/g, ' &middot; '), title: title.slice(i + 1).trim() };
  return { kicker: 'Video', title };
}
async function readVideos() {
  const cache = path.join(SRC, 'data', 'videos.json');
  let list = fs.existsSync(cache) ? JSON.parse(fs.readFileSync(cache, 'utf8')) : [];
  if (!OFFLINE) {
    try {
      const xml = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL}`, { signal: AbortSignal.timeout(20000) })).text();
      const fresh = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => ({
        id: (m[1].match(/<yt:videoId>([^<]+)/) || [])[1], title: plain((m[1].match(/<title>([^<]+)/) || [])[1] || ''), published: (m[1].match(/<published>([^<]+)/) || [])[1] || '',
        desc: plain((m[1].match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || ''),
      })).filter(v => v.id && v.published.slice(0, 10) >= VIDEO_CUTOFF);
      if (fresh.length) {
        const byId = Object.fromEntries(list.map(v => [v.id, v]));
        for (const v of fresh) byId[v.id] = { ...byId[v.id], ...v, slug: (byId[v.id] && byId[v.id].slug) || '' };
        list = Object.values(byId).sort((a, b) => b.published.localeCompare(a.published));
        fs.writeFileSync(cache, JSON.stringify(list, null, 1));
      }
    } catch (e) { console.warn('  video feed failed:', e.message); }
  }
  // a permanent address per video (made once from its title, then kept even if the title changes on YouTube)
  const taken = new Set(list.map(v => v.slug).filter(Boolean));
  let named = false;
  for (const v of list) {
    if (v.slug) continue;
    let base = videoLabel(v.title).title.toLowerCase().replace(/&[a-z]+;/g, '').replace(/['‘’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || v.id, slug = base, k = 2;
    while (taken.has(slug)) slug = base + '-' + k++;
    v.slug = slug; taken.add(slug); named = true;
  }
  if (named) fs.writeFileSync(cache, JSON.stringify(list, null, 1));
  // thumbnails are kept on our own site
  for (const v of list) {
    const f = path.join(SRC, 'img', 'videos', v.id + '.jpg');
    if (fs.existsSync(f) || OFFLINE) continue;
    for (const q of ['maxresdefault', 'sddefault', 'hqdefault']) {
      try { const r = await fetch(`https://i.ytimg.com/vi/${v.id}/${q}.jpg`, { signal: AbortSignal.timeout(20000) }); if (r.ok) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); break; } } catch {}
    }
  }
  return list;
}
function videosHtml(list) {
  if (!list.length) return '';
  const fig = (v, i) => { const l = videoLabel(v.title); const name = esc(v.title);
    return `<figure class="vid${i === 0 ? ' big' : ''}" data-yt="${v.id}"><button type="button" aria-label="Play: ${name}"><img src="/img/videos/${v.id}.jpg" alt="" loading="lazy"><span class="play" aria-hidden="true"></span></button><figcaption><span>${l.kicker}</span>${esc(l.title)}</figcaption></figure>`; };
  return `<div class="vids${list.length < 3 ? ' n' + list.length : ''}">${list.map(fig).join('\n      ')}</div>
    <p class="note"><a class="more" href="${YT_HANDLE}" target="_blank" rel="noopener">More Videos on YouTube &rsaquo;</a></p>`;
}

// ---------- home photo slider ----------
// Five photo windows on a metal grill (Ben, Nov 25 2026): one large, four small, each changing at its own pace (site.js);
// phones show only the large one. Every picture in site/img/slides (01.jpg, 02.jpg ...) takes part; which photo goes where
// is in site/data/slides.json. The first five load with the page; site.js loads the rest one at a time, just before each is
// shown. Small windows and phones use the smaller copies in slides/m. slides/first.txt is the first photo at 40 px, kept in
// the page itself: it shows at once, so the space is never a plain blue box while the photo is on its way (Nov 24 2026).
const SL = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'slides.json'), 'utf8'));
const slideIds = (() => {
  const all = fs.readdirSync(path.join(SRC, 'img', 'slides')).filter(f => /\.jpg$/i.test(f)).map(f => f.replace(/\.jpg$/i, '')).sort();
  return [...SL.order.filter(x => all.includes(x)), ...all.filter(x => !SL.order.includes(x))];
})();
const slideFirst = fs.readFileSync(path.join(SRC, 'img', 'slides', 'first.txt'), 'utf8').trim();
const slides = (() => {
  const big = slideIds.find(x => SL.big.includes(x));
  const four = slideIds.filter(x => x !== big && !SL.bigOnly.includes(x)).slice(0, 4);
  const at = x => `style="object-position:${SL.focus[x] || '50% 35%'}"`;
  const data = esc(JSON.stringify({ order: slideIds, big: SL.big, bigOnly: SL.bigOnly, notTablet: SL.notTablet, focus: SL.focus, first: [big, ...four] }));
  return `<div class="panes" data-slides="${data}">
    <div class="pane p0" style="background-image:url(${slideFirst})"><picture><source media="(max-width:640px)" srcset="/img/slides/m/${big}.jpg"><img class="on" src="/img/slides/${big}.jpg" alt="" ${at(big)} fetchpriority="high"></picture></div>
    ${four.map((x, i) => `<div class="pane p${i + 1}"><img class="on" src="/img/slides/m/${x}.jpg" alt="" ${at(x)} loading="lazy"></div>`).join('')}
  </div>
  <button class="hero-ctl" type="button" aria-label="Pause the photos" title="Pause">${ICON.pause}</button>`;
})();

// The privacy note on every form, like the AGR calculator's (Ben, Nov 21 2026). A form that sends: we get it, but nothing
// stays on the website once it's sent. A form that stays on the device: nothing leaves it.
const PRIVACY = {
  send: 'What you send goes to Local 1776 and the services that help us handle it, with a copy to you, and is used only to represent you. Nothing stays on this website once you hit Send.',
  rep: 'What you send goes to Local 1776 and the services that help us handle it, with a copy to you, and is used only to represent you. Save for Later keeps it only on this device; nothing is sent until you press Send, and nothing stays on this website after that.',
  device: 'Nothing you type leaves your device. It is saved only in this browser so you can come back to it, and Clear erases it. No server, no account, no cookies, no tracking.',
};

// ---------- the eleven contracts (Ben, Nov 21 2026: full text on the page, same look for all, PDF to download) ----------
// Text: site/data/contracts/<CODE>.json from the signed PDFs (node tools/import-contracts.mjs). Every contract is In Effect
// (Ben: no "agency stopped honoring" dates). Notes beside a section — what it means, what we meant when we negotiated it,
// cases and grievances under it — come from site/data/contracts/notes.json (later the Union App sends the cases; subjects
// only, never employee names). A note with "draft": true shows only in a build run with --drafts.
const DRAFTS = process.argv.includes('--drafts');
const contractNotes = (() => { try { return JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'contracts', 'notes.json'), 'utf8')).notes || []; } catch { return []; } })();
const NOTE_KIND = { explain: 'What It Means', intent: 'What We Negotiated', case: 'Cases and Grievances' };
const secId = n => 's' + String(n).replace('.', '-');
// Laws cited in the text link to the law itself (Ben, Nov 21 2026: "make that a hot link so they can go read the law").
// U.S. Code and CFR at Cornell's Legal Information Institute, like the Resources page. Cornell has no anchors for
// subsections, so "5 USC § 7114(b)(4)" opens § 7114 and the (b)(4) stays in the words.
const LII = 'https://www.law.cornell.edu';
const USC_CHAPTER = { '5/71': 'part-III/subpart-F/chapter-71', '5/75': 'part-III/subpart-F/chapter-75', '5/77': 'part-III/subpart-F/chapter-77', '5/79': 'part-III/subpart-F/chapter-79', '5/84': 'part-III/subpart-G/chapter-84', '10/47': 'subtitle-A/part-II/chapter-47', '38/43': 'part-III/chapter-43', '42/21': 'chapter-21' };
const lawLink = (href, text) => `<a class="law" href="${href}" target="_blank" rel="noopener">${text}</a>`;
function lawLinks(html) {
  return html
    // "5 USC Chapter 71", "38 USC Chapter 43"
    .replace(/\b(\d{1,2})\s?(U\.\s?S\.\s?C\.|USC)\s+Chapter\s+(\d+)/g, (m, t, u, ch) => lawLink(`${LII}/uscode/text/${t}${USC_CHAPTER[t + '/' + ch] ? '/' + USC_CHAPTER[t + '/' + ch] : ''}`, m))
    // "5 USC § 7114(b)(4)", "5 U.S.C. Section 7301", "42 U.S.C. §2000e", "42 USC § 2000e-16(b)(2)"
    .replace(/\b(\d{1,2})\s?(U\.\s?S\.\s?C\.|USC)\s?(?:Section\s+|§+\s?)?(\d{1,5}[a-z]?(?:-\d+)?)((?:\s?\([0-9a-zA-Z]{1,4}\))*)/g, (m, t, u, sec) => lawLink(`${LII}/uscode/text/${t}/${sec}`, m))
    // "5 CFR Part 335", "29 CFR § 1960.59", "42 CFR 2.1", "41 CFR § 102-79"
    .replace(/\b(\d{1,2})\s?(CFR|C\.F\.R\.)\s?(?:§+\s?|Part\s+|Section\s+)?(\d{1,4}(?:-\d+)?)(?:\.(\d+[a-z]?))?((?:\s?\([0-9a-z]{1,4}\))*)/g, (m, t, c, part, sec) => lawLink(`${LII}/cfr/text/${t}/${sec ? part + '.' + sec : 'part-' + part}`, m));
}
// Section 2.3 "Interpretation of Terms": each source a term's meaning comes from links to that source
const TERM_SOURCES = [
  [/^Federal Court Decisions/, 'https://www.govinfo.gov/app/collection/uscourts'],
  [/^United States Code \(USC\)/, `${LII}/uscode/text`],
  [/^Federal Labor Relations Authority \(FLRA\) Decisions/, 'https://www.flra.gov/decisions'],
  [/^Code of Federal Regulations \(CFR[’']?s\)/, `${LII}/cfr/text`],
  [/^Office of Personnel Management \(OPM\)/, 'https://www.opm.gov/'],
  [/^Department of Defense \(DoD\)/, 'https://www.esd.whs.mil/DD/DoD-Issuances/'],
  [/^Department of the Army \(DA\) regulations/, 'https://armypubs.army.mil/'],
  [/^National Guard Bureau \(NGB\)(?: Technician Personnel Regulations \(TPR\))? regulations|^National Guard Bureau \(NGB\)(?: Technician Personnel Regulations \(TPR\))?/, 'https://www.ngbpmc.ng.mil/'],
  [/^Black[’']s Law Dictionary/, 'https://thelawdictionary.org/'],
];
const termSource = t => { for (const [re, href] of TERM_SOURCES) { const m = t.match(re); if (m) return lawLink(href, esc(m[0])) + esc(t.slice(m[0].length)); } return null; };
// The status note at the top of every contract (Ben, Nov 21 2026: brief — it's being adjudicated, we have active
// complaints, and the contract is still in effect). Wording approved by Ben, Nov 21 2026.
const CONTRACT_STATUS = 'In March 2025, an executive order tried to end collective bargaining for most Defense Department employees. Local 1776 has active complaints challenging it, and they are still being decided. This contract remains in effect, and Local 1776 enforces it.';
const ARNG_TARC = 'Employees at the Herbert R. Temple, Jr. Army National Guard Readiness Center (TARC) are also represented by Local 1776. Their agreement was awaiting approval in March 2025.';
function contractPage(u) {
  const f = path.join(SRC, 'data', 'contracts', u.code + '.json');
  if (!fs.existsSync(f)) return null;
  const c = JSON.parse(fs.readFileSync(f, 'utf8'));
  const have = new Set(c.articles.flatMap(a => a.sections.map(s => s.n)));
  const arts = new Set(c.articles.map(a => a.n));
  // "Section 12.4(b)" and "Article 12" in the text link to that part of this contract
  const refs = t => lawLinks(esc(t))
    .replace(/\b(Sections?\s+)(\d+\.\d+(?:\([0-9a-z]+\))*(?:(?:,\s*(?:and\s+|or\s+)?|\s+(?:and|or|through)\s+)\d+\.\d+(?:\([0-9a-z]+\))*)*)/gi, (m, w, list) => w + list.replace(/\d+\.\d+/g, n => have.has(n) ? `<a href="#${secId(n)}">${n}</a>` : n))
    .replace(/\b(Article\s+)(\d+)\b(?!\.\d)/g, (m, w, n) => arts.has(+n) ? `${w}<a href="#a${n}">${n}</a>` : m);
  const para = (p, terms) => {
    const m = p.lv && p.t.match(/^(\(?[0-9a-z]{1,4}[.)])\s+([\s\S]*)$/i);
    const body = t => (terms && termSource(t)) || refs(t);
    return m ? `<p class="l${p.lv}"><span class="mk">${esc(m[1])}</span>${body(m[2])}</p>` : `<p>${body(p.t)}</p>`;
  };
  const notesFor = n => contractNotes.filter(x => String(x.section) === String(n) && (x.units === 'all' || (x.units || []).includes(u.code)) && (!x.draft || DRAFTS) && (!x.href || CASES_PAGES.some(c => x.href === '/cases/' + c.slug)));
  const notesHtml = n => {
    const list = notesFor(n);
    if (!list.length) return '';
    return `<div class="ct-notes">${Object.keys(NOTE_KIND).filter(k => list.some(x => x.kind === k)).map(k => `
          <div class="ct-note ${k}"><h4>${NOTE_KIND[k]}</h4>${list.filter(x => x.kind === k).map(x => `
            <div class="ct-ni">${x.title ? `<b>${esc(x.title)}</b>` : ''}${x.date || x.outcome ? `<span class="ct-nm">${[x.date, x.outcome].filter(Boolean).map(t => t.split(/(?<=,) /).map(p => `<i class="ph">${esc(p)}</i>`).join(' ')).join(' &middot; ')}</span>` : ''}${x.draft ? '<span class="ct-draft">Draft</span>' : ''}<p>${esc(x.text)}</p>${x.href ? `<a class="more" href="${x.href}">${esc(x.more || 'Read More')} &rsaquo;</a>` : ''}</div>`).join('')}
          </div>`).join('')}
        </div>`;
  };
  const name = `${u.line1} ${u.line2}`;
  // contract titles print small words capitalized ("Changes to The Agreement", "Use Of/Access") — Title Case lowers them
  const tc = t => titleCase(t.replace(/(?<=\S\s+|\/)(The|Of|And|To|For|On|In|At|By|A|An|Or)\b/g, w => w.toLowerCase())).replace(/\bOf\//g, 'of/');
  const date = s => s ? apDate(new Date(s + ' UTC')) : '';
  const party = (c.preamble.map(p => p.t).join(' ').match(/between (?:the )?(.+?\([A-Z][A-Z ]*\))/) || [])[1] || u.full || name;
  const abbr = (party.match(/\(([A-Z][A-Z ]*)\)$/) || [])[1] || u.code;
  const nSec = c.articles.reduce((a, x) => a + x.sections.length, 0);
  const html = `<header class="top ct-top">
  <div class="wrap">
    <div class="kicker">Union Contract &middot; In Effect</div>
    <h1 class="ct-h1"><span>${esc(u.line1)}</span> <span>${esc(u.line2)}</span></h1>
    <div class="ct-dr"><p class="deck ct-deck"><span class="long">Between the ${esc(party)} and LIUNA Local 1776</span><span class="short"><span>Between the ${esc(abbr)}</span> <span>and LIUNA Local 1776</span></span></p>${button(c.pdf, 'pdf', 'PDF', 'alt icon').replace('title="PDF"', 'title="Signed Contract (PDF)" aria-label="Signed Contract (PDF)"')}</div>
    <div class="ct-status"><h2>Status</h2><p>${CONTRACT_STATUS}</p>${u.code === 'ARNG' ? `<p>${ARNG_TARC}</p>` : ''}</div>
    <div class="t-tiles four ct-tiles">
      <div class="tile"><span>Executed</span><b>${esc(date(c.executed))}</b></div>
      <div class="tile"><span>${c.approvedLabel === 'Effective' ? 'Effective' : 'Approved by DoD'}</span><b>${esc(date(c.approved))}</b></div>
      <div class="tile"><span>Articles</span><b>${c.articles.length}</b></div>
      <div class="tile"><span>Sections</span><b>${nSec}</b></div>
    </div>${c.extras.length ? `
    <p class="g-note ct-extras">Also part of this agreement: ${c.extras.map(x => `<a href="${x.href}">${esc(x.name.replace(/^(Appendix [A-Z])\s*[-–:]\s*(?:[A-Z]{2,6}\s+)?/, '$1: '))}</a>`).join(' &middot; ')}</p>` : ''}
  </div>
</header>
<div class="wrap split ct-split">
  <aside class="ct-side" aria-label="Contents and search">
    <div class="ct-find"><label for="cq">Search This Contract</label><input id="cq" type="search" placeholder="Word, &ldquo;Phrase&rdquo; or Section" autocomplete="off" enterkeyhint="search"><button type="button" class="btn" data-find><span class="ico">${ICON.search}</span><span class="lbl">Search</span></button><span class="ct-res"><span class="rcount" aria-live="polite">${nSec} sections</span><span class="ct-nav" hidden><button type="button" data-step="-1" aria-label="Previous match" title="Previous">${ICON.upc}</button><button type="button" data-step="1" aria-label="Next match" title="Next">${ICON.down}</button><button type="button" data-step="x" aria-label="Clear search" title="Clear">${ICON.close}</button></span></span></div>
    <details class="ct-toc" open><summary>Contents</summary>
      <ol>${c.preamble.length ? '<li><a href="#preamble"><span>&ndash;</span><em>Preamble</em></a></li>' : ''}${c.articles.map(a => `<li><a href="#a${a.n}" title="${esc(tc(a.title))}"><span>${a.n}</span><em>${phrases(tc(a.title))}</em></a></li>`).join('')}</ol>
    </details>
  </aside>
  <div class="ct-main">
    <div class="ct-strip" hidden><span class="ct-sq"></span><span class="ct-sc" aria-hidden="true"></span><span class="ct-nav" hidden><button type="button" data-step="-1" aria-label="Previous match" title="Previous">${ICON.upc}</button><button type="button" data-step="1" aria-label="Next match" title="Next">${ICON.down}</button><button type="button" data-step="x" aria-label="Clear search" title="Clear">${ICON.close}</button></span></div>
    <p class="ct-none" hidden>Nothing in this contract matches. Try a shorter word, or take off the quotation marks.</p>${c.preamble.length ? `
    <section class="ct-art" id="preamble"><div class="ct-ah"><h2>Preamble</h2></div><div class="ct-sec ct-pre">${c.preamble.map(p => para(p)).join('')}</div></section>` : ''}${c.articles.map(a => `
    <section class="ct-art" id="a${a.n}">
      <div class="ct-ah"><div class="kicker">Article ${a.n}</div><h2>${esc(tc(a.title))}</h2></div>${a.intro.length ? `<div class="ct-sec ct-intro">${a.intro.map(p => para(p)).join('')}</div>` : ''}${a.sections.map(s => `
      <div class="ct-sec" id="${secId(s.n)}">
        <h3><a href="#${secId(s.n)}">${s.n}</a>${esc(tc(s.title))}</h3>${s.n === '10.1' && u.code !== 'ARNG' ? '<p class="ct-act"><a class="more" href="/request-uniforms-and-other-personal-items">Request Your Uniforms &rsaquo;</a></p>' : ''}
        ${s.paras.map(p => para(p, /Interpretation of Terms/i.test(s.title))).join('')}${notesHtml(s.n)}
      </div>`).join('')}
    </section>`).join('')}
    <p class="g-note ct-source">Text taken from the signed agreement. If anything here differs from the <a href="${c.pdf}">signed PDF</a>, the PDF controls.</p>
    <p class="g-help">A question about your rights under this contract? <a href="/assistance-request-portal">Ask Local 1776 for help</a>.</p>
  </div>
</div>
<button type="button" class="btn icon to-top" data-top title="Back to Top" hidden><span class="ico">${ICON.up}</span><span class="lbl">Back to Top</span></button>
<script src="/js/terms.js" defer></script>
<script src="/js/contract.js" defer></script>`;
  return { meta: { title: `${name} Contract`, nav: 'agencies', description: `The full text of the collective bargaining agreement between the ${party} and LIUNA Local 1776, with the signed PDF.` }, html, slug: c.slug };
}

// ---------- build ----------
function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}

const started = Date.now();
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const d of ['css', 'js', 'img', 'files', 'map', 'congress', 'vendor']) copyDir(path.join(SRC, d), path.join(OUT, d));
for (const k of OFF) for (const f of FORM_JS[k]) fs.rmSync(path.join(OUT, 'js', f));   // a form that is off: its script is not published
// who holds each seat (for the Legislation page map) — written fresh every build
fs.writeFileSync(path.join(OUT, 'congress', 'members.json'), JSON.stringify({ congress: congress.congress, asOf: congress.asOf, names: ST_NAME, senate: congress.senate, house: congress.house }));
// The ONE shared list of members of Congress, read by the Union App too (Ben, Nov 21 2026). A stable public contract:
// never rename or drop a field; add new ones. Shape: review/prompts/reply-to-app-lobbying.md. Open seats are left out.
{
  const pub = (m, chamber, state, district) => ({ bioguide: m.bio || null, name: m.name, chamber, state, district, party: m.party || '',
    committees: m.codes || [], website: m.url || '', contactForm: m.contact || '', phone: m.phone || '', office: m.office || '',
    photo: m.bio ? `https://theunitedstates.io/images/congress/450x550/${m.bio}.jpg` : '', status: m.isNew ? 'new' : 'continuing' });
  const list = [];
  for (const [st, ms] of Object.entries(congress.senate)) for (const m of ms) if (!m.open) list.push(pub(m, 'senate', st, null));
  for (const [st, o] of Object.entries(congress.house)) for (const [d, m] of Object.entries(o)) if (m && !m.open) list.push(pub(m, 'house', st, +d ? String(+d).padStart(2, '0') : 'AL'));
  list.sort((a, b) => a.state.localeCompare(b.state) || (a.chamber === b.chamber ? 0 : a.chamber === 'senate' ? -1 : 1) || String(a.district).localeCompare(String(b.district)) || a.name.localeCompare(b.name));
  fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'data', 'congress.json'), JSON.stringify({ congress: congress.congress.number, asOf: congress.asOf, members: list }));
}
const feeds = await feedsHtml();
const videoList = await readVideos();
// a summary that ends at a sentence (or a whole word, with …), never mid-word
const shortText = (t, n) => { if (t.length <= n) return t; const cut = t.slice(0, n), m = [...cut.matchAll(/[.!?](?=\s)/g)].pop(); return m && m.index > n / 3 ? cut.slice(0, m.index + 1) : cut.replace(/\s+\S*$/, '') + '…'; };
const videos = videosHtml(videoList.slice(0, 3));      // home page: the newest three
// every video is also a news item (News list, story sidebars) with its own page at /video/<slug>
posts = [...posts, ...videoList.map(v => {
  const l = videoLabel(v.title), first = (v.desc || '').split(/\n\s*\n/)[0].replace(/\s+/g, ' ').trim();
  return { slug: 'video/' + v.slug, title: l.title, kicker: l.kicker, date: v.published, author: '', subtitle: '', excerpt: shortText(first, 240),
    image: 'img/videos/' + v.id + '.jpg', video: true, yt: v.id, desc: v.desc || '', fullTitle: v.title };
})].sort((a, b) => String(b.date).localeCompare(String(a.date)));
// stories published from the Union App (publicPosts/{slug}, index publicStats/newsIndex)
const NEWS = await appNews(SRC, OFFLINE, process.argv.includes('--news-sample'), CONFIG.firebaseProject);
// the app pages (site/apps/: Reform, AGR Calculator)
const APPS = fs.existsSync(path.join(SRC, 'apps')) ? fs.readdirSync(path.join(SRC, 'apps')).filter(f => f.endsWith('.html')).map(f => f.replace(/.html$/, '')) : [];
const taken = new Set([...posts.map(p => p.slug), ...APPS, ...fs.readdirSync(path.join(SRC, 'pages')).map(f => f.replace(/\.html$/, '')), ...Object.keys(REDIRECTS), ...units.map(u => (u.contract || '').replace(/^\//, ''))]);
for (const s of NEWS.stories) {
  if (taken.has(s.slug)) { console.warn(`news: "${s.slug}" is already an address on the site — that story was skipped`); continue; }
  posts.push(s); taken.add(s.slug);
}
await storyPhotos(NEWS.stories, OUT, ROOT, OFFLINE);   // our own small copies of the app's photos
posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
let count = 0;
for (const file of fs.readdirSync(path.join(SRC, 'pages')).filter(f => f.endsWith('.html'))) {
  let src = formIf(fs.readFileSync(path.join(SRC, 'pages', file), 'utf8'));
  const m = src.match(/^<!--page\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`${file}: missing <!--page {...} --> settings`);
  const meta = JSON.parse(m[1]);
  src = src.slice(m[0].length);
  const name = file.replace(/\.html$/, '');
  meta.path = name === 'index' ? '/' : '/' + name;
  src = fill(src);
  fs.writeFileSync(path.join(OUT, name + '.html'), layout(meta, src));
  count++;
}
// App pages (Ben, Nov 22 2026: the Reform and AGR Calculator sites folded into this one): site/apps/<name>.html is the
// page's own content and scripts, site/apps/<name>.css its own stylesheet. The stylesheet is limited to the content
// (<main id="main">) and written into the page; the header, menu and footer get chrome.css, the part of site.css that
// styles only them — so neither stylesheet reaches the other's part of the page. No placeholders are filled in.
for (const name of APPS) {
  let src = fs.readFileSync(path.join(SRC, 'apps', name + '.html'), 'utf8');
  const m = src.match(/^<!--page\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`apps/${name}.html: missing <!--page {...} --> settings`);
  const meta = JSON.parse(m[1]);
  meta.path = '/' + name;
  meta.css = scopeCss(fs.readFileSync(path.join(SRC, 'apps', name + '.css'), 'utf8'), '#main').replace(/<\/style/gi, '<\\/style');
  fs.writeFileSync(path.join(OUT, name + '.html'), layout(meta, src.slice(m[0].length)));
  count++;
}
if (APPS.length) {
  // + the classes /js/header.js adds later (search results, the rotating line's fade), so their rules come along too
  const sample = layout({ title: 'x', description: '', path: '/x', app: 'agr', menu: [['#a', 'A']], current: '#a', css: '' }, '')
    + '<div class="find"><div class="find-out"><div class="find-g"></div><a class="find-r find-m on"><b><mark></mark></b><span><a></a></span></a><p class="find-none"></p></div></div><a class="hl-item out"></a><span class="hl-k out"><span class="hl-d"></span></span><div class="ptr set spin"><svg></svg></div>';
  fs.writeFileSync(path.join(OUT, 'css', 'chrome.css'), '/* Built from site.css by tools/build.mjs — the header, menu, contact strip and footer only (app pages). Do not edit. */\n'
    + chromeCss(fs.readFileSync(path.join(SRC, 'css', 'site.css'), 'utf8'), sample) + '\n');
}
// ---------- case pages (/cases/<slug>; Ben, Nov 24 2026: "an individual page for each case. Make it look nice") ----------
// site/data/cases.json. draft:true shows only with --cases (this PC), so nothing is public until Ben has seen it.
const AU = { play: '<svg class="pl" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg><svg class="pa" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>', back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4v5h5"/><path d="M4.6 9A8 8 0 1 1 4 13"/><text x="12" y="16" text-anchor="middle" font-family="Libre Franklin,Arial,sans-serif" font-size="7.4" font-weight="700" fill="currentColor" stroke="none">15</text></svg>', fwd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 4v5h-5"/><path d="M19.4 9A8 8 0 1 0 20 13"/><text x="12" y="16" text-anchor="middle" font-family="Libre Franklin,Arial,sans-serif" font-size="7.4" font-weight="700" fill="currentColor" stroke="none">15</text></svg>' };
function casePage(c) {
  const ext = h => /^https?:/.test(h) ? ' target="_blank" rel="noopener"' : '';
  const list = a => `<ul class="side-list case-docs">${a.map(([t, h, s]) => `<li><a href="${h}"${ext(h)}>${t}${s ? `<small>${s}</small>` : ''}</a></li>`).join('')}</ul>`;
  const au = c.audio;
  return `<article class="case">
  <header class="top"><div class="wrap">
    <div class="kicker case-k"><span>${c.forum}</span><i> &middot; </i><span>${c.court}</span></div>
    <h1 class="case-h">${c.title.map(t => `<span>${t}</span>`).join(' ')}</h1>
    <p class="deck">${c.deck}</p>
    <div class="t-tiles four case-tiles">${c.tiles.map(([k, v, n]) => `<div class="tile"><span>${k}</span><b>${v}</b><em>${n}</em></div>`).join('')}</div>
  </div></header>
  <div class="wrap">
    <section class="case-means"><h2>What It Means for You</h2><p>${c.means}</p></section>${au ? `
    <section class="case-au" aria-labelledby="hear">
      <h2 id="hear">Hear the Argument</h2>
      <p class="au-n">${au.note.map(n => `<span>${n}</span>`).join(' ')}</p>
      <div class="au" data-seconds="${au.seconds}">
        <audio preload="none" src="${au.src}"></audio>
        <button type="button" class="au-play" data-au="play" aria-label="Play" title="Play">${AU.play}</button>
        <input type="range" min="0" max="${au.seconds}" value="0" step="1" aria-label="Position in the recording"><span class="au-t">0:00</span>
        <div class="au-c"><button type="button" data-skip="-15" aria-label="Back 15 seconds" title="Back 15 seconds">${AU.back}</button><button type="button" data-skip="15" aria-label="Forward 15 seconds" title="Forward 15 seconds">${AU.fwd}</button><button type="button" class="au-sp" data-au="speed" aria-label="Speed 1 times" title="Speed">1&times;</button></div>
      </div>
      <p class="au-e" hidden>The recording could not be played here. <a href="${au.src}">Open the file</a> instead.</p>
      <dl class="au-who">${au.who.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    </section>` : ''}
    <section class="case-tl"><h2>How It Got There</h2><ol class="steps n${c.timeline.length}">${c.timeline.map(([d, h, p]) => `<li><span class="yr">${d}</span><h3>${h}</h3><p>${p}</p></li>`).join('')}</ol></section>
  </div>
  <div class="wrap split case-split">
    <div class="prose story-body">${c.sections.map(([h, ps], i) => `<h2>${h}</h2>${ps.map(p => `<p>${p}</p>`).join('')}${i === 1 && c.quote ? `<figure class="case-q"><blockquote>&ldquo;${c.quote[0]}&rdquo;</blockquote><figcaption>${c.quote[1]}</figcaption></figure>` : ''}`).join('\n')}</div>
    <aside class="story-side">
      <div class="aside"><h3>The Documents</h3>${list(c.docs)}</div>
      <div class="aside"><h3>The Law</h3>${list(c.law)}</div>
      <div class="aside"><h3>The Union</h3><p class="case-n">${c.union}</p><h3>Where It Applies</h3><p class="case-n">${c.reach}</p>${c.laborStatute ? `<h3>Status</h3><p class="case-n">${CONTRACT_STATUS.split(/(?<=\.) /).slice(0, 2).join(' ')}</p>` : ''}<a class="more" href="/resources#cases">All Our Cases &rsaquo;</a></div>
    </aside>
  </div>
</article>
<script src="/js/case.js" defer></script>`;
}
for (const c of CASES_PAGES) {
  fs.mkdirSync(path.join(OUT, 'cases'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'cases', c.slug + '.html'), layout({ title: c.title.join(' '), nav: 'resources', description: c.deck.replace(/&rsquo;/g, '’'), path: '/cases/' + c.slug, noindex: !!c.draft }, fill(casePage(c))));
  count++;
}
// every story at its old address (/slug), in the new format
posts.forEach((p, i) => {
  const { meta, html } = postPage(p, i);
  meta.path = '/' + p.slug;
  fs.mkdirSync(path.dirname(path.join(OUT, p.slug + '.html')), { recursive: true });
  fs.writeFileSync(path.join(OUT, p.slug + '.html'), layout(meta, fill(html)));
  count++;
});
// a story withdrawn in the app: its address says so (kept out of search engines and the sitemap)
const NOSITEMAP = new Set(['404.html', 'document.html', ...OFF_PAGES.map(p => p.slice(1) + '.html')]);
for (const slug of NEWS.withdrawn) {
  if (taken.has(slug)) continue;
  const html = `<header class="top"><div class="wrap"><div class="kicker">News</div><h1>This Story Is No Longer Available</h1>
    <p class="deck g-wide">Local 1776 has taken this story down. Our other stories are on the News page.</p>
    <p><a class="more" href="/blog">All News &rsaquo;</a></p></div></header>`;
  fs.writeFileSync(path.join(OUT, slug + '.html'), layout({ title: 'Story No Longer Available', nav: 'news', description: 'This story is no longer available.', path: '/' + slug, noindex: true }, html));
  NOSITEMAP.add(slug + '.html'); count++;
}
// one page per contract, at the address the old site used (units.json "contract")
const contractSlugs = [];
for (const u of units) {
  const p = contractPage(u);
  if (!p) continue;
  p.meta.path = '/' + p.slug;
  fs.writeFileSync(path.join(OUT, p.slug + '.html'), layout(p.meta, fill(p.html)));
  contractSlugs.push(p.slug); count++;
}
// every address already taken on the site, for the Union App's news module (it must not publish a story over one)
fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'data', 'slugs.json'), JSON.stringify({ reserved: ['video', 'files', 'img', 'css', 'js', 'map', 'congress', 'data'], pages: fs.readdirSync(path.join(SRC, 'pages')).filter(x => x.endsWith('.html')).map(x => x.replace(/.html$/, '')).concat(APPS, Object.keys(REDIRECTS), contractSlugs), stories: posts.map(p => p.slug) }));
function fill(src) {
  // {{SECTION:page#id}} = that page's <section id="id"> pulled in as-is, so one text lives in one place (Join shows the
  // Terms of Membership costs section; Ben, Nov 22 2026)
  src = src.replace(/\{\{SECTION:([\w-]+)#([\w-]+)\}\}/g, (_, page, id) => {
    const html = fs.readFileSync(path.join(SRC, 'pages', page + '.html'), 'utf8');
    const a = html.search(new RegExp(`<section[^>]*\\bid="${id}"`)), b = a < 0 ? -1 : html.indexOf('</section>', a);
    if (a < 0 || b < 0) throw new Error(`{{SECTION:${page}#${id}}}: no such section`);
    return html.slice(a, b + '</section>'.length);
  });
  return src.replace(/\{\{POSTS:(\d+)\}\}/g, (_, n) => postCards(+n)).replace('{{FEEDS}}', feeds).replace('{{SLIDES}}', slides)
           .replace(/\{\{SUBMIT:([^|]+)\|([^}]+)\}\}/g, (_, icon, word) => submit(icon, word))
           // {{ACT:icon|Word|class|action}} = a button the page's script handles (Print, Clear, Add...)
           .replace(/\{\{ACT:([^|]+)\|([^|]+)\|([^|]*)\|([^}]+)\}\}/g, (_, icon, word, cls, act) => `<button type="button" class="btn${cls ? ' ' + cls : ''}" data-act="${act}"><span class="ico">${ICON[icon]}</span><span class="lbl">${word}</span></button>`)
           .replace(/\{\{MAP:(mini|full)\}\}/g, (_, k) => usMap(k)).replace(/\{\{UNIT_TABS:([^}]*)\}\}/g, (_, base) => unitTabs(base))
           .replace('{{REPS}}', repsHtml()).replace('{{CASES}}', () => casesRows()).replace('{{AGENCY_DATA}}', agencyData())
           .replace(/\{\{STAT:(\w+)\}\}/g, (_, k) => STATS[k])
           .replace(/\{\{ICON:(\w+)\}\}/g, (_, k) => ICON[k] || '')   // an icon from the set above
           .replace(/\{\{PRIVACY:(\w+)\}\}/g, (_, k) => `<div class="privacy"><span class="pico">${ICON.lock}</span><p><strong>Your Privacy:</strong> ${PRIVACY[k]}</p></div>`)
           // {{UNIT_OPTIONS:ARNG}} = <option>s for every unit except the listed codes; {{DATA:name}} = site/data/name.json for the page script
           // units with both branches are listed twice — "Louisiana Army National Guard" (LA-ARMY) and "Louisiana Air National
           // Guard" (LA-AIR) — so the pick also sets the branch (Ben, Nov 21 2026)
           // grouped: Air National Guard first, a blank line, then Army National Guard (Ben, Nov 21 2026)
           // {{UNIT_OPTIONS:ALL}} (Representation Request) also lists PEC and TARC, and "Other Agency (Not Listed)" at the end
           .replace(/\{\{UNIT_OPTIONS:([^}]*)\}\}/g, (_, skip) => {
             const all = skip === 'ALL', list = units.filter(u => all || !skip.split(',').includes(u.code)), both = u => /Army and Air/.test(u.line2);
             const army = u => u.code === 'ARNG'
               ? '<option value="ARNG-PEC">Army National Guard Professional Education Center (PEC)</option><option value="ARNG-TARC">Army National Guard Readiness Center (TARC)</option>'
               : `<option value="${both(u) ? u.code + '-ARMY' : u.code}">${esc(u.line1)} Army National Guard</option>`;
             return `<optgroup label="Air National Guard">${list.filter(both).map(u => `<option value="${u.code}-AIR">${esc(u.line1)} Air National Guard</option>`).join('')}</optgroup>` +
               '<option disabled></option>' +
               `<optgroup label="Army National Guard">${list.filter(u => u.code !== 'ARNG').map(army).join('')}${list.some(u => u.code === 'ARNG') ? army({ code: 'ARNG' }) : ''}</optgroup>` +
               (all ? '<option disabled></option><optgroup label="Other"><option value="OTHER">Other Agency (Not Listed)</option></optgroup>' : '');
           })
           .replace(/\{\{DATA:([\w-]+)\}\}/g, (_, n) => `<script type="application/json" id="data-${n}">${fs.readFileSync(path.join(SRC, 'data', n + '.json'), 'utf8').replace(/</g, '\\u003c')}</script>`)
           .replace('{{CONTRACT_LINKS}}', () => JSON.stringify(Object.fromEntries(units.map(u => [u.code, { name: `${u.line1} ${u.line2}`, state: u.line1, href: u.contract, both: /Army and Air/.test(u.line2) }]))))
           .replace('{{NEWS_INDEX}}', () => newsIndex()).replace('{{VIDEOS}}', () => videos).replace('{{RESOURCES}}', () => resourcesHtml()).replace('{{CONGRESS}}', () => congressHtml())
           .replace(/\{\{BTN:([^|]+)\|([^|]+)\|([^|}]+)(?:\|([^}]+))?\}\}/g, (_, href, icon, word, cls) => button(href, icon, word, cls || ''));
}
// ---------- site search + the header's rotating line (Ben, Nov 22 2026) ----------
// /data/search.json: every page, news story, contract article and section, and Resources document, read by /js/header.js
// in the visitor's browser (no outside search service; nothing typed leaves the device). Fields: k = kind (p page,
// c contract, r resource, n news), t title, u address, c context line, d description, h headings, x text (shortened), dt date.
{
  const unent = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;|&lsquo;|&#39;/g, "'").replace(/&ldquo;|&rdquo;|&quot;/g, '"')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&middot;/g, '·').replace(/&sect;/g, '§').replace(/&rsaquo;/g, '').replace(/&[a-z]+;|&#\d+;/g, ' ');
  const strip = h => unent(h.replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  const cut = (s, n) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') : s);
  const postBy = new Map(posts.map(p => [p.slug, p]));
  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.html')).concat(fs.existsSync(path.join(OUT, 'video')) ? fs.readdirSync(path.join(OUT, 'video')).filter(f => f.endsWith('.html')).map(f => 'video/' + f) : []).concat(CASES_PAGES.filter(c => !c.draft).map(c => 'cases/' + c.slug + '.html'));
  const unitOfContract = Object.fromEntries(units.map(u => [(u.contract || '').replace(/^\//, ''), u]));
  const out = [];
  for (const f of files) {
    if (NOSITEMAP.has(f)) continue;
    const html = fs.readFileSync(path.join(OUT, f), 'utf8');
    if (/http-equiv="refresh"/.test(html.slice(0, 600))) continue;
    const slug = f.replace(/\.html$/, ''), u = slug === 'index' ? '/' : '/' + slug;
    const t = unent((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '').replace(/\s*\|\s*LIUNA Local 1776$/, '').trim();
    const d = unent((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
    const a = html.indexOf('<main id="main">'), b = html.lastIndexOf('</main>');
    const main = a >= 0 && b > a ? html.slice(a, b) : '';
    const heads = [...main.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g)].map(m => strip(m[1])).filter(Boolean);
    const post = postBy.get(slug);
    const unit = unitOfContract[slug];
    if (unit) {
      const name = unit.code === 'ARNG' ? 'PEC and TARC Contract' : `${unit.line1} Contract`;
      out.push({ k: 'c', t: name, u, c: unit.code === 'ARNG' ? 'Army National Guard (PEC and TARC)' : `${unit.line1} ${unit.line2}`, d, h: '', x: '' });
      for (const m of main.matchAll(/<section class="ct-art" id="(a\d+)">\s*<div class="ct-ah"><div class="kicker">([^<]*)<\/div><h2>([\s\S]*?)<\/h2>/g))
        out.push({ k: 'c', t: `${strip(m[2])}: ${strip(m[3])}`, u: `${u}#${m[1]}`, c: name, d: '', h: '', x: '' });
      for (const m of main.matchAll(/<div class="ct-sec" id="(s[\d-]+)">\s*<h3><a [^>]*>([^<]*)<\/a>([\s\S]*?)<\/h3>([\s\S]*?)(?=<div class="ct-sec"|<\/section>)/g))
        out.push({ k: 'c', t: `${strip(m[2])} ${strip(m[3])}`, u: `${u}#${m[1]}`, c: name, d: '', h: '', x: cut(strip(m[4].replace(/<div class="ct-notes">[\s\S]*$/, '')), 260) });
      continue;
    }
    if (post || slug.startsWith('video/')) {
      out.push({ k: 'n', t, u, c: post ? (post.video ? 'Video' : byWho(post)) : 'Video', d: post ? (post.subtitle || post.excerpt || '') : d, h: '', x: cut(strip(main), 600), dt: post ? String(post.date).slice(0, 10) : '' });
      continue;
    }
    if (slug === '404' || slug === 'document' || slug === 'test-story-do-not-publish') continue;
    out.push({ k: 'p', t, u, c: '', d, h: cut(heads.join(' · '), 700), x: cut(strip(main), 2000) });
  }
  // every document and link on the Resources page
  const walk = (list, ctx) => (list || []).forEach(it => {
    if (it.label && it.href) out.push({ k: 'r', t: it.label, u: it.href, c: ctx, d: it.sub || '', h: '', x: '' });
    if (it.items) walk(it.items, it.title ? `${ctx} · ${it.title}` : ctx);
  });
  for (const s of JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'resources.json'), 'utf8'))) for (const g of s.groups || []) walk(g.items, `${s.title} · ${g.title}`);
  fs.writeFileSync(path.join(OUT, 'data', 'search.json'), JSON.stringify(out));
  console.log(`search: ${out.length} entries, ${(fs.statSync(path.join(OUT, 'data', 'search.json')).size / 1024).toFixed(0)} KB`);

  // the header's rotating line: Know Your Rights facts (site/data/rights-facts.json) taking turns with the newest news —
  // our own stories and videos, and the Government Executive / Federal News Network headlines
  const facts = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'rights-facts.json'), 'utf8')).facts.filter(f => !OFF_PAGES.includes(f.href) && (!f.href.startsWith('/cases/') || CASES_PAGES.some(c => f.href === '/cases/' + c.slug)));
  // our own news: a video shows its hook (site/data/video-hooks.json — a quote or teaser, Ben, Nov 22 2026), else its title;
  // a story shows its title and subtitle
  const hooks = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'video-hooks.json'), 'utf8')).hooks;
  // each news item and video carries its publication day (Ben, Nov 24 2026); Know Your Rights facts have none, so they show none
  const day = d => d && !isNaN(d) ? apDate(d) : undefined;
  const news = posts.slice(0, 3).map(p => ({ k: p.video ? 'Local 1776 Video' : 'Local 1776 News', u: '/' + p.slug, d: day(new Date(p.date)),
    t: p.video ? (hooks[p.slug.replace(/^video\//, '')] || titleCase(p.title)) : titleCase(p.title) + (p.subtitle ? ': ' + p.subtitle : '') }));
  for (let i = 0; i < 2; i++) for (const { f, items } of FEED_ITEMS) if (items[i]) news.push({ k: f.name, t: items[i].title, u: items[i].link, d: day(easternDay(items[i].date)), ext: 1 });
  const line = [];
  for (let i = 0; i < Math.max(facts.length, news.length); i++) {
    if (facts[i]) line.push({ k: facts[i].k || 'Know Your Rights', t: facts[i].text, u: facts[i].href });
    if (news[i]) line.push(news[i]);
  }
  fs.writeFileSync(path.join(OUT, 'data', 'header-line.json'), JSON.stringify({ items: line }));
}
for (const [from, to] of Object.entries(REDIRECTS)) {
  fs.writeFileSync(path.join(OUT, from + '.html'), `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Moved</title><link rel="canonical" href="${SITE}${to}"><meta http-equiv="refresh" content="0; url=${to}"><meta name="robots" content="noindex"></head><body><p>This page moved to <a href="${to}">${SITE}${to}</a>.</p></body></html>\n`);
}
// Every page names its styles and scripts with a stamp of their contents (site.css?v=1a2b3c4d), so a browser that kept the old
// ones asks for the new ones the moment they change (Nov 24 2026: the new header showed white for people with the old styles).
{
  const stamps = {};
  const stamp = f => stamps[f] ||= createHash('sha256').update(fs.readFileSync(path.join(OUT, f))).digest('hex').slice(0, 8);
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) {
        const h = fs.readFileSync(p, 'utf8');
        const n = extNewTab(h).replace(/ (href|src)="\/((?:css|js)\/[\w.-]+\.(?:css|js))"/g, (m, a, u) => fs.existsSync(path.join(OUT, u)) ? ` ${a}="/${u}?v=${stamp(u)}"` : m);
        if (n !== h) fs.writeFileSync(p, n);
      }
    }
  })(OUT);
}
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
// robots.txt and sitemap.xml: every page except the redirects and the 404 page (GitHub Pages serves 404.html itself)
{
  const pages = fs.readdirSync(OUT).concat(CASES_PAGES.filter(c => !c.draft).map(c => 'cases/' + c.slug + '.html')).filter(f => f.endsWith('.html') && !NOSITEMAP.has(f))
    .filter(f => !/http-equiv="refresh"/.test(fs.readFileSync(path.join(OUT, f), 'utf8').slice(0, 600)))
    .map(f => (f === 'index.html' ? '/' : '/' + f.replace(/\.html$/, ''))).sort();
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + pages.map(p => `  <url><loc>${SITE}${p}</loc></url>`).join('\n') + '\n</urlset>\n');
  fs.writeFileSync(path.join(OUT, 'robots.txt'), LIVE ? `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
}
console.log(`built ${count} pages into dist/ in ${Date.now() - started} ms${LIVE ? ' (LIVE: indexable)' : ''}`);
