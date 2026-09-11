package com.wingycoo.cue;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

public class CueWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "CapacitorStorage";
    public static final String ACTION_NEW_NOTE = "com.wingycoo.cue.NEW_NOTE";
    public static final String ACTION_OPEN_NOTE = "com.wingycoo.cue.OPEN_NOTE";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String title = prefs.getString("widget_title", "작성된 노트가 없습니다");
        String snippet = prefs.getString("widget_snippet", "+ 새 노트 버튼을 눌러 메모 작성을 시작하세요.");
        String date = prefs.getString("widget_date", "");
        String noteId = prefs.getString("widget_note_id", "");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.cue_widget_layout);
        views.setTextViewText(R.id.widget_note_title, title);
        views.setTextViewText(R.id.widget_note_snippet, snippet);
        views.setTextViewText(R.id.widget_note_date, date);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        // 1. PendingIntent for "+ 새 노트" quick button
        Intent newNoteIntent = new Intent(context, MainActivity.class);
        newNoteIntent.setAction(ACTION_NEW_NOTE);
        newNoteIntent.setData(Uri.parse("cue://new_note"));
        newNoteIntent.putExtra("action", "new_note");
        newNoteIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent newNotePending = PendingIntent.getActivity(context, 101, newNoteIntent, flags);
        views.setOnClickPendingIntent(R.id.widget_btn_new, newNotePending);

        // 2. PendingIntent for Note Content Card click (open specific note or app)
        Intent openNoteIntent = new Intent(context, MainActivity.class);
        openNoteIntent.setAction(ACTION_OPEN_NOTE);
        openNoteIntent.setData(Uri.parse("cue://open_note/" + (noteId.isEmpty() ? "default" : noteId)));
        openNoteIntent.putExtra("action", "open_note");
        openNoteIntent.putExtra("note_id", noteId);
        openNoteIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openNotePending = PendingIntent.getActivity(context, 102, openNoteIntent, flags);
        views.setOnClickPendingIntent(R.id.widget_content_area, openNotePending);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName widgetComponent = new ComponentName(context, CueWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(widgetComponent);
        if (ids != null && ids.length > 0) {
            for (int id : ids) {
                updateAppWidget(context, manager, id);
            }
        }
    }
}
