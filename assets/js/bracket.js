'use strict';
// Sorteios WEAK GG — bracket view: model, layout, lines, clicking winners, saved bracket

/* ---------- bracket view ----------
   rounds[0] = the drawn first-round matches (a match with one team is a bye);
   each later match is fed by matches 2i and 2i+1 of the previous round.
   results maps "round-index" → winner name (clicked by the user); a result only counts while
   that team is still in the match, so changing an earlier winner clears what depended on it.
   Shown as two halves meeting at the final in the middle. */
function bracketModel(teams, results = {}) {
  const settle = (m, key) => {
    const w = results[key];
    // a result stands only while both teams of the match are known and the winner is one of them
    m.winner = m.bye ? m.a.name : w && m.a.name && m.b.name && (w === m.a.name || w === m.b.name) ? w : null;
  };
  const first = teams.map((t, i) => ({ n: i + 1, a: { name: t.players[0] }, b: t.players[1] ? { name: t.players[1] } : { bye: true }, bye: t.players.length < 2 }));
  first.forEach((m, i) => settle(m, `0-${i}`));
  const rounds = [first];
  let n = first.length;
  const from = f => f.winner ? { name: f.winner, adv: true } : { tbd: `Vencedor J${pad2(f.n)}` };
  while (rounds[rounds.length - 1].length > 1) {
    const prev = rounds[rounds.length - 1], cur = [], r = rounds.length;
    for (let i = 0; i < prev.length; i += 2) {
      const m = { n: ++n, a: from(prev[i]), b: from(prev[i + 1]) };
      settle(m, `${r}-${cur.length}`); cur.push(m);
    }
    rounds.push(cur);
  }
  return rounds;
}
// columns left → right: left halves of each round, the final, then right halves in reverse
function bracketColumns(rounds) {
  const R = rounds.length, cols = [];
  const half = (r, right) => { const h = rounds[r].length / 2; return rounds[r].map((m, i) => ({ m, r, i })).slice(right ? h : 0, right ? undefined : h); };
  for (let r = 0; r < R - 1; r++) cols.push({ r, items: half(r, false) });
  cols.push({ r: R - 1, items: [{ m: rounds[R - 1][0], r: R - 1, i: 0 }], final: true });
  for (let r = R - 2; r >= 0; r--) cols.push({ r, items: half(r, true) });
  return cols;
}
function renderBracket(S) {
  const rounds = bracketModel(S.teams, S.results), cols = bracketColumns(rounds);
  const slot = k => `<div class="br-t" data-side="${k}"></div>`;
  const wrap = $('#bracketWrap');
  wrap.innerHTML = (S.data.title ? `<div class="br-title">${esc(S.data.title)}</div>` : '') +
    '<p class="br-hint">Clique no vencedor de cada jogo para avançar · clique de novo para desfazer</p>' +
    `<div class="bracket" id="bracket"><svg class="br-lines" id="brLines"></svg>${cols.map((c, ci) => `
      <div class="br-col${c.final ? ' final' : ''}">
        <div class="br-head">${PHASES[rounds[c.r].length]}</div>
        <div class="br-matches">${c.items.map(({ m, r, i }) => `
          <div class="br-m" data-r="${r}" data-i="${i}" style="animation-delay:${Math.min(ci, cols.length - 1 - ci) * 140 + i * 40}ms">
            <div class="br-n">JOGO ${pad2(m.n)}</div>${slot('a')}${slot('b')}
          </div>`).join('')}
          ${c.final ? '<div class="br-champ"><b>???</b><span>CAMPEÃO</span></div>' : ''}
        </div>
      </div>`).join('')}</div>`;
  paintBracket(S);
  fitBracket(cols.length);
  $$('.br-m', wrap).forEach(m => m.classList.add('in'));
  const champ = $('.br-champ', wrap);
  if (champ) { champ.style.animationDelay = (cols.length / 2) * 140 + 300 + 'ms'; champ.classList.add('in'); }
  requestAnimationFrame(() => drawBracketLines(rounds, true));
}
// fills every slot from the current results (names, who won, what is clickable, the champion)
function paintBracket(S) {
  const rounds = bracketModel(S.teams, S.results);
  rounds.forEach((round, r) => round.forEach((m, i) => {
    const card = $(`#bracket .br-m[data-r="${r}"][data-i="${i}"]`); if (!card) return;
    const playable = !m.bye && m.a.name && m.b.name, decided = playable && m.winner;
    card.classList.toggle('decided', !!decided);
    ['a', 'b'].forEach(k => {
      const s = m[k], el = $(`[data-side="${k}"]`, card);
      el.textContent = s.name || (s.bye ? 'FOLGA' : s.tbd);
      el.className = 'br-t' + (s.name ? '' : s.bye ? ' bye' : ' tbd') + (s.adv && !decided ? ' adv' : '')
        + (playable ? ' pick' : '') + (decided ? (s.name === m.winner ? ' win' : ' lose') : '');
      el.title = playable ? (s.name === m.winner ? 'Clique para desfazer' : `${s.name} venceu`) : '';
    });
  }));
  const champ = $('#bracketWrap .br-champ'), fin = rounds[rounds.length - 1][0];
  if (champ) { champ.classList.toggle('has', !!fin.winner); $('b', champ).textContent = fin.winner || '???'; }
  return rounds;
}
// drop results that no longer apply (their team left the match after an earlier result changed)
function pruneResults(S) {
  const rounds = bracketModel(S.teams, S.results);
  Object.keys(S.results).forEach(key => {
    const [r, i] = key.split('-').map(Number), m = rounds[r] && rounds[r][i];
    if (!m || m.winner !== S.results[key]) delete S.results[key];
  });
}
const LAST_BR_KEY = 'weakgg:lastBracket';
function saveBracket(S) {
  try { localStorage.setItem(LAST_BR_KEY, JSON.stringify({ code: S.code, when: S.when, results: S.results || {} })); } catch {}
  refreshLastBracket();
}
function refreshLastBracket() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(LAST_BR_KEY) || 'null'); } catch {}
  const b = $('#brLast');
  b.hidden = !o;
  if (o) b.textContent = `Abrir último chaveamento${o.when ? ` (${o.when})` : ''}`;
}
// reopen the saved bracket (with its results) straight on the final screen; the draw itself is
// rebuilt from the verification code, so it is exactly the one that was sealed
async function openSavedBracket() {
  let o = null, d;
  try { o = JSON.parse(localStorage.getItem(LAST_BR_KEY) || 'null'); } catch {}
  if (!o) return;
  if (!(window.crypto && crypto.subtle)) { toast('Abra a página por https para abrir o chaveamento'); return; }
  try { d = readCode(o.code); if (d.mode !== 'bracket') throw 0; } catch { toast('Chaveamento salvo inválido'); return; }
  const plan = await planDraw(d.seed, d);
  if (current) current.aborted = true;
  const S = {
    data: d, aborted: false, done: 0, log: [], std: true, bracket: true, plan, teams: plan.teams,
    starPool: [], playerPool: [], code: o.code, hash: toHex(await sha256(o.code)), when: o.when || '', results: o.results || {}
  };
  S.total = plan.rounds.reduce((n, r) => n + r.picks.length, 0); S.done = S.total;
  current = S;
  pruneResults(S);
  openStage();
  stage.classList.add('is-bracket', 'done');
  $('#boards').innerHTML = ''; $('#logList').innerHTML = '';
  $('#stRound').textContent = 'CHAVEAMENTO'; setProgress(S);
  $('#hashChip').textContent = '#' + S.hash.slice(0, 8).toUpperCase();
  fillFinalHead(S);
  renderBracket(S);
}
$('#bracketWrap').addEventListener('click', e => {
  const el = e.target.closest('.br-t.pick'), S = current;
  if (!el || !S || !S.bracket) return;
  const card = el.closest('.br-m'), key = `${card.dataset.r}-${card.dataset.i}`, name = el.textContent;
  S.results = S.results || {};
  const champBefore = bracketModel(S.teams, S.results).at(-1)[0].winner;
  if (S.results[key] === name) delete S.results[key]; else S.results[key] = name;
  pruneResults(S);
  const champ = paintBracket(S).at(-1)[0].winner;
  saveBracket(S);
  Sound.init();
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, 26, 5);
  if (champ && champ !== champBefore) {
    const box = $('#bracketWrap .br-champ').getBoundingClientRect();
    Sound.fanfare(); flash(.5);
    burst(box.left + box.width / 2, box.top + box.height / 2, 140, 12);
    shockwave(box.left + box.width / 2, box.top + box.height / 2, 1200);
    toast(`${champ} é o campeão!`);
  } else Sound.pop();
});
$('#brLast').onclick = () => { Sound.init(); openSavedBracket(); };
refreshLastBracket();
// shrink columns/gaps to fit the screen (down to a readable minimum); past that the bracket scrolls sideways
function fitBracket(n) {
  const wrap = $('#bracketWrap'), br = $('#bracket'); if (!br) return;
  const avail = wrap.clientWidth - 44;
  const gap = Math.max(22, Math.min(44, (avail - n * 200) / Math.max(1, n - 1)));
  const col = Math.max(150, Math.min(200, (avail - gap * (n - 1)) / n));
  br.style.setProperty('--br-gap', gap + 'px'); br.style.setProperty('--br-col', col + 'px');
}
function drawBracketLines(rounds, animate) {
  const br = $('#bracket'), svg = $('#brLines');
  if (!br || !svg) return;
  // layout boxes (offset*), not getBoundingClientRect: the cards are still sliding in when this runs
  const rect = (r, i) => {
    const el = $(`.br-m[data-r="${r}"][data-i="${i}"]`, br);
    return el && { left: el.offsetLeft, top: el.offsetTop, right: el.offsetLeft + el.offsetWidth, height: el.offsetHeight };
  };
  let paths = '';
  for (let r = 1; r < rounds.length; r++) {
    rounds[r].forEach((_, i) => {
      const T = rect(r, i);
      [2 * i, 2 * i + 1].forEach(fi => {
        const F = rect(r - 1, fi); if (!F || !T) return;
        const leftSide = F.left < T.left;
        const sx = leftSide ? F.right : F.left, sy = F.top + F.height / 2;
        const ex = leftSide ? T.left : T.right, ey = T.top + T.height / 2;
        const mx = (sx + ex) / 2;
        paths += `<path data-r="${r}" d="M${sx},${sy} H${mx} V${ey} H${ex}"/>`;
      });
    });
  }
  svg.innerHTML = paths;
  if (animate && !reduced) $$('path', svg).forEach(p => {
    p.style.setProperty('--len', p.getTotalLength());
    p.style.animationDelay = (+p.dataset.r * 160 + 250) + 'ms';
    p.classList.add('draw');
  });
}
new ResizeObserver(() => {
  if (!current || !current.bracket || !stage.classList.contains('done')) return;
  const rounds = bracketModel(current.teams, current.results);
  fitBracket(bracketColumns(rounds).length); drawBracketLines(rounds, false);
}).observe(stage);
