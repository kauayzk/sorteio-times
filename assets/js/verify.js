'use strict';
// Sorteios WEAK GG — verify a past draw from its codes

/* ---------- verify a past draw ---------- */
$('#vBtn').onclick = async () => {
  const out = $('#vOut');
  out.classList.remove('on'); void out.offsetWidth;
  const code = $('#vCode').value.replace(/\s+/g, '');
  const want = $('#vHash').value.replace(/[^0-9a-f]/gi, '').toLowerCase();
  const show = html => { out.innerHTML = html; out.classList.add('on'); };
  if (!(window.crypto && crypto.subtle)) return show('<div class="vbig">INDISPONÍVEL</div>Abra a página por https para verificar.');
  let o;
  try { o = readCode(code); } catch { return show('<div class="vbig">✕ CÓDIGO INVÁLIDO</div>Confira se copiou o código de verificação inteiro (começa com WGG1.).'); }
  const h = toHex(await sha256(code));
  const plan = await planDraw(o.seed, o);
  let head;
  if (!want) head = '<div class="vbig">RESULTADO RECALCULADO</div>Informe também o código do sorteio mostrado no início para conferir o lacre.';
  else if (want.length >= 8 && h.startsWith(want)) { head = '<div class="vbig">✓ SORTEIO VERIFICADO</div>A impressão digital confere: os nomes e a semente são exatamente os que foram lacrados antes do sorteio.'; Sound.init(); Sound.pop(); }
  else head = '<div class="vbig">✕ NÃO CONFERE</div>O código do sorteio informado não bate com este código de verificação. Algo foi alterado — ou o código foi copiado errado.';
  show(`${head}<br><span style="color:var(--dim)">SHA-256: ${fmtHash(h)}</span>
    ${o.mode === 'bracket' ? `<div style="margin-top:14px;color:#fff">${esc(o.title || 'Chaveamento')} · ${PHASES[plan.teams.length]}</div>` : ''}
    <div class="vteams">${o.mode === 'bracket'
      ? bracketModel(plan.teams)[0].map(m => `<div><b>JOGO ${pad2(m.n)}</b>${esc(m.a.name)}<br>${m.bye ? 'folga — avança direto' : `x ${esc(m.b.name)}`}</div>`).join('')
      : plan.teams.map(t => `<div><b>${esc(t.name)}</b>${[
      ...(t.cap ? [`C · ${esc(t.cap)}`] : []), ...t.stars.map(s => `★ · ${esc(s)}`), ...t.players.map(p => `• · ${esc(p)}`)
    ].join('<br>')}</div>`).join('')}</div>`);
};
(function prefillVerify() {
  // opening …#verificar?c=WGG1.…&h=… pre-fills the form
  const m = location.hash.match(/^#verificar\?(.*)$/);
  if (!m) return;
  const q = new URLSearchParams(m[1]);
  if (q.get('c')) $('#vCode').value = q.get('c');
  if (q.get('h')) $('#vHash').value = q.get('h');
  setTimeout(() => { $('#verificar').scrollIntoView(); if (q.get('c')) $('#vBtn').click(); }, 400);
})();
