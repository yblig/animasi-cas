package com.yblig.animasicas;

import android.Manifest;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ChargeBridge")
public class ChargeBridgePlugin extends Plugin {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Intent lastBattery;
    private boolean polling = false;

    private final BroadcastReceiver batteryRx = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            lastBattery = intent;
            notifyListeners("battery", batteryJson(), true);
        }
    };
    private final Runnable poll = new Runnable() {
        @Override public void run() {
            if (!polling) return;
            notifyListeners("battery", batteryJson(), true);
            handler.postDelayed(this, 2000);
        }
    };

    @Override
    public void load() {
        lastBattery = ContextCompat.registerReceiver(getContext(), batteryRx, new IntentFilter(Intent.ACTION_BATTERY_CHANGED), ContextCompat.RECEIVER_NOT_EXPORTED);
        polling = true;
        handler.postDelayed(poll, 1500);
    }

    @Override
    protected void handleOnDestroy() {
        polling = false;
        handler.removeCallbacksAndMessages(null);
        try { getContext().unregisterReceiver(batteryRx); } catch (Exception ignored) {}
    }

    private JSObject batteryJson() {
        JSObject o = new JSObject();
        Intent b = lastBattery;
        Context c = getContext();
        BatteryManager bm = (BatteryManager) c.getSystemService(Context.BATTERY_SERVICE);
        int level = 0, plugged = 0, status = 0, temp = 0, volt = 0;
        if (b != null) {
            int l = b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1), s = b.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
            level = l >= 0 && s > 0 ? Math.round(l * 100f / s) : 0;
            plugged = b.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0);
            status = b.getIntExtra(BatteryManager.EXTRA_STATUS, 0);
            temp = b.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0);
            volt = b.getIntExtra(BatteryManager.EXTRA_VOLTAGE, 0);
        }
        long current = 0;
        long remaining = -1;
        if (bm != null) {
            try { current = bm.getLongProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW); } catch (Exception ignored) {}
            if (Build.VERSION.SDK_INT >= 28) { try { remaining = bm.computeChargeTimeRemaining(); } catch (Exception ignored) {} }
        }
        long ma = Math.abs(current);
        if (ma > 20000) ma = ma / 1000; // µA -> mA (most devices); small values already mA
        double watts = volt > 0 ? (ma / 1000.0) * (volt / 1000.0) : 0;
        if (watts > 250) watts = 0;
        o.put("level", level);
        o.put("plugged", plugged == BatteryManager.BATTERY_PLUGGED_AC ? "ac" : plugged == BatteryManager.BATTERY_PLUGGED_USB ? "usb" : plugged == BatteryManager.BATTERY_PLUGGED_WIRELESS ? "wireless" : plugged > 0 ? "other" : "none");
        o.put("charging", status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL || plugged > 0);
        o.put("full", status == BatteryManager.BATTERY_STATUS_FULL || level >= 100);
        o.put("temperature", temp / 10.0);
        o.put("voltage", volt / 1000.0);
        o.put("currentMa", ma);
        o.put("watts", Math.round(watts * 10) / 10.0);
        o.put("remainingMs", remaining);
        return o;
    }

    @PluginMethod
    public void getBattery(PluginCall call) { call.resolve(batteryJson()); }

    @PluginMethod
    public void getMode(PluginCall call) {
        JSObject o = new JSObject();
        Activity a = getActivity();
        boolean charge = a instanceof ChargeActivity;
        o.put("mode", charge ? "charge" : "main");
        o.put("preview", charge && a.getIntent() != null && a.getIntent().getBooleanExtra("preview", false));
        call.resolve(o);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        Context c = getContext();
        JSObject o = new JSObject();
        o.put("overlay", Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(c));
        PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
        o.put("battery", Build.VERSION.SDK_INT < 23 || (pm != null && pm.isIgnoringBatteryOptimizations(c.getPackageName())));
        o.put("notifications", NotificationManagerCompat.from(c).areNotificationsEnabled());
        o.put("running", ChargeService.running);
        o.put("enabled", Prefs.enabled(c));
        o.put("manufacturer", Build.MANUFACTURER);
        o.put("sdk", Build.VERSION.SDK_INT);
        call.resolve(o);
    }

    @PluginMethod
    public void setConfig(PluginCall call) {
        SharedPreferences.Editor e = Prefs.get(getContext()).edit();
        if (call.hasOption("sound")) e.putString("sound", call.getString("sound"));
        if (call.hasOption("vibrate")) e.putBoolean("vibrate", Boolean.TRUE.equals(call.getBoolean("vibrate")));
        if (call.hasOption("showWhenUsing")) e.putBoolean("showWhenUsing", Boolean.TRUE.equals(call.getBoolean("showWhenUsing")));
        if (call.hasOption("volume")) e.putFloat("volume", call.getFloat("volume", 0.8f));
        e.apply();
        call.resolve();
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        Prefs.get(getContext()).edit().putBoolean("enabled", on).apply();
        if (on) ChargeService.start(getContext()); else ChargeService.stop(getContext());
        JSObject o = new JSObject(); o.put("enabled", on); call.resolve(o);
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        Context c = getContext();
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + c.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); c.startActivity(i);
        } catch (Exception e) { openDetails(c); }
        call.resolve();
    }

    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        Context c = getContext();
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + c.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); c.startActivity(i);
        } catch (Exception e) {
            try { Intent i = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS); i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); c.startActivity(i); }
            catch (Exception e2) { openDetails(c); }
        }
        call.resolve();
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) { openDetails(getContext()); call.resolve(); }

    private void openDetails(Context c) {
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + c.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); c.startActivity(i);
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void requestNotifications(PluginCall call) {
        Activity a = getActivity();
        if (Build.VERSION.SDK_INT >= 33 && a != null && ContextCompat.checkSelfPermission(a, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(a, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7001);
        } else openDetails(getContext());
        call.resolve();
    }

    @PluginMethod
    public void preview(PluginCall call) {
        Context c = getContext();
        Intent i = new Intent(c, ChargeActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        i.putExtra("preview", true);
        c.startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void close(PluginCall call) {
        Activity a = getActivity();
        call.resolve();
        if (a instanceof ChargeActivity) a.runOnUiThread(a::finishAndRemoveTask);
    }
}
