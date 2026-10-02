import type { CountdownEvent } from '../constants/types';

export function resolveWidgetEvent(
  events: CountdownEvent[],
  bindingSet: boolean,
  boundEventId: string
): CountdownEvent | null {
  if (boundEventId) return events.find((event) => event.id === boundEventId) ?? null;
  if (bindingSet) return null;
  return events.find((event) => event.isPinned) ?? null;
}

export function isDefaultWidgetBinding(bindingSet: boolean, boundEventId: string): boolean {
  return !bindingSet && !boundEventId;
}
