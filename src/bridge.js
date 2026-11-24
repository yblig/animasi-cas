// JS side of the native ChargeBridge plugin, with a simulated web fallback
// so the UI can be previewed in a browser.
import { Capacitor, registerPlugin } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const qs = new URLSearchParams(location.search);

function webStub() {
  let level = Number(qs.get('level') ?? 47), listeners = [];
  const plugged = qs.get('plugged') ?? 'ac';
  const fast = qs.get('fast') !== '0';
  const snap = () => ({
    level: Math.floor(level), plugged, charging: plugged !== 'none', full: level >= 100,
    temperature: 33.4, voltage: 4.21, currentMa: fast ? 3150 : 1400, watts: fast ? 18.4 : 7.5,
    remainingMs: Math.max(0, (100 - level) * 52000),
  });
  setInterval(() => { if (plugged !== 'none' && level < 100) level += 0.05; listeners.forEach(f => f(snap())); }, 2000);
  let enabled = true;
  return {
    async getBattery() { return snap(); },
    async getMode() { return { mode: qs.get('mode') === 'charge' ? 'charge' : 'main', preview: qs.get('preview') === '1' }; },
    async getStatus() { return { overlay: qs.get('perm') !== '0', battery: qs.get('perm') !== '0', notifications: true, running: enabled, enabled, manufacturer: 'Xiaomi', sdk: 34 }; },
    async setConfig() {}, async setEnabled({ enabled: e }) { enabled = e; return { enabled }; },
    async openOverlaySettings() {}, async openBatterySettings() {}, async openAppSettings() {}, async requestNotifications() {},
    async preview() { const u = new URL(location.href); u.searchParams.set('mode', 'charge'); u.searchParams.set('preview', '1'); location.href = u.toString(); },
    async close() { const u = new URL(location.href); u.searchParams.delete('mode'); u.searchParams.delete('preview'); location.href = u.toString(); },
    addListener(ev, fn) { if (ev === 'battery') listeners.push(fn); return Promise.resolve({ remove() { listeners = listeners.filter(f => f !== fn); } }); },
  };
}

export const Charge = isNative ? registerPlugin('ChargeBridge') : webStub();
export { isNative };

export function fmtDuration(ms) {
  if (!ms || ms <= 0) return null;
  const m = Math.round(ms / 60000), h = Math.floor(m / 60), r = m % 60;
  return h ? `${h} j ${r} mnt` : `${r} mnt`;
}
