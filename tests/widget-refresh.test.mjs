import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = readFileSync(new URL(
  '../modules/countdown-widget/android/src/main/AndroidManifest.xml',
  import.meta.url
), 'utf8');
const provider = readFileSync(new URL(
  '../modules/countdown-widget/android/src/main/java/com/ichanliu/countdowns/widget/CountdownWidget.kt',
  import.meta.url
), 'utf8');
const widgetInfo = readFileSync(new URL(
  '../modules/countdown-widget/android/src/main/res/xml/countdown_widget_info.xml',
  import.meta.url
), 'utf8');

test('widget refreshes after local date, clock, and time-zone changes', () => {
  for (const [action, constant] of [
    ['android.intent.action.DATE_CHANGED', 'Intent.ACTION_DATE_CHANGED'],
    ['android.intent.action.TIME_SET', 'Intent.ACTION_TIME_CHANGED'],
    ['android.intent.action.TIMEZONE_CHANGED', 'Intent.ACTION_TIMEZONE_CHANGED'],
  ]) {
    assert.ok(manifest.includes(`android:name="${action}"`));
    assert.ok(provider.includes(constant));
  }
  assert.match(provider, /onUpdate\(context,\s*manager,\s*manager\.getAppWidgetIds\(provider\)\)/);
});

test('hourly periodic refresh remains as a fallback', () => {
  assert.match(widgetInfo, /android:updatePeriodMillis="3600000"/);
});
