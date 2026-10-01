import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWidgetEvent } from '../utils/widgetAssignments.ts';

const events = [
  { id: 'a', title: 'A', targetDate: '2026-07-08', isPinned: true },
  { id: 'b', title: 'B', targetDate: '2026-08-09', isPinned: false },
];

test('widget instances resolve their own event independently', () => {
  const widgetBindings = new Map([[41, 'a'], [42, 'b']]);
  assert.equal(resolveWidgetEvent(events, true, widgetBindings.get(41)).id, 'a');
  assert.equal(resolveWidgetEvent(events, true, widgetBindings.get(42)).id, 'b');
});

test('explicit unbind shows no event while a never-bound widget uses the pinned default', () => {
  assert.equal(resolveWidgetEvent(events, true, ''), null);
  assert.equal(resolveWidgetEvent(events, false, '').id, 'a');
});

test('widget bindings created by older app versions remain bound to their saved event', () => {
  assert.equal(resolveWidgetEvent(events, false, 'b').id, 'b');
});

test('a bound event that was deleted clears only that widget', () => {
  assert.equal(resolveWidgetEvent(events, true, 'deleted-event'), null);
});
