import { useEffect, useRef } from 'react';
import { animById } from './anims.js';

// Runs one animation on a canvas. `level` is eased toward its target every frame.
// `lite` = gallery thumbnail: DPR 1, ~30 fps, paused when scrolled off-screen.
export default function AnimCanvas({ animId, level = 50, charging = true, fast = false, full = false, lite = false, className = '' }) {
  const ref = useRef(null);
  const live = useRef({ level, charging, fast, full });
  live.current.target = level; live.current.charging = charging; live.current.fast = fast; live.current.full = full;

  useEffect(() => {
    const cv = ref.current, ctx = cv.getContext('2d', { alpha: false });
    const anim = animById(animId).make(ctx);
    let W = 0, H = 0, raf = 0, last = performance.now(), visible = true, acc = 0;
    const s = { level: Math.max(0, level - (lite ? 0 : 15)), charging, fast, full };
    const resize = () => {
      const r = cv.getBoundingClientRect(), dpr = lite ? 1 : Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); anim.resize(W, H);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);
    let io;
    if (lite && 'IntersectionObserver' in window) { io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 }); io.observe(cv); }
    const loop = now => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!visible || document.hidden) return;
      if (lite) { acc += dt; if (acc < 1 / 30) return; }
      const step = lite ? acc : dt; acc = 0;
      const L = live.current; s.level += (L.target - s.level) * Math.min(1, step * 2.2);
      s.charging = L.charging; s.fast = L.fast; s.full = L.full;
      ctx.save(); anim.frame(now / 1000, step, s); ctx.restore();
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io?.disconnect(); };
  }, [animId, lite]);

  return <canvas ref={ref} className={'anim-canvas ' + className} />;
}
