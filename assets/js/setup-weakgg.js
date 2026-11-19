'use strict';
// Sorteios WEAK GG — WEAK GG form (seeds + stars): fields, validation, saved names, paste lists

/* ---------- setup form ---------- */
const teamsEl = $('#teams'), starsEl = $('#stars'), playersEl = $('#players');
for (let i = 0; i < 4; i++) {
  const c = document.createElement('div');
  c.className = 'team-card reveal'; c.style.transitionDelay = (i * .08) + 's';
  c.innerHTML = `<div class="glare"></div>
    <div class="tc-head"><span class="tc-num">TIME 0${i + 1}</span><span class="tc-badge">♛ SEED ${i + 1}</span></div>
    <label class="field"><span>Nome do time</span><input data-k="team" maxlength="22" placeholder="Nome do time" autocomplete="off"></label>
    <label class="field"><span>Cabeça de chave</span><input data-k="cap" maxlength="22" placeholder="Jogador seed" autocomplete="off"></label>`;
  teamsEl.appendChild(c);
  if (finePointer) {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      c.style.transform = `rotateY(${(px - .5) * 10}deg) rotateX(${(.5 - py) * 10}deg)`;
      c.style.setProperty('--gx', px * 100 + '%'); c.style.setProperty('--gy', py * 100 + '%');
    });
    c.addEventListener('pointerleave', () => { c.style.transform = ''; });
  }
}
for (let i = 0; i < 8; i++) starsEl.insertAdjacentHTML('beforeend', `<label class="field star-field"><span>Estrela 0${i + 1}</span><input data-k="star" maxlength="22" placeholder="Nome" autocomplete="off"></label>`);
for (let i = 0; i < 4; i++) playersEl.insertAdjacentHTML('beforeend', `<label class="field"><span>Jogador 0${i + 1}</span><input data-k="player" maxlength="22" placeholder="Nome" autocomplete="off"></label>`);
$$('.team-card').forEach(c => observeReveal(c));
$$('.magnetic').forEach(magnetize);

$('#seedPanel').addEventListener('input', e => { const f = e.target.closest('.field'); if (f) f.classList.remove('err'); });
$('#seedPanel').addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
  e.preventDefault();
  const all = $$('#seedPanel input'), i = all.indexOf(e.target);
  if (i < all.length - 1) all[i + 1].focus(); else $('#startBtn').click();
});

let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3200); }

const getVals = k => $$(`#seedPanel input[data-k="${k}"]`);
function collect() {
  const inputs = $$('#seedPanel input');
  let ok = true;
  inputs.forEach(i => { i.value = i.value.trim().replace(/\s+/g, ' '); const bad = !i.value; i.closest('.field').classList.toggle('err', bad); if (bad) ok = false; });
  if (!ok) { toast('Preencha todos os campos'); inputs.find(i => !i.value).focus(); return null; }
  const check = list => {
    const seen = new Map(); let dup = false;
    list.forEach(i => { const k = i.value.toLowerCase(); if (seen.has(k)) { dup = true; i.closest('.field').classList.add('err'); seen.get(k).closest('.field').classList.add('err'); } else seen.set(k, i); });
    return dup;
  };
  if (check(getVals('team'))) { toast('Nomes de times repetidos'); return null; }
  if (check([...getVals('cap'), ...getVals('star'), ...getVals('player')])) { toast('Há jogadores com nome repetido'); return null; }
  const v = k => getVals(k).map(i => i.value);
  return { teams: v('team'), caps: v('cap'), stars: v('star'), players: v('player') };
}

const DEMO = {
  team: ['Alpha Wolves', 'Black Mamba', 'Nocturne', 'Zero Gravity'],
  cap: ['Kzk', 'Vortex', 'Shadow', 'Nyx'],
  star: ['Blaze', 'Phantom', 'Ryuu', 'Ghost', 'Lynx', 'Draco', 'Hex', 'Ozzy'],
  player: ['Kaito', 'Rift', 'Mako', 'Zion']
};
$('#demoBtn').onclick = () => {
  Object.entries(DEMO).forEach(([k, arr]) => getVals(k).forEach((i, n) => { i.value = arr[n]; i.closest('.field').classList.remove('err'); }));
  toast('Exemplo preenchido');
};
$('#clearBtn').onclick = () => {
  $$('#seedPanel input').forEach(i => { i.value = ''; i.closest('.field').classList.remove('err'); });
  try { localStorage.removeItem(STORE_KEY); } catch {}
  toast('Campos limpos');
};
$('#startBtn').onclick = () => { const data = collect(); if (data) { saveNames(); Sound.init(); runDraw(data); } };

/* ---------- remember last names (this browser only) ---------- */
const STORE_KEY = 'weakgg:names:v2'; // v1 = old 4 stars / 8 players layout
let saveT;
function saveNames() {
  const o = {}; ['team', 'cap', 'star', 'player'].forEach(k => o[k] = getVals(k).map(i => i.value));
  try { localStorage.setItem(STORE_KEY, JSON.stringify(o)); } catch {}
}
$('#seedPanel').addEventListener('input', () => { clearTimeout(saveT); saveT = setTimeout(saveNames, 300); });
$('#demoBtn').addEventListener('click', saveNames);
(function restoreNames() {
  let o = null;
  try {
    o = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    // from the old layout only teams and seeds still line up
    if (!o) { const old = JSON.parse(localStorage.getItem('weakgg:names:v1') || 'null'); if (old) o = { team: old.team, cap: old.cap }; }
  } catch {}
  if (!o) return;
  let any = false;
  ['team', 'cap', 'star', 'player'].forEach(k => getVals(k).forEach((i, n) => { const v = (o[k] || [])[n]; if (typeof v === 'string' && v) { i.value = v; any = true; } }));
  if (any) setTimeout(() => toast('Últimos nomes restaurados'), 1200);
})();

/* ---------- paste lists ---------- */
const cleanName = s => s.replace(/^\s*(?:[-*•·>]+|\d+\s*[.)\-:º°])\s*/, '').replace(/^@+/, '').replace(/\s+/g, ' ').trim().slice(0, 22);
const splitList = txt => txt.split(/\r?\n|[,;]/).map(cleanName).filter(Boolean);
const splitPair = line => { const m = line.split(/\s+[-–—|:]\s+|\s*[|]\s*/); return [cleanName(m[0] || ''), cleanName(m.slice(1).join(' ') || '')]; };
function fillGroup(k, names, from = 0) {
  const ins = getVals(k);
  names.slice(0, ins.length - from).forEach((n, j) => { const i = ins[from + j]; i.value = n; i.closest('.field').classList.remove('err'); });
}
function fillTeams(lines, from = 0) {
  const pairs = lines.map(splitPair);
  pairs.slice(0, 4 - from).forEach(([t, c], j) => {
    const ti = getVals('team')[from + j], ci = getVals('cap')[from + j];
    if (t) { ti.value = t; ti.closest('.field').classList.remove('err'); }
    if (c) { ci.value = c; ci.closest('.field').classList.remove('err'); }
  });
}
// pasting a multi-line / comma list straight into any field spreads it across that group
$('#seedPanel').addEventListener('paste', e => {
  const inp = e.target.closest('input[data-k]'); if (!inp) return;
  const txt = (e.clipboardData || window.clipboardData).getData('text');
  if (!/[\n,;]/.test(txt.trim())) return;
  e.preventDefault();
  const k = inp.dataset.k, idx = getVals(k).indexOf(inp);
  if ((k === 'team' || k === 'cap') && /\s[-–—|:]\s|\|/.test(txt)) fillTeams(txt.split(/\r?\n/).filter(l => l.trim()), idx);
  else fillGroup(k, splitList(txt), idx);
  saveNames(); toast('Lista distribuída nos campos');
});
const pasteModal = $('#pasteModal');
$('#pasteBtn').onclick = () => { pasteModal.classList.add('on'); setTimeout(() => $('#pTeams').focus(), 50); };
const closePaste = () => pasteModal.classList.remove('on');
pasteModal.addEventListener('click', e => { if (e.target === pasteModal || e.target.closest('[data-close]')) closePaste(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && pasteModal.classList.contains('on')) closePaste(); });
$('#pApply').onclick = () => {
  const t = $('#pTeams').value.split(/\r?\n/).filter(l => l.trim());
  if (t.length) fillTeams(t);
  const s = splitList($('#pStars').value); if (s.length) fillGroup('star', s);
  const p = splitList($('#pPlayers').value); if (p.length) fillGroup('player', p);
  saveNames(); closePaste();
  toast(`Aplicado: ${t.length} times · ${Math.min(4, s.length)} estrelas · ${Math.min(8, p.length)} jogadores`);
  $('#setup').scrollIntoView({ behavior: 'smooth' });
};
