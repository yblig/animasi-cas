import { useEffect, useMemo, useRef, useState } from 'react';
import { Zap, Thermometer, Hourglass, Plug, Wifi, Usb } from 'lucide-react';
import AnimCanvas from './AnimCanvas.jsx';
import { ANIMS, animById } from './anims.js';
import { fmtDuration } from './bridge.js';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function useClock() {
  const [d, setD] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setD(new Date()), 1000); return () => clearInterval(i); }, []);
  return d;
}

function useCountUp(target, ms = 1300) {
  const [v, setV] = useState(() => Math.max(0, target - 15));
  const from = useRef(v);
  useEffect(() => {
    const start = performance.now(), a = from.current; let raf;
    const tick = now => { const k = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - k, 3); const x = a + (target - a) * e; setV(x); from.current = x; if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [target]);
  return Math.round(v);
}

export default function ChargeScreen({ settings, battery, animId, onClose, preview = false, footer = null }) {
  const id = useMemo(() => animId || (settings.random ? ANIMS[(Math.random() * ANIMS.length) | 0].id : settings.anim), [animId]);
  const anim = animById(id);
  const b = battery || { level: 50, charging: true, watts: 0 };
  const fast = (b.watts || 0) >= 12;
  const pct = useCountUp(b.level);
  const now = useClock();
  const [leaving, setLeaving] = useState(false);
  const lastTap = useRef(0);

  const close = () => { if (leaving) return; setLeaving(true); setTimeout(onClose, 420); };

  // auto-close after the chosen duration (not in gallery preview with a footer)
  useEffect(() => {
    if (footer || !settings.duration) return;
    const t = setTimeout(close, settings.duration * 1000);
    return () => clearTimeout(t);
  }, []);

  const onTap = () => {
    if (footer) return;
    if (settings.closeMode === 'single') return close();
    const n = performance.now(); if (n - lastTap.current < 380) close(); lastTap.current = n;
  };

  const status = b.full || b.level >= 100 ? 'Baterai penuh' : !b.charging ? 'Tidak mengisi' : fast ? 'Pengisian cepat' : 'Mengisi daya';
  const remain = fmtDuration(b.remainingMs);
  const PlugIcon = b.plugged === 'wireless' ? Wifi : b.plugged === 'usb' ? Usb : Plug;

  return (
    <div className={'charge' + (leaving ? ' leaving' : '')} onPointerUp={onTap} style={{ '--ac': anim.accent, '--ac2': anim.accent2 }}>
      <AnimCanvas animId={id} level={b.level} charging={b.charging} fast={fast} full={b.full} />
      <div className="charge-hud">
        {settings.showClock && (
          <div className="charge-clock">
            <div className="time">{String(now.getHours()).padStart(2, '0')}<span className="blink">:</span>{String(now.getMinutes()).padStart(2, '0')}</div>
            <div className="date">{HARI[now.getDay()]}, {now.getDate()} {BULAN[now.getMonth()]}</div>
          </div>
        )}
        <div className="charge-center">
          <div className="pct"><span>{pct}</span><small>%</small></div>
          <div className="status"><Zap size={18} className={fast ? 'bolt fast' : 'bolt'} fill="currentColor" />{status}</div>
        </div>
        {settings.showStats && (
          <div className="charge-stats">
            <div><PlugIcon size={16} /><b>{b.watts ? `${b.watts} W` : '—'}</b><span>Daya</span></div>
            <div><Thermometer size={16} /><b>{b.temperature ? `${b.temperature.toFixed(1)}°` : '—'}</b><span>Suhu</span></div>
            <div><Hourglass size={16} /><b>{b.full ? 'Penuh' : remain || '—'}</b><span>Sampai penuh</span></div>
          </div>
        )}
        {!footer && <div className="charge-hint">{preview ? 'Pratinjau · ' : ''}{settings.closeMode === 'single' ? 'Ketuk untuk menutup' : 'Ketuk 2× untuk menutup'}</div>}
        {footer}
      </div>
    </div>
  );
}
