package com.wingycoo.cue;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CueWidget")
public class CueWidgetPlugin extends Plugin {

    private static final String PREFS_NAME = "CapacitorStorage";

    @PluginMethod
    public void updateWidget(PluginCall call) {
        String title = call.getString("title", "작성된 노트가 없습니다");
        String snippet = call.getString("snippet", "+ 새 노트 버튼을 눌러 작성을 시작하세요.");
        String date = call.getString("date", "");
        String noteId = call.getString("noteId", "");

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putString("widget_title", title)
            .putString("widget_snippet", snippet)
            .putString("widget_date", date)
            .putString("widget_note_id", noteId)
            .apply();

        CueWidgetProvider.updateAllWidgets(context);
        call.resolve();
    }
}
