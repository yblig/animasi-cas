package com.yblig.animasicas;

import android.app.KeyguardManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

/** Keeps a power-connected receiver alive and launches the charging animation. */
public class ChargeService extends Service {
    static final String CH_SERVICE = "service";
    static final String CH_ALERT = "charge_alert";
    static volatile boolean running = false;
    private long lastShow = 0;
    private MediaPlayer player;

    static void start(Context c) {
        try { ContextCompat.startForegroundService(c, new Intent(c, ChargeService.class)); } catch (Exception ignored) {}
    }
    static void stop(Context c) { c.stopService(new Intent(c, ChargeService.class)); }

    private final BroadcastReceiver power = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            if (Intent.ACTION_POWER_CONNECTED.equals(intent.getAction())) onPlugged();
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createChannels();
        Notification n = new NotificationCompat.Builder(this, CH_SERVICE)
                .setSmallIcon(android.R.drawable.ic_lock_idle_charging)
                .setContentTitle("Animasi Cas aktif")
                .setContentText("Animasi akan tampil saat charger dicolok")
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setContentIntent(openApp())
                .build();
        int type = Build.VERSION.SDK_INT >= 34 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE : 0;
        ServiceCompat.startForeground(this, 1, n, type);
        IntentFilter f = new IntentFilter();
        f.addAction(Intent.ACTION_POWER_CONNECTED);
        f.addAction(Intent.ACTION_POWER_DISCONNECTED);
        ContextCompat.registerReceiver(this, power, f, ContextCompat.RECEIVER_EXPORTED);
        running = true;
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) { return START_STICKY; }
    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        running = false;
        try { unregisterReceiver(power); } catch (Exception ignored) {}
        if (player != null) { player.release(); player = null; }
        super.onDestroy();
    }

    private PendingIntent openApp() {
        Intent i = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(this, 0, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private void createChannels() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        NotificationChannel s = new NotificationChannel(CH_SERVICE, "Layanan latar", NotificationManager.IMPORTANCE_MIN);
        s.setShowBadge(false);
        nm.createNotificationChannel(s);
        NotificationChannel a = new NotificationChannel(CH_ALERT, "Animasi saat dicolok", NotificationManager.IMPORTANCE_HIGH);
        a.setSound(null, null); a.enableVibration(false);
        nm.createNotificationChannel(a);
    }

    private void onPlugged() {
        if (!Prefs.enabled(this)) return;
        long now = SystemClock.elapsedRealtime();
        if (now - lastShow < 2500) return; // ignore flickering connectors
        lastShow = now;
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
        boolean inUse = pm != null && pm.isInteractive() && km != null && !km.isKeyguardLocked();
        if (inUse && !Prefs.showWhenUsing(this)) return;
        playSound();
        vibrate();
        Intent i = new Intent(this, ChargeActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NO_ANIMATION);
        boolean canStart = Build.VERSION.SDK_INT < 29 || Settings.canDrawOverlays(this);
        if (canStart) {
            try { startActivity(i); return; } catch (Exception ignored) {}
        }
        // Fallback: full-screen intent notification.
        PendingIntent pi = PendingIntent.getActivity(this, 2, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new NotificationCompat.Builder(this, CH_ALERT)
                .setSmallIcon(android.R.drawable.ic_lock_idle_charging)
                .setContentTitle("Mengisi daya ⚡")
                .setContentText("Ketuk untuk melihat animasi cas")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setAutoCancel(true)
                .setTimeoutAfter(15000)
                .setContentIntent(pi)
                .setFullScreenIntent(pi, true)
                .build();
        try { ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).notify(2, n); } catch (Exception ignored) {}
    }

    private void playSound() {
        String s = Prefs.sound(this);
        if (s == null || s.equals("off") || s.equals("none")) return;
        try {
            if (player != null) { player.release(); player = null; }
            AssetFileDescriptor fd = getAssets().openFd("public/audio/" + s + ".wav");
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            player.setDataSource(fd.getFileDescriptor(), fd.getStartOffset(), fd.getLength());
            fd.close();
            float v = Prefs.volume(this);
            player.setVolume(v, v);
            player.setOnCompletionListener(mp -> { mp.release(); if (player == mp) player = null; });
            player.prepare();
            player.start();
        } catch (Exception ignored) {}
    }

    private void vibrate() {
        if (!Prefs.vibrate(this)) return;
        try {
            Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (v == null) return;
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(new long[]{0, 40, 70, 90}, -1));
            else v.vibrate(new long[]{0, 40, 70, 90}, -1);
        } catch (Exception ignored) {}
    }
}
