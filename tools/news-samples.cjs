// node tools/news-samples.cjs → site/data/news-sample/ (Firestore REST format), for previewing the Union App news importer
// on this PC only: node tools/build.mjs --news-sample. Made up from the app agent's sample (Nov 22 2026). Not real stories.
const fs = require('fs'); const path = require('path');
const D = path.resolve(__dirname, '../site/data/news-sample') + '/';
fs.mkdirSync(D, { recursive: true });
const TS = new Set(['date', 'updated', 'updatedAt']);
const wrap = (v, k) => v === null ? { nullValue: null } : TS.has(k) ? { timestampValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(x => wrap(x)) } }
  : typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([kk, x]) => [kk, wrap(x, kk)])) } }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : typeof v === 'boolean' ? { booleanValue: v } : { stringValue: String(v) };
const save = (name, o) => fs.writeFileSync(D + name.replace(/\//g, '__') + '.json', JSON.stringify({ name: 'projects/liuna-local-1776/databases/(default)/documents/' + name, fields: wrap(o).mapValue.fields }, null, 1));
const story = {
  slug: 'test-story-do-not-publish', title: 'sample story for the website importer', subtitle: 'A made-up story with every field filled in',
  excerpt: 'This is a made-up story so the website can build its importer against the real shape.',
  date: '2026-11-22T15:00:00Z', updated: '2026-11-22T15:00:00Z', author: 'Business Manager', kind: 'ours',
  image: { url: '/img/posts/disturbing-allegations-at-sc-army-national-guard-aasf-1.jpg', alt: 'A made-up photo', caption: 'Caption text', credit: 'Photo credit', width: 1600, height: 1067 },
  body: '<p>First paragraph.</p><h2>A Heading</h2><ul><li>One</li><li>Two</li></ul><p><a href="https://www.local1776.org">A link</a> and <a href="https://example.com">an outside link</a>.</p><script>alert(1)</script><p onclick="x()">Cleaned: no script, no onclick, <a href="javascript:alert(1)">no javascript link</a>.</p>',
  tags: ['Representation', 'Contracts'], status: 'published',
};
save('publicPosts/' + story.slug, story);
save('publicStats/newsIndex', { updatedAt: '2026-11-22T15:00:00Z', stories: [{ slug: story.slug, title: story.title, excerpt: story.excerpt, date: story.date, kind: 'ours', tags: story.tags, image: story.image.url, imageAlt: story.image.alt }], withdrawn: ['an-old-withdrawn-story'] });
console.log('ok');
