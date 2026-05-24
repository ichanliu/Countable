package com.ichanliu.countdowns.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Shader
import android.net.Uri
import android.widget.RemoteViews
import java.util.Calendar
import java.util.concurrent.TimeUnit

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

    override fun onEnabled(context: Context) { }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val editor = prefs.edit()
        for (id in appWidgetIds) {
            val prefix = "widget_${id}_"
            val keys = prefs.all.keys.filter { it.startsWith(prefix) }
            for (key in keys) editor.remove(key)
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
        const val KEY_TARGET_DATE = "event_target_date"

        fun getWidgetKey(widgetId: Int, key: String): String = "widget_${widgetId}_$key"

        fun putWidgetPref(editor: SharedPreferences.Editor, widgetId: Int, key: String, value: String) {
            editor.putString(getWidgetKey(widgetId, key), value)
        }

        fun getWidgetPref(prefs: SharedPreferences, widgetId: Int, key: String): String? {
            val widgetKey = getWidgetKey(widgetId, key)
            return prefs.getString(widgetKey, null) ?: prefs.getString(key, null)
        }

        // Generate a simple gradient bitmap for built-in backgrounds
        private fun createGradientBmp(baseColor: Int, w: Int, h: Int): Bitmap {
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bmp)
            val dark = multiplyColor(baseColor, 0.3f)
            val light = multiplyColor(baseColor, 1.5f)
            val paint = Paint().apply {
                shader = LinearGradient(0f, 0f, w.toFloat(), h.toFloat(), light, dark, Shader.TileMode.CLAMP)
            }
            canvas.drawRect(0f, 0f, w.toFloat(), h.toFloat(), paint)
            return bmp
        }

        private fun multiplyColor(color: Int, factor: Float): Int {
            return Color.rgb(
                (Color.red(color) * factor).toInt().coerceIn(0, 255),
                (Color.green(color) * factor).toInt().coerceIn(0, 255),
                (Color.blue(color) * factor).toInt().coerceIn(0, 255)
            )
        }

        // Calculate days between two dates
        private fun calcDays(targetDateStr: String): Pair<Int, String> {
            return try {
                val parts = targetDateStr.split("T")[0].split("-")
                val target = Calendar.getInstance().apply {
                    set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt(), 0, 0, 0)
                }
                val today = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                val diffMs = target.timeInMillis - today.timeInMillis
                val diffDays = TimeUnit.DAYS.convert(diffMs, TimeUnit.MILLISECONDS).toInt()
                val abs = kotlin.math.abs(diffDays)
                when {
                    diffDays == 0 -> Pair(0, "Today")
                    diffDays > 0 -> Pair(abs, "DAYS LEFT")
                    else -> Pair(abs, "DAYS PASSED")
                }
            } catch (_: Exception) {
                Pair(0, "DAYS LEFT")
            }
        }

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val views = RemoteViews(context.packageName, R.layout.countdown_widget)

            val title = getWidgetPref(prefs, appWidgetId, KEY_TITLE)
            val colorStr = getWidgetPref(prefs, appWidgetId, KEY_COLOR) ?: "#5B9EFF"
            val eventId = getWidgetPref(prefs, appWidgetId, KEY_EVENT_ID) ?: ""
            val bgImage = getWidgetPref(prefs, appWidgetId, KEY_BG_IMAGE) ?: ""
            val targetDate = getWidgetPref(prefs, appWidgetId, KEY_TARGET_DATE) ?: ""

            // Calculate count from target date (auto-updates even without app launch)
            val (count, label) = if (targetDate.isNotEmpty()) {
                calcDays(targetDate)
            } else {
                val savedCount = getWidgetPref(prefs, appWidgetId, KEY_COUNT) ?: "--"
                val savedLabel = getWidgetPref(prefs, appWidgetId, KEY_LABEL) ?: "DAYS LEFT"
                Pair(savedCount.toIntOrNull() ?: 0, savedLabel)
            }

            // Widget background: try image file, fall back to generated gradient
            val bgColor = try { Color.parseColor(colorStr) } catch (_: Exception) { Color.parseColor("#5B9EFF") }
            if (bgImage.isNotEmpty()) {
                try {
                    val dimOpts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    BitmapFactory.decodeFile(bgImage, dimOpts)
                    val maxDimension = 400
                    var scale = 1
                    while ((dimOpts.outWidth / scale > maxDimension || dimOpts.outHeight / scale > maxDimension) && scale < 16) {
                        scale *= 2
                    }
                    val opts = BitmapFactory.Options().apply { inSampleSize = scale }
                    var bmp = BitmapFactory.decodeFile(bgImage, opts)
                    if (bmp != null && (bmp.width > maxDimension || bmp.height > maxDimension)) {
                        val ratio = minOf(maxDimension.toFloat() / bmp.width, maxDimension.toFloat() / bmp.height)
                        bmp = Bitmap.createScaledBitmap(bmp, (bmp.width * ratio).toInt(), (bmp.height * ratio).toInt(), true)
                    }
                    if (bmp != null) {
                        views.setViewVisibility(R.id.widget_bg_image, android.view.View.VISIBLE)
                        views.setImageViewBitmap(R.id.widget_bg_image, bmp)
                    } else {
                        val fallback = createGradientBmp(bgColor, 400, 200)
                        views.setViewVisibility(R.id.widget_bg_image, android.view.View.VISIBLE)
                        views.setImageViewBitmap(R.id.widget_bg_image, fallback)
                    }
                } catch (_: Exception) {
                    val fallback = createGradientBmp(bgColor, 400, 200)
                    views.setViewVisibility(R.id.widget_bg_image, android.view.View.VISIBLE)
                    views.setImageViewBitmap(R.id.widget_bg_image, fallback)
                }
            } else {
                // Built-in gradient background based on event color
                val fallback = createGradientBmp(bgColor, 400, 200)
                views.setViewVisibility(R.id.widget_bg_image, android.view.View.VISIBLE)
                views.setImageViewBitmap(R.id.widget_bg_image, fallback)
            }

            if (title != null) {
                views.setTextViewText(R.id.widget_title, title)
                views.setTextViewText(R.id.widget_count, if (label == "Today") "Today" else count.toString())
                views.setTextViewText(R.id.widget_label, if (label == "Today") "" else label)
                try {
                    views.setTextColor(R.id.widget_count, Color.WHITE)
                    views.setTextColor(R.id.widget_label, Color.parseColor(colorStr))
                } catch (_: Exception) {}
            } else {
                views.setTextViewText(R.id.widget_title, "No pinned event")
                views.setTextViewText(R.id.widget_count, "--")
                views.setTextViewText(R.id.widget_label, "PIN AN EVENT")
                views.setTextColor(R.id.widget_label, Color.parseColor("#7A8A9E"))
            }

            val deepLink = if (eventId.isNotEmpty()) "countdowns://event-detail?eventId=$eventId" else "countdowns://"
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse(deepLink)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context, appWidgetId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
