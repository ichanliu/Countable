import { NativeModules, Platform } from 'react-native';
import { formatLocalDate, getDayType, getDayDiff, parseEventDate } from '../constants/types';
import type { CountdownEvent } from '../constants/types';
import { resolveWidgetEvent } from './widgetAssignments';

const WidgetModule = Platform.OS === 'android'
  ? NativeModules.CountdownWidgetModule
  : null;

// Sync an event to one widget instance, or all instances when no ID is supplied.
export async function syncWidget(event: CountdownEvent | null, widgetId?: number): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!WidgetModule) throw new Error('Countdown widget native module is unavailable.');

  try {
    if (!event) {
      await WidgetModule.updateWidget({
        title: '',
        count: '--',
        label: 'PIN AN EVENT',
        color: '#7A8A9E',
        bgImage: '',
        bgImageFocusX: 0.5,
        bgImageFocusY: 0.5,
        bgImageZoom: 1,
        targetDate: '',
        targetWidgetId: widgetId ?? -1,
      });
      return;
    }

    const dayType = getDayType(event.targetDate);
    const diff = getDayDiff(event.targetDate);
    const absDiff = Math.abs(diff);

    let color: string;
    let count: string;
    let label: string;

    switch (dayType) {
      case 'today':
        color = '#2ECC71';
        count = '\uD83C\uDF89';
        label = 'TODAY';
        break;
      case 'future':
        color = '#5B9EFF';
        count = String(absDiff);
        label = 'DAYS LEFT';
        break;
      case 'past':
        color = '#FF6B35';
        count = String(absDiff);
        label = 'DAYS PASSED';
        break;
    }

    await WidgetModule.updateWidget({
      title: event.title,
      count,
      label,
      color,
      eventId: event.id,
      bgImage: event.widgetImageUri !== undefined
        ? event.widgetImageUri
        : event.imageUri || '',
      bgImageFocusX: event.widgetImageCrop?.focusX ?? 0.5,
      bgImageFocusY: event.widgetImageCrop?.focusY ?? 0.5,
      bgImageZoom: event.widgetImageCrop?.zoom ?? 1,
      targetDate: formatLocalDate(parseEventDate(event.targetDate)),
      targetWidgetId: widgetId ?? -1,
    });
  } catch (error) {
    console.warn('Widget sync failed:', error);
    throw error;
  }
}

// Get all active widget instance IDs
export async function getWidgetIds(): Promise<number[]> {
  if (Platform.OS !== 'android') return [];
  if (!WidgetModule) throw new Error('Countdown widget native module is unavailable.');
  try {
    const arr = await WidgetModule.getActiveWidgetIds();
    if (arr && typeof arr.forEach === 'function') {
      const ids: number[] = [];
      arr.forEach((id: number) => ids.push(id));
      return ids;
    }
    return [];
  } catch {
    throw new Error('Could not retrieve active countdown widgets.');
  }
}

// Bind a widget instance to a specific event
export async function bindWidget(widgetId: number, eventId: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!WidgetModule) throw new Error('Countdown widget native module is unavailable.');
  try {
    await WidgetModule.bindWidget(widgetId, eventId);
  } catch (e) {
    console.warn('Widget bind failed:', e);
    throw e;
  }
}

export async function isWidgetBindingSet(widgetId: number): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!WidgetModule) throw new Error('Countdown widget native module is unavailable.');
  try {
    return !!(await WidgetModule.isWidgetBindingSet(widgetId));
  } catch (e) {
    console.warn('Widget binding lookup failed:', e);
    throw e;
  }
}

// Get which event a widget is bound to
export async function getWidgetEventId(widgetId: number): Promise<string> {
  if (Platform.OS !== 'android') return '';
  if (!WidgetModule) throw new Error('Countdown widget native module is unavailable.');
  try {
    return await WidgetModule.getWidgetEventId(widgetId) || '';
  } catch {
    throw new Error('Could not retrieve the event bound to a countdown widget.');
  }
}

// Sync all active widgets with their bound events
export async function syncAllWidgets(events: CountdownEvent[]): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!WidgetModule) throw new Error('Countdown widget native module is unavailable.');
  const ids = await getWidgetIds();
  for (const widgetId of ids) {
    const boundEventId = await getWidgetEventId(widgetId);
    const bindingSet = await isWidgetBindingSet(widgetId);
    await syncWidget(resolveWidgetEvent(events, bindingSet, boundEventId), widgetId);
  }
}
