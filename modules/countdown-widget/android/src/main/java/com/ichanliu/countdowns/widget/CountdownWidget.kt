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
import android.graphics.RectF
import android.graphics.Shader
import android.net.Uri
import android.widget.RemoteViews
import java.util.Calendar
import java.util.TimeZone

class CountdownWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {}

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
        const val KEY_BG_IMAGE_FOCUS_X = "event_bg_image_focus_x"
        const val KEY_BG_IMAGE_FOCUS_Y = "event_bg_image_focus_y"
        const val KEY_BG_IMAGE_ZOOM = "event_bg_image_zoom"
        const val KEY_TARGET_DATE = "event_target_date"
        const val DEFAULT_BG = "#0F1520"

        fun getWidgetKey(widgetId: Int, key: String): String = "widget_${widgetId}_$key"
        fun putWidgetPref(editor: SharedPreferences.Editor, wid: Int, key: String, value: String) {
            editor.putString(getWidgetKey(wid, key), value)
        }
        fun getWidgetPref(prefs: SharedPreferences, wid: Int, key: String): String? {
            val wk = getWidgetKey(wid, key)
            return prefs.getString(wk, null) ?: prefs.getString(key, null)
        }

        private fun renderWidgetBackground(
            source: Bitmap,
            maxDimension: Int,
            targetRatio: Float,
            focusX: Float,
            focusY: Float,
            zoom: Float
        ): Bitmap {
            val safeRatio = targetRatio.takeIf { it.isFinite() && it > 0f } ?: source.width.toFloat() / source.height
            val outputSize = minOf(maxDimension.toFloat(), maxOf(source.width, source.height).toFloat())
            val width = (outputSize * minOf(1f, safeRatio)).toInt().coerceAtLeast(1)
            val height = (outputSize * minOf(1f, 1f / safeRatio)).toInt().coerceAtLeast(1)
            val output = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(output)
            val bounds = RectF(0f, 0f, width.toFloat(), height.toFloat())
            val imageScale = maxOf(width.toFloat() / source.width, height.toFloat() / source.height) * zoom
            val scaledWidth = source.width * imageScale
            val scaledHeight = source.height * imageScale
            val left = (width / 2f - focusX * scaledWidth).coerceIn(width - scaledWidth, 0f)
            val top = (height / 2f - focusY * scaledHeight).coerceIn(height - scaledHeight, 0f)
            val imageBounds = RectF(left, top, left + scaledWidth, top + scaledHeight)
            canvas.drawBitmap(source, null, imageBounds, Paint(Paint.FILTER_BITMAP_FLAG))

            val scrimPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                shader = LinearGradient(
                    0f,
                    0f,
                    0f,
                    height.toFloat(),
                    intArrayOf(
                        Color.argb(38, 0, 0, 0),
                        Color.argb(51, 0, 0, 0),
                        Color.argb(179, 0, 0, 0)
                    ),
                    floatArrayOf(0f, 0.5f, 1f),
                    Shader.TileMode.CLAMP
                )
            }
            canvas.drawRect(bounds, scrimPaint)
            return output
        }

        private fun decodeBackground(context: Context, uri: String, options: BitmapFactory.Options): Bitmap? {
            val parsed = Uri.parse(uri)
            return if (parsed.scheme == "content") {
                context.contentResolver.openInputStream(parsed)?.use {
                    BitmapFactory.decodeStream(it, null, options)
                }
            } else {
                BitmapFactory.decodeFile(parsed.path ?: uri, options)
            }
        }

        // Calculate days: compare calendar dates (local timezone, midnight)
        private fun calcDiff(targetDateStr: String): Pair<Int, String> {
            return try {
                val d = targetDateStr.substring(0, 10).split("-")
                val utc = TimeZone.getTimeZone("UTC")
                val tgt = Calendar.getInstance(utc).apply {
                    clear()
                    set(d[0].toInt(), d[1].toInt() - 1, d[2].toInt())
                }
                val localToday = Calendar.getInstance()
                val now = Calendar.getInstance(utc).apply {
                    clear()
                    set(
                        localToday.get(Calendar.YEAR),
                        localToday.get(Calendar.MONTH),
                        localToday.get(Calendar.DAY_OF_MONTH)
                    )
                }
                val diff = ((tgt.timeInMillis - now.timeInMillis) / 86400000L).toInt()
                when {
                    diff == 0 -> Pair(0, "Today")
                    diff > 0  -> Pair(diff, "DAYS LEFT")
                    else      -> Pair(-diff, "DAYS PASSED")
                }
            } catch (_: Exception) { Pair(0, "DAYS LEFT") }
        }

        fun updateAppWidget(context: Context, awm: AppWidgetManager, wid: Int) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val views = RemoteViews(context.packageName, R.layout.countdown_widget)

            val title     = getWidgetPref(prefs, wid, KEY_TITLE)
            val colorStr  = getWidgetPref(prefs, wid, KEY_COLOR) ?: "#5B9EFF"
            val eventId   = getWidgetPref(prefs, wid, KEY_EVENT_ID) ?: ""
            val bgImage   = getWidgetPref(prefs, wid, KEY_BG_IMAGE) ?: ""
            val targetDate = getWidgetPref(prefs, wid, KEY_TARGET_DATE) ?: ""

            // Compute count from target date (auto-updates)
            val (count, label) = if (targetDate.isNotEmpty()) calcDiff(targetDate)
                else Pair(getWidgetPref(prefs, wid, KEY_COUNT)?.toIntOrNull() ?: 0,
                          getWidgetPref(prefs, wid, KEY_LABEL) ?: "DAYS LEFT")

            // Background
            if (bgImage.isNotEmpty()) {
                try {
                    val opts = BitmapFactory.Options().apply { inSampleSize = 2 }
                    val bmp = decodeBackground(context, bgImage, opts)
                    if (bmp != null) {
                        val focusX = prefs.getFloat(getWidgetKey(wid, KEY_BG_IMAGE_FOCUS_X), 0.5f).coerceIn(0f, 1f)
                        val focusY = prefs.getFloat(getWidgetKey(wid, KEY_BG_IMAGE_FOCUS_Y), 0.5f).coerceIn(0f, 1f)
                        val zoom = prefs.getFloat(getWidgetKey(wid, KEY_BG_IMAGE_ZOOM), 1f).coerceIn(1f, 3f)
                        val widgetOptions = awm.getAppWidgetOptions(wid)
                        val density = context.resources.displayMetrics.density
                        val widgetWidth = widgetOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0)
                            .takeIf { it > 0 } ?: widgetOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
                        val widgetHeight = widgetOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)
                            .takeIf { it > 0 } ?: widgetOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
                        val targetRatio = if (widgetWidth > 0 && widgetHeight > 0) {
                            widgetWidth / widgetHeight.toFloat()
                        } else {
                            (bmp.width / density) / (bmp.height / density)
                        }
                        views.setViewVisibility(R.id.widget_bg_image, android.view.View.VISIBLE)
                        views.setImageViewBitmap(
                        R.id.widget_bg_image,
                        renderWidgetBackground(bmp, 384, targetRatio, focusX, focusY, zoom)
                        )
                    } else throw Exception("null bitmap")
                } catch (_: Exception) {
                    views.setViewVisibility(R.id.widget_bg_image, android.view.View.GONE)
                }
            } else {
                views.setViewVisibility(R.id.widget_bg_image, android.view.View.GONE)
            }
            views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_bg)

            // Text content
            if (title != null) {
                views.setTextViewText(R.id.widget_title, title)
                views.setTextViewText(R.id.widget_count, if (label == "Today") "Today" else count.toString())
                views.setTextViewText(R.id.widget_label, if (label == "Today") "" else label)
                try { views.setTextColor(R.id.widget_label, Color.parseColor(colorStr))
                } catch (_: Exception) {}
            } else {
                views.setTextViewText(R.id.widget_title, "No pinned event")
                views.setTextViewText(R.id.widget_count, "--")
                views.setTextViewText(R.id.widget_label, "PIN AN EVENT")
                views.setTextColor(R.id.widget_label, Color.parseColor("#7A8A9E"))
            }

            // Click → deep link
            val deepLink = if (eventId.isNotEmpty()) "countdowns://event-detail?eventId=$eventId" else "countdowns://"
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse(deepLink)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pi = PendingIntent.getActivity(context, wid, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            awm.updateAppWidget(wid, views)
        }
    }
}
