package com.ichanliu.countdowns

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class WidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "CountdownWidgetModule"

    @ReactMethod
    fun updateWidget(data: ReadableMap) {
        val context = reactApplicationContext

        // Guard: skip if widget doesn't exist on this launcher
        val manager = AppWidgetManager.getInstance(context) ?: return

        val title = data.getString("title") ?: ""
        val count = data.getString("count") ?: "--"
        val label = data.getString("label") ?: "PIN AN EVENT"
        val color = data.getString("color") ?: "#5B9EFF"

        val prefs = context.getSharedPreferences(CountdownWidget.PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putString(CountdownWidget.KEY_TITLE, title)
            .putString(CountdownWidget.KEY_COUNT, count)
            .putString(CountdownWidget.KEY_LABEL, label)
            .putString(CountdownWidget.KEY_COLOR, color)
            .apply()

        val componentName = ComponentName(context, CountdownWidget::class.java)
        val appWidgetIds = manager.getAppWidgetIds(componentName)

        for (appWidgetId in appWidgetIds) {
            CountdownWidget.updateAppWidget(context, manager, appWidgetId)
        }
    }
}
