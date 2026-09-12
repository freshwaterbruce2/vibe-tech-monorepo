import type { FocusSession, HomeworkItem } from '../types';
import { dataStore } from './dataStore';

export const COMPLETION_DELIVERY_KEY = 'vibetutor_completion_delivery_v1';
const VERSION = 1;
const MAX_ENTRIES = 500;
const MAX_SERIALIZED_BYTES = 1024 * 1024;
const SOURCE_ID = /^[\x21-\x7e]{1,120}$/;
const DERIVED_ID = /^[\x21-\x7e]{1,160}$/;
const PRINTABLE = /^(?=.*\S)[\x20-\x7e]{1,500}$/;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

type Kind = 'homework' | 'focus';
type SourceState = 'prepared' | 'confirmed' | 'cancelled';
type Leg = 'token' | 'achievement';
type LegState = 'pending' | 'settled';

interface HomeworkSource { id: string; completedDate: number; completionDay: string; timezoneOffsetMinutes: number }
interface FocusSource {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  completed: true;
  completionDay: string;
  timezoneOffsetMinutes: number;
}
interface Entry {
  deliveryId: string;
  kind: Kind;
  source: HomeworkSource | FocusSource;
  sourceState: SourceState;
  token: { amount: number; reason: string; operationId: string; state: LegState };
  achievement: {
    eventType: 'TASK_COMPLETED' | 'FOCUS_SESSION_COMPLETED';
    eventId: string;
    payload: { completionDay: string; duration?: number };
    state: LegState;
  };
}
interface Journal { version: 1; entries: Entry[] }
export type RecoverableCompletionDelivery = Readonly<Entry>;

let queue: Promise<void> = Promise.resolve();

async function queued<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
function safe(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function sourceId(value: unknown): value is string {
  return typeof value === 'string' && SOURCE_ID.test(value);
}
function derivedId(value: unknown): value is string {
  return typeof value === 'string' && DERIVED_ID.test(value);
}
function day(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DAY.exec(value);
  if (!match) return false;
  const [, ys, ms, ds] = match;
  const y = Number(ys), m = Number(ms), d = Number(ds);
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(0);
  date.setUTCFullYear(y, m - 1, d);
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}
function offset(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= -840 && value <= 840; }
function localDay(timestamp: number, timezoneOffsetMinutes: number): string {
  const source = new Date(timestamp);
  if (Number.isNaN(source.getTime()) || source.getTime() !== timestamp) fail('Completion timestamp is malformed');
  const date = new Date(timestamp - timezoneOffsetMinutes * 60_000);
  if (Number.isNaN(date.getTime())) fail('Completion timestamp is malformed');
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}
function bytes(value: string) { return new TextEncoder().encode(value).length; }
function fail(message = 'Completion delivery record is malformed'): never { throw new Error(message); }

function parseEntry(value: unknown): Entry {
  if (!exact(value, ['deliveryId', 'kind', 'source', 'sourceState', 'token', 'achievement'])) fail();
  const entry = value as Record<string, unknown>;
  if (!derivedId(entry.deliveryId) || (entry.kind !== 'homework' && entry.kind !== 'focus') ||
      !['prepared', 'confirmed', 'cancelled'].includes(entry.sourceState as string)) fail();
  if (!exact(entry.token, ['amount', 'reason', 'operationId', 'state']) ||
      !safe(entry.token.amount) || typeof entry.token.reason !== 'string' || !derivedId(entry.token.operationId) ||
      !['pending', 'settled'].includes(entry.token.state as string)) fail();
  if (!exact(entry.achievement, ['eventType', 'eventId', 'payload', 'state']) ||
      !['TASK_COMPLETED', 'FOCUS_SESSION_COMPLETED'].includes(entry.achievement.eventType as string) ||
      !derivedId(entry.achievement.eventId) || !['pending', 'settled'].includes(entry.achievement.state as string)) fail();

  const token = entry.token as Entry['token'];
  const achievement = entry.achievement as Entry['achievement'];
  if (entry.sourceState === 'prepared' && (token.state === 'settled' || achievement.state === 'settled')) fail();
  if (entry.kind === 'homework') {
    if (!exact(entry.source, ['id', 'completedDate', 'completionDay', 'timezoneOffsetMinutes']) || !sourceId(entry.source.id) ||
        !safe(entry.source.completedDate) || !offset(entry.source.timezoneOffsetMinutes) || !day(entry.source.completionDay) ||
        entry.source.completionDay !== localDay(entry.source.completedDate, entry.source.timezoneOffsetMinutes) || token.amount !== 10 ||
        token.reason !== 'Homework completed' || token.operationId !== `homework-complete:${entry.source.id}` ||
        entry.deliveryId !== `completion-delivery:homework:${entry.source.id}` ||
        achievement.eventType !== 'TASK_COMPLETED' || achievement.eventId !== `homework-completed:${entry.source.id}` ||
        !exact(achievement.payload, ['completionDay']) || achievement.payload.completionDay !== entry.source.completionDay) fail();
  } else {
    if (!exact(entry.source, ['id', 'startTime', 'endTime', 'duration', 'completed', 'completionDay', 'timezoneOffsetMinutes']) ||
        !sourceId(entry.source.id) || !safe(entry.source.startTime) || !safe(entry.source.endTime) ||
        entry.source.endTime < entry.source.startTime || !safe(entry.source.duration) || entry.source.duration <= 0 || entry.source.duration > 1440 ||
        entry.source.endTime - entry.source.startTime !== entry.source.duration * 60_000 || entry.source.completed !== true || !offset(entry.source.timezoneOffsetMinutes) || !day(entry.source.completionDay) ||
        entry.source.completionDay !== localDay(entry.source.endTime, entry.source.timezoneOffsetMinutes) || token.amount !== entry.source.duration ||
        token.reason !== 'Focus session' || token.operationId !== `focus-session:${entry.source.id}` ||
        entry.deliveryId !== `completion-delivery:focus:${entry.source.id}` ||
        achievement.eventType !== 'FOCUS_SESSION_COMPLETED' || achievement.eventId !== `focus-completed:${entry.source.id}` ||
        !exact(achievement.payload, ['duration', 'completionDay']) || achievement.payload.duration !== entry.source.duration ||
        achievement.payload.completionDay !== entry.source.completionDay) fail();
  }
  return entry as Entry;
}

function parse(serialized: string): Journal {
  if (bytes(serialized) > MAX_SERIALIZED_BYTES) fail('Completion delivery record exceeds the safe limit');
  let raw: unknown;
  try { raw = JSON.parse(serialized); } catch { fail(); }
  if (!exact(raw, ['version', 'entries']) || raw.version !== VERSION || !Array.isArray(raw.entries) || raw.entries.length > MAX_ENTRIES) fail();
  const ids = new Set<string>(), sources = new Set<string>(), tokens = new Set<string>(), events = new Set<string>();
  const entries = raw.entries.map((value) => {
    const entry = parseEntry(value);
    const source = `${entry.kind}:${entry.source.id}`;
    if (ids.has(entry.deliveryId) || sources.has(source) || tokens.has(entry.token.operationId) || events.has(entry.achievement.eventId)) fail();
    ids.add(entry.deliveryId); sources.add(source); tokens.add(entry.token.operationId); events.add(entry.achievement.eventId);
    return entry;
  });
  return { version: 1, entries };
}
function serialize(journal: Journal): string {
  const serialized = JSON.stringify(journal);
  if (bytes(serialized) > MAX_SERIALIZED_BYTES) fail('Completion delivery record exceeds the safe limit');
  parse(serialized);
  return serialized;
}
async function read(): Promise<Journal> {
  const value = await dataStore.getCompletionDeliveryRecord();
  return value === null ? { version: 1, entries: [] } : parse(value);
}
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function done(entry: Entry) { return entry.sourceState === 'cancelled' || (entry.token.state === 'settled' && entry.achievement.state === 'settled'); }
function pruneOneClosed(journal: Journal) {
  const index = journal.entries.findIndex(done);
  if (index >= 0) journal.entries.splice(index, 1);
}

function homework(item: HomeworkItem): HomeworkSource {
  if (!item || typeof item !== 'object' || !sourceId(item.id) || typeof item.subject !== 'string' || !PRINTABLE.test(item.subject) ||
      typeof item.title !== 'string' || !PRINTABLE.test(item.title) || !day(item.dueDate) || item.completed !== true || !safe(item.completedDate)) fail('Completed Homework source is malformed');
  const timezoneOffsetMinutes = new Date(item.completedDate).getTimezoneOffset();
  if (!offset(timezoneOffsetMinutes)) fail('Completed Homework source is malformed');
  return { id: item.id, completedDate: item.completedDate, completionDay: localDay(item.completedDate, timezoneOffsetMinutes), timezoneOffsetMinutes };
}
function focus(session: FocusSession): FocusSource {
  if (!session || typeof session !== 'object' || !sourceId(session.id) || !safe(session.startTime) || !safe(session.endTime) ||
      session.endTime < session.startTime || !safe(session.duration) || session.duration <= 0 || session.duration > 1440 || session.endTime - session.startTime !== session.duration * 60_000 || session.completed !== true ||
      (session.points !== undefined && !safe(session.points))) fail('Completed Focus source is malformed');
  const timezoneOffsetMinutes = new Date(session.endTime).getTimezoneOffset();
  if (!offset(timezoneOffsetMinutes)) fail('Completed Focus source is malformed');
  return { id: session.id, startTime: session.startTime, endTime: session.endTime, duration: session.duration, completed: true, completionDay: localDay(session.endTime, timezoneOffsetMinutes), timezoneOffsetMinutes };
}
function newEntry(kind: Kind, source: HomeworkSource | FocusSource): Entry {
  if (kind === 'homework') {
    if (!('completedDate' in source)) return fail();
    const homeworkSource: HomeworkSource = source;
    return parseEntry({
      deliveryId: `completion-delivery:homework:${homeworkSource.id}`,
      kind,
      source: homeworkSource,
      sourceState: 'prepared',
      token: {
        amount: 10,
        reason: 'Homework completed',
        operationId: `homework-complete:${homeworkSource.id}`,
        state: 'pending',
      },
      achievement: {
        eventType: 'TASK_COMPLETED',
        eventId: `homework-completed:${homeworkSource.id}`,
        payload: { completionDay: homeworkSource.completionDay },
        state: 'pending',
      },
    });
  }
  if (!('duration' in source)) return fail();
  const focusSource: FocusSource = source;
  return parseEntry({
    deliveryId: `completion-delivery:focus:${focusSource.id}`,
    kind,
    source: focusSource,
    sourceState: 'prepared',
    token: {
      amount: focusSource.duration,
      reason: 'Focus session',
      operationId: `focus-session:${focusSource.id}`,
      state: 'pending',
    },
    achievement: {
      eventType: 'FOCUS_SESSION_COMPLETED',
      eventId: `focus-completed:${focusSource.id}`,
      payload: { duration: focusSource.duration, completionDay: focusSource.completionDay },
      state: 'pending',
    },
  });
}
async function prepare(kind: Kind, source: HomeworkSource | FocusSource): Promise<RecoverableCompletionDelivery> {
  return queued(async () => {
    const journal = await read();
    const entry = newEntry(kind, source);
    const existing = journal.entries.find((candidate) => candidate.deliveryId === entry.deliveryId);
    if (existing) {
      if (existing.sourceState === 'cancelled' && existing.token.state === 'pending' && existing.achievement.state === 'pending') {
        journal.entries.splice(journal.entries.indexOf(existing), 1);
      } else {
      if (!sameSource(existing.source, entry.source)) fail('Completion delivery immutable facts conflict');
      return clone(existing);
      }
    }
    if (journal.entries.length >= MAX_ENTRIES) pruneOneClosed(journal);
    if (journal.entries.length >= MAX_ENTRIES) fail('Completion delivery record exceeds the safe limit');
    journal.entries.push(entry);
    await dataStore.saveCompletionDeliveryRecord(serialize(journal));
    return clone(entry);
  });
}

export async function prepareHomeworkCompletionDelivery(item: HomeworkItem) { return prepare('homework', homework(item)); }
export async function prepareFocusCompletionDelivery(session: FocusSession) { return prepare('focus', focus(session)); }

function sameHomework(source: HomeworkSource, item: HomeworkItem | undefined) {
  return !!item && item.completed === true && item.id === source.id && item.completedDate === source.completedDate;
}
function sameFocus(source: FocusSource, session: FocusSession | undefined) {
  return !!session && session.id === source.id && session.startTime === source.startTime && session.endTime === source.endTime && session.duration === source.duration && session.completed === true;
}
function sameSource(left: HomeworkSource | FocusSource, right: HomeworkSource | FocusSource) {
  return Object.keys(left).length === Object.keys(right).length && Object.keys(left).every((key) => left[key as keyof typeof left] === right[key as keyof typeof right]);
}
export async function getRecoverableCompletionDeliveries(): Promise<RecoverableCompletionDelivery[]> {
  return queued(async () => {
    const journal = await read();
    const active = journal.entries.filter((entry) =>
      entry.sourceState === 'prepared' ||
      (entry.sourceState === 'confirmed' && (entry.token.state === 'pending' || entry.achievement.state === 'pending')),
    );
    if (active.length === 0) return [];
    const needsHomework = active.some((entry) => entry.kind === 'homework');
    const needsFocus = active.some((entry) => entry.kind === 'focus');
    const homeworkItems = needsHomework ? await dataStore.getHomeworkItems() : [];
    const focusSessions = needsFocus ? await dataStore.getFocusSessions() : [];
    let changed = false;
    for (const entry of active) {
      const actual = entry.kind === 'homework'
        ? sameHomework(entry.source as HomeworkSource, homeworkItems.find((item) => item.id === entry.source.id))
        : sameFocus(entry.source as FocusSource, focusSessions.find((session) => session.id === entry.source.id));
      const present = entry.kind === 'homework'
        ? homeworkItems.some((item) => item.id === entry.source.id)
        : focusSessions.some((session) => session.id === entry.source.id);
      if (entry.sourceState === 'prepared') {
        if (actual) { entry.sourceState = 'confirmed'; changed = true; }
        else if (!present || (entry.kind === 'homework' && homeworkItems.find((item) => item.id === entry.source.id)?.completed !== true) ||
          (entry.kind === 'focus' && focusSessions.find((session) => session.id === entry.source.id)?.completed !== true)) { entry.sourceState = 'cancelled'; changed = true; }
        else fail('Completion delivery source conflicts with canonical storage');
      } else if (entry.sourceState === 'confirmed' && !actual) {
        const uncompleted = entry.kind === 'homework'
          ? homeworkItems.find((item) => item.id === entry.source.id)?.completed !== true
          : focusSessions.find((session) => session.id === entry.source.id)?.completed !== true;
        if (!present || uncompleted) { entry.sourceState = 'cancelled'; changed = true; }
        else fail('Completion delivery source conflicts with canonical storage');
      }
    }
    if (changed) await dataStore.saveCompletionDeliveryRecord(serialize(journal));
    return journal.entries.filter((entry) => entry.sourceState === 'confirmed' && (entry.token.state === 'pending' || entry.achievement.state === 'pending')).map(clone);
  });
}

export async function markCompletionDeliveryLegSettled(deliveryId: string, leg: Leg): Promise<void> {
  if (!derivedId(deliveryId) || (leg !== 'token' && leg !== 'achievement')) fail('Completion delivery settlement request is malformed');
  await queued(async () => {
    const journal = await read();
    const entry = journal.entries.find((candidate) => candidate.deliveryId === deliveryId);
    if (entry?.sourceState !== 'confirmed') fail('Completion delivery is not confirmed');
    if (entry[leg].state === 'settled') return;
    entry[leg].state = 'settled';
    await dataStore.saveCompletionDeliveryRecord(serialize(journal));
  });
}
