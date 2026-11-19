'use strict';
// Sorteios WEAK GG — stage buttons and keys: reveal, speed, auto, sound, exit, copy, fullscreen

/* ---------- stage controls ---------- */
revealBtn.onclick = triggerReveal;
magnetize(revealBtn);
addEventListener('keydown', e => {
  if (!stage.classList.contains('on')) return;
  if ((e.code === 'Space' || e.key === 'Enter') && !e.target.closest('button, summary')) { e.preventDefault(); triggerReveal(); }
  if (e.key === 'Escape') $('#exitBtn').click();
});
const speedBtn = $('#speedBtn');
const showSpeed = () => { speedBtn.textContent = `${String(speed).replace('.', ',')}x`; speedBtn.classList.toggle('on', speed > 1); };
const cycleSpeed = () => {
  speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
  try { localStorage.setItem('weakgg:speed', speed); } catch {}
  showSpeed(); Sound.init(); Sound.tick();
  toast(speed > 1 ? `Sorteio ${String(speed).replace('.', ',')}x mais rápido` : 'Velocidade normal');
};
speedBtn.onclick = cycleSpeed;
addEventListener('keydown', e => { if (stage.classList.contains('on') && (e.key === 'v' || e.key === 'V') && !e.target.closest('input,textarea')) cycleSpeed(); });
showSpeed();
$('#autoBtn').onclick = e => {
  autoMode = !autoMode; e.currentTarget.classList.toggle('on', autoMode);
  toast(autoMode ? 'Modo automático ligado' : 'Modo automático desligado');
  if (autoMode && current && current.resolveReveal) current.autoT = setTimeout(triggerReveal, T(800));
  if (!autoMode && current) clearTimeout(current.autoT);
};
$('#soundBtn').onclick = e => { Sound.on = !Sound.on; Sound.init(); e.currentTarget.classList.toggle('on', Sound.on); };
$('#exitBtn').onclick = () => {
  const S = current;
  if (S && !stage.classList.contains('done') && !confirm('Cancelar o sorteio em andamento?')) return;
  if (S) { S.aborted = true; clearTimeout(S.autoT); if (S.rejectReveal) { const r = S.rejectReveal; S.resolveReveal = S.rejectReveal = null; r(ABORT); } }
  if (S) setTab(S.bracket ? 'bracket' : S.std ? 'std' : 'seed', false); // come back to the form this draw came from
  current = null;
  closeStage();
  $('#setup').scrollIntoView();
};
$('#editBtn').onclick = () => { $('#exitBtn').click(); };
$('#againBtn').onclick = () => { const d = current && current.data; if (d) runDraw(d); };
$('#copyBtn').onclick = async () => {
  const S = current; if (!S) return;
  const lines = [`SORTEIOS WEAK GG${S.bracket ? ' · CONFRONTOS' : ''} — ${S.when}`, ''];
  if (S.bracket) {
    if (S.data.title) lines.splice(1, 0, S.data.title.toUpperCase());
    const side = s => s.name || s.tbd;
    const rounds = bracketModel(S.teams, S.results);
    rounds.forEach(round => {
      lines.push(PHASES[round.length]);
      round.forEach(m => lines.push(m.bye ? `  J${pad2(m.n)}  ${m.a.name} avança direto (folga)`
        : `  J${pad2(m.n)}  ${side(m.a)} x ${side(m.b)}${m.winner ? `  → venceu ${m.winner}` : ''}`));
      lines.push('');
    });
    const champ = rounds[rounds.length - 1][0].winner;
    if (champ) lines.push(`🏆 CAMPEÃO: ${champ}`, '');
  } else S.teams.forEach((t, i) => {
    const label = `TIME ${pad2(i + 1)}`;
    lines.push(t.name === label ? label : `${label} · ${t.name}`);
    if (t.cap) lines.push(`  ♛ ${t.cap} (cabeça de chave)`);
    t.stars.forEach(s => lines.push(`  ★ ${s} (estrela)`));
    t.players.forEach(p => lines.push(`  • ${p}`));
    lines.push('');
  });
  lines.push(`Código do sorteio: ${fmtHash(S.hash)}`);
  lines.push(`Verificação: ${S.code}`);
  lines.push(`Conferir: ${location.origin}${location.pathname}#verificar?c=${S.code}`);
  lines.push('');
  lines.push('Creation of KZK');
  const text = lines.join('\n');
  try { await navigator.clipboard.writeText(text); toast('Resultado copiado'); }
  catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('Resultado copiado'); }
};
$('#hashChip').onclick = async () => {
  if (!current || !current.hash) return;
  try { await navigator.clipboard.writeText(fmtHash(current.hash)); toast('Código do sorteio copiado'); } catch {}
};
/* ---------- fullscreen / broadcast mode ---------- */
const fsBtn = $('#fsBtn');
if (!document.fullscreenEnabled) fsBtn.style.display = 'none';
const toggleFs = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => toast('Tela cheia indisponível'));
};
fsBtn.onclick = toggleFs;
let idleT;
let idle = false;
function bumpIdle() {
  // runs on every pointermove: only touch classes when something actually changes
  if (!idle && !stage.classList.contains('fs')) return;
  if (idle) { idle = false; stage.classList.remove('idle'); document.body.classList.remove('fsidle'); }
  clearTimeout(idleT);
  if (stage.classList.contains('fs')) idleT = setTimeout(() => { idle = true; stage.classList.add('idle'); document.body.classList.add('fsidle'); }, 2500);
}
document.addEventListener('fullscreenchange', () => {
  const on = !!document.fullscreenElement;
  fsBtn.classList.toggle('on', on); stage.classList.toggle('fs', on);
  if (!on) { idle = false; clearTimeout(idleT); stage.classList.remove('idle'); document.body.classList.remove('fsidle'); }
  bumpIdle();
});
addEventListener('pointermove', bumpIdle, { passive: true });
addEventListener('keydown', e => { if (stage.classList.contains('on') && (e.key === 'f' || e.key === 'F') && !e.target.closest('input,textarea')) toggleFs(); });
