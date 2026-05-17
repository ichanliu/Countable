package com.ichanliu.countdowns.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.widget.RemoteViews

class CountdownWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Widget first added
    }

    companion object {
        const val PREFS_NAME = "com.ichanliu.countdowns.widget"
        const val KEY_TITLE = "event_title"
        const val KEY_COUNT = "event_count"
        const val KEY_LABEL = "event_label"
        const val KEY_COLOR = "event_color"
        const val KEY_EVENT_ID = "event_id"

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val views = RemoteViews(context.packageName, R.layout.countdown_widget)

            val title = prefs.getString(KEY_TITLE, null)
            val count = prefs.getString(KEY_COUNT, null)
            val label = prefs.getString(KEY_LABEL, null)
            val colorStr = prefs.getString(KEY_COLOR, "#5B9EFF")
            val eventId = prefs.getString(KEY_EVENT_ID, "")

            if (title != null) {
                views.setTextViewText(R.id.widget_title, title)
                views.setTextViewText(R.id.widget_count, count ?: "--")
                views.setTextViewText(R.id.widget_label, label ?: "DAYS LEFT")

                try {
                    val color = Color.parseColor(colorStr ?: "#5B9EFF")
                    views.setTextColor(R.id.widget_count, Color.WHITE)
                    views.setTextColor(R.id.widget_label, color)
                } catch (_: Exception) {}
            } else {
                views.setTextViewText(R.id.widget_title, "No pinned event")
                views.setTextViewText(R.id.widget_count, "--")
                views.setTextViewText(R.id.widget_label, "PIN AN EVENT")
                views.setTextColor(R.id.widget_label, Color.parseColor("#7A8A9E"))
            }

            // Click handler - open app with deep link to event detail
            val deepLink = if (eventId?.isNotEmpty() == true) {
                "countdowns://event-detail?eventId=$eventId"
            } else {
                "countdowns://"
            }
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse(deepLink)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
