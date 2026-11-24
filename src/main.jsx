import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/800.css';
import './theme.css';
import { storage } from './lib/storage.js';
import { native } from './lib/native.js';
import { audio } from './lib/audio.js';
import { Charge } from './bridge.js';
import { loadSettings } from './settings.js';
import App from './App.jsx';
import ChargeScreen from './ChargeScreen.jsx';

function ChargeMode({ preview }) {
  const [s] = useState(loadSettings);
  const [b, setB] = useState(null);
  useEffect(() => {
    Charge.getBattery().then(setB);
    let h; Charge.addListener('battery', x => { setB(x); if (!preview && !x.charging) Charge.close(); }).then(r => (h = r));
    native.onBack(() => { Charge.close(); return true; });
    native.hideSplash();
    return () => h?.remove();
  }, []);
  if (!b) return <div className="charge" />;
  return <ChargeScreen settings={s} battery={b} preview={preview} onClose={() => Charge.close()} />;
}

(async () => {
  await storage.init();
  await native.init();
  const { mode, preview } = await Charge.getMode().catch(() => ({ mode: 'main' }));
  const root = createRoot(document.getElementById('app'));
  if (mode === 'charge') {
    document.body.classList.add('is-charge');
    root.render(<ChargeMode preview={preview} />);
  } else {
    audio.load({ ui_tap: 'audio/ui_tap.wav', ui_on: 'audio/ui_on.wav', ui_off: 'audio/ui_off.wav', ui_open: 'audio/ui_open.wav', ui_select: 'audio/ui_select.wav',
      plug_chime: 'audio/plug_chime.wav', plug_power: 'audio/plug_power.wav', plug_scifi: 'audio/plug_scifi.wav', plug_crystal: 'audio/plug_crystal.wav' });
    root.render(<App />);
  }
})();
