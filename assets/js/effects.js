'use strict';
// Sorteios WEAK GG — visual layer: text scramble, synth sound, particles, cursor, hero, marquee, scroll

/* ---------- text scramble (visual only) ---------- */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$*+=/<>';
function scramble(el, text, dur = 800) {
  return new Promise(res => {
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        out += (ch === ' ' || i < p * text.length) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step); else { el.textContent = text; res(); }
    };
    requestAnimationFrame(step);
  });
}

/* ---------- sound (synthesized, no files) ---------- */
const Sound = {
  ctx: null, out: null, on: true,
  init() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      this.ctx = new C();
      this.out = this.ctx.createGain(); this.out.gain.value = .55;
      this.out.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(f, dur, type = 'sine', vol = .2, to) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + .05);
  },
  noise(dur, vol = .3, freq = 1200) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime, len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = .7;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(this.out); s.start(t);
  },
  tick() { this.tone(2400, .025, 'square', .04); },
  beat() { this.tone(75, .2, 'sine', .7, 40); setTimeout(() => this.tone(62, .25, 'sine', .5, 35), 170); },
  boom() { this.tone(110, 1.1, 'sine', .8, 28); this.noise(.6, .4, 900); this.tone(660, .9, 'triangle', .07, 1320); },
  riser(dur) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + dur);
    f.type = 'lowpass'; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3000, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.08, t + dur * .9); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(f).connect(g).connect(this.out); o.start(t); o.stop(t + dur + .05);
  },
  whoosh() { this.noise(.35, .18, 2500); },
  pop() { this.tone(880, .15, 'triangle', .12, 1760); },
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, .6, 'triangle', .12), i * 120)); setTimeout(() => this.boom(), 480); }
};

/* ---------- particle background ---------- */
const fx = { speed: 1, target: 1, mx: -9999, my: -9999, bursts: [] };
(function particles() {
  const cv = $('#bg'), ctx = cv.getContext('2d');
  let W, H, dpr, pts = [];
  const resize = () => {
    dpr = Math.min(1.5, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(110, W * H / 14000));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3 - .08, r: Math.random() * 1.4 + .3 }));
  };
  resize(); addEventListener('resize', resize);
  const LINK = 120, BUCKETS = 10;
  const frame = () => {
    fx.speed += (fx.target - fx.speed) * .06;
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      p.x += p.vx * fx.speed; p.y += p.vy * fx.speed;
      const dx = p.x - fx.mx, dy = p.y - fx.my, d2 = dx * dx + dy * dy;
      if (d2 < 22000) { const d = Math.sqrt(d2) || 1, f = (1 - d / 148) * 2.2; p.x += dx / d * f; p.y += dy / d * f; }
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
    }
    // lines are grouped into a few opacity buckets so each bucket is one stroke call
    // instead of one call per line (thousands per frame)
    const links = Array.from({ length: BUCKETS }, () => new Path2D());
    const mlinks = Array.from({ length: BUCKETS }, () => new Path2D());
    const bucket = f => Math.min(BUCKETS - 1, (f * BUCKETS) | 0);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < LINK * LINK) { const pth = links[bucket(1 - Math.sqrt(d2) / LINK)]; pth.moveTo(a.x, a.y); pth.lineTo(b.x, b.y); }
      }
      const mdx = a.x - fx.mx, mdy = a.y - fx.my, md2 = mdx * mdx + mdy * mdy;
      if (md2 < 28900) { const pth = mlinks[bucket(1 - Math.sqrt(md2) / 170)]; pth.moveTo(a.x, a.y); pth.lineTo(fx.mx, fx.my); }
    }
    ctx.lineWidth = 1;
    for (let k = 0; k < BUCKETS; k++) {
      const f = (k + .5) / BUCKETS;
      ctx.strokeStyle = `rgba(255,255,255,${f * .14})`; ctx.stroke(links[k]);
      ctx.strokeStyle = `rgba(255,255,255,${f * .35})`; ctx.stroke(mlinks[k]);
    }
    const stretch = Math.min(14, (fx.speed - 1) * 1.6);
    const dots = new Path2D();
    for (const p of pts) {
      if (stretch > 1) dots.rect(p.x - p.r / 2, p.y - stretch, p.r, stretch);
      else { dots.moveTo(p.x + p.r, p.y); dots.arc(p.x, p.y, p.r, 0, 6.283); }
    }
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill(dots);
    // bursts
    if (fx.bursts.length) {
      const bp = Array.from({ length: BUCKETS }, () => new Path2D());
      for (let i = fx.bursts.length - 1; i >= 0; i--) {
        const b = fx.bursts[i];
        b.x += b.vx; b.y += b.vy; b.vx *= .96; b.vy = b.vy * .96 + .05; b.life -= b.decay;
        if (b.life <= 0) { fx.bursts.splice(i, 1); continue; }
        const r = b.r * b.life + .3, pth = bp[bucket(b.life)];
        pth.moveTo(b.x + r, b.y); pth.arc(b.x, b.y, r, 0, 6.283);
      }
      for (let k = 0; k < BUCKETS; k++) { ctx.fillStyle = `rgba(255,255,255,${(k + .5) / BUCKETS})`; ctx.fill(bp[k]); }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
function burst(x, y, n = 70, power = 9) {
  if (reduced) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * power + 1;
    fx.bursts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 2.6 + .6, life: 1, decay: Math.random() * .015 + .01 });
  }
}
function shockwave(x, y, size = 900) {
  const s = document.createElement('div'); s.className = 'shock';
  s.style.left = x + 'px'; s.style.top = y + 'px'; document.body.appendChild(s);
  s.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: `scale(${size / 20})`, opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => s.remove();
}
function flash(strength = 1) {
  $('#flash').animate([{ opacity: 0 }, { opacity: strength, offset: .08 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' });
}
function shake(el = $('#stage')) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

/* ---------- custom cursor ---------- */
(function cursor() {
  addEventListener('pointermove', e => { fx.mx = e.clientX; fx.my = e.clientY; }, { passive: true });
  document.addEventListener('pointerleave', () => { fx.mx = fx.my = -9999; });
  if (!finePointer) return;
  document.body.classList.add('cursor-on');
  const dot = $('#cDot'), ring = $('#cRing');
  let rx = innerWidth / 2, ry = innerHeight / 2, x = rx, y = ry;
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; dot.style.transform = `translate3d(${x}px,${y}px,0)`; }, { passive: true });
  // time-based easing: same feel at 60/144 Hz, and no style writes once the ring has caught up
  // the press "squeeze" lives in this same transform, after the translate: a separate CSS
  // `scale` is applied before `transform` and would shrink the position too (the ring jumped)
  let last = performance.now(), s = 1, sTo = 1;
  const loop = now => {
    const dt = now - last; last = now;
    const k = 1 - Math.exp(-dt / 28), ks = 1 - Math.exp(-dt / 45);
    const moving = Math.abs(x - rx) > .1 || Math.abs(y - ry) > .1, squeezing = Math.abs(sTo - s) > .002;
    if (moving || squeezing) {
      rx += (x - rx) * k; ry += (y - ry) * k;
      s = squeezing ? s + (sTo - s) * ks : sTo;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0) scale(${s})`;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  document.addEventListener('pointerover', e => {
    const t = e.target;
    ring.classList.toggle('text', !!t.closest('input'));
    ring.classList.toggle('hover', !t.closest('input') && !!t.closest('a,button,summary,.team-card'));
  });
  const release = () => { sTo = 1; };
  addEventListener('pointerdown', e => { if (e.button === 0) sTo = .7; });
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  addEventListener('blur', release);
})();

/* ---------- magnetic buttons ---------- */
function magnetize(el) {
  if (!finePointer) return;
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
}

/* ---------- hero intro ---------- */
(function hero() {
  const t = $('#title'), txt = t.textContent;
  t.innerHTML = [...txt].map((c, i) => c === ' ' ? ' ' : `<span class="ch" style="animation-delay:${.15 + i * .07}s">${c}</span>`).join('');
  scramble($('#heroKicker'), '// sistema de sorteio imparcial', 1400);
})();

/* ---------- marquees with scroll velocity ---------- */
(function marquees() {
  const words = ['SORTEIOS', 'WEAK GG', 'IMPARCIAL', 'CABEÇAS DE CHAVE', 'ESTRELAS', 'KZK'];
  const html = Array(4).fill(words.map((w, i) => `<span class="${i % 2 ? 'o' : 's'}">${w}</span><span class="o">✦</span>`).join('')).join('');
  const tracks = [$('#mq1'), $('#mq2')];
  tracks.forEach(t => t.innerHTML = html);
  let off = 0, lastY = scrollY, vel = 0, w = 1;
  // measuring scrollWidth every frame forced a layout pass; measure only when the size can change
  const measure = () => { w = tracks[0].scrollWidth / 4 || 1; };
  measure(); addEventListener('resize', measure);
  if (document.fonts) document.fonts.ready.then(measure);
  const visible = new Set();
  const vis = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
  tracks.forEach(t => vis.observe(t.parentElement));
  const loop = () => {
    const y = scrollY; vel += ((y - lastY) - vel) * .1; lastY = y;
    off += 0.6 + Math.abs(vel) * .35;
    if (!visible.size) { requestAnimationFrame(loop); return; }
    const o = off % w;
    tracks[0].style.transform = `translateX(${-o}px) skewX(${Math.max(-12, Math.min(12, -vel * .4))}deg)`;
    tracks[1].style.transform = `translateX(${o - w}px) skewX(${Math.max(-12, Math.min(12, vel * .4))}deg)`;
    requestAnimationFrame(loop);
  };
  loop();
})();

/* ---------- scroll: progress, parallax, reveals ---------- */
(function scrollFx() {
  const prog = $('#progress'), hero = $('#heroInner');
  // page height is cached (reading scrollHeight on every scroll event forced layout),
  // work is batched to one update per frame, and the hero stops updating once it is off screen
  let maxScroll = 1, queued = false, heroDone = false;
  const measure = () => { maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight); };
  new ResizeObserver(measure).observe(document.body); addEventListener('resize', measure); measure();
  const update = () => {
    queued = false;
    const y = scrollY;
    prog.style.transform = `scaleX(${Math.min(1, y / maxScroll)})`;
    const p = Math.min(1, y / innerHeight);
    if (p >= 1 && heroDone) return;
    heroDone = p >= 1;
    hero.style.transform = `translate3d(0,${y * .35}px,0) scale(${1 - p * .12})`;
    hero.style.opacity = 1 - p * 1.1;
    hero.style.filter = p > .002 ? `blur(${p * 8}px)` : 'none';
  };
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true }); update();
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  window.observeReveal = el => io.observe(el);
  $$('.reveal').forEach(el => io.observe(el));
  $$('.step').forEach(s => s.addEventListener('pointermove', e => {
    const r = s.getBoundingClientRect();
    s.style.setProperty('--mx', (e.clientX - r.left) + 'px'); s.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));
})();
