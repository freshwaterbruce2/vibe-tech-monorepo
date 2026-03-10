package com.vibetech.tutor;

import android.os.Bundle;
import android.os.PowerManager;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen on during audio playback (optional)
        // getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Acquire partial wake lock for background audio
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "VibeTutor:AudioPlayback");
        wakeLock.setReferenceCounted(false);
    }

    @Override
    public void onResume() {
        super.onResume();
        // Audio should continue playing even when app is in background
    }

    @Override
    public void onPause() {
        super.onPause();
        // Don't stop audio when app goes to background
        // HTML5 audio will continue playing automatically
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }
}
