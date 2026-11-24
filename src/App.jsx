import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Zap, Home, Sparkles, Settings as Gear, Check, ChevronRight, Play, Shuffle, Layers, BatteryCharging, Bell,
  ShieldCheck, Info, Volume2, Vibrate, Clock, Hand, Smartphone, X, Thermometer, Activity, Power, ExternalLink,
} from 'lucide-react';
import AnimCanvas from './AnimCanvas.jsx';
import ChargeScreen from './ChargeScreen.jsx';
import { ANIMS, animById } from './anims.js';
import { Charge, fmtDuration } from './bridge.js';
import { loadSettings, saveSettings, SOUNDS } from './settings.js';
import { audio } from './lib/audio.js';
import { haptics } from './lib/haptics.js';
import { native } from './lib/native.js';

/* ── small UI pieces ─────────────────────────────── */
function Toggle({ on, onChange, big }) {
  return <button className={'toggle' + (on ? ' on' : '') + (big ? ' big' : '')} onClick={e => { e.stopPropagation(); onChange(!on); }} aria-pressed={on}><i /></button>;
}
function Row({ icon: I, title, sub, children, onClick }) {
  return (
    <div className={'row' + (onClick ? ' tap' : '')} onClick={onClick}>
      {I && <div className="row-ic"><I size={19} /></div>}
      <div className="row-txt"><div className="row-t">{title}</div>{sub && <div className="row-s">{sub}</div>}</div>
      {children}
    </div>
  );
}
function Chips({ value, options, onChange }) {
  return <div className="chips">{options.map(([v, l]) => <button key={v} className={'chip' + (v === value ? ' on' : '')} onClick={() => onChange(v)}>{l}</button>)}</div>;
}

/* ── brand-specific tips ─────────────────────────── */
function brandTips(m = '') {
  m = m.toLowerCase();
  if (/xiaomi|redmi|poco/.test(m)) return ['Setelan › Aplikasi › Kelola aplikasi › Animasi Cas › aktifkan "Mulai otomatis".', 'Di menu yang sama buka "Izin lainnya" lalu izinkan "Tampilkan di layar kunci" dan "Tampilkan jendela pop-up saat berjalan di latar belakang".', 'Penghemat baterai: pilih "Tidak ada pembatasan".'];
  if (/oppo|realme|oneplus/.test(m)) return ['Setelan › Aplikasi › Animasi Cas › Penggunaan baterai › izinkan "Aktivitas latar belakang" dan "Mulai otomatis".', 'Izinkan "Tampilkan di atas aplikasi lain".', 'Kunci aplikasi di menu Terbaru (tarik kartunya ke bawah) agar tidak ditutup sistem.'];
  if (/vivo|iqoo/.test(m)) return ['i Manager › Manajer aplikasi › Mulai otomatis › aktifkan Animasi Cas.', 'Setelan › Baterai › Konsumsi daya latar belakang tinggi › izinkan Animasi Cas.', 'Izinkan "Tampilkan di layar kunci" dan "Jendela mengambang".'];
  if (/samsung/.test(m)) return ['Setelan › Baterai › Batas penggunaan latar belakang › tambahkan Animasi Cas ke "Aplikasi yang tidak pernah tidur".', 'Izinkan "Tampilkan di atas aplikasi lain".'];
  if (/huawei|honor/.test(m)) return ['Setelan › Baterai › Peluncuran aplikasi › Animasi Cas › kelola manual, aktifkan semua.', 'Izinkan "Tampilkan di atas aplikasi lain".'];
  if (/infinix|tecno|itel/.test(m)) return ['Phone Master › Mulai otomatis › aktifkan Animasi Cas.', 'Izinkan "Tampilkan di atas aplikasi lain" dan matikan optimasi baterai.'];
  return ['Izinkan "Tampilkan di atas aplikasi lain".', 'Matikan optimasi baterai untuk Animasi Cas.', 'Jika HP punya menu "Mulai otomatis" atau "Autostart", aktifkan untuk Animasi Cas.'];
}

/* ── Permission checklist ────────────────────────── */
function Permissions({ status, refresh, compact }) {
  const items = [
    { k: 'overlay', icon: Layers, t: 'Tampil di atas aplikasi lain', s: 'Wajib agar animasi langsung muncul saat dicas', go: () => Charge.openOverlaySettings() },
    { k: 'battery', icon: BatteryCharging, t: 'Tanpa optimasi baterai', s: 'Supaya tidak dimatikan sistem di latar belakang', go: () => Charge.openBatterySettings() },
    { k: 'notifications', icon: Bell, t: 'Notifikasi', s: 'Untuk layanan latar & cadangan layar penuh', go: () => Charge.requestNotifications() },
  ];
  const list = compact ? items.filter(i => !status?.[i.k]) : items;
  if (!list.length) return null;
  return (
    <div className="card perm">
      <div className="card-h"><ShieldCheck size={18} /> {compact ? 'Perlu izin' : 'Izin aplikasi'}</div>
      {list.map(i => (
        <Row key={i.k} icon={i.icon} title={i.t} sub={i.s} onClick={!status?.[i.k] ? async () => { haptics.tap(); await i.go(); setTimeout(refresh, 800); } : undefined}>
          {status?.[i.k] ? <span className="ok"><Check size={16} /></span> : <span className="btn-mini">Izinkan</span>}
        </Row>
      ))}
    </div>
  );
}

/* ── Home ─────────────────────────────────────────── */
function HomeTab({ s, battery, status, enabled, setEnabled, refresh, go, openPreview }) {
  const anim = animById(s.anim);
  const b = battery || {};
  return (
    <div className="page">
      <header className="top"><div className="logo"><Zap size={20} fill="currentColor" /></div><h1>Animasi Cas</h1></header>

      <div className={'card master' + (enabled ? ' on' : '')}>
        <div className="master-txt">
          <b>{enabled ? 'Aktif' : 'Nonaktif'}</b>
          <span>{enabled ? 'Animasi muncul otomatis saat charger dicolok' : 'Nyalakan untuk menampilkan animasi saat dicas'}</span>
        </div>
        <Toggle big on={enabled} onChange={setEnabled} />
      </div>

      <div className="card batt">
        <div className="batt-l">
          <div className="batt-pct">{b.level ?? '—'}<small>%</small></div>
          <div className={'batt-st' + (b.charging ? ' chg' : '')}>{b.charging ? <><Zap size={14} fill="currentColor" /> {b.full ? 'Penuh' : 'Sedang mengisi'}</> : 'Tidak dicas'}</div>
        </div>
        <div className="batt-r">
          <div><Activity size={14} /><span>{b.charging && b.watts ? `${b.watts} W` : '—'}</span></div>
          <div><Thermometer size={14} /><span>{b.temperature ? `${b.temperature.toFixed(1)} °C` : '—'}</span></div>
          <div><Clock size={14} /><span>{b.charging && !b.full ? fmtDuration(b.remainingMs) || '—' : '—'}</span></div>
        </div>
        <div className="batt-bar"><i style={{ width: `${b.level || 0}%` }} /></div>
      </div>

      <Permissions compact status={status} refresh={refresh} />

      <div className="card cur" onClick={() => go('anim')}>
        <div className="cur-prev"><AnimCanvas animId={anim.id} level={b.level ?? 60} lite /></div>
        <div className="cur-info">
          <span className="eyebrow">{s.random ? 'Acak tiap dicas' : 'Animasi dipakai'}</span>
          <b>{s.random ? 'Mode acak' : anim.name}</b>
          <span className="dim">{s.random ? '10 animasi bergantian' : anim.tag}</span>
          <div className="cur-btns">
            <button className="btn" onClick={e => { e.stopPropagation(); go('anim'); }}>Ganti</button>
            <button className="btn primary" onClick={e => { e.stopPropagation(); openPreview(); }}><Play size={15} fill="currentColor" /> Coba</button>
          </div>
        </div>
      </div>

      <div className="card note">
        <div className="card-h"><Info size={18} /> Soal animasi bawaan HP</div>
        <p>Android tidak mengizinkan aplikasi mana pun mematikan animasi cas bawaan sistem. Sebagai gantinya, Animasi Cas langsung <b>menutupinya</b> dengan animasi layar penuh begitu charger dicolok — jadi yang terlihat animasi pilihanmu.</p>
        <p className="dim">Di beberapa HP (Xiaomi, Oppo, Vivo, dll.) kamu juga bisa mematikan efek bawaan lewat Setelan › Layar kunci / Tema. Lihat tips sesuai HP-mu di Setelan.</p>
      </div>
    </div>
  );
}

/* ── Gallery ──────────────────────────────────────── */
function AnimTab({ s, set, battery, onPick }) {
  return (
    <div className="page">
      <header className="top"><h1>Pilih Animasi</h1><span className="count">10</span></header>
      <div className="card"><Row icon={Shuffle} title="Acak tiap dicas" sub="Animasi berganti otomatis setiap charger dicolok"><Toggle on={s.random} onChange={v => set({ random: v })} /></Row></div>
      <div className="grid">
        {ANIMS.map((a, i) => (
          <button key={a.id} className={'tile' + (!s.random && s.anim === a.id ? ' sel' : '')} style={{ '--ac': a.accent }} onClick={() => onPick(a.id)}>
            <AnimCanvas animId={a.id} level={battery?.level ?? 65} lite />
            <div className="tile-num">{String(i + 1).padStart(2, '0')}</div>
            {!s.random && s.anim === a.id && <div className="tile-sel"><Check size={14} strokeWidth={3} /></div>}
            <div className="tile-cap"><b>{a.name}</b><span>{a.tag}</span></div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Settings ─────────────────────────────────────── */
function SettingsTab({ s, set, status, refresh }) {
  const tips = brandTips(status?.manufacturer);
  const brand = status?.manufacturer ? status.manufacturer.charAt(0).toUpperCase() + status.manufacturer.slice(1) : 'HP-mu';
  return (
    <div className="page">
      <header className="top"><h1>Setelan</h1></header>

      <div className="sec">Tampilan animasi</div>
      <div className="card">
        <Row icon={Clock} title="Durasi tampil" sub="Setelah itu animasi menutup sendiri" />
        <Chips value={s.duration} onChange={v => set({ duration: v })} options={[[5, '5 dtk'], [10, '10 dtk'], [30, '30 dtk'], [0, 'Sampai dicabut']]} />
        <Row icon={Hand} title="Cara menutup" />
        <Chips value={s.closeMode} onChange={v => set({ closeMode: v })} options={[['double', 'Ketuk 2×'], ['single', 'Ketuk 1×']]} />
        <Row icon={Clock} title="Tampilkan jam & tanggal"><Toggle on={s.showClock} onChange={v => set({ showClock: v })} /></Row>
        <Row icon={Activity} title="Tampilkan info daya" sub="Watt, suhu, perkiraan waktu penuh"><Toggle on={s.showStats} onChange={v => set({ showStats: v })} /></Row>
        <Row icon={Smartphone} title="Muncul saat HP sedang dipakai" sub="Jika mati, animasi hanya muncul saat layar terkunci/mati"><Toggle on={s.showWhenUsing} onChange={v => set({ showWhenUsing: v })} /></Row>
      </div>

      <div className="sec">Suara & getar</div>
      <div className="card">
        <Row icon={Volume2} title="Suara saat dicolok" />
        <div className="chips">
          {SOUNDS.map(o => <button key={o.id} className={'chip' + (s.sound === o.id ? ' on' : '')} onClick={() => { set({ sound: o.id }); if (o.id !== 'none') audio.play(o.id, { volume: s.volume }); }}>{o.name}</button>)}
        </div>
        <Row icon={Volume2} title="Volume" sub={`${Math.round(s.volume * 100)}%`} />
        <input className="slider" type="range" min="0" max="1" step="0.05" value={s.volume} style={{ '--v': s.volume * 100 + '%' }}
          onChange={e => set({ volume: +e.target.value })} onPointerUp={() => s.sound !== 'none' && audio.play(s.sound, { volume: s.volume })} />
        <Row icon={Vibrate} title="Getar saat dicolok"><Toggle on={s.vibrate} onChange={v => set({ vibrate: v })} /></Row>
        <Row icon={Volume2} title="Suara tombol aplikasi"><Toggle on={s.uiSound} onChange={v => set({ uiSound: v })} /></Row>
        <Row icon={Vibrate} title="Getar tombol aplikasi"><Toggle on={haptics.isEnabled()} onChange={v => { haptics.setEnabled(v); set({}); }} /></Row>
      </div>

      <div className="sec">Izin & {brand}</div>
      <Permissions status={status} refresh={refresh} />
      <div className="card note">
        <div className="card-h"><Smartphone size={18} /> Tips untuk {brand}</div>
        <ol>{tips.map((t, i) => <li key={i}>{t}</li>)}</ol>
        <button className="btn wide" onClick={() => Charge.openAppSettings()}><ExternalLink size={15} /> Buka info aplikasi</button>
      </div>

      <div className="sec">Tentang</div>
      <div className="card note">
        <p><b>Animasi Cas</b> · 10 animasi pengisian daya. Berjalan sebagai layanan kecil di latar belakang yang hanya mendengarkan saat charger dicolok/dicabut — hemat baterai.</p>
        <p className="dim">Animasi bawaan sistem tidak bisa dimatikan oleh aplikasi; Animasi Cas menampilkan animasinya di atas layar kunci untuk menutupinya.</p>
      </div>
    </div>
  );
}

/* ── Onboarding ───────────────────────────────────── */
function Onboarding({ status, refresh, done }) {
  const [step, setStep] = useState(0);
  return (
    <div className="onb">
      <div className="onb-bg"><AnimCanvas animId={step === 0 ? 'ring' : 'aurora'} level={72} /></div>
      <div className="onb-body">
        {step === 0 ? (<>
          <div className="onb-logo"><Zap size={34} fill="currentColor" /></div>
          <h1>Animasi Cas</h1>
          <p>Ganti tampilan cas baterai yang membosankan dengan <b>10 animasi keren</b> — muncul otomatis saat charger dicolok, bahkan di layar kunci.</p>
          <button className="btn primary wide" onClick={() => { haptics.tap(); setStep(1); }}>Lanjut <ChevronRight size={18} /></button>
        </>) : (<>
          <h2>Beri izin dulu, ya</h2>
          <p className="dim">Agar animasi bisa tampil di atas layar dan tetap jalan di latar belakang.</p>
          <Permissions status={status} refresh={refresh} />
          <button className="btn primary wide" onClick={() => { haptics.tap(); done(); }}>{status?.overlay ? 'Mulai' : 'Lewati dulu'} <ChevronRight size={18} /></button>
        </>)}
      </div>
    </div>
  );
}

/* ── App ──────────────────────────────────────────── */
export default function App() {
  const [s, setS] = useState(loadSettings);
  const [tab, setTab] = useState('home');
  const [battery, setBattery] = useState(null);
  const [status, setStatus] = useState(null);
  const [enabled, setEn] = useState(true);
  const [preview, setPreview] = useState(null); // { id, pick: bool }
  const [toast, setToast] = useState(null);
  const sRef = useRef(s); sRef.current = s;

  const set = useCallback(p => { const n = { ...sRef.current, ...p }; setS(n); saveSettings(n); if (n.uiSound) audio.play('ui_tap', { volume: 0.5 }); haptics.tap(); }, []);
  const toastT = useRef(0);
  const say = m => { setToast(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(null), 2200); };

  const refresh = useCallback(async () => { try { const st = await Charge.getStatus(); setStatus(st); setEn(st.enabled); } catch { /* ignore */ } }, []);

  useEffect(() => {
    saveSettings(sRef.current);
    refresh();
    Charge.getBattery().then(setBattery).catch(() => {});
    let h; Charge.addListener('battery', setBattery).then(x => (h = x));
    native.onResume(refresh);
    native.toast = m => say(m === 'Press back again to exit' ? 'Tekan kembali sekali lagi untuk keluar' : m);
    native.hideSplash();
    return () => h?.remove();
  }, []);

  // back button: close preview → go home → exit
  useEffect(() => native.onBack(() => {
    if (preview) { setPreview(null); return true; }
    if (tab !== 'home') { setTab('home'); return true; }
    return false;
  }), [preview, tab]);

  const setEnabled = async on => {
    haptics.tap(); if (s.uiSound) audio.play(on ? 'ui_on' : 'ui_off', { volume: 0.6 });
    setEn(on); await Charge.setEnabled({ enabled: on }).catch(() => {}); refresh();
    say(on ? 'Animasi cas aktif' : 'Animasi cas dimatikan');
  };
  const go = t => { if (s.uiSound) audio.play('ui_select', { volume: 0.45 }); haptics.tap(); setTab(t); };
  const openPreview = (id, pick = false) => {
    if (s.uiSound && !pick) audio.play('ui_open', { volume: 0.5 });
    if (s.sound !== 'none') audio.play(s.sound, { volume: s.volume });
    setPreview({ id: id || (s.random ? null : s.anim), pick });
  };
  const fullscreenTest = () => { haptics.tap(); Charge.preview(); };

  if (!s.onboarded) return <Onboarding status={status} refresh={refresh} done={() => set({ onboarded: true })} />;

  const previewBattery = battery?.charging ? battery : { ...(battery || {}), level: battery?.level ?? 64, charging: true, plugged: 'ac', watts: 18.2, temperature: battery?.temperature || 33.5, remainingMs: Math.max(0, (100 - (battery?.level ?? 64)) * 50000) };

  return (
    <div className="app">
      <main className="scroll" key={tab}>
        {tab === 'home' && <HomeTab s={s} battery={battery} status={status} enabled={enabled} setEnabled={setEnabled} refresh={refresh} go={go} openPreview={() => openPreview()} />}
        {tab === 'anim' && <AnimTab s={s} set={set} battery={battery} onPick={id => openPreview(id, true)} />}
        {tab === 'set' && <SettingsTab s={s} set={set} status={status} refresh={refresh} />}
      </main>

      <nav className="nav">
        {[['home', Home, 'Beranda'], ['anim', Sparkles, 'Animasi'], ['set', Gear, 'Setelan']].map(([k, I, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}><I size={22} /><span>{l}</span></button>
        ))}
      </nav>

      {preview && (
        <div className="overlay">
          <ChargeScreen settings={{ ...s, duration: preview.pick ? 0 : s.duration }} battery={previewBattery} animId={preview.id} preview onClose={() => setPreview(null)}
            footer={(
              <div className="pv-bar" onPointerUp={e => e.stopPropagation()}>
                <button className="btn ghost" onClick={() => setPreview(null)}><X size={18} /></button>
                {preview.pick
                  ? <button className="btn primary wide" onClick={() => { set({ anim: preview.id, random: false }); if (s.uiSound) audio.play('ui_on', { volume: 0.6 }); setPreview(null); say(`${animById(preview.id).name} dipakai`); }}><Check size={18} /> Pakai animasi ini</button>
                  : <button className="btn primary wide" onClick={fullscreenTest}><Power size={16} /> Uji di layar kunci</button>}
              </div>
            )} />
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
