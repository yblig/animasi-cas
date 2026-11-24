package com.yblig.animasicas;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/** Full-screen charging animation shown over the lock screen. */
public class ChargeActivity extends BridgeActivity {
    private final BroadcastReceiver unplug = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) { finishAndRemoveTask(); }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ChargeBridgePlugin.class);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        super.onCreate(savedInstanceState);
        hideBars();
        ContextCompat.registerReceiver(this, unplug, new IntentFilter(Intent.ACTION_POWER_DISCONNECTED), ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }

    private void hideBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    @Override
    public void onDestroy() {
        try { unregisterReceiver(unplug); } catch (Exception ignored) {}
        super.onDestroy();
    }
}
