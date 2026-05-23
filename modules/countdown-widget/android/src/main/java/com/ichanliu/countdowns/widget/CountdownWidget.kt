package com.ichanliu.countdowns.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.graphics.BitmapFactory
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

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        // Clean up per-widget preferences
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val editor = prefs.edit()
        for (id in appWidgetIds) {
            val prefix = "widget_${id}_"
            // Remove all keys with this prefix
            val keys = prefs.all.keys.filter { it.startsWith(prefix) }
            for (key in keys) {
                editor.remove(key)
            }
        }
        editor.apply()
    }

    companion object {
        const val PREFS_NAME = "com.ichanliu.countdowns.widget"
        const val KEY_TITLE = "event_title"
        const val KEY_COUNT = "event_count"
        const val KEY_LABEL = "event_label"
        const val KEY_COLOR = "event_color"
        const val KEY_EVENT_ID = "event_id"
        const val KEY_BG_IMAGE = "event_bg_image"

        fun getWidgetKey(widgetId: Int, key: String): String = "widget_${widgetId}_$key"

        fun putWidgetPref(editor: SharedPreferences.Editor, widgetId: Int, key: String, value: String) {
            editor.putString(getWidgetKey(widgetId, key), value)
        }

        fun getWidgetPref(prefs: SharedPreferences, widgetId: Int, key: String): String? {
            val widgetKey = getWidgetKey(widgetId, key)
            return prefs.getString(widgetKey, null) ?: prefs.getString(key, null)
        }

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val views = RemoteViews(context.packageName, R.layout.countdown_widget)

            val title = getWidgetPref(prefs, appWidgetId, KEY_TITLE)
            val count = getWidgetPref(prefs, appWidgetId, KEY_COUNT)
            val label = getWidgetPref(prefs, appWidgetId, KEY_LABEL)
            val colorStr = getWidgetPref(prefs, appWidgetId, KEY_COLOR) ?: "#5B9EFF"
            val eventId = getWidgetPref(prefs, appWidgetId, KEY_EVENT_ID) ?: ""
            val bgImage = getWidgetPref(prefs, appWidgetId, KEY_BG_IMAGE) ?: ""

            // Background image - decode with size limit to stay under Binder 1MB limit
            if (bgImage.isNotEmpty()) {
                try {
                    // First pass: read dimensions only
                    val dimOpts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    BitmapFactory.decodeFile(bgImage, dimOpts)

                    // Calculate sample size to keep the longest side under ~400px
                    val maxDimension = 400
                    var scale = 1
                    while (dimOpts.outWidth / scale > maxDimension
                        || dimOpts.outHeight / scale > maxDimension
                    ) {
                        scale *= 2
                    }

                    // Second pass: decode at the calculated scale
                    val opts = BitmapFactory.Options().apply { inSampleSize = scale }
                    var bmp = BitmapFactory.decodeFile(bgImage, opts)

                    // Final safety cap - scale maintaining aspect ratio
                    if (bmp != null && (bmp.width > maxDimension || bmp.height > maxDimension)) {
                        val ratio = minOf(
                            maxDimension.toFloat() / bmp.width,
                            maxDimension.toFloat() / bmp.height
                        )
                        bmp = Bitmap.createScaledBitmap(
                            bmp,
                            (bmp.width * ratio).toInt(),
                            (bmp.height * ratio).toInt(),
                            true
                        )
                    }

                    if (bmp != null) {
                        views.setViewVisibility(R.id.widget_bg_image, android.view.View.VISIBLE)
                        views.setImageViewBitmap(R.id.widget_bg_image, bmp)
                    } else {
                        views.setViewVisibility(R.id.widget_bg_image, android.view.View.GONE)
                    }
                } catch (_: Exception) {
                    views.setViewVisibility(R.id.widget_bg_image, android.view.View.GONE)
                }
            } else {
                views.setViewVisibility(R.id.widget_bg_image, android.view.View.GONE)
            }

            if (title != null) {
                views.setTextViewText(R.id.widget_title, title)
                views.setTextViewText(R.id.widget_count, count ?: "--")
                views.setTextViewText(R.id.widget_label, label ?: "DAYS LEFT")

                try {
                    val color = Color.parseColor(colorStr)
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
            val deepLink = if (eventId.isNotEmpty()) {
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
