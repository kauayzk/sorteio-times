'use strict';
// Sorteios WEAK GG — shared helpers, CSPRNG, verifiable draw (seal code, SHA-256, draw plan)

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad2 = n => String(n).padStart(2, '0');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;

/* ---------- fair randomness: CSPRNG + rejection sampling (no modulo bias) ---------- */
function rnd(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % n;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ---------- verifiable draw: commit (SHA-256 of code) before, reveal seed after ----------
   code  = "WGG1." + base64url(JSON {seed, teams, caps, stars, players})
   hash  = SHA-256(code)                          ← shown before the draw starts
   stream: SHA-256("<seed>:<n>") for n = 0,1,2… read as big-endian uint32
   every pick uses rejection sampling over that stream, so the whole result follows from the seed */
const enc = new TextEncoder();
const toHex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
const sha256 = async str => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(str)));
const fmtHash = h => h.toUpperCase().match(/.{1,4}/g).join(' ');
function b64uEncode(str) { let s = ''; enc.encode(str).forEach(x => s += String.fromCharCode(x)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64uDecode(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0))); }
// standard draws add mode:"std" and carry only {seed, teams, players};
// bracket draws add mode:"bracket" + title, with teams = the first-round matches and players = the teams
const makeCode = (seed, d) => 'WGG1.' + b64uEncode(JSON.stringify(
  d.mode === 'std' ? { mode: 'std', seed, teams: d.teams, players: d.players }
  : d.mode === 'bracket' ? { mode: 'bracket', seed, title: d.title || '', teams: d.teams, players: d.players }
  : { seed, teams: d.teams, caps: d.caps, stars: d.stars, players: d.players }));
function readCode(code) {
  if (!code.startsWith('WGG1.')) throw new Error('formato');
  const o = JSON.parse(b64uDecode(code.slice(5)));
  const strs = a => Array.isArray(a) && a.every(s => typeof s === 'string');
  let ok;
  if (o.mode === 'std') {
    ok = typeof o.seed === 'string' && strs(o.teams) && strs(o.players)
      && o.teams.length >= 2 && o.teams.length <= 8 && o.players.length >= o.teams.length && o.players.length <= 64;
  } else if (o.mode === 'bracket') {
    ok = typeof o.seed === 'string' && typeof o.title === 'string' && strs(o.teams) && strs(o.players)
      && o.players.length >= 2 && o.players.length <= 32 && o.teams.length === brSize(o.players.length) / 2;
  } else {
    // older draws used 4 stars + 8 players; the rounds follow from the list sizes, so both verify
    ok = typeof o.seed === 'string' && ['teams', 'caps', 'stars', 'players'].every(k => strs(o[k]))
      && o.teams.length === 4 && o.caps.length === 4 && o.stars.length % 4 === 0 && o.players.length % 4 === 0
      && o.stars.length + o.players.length === 12;
  }
  if (!ok) throw new Error('formato');
  return o;
}
async function planDraw(seed, d) {
  const st = [];
  for (let c = 0; c < 64; c++) { const dv = new DataView((await sha256(`${seed}:${c}`)).buffer); for (let i = 0; i < 32; i += 4) st.push(dv.getUint32(i)); }
  let p = 0;
  const rint = n => { const lim = Math.floor(0x100000000 / n) * n; let x; do { if (p >= st.length) throw new Error('stream'); x = st[p++]; } while (x >= lim); return x % n; };
  const shuf = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  if (d.mode === 'std' || d.mode === 'bracket') {
    // one pick per team each round, team order shuffled every round; in the last
    // (partial) round the shuffle also decides which teams get the extra players
    // (for a bracket: which first-round matches stay with a single team, i.e. byes)
    const T = d.teams.length, pool = [...d.players], rounds = [];
    while (pool.length) {
      const order = shuf([...Array(T).keys()]).slice(0, Math.min(T, pool.length));
      rounds.push({ type: 'player', order, picks: order.map(ti => { const before = [...pool]; return { ti, before, name: pool.splice(rint(pool.length), 1)[0] }; }) });
    }
    const teams = d.teams.map(name => ({ name, cap: null, stars: [], players: [] }));
    rounds.forEach(r => r.picks.forEach(pk => teams[pk.ti].players.push(pk.name)));
    return { rounds, teams };
  }
  const pools = { star: [...d.stars], player: [...d.players] };
  const types = [...Array(d.stars.length / 4).fill('star'), ...Array(d.players.length / 4).fill('player')];
  const rounds = types.map(type => {
    const order = shuf([0, 1, 2, 3]);
    const picks = order.map(ti => { const pool = pools[type], before = [...pool]; return { ti, before, name: pool.splice(rint(pool.length), 1)[0] }; });
    return { type, order, picks };
  });
  const teams = d.teams.map((name, i) => ({ name, cap: d.caps[i], stars: [], players: [] }));
  rounds.forEach(r => r.picks.forEach(pk => teams[pk.ti][r.type === 'star' ? 'stars' : 'players'].push(pk.name)));
  return { rounds, teams };
}
