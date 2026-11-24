# Animasi Cas — DESIGN

**Konsep:** Aplikasi animasi pengisian daya. Saat charger dicolok, layar menyala dan menampilkan animasi layar penuh yang keren (10 pilihan) lengkap dengan persen baterai, daya (watt), suhu, dan perkiraan waktu penuh — di atas layar kunci maupun saat HP dipakai.

**Interpretasi brief**
- "Nonaktifkan bawaan HP": Android tidak mengizinkan aplikasi mematikan animasi cas bawaan sistem (milik SystemUI/merek HP). Solusinya: animasi kita tampil layar penuh **menutupi** animasi bawaan. Aplikasi menjelaskan ini dengan jujur di Setelan + memberi tips per merek.
- Bahasa: Indonesia.

## Cara kerja (native)
- `ChargeService` — foreground service (`specialUse`) yang mendaftarkan receiver `POWER_CONNECTED/DISCONNECTED` (receiver implisit tidak bisa lewat manifest sejak Android 8).
- Saat dicolok: putar suara (MediaPlayer dari `public/audio`), getar, lalu buka `ChargeActivity` (BridgeActivity kedua: `showWhenLocked`, `turnScreenOn`, immersive, keep-screen-on). Butuh izin **Tampil di atas aplikasi lain** (pengecualian start-activity-dari-latar). Cadangan: notifikasi full-screen intent.
- `ChargeActivity` menutup sendiri saat charger dicabut. JS menutup lewat `ChargeBridge.close()` (ketuk 2x / durasi habis).
- `BootReceiver` menyalakan ulang layanan setelah HP restart / app diperbarui.
- Plugin `ChargeBridge`: mode, config, status izin, buka setelan izin, data baterai live (level, status, colokan, suhu, tegangan, arus → watt, waktu sampai penuh).

## Layar
1. **Onboarding** (sekali): 3 slide + langkah izin.
2. **Beranda**: sakelar utama, kartu baterai live, animasi terpilih (pratinjau hidup) + Coba layar penuh, checklist izin, info animasi bawaan.
3. **Animasi**: galeri 10 kartu dengan pratinjau hidup → pratinjau layar penuh → Pakai.
4. **Setelan**: durasi tampil, cara menutup, jam & tanggal, info daya, muncul saat HP dipakai, suara colok (5 pilihan) + pratinjau, getar, suara/getar tombol, tips merek HP, tentang.
5. **Layar Cas** (ChargeActivity): animasi + HUD persen (count-up), status, watt, suhu, waktu penuh, jam.

## 10 animasi
| # | Nama | Ide |
|---|---|---|
| 1 | Gelembung Neon | cairan naik sesuai persen + gelembung |
| 2 | Cincin Plasma | cincin progres bercahaya + percikan mengorbit |
| 3 | Petir | baterai + kilat listrik menyambar |
| 4 | Ombak Samudra | gelombang berlapis mengisi layar |
| 5 | Galaksi | pusaran partikel spiral |
| 6 | Matrix | hujan kode digital |
| 7 | Api Phoenix | partikel api naik |
| 8 | Sarang Kristal | grid heksagon menyala |
| 9 | Aurora | tirai aurora + bintang |
| 10 | Orb Energi | gumpalan plasma (metaball) + sinar |

## Art direction
Palet "Night Circuit": bg `#06081a`, panel `#10152f`, garis `#222a52`, teks `#eef2ff`, redup `#8b93c7`, cyan `#3ef2ff`, lime `#7dff6a`, magenta `#ff4fd8`, emas `#ffc84a`, merah `#ff5470`. Sudut membulat 20–28px, kaca gelap, glow neon. Font: Outfit (UI & angka).

## Audio
SFX (`audio/sfx.json`): ui_tap, ui_on, ui_off, ui_open, ui_select, plug_chime, plug_power, plug_scifi, plug_crystal. Tanpa musik (aplikasi utilitas).

## Disimpan
Preferences (JS): animasi terpilih, durasi, cara tutup, jam, info, suara/getar UI, onboarding selesai. SharedPreferences (native, lewat plugin): enabled, sound, vibrate, showWhenUsing.
