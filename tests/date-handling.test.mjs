import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLocalDate, parseEventDate } from '../constants/types.ts';

test('YYYY-MM-DD event dates round-trip as local calendar dates across time zones', () => {
  const previousTimeZone = process.env.TZ;
  try {
    for (const [timeZone, selected] of [
      ['Pacific/Honolulu', '2026-07-08'],
      ['Asia/Tokyo', '2026-07-08'],
      ['America/New_York', '2026-03-08'],
    ]) {
      process.env.TZ = timeZone;
      assert.equal(formatLocalDate(parseEventDate(selected)), selected);
      assert.equal(parseEventDate(selected).getHours(), 0);
    }
  } finally {
    if (previousTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimeZone;
  }
});
