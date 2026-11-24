package com.yblig.animasicas;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ChargeBridgePlugin.class);
        super.onCreate(savedInstanceState);
        if (Prefs.enabled(this)) ChargeService.start(this);
    }
}
