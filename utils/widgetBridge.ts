import { NativeModules, Platform } from 'react-native';
import { getDayType, getDayDiff } from '../constants/types';
import type { CountdownEvent } from '../constants/types';

const WidgetModule = Platform.OS === 'android'
  ? NativeModules.CountdownWidgetModule
  : null;

// Sync a single event to ALL active widgets (or to a specific widget if widgetId provided)
export function syncWidget(event: CountdownEvent | null, widgetId?: number): void {
  if (Platform.OS !== 'android' || !WidgetModule) return;

  try {
    if (!event) {
      WidgetModule.updateWidget({
        title: '',
        count: '--',
        label: 'PIN AN EVENT',
        color: '#7A8A9E',
        bgImage: '',
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

    WidgetModule.updateWidget({
      title: event.title,
      count,
      label,
      color,
      eventId: event.id,
      bgImage: event.widgetImageUri || event.imageUri || '',
      targetDate: event.targetDate,
      targetWidgetId: widgetId ?? -1,
    });
  } catch (error) {
    console.warn('Widget sync failed:', error);
  }
}

// Get all active widget instance IDs
export async function getWidgetIds(): Promise<number[]> {
  if (Platform.OS !== 'android' || !WidgetModule) return [];
  try {
    const arr = await WidgetModule.getActiveWidgetIds();
    if (arr && typeof arr.forEach === 'function') {
      const ids: number[] = [];
      arr.forEach((id: number) => ids.push(id));
      return ids;
    }
    return [];
  } catch {
    return [];
  }
}

// Bind a widget instance to a specific event
export async function bindWidget(widgetId: number, eventId: string): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetModule) return;
  try {
    await WidgetModule.bindWidget(widgetId, eventId);
  } catch (e) {
    console.warn('Widget bind failed:', e);
  }
}

// Get which event a widget is bound to
export async function getWidgetEventId(widgetId: number): Promise<string> {
  if (Platform.OS !== 'android' || !WidgetModule) return '';
  try {
    return await WidgetModule.getWidgetEventId(widgetId) || '';
  } catch {
    return '';
  }
}

// Sync all active widgets with their bound events
export async function syncAllWidgets(events: CountdownEvent[]): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetModule) return;
  try {
    const ids = await getWidgetIds();
    for (const widgetId of ids) {
      const boundEventId = await getWidgetEventId(widgetId);
      if (boundEventId) {
        const event = events.find((e) => e.id === boundEventId);
        if (event) {
          syncWidget(event, widgetId);
        } else {
          // Event was deleted - clear this widget
          syncWidget(null, widgetId);
        }
      } else {
        // No event bound - sync the first pinned event as default
        const pinned = events.find((e) => e.isPinned);
        syncWidget(pinned || null, widgetId);
      }
    }
  } catch (e) {
    console.warn('syncAllWidgets failed:', e);
  }
}
