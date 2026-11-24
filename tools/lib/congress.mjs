// Members of Congress + the Armed Services committees, for the Legislation page (Ben, Nov 20 2026).
// Every build re-reads the public "congress-legislators" data (unitedstates.github.io, public domain): current members
// with office phone / website / contact form, all committees and subcommittees, and who sits on each. The last good
// copy is cached in site/data/congress-cache/ so an offline build still works.
// Until the new Congress is sworn in and that data catches up, site/data/congress-elect.json (the November winners,
// compiled by hand) decides WHO holds each seat; returning members keep their contact details from the live data.
// Once the live data has the new Congress (most House terms starting on/after its start date), the elect file is ignored.
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://unitedstates.github.io/congress-legislators/';
const FILES = ['legislators-current.json', 'committees-current.json', 'committee-membership-current.json'];
export const CONGRESS = { number: 120, start: '2027-01-03' };
const PARTY = { Democrat: 'D', Republican: 'R', Independent: 'I', Libertarian: 'L' };

async function load(src, offline) {
  const dir = path.join(src, 'data', 'congress-cache'); fs.mkdirSync(dir, { recursive: true });
  const out = {};
  for (const f of FILES) {
    const file = path.join(dir, f);
    if (!offline) {
      try {
        const r = await fetch(BASE + f, { signal: AbortSignal.timeout(30000) });
        if (!r.ok) throw new Error(r.status);
        const txt = await r.text(); JSON.parse(txt); fs.writeFileSync(file, txt);
      } catch (e) { console.warn(`congress: ${f} not refreshed (${e.message}) — using the cached copy`); }
    }
    out[f] = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  // Voteview (UCLA): left-right voting scores (DW-NOMINATE first dimension, -1 liberal … +1 conservative), open data.
  // The new Congress's file appears once it starts voting; until then (and for members with too few votes) the last one counts.
  out.voteview = {};
  for (const c of [CONGRESS.number - 1, CONGRESS.number]) {
    const file = path.join(dir, `voteview-${c}.csv`);
    if (!offline) {
      try {
        const r = await fetch(`https://voteview.com/static/data/out/members/HS${c}_members.csv`, { signal: AbortSignal.timeout(30000) });
        if (r.ok) { const txt = await r.text(); if (/^congress,chamber/.test(txt)) fs.writeFileSync(file, txt); }
      } catch (e) { console.warn(`congress: Voteview ${c} not refreshed (${e.message})`); }
    }
    if (fs.existsSync(file)) out.voteview[c] = fs.readFileSync(file, 'utf8');
  }
  return out;
}

// one CSV line -> fields (handles "quoted, fields")
const csvRow = line => { const out = []; let cur = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };

export async function congressData(src, offline) {
  const d = await load(src, offline);
  const legs = d['legislators-current.json'], comms = d['committees-current.json'], mem = d['committee-membership-current.json'];
  const byBio = Object.fromEntries(legs.map(l => [l.id.bioguide, l]));
  const commName = {};   // thomas id -> { name, parent }
  for (const c of comms) {
    commName[c.thomas_id] = { name: c.name.replace(/^(House|Senate) Committee on (the )?/, '').replace(/^(House|Senate) /, ''), type: c.type, url: c.url };
    for (const s of c.subcommittees || []) commName[c.thomas_id + s.thomas_id] = { name: s.name, parent: c.thomas_id };
  }
  // every member's committees (full committees only) with leadership titles
  const seats = {};
  for (const [id, list] of Object.entries(mem)) for (const m of list) {
    if (!m.bioguide || !commName[id]) continue;
    (seats[m.bioguide] ||= []).push({ id, title: m.title || '', party: m.party, rank: m.rank });
  }
  // bioguide -> { x: score, n: votes, c: congress, ch: chamber } — the newest Congress with enough votes (25+) wins
  const vv = {};
  for (const c of Object.keys(d.voteview).map(Number).sort()) {
    const [head, ...rows] = d.voteview[c].trim().split(/\r?\n/); const H = csvRow(head), ix = k => H.indexOf(k);
    for (const r of rows) {
      const f = csvRow(r), bio = f[ix('bioguide_id')], x = parseFloat(f[ix('nominate_dim1')]), n = parseInt(f[ix('nominate_number_of_votes')], 10) || 0;
      if (!bio || isNaN(x) || n < 25) continue;
      vv[bio] = { x: Math.round(x * 1000) / 1000, n, c, ch: f[ix('chamber')], id: f[ix('icpsr')] };
    }
  }
  const person = l => {
    const t = l.terms[l.terms.length - 1];
    return { bio: l.id.bioguide, vv: vv[l.id.bioguide] || null, name: l.name.official_full || `${l.name.nickname || l.name.first} ${l.name.last}`, party: PARTY[t.party] || t.party?.[0] || '',
      phone: t.phone || '', url: t.url || '', contact: t.contact_form || '', office: t.address || '' };
  };
  const live120 = legs.filter(l => l.terms.at(-1).type === 'rep' && l.terms.at(-1).start >= CONGRESS.start).length > 300;
  const elect = !live120 && fs.existsSync(path.join(src, 'data', 'congress-elect.json'))
    ? JSON.parse(fs.readFileSync(path.join(src, 'data', 'congress-elect.json'), 'utf8')) : null;

  const senate = {}, house = {};
  // notes members can read: bookkeeping notes are dropped, redistricting notes are reworded
  const publicNote = n => !n || /bioguide/i.test(n) ? ''
    : n.replace(/^Currently represents [A-Z]{2}-(\d+|AL); elected in the redrawn [A-Z]{2}-\d+\.?$/, (_, d) => `Moves from District ${d} under the new district lines.`);
  // a member keeps their office details and committees only if they stay in the same chamber (a House member who won
  // a Senate seat gets a new office and new committees in January)
  const fromElect = (e, kind) => {
    const l = e.bioguide && byBio[e.bioguide];
    const same = !!l && l.terms.at(-1).type === kind;
    // a voting record follows the PERSON across chambers (a House member who moves to the Senate keeps it)
    const base = same ? person(l) : { bio: e.bioguide || '', vv: vv[e.bioguide] || null, name: e.name, party: e.party, phone: '', url: '', contact: '', office: '' };
    const open = e.status === 'uncalled' || e.status === 'runoff';
    return { ...base, name: e.name || base.name || (e.status === 'runoff' ? 'Runoff Election' : 'Race Not Yet Called'), party: e.party || (open ? '' : base.party),
      status: e.status || 'elected', isNew: !same && !open, open, keep: same, note: publicNote(e.note) };
  };
  if (elect) {
    for (const e of elect.senate) (senate[e.state] ||= []).push(fromElect(e, 'sen'));
    for (const e of elect.house) (house[e.state] ||= {})[e.district] = fromElect(e, 'rep');
  } else {
    for (const l of legs) {
      const t = l.terms.at(-1);
      if (t.type === 'sen') (senate[t.state] ||= []).push({ ...person(l), status: 'elected' });
      else (house[t.state] ||= {})[t.district || 0] = { ...person(l), status: 'elected' };
    }
  }
  // where each person sits in the NEXT Congress (the member counts use the new district lines)
  const seatNext = {};
  for (const [st, list] of Object.entries(senate)) for (const m of list) if (m.bio) seatNext[m.bio] = { st, d: null };
  for (const [st, o] of Object.entries(house)) for (const [d, m] of Object.entries(o)) if (m.bio) seatNext[m.bio] = { st, d: +d };
  const inNext = new Set([...Object.values(senate).flat(), ...Object.values(house).flatMap(o => Object.values(o))].map(m => m.bio).filter(Boolean));
  const titleRank = t => (/^Chair/i.test(t) ? 0 : /Ranking/i.test(t) ? 1 : /Vice/i.test(t) ? 2 : 3);
  const committeesOf = bio => (seats[bio] || []).filter(s => !commName[s.id].parent)
    .map(s => ({ name: commName[s.id].name, title: s.title })).sort((a, b) => titleRank(a.title) - titleRank(b.title) || a.name.localeCompare(b.name));
  // attach committees + the Armed Services flag to everyone on the map
  for (const m of [...Object.values(senate).flat(), ...Object.values(house).flatMap(o => Object.values(o))]) {
    m.committees = m.bio && m.keep !== false ? committeesOf(m.bio) : [];
    m.asc = m.committees.some(c => c.name === 'Armed Services');
    // committee codes (Thomas ids; subcommittees = parent code + number) for the shared list the Union App reads
    m.codes = m.bio && m.keep !== false ? (seats[m.bio] || []).map(s => ({ code: s.id, title: s.title })) : [];
  }
  // a seat still being counted (recount, runoff, not called): its current member is neither "returning" nor "leaving"
  const openSeat = t => !!elect && t.type === 'rep' && elect.house.some(e => e.state === t.state && +e.district === +(t.district || 0) && (e.status === 'uncalled' || e.status === 'runoff'));
  // the two Armed Services rosters, with subcommittees and every other committee
  const roster = id => {
    const c = comms.find(x => x.thomas_id === id);
    const list = (mem[id] || []).map(m => {
      const l = byBio[m.bioguide]; const t = l ? l.terms.at(-1) : {};
      const subs = Object.entries(mem).filter(([k]) => k.startsWith(id) && k !== id)
        .flatMap(([k, ms]) => ms.filter(x => x.bioguide === m.bioguide).map(x => ({ name: commName[k]?.name || k, title: x.title || '' })));
      return { ...(l ? person(l) : { name: m.name, party: '' }), st: t.state || '', district: t.type === 'rep' ? (t.district || 0) : null,
        side: m.party, rank: m.rank, title: m.title || '', subs,
        other: committeesOf(m.bioguide).filter(x => x.name !== 'Armed Services'),
        next: seatNext[m.bioguide] || null, pending: openSeat(t), leaving: !inNext.has(m.bioguide) && !openSeat(t) };
    });
    list.sort((a, b) => (a.side === b.side ? 0 : a.side === 'majority' ? -1 : 1) || a.rank - b.rank);
    return { name: c.name, url: c.url, subcommittees: (c.subcommittees || []).map(s => s.name), members: list };
  };
  return { congress: CONGRESS, membersFrom: elect ? `elect:${elect.asOf}` : 'live', asOf: new Date().toISOString().slice(0, 10),
    senate, house, sasc: roster('SSAS'), hasc: roster('HSAS') };
}

// ---- shown on the page (also mirrored in site/js/congress.js) ----
// each member's official page on Congress.gov (Library of Congress), addressed by their Bioguide ID (Ben, Nov 21 2026: GovTrack out)
export const congressGovUrl = (name, bio) => `https://www.congress.gov/member/${String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}/${bio}`;
// Voteview left-right bar: navy marker on a gray scale, no party colors (Ben, Nov 21 2026)
export function vvHtml(v, chamberNow) {
  if (!v) return '<p class="cg-vv-c">Voting score: none yet.</p>';
  const pct = Math.max(2, Math.min(98, (v.x + 1) / 2 * 100)).toFixed(1);
  const was = chamberNow && v.ch !== chamberNow ? ` as a ${v.ch === 'House' ? 'House member' : 'senator'}` : '';
  return `<div class="cg-vv" role="img" aria-label="Voting score ${v.x} on a scale from -1 (liberal) to +1 (conservative)"><span>Liberal</span><div class="cg-vv-t"><i style="left:${pct}%"></i></div><span>Conservative</span></div>`
    + `<p class="cg-vv-c"><a href="https://voteview.com/person/${v.id}" target="_blank" rel="noopener">Voteview (UCLA)</a> · ${v.n.toLocaleString('en-US')} votes${was}, ${v.c}th Congress</p>`;
}
