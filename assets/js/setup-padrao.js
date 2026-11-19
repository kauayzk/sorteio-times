'use strict';
// Sorteios WEAK GG — mode tabs + standard draw form (2-8 teams)

/* ---------- mode tabs ---------- */
const TAB_KEY = 'weakgg:tab';
function setTab(t, animate = true) {
  $$('.tab').forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  const panels = { seed: '#seedPanel', std: '#stdPanel', bracket: '#bracketPanel' };
  if (!panels[t]) t = 'seed';
  Object.entries(panels).forEach(([k, sel]) => { $(sel).hidden = k !== t; });
  const show = $(panels[t]);
  if (animate && !reduced) { show.classList.remove('enter'); void show.offsetWidth; show.classList.add('enter'); }
  $$('.reveal', show).forEach(el => observeReveal(el));
  try { localStorage.setItem(TAB_KEY, t); } catch {}
}
$$('.tab').forEach(b => b.onclick = () => { if (!b.classList.contains('on')) { Sound.init(); Sound.whoosh(); setTab(b.dataset.tab); } });

/* ---------- standard draw: any number of names split across 2–8 teams ---------- */
const STD_KEY = 'weakgg:std:v1', STD_MAX = 64;
const std = { n: 2 };
const stdTeamInputs = () => $$('#stdTeams input');
$('#stdCount').innerHTML = [2, 3, 4, 5, 6, 7, 8].map(n => `<button class="count-btn" type="button" data-n="${n}">${n}</button>`).join('');
function setStdCount(n, names) {
  const keep = names || stdTeamInputs().map(i => i.value);
  std.n = n;
  $$('#stdCount .count-btn').forEach(b => b.classList.toggle('on', +b.dataset.n === n));
  $('#stdCountLbl').textContent = `${n} TIMES`;
  $('#stdTeams').innerHTML = Array.from({ length: n }, (_, i) =>
    `<label class="field"><span>Time ${pad2(i + 1)}</span><input maxlength="22" placeholder="TIME ${pad2(i + 1)}" autocomplete="off" value="${esc(keep[i] || '')}"></label>`).join('');
  updateStdSplit();
}
const stdNames = () => splitList($('#stdPlayers').value);
function updateStdSplit() {
  const N = stdNames().length, T = std.n, el = $('#stdSplit');
  $('#stdNum').textContent = `${N} ${N === 1 ? 'NOME' : 'NOMES'}`;
  if (N > STD_MAX) { el.innerHTML = `Máximo de <b>${STD_MAX}</b> nomes por sorteio.`; return; }
  if (N < T) { el.innerHTML = N ? `Faltam <b>${T - N}</b> ${T - N > 1 ? 'nomes' : 'nome'} para ter pelo menos 1 por time.` : 'Cole ou digite os nomes dos jogadores.'; return; }
  const base = Math.floor(N / T), extra = N % T;
  el.innerHTML = extra
    ? `<b>${extra}</b> ${extra > 1 ? 'times' : 'time'} com <b>${base + 1}</b> e <b>${T - extra}</b> com <b>${base}</b> — quem fica com o jogador a mais também é sorteado.`
    : `<b>${T}</b> times de <b>${base}</b> ${base > 1 ? 'jogadores' : 'jogador'}.`;
}
function saveStd() {
  try { localStorage.setItem(STD_KEY, JSON.stringify({ n: std.n, teams: stdTeamInputs().map(i => i.value), players: $('#stdPlayers').value })); } catch {}
}
let stdSaveT;
$('#stdPanel').addEventListener('input', e => {
  const f = e.target.closest('.field'); if (f) f.classList.remove('err');
  if (e.target.id === 'stdPlayers') updateStdSplit();
  clearTimeout(stdSaveT); stdSaveT = setTimeout(saveStd, 300);
});
$('#stdCount').addEventListener('click', e => {
  const b = e.target.closest('.count-btn'); if (!b) return;
  Sound.init(); Sound.pop();
  setStdCount(+b.dataset.n); saveStd();
});
function collectStd() {
  const names = stdNames(), T = std.n, area = $('#stdPlayers').closest('.field');
  const fail = msg => { area.classList.add('err'); toast(msg); $('#stdPlayers').focus(); return null; };
  if (names.length < T) return fail(`Coloque pelo menos ${T} nomes (1 por time)`);
  if (names.length > STD_MAX) return fail(`Máximo de ${STD_MAX} nomes`);
  const seen = new Set();
  for (const n of names) { const k = n.toLowerCase(); if (seen.has(k)) return fail(`Nome repetido: ${n}`); seen.add(k); }
  const teams = stdTeamInputs().map((i, n) => i.value.trim().replace(/\s+/g, ' ') || `TIME ${pad2(n + 1)}`);
  const tseen = new Set();
  for (const t of teams) { const k = t.toLowerCase(); if (tseen.has(k)) { toast(`Nome de time repetido: ${t}`); return null; } tseen.add(k); }
  return { mode: 'std', teams, players: names };
}
$('#stdStart').onclick = () => { const data = collectStd(); if (data) { saveStd(); Sound.init(); runDraw(data); } };
$('#stdDemo').onclick = () => {
  $('#stdPlayers').value = ['Kzk', 'Vortex', 'Shadow', 'Nyx', 'Blaze', 'Phantom', 'Ryuu', 'Ghost', 'Lynx', 'Draco', 'Hex', 'Ozzy', 'Kaito', 'Rift'].join('\n');
  $('#stdPlayers').closest('.field').classList.remove('err');
  setStdCount(4, []); saveStd(); toast('Exemplo preenchido');
};
$('#stdClear').onclick = () => {
  $('#stdPlayers').value = ''; setStdCount(std.n, []);
  try { localStorage.removeItem(STD_KEY); } catch {}
  toast('Campos limpos');
};
(function restoreStd() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(STD_KEY) || 'null'); } catch {}
  if (o && typeof o.players === 'string') $('#stdPlayers').value = o.players;
  setStdCount(o && o.n >= 2 && o.n <= 8 ? o.n : 2, o && Array.isArray(o.teams) ? o.teams : []);
  let t = 'seed';
  try { t = localStorage.getItem(TAB_KEY) || 'seed'; } catch {}
  setTab(t, false);
})();
