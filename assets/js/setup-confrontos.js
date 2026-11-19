'use strict';
// Sorteios WEAK GG — bracket form (2-32 teams)

/* ---------- bracket draw: teams drawn into the first-round slots, byes when not a power of two ---------- */
const BR_KEY = 'weakgg:bracket:v1', BR_MAX = 32;
const PHASES = { 1: 'FINAL', 2: 'SEMIFINAL', 4: 'QUARTAS DE FINAL', 8: 'OITAVAS DE FINAL', 16: '16-AVOS DE FINAL' };
const brSize = n => { let b = 2; while (b < n) b *= 2; return b; };
const brNames = () => splitList($('#brTeams').value);
function updateBrSplit() {
  const N = brNames().length, el = $('#brSplit');
  $('#brNum').textContent = `${N} ${N === 1 ? 'TIME' : 'TIMES'}`;
  if (N > BR_MAX) { el.innerHTML = `Máximo de <b>${BR_MAX}</b> times.`; return; }
  if (N < 2) { el.innerHTML = N ? 'Coloque pelo menos <b>2</b> times.' : 'Cole ou digite os nomes dos times.'; return; }
  const B = brSize(N), M = B / 2, byes = B - N, games = M - byes;
  el.innerHTML = `1ª fase: <b>${PHASES[M].toLowerCase()}</b> · <b>${games}</b> ${games > 1 ? 'jogos' : 'jogo'}`
    + (byes ? ` e <b>${byes}</b> ${byes > 1 ? 'times avançam' : 'time avança'} de folga.` : '.');
}
function saveBr() {
  try { localStorage.setItem(BR_KEY, JSON.stringify({ teams: $('#brTeams').value, title: $('#brTitle').value })); } catch {}
}
let brSaveT;
$('#bracketPanel').addEventListener('input', e => {
  const f = e.target.closest('.field'); if (f) f.classList.remove('err');
  if (e.target.id === 'brTeams') updateBrSplit();
  clearTimeout(brSaveT); brSaveT = setTimeout(saveBr, 300);
});
function collectBr() {
  const names = brNames(), area = $('#brTeams').closest('.field');
  const fail = msg => { area.classList.add('err'); toast(msg); $('#brTeams').focus(); return null; };
  if (names.length < 2) return fail('Coloque pelo menos 2 times');
  if (names.length > BR_MAX) return fail(`Máximo de ${BR_MAX} times`);
  const seen = new Set();
  for (const n of names) { const k = n.toLowerCase(); if (seen.has(k)) return fail(`Time repetido: ${n}`); seen.add(k); }
  const M = brSize(names.length) / 2;
  // each first-round match is a "board" that receives up to two teams
  return { mode: 'bracket', title: $('#brTitle').value.trim().replace(/\s+/g, ' '), teams: Array.from({ length: M }, (_, i) => `JOGO ${pad2(i + 1)}`), players: names };
}
$('#brStart').onclick = () => { const data = collectBr(); if (data) { saveBr(); Sound.init(); runDraw(data); } };
$('#brDemo').onclick = () => {
  $('#brTeams').value = ['Alpha Wolves', 'Black Mamba', 'Nocturne', 'Zero Gravity', 'Red Vipers', 'Iron Ghosts', 'Night Owls', 'Storm Riders', 'Phoenix', 'Kraken'].join('\n');
  $('#brTitle').value = 'Copa WEAK GG';
  $('#brTeams').closest('.field').classList.remove('err');
  updateBrSplit(); saveBr(); toast('Exemplo preenchido');
};
$('#brClear').onclick = () => {
  $('#brTeams').value = ''; $('#brTitle').value = ''; updateBrSplit();
  try { localStorage.removeItem(BR_KEY); } catch {}
  toast('Campos limpos');
};
(function restoreBr() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(BR_KEY) || 'null'); } catch {}
  if (o) { if (typeof o.teams === 'string') $('#brTeams').value = o.teams; if (typeof o.title === 'string') $('#brTitle').value = o.title; }
  updateBrSplit();
})();
