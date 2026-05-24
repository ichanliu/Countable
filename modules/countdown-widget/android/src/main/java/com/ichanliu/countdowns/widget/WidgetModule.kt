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
    fun updateWidget(data: ReadableMap) {
        val context = reactApplicationContext
        val manager = AppWidgetManager.getInstance(context) ?: return
        val componentName = ComponentName(context, CountdownWidget::class.java)
        val allWidgetIds = manager.getAppWidgetIds(componentName)

        val title = data.getString("title") ?: ""
        val count = data.getString("count") ?: "--"
        val label = data.getString("label") ?: "PIN AN EVENT"
        val color = data.getString("color") ?: "#5B9EFF"
        val eventId = data.getString("eventId") ?: ""
        val bgImage = data.getString("bgImage") ?: ""
        val targetDate = data.getString("targetDate") ?: ""
        val targetWidgetId = if (data.hasKey("targetWidgetId")) data.getInt("targetWidgetId") else -1

        val prefs = context.getSharedPreferences(CountdownWidget.PREFS_NAME, Context.MODE_PRIVATE)

        // Determine which widgets to update
        val idsToUpdate = if (targetWidgetId >= 0 && allWidgetIds.any { it == targetWidgetId }) {
            intArrayOf(targetWidgetId)
        } else {
            allWidgetIds
        }

        for (widgetId in idsToUpdate) {
            val editor = prefs.edit()
            CountdownWidget.putWidgetPref(editor, widgetId, CountdownWidget.KEY_TITLE, title)
            CountdownWidget.putWidgetPref(editor, widgetId, CountdownWidget.KEY_COUNT, count)
            CountdownWidget.putWidgetPref(editor, widgetId, CountdownWidget.KEY_LABEL, label)
            CountdownWidget.putWidgetPref(editor, widgetId, CountdownWidget.KEY_COLOR, color)
            CountdownWidget.putWidgetPref(editor, widgetId, CountdownWidget.KEY_EVENT_ID, eventId)
            CountdownWidget.putWidgetPref(editor, widgetId, CountdownWidget.KEY_BG_IMAGE, bgImage)
            CountdownWidget.putWidgetPref(editor, widgetId, CountdownWidget.KEY_TARGET_DATE, targetDate)
            editor.apply()
            CountdownWidget.updateAppWidget(context, manager, widgetId)
        }
    }

    // Bind a widget instance to a specific event
    @ReactMethod
    fun bindWidget(widgetId: Int, eventId: String) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences(CountdownWidget.PREFS_NAME, Context.MODE_PRIVATE)
        val editor = prefs.edit()
        editor.putString(CountdownWidget.getWidgetKey(widgetId, "bound_event_id"), eventId)
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
}
