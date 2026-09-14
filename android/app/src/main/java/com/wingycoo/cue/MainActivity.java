package com.wingycoo.cue;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CueWidgetPlugin.class);
        super.onCreate(savedInstanceState);

        if (getBridge() != null && getBridge().getWebView() != null) {
            String userAgent = getBridge().getWebView().getSettings().getUserAgentString();
            if (userAgent != null) {
                userAgent = userAgent.replace("; wv", "").replace("Version/4.0 ", "");
                getBridge().getWebView().getSettings().setUserAgentString(userAgent);
            }
        }

        CueWidgetProvider.updateAllWidgets(this);
        handleWidgetIntent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWidgetIntent(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        CueWidgetProvider.updateAllWidgets(this);
    }

    private void handleWidgetIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getStringExtra("action");
        if (action != null) {
            String noteId = intent.getStringExtra("note_id");
            String script = String.format(
                "window.dispatchEvent(new CustomEvent('cueWidgetAction', { detail: { action: '%s', noteId: '%s' } }));",
                action, (noteId != null ? noteId : "")
            );
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().post(() -> {
                    getBridge().getWebView().evaluateJavascript(script, null);
                });
            }
        }
    }
}
