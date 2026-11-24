// LAUNCH DAY ONLY: turn the two old sister sites into forwarders to their new homes on www.local1776.org
// (Ben, Nov 22 2026: "as long as the old ones automatically redirect to the new ones, because I don't want anybody to get
// lost. We don't have to reprint anything.").
//   reform.local1776.org/…           → https://www.local1776.org/reform…        (#guard etc. kept — the handout QR codes)
//   reform.local1776.org/handouts/X  → https://www.local1776.org/files/reform/X
//   calculator.local1776.org/…       → https://www.local1776.org/agr-calculator
// Each old repo keeps its CNAME (so the old addresses still answer, and no DNS change is needed); everything else in it is
// replaced by index.html + 404.html (GitHub Pages serves 404.html for any other path) that forward at once, with share
// previews pointing at the new pages. The old content stays in the repos' history and in backup/sister-sites/.
//
//   node tools/forwarders.mjs          DRY RUN: writes the forwarder files into publish/forwarders/<repo>/ and shows them
//   node tools/forwarders.mjs --push   clones each old repo there, replaces its files, commits and pushes
// ⛔ Only after www.local1776.org is live — before that, the forwarders would send people to a site that isn't there.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'publish', 'forwarders');
const PUSH = process.argv.includes('--push');
const NEW = 'https://www.local1776.org';
const run = (args, cwd) => execFileSync(args[0], args.slice(1), { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const SITES = [
  { repo: 'local1776/reform', dir: 'reform', to: '/reform', title: 'One signature took bargaining rights from a million federal workers',
    desc: 'The record, every hole in the federal bargaining law, and the bill to close them.', image: '/img/reform/og.png',
    // /handouts/X.pdf → /files/reform/X.pdf; everything else → the page, keeping the #section
    route: `p.indexOf('/handouts/')===0?'/files/reform/'+p.slice(10):'/reform'+location.hash` },
  { repo: 'local1776/agr-calculator', dir: 'agr-calculator', to: '/agr-calculator', title: 'Technician vs. AGR: What the Switch Really Pays',
    desc: 'Enter your own grade, step and years of service. Compare monthly pay, career earnings and retirement for all three paths.', image: '/img/agr/og.png',
    route: `'/agr-calculator'+location.hash` },
];
const page = s => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Moved to www.local1776.org${s.to}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${NEW}${s.to}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="LIUNA Local 1776">
<meta property="og:title" content="${s.title}">
<meta property="og:description" content="${s.desc}">
<meta property="og:url" content="${NEW}${s.to}">
<meta property="og:image" content="${NEW}${s.image}">
<meta name="twitter:card" content="summary_large_image">
<script>(function(){var p=location.pathname;location.replace(${JSON.stringify(NEW)}+(${s.route}));})();</script>
<noscript><meta http-equiv="refresh" content="0; url=${NEW}${s.to}"></noscript>
</head>
<body style="font-family:Arial,sans-serif;padding:24px">
<p>This page has moved to <a href="${NEW}${s.to}">www.local1776.org${s.to}</a>.</p>
</body>
</html>
`;

for (const s of SITES) {
  const dir = path.join(OUT, s.dir);
  if (PUSH) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(OUT, { recursive: true });
    run(['gh', 'repo', 'clone', s.repo, dir], ROOT);
    const cname = fs.readFileSync(path.join(dir, 'CNAME'), 'utf8');
    for (const f of run(['git', 'ls-files'], dir).split('\n').filter(Boolean)) fs.rmSync(path.join(dir, f), { force: true });
    fs.writeFileSync(path.join(dir, 'CNAME'), cname);
  } else fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(s));
  fs.writeFileSync(path.join(dir, '404.html'), page(s));
  fs.writeFileSync(path.join(dir, '.nojekyll'), '');
  fs.writeFileSync(path.join(dir, 'README.md'), `# Moved\n\nThis site now lives at ${NEW}${s.to}. This repository only forwards the old address there.\n`);
  if (PUSH) {
    run(['git', 'add', '-A'], dir);
    run(['git', 'commit', '-m', `Forward to ${NEW}${s.to} (the site moved into www.local1776.org)`], dir);
    run(['git', 'push'], dir);
    console.log(`${s.repo}: pushed — the old address now forwards to ${NEW}${s.to}`);
  } else console.log(`${s.repo}: dry run → ${path.relative(ROOT, dir)} (index.html, 404.html, .nojekyll, README.md; CNAME kept)`);
}
