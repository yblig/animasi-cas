// 10 procedural charging animations drawn on a 2D canvas.
// Each entry: { id, name, tag, accent, accent2, make(ctx) -> { resize(w,h), frame(t, dt, s) } }
// s = { level (0..100, eased), charging, fast, full }

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const spriteCache = new Map();
function glow(color, size = 64) {
  const k = color + size;
  if (spriteCache.has(k)) return spriteCache.get(k);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), r = size / 2;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, color); gr.addColorStop(0.25, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  spriteCache.set(k, c); return c;
}
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function bg(ctx, w, h, c1, c2) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
function vignette(ctx, w, h, a = 0.55) { const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
function batteryBox(w, h) { const bw = Math.min(w * 0.46, h * 0.28), bh = Math.min(h * 0.5, bw * 2.05); return { x: (w - bw) / 2, y: (h - bh) / 2 + bh * 0.04, w: bw, h: bh, r: bw * 0.18 }; }

/* 1 ─ Gelembung Neon ─────────────────────────────── */
function bubbles(ctx) {
  let W, H, B, bub = [];
  return {
    resize(w, h) { W = w; H = h; B = batteryBox(w, h); bub = []; },
    frame(t, dt, s) {
      bg(ctx, W, H, '#03121f', '#050616');
      const { x, y, w, h, r } = B, lvl = s.level / 100, top = y + h * (1 - lvl);
      // terminal + shell
      ctx.save(); ctx.shadowColor = '#3ef2ff'; ctx.shadowBlur = 26; ctx.lineWidth = Math.max(3, w * 0.03); ctx.strokeStyle = '#3ef2ff';
      roundRect(ctx, x + w * 0.34, y - h * 0.06, w * 0.32, h * 0.06 + r, r * 0.4); ctx.fillStyle = '#3ef2ff'; ctx.fill();
      roundRect(ctx, x, y, w, h, r); ctx.stroke(); ctx.restore();
      ctx.save(); roundRect(ctx, x + 6, y + 6, w - 12, h - 12, r * 0.8); ctx.clip();
      const g = ctx.createLinearGradient(0, top, 0, y + h); g.addColorStop(0, '#5dfcff'); g.addColorStop(0.5, '#22c7e8'); g.addColorStop(1, '#1f6dff');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y + h);
      for (let i = 0; i <= 40; i++) { const px = x + w * i / 40; ctx.lineTo(px, top + Math.sin(i * 0.45 + t * 3) * 6 + Math.sin(i * 0.2 - t * 2) * 4); }
      ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(x, y + h);
      for (let i = 0; i <= 40; i++) { const px = x + w * i / 40; ctx.lineTo(px, top + 10 + Math.sin(i * 0.5 - t * 2.4) * 5); }
      ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
      if (Math.random() < 0.5) bub.push({ x: x + rand(10, w - 10), y: y + h, r: rand(2, w * 0.05), v: rand(40, 120), wob: rand(0, TAU) });
      ctx.globalCompositeOperation = 'lighter';
      bub = bub.filter(b => { b.y -= b.v * dt; b.wob += dt * 3; if (b.y < top + 6) return false;
        const bx = b.x + Math.sin(b.wob) * 4; ctx.strokeStyle = 'rgba(220,255,255,.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, b.y, b.r, 0, TAU); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(bx - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.25, 0, TAU); ctx.fill(); return true; });
      ctx.restore(); ctx.globalCompositeOperation = 'source-over';
      // reflection gloss
      const gl = ctx.createLinearGradient(x, 0, x + w, 0); gl.addColorStop(0, 'rgba(255,255,255,.12)'); gl.addColorStop(0.3, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; roundRect(ctx, x, y, w, h, r); ctx.fill();
      vignette(ctx, W, H);
    }
  };
}

/* 2 ─ Cincin Plasma ──────────────────────────────── */
function ring(ctx) {
  let W, H, R, sparks = [];
  return {
    resize(w, h) { W = w; H = h; R = Math.min(w, h) * 0.33; sparks = Array.from({ length: 60 }, () => ({ a: rand(0, TAU), r: rand(0.95, 1.25), v: rand(0.4, 1.4), s: rand(1, 3) })); },
    frame(t, dt, s) {
      bg(ctx, W, H, '#0b0320', '#040212');
      const cx = W / 2, cy = H / 2, p = s.level / 100;
      ctx.strokeStyle = 'rgba(160,110,255,.08)'; ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.arc(cx, cy, R * i * 0.38, 0, TAU); ctx.stroke(); }
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.3); ctx.setLineDash([4, 14]); ctx.strokeStyle = 'rgba(255,79,216,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R * 1.22, 0, TAU); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-t * 0.5); ctx.setLineDash([R * 0.4, R * 0.25]); ctx.strokeStyle = 'rgba(62,242,255,.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R * 1.1, 0, TAU); ctx.stroke(); ctx.restore();
      ctx.lineCap = 'round'; ctx.lineWidth = R * 0.11; ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      let grad; try { grad = ctx.createConicGradient(-Math.PI / 2, cx, cy); grad.addColorStop(0, '#ff4fd8'); grad.addColorStop(0.5, '#8a5cff'); grad.addColorStop(1, '#3ef2ff'); } catch { grad = '#c86bff'; }
      ctx.save(); ctx.shadowColor = '#c86bff'; ctx.shadowBlur = 30; ctx.strokeStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.005, p)); ctx.stroke(); ctx.restore();
      const ea = -Math.PI / 2 + TAU * p, hx = cx + Math.cos(ea) * R, hy = cy + Math.sin(ea) * R;
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow('#ffffff', 96), hx - 48, hy - 48);
      ctx.drawImage(glow('#ff4fd8', 160), hx - 80, hy - 80);
      for (const k of sparks) { k.a += k.v * dt; const rr = R * k.r + Math.sin(t * 3 + k.a * 5) * 6; const x = cx + Math.cos(k.a) * rr, y = cy + Math.sin(k.a) * rr; const sz = k.s * 6;
        ctx.drawImage(glow(k.s > 2 ? '#3ef2ff' : '#ff4fd8', 32), x - sz, y - sz, sz * 2, sz * 2); }
      ctx.globalCompositeOperation = 'source-over';
      vignette(ctx, W, H, 0.5);
    }
  };
}

/* 3 ─ Petir ──────────────────────────────────────── */
function lightning(ctx) {
  let W, H, B, bolts = [], flash = 0, next = 0, arcs = [];
  const bolt = (x1, y1, x2, y2, d) => { const pts = [[x1, y1]]; const n = 14; for (let i = 1; i < n; i++) { const t = i / n; pts.push([x1 + (x2 - x1) * t + rand(-d, d), y1 + (y2 - y1) * t + rand(-d * 0.3, d * 0.3)]); } pts.push([x2, y2]); return pts; };
  return {
    resize(w, h) { W = w; H = h; B = batteryBox(w, h); },
    frame(t, dt, s) {
      bg(ctx, W, H, '#0d0a24', '#06040f');
      const { x, y, w, h, r } = B, lvl = s.level / 100;
      next -= dt;
      if (next <= 0) { next = rand(0.35, 1.3) / (s.fast ? 1.6 : 1); const tx = x + w / 2; bolts.push({ pts: bolt(rand(W * 0.1, W * 0.9), -10, tx + rand(-w * 0.1, w * 0.1), y - h * 0.06, W * 0.08), life: 0.35 }); flash = 0.5; }
      if (flash > 0) { ctx.fillStyle = `rgba(190,170,255,${flash * 0.25})`; ctx.fillRect(0, 0, W, H); flash -= dt * 2.5; }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      bolts = bolts.filter(b => { b.life -= dt; if (b.life <= 0) return false; const a = b.life / 0.35;
        for (const [lw, col] of [[10, `rgba(140,110,255,${0.25 * a})`], [4, `rgba(200,190,255,${0.7 * a})`], [1.6, `rgba(255,255,255,${a})`]]) {
          ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.beginPath(); b.pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke(); }
        return true; });
      ctx.restore();
      // battery
      ctx.save(); ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 24; ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = Math.max(3, w * 0.03);
      roundRect(ctx, x + w * 0.34, y - h * 0.06, w * 0.32, h * 0.06 + r, r * 0.4); ctx.fillStyle = '#ffd84a'; ctx.fill(); roundRect(ctx, x, y, w, h, r); ctx.stroke(); ctx.restore();
      const segs = 5, gap = h * 0.025, sh = (h - 16 - gap * (segs - 1)) / segs, lit = lvl * segs;
      for (let i = 0; i < segs; i++) { const sy = y + h - 8 - (i + 1) * sh - i * gap, f = clamp(lit - i, 0, 1); if (f <= 0) continue;
        const g = ctx.createLinearGradient(x, sy, x + w, sy); g.addColorStop(0, '#ffb703'); g.addColorStop(1, '#ffe66d');
        ctx.globalAlpha = f < 1 ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 8)) : 1; ctx.fillStyle = g; roundRect(ctx, x + 8, sy, w - 16, sh, r * 0.4); ctx.fill(); ctx.globalAlpha = 1; }
      // crawling arcs on the shell
      if (Math.random() < 0.25) { const side = Math.random() < 0.5 ? x : x + w, sy = y + rand(0, h); arcs.push({ pts: bolt(side, sy, side + (side === x ? -1 : 1) * rand(20, 60), sy + rand(-40, 40), 10), life: 0.15 }); }
      ctx.globalCompositeOperation = 'lighter'; arcs = arcs.filter(a => { a.life -= dt; if (a.life <= 0) return false; ctx.strokeStyle = 'rgba(255,240,170,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); a.pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke(); return true; });
      ctx.globalCompositeOperation = 'source-over'; vignette(ctx, W, H, 0.6);
    }
  };
}

/* 4 ─ Ombak Samudra ─────────────────────────────── */
function waves(ctx) {
  let W, H, motes = [];
  return {
    resize(w, h) { W = w; H = h; motes = Array.from({ length: 50 }, () => ({ x: rand(0, w), y: rand(0, h), v: rand(8, 30), s: rand(1, 2.6) })); },
    frame(t, dt, s) {
      bg(ctx, W, H, '#041a33', '#020a18');
      const lvl = s.level / 100, base = H * (1 - lvl * 0.92) - 20;
      const layers = [['#0a3d7a', 0.9, 0.012, 22, 0.7], ['#0d63a8', 0.8, 0.016, 18, -1.0], ['#13a0c9', 0.75, 0.02, 14, 1.3], ['#2fe0e6', 0.55, 0.026, 10, -1.7]];
      layers.forEach(([c, a, f, amp, sp], i) => { const off = i * 14; const g = ctx.createLinearGradient(0, base + off, 0, H); g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba('#020a18', 0.95));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, base + off + Math.sin(x * f + t * sp) * amp + Math.sin(x * f * 2.3 - t * sp * 0.7) * amp * 0.35);
        ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
        if (i === layers.length - 1) { ctx.strokeStyle = 'rgba(200,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = 0; x <= W + 10; x += 10) { const yy = base + off + Math.sin(x * f + t * sp) * amp + Math.sin(x * f * 2.3 - t * sp * 0.7) * amp * 0.35; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); } });
      ctx.globalCompositeOperation = 'lighter';
      for (const m of motes) { m.y -= m.v * dt; if (m.y < -10) { m.y = H + 10; m.x = rand(0, W); } const a = m.y > base ? 0.9 : 0.35; ctx.globalAlpha = a; ctx.drawImage(glow('#7ff9ff', 24), m.x - m.s * 4, m.y - m.s * 4, m.s * 8, m.s * 8); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; vignette(ctx, W, H, 0.45);
    }
  };
}

/* 5 ─ Galaksi ────────────────────────────────────── */
function galaxy(ctx) {
  let W, H, stars = [], pts = [];
  return {
    resize(w, h) { W = w; H = h; stars = Array.from({ length: 160 }, () => [rand(0, w), rand(0, h), rand(0.3, 1.4), rand(0, TAU)]);
      const R = Math.max(w, h) * 0.55; pts = Array.from({ length: 900 }, (_, i) => { const arm = i % 3, d = Math.pow(Math.random(), 0.7) * R; return { d, a: arm * TAU / 3 + d * 0.012 + rand(-0.35, 0.35), z: rand(0.6, 1.4), c: Math.random() < 0.15 ? '#ffd1f5' : d < R * 0.35 ? '#ffe7a8' : Math.random() < 0.5 ? '#8fb4ff' : '#c08bff' }; }); },
    frame(t, dt, s) {
      ctx.fillStyle = '#04030c'; ctx.fillRect(0, 0, W, H);
      for (const st of stars) { ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + st[3]); ctx.fillStyle = '#fff'; ctx.fillRect(st[0], st[1], st[2], st[2]); } ctx.globalAlpha = 1;
      const cx = W / 2, cy = H / 2, sp = s.fast ? 1.6 : 1;
      ctx.globalCompositeOperation = 'lighter';
      const core = Math.min(W, H) * (0.25 + s.level / 400);
      ctx.drawImage(glow('#ffcf7a', 256), cx - core, cy - core, core * 2, core * 2);
      for (const p of pts) { p.a += dt * sp * 60 / (p.d + 60); const x = cx + Math.cos(p.a) * p.d, y = cy + Math.sin(p.a) * p.d * 0.62; const sz = 3.2 * p.z;
        ctx.drawImage(glow(p.c, 16), x - sz, y - sz, sz * 2, sz * 2); }
      ctx.globalCompositeOperation = 'source-over'; vignette(ctx, W, H, 0.4);
    }
  };
}

/* 6 ─ Matrix ─────────────────────────────────────── */
function matrix(ctx) {
  let W, H, cols = [], fs = 16; const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789⚡%';
  return {
    resize(w, h) { W = w; H = h; fs = Math.max(13, Math.round(w / 26)); cols = Array.from({ length: Math.ceil(w / fs) }, () => ({ y: rand(-h, 0), v: rand(0.6, 1.4) })); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); },
    frame(t, dt, s) {
      ctx.fillStyle = 'rgba(0,6,2,0.14)'; ctx.fillRect(0, 0, W, H);
      ctx.font = `700 ${fs}px monospace`; ctx.textAlign = 'center';
      const fill = H * (1 - s.level / 100);
      cols.forEach((c, i) => { c.y += c.v * fs * dt * 9 * (s.fast ? 1.5 : 1); if (c.y > H + fs * 4) { c.y = rand(-H * 0.4, 0); c.v = rand(0.6, 1.4); }
        const x = i * fs + fs / 2, ch = chars[(Math.random() * chars.length) | 0];
        ctx.fillStyle = c.y > fill ? '#d6ffe0' : '#9dffb0'; ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 8; ctx.fillText(ch, x, c.y); ctx.shadowBlur = 0;
        ctx.fillStyle = c.y > fill ? '#2bff7a' : '#118a3d'; ctx.fillText(chars[(Math.random() * chars.length) | 0], x, c.y - fs); });
            ctx.strokeStyle = 'rgba(0,255,120,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, fill); ctx.lineTo(W, fill); ctx.stroke();
    }
  };
}

/* 7 ─ Api Phoenix ────────────────────────────────── */
function fire(ctx) {
  let W, H, ps = [], embers = [];
  const cols = ['#fff3b0', '#ffd166', '#ff9f1c', '#ff5d2a', '#d62828'];
  return {
    resize(w, h) { W = w; H = h; ps = []; embers = []; },
    frame(t, dt, s) {
      bg(ctx, W, H, '#14040a', '#050102');
      const lvl = s.level / 100, n = Math.max(1, Math.round((6 + lvl * 10) * (s.fast ? 1.4 : 1) * dt * 60));
      for (let i = 0; i < n; i++) { const spread = W * (0.25 + lvl * 0.35); const k = W / 360; ps.push({ x: W / 2 + rand(-spread, spread) * Math.pow(Math.random(), 0.6) * 0.6, y: H + 10, vx: rand(-20, 20) * k, vy: -rand(0.22, 0.42) * H * (0.6 + lvl * 0.7), life: 1, max: rand(0.9, 1.7), sz: rand(14, 34) * k }); }
      if (Math.random() < 0.5) embers.push({ x: W / 2 + rand(-W * 0.35, W * 0.35), y: H, vx: rand(-30, 30), vy: -rand(80, 200), life: rand(1.5, 3) });
      ctx.globalCompositeOperation = 'lighter';
      ps = ps.filter(p => { p.life -= dt / p.max; if (p.life <= 0) return false; p.x += (p.vx + Math.sin(t * 6 + p.y * 0.02) * 30) * dt; p.y += p.vy * dt; p.vx += (W / 2 - p.x) * dt * 0.6;
        const ci = Math.min(cols.length - 1, Math.floor((1 - p.life) * cols.length)), sz = p.sz * (0.4 + p.life * 0.8);
        ctx.globalAlpha = Math.min(1, p.life * 1.4); ctx.drawImage(glow(cols[ci], 64), p.x - sz, p.y - sz, sz * 2, sz * 2); return true; });
      ctx.globalAlpha = 1;
      embers = embers.filter(e => { e.life -= dt; if (e.life <= 0) return false; e.x += (e.vx + Math.sin(t * 3 + e.y * 0.05) * 25) * dt; e.y += e.vy * dt; ctx.drawImage(glow('#ffb347', 16), e.x - 4, e.y - 4, 8, 8); return true; });
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createLinearGradient(0, H * 0.75, 0, H); g.addColorStop(0, 'rgba(255,80,20,0)'); g.addColorStop(1, 'rgba(255,90,20,.35)'); ctx.fillStyle = g; ctx.fillRect(0, H * 0.75, W, H * 0.25);
      vignette(ctx, W, H, 0.5);
    }
  };
}

/* 8 ─ Sarang Kristal ─────────────────────────────── */
function hexgrid(ctx) {
  let W, H, cells = [], R = 26;
  return {
    resize(w, h) { W = w; H = h; R = Math.max(20, Math.min(w, h) / 14); cells = []; const dx = R * Math.sqrt(3), dy = R * 1.5;
      for (let r = -1; r * dy < h + R * 2; r++) for (let c = -1; c * dx < w + R * 2; c++) { const x = c * dx + (r % 2 ? dx / 2 : 0), y = r * dy; cells.push({ x, y, d: Math.hypot(x - w / 2, y - h / 2), ph: rand(0, TAU) }); }
      const md = Math.max(...cells.map(c => c.d)); cells.forEach(c => c.n = c.d / md); },
    frame(t, dt, s) {
      bg(ctx, W, H, '#061220', '#03070f');
      const lvl = s.level / 100;
      for (const c of cells) { const wave = 0.5 + 0.5 * Math.sin(t * 2.4 - c.d * 0.02), lit = c.n < lvl;
        const a = lit ? 0.35 + 0.65 * wave : 0.06 + 0.06 * wave;
        ctx.beginPath(); for (let k = 0; k < 6; k++) { const an = Math.PI / 6 + k * TAU / 6; const px = c.x + Math.cos(an) * R * 0.9, py = c.y + Math.sin(an) * R * 0.9; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath();
        if (lit) { ctx.fillStyle = rgba(c.n < lvl * 0.5 ? '#7dff6a' : '#3ef2ff', a * 0.28); ctx.fill(); }
        ctx.strokeStyle = rgba(lit ? '#8ffcff' : '#3a5a7a', a); ctx.lineWidth = lit ? 2 : 1; ctx.stroke();
        if (lit && Math.sin(t * 3 + c.ph) > 0.985) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow('#bfffff', 64), c.x - R, c.y - R, R * 2, R * 2); ctx.globalCompositeOperation = 'source-over'; } }
      vignette(ctx, W, H, 0.55);
    }
  };
}

/* 9 ─ Aurora ─────────────────────────────────────── */
function aurora(ctx) {
  let W, H, stars = [];
  return {
    resize(w, h) { W = w; H = h; stars = Array.from({ length: 220 }, () => [rand(0, w), rand(0, h * 0.8), rand(0.4, 1.6), rand(0, TAU)]); },
    frame(t, dt, s) {
      bg(ctx, W, H, '#020617', '#08142b');
      for (const st of stars) { ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t * 1.5 + st[3])); ctx.fillStyle = '#fff'; ctx.fillRect(st[0], st[1], st[2], st[2]); } ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      const bands = [['#3dff9e', 0.32, 0.0], ['#36d1ff', 0.42, 1.7], ['#b56bff', 0.24, 3.1]], intensity = 1.6 + s.level / 50;
      for (const [col, yb, ph] of bands) { for (let x = 0; x < W; x += 4) {
          const y = H * yb + Math.sin(x * 0.006 + t * 0.5 + ph) * H * 0.06 + Math.sin(x * 0.017 - t * 0.8 + ph) * H * 0.025;
          const hgt = H * (0.18 + 0.08 * Math.sin(x * 0.01 + t + ph)), a = (0.08 + 0.07 * Math.sin(x * 0.03 + t * 2 + ph)) * intensity;
          const g = ctx.createLinearGradient(0, y - hgt, 0, y); g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.8, rgba(col, a)); g.addColorStop(1, rgba(col, a * 0.2));
          ctx.fillStyle = g; ctx.fillRect(x, y - hgt, 4, hgt); } }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#030812'; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += W / 12) ctx.lineTo(x, H * 0.84 - Math.abs(Math.sin(x * 0.011 + 1.3)) * H * 0.09 - Math.sin(x * 0.03) * 8);
      ctx.lineTo(W, H); ctx.fill();
      const lake = ctx.createLinearGradient(0, H * 0.9, 0, H); lake.addColorStop(0, 'rgba(54,209,255,.08)'); lake.addColorStop(1, 'rgba(61,255,158,.05)'); ctx.fillStyle = lake; ctx.fillRect(0, H * 0.9, W, H * 0.1);
    }
  };
}

/* 10 ─ Orb Energi ────────────────────────────────── */
function orb(ctx) {
  let W, H, R, inflow = [];
  return {
    resize(w, h) { W = w; H = h; R = Math.min(w, h) * 0.22; inflow = []; },
    frame(t, dt, s) {
      bg(ctx, W, H, '#100320', '#03010a');
      const cx = W / 2, cy = H / 2, p = s.level / 100, pulse = 1 + Math.sin(t * 3) * 0.04;
      ctx.save(); ctx.translate(cx, cy); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) { const a = i * TAU / 14 + t * 0.25; ctx.rotate(0); const g = ctx.createLinearGradient(0, 0, Math.cos(a) * W, Math.sin(a) * W); g.addColorStop(0, 'rgba(255,90,220,.18)'); g.addColorStop(1, 'rgba(255,90,220,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - 0.05) * W, Math.sin(a - 0.05) * W); ctx.lineTo(Math.cos(a + 0.05) * W, Math.sin(a + 0.05) * W); ctx.fill(); }
      ctx.restore();
      if (Math.random() < 0.7) { const a = rand(0, TAU), d = Math.max(W, H) * 0.6; inflow.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, life: 1 }); }
      ctx.globalCompositeOperation = 'lighter';
      inflow = inflow.filter(q => { q.x += (cx - q.x) * dt * 1.8; q.y += (cy - q.y) * dt * 1.8; const d = Math.hypot(q.x - cx, q.y - cy); if (d < R * 0.8) return false; ctx.drawImage(glow('#ff9df0', 24), q.x - 6, q.y - 6, 12, 12); return true; });
      const rr = R * (0.85 + p * 0.3) * pulse;
      ctx.drawImage(glow('#7a2cff', 256), cx - rr * 2.4, cy - rr * 2.4, rr * 4.8, rr * 4.8);
      for (let i = 0; i < 6; i++) { const a = t * (0.7 + i * 0.13) + i, ox = Math.cos(a) * rr * 0.35, oy = Math.sin(a * 1.3) * rr * 0.35, col = ['#ff4fd8', '#3ef2ff', '#b56bff'][i % 3];
        ctx.drawImage(glow(col, 128), cx + ox - rr, cy + oy - rr, rr * 2, rr * 2); }
      ctx.drawImage(glow('#ffffff', 128), cx - rr * 0.55, cy - rr * 0.55, rr * 1.1, rr * 1.1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, rr * 1.35, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke();
      vignette(ctx, W, H, 0.5);
    }
  };
}

export const ANIMS = [
  { id: 'bubbles',  name: 'Gelembung Neon', tag: 'Cairan & gelembung', accent: '#3ef2ff', accent2: '#1f6dff', make: bubbles },
  { id: 'ring',     name: 'Cincin Plasma',  tag: 'Neon futuristik',    accent: '#ff4fd8', accent2: '#8a5cff', make: ring },
  { id: 'lightning',name: 'Petir',          tag: 'Sambaran listrik',   accent: '#ffd84a', accent2: '#8c6bff', make: lightning },
  { id: 'waves',    name: 'Ombak Samudra',  tag: 'Gelombang tenang',   accent: '#2fe0e6', accent2: '#0d63a8', make: waves },
  { id: 'galaxy',   name: 'Galaksi',        tag: 'Pusaran bintang',    accent: '#ffcf7a', accent2: '#c08bff', make: galaxy },
  { id: 'matrix',   name: 'Matrix',         tag: 'Hujan kode digital', accent: '#2bff7a', accent2: '#118a3d', make: matrix },
  { id: 'fire',     name: 'Api Phoenix',    tag: 'Kobaran api',        accent: '#ff9f1c', accent2: '#d62828', make: fire },
  { id: 'hex',      name: 'Sarang Kristal', tag: 'Heksagon menyala',   accent: '#8ffcff', accent2: '#7dff6a', make: hexgrid },
  { id: 'aurora',   name: 'Aurora',         tag: 'Cahaya kutub',       accent: '#3dff9e', accent2: '#b56bff', make: aurora },
  { id: 'orb',      name: 'Orb Energi',     tag: 'Plasma berdenyut',   accent: '#ff4fd8', accent2: '#7a2cff', make: orb },
];
export const animById = id => ANIMS.find(a => a.id === id) || ANIMS[0];
