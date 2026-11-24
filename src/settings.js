import { storage } from './lib/storage.js';
import { Charge } from './bridge.js';

export const DEFAULTS = {
  anim: 'bubbles',
  random: false,          // acak tiap kali dicas
  duration: 10,           // detik; 0 = sampai dicabut
  closeMode: 'double',    // 'single' | 'double'
  showClock: true,
  showStats: true,
  showWhenUsing: true,
  sound: 'plug_chime',    // atau 'none'
  volume: 0.8,
  vibrate: true,
  uiSound: true,
  onboarded: false,
};

export function loadSettings() { return { ...DEFAULTS, ...storage.get('settings', {}) }; }
export function saveSettings(s) {
  storage.set('settings', s);
  Charge.setConfig({ sound: s.sound, vibrate: s.vibrate, showWhenUsing: s.showWhenUsing, volume: s.volume }).catch(() => {});
}

export const SOUNDS = [
  { id: 'plug_chime', name: 'Lonceng' },
  { id: 'plug_power', name: 'Power Up' },
  { id: 'plug_scifi', name: 'Sci-Fi' },
  { id: 'plug_crystal', name: 'Kristal' },
  { id: 'none', name: 'Tanpa suara' },
];
