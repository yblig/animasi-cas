package com.yblig.animasicas;

import android.content.Context;
import android.content.SharedPreferences;

final class Prefs {
    private static final String NAME = "animasicas";
    static SharedPreferences get(Context c) { return c.getApplicationContext().getSharedPreferences(NAME, Context.MODE_PRIVATE); }
    static boolean enabled(Context c) { return get(c).getBoolean("enabled", false); }
    static String sound(Context c) { return get(c).getString("sound", "plug_chime"); }
    static boolean vibrate(Context c) { return get(c).getBoolean("vibrate", true); }
    static boolean showWhenUsing(Context c) { return get(c).getBoolean("showWhenUsing", true); }
    static float volume(Context c) { return get(c).getFloat("volume", 0.8f); }
}
