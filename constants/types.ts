export interface CountdownEvent {
  id: string;
  title: string;
  targetDate: string;
  imageUri?: string;
  isPinned: boolean;
  createdAt: string;
}

export type DayType = 'future' | 'past' | 'today';

export function getDayType(targetDate: string): DayType {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff > 0) return 'future';
  return 'past';
}

export function getDayDiff(targetDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 11);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
