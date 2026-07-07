/**
 * Cadence form-field mapping — pure helpers shared by CreateScheduleForm and
 * its tests, kept out of the component file (react-refresh only-export rule).
 * Spec: FEATURE_SPECS/competitive-gaps/16-AGENT-SCHEDULING.md
 */
import type { ScheduleCadence } from '../../services/scheduling/types';

export interface CadenceFields {
  type: ScheduleCadence['type'];
  runAt: string; // datetime-local value
  everyMinutes: string;
  time: string; // HH:MM
  dayOfWeek: string;
}

export const DAY_OPTIONS = [
  ['1', 'Monday'],
  ['2', 'Tuesday'],
  ['3', 'Wednesday'],
  ['4', 'Thursday'],
  ['5', 'Friday'],
  ['6', 'Saturday'],
  ['0', 'Sunday'],
] as const;

/** Build a ScheduleCadence from raw form fields */
export function cadenceFromFields(fields: CadenceFields): ScheduleCadence {
  const [hourRaw = '', minuteRaw = ''] = fields.time.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  switch (fields.type) {
    case 'once':
      return { type: 'once', runAt: new Date(fields.runAt).toISOString() };
    case 'interval':
      return { type: 'interval', everyMinutes: Number(fields.everyMinutes) };
    case 'daily':
      return { type: 'daily', hour, minute };
    case 'weekly':
      return { type: 'weekly', dayOfWeek: Number(fields.dayOfWeek), hour, minute };
  }
}
