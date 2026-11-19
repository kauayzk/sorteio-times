'use strict';
// Sorteios WEAK GG — result image (canvas to PNG): download / copy

/* ---------- result image (canvas → PNG) ---------- */
async function renderImage(S) {
  try { await document.fonts.ready; } catch {}
  if (S.bracket) return renderBracketImage(S);
  // layout grows with the draw: up to 4 cards per row, card height from the longest roster
  const rosters = S.teams.map(t => [
    ...(t.cap ? [['C', 'CABEÇA DE CHAVE', t.cap]] : []),
    ...t.stars.map(s => ['★', 'ESTRELA', s]),
    ...t.players.map((p, j) => [String((t.cap ? 1 : 0) + t.stars.length + j + 1), 'JOGADOR', p])
  ]);
  const T = S.teams.length, cols = Math.min(T, 4), rowsN = Math.ceil(T / cols);
  const maxE = Math.max(...rosters.map(r => r.length));
  const rowH = maxE <= 4 ? 80 : maxE <= 8 ? 62 : 48, compact = rowH < 62;
  const pad = 60, gap = 24, top = 285, ch = 152 + maxE * rowH + 8;
  const W = 1600, H = top + rowsN * ch + (rowsN - 1) * gap + 135;
  const { c, x, sp, glow, flat, fit, D, M } = imageBase(W, H, S, `TIMES DEFINIDOS · ${S.when}`);

  const cw = (W - pad * 2 - gap * (cols - 1)) / cols;
  S.teams.forEach((t, i) => {
    const row = Math.floor(i / cols), inRow = Math.min(cols, T - row * cols); // short last row is centred
    const cx = pad + (cols - inRow) * (cw + gap) / 2 + (i % cols) * (cw + gap), cy = top + row * (ch + gap);
    x.fillStyle = 'rgba(255,255,255,.03)'; x.fillRect(cx, cy, cw, ch);
    glow(22); x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(cx, cy, cw, ch); flat();
    x.textAlign = 'left'; sp(5); x.font = `600 14px ${M}`; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillText(`TIME ${pad2(i + 1)}`, cx + 24, cy + 44);
    sp(0); x.fillStyle = '#fff'; fit(t.name, `900 {s}px ${D}`, 32, cw - 48); glow(14); x.fillText(t.name, cx + 24, cy + 96); flat();
    x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(cx + 24, cy + 124, cw - 48, 1);
    rosters[i].forEach(([ic, lab, nm], r) => {
      const ry = cy + 152 + r * rowH, bs = compact ? 30 : 36;
      x.fillStyle = '#fff'; glow(10); x.fillRect(cx + 24, ry, bs, bs); flat();
      x.fillStyle = '#000'; x.textAlign = 'center'; sp(0); x.font = `800 ${compact ? 15 : 18}px ${M}`; x.fillText(ic, cx + 24 + bs / 2, ry + bs * .69);
      x.textAlign = 'left';
      if (!compact) { sp(4); x.fillStyle = 'rgba(255,255,255,.5)'; x.font = `400 11px ${M}`; x.fillText(lab, cx + 76, ry + 11); }
      sp(0); x.fillStyle = '#fff'; fit(nm || '', `600 {s}px ${M}`, compact ? 20 : 24, cw - 100); if (ic === '★') glow(12);
      x.fillText(nm || '', cx + (compact ? 68 : 76), ry + (compact ? 22 : 38)); flat();
    });
  });
  return c;
}
// shared look for every exported image: background, WEAK GG header, code + credit footer
function imageBase(W, H, S, subtitle) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const D = "'Unbounded','Arial Black',sans-serif", M = "'JetBrains Mono',Consolas,monospace";
  const sp = px => { if ('letterSpacing' in x) x.letterSpacing = px + 'px'; };
  const glow = b => { x.shadowColor = 'rgba(255,255,255,.85)'; x.shadowBlur = b; };
  const flat = () => { x.shadowBlur = 0; };
  const fit = (txt, font, size, maxW) => { let s = size; do { x.font = font.replace('{s}', s); } while (x.measureText(txt).width > maxW && --s > 9); };

  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W / 2, Math.min(H * .3, 400), 0, W / 2, Math.min(H * .3, 400), W * .6);
  g.addColorStop(0, 'rgba(255,255,255,.1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 260 * Math.max(1, W * H / 1440000); i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .35})`; x.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
  x.fillStyle = 'rgba(255,255,255,.025)'; for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);

  x.textAlign = 'center'; x.fillStyle = '#fff';
  sp(18); x.font = `300 26px ${D}`; glow(10); x.fillText('SORTEIOS', W / 2, 92);
  sp(0); x.font = `900 104px ${D}`; glow(34); x.fillText('WEAK GG', W / 2, 198); glow(8); x.fillText('WEAK GG', W / 2, 198); flat();
  sp(6); x.font = `400 16px ${M}`; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillText(subtitle, W / 2, 240);

  const pad = 60;
  x.textAlign = 'left'; sp(3); x.font = `400 13px ${M}`; x.fillStyle = 'rgba(255,255,255,.45)';
  x.fillText(`CÓDIGO DO SORTEIO #${fmtHash(S.hash.slice(0, 16))}`, pad, H - 46);
  x.textAlign = 'right'; sp(8); x.font = `300 18px ${D}`; x.fillStyle = '#fff'; glow(10); x.fillText('CREATION OF KZK', W - pad, H - 44); flat();
  sp(0); x.textAlign = 'left';
  return { c, x, sp, glow, flat, fit, D, M };
}
// bracket image: same column layout as the page (halves meeting at the final)
function renderBracketImage(S) {
  const rounds = bracketModel(S.teams, S.results), cols = bracketColumns(rounds);
  const colW = 250, gapX = 54, cardH = 76, head = 44;
  const k0 = Math.max(...cols.map(col => col.items.length));
  const colH = Math.max(k0 * (cardH + 30), 240);
  const contentW = cols.length * colW + (cols.length - 1) * gapX;
  const W = Math.max(1600, contentW + 160), x0 = (W - contentW) / 2;
  const top = S.data.title ? 330 : 290, H = top + head + colH + 210;
  const { c, x, sp, glow, flat, fit, D, M } = imageBase(W, H, S, `CHAVEAMENTO · ${S.when}`);
  if (S.data.title) { x.textAlign = 'center'; sp(10); x.fillStyle = '#fff'; fit(S.data.title.toUpperCase(), `800 {s}px ${D}`, 26, W - 200); glow(10); x.fillText(S.data.title.toUpperCase(), W / 2, 288); flat(); sp(0); }

  const pos = {};
  cols.forEach((col, ci) => {
    const cx = x0 + ci * (colW + gapX);
    x.textAlign = 'center'; sp(5); x.font = `400 12px ${M}`; x.fillStyle = col.final ? '#fff' : 'rgba(255,255,255,.55)';
    x.fillText(PHASES[rounds[col.r].length], cx + colW / 2, top + 16); sp(0);
    col.items.forEach(({ r, i }, j) => {
      const cy = top + head + (2 * j + 1) / (2 * col.items.length) * colH - cardH / 2;
      pos[`${r}-${i}`] = { l: cx, r: cx + colW, y: cy + cardH / 2, top: cy };
    });
  });
  // connectors first so the cards sit on top
  x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1.5; glow(6);
  for (let r = 1; r < rounds.length; r++) rounds[r].forEach((_, i) => {
    const T = pos[`${r}-${i}`];
    [2 * i, 2 * i + 1].forEach(fi => {
      const F = pos[`${r - 1}-${fi}`], left = F.l < T.l;
      const sx = left ? F.r : F.l, ex = left ? T.l : T.r, mx = (sx + ex) / 2;
      x.beginPath(); x.moveTo(sx, F.y); x.lineTo(mx, F.y); x.lineTo(mx, T.y); x.lineTo(ex, T.y); x.stroke();
    });
  });
  flat();
  cols.forEach(col => col.items.forEach(({ m, r, i }) => {
    const p = pos[`${r}-${i}`], fin = col.final;
    x.fillStyle = '#000'; x.fillRect(p.l, p.top, colW, cardH);
    if (fin) glow(22);
    x.strokeStyle = fin ? '#fff' : 'rgba(255,255,255,.35)'; x.lineWidth = fin ? 2 : 1; x.strokeRect(p.l, p.top, colW, cardH); flat();
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(p.l + 1, p.top + cardH / 2, colW - 2, 1);
    const label = () => { // drawn last so a winner's highlight never covers it
      x.fillStyle = '#000'; x.fillRect(p.l + 10, p.top - 8, 70, 14);
      x.textAlign = 'left'; sp(3); x.font = `400 10px ${M}`; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillText(`JOGO ${pad2(m.n)}`, p.l + 16, p.top + 3); sp(0);
    };
    const decided = !m.bye && m.winner;
    x.textAlign = 'left';
    [m.a, m.b].forEach((s, k) => {
      const ty = p.top + (k ? cardH * .75 : cardH * .25) + 6;
      const txt = s.name || (s.bye ? 'FOLGA' : s.tbd);
      const won = decided && s.name === m.winner, lost = decided && !won;
      if (won) { glow(12); x.fillStyle = '#fff'; x.fillRect(p.l + 1, p.top + (k ? cardH / 2 : 0) + 1, colW - 2, cardH / 2 - 1); flat(); }
      x.fillStyle = won ? '#000' : s.name && !lost ? '#fff' : 'rgba(255,255,255,.35)';
      fit(txt, s.name ? `600 {s}px ${M}` : `400 {s}px ${M}`, s.name ? 17 : 13, colW - 46);
      if (s.adv && !decided) glow(8);
      x.fillText(txt, p.l + 14, ty); flat();
      if (won) { x.textAlign = 'right'; x.fillText('✓', p.l + colW - 12, ty); x.textAlign = 'left'; }
      if (lost) { const w = x.measureText(txt).width; x.fillRect(p.l + 14, ty - 5, w, 1.5); }
    });
    label();
  }));
  // champion box under the final
  const f = pos[`${rounds.length - 1}-0`], champ = rounds[rounds.length - 1][0].winner;
  x.setLineDash(champ ? [] : [6, 5]); x.strokeStyle = champ ? '#fff' : 'rgba(255,255,255,.45)'; if (champ) glow(18);
  x.strokeRect(f.l + 20, f.top + cardH + 30, colW - 40, 70); x.setLineDash([]); flat();
  x.textAlign = 'center'; x.fillStyle = '#fff'; fit(champ || '???', `900 {s}px ${D}`, 24, colW - 60); glow(14); x.fillText(champ || '???', f.l + colW / 2, f.top + cardH + 64); flat();
  sp(5); x.font = `400 11px ${M}`; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillText('CAMPEÃO', f.l + colW / 2, f.top + cardH + 86); sp(0);
  return c;
}
const imgBlob = async () => { const c = await renderImage(current); return new Promise(r => c.toBlob(r, 'image/png')); };
const imgName = () => `weak-gg-sorteio-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.png`;
$('#imgBtn').onclick = async () => {
  if (!current || !current.hash) return;
  const blob = await imgBlob();
  const file = new File([blob], imgName(), { type: 'image/png' });
  if (!finePointer && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Sorteios WEAK GG' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Imagem baixada');
};
if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) $('#imgCopyBtn').style.display = 'none';
$('#imgCopyBtn').onclick = async () => {
  if (!current || !current.hash) return;
  try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': imgBlob() })]); toast('Imagem copiada — é só colar no Discord'); }
  catch { toast('Este navegador não copia imagem — use Baixar imagem'); }
};
