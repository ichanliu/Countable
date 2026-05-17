import { NativeModules, Platform } from 'react-native';
import { getDayType, getDayDiff } from '../constants/types';
import type { CountdownEvent } from '../constants/types';

const WidgetModule = Platform.OS === 'android'
  ? NativeModules.CountdownWidgetModule
  : null;

export function syncWidget(event: CountdownEvent | null): void {
  if (Platform.OS !== 'android' || !WidgetModule) return;

  try {
    if (!event) {
      WidgetModule.updateWidget({
        title: '',
        count: '--',
        label: 'PIN AN EVENT',
        color: '#7A8A9E',
        bgImage: '',
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
    });
  } catch (error) {
    console.warn('Widget sync failed:', error);
  }
}
