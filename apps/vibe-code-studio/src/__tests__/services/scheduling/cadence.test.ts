/**
 * Cadence engine tests — next-run computation, recurrence, description,
 * validation. All pure; times built with local-time Date APIs so assertions
 * are timezone-independent.
 */
import { describe, expect, it } from 'vitest';
import {
  computeNextRunAt,
  describeCadence,
  isRecurring,
  validateCadence,
} from '../../../services/scheduling/cadence';
import type { ScheduleCadence } from '../../../services/scheduling/types';

/** Local-time timestamp builder (year, monthIndex, day, hour, minute) */
const at = (y: number, mo: number, d: number, h: number, mi: number): number =>
  new Date(y, mo, d, h, mi, 0, 0).getTime();

describe('computeNextRunAt', () => {
  it('returns the runAt time for a future once cadence', () => {
    const runAt = new Date(at(2026, 6, 10, 9, 0)).toISOString();
    const from = at(2026, 6, 4, 12, 0);
    expect(computeNextRunAt({ type: 'once', runAt }, from)).toBe(at(2026, 6, 10, 9, 0));
  });

  it('returns null for a once cadence in the past or at exactly now', () => {
    const runAt = new Date(at(2026, 6, 1, 9, 0)).toISOString();
    expect(computeNextRunAt({ type: 'once', runAt }, at(2026, 6, 4, 12, 0))).toBeNull();
    expect(computeNextRunAt({ type: 'once', runAt }, at(2026, 6, 1, 9, 0))).toBeNull();
  });

  it('returns null for an unparseable once runAt', () => {
    expect(computeNextRunAt({ type: 'once', runAt: 'not-a-date' }, 0)).toBeNull();
  });

  it('adds the interval to now for interval cadences', () => {
    const from = at(2026, 6, 4, 12, 0);
    expect(computeNextRunAt({ type: 'interval', everyMinutes: 15 }, from)).toBe(from + 15 * 60_000);
  });

  it('picks today for a daily time still ahead, tomorrow otherwise', () => {
    const cadence: ScheduleCadence = { type: 'daily', hour: 9, minute: 30 };
    expect(computeNextRunAt(cadence, at(2026, 6, 4, 8, 0))).toBe(at(2026, 6, 4, 9, 30));
    expect(computeNextRunAt(cadence, at(2026, 6, 4, 10, 0))).toBe(at(2026, 6, 5, 9, 30));
  });

  it('picks the next matching weekday for weekly cadences', () => {
    // 2026-07-04 is a Saturday (day 6); Monday is day 1
    const cadence: ScheduleCadence = { type: 'weekly', dayOfWeek: 1, hour: 9, minute: 0 };
    expect(computeNextRunAt(cadence, at(2026, 6, 4, 12, 0))).toBe(at(2026, 6, 6, 9, 0));
  });

  it('waits a full week when the weekly slot today has already passed', () => {
    // From a Saturday afternoon, next Saturday 9:00 is 7 days out
    const cadence: ScheduleCadence = { type: 'weekly', dayOfWeek: 6, hour: 9, minute: 0 };
    expect(computeNextRunAt(cadence, at(2026, 6, 4, 12, 0))).toBe(at(2026, 6, 11, 9, 0));
  });

  it('fires later today when the weekly slot is still ahead', () => {
    const cadence: ScheduleCadence = { type: 'weekly', dayOfWeek: 6, hour: 18, minute: 0 };
    expect(computeNextRunAt(cadence, at(2026, 6, 4, 12, 0))).toBe(at(2026, 6, 4, 18, 0));
  });
});

describe('isRecurring', () => {
  it('is false only for once cadences', () => {
    expect(isRecurring({ type: 'once', runAt: new Date().toISOString() })).toBe(false);
    expect(isRecurring({ type: 'interval', everyMinutes: 5 })).toBe(true);
    expect(isRecurring({ type: 'daily', hour: 9, minute: 0 })).toBe(true);
    expect(isRecurring({ type: 'weekly', dayOfWeek: 1, hour: 9, minute: 0 })).toBe(true);
  });
});

describe('describeCadence', () => {
  it('describes each cadence type', () => {
    const runAt = new Date(at(2026, 6, 10, 9, 0)).toISOString();
    expect(describeCadence({ type: 'once', runAt })).toContain('Once at');
    expect(describeCadence({ type: 'interval', everyMinutes: 15 })).toBe('Every 15 min');
    expect(describeCadence({ type: 'daily', hour: 9, minute: 5 })).toBe('Daily at 09:05');
    expect(describeCadence({ type: 'weekly', dayOfWeek: 1, hour: 9, minute: 0 })).toBe(
      'Monday at 09:00'
    );
  });
});

describe('validateCadence', () => {
  const now = at(2026, 6, 4, 12, 0);

  it('accepts valid cadences', () => {
    const runAt = new Date(at(2026, 6, 10, 9, 0)).toISOString();
    expect(validateCadence({ type: 'once', runAt }, now)).toBeNull();
    expect(validateCadence({ type: 'interval', everyMinutes: 1 }, now)).toBeNull();
    expect(validateCadence({ type: 'daily', hour: 0, minute: 0 }, now)).toBeNull();
    expect(validateCadence({ type: 'weekly', dayOfWeek: 6, hour: 23, minute: 59 }, now)).toBeNull();
  });

  it('rejects invalid once cadences', () => {
    expect(validateCadence({ type: 'once', runAt: 'garbage' }, now)).toMatch(/valid date/);
    const past = new Date(at(2026, 6, 1, 9, 0)).toISOString();
    expect(validateCadence({ type: 'once', runAt: past }, now)).toMatch(/future/);
  });

  it('rejects invalid intervals', () => {
    expect(validateCadence({ type: 'interval', everyMinutes: 0 }, now)).toMatch(/at least 1/);
    expect(validateCadence({ type: 'interval', everyMinutes: 1.5 }, now)).toMatch(/at least 1/);
  });

  it('rejects out-of-range daily times', () => {
    expect(validateCadence({ type: 'daily', hour: 24, minute: 0 }, now)).toMatch(/Hour/);
    expect(validateCadence({ type: 'daily', hour: 9, minute: 60 }, now)).toMatch(/Minute/);
  });

  it('rejects out-of-range weekly fields', () => {
    expect(validateCadence({ type: 'weekly', dayOfWeek: 7, hour: 9, minute: 0 }, now)).toMatch(
      /Day of week/
    );
    expect(validateCadence({ type: 'weekly', dayOfWeek: 1, hour: -1, minute: 0 }, now)).toMatch(
      /Hour/
    );
  });
});
