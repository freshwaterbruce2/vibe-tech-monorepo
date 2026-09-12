package com.vibetech.tutor;

import androidx.annotation.NonNull;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.google.android.play.core.integrity.IntegrityManagerFactory;
import com.google.android.play.core.integrity.StandardIntegrityManager;

/** Native bridge for a Play Integrity standard request. No token is persisted or logged. */
@CapacitorPlugin(name = "VibeTutorIntegrity")
public class VibeTutorIntegrityPlugin extends Plugin {
    private StandardIntegrityManager.StandardIntegrityTokenProvider provider;

    @PluginMethod
    public void prepare(PluginCall call) {
        long projectNumber = BuildConfig.VIBE_TUTOR_INTEGRITY_CLOUD_PROJECT_NUMBER;
        if (projectNumber <= 0) { call.reject("Integrity project number is unavailable."); return; }
        IntegrityManagerFactory.createStandard(getContext())
                .prepareIntegrityToken(StandardIntegrityManager.PrepareIntegrityTokenRequest.builder()
                        .setCloudProjectNumber(projectNumber).build())
                .addOnSuccessListener(value -> { provider = value; call.resolve(); })
                .addOnFailureListener(error -> call.reject("Integrity preparation failed."));
    }

    @PluginMethod
    public void request(PluginCall call) {
        String requestHash = call.getString("requestHash");
        if (provider == null || requestHash == null || !requestHash.matches("[A-Za-z0-9_-]{20,128}")) { call.reject("Integrity request is not ready."); return; }
        provider.request(StandardIntegrityManager.StandardIntegrityTokenRequest.builder().setRequestHash(requestHash).build())
                .addOnSuccessListener(value -> { JSObject result = new JSObject(); result.put("token", value.token()); call.resolve(result); })
                .addOnFailureListener(error -> call.reject("Integrity request failed."));
    }
}
