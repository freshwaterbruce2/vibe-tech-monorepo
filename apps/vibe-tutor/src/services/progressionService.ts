import type { DifficultyLevel, SubjectProgress, SubjectType, WorksheetSession } from '../types';
import { dataStore } from './dataStore';
import { logger } from '../utils/logger';

export const WORKSHEET_PROGRESS_KEY = 'vibetutor_worksheet_progress_v1';
const DAILY_CHALLENGE_CLAIM_KEY = 'daily-worksheet-challenge-claim';
const STARS_TO_LEVEL_UP = 5;
const HISTORY_LIMIT = 50;
const DELIVERY_LIMIT = 500;
const RECORD_LIMIT = 1024 * 1024;
const SUBJECTS = ['Math', 'Science', 'History', 'Bible', 'Language Arts'] as const;
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master'] as const;
type DeliveryLeg = 'token' | 'achievement';
interface Delivery {
  source: Required<WorksheetSession>;
  result: { leveledUp: boolean; newDifficulty?: DifficultyLevel; starsToNextLevel: number };
  token: {
    amount: number;
    reason: 'Worksheet completion';
    operationId: string;
    state: 'pending' | 'settled';
  };
  achievement: { type: 'WORKSHEET_COMPLETED'; eventId: string; state: 'pending' | 'settled' };
}
interface RecordV1 {
  version: 1;
  subjects: Record<SubjectType, SubjectProgress>;
  deliveries: Delivery[];
}
export interface DailyChallengeStatus {
  date: string;
  completedCount: number;
  target: number;
  claimed: boolean;
}
export interface DailyChallengeClaimResult {
  claimed: boolean;
  status: DailyChallengeStatus;
}
let queue: Promise<void> = Promise.resolve();
let dailyQueue: Promise<void> = Promise.resolve();
const dailyClaimInFlightDates = new Set<string>();
const queued = async <T>(work: () => Promise<T>) => {
  const task = queue.then(work, work);
  queue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
};
const queuedDaily = async <T>(work: () => Promise<T>) => {
  const task = dailyQueue.then(work, work);
  dailyQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
};
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const fail = (message = 'Worksheet progress record is malformed'): never => {
  throw new Error(message);
};
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const safe = (value: unknown, max = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max;
const subject = (value: unknown): value is SubjectType => SUBJECTS.includes(value as SubjectType);
const difficulty = (value: unknown): value is DifficultyLevel =>
  DIFFICULTIES.includes(value as DifficultyLevel);
const printable = (value: unknown, max: number): value is string => {
  if (typeof value !== 'string' || value.length === 0 || value.length > max || !value.trim())
    return false;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return false;
    if (code >= 0xd800 && code <= 0xdbff) {
      if (
        index + 1 >= value.length ||
        value.charCodeAt(index + 1) < 0xdc00 ||
        value.charCodeAt(index + 1) > 0xdfff
      )
        return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
};
const bytes = (value: string) => new TextEncoder().encode(value).length;
const questionType = (
  value: unknown,
): value is 'multiple-choice' | 'fill-blank' | 'true-false' | 'matching' =>
  ['multiple-choice', 'fill-blank', 'true-false', 'matching'].includes(value as string);
const worksheetAnswerIsCorrect = (
  question: Record<string, unknown>,
  answer: string | number | null,
) =>
  question.type === 'fill-blank'
    ? String(answer).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase()
    : answer === question.correctAnswer;
function defaults(): Record<SubjectType, SubjectProgress> {
  const now = Date.now();
  return Object.fromEntries(
    SUBJECTS.map((item) => [
      item,
      {
        subject: item,
        currentDifficulty: 'Beginner',
        starsCollected: 0,
        totalWorksheetsCompleted: 0,
        averageScore: 0,
        bestScore: 0,
        currentStreak: 0,
        history: [],
        unlockedAt: now,
      },
    ]),
  ) as unknown as Record<SubjectType, SubjectProgress>;
}
function validateQuestion(
  value: unknown,
  sessionSubject: SubjectType,
  sessionDifficulty: DifficultyLevel,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const question = value as Record<string, unknown>;
  const base = ['id', 'subject', 'difficulty', 'type', 'question', 'correctAnswer'];
  const optional = ['options', 'explanation', 'points'];
  if (
    !Object.keys(question).every((key) => base.includes(key) || optional.includes(key)) ||
    !base.every((key) => Object.hasOwn(question, key))
  )
    return fail();
  if (
    !printable(question.id, 120) ||
    question.subject !== sessionSubject ||
    question.difficulty !== sessionDifficulty ||
    !questionType(question.type) ||
    !printable(question.question, 1000) ||
    !(typeof question.correctAnswer === 'string'
      ? printable(question.correctAnswer, 500)
      : safe(question.correctAnswer, 100)) ||
    (question.explanation !== undefined && !printable(question.explanation, 1000)) ||
    (question.points !== undefined && !safe(question.points, 100))
  )
    return fail();
  const needsOptions = question.type !== 'fill-blank';
  const correctAnswer = question.correctAnswer;
  if (needsOptions) {
    const options = question.options;
    if (
      !Array.isArray(options) ||
      options.length < 1 ||
      options.length > 20 ||
      options.some((option) => !printable(option, 500)) ||
      typeof correctAnswer !== 'number' ||
      !Number.isSafeInteger(correctAnswer) ||
      correctAnswer < 0 ||
      correctAnswer >= options.length
    )
      return fail();
  } else if (question.options !== undefined || !printable(correctAnswer, 500)) return fail();
  return clone(question);
}
function validateSession(
  value: unknown,
  expectedSubject?: SubjectType,
  legacy = false,
): Required<WorksheetSession> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const session = value as Record<string, unknown>;
  const keys = [
    'id',
    'subject',
    'difficulty',
    'questions',
    'answers',
    'score',
    'starsEarned',
    'completedAt',
    'timeSpent',
  ];
  if (!legacy && !exact(session, keys)) return fail();
  if (legacy && !Object.keys(session).every((key) => keys.includes(key))) return fail();
  const secureId =
    /^worksheet:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  if (
    typeof session.id !== 'string' ||
    session.id.length < 1 ||
    session.id.length > 160 ||
    !/^[\x21-\x7e]+$/.test(session.id) ||
    (!legacy && !secureId.test(session.id)) ||
    (legacy && !(secureId.test(session.id) || /^worksheet_\d+$/.test(session.id)))
  )
    return fail();
  const sessionSubject = session.subject;
  const sessionDifficulty = session.difficulty;
  const questionsInput = session.questions;
  const answers = session.answers;
  if (
    !subject(sessionSubject) ||
    (expectedSubject && sessionSubject !== expectedSubject) ||
    !difficulty(sessionDifficulty) ||
    !Array.isArray(questionsInput) ||
    questionsInput.length < 1 ||
    questionsInput.length > 100 ||
    !Array.isArray(answers) ||
    answers.length !== questionsInput.length ||
    !safe(session.score, 100) ||
    !safe(session.starsEarned, 5) ||
    !safe(session.completedAt) ||
    !safe(session.timeSpent, 86400)
  )
    return fail();
  const questions = questionsInput.map((question) =>
    validateQuestion(question, sessionSubject, sessionDifficulty),
  );
  if (new Set(questions.map((question) => question.id as string)).size !== questions.length)
    return fail();
  for (const [index, answer] of answers.entries()) {
    const question = questions[index]!;
    if (answer === null) continue;
    if (typeof answer === 'string') {
      if (!printable(answer, 500)) return fail();
    } else if (
      !Number.isSafeInteger(answer) ||
      answer < 0 ||
      question.type === 'fill-blank' ||
      answer >= ((question.options as unknown[])?.length ?? 0)
    )
      return fail();
  }
  const correct = questions.reduce(
    (total, question, index) =>
      total + (worksheetAnswerIsCorrect(question, answers[index]) ? 1 : 0),
    0,
  );
  const score = Math.round((correct / questions.length) * 100);
  const starsEarned =
    score >= 90 ? 5 : score >= 80 ? 4 : score >= 70 ? 3 : score >= 60 ? 2 : score >= 50 ? 1 : 0;
  if (session.score !== score || session.starsEarned !== starsEarned) return fail();
  return {
    id: session.id,
    subject: sessionSubject,
    difficulty: sessionDifficulty,
    questions: questions as unknown as Required<WorksheetSession>['questions'],
    answers: clone(answers) as unknown as Required<WorksheetSession>['answers'],
    score,
    starsEarned,
    completedAt: session.completedAt,
    timeSpent: session.timeSpent,
  };
}
function validateProgress(
  value: unknown,
  expected: SubjectType,
  legacy = false,
  fallback = defaults()[expected],
): SubjectProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const progress = value as Record<string, unknown>;
  const required = [
    'subject',
    'currentDifficulty',
    'starsCollected',
    'totalWorksheetsCompleted',
    'averageScore',
    'bestScore',
    'currentStreak',
    'history',
    'unlockedAt',
  ];
  if (!legacy && !exact(progress, required)) return fail();
  if (legacy && !Object.keys(progress).every((key) => required.includes(key))) return fail();
  if (legacy && progress.subject !== undefined && progress.subject !== expected)
    return fail('Legacy worksheet progress record is malformed');
  const merged = legacy ? { ...fallback, ...progress, subject: expected } : progress;
  if (
    merged.subject !== expected ||
    !difficulty(merged.currentDifficulty) ||
    !safe(merged.starsCollected, 5) ||
    !safe(merged.totalWorksheetsCompleted) ||
    typeof merged.averageScore !== 'number' ||
    !Number.isFinite(merged.averageScore) ||
    merged.averageScore < 0 ||
    merged.averageScore > 100 ||
    !safe(merged.bestScore, 100) ||
    !safe(merged.currentStreak) ||
    !safe(merged.unlockedAt) ||
    !Array.isArray(merged.history) ||
    merged.history.length > HISTORY_LIMIT
  )
    return fail();
  const history = merged.history.map((session) =>
    validateSession(
      session,
      expected,
      legacy ||
        (typeof (session as { id?: unknown }).id === 'string' &&
          /^worksheet_\d+$/.test((session as { id: string }).id)),
    ),
  );
  if (new Set(history.map((session) => session.id)).size !== history.length) return fail();
  if (!legacy) {
    if (
      merged.totalWorksheetsCompleted < history.length ||
      merged.currentStreak > merged.totalWorksheetsCompleted ||
      (merged.currentDifficulty !== 'Master' && merged.starsCollected > 4)
    )
      return fail();
    const scores = history.map((session) => session.score);
    const mean = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const maximum = scores.length ? Math.max(...scores) : 0;
    if (
      merged.averageScore !== mean ||
      merged.bestScore < maximum ||
      (scores.length === 0 && (merged.averageScore !== 0 || merged.bestScore !== 0))
    )
      return fail();
  }
  return {
    subject: expected,
    currentDifficulty: merged.currentDifficulty,
    starsCollected: merged.starsCollected,
    totalWorksheetsCompleted: merged.totalWorksheetsCompleted,
    averageScore: merged.averageScore,
    bestScore: merged.bestScore,
    currentStreak: merged.currentStreak,
    history,
    unlockedAt: merged.unlockedAt,
  };
}
function validateDelivery(value: unknown): Delivery {
  if (!exact(value, ['source', 'result', 'token', 'achievement'])) return fail();
  const source = validateSession(value.source);
  if (
    (!exact(value.result, ['leveledUp', 'starsToNextLevel']) &&
      !exact(value.result, ['leveledUp', 'newDifficulty', 'starsToNextLevel'])) ||
    typeof value.result.leveledUp !== 'boolean' ||
    !safe(value.result.starsToNextLevel, STARS_TO_LEVEL_UP)
  )
    return fail();
  const next = getNextDifficulty(source.difficulty);
  if (!value.result.leveledUp && value.result.newDifficulty !== undefined) return fail();
  if (
    value.result.leveledUp &&
    (next === null ||
      value.result.newDifficulty !== next ||
      value.result.starsToNextLevel !== STARS_TO_LEVEL_UP)
  )
    return fail();
  if (
    !exact(value.token, ['amount', 'reason', 'operationId', 'state']) ||
    value.token.amount !== source.starsEarned ||
    value.token.reason !== 'Worksheet completion' ||
    value.token.operationId !== `worksheet:complete:${source.id}` ||
    !['pending', 'settled'].includes(value.token.state as string)
  )
    return fail();
  if (
    !exact(value.achievement, ['type', 'eventId', 'state']) ||
    value.achievement.type !== 'WORKSHEET_COMPLETED' ||
    value.achievement.eventId !== `worksheet-completed:${source.id}` ||
    !['pending', 'settled'].includes(value.achievement.state as string)
  )
    return fail();
  if (source.starsEarned === 0 && value.token.state !== 'settled') return fail();
  return clone(value) as Delivery;
}
function parse(serialized: string): RecordV1 {
  if (bytes(serialized) > RECORD_LIMIT)
    return fail('Worksheet progress record exceeds the safe limit');
  let raw: unknown;
  try {
    raw = JSON.parse(serialized);
  } catch {
    return fail();
  }
  if (!exact(raw, ['version', 'subjects', 'deliveries']) || raw.version !== 1) return fail();
  const rawSubjects = raw.subjects;
  const rawDeliveries = raw.deliveries;
  if (
    !exact(rawSubjects, SUBJECTS) ||
    !Array.isArray(rawDeliveries) ||
    rawDeliveries.length > DELIVERY_LIMIT
  )
    return fail();
  const subjects = Object.fromEntries(
    SUBJECTS.map((item) => [item, validateProgress(rawSubjects[item], item)]),
  ) as unknown as Record<SubjectType, SubjectProgress>;
  const historyById = new Map<string, Required<WorksheetSession>>();
  for (const progress of Object.values(subjects))
    for (const session of progress.history) {
      if (historyById.has(session.id)) return fail();
      historyById.set(session.id, session as Required<WorksheetSession>);
    }
  const deliveries = rawDeliveries.map((entry) => validateDelivery(entry));
  const deliveryIds = new Set<string>(),
    operations = new Set<string>(),
    events = new Set<string>();
  for (const entry of deliveries) {
    if (
      deliveryIds.has(entry.source.id) ||
      operations.has(entry.token.operationId) ||
      events.has(entry.achievement.eventId)
    )
      return fail();
    deliveryIds.add(entry.source.id);
    operations.add(entry.token.operationId);
    events.add(entry.achievement.eventId);
    const retained = historyById.get(entry.source.id);
    if (
      retained &&
      (retained.subject !== entry.source.subject ||
        JSON.stringify(retained) !== JSON.stringify(entry.source))
    )
      return fail();
  }
  for (const item of SUBJECTS) {
    const progress = subjects[item];
    const entries = deliveries.filter((entry) => entry.source.subject === item);
    const pruned = entries.filter((entry) => !historyById.has(entry.source.id));
    if (
      progress.totalWorksheetsCompleted < progress.history.length + pruned.length ||
      pruned.length > progress.totalWorksheetsCompleted - progress.history.length
    )
      return fail();
  }
  return { version: 1, subjects, deliveries };
}
function legacy(serialized: string): RecordV1 {
  let raw: unknown;
  try {
    raw = JSON.parse(serialized);
  } catch {
    return fail('Legacy worksheet progress record is malformed');
  }
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw) ||
    !Object.keys(raw as object).every((key) => SUBJECTS.includes(key as SubjectType))
  )
    return fail('Legacy worksheet progress record is malformed');
  const source = raw as Record<string, unknown>;
  const initial = defaults();
  const subjects = Object.fromEntries(
    SUBJECTS.map((item) => [
      item,
      source[item] === undefined
        ? initial[item]
        : validateProgress(source[item], item, true, initial[item]),
    ]),
  ) as unknown as Record<SubjectType, SubjectProgress>;
  const ids = new Set<string>();
  for (const progress of Object.values(subjects))
    for (const session of progress.history) {
      if (ids.has(session.id)) return fail('Legacy worksheet progress record is malformed');
      ids.add(session.id);
    }
  return { version: 1, subjects, deliveries: [] };
}
async function read(): Promise<RecordV1> {
  const canonical = await dataStore.getWorksheetProgressRecord();
  if (canonical !== null) return parse(canonical);
  const old = await dataStore.getLegacyWorksheetProgressRecord();
  return old === null ? { version: 1, subjects: defaults(), deliveries: [] } : legacy(old);
}
function serialize(record: RecordV1): string {
  const value = JSON.stringify(record);
  parse(value);
  return value;
}
function result(progress: SubjectProgress, leveledUp: boolean, newDifficulty?: DifficultyLevel) {
  return {
    leveledUp,
    ...(newDifficulty ? { newDifficulty } : {}),
    starsToNextLevel: Math.max(0, STARS_TO_LEVEL_UP - progress.starsCollected),
  };
}
function apply(record: RecordV1, session: Required<WorksheetSession>) {
  const progress = record.subjects[session.subject];
  progress.history = [...progress.history, session].slice(-HISTORY_LIMIT);
  progress.totalWorksheetsCompleted += 1;
  const scores: number[] = progress.history.map((item) => {
    if (!safe(item.score, 100)) return fail();
    return item.score;
  });
  progress.averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  progress.bestScore = Math.max(progress.bestScore, session.score);
  progress.currentStreak = session.starsEarned >= 3 ? progress.currentStreak + 1 : 0;
  progress.starsCollected += session.starsEarned;
  let leveledUp = false;
  let newDifficulty: DifficultyLevel | undefined;
  if (progress.starsCollected >= STARS_TO_LEVEL_UP) {
    const index = DIFFICULTIES.indexOf(progress.currentDifficulty);
    if (index < DIFFICULTIES.length - 1) {
      newDifficulty = DIFFICULTIES[index + 1]!;
      progress.currentDifficulty = newDifficulty;
      progress.starsCollected = 0;
      leveledUp = true;
    } else progress.starsCollected = STARS_TO_LEVEL_UP;
  }
  return result(progress, leveledUp, newDifficulty);
}
function compact(record: RecordV1) {
  while (record.deliveries.length >= DELIVERY_LIMIT) {
    const index = record.deliveries.findIndex(
      (entry) =>
        entry.token.state === 'settled' &&
        entry.achievement.state === 'settled' &&
        !record.subjects[entry.source.subject].history.some(
          (session) => session.id === entry.source.id,
        ),
    );
    if (index < 0) return fail('Worksheet delivery record exceeds the safe limit');
    record.deliveries.splice(index, 1);
  }
}
export async function loadProgress() {
  return clone((await queued(read)).subjects);
}
export async function getSubjectProgress(value: SubjectType) {
  return (await loadProgress())[value];
}
export async function getAllProgress() {
  return loadProgress();
}
export async function recordWorksheetCompletion(subject: SubjectType, session: WorksheetSession) {
  if (subject !== session.subject) throw new Error('Worksheet subject conflicts with the session');
  const completion = await completeWorksheet(session);
  return {
    progress: completion.progress,
    leveledUp: completion.leveledUp,
    newDifficulty: completion.newDifficulty,
    starsEarned: session.starsEarned ?? 0,
  };
}
export async function completeWorksheet(session: WorksheetSession) {
  return queued(async () => {
    const record = await read();
    const source = validateSession(session);
    const delivery = record.deliveries.find((item) => item.source.id === source.id);
    if (delivery) {
      if (JSON.stringify(delivery.source) !== JSON.stringify(source))
        throw new Error('Worksheet session id conflicts with an existing session');
      return {
        ...clone(delivery.result),
        progress: clone(record.subjects[source.subject]),
        replayed: true,
      };
    }
    const retained = Object.values(record.subjects)
      .flatMap((progress) => progress.history)
      .find((item) => item.id === source.id);
    if (retained) {
      if (JSON.stringify(retained) !== JSON.stringify(source))
        throw new Error('Worksheet session id conflicts with an existing session');
      throw new Error('Worksheet session is a legacy record and cannot mint a delivery');
    }
    if (record.subjects[source.subject].currentDifficulty !== source.difficulty)
      throw new Error('Worksheet session difficulty conflicts with current progress');
    compact(record);
    const completion = apply(record, source);
    const entry: Delivery = {
      source,
      result: completion,
      token: {
        amount: source.starsEarned,
        reason: 'Worksheet completion',
        operationId: `worksheet:complete:${source.id}`,
        state: source.starsEarned === 0 ? 'settled' : 'pending',
      },
      achievement: {
        type: 'WORKSHEET_COMPLETED',
        eventId: `worksheet-completed:${source.id}`,
        state: 'pending',
      },
    };
    record.deliveries.push(entry);
    await dataStore.saveWorksheetProgressRecord(serialize(record));
    return { ...clone(completion), progress: clone(record.subjects[source.subject]) };
  });
}
export async function getRecoverableWorksheetDeliveries() {
  return queued(async () =>
    clone(
      (await read()).deliveries.filter(
        (entry) => entry.token.state === 'pending' || entry.achievement.state === 'pending',
      ),
    ),
  );
}
export async function markWorksheetDeliveryLegSettled(
  sessionId: string,
  leg: DeliveryLeg,
  expectedIdentity: string,
) {
  if (leg !== 'token' && leg !== 'achievement')
    throw new Error('Worksheet delivery settlement is invalid');
  return queued(async () => {
    const record = await read();
    const entry = record.deliveries.find((item) => item.source.id === sessionId);
    const identity = leg === 'token' ? entry?.token.operationId : entry?.achievement.eventId;
    if (!entry || expectedIdentity !== identity)
      throw new Error('Worksheet delivery settlement is invalid');
    if (entry[leg].state === 'settled') return;
    entry[leg].state = 'settled';
    await dataStore.saveWorksheetProgressRecord(serialize(record));
  });
}
export function getNextDifficulty(current: DifficultyLevel): DifficultyLevel | null {
  const index = DIFFICULTIES.indexOf(current);
  return index >= 0 && index < DIFFICULTIES.length - 1 ? DIFFICULTIES[index + 1]! : null;
}
export async function getProgressToNextLevel(value: SubjectType) {
  return (await getSubjectProgress(value)).starsCollected / STARS_TO_LEVEL_UP;
}
export function getLocalDateKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function countWorksheetsCompletedOnDate(
  progress: Record<SubjectType, SubjectProgress>,
  timestamp = Date.now(),
) {
  const date = getLocalDateKey(timestamp);
  return Object.values(progress).reduce(
    (total, item) =>
      total +
      item.history.filter(
        (session) =>
          typeof session.completedAt === 'number' && getLocalDateKey(session.completedAt) === date,
      ).length,
    0,
  );
}
interface DailyClaim { date: string; claimedAt: number; state: 'pending' | 'rewarded' }
type ParsedDailyClaim =
  | { state: 'missing' }
  | { state: 'valid'; claim: DailyClaim }
  | { state: 'malformed' };
function validLocalDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}
function claim(value: unknown): ParsedDailyClaim {
  if (value === '' || value === null || value === undefined) return { state: 'missing' };
  try {
    if (typeof value !== 'string') return { state: 'malformed' };
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return { state: 'malformed' };
    if (exact(parsed, ['date', 'claimedAt'])) {
      if (!validLocalDateKey(parsed.date) || !safe(parsed.claimedAt)) {
        return { state: 'malformed' };
      }
      return {
        state: 'valid',
        claim: { date: parsed.date, claimedAt: parsed.claimedAt, state: 'rewarded' },
      };
    }
    if (!exact(parsed, ['date', 'claimedAt', 'state'])) return { state: 'malformed' };
    if (
      !validLocalDateKey(parsed.date) ||
      !safe(parsed.claimedAt) ||
      (parsed.state !== 'pending' && parsed.state !== 'rewarded')
    ) {
      return { state: 'malformed' };
    }
    return {
      state: 'valid',
      claim: { date: parsed.date, claimedAt: parsed.claimedAt, state: parsed.state },
    };
  } catch (error) {
    logger.error('Failed to read daily worksheet challenge claim:', error);
    return { state: 'malformed' };
  }
}
export async function getDailyChallengeStatus(
  target: number,
  timestamp = Date.now(),
): Promise<DailyChallengeStatus> {
  const date = getLocalDateKey(timestamp);
  const [progress, stored] = await Promise.all([
    getAllProgress(),
    dataStore.getUserSettings(DAILY_CHALLENGE_CLAIM_KEY),
  ]);
  const parsed = claim(stored);
  return {
    date,
    completedCount: countWorksheetsCompletedOnDate(progress, timestamp),
    target,
    claimed:
      parsed.state === 'valid' && parsed.claim.date === date && parsed.claim.state === 'rewarded',
  };
}
export async function claimDailyChallenge(
  target: number,
  timestamp = Date.now(),
): Promise<DailyChallengeClaimResult> {
  const date = getLocalDateKey(timestamp);
  if (dailyClaimInFlightDates.has(date))
    return { claimed: false, status: await getDailyChallengeStatus(target, timestamp) };
  dailyClaimInFlightDates.add(date);
  return queuedDaily(async () => {
    try {
      const status = await getDailyChallengeStatus(target, timestamp);
      if (status.claimed || status.completedCount < target) return { claimed: false, status };
      const stored = claim(await dataStore.getUserSettings(DAILY_CHALLENGE_CLAIM_KEY));
      if (stored.state === 'malformed') return { claimed: false, status };
      if (
        stored.state === 'valid' &&
        stored.claim.date === date &&
        stored.claim.state === 'pending'
      ) {
        return { claimed: true, status };
      }
      await dataStore.saveUserSettings(
        DAILY_CHALLENGE_CLAIM_KEY,
        JSON.stringify({ date, claimedAt: timestamp, state: 'pending' }),
      );
      return { claimed: true, status };
    } catch (error) {
      logger.error('Failed to claim daily worksheet challenge:', error);
      return { claimed: false, status: await getDailyChallengeStatus(target, timestamp) };
    } finally {
      dailyClaimInFlightDates.delete(date);
    }
  });
}
export async function confirmDailyChallengeClaim(date: string, claimedAt = Date.now()) {
  if (date !== getLocalDateKey(claimedAt))
    throw new Error('Daily challenge date is no longer current');
  await queuedDaily(async () => {
    await dataStore.saveUserSettings(
      DAILY_CHALLENGE_CLAIM_KEY,
      JSON.stringify({ date, claimedAt, state: 'rewarded' }),
    );
  });
}
export async function getTotalStars() {
  return Object.values(await loadProgress()).reduce(
    (total, progress) =>
      total + progress.history.reduce((sum, session) => sum + (session.starsEarned ?? 0), 0),
    0,
  );
}
export async function getTotalWorksheetsCompleted() {
  return Object.values(await loadProgress()).reduce(
    (total, progress) => total + progress.totalWorksheetsCompleted,
    0,
  );
}
