'use strict';
// Sorteios WEAK GG — draw engine: stage, seal, rounds, reel spin, lock, fly-to-board, finale

/* ================= DRAW ENGINE ================= */
const stage = $('#stage'), strip = $('#strip'), reelWrap = $('#reelWrap'), revealBtn = $('#revealBtn');
const ABORT = Symbol('abort');
let current = null, autoMode = false;
// draw speed (1x–3x): every stage duration goes through T(), so the whole show scales together
const SPEEDS = [1, 1.5, 2, 3];
let speed = 1;
try { const v = +localStorage.getItem('weakgg:speed'); if (SPEEDS.includes(v)) speed = v; } catch {}
const T = ms => ms / speed;

function openStage() {
  document.body.classList.add('staging');
  stage.classList.remove('done', 'tense');
  stage.classList.add('on');
  stage.scrollTop = 0;
}
function closeStage() {
  stage.classList.remove('on', 'done', 'tense', 'blackout');
  document.body.classList.remove('staging');
  fx.target = 1;
  $('#seal').getAnimations().forEach(a => a.cancel());
  $('#bigMsg').getAnimations().forEach(a => a.cancel());
  $('#bigMsg').style.opacity = 0;
}

async function bigMsg(k, t, s, hold = 1300) {
  const m = $('#bigMsg');
  m.querySelector('.bk').textContent = k; m.querySelector('.bs').textContent = s;
  const bt = m.querySelector('.bt'); bt.textContent = t;
  m.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T(250), fill: 'forwards' });
  bt.animate([{ transform: 'scale(1.6)', filter: 'blur(20px)', opacity: 0, letterSpacing: '.3em' }, { transform: 'scale(1)', filter: 'blur(0)', opacity: 1, letterSpacing: '0em' }], { duration: T(700), easing: 'cubic-bezier(.2,.8,.2,1)' });
  await wait(T(hold));
  bt.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.85)', opacity: 0, filter: 'blur(10px)' }], { duration: T(350), fill: 'forwards' });
  await wait(T(250));
  m.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(300), fill: 'forwards' });
  await wait(T(300));
  bt.getAnimations().forEach(a => a.cancel());
}

function buildBoards(S) {
  const b = $('#boards');
  // every team shows the same number of empty slots, so an uneven split isn't given away early
  const nStar = S.plan.teams[0].stars.length, nPl = Math.max(...S.plan.teams.map(t => t.players.length));
  b.style.setProperty('--cols', Math.min(S.teams.length, 4));
  b.innerHTML = S.teams.map((t, i) => `
    <div class="board" data-i="${i}">
      <div class="b-head"><span class="b-num">${S.bracket ? 'CONFRONTO' : `TIME ${pad2(i + 1)}`}</span><span class="b-name">${esc(t.name)}</span></div>
      ${t.cap ? '<div class="slot cap"><em>C</em><span>???</span></div>' : ''}
      ${'<div class="slot star"><em>★</em><span>???</span></div>'.repeat(nStar)}
      ${Array.from({ length: nPl }, (_, j) => `<div class="slot pl"><em>${S.bracket ? 'AB'[j] : (t.cap ? 1 : 0) + nStar + j + 1}</em><span>???</span></div>`).join('')}
    </div>`).join('');
}
const boardEl = i => $(`#boards .board[data-i="${i}"]`);

function renderPool(S, type) {
  const all = type === 'star' ? S.data.stars : S.data.players;
  const left = type === 'star' ? S.starPool : S.playerPool;
  $('#pool').innerHTML = all.map(n => `<span class="chip${left.includes(n) ? '' : ' taken'}" data-n="${esc(n)}">${esc(n)}</span>`).join('');
}
const chipFor = n => $$('#pool .chip').find(c => c.dataset.n === n);

function setProgress(S) {
  $('#stProg').style.width = (S.done / (S.total || 12) * 100) + '%';
}

function waitReveal(S) {
  return new Promise((res, rej) => {
    S.resolveReveal = res; S.rejectReveal = rej;
    revealBtn.disabled = false; revealBtn.classList.add('ready');
    if (autoMode) S.autoT = setTimeout(triggerReveal, T(1400));
  });
}
function triggerReveal() {
  const S = current;
  if (!S || !S.resolveReveal) return;
  Sound.init();
  clearTimeout(S.autoT);
  const r = S.resolveReveal; S.resolveReveal = S.rejectReveal = null;
  revealBtn.disabled = true; revealBtn.classList.remove('ready');
  r();
}

async function runDraw(data) {
  if (current) current.aborted = true;
  const S = {
    data, aborted: false, done: 0, log: [],
    std: data.mode === 'std' || data.mode === 'bracket', // both: plain names, no seeds or stars
    bracket: data.mode === 'bracket',
    teams: data.teams.map((name, i) => ({ name, cap: data.caps ? data.caps[i] : null, stars: [], players: [] })),
    starPool: [...(data.stars || [])], playerPool: [...data.players]
  };
  current = S;
  const sleep = async ms => { await wait(T(ms)); if (S.aborted) throw ABORT; };

  try {
    if (!(window.crypto && crypto.subtle)) { current = null; toast('Abra a página por https (ex: Vercel) para sortear'); return; }
    // seal the draw before anything is shown
    const seed = toHex(crypto.getRandomValues(new Uint8Array(32)));
    S.code = makeCode(seed, data);
    S.hash = toHex(await sha256(S.code));
    S.plan = await planDraw(seed, data);
    S.total = S.plan.rounds.reduce((n, r) => n + r.picks.length, 0);
    if (S.aborted) return;

    openStage();
    $('#hashChip').textContent = '#' + S.hash.slice(0, 8).toUpperCase();
    buildBoards(S);
    setProgress(S);
    stage.classList.toggle('is-bracket', S.bracket);
    $('#bracketWrap').innerHTML = '';
    $('#chFor').textContent = S.bracket ? 'O PRÓXIMO TIME VAI PARA O' : 'O PRÓXIMO JOGADOR VAI PARA';
    $('#chFor').style.opacity = 0; $('#chTeam').textContent = ''; $('#chCap').textContent = ''; $('#chStatus').textContent = '';
    $('#pool').innerHTML = ''; strip.innerHTML = '<div class="ri q">· · ·</div><div class="ri q">???</div><div class="ri q">· · ·</div>';
    strip.style.transform = ''; reelWrap.classList.remove('locked', 'charging');
    revealBtn.disabled = true;
    $('#stRound').textContent = 'PREPARANDO';

    // countdown
    fx.target = 3;
    await bigMsg('o sorteio vai começar', 'WEAK GG', 'prepare-se', 1500); if (S.aborted) throw ABORT;
    await showSeal(S); if (S.aborted) throw ABORT;
    for (const n of ['3', '2', '1']) { Sound.beat(); bigMsg('', n, '', 450); await sleep(1050); }
    Sound.boom(); flash(.8); burst(innerWidth / 2, innerHeight / 2, 120, 12); shockwave(innerWidth / 2, innerHeight / 2);
    fx.target = 1;

    // teams enter (with their captains in the WEAK GG format)
    $('#stRound').textContent = S.bracket ? 'CONFRONTOS' : S.std ? 'TIMES' : 'CABEÇAS DE CHAVE';
    for (let i = 0; i < S.teams.length; i++) {
      const b = boardEl(i); b.classList.add('in'); Sound.whoosh();
      await sleep(S.std ? 180 : 260);
      const slot = b.querySelector('.slot.cap');
      if (slot) { slot.classList.add('filled', 'pop'); scramble(slot.querySelector('span'), S.teams[i].cap, 600); Sound.pop(); }
    }
    await sleep(900);

    const nR = S.plan.rounds.length;
    const rounds = S.bracket
      ? S.plan.rounds.map((pr, r) => ({ type: 'player', k: `sorteio ${r + 1} de ${nR}`, t: `LADO ${'AB'[r]}`,
          s: r === nR - 1 ? 'fechando os confrontos' : 'um time em cada jogo' }))
      : S.std
      ? S.plan.rounds.map((pr, r) => ({ type: 'player', k: `rodada ${r + 1} de ${nR}`, t: `RODADA ${r + 1}`,
          s: r === nR - 1 ? 'fechando os times' : `${pr.picks.length} jogadores` }))
      : [
        { type: 'star', k: 'rodada 1 de 3', t: 'ESTRELAS', s: 'primeira estrela' },
        { type: 'star', k: 'rodada 2 de 3', t: 'ESTRELAS', s: 'segunda estrela' },
        { type: 'player', k: 'rodada 3 de 3', t: 'JOGADORES', s: 'fechando os times' }
      ];
    for (let r = 0; r < rounds.length; r++) {
      const R = rounds[r];
      const order = S.plan.rounds[r].order; // team order drawn fresh each round (from the sealed seed)
      S.log.push(`${R.k.toUpperCase()} — ordem dos times sorteada: ${order.map(i => S.teams[i].name).join(' → ')}`);
      Sound.beat();
      await bigMsg(R.k, R.t, R.s, 1500); if (S.aborted) throw ABORT;
      $('#stRound').textContent = S.std ? R.k.toUpperCase() : `${R.k.toUpperCase()} · ${R.t}`;
      $('#reelTag').textContent = R.type === 'star' ? '★ JOGADOR ESTRELA' : S.bracket ? '◆ TIME' : '◆ JOGADOR';
      for (let k = 0; k < order.length; k++) {
        const ti = order[k];
        await setTarget(S, ti, R);
        await waitReveal(S);
        if (S.aborted) throw ABORT;
        await doPick(S, ti, R, S.plan.rounds[r].picks[k], sleep);
      }
    }
    await sleep(600);
    await finale(S);
  } catch (e) {
    if (e !== ABORT) { console.error(e); toast('Erro no sorteio — tente novamente'); }
  }
}

async function showSeal(S) {
  const el = $('#seal');
  $('#sealFull').textContent = fmtHash(S.hash);
  el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T(400), fill: 'forwards' });
  Sound.whoosh();
  await scramble($('#sealShort'), '#' + fmtHash(S.hash.slice(0, 8)), T(1200));
  Sound.pop();
  await wait(T(3200));
  el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(400), fill: 'forwards' });
  await wait(T(400));
}

async function setTarget(S, ti, R) {
  $$('#boards .board').forEach(b => b.classList.toggle('active', +b.dataset.i === ti));
  stage.classList.remove('tense', 'blackout');
  reelWrap.classList.remove('locked');
  strip.getAnimations().forEach(a => a.cancel());
  strip.style.transform = ''; strip.style.filter = '';
  strip.innerHTML = '<div class="ri q">· · ·</div><div class="ri q">???</div><div class="ri q">· · ·</div>';
  renderPool(S, R.type);
  $('#chFor').style.opacity = 1;
  const t = S.teams[ti];
  const info = [];
  if (t.cap) info.push(`Cabeça de chave: <b>${esc(t.cap)}</b>`);
  if (t.stars.length) info.push(`Estrela${t.stars.length > 1 ? 's' : ''}: <b>${t.stars.map(esc).join(', ')}</b>`);
  if (S.bracket) info.push(t.players.length ? `Adversário: <b>${esc(t.players[0])}</b>` : 'Primeiro time do confronto');
  else if (S.std) info.push(t.players.length ? `Já tem: <b>${t.players.map(esc).join(', ')}</b>` : 'Primeiro jogador do time');
  $('#chCap').innerHTML = info.join(' · ');
  $('#chStatus').textContent = 'aguardando';
  Sound.whoosh();
  $('#chTeam').animate([{ opacity: 0, transform: 'translateY(20px)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: T(600), easing: 'cubic-bezier(.2,.8,.2,1)' });
  await scramble($('#chTeam'), t.name, T(700));
}

async function doPick(S, ti, R, pick, sleep) {
  const pool = R.type === 'star' ? S.starPool : S.playerPool;
  const poolSize = pool.length;
  // the decision comes from the sealed plan; the animation only reveals it
  const winner = pick.name;
  const idx = pool.indexOf(winner);

  const rh = () => strip.firstElementChild.getBoundingClientRect().height;
  let winEl;
  if (poolSize === 1) {
    $('#chStatus').textContent = '';
    scramble($('#chStatus'), 'último restante · por eliminação', 700);
    reelWrap.classList.add('charging'); Sound.riser(T(1600) / 1000); fx.target = 4;
    let beats = 0; const bi = setInterval(() => { Sound.beat(); if (++beats > 1) clearInterval(bi); }, T(600));
    await sleep(1700);
    reelWrap.classList.remove('charging');
    strip.innerHTML = `<div class="ri q">· · ·</div><div class="ri">${esc(winner)}</div><div class="ri q">· · ·</div>`;
    winEl = strip.children[1];
  } else {
    // charge-up
    scramble($('#chStatus'), 'sorteando', 600);
    reelWrap.classList.add('charging'); Sound.riser(T(1300) / 1000); fx.target = 3;
    await sleep(1300);
    reelWrap.classList.remove('charging');

    // build reel: random filler names (visual), winner lands in the middle row
    const n = 34 + rnd(10);
    const names = []; let prev = null;
    for (let i = 0; i < n; i++) {
      let nm; do { nm = pool[(Math.random() * poolSize) | 0]; } while (nm === prev);
      names.push(nm); prev = nm;
    }
    names[n - 1] = winner;
    if (names[n - 2] === winner) names[n - 2] = pool.find(x => x !== winner);
    names.push(pool.find(x => x !== winner)); // the "almost" name after the winner
    strip.innerHTML = names.map(nm => `<div class="ri">${esc(nm)}</div>`).join('');
    const h = rh();
    const endY = -(n - 2) * h, overY = endY - h * .44;
    const dur = T((R.type === 'star' ? 6400 : S.bracket ? 4200 : S.std ? 4800 : 5600) + rnd(900));
    const anim = strip.animate([
      { transform: 'translateY(0px)', easing: 'cubic-bezier(.2,.55,.12,1)' },
      { transform: `translateY(${overY}px)`, offset: .84 },
      { transform: `translateY(${overY}px)`, offset: .93, easing: 'cubic-bezier(.6,0,.3,1)' },
      { transform: `translateY(${endY}px)` }
    ], { duration: dur, fill: 'forwards' });

    let running = true, lastC = -1, lastY = 0, beatT = 0;
    const chips = $$('#pool .chip');
    const monitor = now => {
      if (!running) return;
      const y = new DOMMatrixReadOnly(getComputedStyle(strip).transform).m42;
      const c = Math.round(-y / h) + 1;
      if (c !== lastC) {
        if (strip.children[lastC]) strip.children[lastC].classList.remove('c');
        if (strip.children[c]) strip.children[c].classList.add('c');
        lastC = c; Sound.tick();
        const nm = names[c];
        chips.forEach(ch => ch.classList.toggle('hot', ch.dataset.n === nm && !ch.classList.contains('taken')));
      }
      const v = Math.abs(y - lastY); lastY = y;
      strip.style.filter = reduced ? '' : `blur(${Math.min(5, v / 14).toFixed(2)}px)`;
      fx.target = 1 + Math.min(12, v / 6);
      const p = (anim.currentTime || 0) / dur;
      if (p > .5 && !stage.classList.contains('tense')) { stage.classList.add('tense'); scramble($('#chStatus'), 'quase lá', 500); }
      if (R.type === 'star' && p > .8) stage.classList.add('blackout');
      if (p > .5 && now - beatT > (p > .84 ? 520 : 780)) { beatT = now; Sound.beat(); }
      requestAnimationFrame(monitor);
    };
    requestAnimationFrame(monitor);
    await anim.finished;
    running = false;
    strip.style.transform = `translateY(${endY}px)`; anim.cancel();
    strip.style.filter = '';
    chips.forEach(ch => ch.classList.remove('hot'));
    winEl = strip.children[n - 1];
    $$('.ri.c', strip).forEach(e => e !== winEl && e.classList.remove('c'));
    if (S.aborted) throw ABORT;
  }

  // LOCK
  pool.splice(idx, 1);
  stage.classList.remove('tense', 'blackout');
  fx.target = 1;
  if (R.type === 'star' && !reduced) {
    $('#stamp').animate([
      { opacity: 0, transform: 'translate(-50%,-50%) scale(3) rotate(-40deg)', filter: 'blur(24px)' },
      { opacity: .35, transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', filter: 'blur(0px)', offset: .25 },
      { opacity: 0, transform: 'translate(-50%,-50%) scale(.85) rotate(8deg)', filter: 'blur(6px)' }
    ], { duration: 1500, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  winEl.classList.add('c', 'win');
  reelWrap.classList.add('locked');
  Sound.boom(); flash(.9); shake();
  const rr = reelWrap.getBoundingClientRect();
  burst(rr.left + rr.width / 2, rr.top + rr.height / 2, 110, 11);
  shockwave(rr.left + rr.width / 2, rr.top + rr.height / 2);
  const chip = chipFor(winner); if (chip) chip.classList.add('taken', 'just');
  scramble($('#chStatus'), R.type === 'star' ? '★ estrela definida' : S.bracket ? 'time definido' : 'jogador definido', 500);
  S.log.push(`${S.teams[ti].name} ← ${winner}  (sorteado entre ${poolSize}: ${[...pool, winner].sort((a, b) => a.localeCompare(b)).join(', ')})`);
  await sleep(1500);

  // fly to the team board
  const t = S.teams[ti];
  let slot;
  if (R.type === 'star') { slot = boardEl(ti).querySelectorAll('.slot.star')[t.stars.length]; t.stars.push(winner); }
  else { slot = boardEl(ti).querySelectorAll('.slot.pl')[t.players.length]; t.players.push(winner); }
  await flyTo(winEl, slot, winner);
  slot.classList.add('filled', 'pop'); slot.querySelector('span').textContent = winner;
  const sr = slot.getBoundingClientRect(); burst(sr.left + sr.width / 2, sr.top + sr.height / 2, 30, 5);
  Sound.pop();
  S.done++; setProgress(S);
  await sleep(500);
}

async function flyTo(fromEl, slot, text) {
  const target = slot.querySelector('span');
  slot.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  const a = fromEl.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'flyer'; f.textContent = text;
  f.style.fontSize = getComputedStyle(fromEl).fontSize;
  document.body.appendChild(f);
  const fr = f.getBoundingClientRect();
  const sx = a.left + a.width / 2 - fr.width / 2, sy = a.top + a.height / 2 - fr.height / 2;
  f.style.left = sx + 'px'; f.style.top = sy + 'px';
  await wait(reduced ? 0 : T(280));
  const b = target.getBoundingClientRect();
  const scale = Math.min(1, (b.height * 1.1) / fr.height);
  const dx = b.left + (fr.width * scale) / 2 - (sx + fr.width / 2), dy = b.top + b.height / 2 - (sy + fr.height / 2);
  Sound.whoosh();
  await f.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * .5}px,${dy * .5 - 60}px) scale(${(1 + scale) / 2})`, opacity: 1, offset: .5 },
    { transform: `translate(${dx}px,${dy}px) scale(${scale})`, opacity: .2 }
  ], { duration: reduced ? 1 : T(750), easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' }).finished;
  f.remove();
}

async function finale(S) {
  $$('#boards .board').forEach(b => b.classList.remove('active'));
  $$('#boards .slot:not(.filled)').forEach(s => s.remove()); // teams that ended one player short
  $('#stRound').textContent = 'CONCLUÍDO';
  Sound.fanfare();
  await bigMsg('sorteio', 'FIM', S.bracket ? 'chaveamento definido' : 'times definidos', 1400);
  stage.classList.add('done');
  stage.scrollTop = 0;
  S.when = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  if (S.bracket) { S.results = {}; renderBracket(S); saveBracket(S); }
  fillFinalHead(S);
  $('#logList').innerHTML = S.log.map(l => `<li>${esc(l)}</li>`).join('');
  flash(.7);
  for (let i = 0; i < 5; i++) setTimeout(() => burst(Math.random() * innerWidth, Math.random() * innerHeight * .6, 70, 10), i * 260);
  shockwave(innerWidth / 2, innerHeight / 3, 1600);
}

function fillFinalHead(S) {
  $('#finalMeta').innerHTML = `${esc(S.when)} · sorteio lacrado e verificável<br>Creation of KZK`;
  $('#proof').innerHTML = `<b>Código do sorteio</b> (mostrado no início): <code>${fmtHash(S.hash)}</code><br>
    <b>Código de verificação</b> (semente revelada): <code>${esc(S.code)}</code><br>
    Para conferir: cole os dois em <b>Verificar sorteio</b>, no fim da página inicial. O “Copiar resultado” já leva os dois.`;
  scramble($('#finalTitle'), S.bracket ? 'CHAVEAMENTO' : 'TIMES DEFINIDOS', 1100);
}
