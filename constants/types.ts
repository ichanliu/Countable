export interface CountdownEvent {
  id: string;
  title: string;
  targetDate: string;
  imageUri?: string;
  bgImageUri?: string;
  widgetImageUri?: string;
  isPinned: boolean;
  createdAt: string;
}

export type DayType = 'future' | 'past' | 'today';

export function parseEventDate(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(value);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayType(value: string | Date): DayType {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseEventDate(value);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff > 0) return 'future';
  return 'past';
}

export function getDayDiff(value: string | Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseEventDate(value);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 11);
}

export function formatDate(dateStr: string): string {
  const d = parseEventDate(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
