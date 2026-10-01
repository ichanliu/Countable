package com.ichanliu.countdowns.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class WidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "CountdownWidgetModule"

    // Get all active widget instance IDs
    @ReactMethod
    fun getActiveWidgetIds(promise: Promise) {
        try {
            val context = reactApplicationContext
            val manager = AppWidgetManager.getInstance(context) ?: run {
                promise.resolve(Arguments.createArray())
                return
            }
            val componentName = ComponentName(context, CountdownWidget::class.java)
            val ids = manager.getAppWidgetIds(componentName)
            val arr = Arguments.createArray()
            for (id in ids) {
                arr.pushInt(id)
            }
            promise.resolve(arr)
        } catch (e: Exception) {
            promise.reject("GET_IDS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun updateWidget(data: ReadableMap, promise: Promise) {
        try {
            val context = reactApplicationContext
            val manager = AppWidgetManager.getInstance(context) ?: run {
                promise.resolve(null)
                return
            }
            val componentName = ComponentName(context, CountdownWidget::class.java)
            val allWidgetIds = manager.getAppWidgetIds(componentName)

            val title = data.getString("title") ?: ""
            val count = data.getString("count") ?: "--"
            val label = data.getString("label") ?: "PIN AN EVENT"
            val color = data.getString("color") ?: "#5B9EFF"
            val eventId = data.getString("eventId") ?: ""
            val bgImage = data.getString("bgImage") ?: ""
            val bgImageFocusX = (
                if (data.hasKey("bgImageFocusX")) data.getDouble("bgImageFocusX") else 0.5
            ).toFloat().coerceIn(0f, 1f)
            val bgImageFocusY = (
                if (data.hasKey("bgImageFocusY")) data.getDouble("bgImageFocusY") else 0.5
            ).toFloat().coerceIn(0f, 1f)
            val bgImageZoom = (
                if (data.hasKey("bgImageZoom")) data.getDouble("bgImageZoom") else 1.0
            ).toFloat().coerceIn(1f, 3f)
            val targetDate = data.getString("targetDate") ?: ""
            val targetWidgetId = if (data.hasKey("targetWidgetId")) data.getInt("targetWidgetId") else -1

            val prefs = context.getSharedPreferences(CountdownWidget.PREFS_NAME, Context.MODE_PRIVATE)
            val idsToUpdate = when {
                targetWidgetId < 0 -> allWidgetIds
                allWidgetIds.any { it == targetWidgetId } -> intArrayOf(targetWidgetId)
                else -> intArrayOf()
            }

            for (widgetId in idsToUpdate) {
                val editor = prefs.edit()
                CountdownWidget.putWidgetPref(editor, widgetId, CountdownWidget.KEY_TITLE, title)
                CountdownWidget.putWidgetPref(editor, widgetId, CountdownWidget.KEY_COUNT, count)
                CountdownWidget.putWidgetPref(editor, widgetId, CountdownWidget.KEY_LABEL, label)
                CountdownWidget.putWidgetPref(editor, widgetId, CountdownWidget.KEY_COLOR, color)
                CountdownWidget.putWidgetPref(editor, widgetId, CountdownWidget.KEY_EVENT_ID, eventId)
                CountdownWidget.putWidgetPref(editor, widgetId, CountdownWidget.KEY_BG_IMAGE, bgImage)
                editor.putFloat(CountdownWidget.getWidgetKey(widgetId, CountdownWidget.KEY_BG_IMAGE_FOCUS_X), bgImageFocusX)
                editor.putFloat(CountdownWidget.getWidgetKey(widgetId, CountdownWidget.KEY_BG_IMAGE_FOCUS_Y), bgImageFocusY)
                editor.putFloat(CountdownWidget.getWidgetKey(widgetId, CountdownWidget.KEY_BG_IMAGE_ZOOM), bgImageZoom)
                CountdownWidget.putWidgetPref(editor, widgetId, CountdownWidget.KEY_TARGET_DATE, targetDate)
                editor.apply()
                CountdownWidget.updateAppWidget(context, manager, widgetId)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("UPDATE_WIDGET_ERROR", e)
        }
    }

    // Bind a widget instance to a specific event
    @ReactMethod
    fun bindWidget(widgetId: Int, eventId: String) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences(CountdownWidget.PREFS_NAME, Context.MODE_PRIVATE)
        val editor = prefs.edit()
        editor.putString(CountdownWidget.getWidgetKey(widgetId, "bound_event_id"), eventId)
        editor.putBoolean(CountdownWidget.getWidgetKey(widgetId, "bound_event_set"), true)
        editor.apply()
    }

    // Get which event a widget is bound to
    @ReactMethod
    fun getWidgetEventId(widgetId: Int, promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences(CountdownWidget.PREFS_NAME, Context.MODE_PRIVATE)
            val eventId = CountdownWidget.getWidgetPref(prefs, widgetId, "bound_event_id") ?: ""
            promise.resolve(eventId)
        } catch (e: Exception) {
            promise.reject("GET_EVENT_ERROR", e.message)
        }
    }

    @ReactMethod
    fun isWidgetBindingSet(widgetId: Int, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(CountdownWidget.PREFS_NAME, Context.MODE_PRIVATE)
            promise.resolve(prefs.getBoolean(CountdownWidget.getWidgetKey(widgetId, "bound_event_set"), false))
        } catch (e: Exception) {
            promise.reject("GET_BINDING_STATE_ERROR", e.message)
        }
    }
}
