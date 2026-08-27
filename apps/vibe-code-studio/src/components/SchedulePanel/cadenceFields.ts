/**
 * Cadence form-field mapping — pure helpers shared by CreateScheduleForm and
 * its tests, kept out of the component file (react-refresh only-export rule).
 * Spec: FEATURE_SPECS/competitive-gaps/16-AGENT-SCHEDULING.md
 */
import type {
  MissedRunPolicy,
  ScheduleCadence,
  ScheduleDefinition,
} from '../../services/scheduling/types';

export interface CadenceFields {
  type: ScheduleCadence['type'];
  runAt: string; // datetime-local value
  everyMinutes: string;
  time: string; // HH:MM
  dayOfWeek: string;
}

/** Initial values for the schedule form (create-prefill or edit) */
export interface ScheduleFormInitial {
  agentId: string;
  userRequest: string;
  missedRunPolicy: MissedRunPolicy;
  fields: CadenceFields;
}

export const DEFAULT_CADENCE_FIELDS: CadenceFields = {
  type: 'once',
  runAt: '',
  everyMinutes: '60',
  time: '09:00',
  dayOfWeek: '1',
};

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

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** ISO timestamp → datetime-local input value (local wall-clock) */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return `${date}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Inverse of cadenceFromFields — map a stored cadence back onto form fields */
export function fieldsFromCadence(cadence: ScheduleCadence): CadenceFields {
  const fields = { ...DEFAULT_CADENCE_FIELDS, type: cadence.type };
  switch (cadence.type) {
    case 'once':
      return { ...fields, runAt: isoToLocalInput(cadence.runAt) };
    case 'interval':
      return { ...fields, everyMinutes: String(cadence.everyMinutes) };
    case 'daily':
      return { ...fields, time: `${pad2(cadence.hour)}:${pad2(cadence.minute)}` };
    case 'weekly':
      return {
        ...fields,
        time: `${pad2(cadence.hour)}:${pad2(cadence.minute)}`,
        dayOfWeek: String(cadence.dayOfWeek),
      };
  }
}

/** Build the edit form's initial values from an existing schedule */
export function initialFromSchedule(
  schedule: Pick<ScheduleDefinition, 'agentId' | 'userRequest' | 'missedRunPolicy' | 'cadence'>
): ScheduleFormInitial {
  return {
    agentId: schedule.agentId,
    userRequest: schedule.userRequest,
    missedRunPolicy: schedule.missedRunPolicy,
    fields: fieldsFromCadence(schedule.cadence),
  };
}
