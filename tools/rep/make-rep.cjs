// node tools/rep/make-rep.cjs → site/js/rep.js: inlines the Lucide icons the template uses and each contract's safety section.
const fs = require('fs'); const R = require('path').resolve(__dirname, '../..') + '/';
const S = __dirname + '/';   // tools/rep: rep.template.js + lucide/*.svg (Lucide 0.460.0, ISC)
let t = fs.readFileSync(S + 'rep.template.js', 'utf8').replace(/\r\n/g, '\n');
const names = [...new Set([...t.matchAll(/^    \['[a-z]+', '[^']+', '[^']+', '([a-z-]+)'/gm)].map(m => m[1]))];
const inner = n => fs.readFileSync(S + 'lucide/' + n + '.svg', 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '').replace(/\s*\n\s*/g, '').trim();
const icons = Object.fromEntries(names.map(n => [n, inner(n)]));
const units = JSON.parse(fs.readFileSync(R + 'site/data/units.json', 'utf8'));
const safety = {};
for (const u of units) {
  const f = R + 'site/data/contracts/' + u.code + '.json';
  if (!fs.existsSync(f) || !u.contract) continue;
  const c = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const a of c.articles) for (const s of a.sections) {
    const txt = s.paras.map(p => p.t).join(' ');
    if (!safety[u.code] && /Unsafe\/Hazardous/.test(s.title) && /imminent/i.test(txt) && /declin/i.test(txt))
      safety[u.code] = { sec: s.n, href: u.contract + '#s' + String(s.n).replace('.', '-') };
  }
}
const missing = units.filter(u => u.contract && !safety[u.code]).map(u => u.code);
if (missing.length) throw new Error('no safety section: ' + missing);
t = t.replace('__ICONS__', JSON.stringify(icons, null, 2).replace(/\n/g, '\n  ')).replace('__SAFETY__', JSON.stringify(safety));
fs.writeFileSync(R + 'site/js/rep.js', t);
console.log('ok', names.join(' '), JSON.stringify(safety));
