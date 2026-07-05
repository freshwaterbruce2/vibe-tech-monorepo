/**
 * Cadence engine — pure next-run computation and validation for agent
 * schedules. No timers, no I/O; the ScheduleRunner supplies "now".
 *
 * Deviation from spec 16 as written: the monorepo `scheduled-tasks` MCP the
 * spec delegates cron parsing to does not exist (verified 2026-07-04), so
 * recurring cadences use a simplified picker-friendly shape (interval / daily
 * / weekly) instead of cron expressions.
 * Spec: FEATURE_SPECS/competitive-gaps/16-AGENT-SCHEDULING.md
 */
import type { ScheduleCadence } from './types';

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Local wall-clock time of day (hour:minute) applied to a base date. */
function atTimeOfDay(baseMs: number, hour: number, minute: number): number {
  const date = new Date(baseMs);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

/**
 * Compute the next trigger time (epoch ms) strictly after `fromMs`.
 * Returns null when the cadence will never fire again (a 'once' in the past).
 */
export function computeNextRunAt(cadence: ScheduleCadence, fromMs: number): number | null {
  switch (cadence.type) {
    case 'once': {
      const runAtMs = Date.parse(cadence.runAt);
      if (Number.isNaN(runAtMs) || runAtMs <= fromMs) return null;
      return runAtMs;
    }
    case 'interval':
      return fromMs + cadence.everyMinutes * MS_PER_MINUTE;
    case 'daily': {
      const todayAt = atTimeOfDay(fromMs, cadence.hour, cadence.minute);
      return todayAt > fromMs ? todayAt : todayAt + MS_PER_DAY;
    }
    case 'weekly': {
      const sameDayAt = atTimeOfDay(fromMs, cadence.hour, cadence.minute);
      const currentDay = new Date(fromMs).getDay();
      let daysAhead = (cadence.dayOfWeek - currentDay + 7) % 7;
      if (daysAhead === 0 && sameDayAt <= fromMs) daysAhead = 7;
      return sameDayAt + daysAhead * MS_PER_DAY;
    }
  }
}

/** True for cadences that fire more than once. */
export function isRecurring(cadence: ScheduleCadence): boolean {
  return cadence.type !== 'once';
}

/** Human-readable cadence summary for lists and the preview step. */
export function describeCadence(cadence: ScheduleCadence): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  switch (cadence.type) {
    case 'once':
      return `Once at ${new Date(cadence.runAt).toLocaleString()}`;
    case 'interval':
      return `Every ${cadence.everyMinutes} min`;
    case 'daily':
      return `Daily at ${pad(cadence.hour)}:${pad(cadence.minute)}`;
    case 'weekly':
      return `${DAY_NAMES[cadence.dayOfWeek] ?? '?'} at ${pad(cadence.hour)}:${pad(cadence.minute)}`;
  }
}

function validateTimeOfDay(hour: number, minute: number): string | null {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return 'Hour must be 0-23';
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return 'Minute must be 0-59';
  return null;
}

/** Returns an error message, or null when the cadence is valid. */
export function validateCadence(cadence: ScheduleCadence, nowMs: number): string | null {
  switch (cadence.type) {
    case 'once': {
      const runAtMs = Date.parse(cadence.runAt);
      if (Number.isNaN(runAtMs)) return 'Run time is not a valid date';
      if (runAtMs <= nowMs) return 'Run time must be in the future';
      return null;
    }
    case 'interval':
      if (!Number.isInteger(cadence.everyMinutes) || cadence.everyMinutes < 1) {
        return 'Interval must be at least 1 minute';
      }
      return null;
    case 'daily':
      return validateTimeOfDay(cadence.hour, cadence.minute);
    case 'weekly': {
      if (!Number.isInteger(cadence.dayOfWeek) || cadence.dayOfWeek < 0 || cadence.dayOfWeek > 6) {
        return 'Day of week must be 0 (Sunday) to 6 (Saturday)';
      }
      return validateTimeOfDay(cadence.hour, cadence.minute);
    }
  }
}
