import { FlameIcon } from '../components/ui/icons/FlameIcon';
import { TrophyIcon } from '../components/ui/icons/TrophyIcon';
import type { Achievement } from '../types';
import { dataStore } from './dataStore';

export const ACHIEVEMENT_LIFECYCLE_KEY = 'vibetutor_achievement_lifecycle_v1';
const ID = [
  'FIRST_TASK',
  'FIVE_TASKS',
  'TEN_TASKS',
  'STREAK_MASTER',
  'FIRST_FOCUS',
  'FOCUS_FIVE',
  'FOCUS_TEN',
  'FOCUS_MARATHON',
  'DAILY_FOCUS',
  'FIRST_GAME',
  'MATH_MASTER',
  'WORD_WIZARD',
  'PATTERN_PRO',
  'BIG_SPENDER',
] as const;
type AchievementId = (typeof ID)[number];
const IDS = new Set<string>(ID);
export const ACHIEVEMENT_TOKEN_REWARDS: Record<AchievementId, number> = {
  FIRST_TASK: 25,
  FIVE_TASKS: 50,
  TEN_TASKS: 100,
  STREAK_MASTER: 150,
  FIRST_FOCUS: 25,
  FOCUS_FIVE: 50,
  FOCUS_TEN: 100,
  FOCUS_MARATHON: 150,
  DAILY_FOCUS: 200,
  FIRST_GAME: 10,
  MATH_MASTER: 50,
  WORD_WIZARD: 50,
  PATTERN_PRO: 50,
  BIG_SPENDER: 20,
};
export const ACHIEVEMENT_POINTS = ACHIEVEMENT_TOKEN_REWARDS;
const GOAL: Record<AchievementId, number> = {
  FIRST_TASK: 1,
  FIVE_TASKS: 5,
  TEN_TASKS: 10,
  STREAK_MASTER: 3,
  FIRST_FOCUS: 1,
  FOCUS_FIVE: 5,
  FOCUS_TEN: 10,
  FOCUS_MARATHON: 100,
  DAILY_FOCUS: 3,
  FIRST_GAME: 1,
  MATH_MASTER: 500,
  WORD_WIZARD: 50,
  PATTERN_PRO: 30,
  BIG_SPENDER: 1,
};
const CATALOG: Achievement[] = [
  ['FIRST_TASK', 'First Step', 'Complete your first homework task.', TrophyIcon],
  ['FIVE_TASKS', 'Task Rabbit', 'Complete 5 homework tasks.', TrophyIcon],
  ['TEN_TASKS', 'Task Master', 'Complete 10 homework tasks.', TrophyIcon],
  ['STREAK_MASTER', 'Streak Master', 'Complete tasks for 3 days in a row.', FlameIcon],
  ['FIRST_FOCUS', 'Focus Beginner', 'Complete your first focus session.', TrophyIcon],
  ['FOCUS_FIVE', 'Focus Enthusiast', 'Complete 5 focus sessions.', TrophyIcon],
  ['FOCUS_TEN', 'Focus Expert', 'Complete 10 focus sessions.', TrophyIcon],
  ['FOCUS_MARATHON', 'Marathon Mind', 'Focus for 100 minutes total.', FlameIcon],
  ['DAILY_FOCUS', 'Daily Discipline', 'Focus for 3 days in a row.', FlameIcon],
  ['FIRST_GAME', 'Game Player', 'Play your first learning game.', TrophyIcon],
  ['MATH_MASTER', 'Math Master', 'Score 500 points in Math Adventure.', TrophyIcon],
  ['WORD_WIZARD', 'Word Wizard', 'Build 50 words correctly.', TrophyIcon],
  ['PATTERN_PRO', 'Pattern Pro', 'Complete 30 pattern quests.', TrophyIcon],
  ['BIG_SPENDER', 'Big Spender', 'Make your first purchase in the Avatar Shop.', TrophyIcon],
].map(([id, name, description, icon]) => ({
  id: id as string,
  name: name as string,
  description: description as string,
  icon: icon as Achievement['icon'],
  goal: GOAL[id as AchievementId],
  unlocked: false,
}));
const LIMIT = 512,
  DAY_LIMIT = 512,
  DAY = /^(\d{4})-(\d{2})-(\d{2})$/,
  UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  TEXT = /^[\x21-\x7e]+$/;
export type AchievementEvent =
  | {
      type: 'TASK_COMPLETED';
      eventId: `homework-completed:${string}`;
      payload: { completionDay: string };
    }
  | {
      type: 'FOCUS_SESSION_COMPLETED';
      eventId: `focus-completed:${string}`;
      payload: { duration: number; completionDay: string };
    }
  | { type: 'WORKSHEET_COMPLETED'; eventId: `worksheet-completed:${string}`; payload?: unknown }
  | {
      type: 'GAME_COMPLETED';
      eventId: `game-completed:${string}`;
      payload: {
        achievementKey: 'ordinary' | 'mathAdventure' | 'wordBuilder' | 'patternQuest';
        score: number;
      };
    }
  | { type: 'SHOP_PURCHASE'; eventId: `shop-purchase:avatar-purchase:${string}` };
interface Stats {
  tasks: number;
  focusSessions: number;
  focusMinutes: number;
  games: number;
  purchases: number;
  mathScore: number;
  wordScore: number;
  patternCount: number;
  taskDays: string[];
  focusDays: string[];
  taskBestStreak: number;
  focusBestStreak: number;
}
interface State { unlocked: boolean; progress: number }
export interface PendingAchievementAward {
  achievementId: AchievementId;
  operationId: string;
  amount: number;
}
interface RecordV1 {
  version: 1;
  states: Record<AchievementId, State>;
  stats: Stats;
  processedEvents: { eventId: string; fingerprint: string }[];
  pendingAwards: PendingAchievementAward[];
}
type ParsedEvent =
  | { id: string; f: string; k: 'task' | 'focus' | 'worksheet' | 'shop' }
  | {
      id: string;
      f: string;
      k: 'game';
      c: 'ordinary' | 'mathAdventure' | 'wordBuilder' | 'patternQuest';
    };
interface RuntimeEvent {
  p: ParsedEvent;
  a: AchievementId[];
  apply: (stats: Stats, keepDay?: boolean) => void;
  streakId?: 'STREAK_MASTER' | 'DAILY_FOCUS';
}
let current: RecordV1 | null = null;
let serial: Promise<void> = Promise.resolve();
const bad = (x: string): never => {
  throw new Error(`${x} is malformed`);
};
const n = (v: unknown, x: string, max: number) =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max ? v : bad(x);
const s = (v: unknown, x: string, max = 160) =>
  typeof v === 'string' && v.length > 0 && v.length <= max && TEXT.test(v) ? v : bad(x);
function date(v: unknown, x: string) {
  const value = s(v, x, 10),
    m = DAY.exec(value);
  if (!m) bad(x);
  const y = Number(m![1]),
    mo = Number(m![2]),
    d = Number(m![3]),
    check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d)
    bad(x);
  return value;
}
const copy = <T>(v: T) => JSON.parse(JSON.stringify(v)) as T;
function empty(): RecordV1 {
  return {
    version: 1,
    states: Object.fromEntries(ID.map((id) => [id, { unlocked: false, progress: 0 }])) as Record<
      AchievementId,
      State
    >,
    stats: {
      tasks: 0,
      focusSessions: 0,
      focusMinutes: 0,
      games: 0,
      purchases: 0,
      mathScore: 0,
      wordScore: 0,
      patternCount: 0,
      taskDays: [],
      focusDays: [],
      taskBestStreak: 0,
      focusBestStreak: 0,
    },
    processedEvents: [],
    pendingAwards: [],
  };
}
function keys(o: Record<string, unknown>, ks: string[], x: string) {
  if (Object.keys(o).length !== ks.length || ks.some((k) => !(k in o))) bad(x);
}
function days(v: unknown, x: string): string[] {
  if (!Array.isArray(v)) return bad(x);
  if (v.length > DAY_LIMIT) return bad(x);
  const values: unknown[] = v;
  const out = values.map((a) => date(a, x)).sort();
  if (new Set(out).size !== out.length) bad(x);
  return out;
}
function maxStreak(ds: string[]) {
  let best = 0,
    run = 0,
    previous: number | undefined;
  for (const d of ds) {
    const t = Date.parse(`${d}T00:00:00Z`);
    run = previous !== undefined && t - previous === 86400000 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = t;
  }
  return best;
}
function stat(v: unknown): Stats {
  if (!v || typeof v !== 'object' || Array.isArray(v)) bad('Achievement statistics');
  const o = v as Record<string, unknown>;
  keys(
    o,
    [
      'tasks',
      'focusSessions',
      'focusMinutes',
      'games',
      'purchases',
      'mathScore',
      'wordScore',
      'patternCount',
      'taskDays',
      'focusDays',
      'taskBestStreak',
      'focusBestStreak',
    ],
    'Achievement statistics',
  );
  const out: Stats = {
    tasks: n(o.tasks, 'Tasks', 10),
    focusSessions: n(o.focusSessions, 'Focus sessions', 10),
    focusMinutes: n(o.focusMinutes, 'Focus minutes', 100),
    games: n(o.games, 'Games', 1),
    purchases: n(o.purchases, 'Purchases', 1),
    mathScore: n(o.mathScore, 'Math score', 500),
    wordScore: n(o.wordScore, 'Word score', 50),
    patternCount: n(o.patternCount, 'Pattern count', 30),
    taskDays: days(o.taskDays, 'Task days'),
    focusDays: days(o.focusDays, 'Focus days'),
    taskBestStreak: n(o.taskBestStreak, 'Task streak', 3),
    focusBestStreak: n(o.focusBestStreak, 'Focus streak', 3),
  };
  if (
    out.taskBestStreak !== maxStreak(out.taskDays) ||
    out.focusBestStreak !== maxStreak(out.focusDays)
  )
    bad('Achievement statistics');
  return out;
}
function metric(id: AchievementId, x: Stats) {
  switch (id) {
    case 'FIRST_TASK':
    case 'FIVE_TASKS':
    case 'TEN_TASKS':
      return x.tasks;
    case 'STREAK_MASTER':
      return x.taskBestStreak;
    case 'FIRST_FOCUS':
    case 'FOCUS_FIVE':
    case 'FOCUS_TEN':
      return x.focusSessions;
    case 'FOCUS_MARATHON':
      return x.focusMinutes;
    case 'DAILY_FOCUS':
      return x.focusBestStreak;
    case 'FIRST_GAME':
      return x.games;
    case 'MATH_MASTER':
      return x.mathScore;
    case 'WORD_WIZARD':
      return x.wordScore;
    case 'PATTERN_PRO':
      return x.patternCount;
    case 'BIG_SPENDER':
      return x.purchases;
  }
}
const award = (id: AchievementId): PendingAchievementAward => ({
  achievementId: id,
  operationId: `achievement:unlock:${id}`,
  amount: ACHIEVEMENT_TOKEN_REWARDS[id],
});
function derivedProgress(id: AchievementId, stats: Stats, unlocked: boolean) {
  return unlocked ? GOAL[id] : Math.min(GOAL[id], metric(id, stats));
}
function updateProgress(r: RecordV1) {
  for (const id of ID) r.states[id].progress = Math.min(GOAL[id], metric(id, r.stats));
}
function invariant(r: RecordV1) {
  const pending = new Set(r.pendingAwards.map((a) => a.achievementId));
  if (pending.size !== r.pendingAwards.length || r.pendingAwards.length > ID.length)
    bad('Pending awards');
  for (const id of ID) {
    const expected = derivedProgress(id, r.stats, r.states[id].unlocked);
    if (r.states[id].progress !== expected) bad('Achievement lifecycle progress');
    const q = expected >= GOAL[id];
    if (
      (r.states[id].unlocked && pending.has(id)) ||
      (!r.states[id].unlocked && q !== pending.has(id))
    )
      bad('Achievement lifecycle');
  }
}
function parsed(eventId: unknown, fingerprint: unknown): ParsedEvent {
  const id = s(eventId, 'Processed event id', 160),
    fp = s(fingerprint, 'Processed event fingerprint', 220);
  if (fp.startsWith('task:') && /^homework-completed:[\x21-\x7e]{1,140}$/.test(id)) {
    date(fp.slice(5), 'Processed task day');
    return { id, f: fp, k: 'task' as const };
  }
  if (fp.startsWith('focus:') && /^focus-completed:[\x21-\x7e]{1,143}$/.test(id)) {
    const p = fp.split(':');
    if (p.length !== 3 || String(n(Number(p[1]), 'Processed focus minutes', 100)) !== p[1])
      bad('Processed event');
    date(p[2], 'Processed focus day');
    return { id, f: fp, k: 'focus' as const };
  }
  if (fp === 'worksheet' && /^worksheet-completed:[\x21-\x7e]{1,139}$/.test(id))
    return { id, f: fp, k: 'worksheet' as const };
  const game = /^game:(ordinary|mathAdventure|wordBuilder|patternQuest):(\d+)$/.exec(fp);
  if (
    game &&
    /^game-completed:(realm|brain-gym):[\x21-\x7e]{1,130}$/.test(id) &&
    String(n(Number(game[2]), 'Processed game score', 500)) === game[2] &&
    (game[1] !== 'ordinary' || game[2] === '0') &&
    (game[1] !== 'patternQuest' || game[2] === '1')
  )
    return {
      id,
      f: fp,
      k: 'game' as const,
      c: game[1] as 'ordinary' | 'mathAdventure' | 'wordBuilder' | 'patternQuest',
    };
  const shop = /^shop-purchase:avatar-purchase:([0-9a-f-]{36})$/i.exec(id);
  if (fp === 'shop' && shop && UUID.test(shop[1]!)) return { id, f: fp, k: 'shop' as const };
  return bad('Processed event');
}
function affected(x: ParsedEvent): AchievementId[] {
  if (x.k === 'task')
    return ['FIRST_TASK', 'FIVE_TASKS', 'TEN_TASKS', 'STREAK_MASTER'] as AchievementId[];
  if (x.k === 'worksheet') return ['FIRST_TASK', 'FIVE_TASKS', 'TEN_TASKS'] as AchievementId[];
  if (x.k === 'focus')
    return [
      'FIRST_FOCUS',
      'FOCUS_FIVE',
      'FOCUS_TEN',
      'FOCUS_MARATHON',
      'DAILY_FOCUS',
    ] as AchievementId[];
  if (x.k === 'shop') return ['BIG_SPENDER'] as AchievementId[];
  if (x.k !== 'game') return bad('Processed event');
  return [
    'FIRST_GAME',
    ...(x.c === 'mathAdventure'
      ? ['MATH_MASTER']
      : x.c === 'wordBuilder'
        ? ['WORD_WIZARD']
        : x.c === 'patternQuest'
          ? ['PATTERN_PRO']
          : []),
  ] as AchievementId[];
}
function parse(raw: string): RecordV1 {
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    bad('Achievement lifecycle record');
  }
  if (!v || typeof v !== 'object') return bad('Achievement lifecycle record');
  if (Array.isArray(v)) return bad('Achievement lifecycle record');
  const o = v as Record<string, unknown>;
  keys(
    o,
    ['version', 'states', 'stats', 'processedEvents', 'pendingAwards'],
    'Achievement lifecycle record',
  );
  if (o.version !== 1 || !o.states || typeof o.states !== 'object' || Array.isArray(o.states))
    return bad('Achievement lifecycle record');
  const rawProcessedEvents = o.processedEvents;
  if (!Array.isArray(rawProcessedEvents)) return bad('Achievement lifecycle record');
  const rawPendingAwards = o.pendingAwards;
  if (!Array.isArray(rawPendingAwards) || rawProcessedEvents.length > LIMIT)
    return bad('Achievement lifecycle record');
  const r = empty(),
    states = o.states as Record<string, unknown>,
    processedEvents: unknown[] = rawProcessedEvents,
    pendingAwards: unknown[] = rawPendingAwards;
  if (Object.keys(states).length !== ID.length || ID.some((id) => !(id in states)))
    bad('Achievement lifecycle state');
  for (const id of ID) {
    const q = states[id];
    if (!q || typeof q !== 'object' || Array.isArray(q)) bad('Achievement lifecycle state');
    const a = q as Record<string, unknown>;
    keys(a, ['unlocked', 'progress'], 'Achievement lifecycle state');
    const unlocked = a.unlocked;
    if (typeof unlocked !== 'boolean') return bad('Achievement lifecycle state');
    r.states[id] = {
      unlocked,
      progress: n(a.progress, 'Achievement progress', GOAL[id]),
    };
  }
  r.stats = stat(o.stats);
  r.processedEvents = processedEvents.map((e) => {
    if (!e || typeof e !== 'object' || Array.isArray(e)) bad('Processed event');
    const a = e as Record<string, unknown>;
    keys(a, ['eventId', 'fingerprint'], 'Processed event');
    const q = parsed(a.eventId, a.fingerprint);
    return { eventId: q.id, fingerprint: q.f };
  });
  if (new Set(r.processedEvents.map((e) => e.eventId)).size !== r.processedEvents.length)
    bad('Processed events');
  r.pendingAwards = pendingAwards.map((e) => {
    if (!e || typeof e !== 'object' || Array.isArray(e)) bad('Pending award');
    const a = e as Record<string, unknown>;
    keys(a, ['achievementId', 'operationId', 'amount'], 'Pending award');
    const id = s(a.achievementId, 'Pending award id', 32) as AchievementId;
    if (
      !IDS.has(id) ||
      a.operationId !== `achievement:unlock:${id}` ||
      a.amount !== ACHIEVEMENT_TOKEN_REWARDS[id]
    )
      bad('Pending award');
    return award(id);
  });
  invariant(r);
  return r;
}
const run = async <T>(job: () => Promise<T>) => {
  const task = serial.then(job, job);
  serial = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
};
const shown = (r: RecordV1) =>
  CATALOG.map((a) => ({
    ...a,
    unlocked: r.states[a.id as AchievementId].unlocked,
    progress: r.states[a.id as AchievementId].progress,
  }));
function stage(r: RecordV1) {
  updateProgress(r);
  for (const id of ID) if (r.states[id].unlocked) r.states[id].progress = GOAL[id];
  const x: AchievementId[] = [];
  for (const id of ID)
    if (
      !r.states[id].unlocked &&
      r.states[id].progress >= GOAL[id] &&
      !r.pendingAwards.some((a) => a.achievementId === id)
    ) {
      r.pendingAwards.push(award(id));
      x.push(id);
    }
  return x;
}
function prune(r: RecordV1) {
  r.processedEvents = r.processedEvents.filter(
    (e) => !affected(parsed(e.eventId, e.fingerprint)).every((id) => r.states[id].unlocked),
  );
}
function add(ds: string[], d: string) {
  if (ds.includes(d)) return ds;
  const next = [...ds, d].sort();
  return next.length > DAY_LIMIT ? compactDaysWithWitness(next) : next;
}
function compactDaysWithWitness(all: string[]): string[] {
  const sorted = [...new Set(all)].sort();
  const desired = Math.min(3, maxStreak(sorted));
  const witness: string[] = [];
  if (desired > 0) {
    for (let start = 0; start <= sorted.length - desired; start++) {
      const candidate = sorted.slice(start, start + desired);
      if (maxStreak(candidate) === desired) {
        witness.push(...candidate);
        break;
      }
    }
  }
  const kept = new Set(witness);
  for (const value of [...sorted].reverse()) {
    if (kept.size >= DAY_LIMIT) break;
    const timestamp = Date.parse(`${value}T00:00:00Z`);
    if (
      [...kept].some((other) => Math.abs(Date.parse(`${other}T00:00:00Z`) - timestamp) === 86400000)
    )
      continue;
    kept.add(value);
  }
  return [...kept].sort();
}
function runtime(e: AchievementEvent): RuntimeEvent {
  if (e.type === 'TASK_COMPLETED') {
    const p = parsed(e.eventId, `task:${date(e.payload?.completionDay, 'Completion day')}`);
    return {
      p,
      a: affected(p),
      streakId: 'STREAK_MASTER' as const,
      apply: (x: Stats, keepDay = true) => {
        x.tasks = Math.min(10, x.tasks + 1);
        if (keepDay) {
          x.taskDays = add(x.taskDays, p.f.slice(5));
          x.taskBestStreak = maxStreak(x.taskDays);
        }
      },
    };
  }
  if (e.type === 'FOCUS_SESSION_COMPLETED') {
    const minutes = n(e.payload?.duration, 'Focus minutes', 100);
    if (minutes < 1) bad('Focus minutes');
    const p = parsed(
      e.eventId,
      `focus:${minutes}:${date(e.payload?.completionDay, 'Completion day')}`,
    );
    return {
      p,
      a: affected(p),
      streakId: 'DAILY_FOCUS' as const,
      apply: (x: Stats, keepDay = true) => {
        x.focusSessions = Math.min(10, x.focusSessions + 1);
        x.focusMinutes = Math.min(100, x.focusMinutes + minutes);
        if (keepDay) {
          x.focusDays = add(x.focusDays, p.f.split(':')[2]!);
          x.focusBestStreak = maxStreak(x.focusDays);
        }
      },
    };
  }
  if (e.type === 'WORKSHEET_COMPLETED') {
    const p = parsed(e.eventId, 'worksheet');
    return {
      p,
      a: affected(p),
      apply: (x: Stats) => {
        x.tasks = Math.min(10, x.tasks + 1);
      },
    };
  }
  if (e.type === 'GAME_COMPLETED') {
    const contribution = e.payload?.achievementKey;
    if (!['ordinary', 'mathAdventure', 'wordBuilder', 'patternQuest'].includes(contribution))
      bad('Game contribution');
    const score = n(e.payload?.score, 'Game score', 500);
    if (contribution === 'ordinary' && score !== 0) bad('Game score');
    if (contribution === 'patternQuest' && score !== 1) bad('Game score');
    const p = parsed(e.eventId, `game:${contribution}:${score}`);
    return {
      p,
      a: affected(p),
      apply: (x: Stats) => {
        x.games = 1;
        if (contribution === 'mathAdventure') x.mathScore = Math.min(500, x.mathScore + score);
        if (contribution === 'wordBuilder') x.wordScore = Math.min(50, x.wordScore + score);
        if (contribution === 'patternQuest') x.patternCount = Math.min(30, x.patternCount + 1);
      },
    };
  }
  if (e.type === 'SHOP_PURCHASE') {
    const p = parsed(e.eventId, 'shop');
    return {
      p,
      a: affected(p),
      apply: (x: Stats) => {
        x.purchases = 1;
      },
    };
  }
  return bad('Achievement event');
}
function legacyObject(raw: unknown, x: string) {
  if (raw === '' || raw === null || raw === undefined) return {};
  let v = raw;
  if (typeof raw === 'string')
    try {
      v = JSON.parse(raw);
    } catch {
      bad(`${x} legacy record`);
    }
  if (!v || typeof v !== 'object' || Array.isArray(v)) bad(`${x} legacy record`);
  return v as Record<string, unknown>;
}
function legacyNumber(o: Record<string, unknown>, key: string, x: string, cap: number) {
  return o[key] === undefined ? 0 : Math.min(cap, n(o[key], x, Number.MAX_SAFE_INTEGER));
}
function legacyMap(raw: Record<string, unknown>, label: string): Record<string, number> {
  // Exact historical GAME_ACHIEVEMENT_KEYS values from gameProgression.ts.
  const allowed = new Set([
    'anagrams',
    'bossBattle',
    'crossword',
    'mathAdventure',
    'memoryMatch',
    'musicNotes',
    'patternQuest',
    'sudoku',
    'wordBuilder',
    'wordSearch',
  ]);
  if (Object.keys(raw).length > allowed.size) bad(label);
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.has(key)) bad(label);
    result[key] = n(value, label, Number.MAX_SAFE_INTEGER);
  }
  return result;
}
function applyLegacyProgressFloor(stats: Stats, id: AchievementId, progress: number): void {
  switch (id) {
    case 'FIRST_TASK':
    case 'FIVE_TASKS':
    case 'TEN_TASKS':
      stats.tasks = Math.max(stats.tasks, progress);
      break;
    case 'STREAK_MASTER':
      break; // A streak needs calendar-day provenance, not an unverified numeric floor.
    case 'FIRST_FOCUS':
    case 'FOCUS_FIVE':
    case 'FOCUS_TEN':
      stats.focusSessions = Math.max(stats.focusSessions, progress);
      break;
    case 'FOCUS_MARATHON':
      stats.focusMinutes = Math.max(stats.focusMinutes, progress);
      break;
    case 'DAILY_FOCUS':
      break; // A streak needs calendar-day provenance, not an unverified numeric floor.
    case 'FIRST_GAME':
      stats.games = Math.max(stats.games, progress);
      break;
    case 'MATH_MASTER':
      stats.mathScore = Math.max(stats.mathScore, progress);
      break;
    case 'WORD_WIZARD':
      stats.wordScore = Math.max(stats.wordScore, progress);
      break;
    case 'PATTERN_PRO':
      stats.patternCount = Math.max(stats.patternCount, progress);
      break;
    case 'BIG_SPENDER':
      break; // Only strict Avatar ownership/history proves a shop purchase.
  }
}
function legacy(src: Awaited<ReturnType<typeof dataStore.getLegacyAchievementLifecycleSources>>) {
  if (
    !Array.isArray(src.achievements) ||
    !Array.isArray(src.homeworkItems) ||
    !Array.isArray(src.focusSessions)
  )
    bad('Legacy achievement arrays');
  const r = empty(),
    h = legacyObject(src.homeworkStats, 'Homework'),
    f = legacyObject(src.focusStats, 'Focus'),
    g = legacyObject(src.gameStats, 'Game'),
    scores = legacyMap(legacyObject(g.scores, 'Game scores'), 'Game scores'),
    counts = legacyMap(legacyObject(g.counts, 'Game counts'), 'Game counts');
  for (const key of ['mathAdventure', 'wordBuilder', 'patternQuest'])
    if (g[key] !== undefined) n(g[key], `Legacy ${key}`, Number.MAX_SAFE_INTEGER);
  r.stats.tasks = legacyNumber(h, 'completedTasks', 'Legacy tasks', 10);
  r.stats.focusSessions = legacyNumber(f, 'completedSessions', 'Legacy focus sessions', 10);
  r.stats.focusMinutes = legacyNumber(f, 'totalMinutes', 'Legacy focus minutes', 100);
  r.stats.games = legacyNumber(g, 'gamesPlayed', 'Legacy games', 1);
  r.stats.mathScore = Math.min(
    500,
    scores.mathAdventure ??
      (g.mathAdventure === undefined
        ? 0
        : n(g.mathAdventure, 'Legacy math score', Number.MAX_SAFE_INTEGER)),
  );
  r.stats.wordScore = Math.min(
    50,
    scores.wordBuilder ??
      (g.wordBuilder === undefined
        ? 0
        : n(g.wordBuilder, 'Legacy word score', Number.MAX_SAFE_INTEGER)),
  );
  r.stats.patternCount = Math.min(
    30,
    counts.patternQuest ??
      (g.patternQuest === undefined
        ? 0
        : n(g.patternQuest, 'Legacy pattern count', Number.MAX_SAFE_INTEGER)),
  );
  if (g.shopPurchases !== undefined) n(g.shopPurchases, 'Legacy shop purchases', 1000000);
  const convert = (value: number, x: string) => {
    if (!Number.isSafeInteger(value) || value < 0) bad(x);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) bad(x);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const td = new Set<string>(),
    fd = new Set<string>();
  for (const item of src.homeworkItems as unknown[]) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) bad('Legacy homework');
    const x = item as Record<string, unknown>;
    if (typeof x.completed !== 'boolean') bad('Legacy homework');
    if (x.completed) {
      const completedDate = x.completedDate;
      if (typeof completedDate !== 'number') return bad('Legacy homework');
      td.add(convert(completedDate, 'Legacy homework'));
    }
  }
  for (const item of src.focusSessions as unknown[]) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) bad('Legacy focus');
    const x = item as Record<string, unknown>;
    if (typeof x.completed !== 'boolean') bad('Legacy focus');
    if (x.completed) {
      const startTime = x.startTime;
      if (typeof startTime !== 'number') return bad('Legacy focus');
      fd.add(convert(startTime, 'Legacy focus'));
    }
  }
  r.stats.taskDays = compactDaysWithWitness([...td]);
  r.stats.focusDays = compactDaysWithWitness([...fd]);
  r.stats.taskBestStreak = maxStreak(r.stats.taskDays);
  r.stats.focusBestStreak = maxStreak(r.stats.focusDays);
  const seen = new Set<string>();
  for (const item of src.achievements as unknown[]) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) bad('Legacy achievement');
    const x = item as Record<string, unknown>,
      id = s(x.id, 'Legacy achievement id', 32) as AchievementId;
    if (!IDS.has(id) || seen.has(id) || typeof x.unlocked !== 'boolean') bad('Legacy achievement');
    if (x.progress !== undefined)
      applyLegacyProgressFloor(r.stats, id, n(x.progress, 'Legacy achievement progress', GOAL[id]));
    seen.add(id);
    if (x.unlocked) {
      r.states[id].unlocked = true;
      r.states[id].progress = GOAL[id];
    }
  }
  const avatar = src.avatarState;
  if (avatar !== null && avatar !== undefined) {
    if (!avatar || typeof avatar !== 'object' || Array.isArray(avatar)) bad('Legacy avatar state');
    const a = avatar as Record<string, unknown>;
    if (a.ownedItems !== undefined && !Array.isArray(a.ownedItems)) bad('Legacy avatar state');
    if (a.purchaseHistory !== undefined && !Array.isArray(a.purchaseHistory))
      bad('Legacy avatar state');
    if (
      (Array.isArray(a.ownedItems) && a.ownedItems.length) ||
      (Array.isArray(a.purchaseHistory) && a.purchaseHistory.length)
    )
      r.stats.purchases = 1;
  }
  stage(r);
  for (const id of ID)
    if (r.states[id].unlocked)
      r.pendingAwards = r.pendingAwards.filter((a) => a.achievementId !== id);
  invariant(r);
  return r;
}
export async function initializeAchievements() {
  return run(async () => {
    if (current) return;
    const saved = await dataStore.getAchievementLifecycleRecord(),
      next =
        saved === null
          ? legacy(await dataStore.getLegacyAchievementLifecycleSources())
          : parse(saved);
    if (saved === null) await dataStore.saveAchievementLifecycleRecord(JSON.stringify(next));
    current = next;
  });
}
export async function getAchievements() {
  if (!current) throw new Error('Achievements are not initialized');
  return copy(shown(current));
}
export async function getPendingAchievementAwards() {
  if (!current) throw new Error('Achievements are not initialized');
  return copy(current.pendingAwards);
}
export async function getAchievementStatsSnapshot() {
  if (!current) throw new Error('Achievements are not initialized');
  return copy(current.stats);
}
export async function getAchievementLifecycleSnapshot() {
  if (!current) throw new Error('Achievements are not initialized');
  return {
    achievements: copy(shown(current)),
    pendingAwards: copy(current.pendingAwards),
    stats: copy(current.stats),
  };
}
export interface AchievementUnlockResult {
  achievements: Achievement[];
  newlyQualified: Achievement[];
  pendingAwards: PendingAchievementAward[];
  totalBonusTokens: number;
  totalBonusPoints: number;
}
function result(r: RecordV1, ids: AchievementId[] = []): AchievementUnlockResult {
  const all = shown(r),
    a = r.pendingAwards.filter((x) => ids.includes(x.achievementId)),
    total = a.reduce((sum, x) => sum + x.amount, 0);
  return {
    achievements: all,
    newlyQualified: all.filter((x) => ids.includes(x.id as AchievementId)),
    pendingAwards: copy(r.pendingAwards),
    totalBonusTokens: total,
    totalBonusPoints: total,
  };
}
export async function checkAndUnlockAchievements(
  e: AchievementEvent,
): Promise<AchievementUnlockResult> {
  return run(async () => {
    if (!current) throw new Error('Achievements are not initialized');
    const state = current,
      x = runtime(e),
      prior = state.processedEvents.find((p) => p.eventId === x.p.id);
    if (prior) {
      if (prior.fingerprint !== x.p.f)
        throw new Error('Achievement event id conflicts with an existing event');
      return result(state);
    }
    if (
      x.a.every(
        (id) =>
          state.states[id].unlocked ||
          state.pendingAwards.some((a) => a.achievementId === id),
      )
    )
      return result(state);
    const next = copy(state);
    prune(next);
    if (next.processedEvents.length >= LIMIT)
      throw new Error(
        'Achievement event history is full; active replay safety requires confirmation',
      );
    const streakId = x.streakId;
    const retainStreakDay =
      streakId === undefined ||
      (!state.states[streakId].unlocked &&
        !state.pendingAwards.some((award) => award.achievementId === streakId));
    x.apply(next.stats, retainStreakDay);
    next.processedEvents.push({ eventId: x.p.id, fingerprint: x.p.f });
    const newly = stage(next);
    invariant(next);
    await dataStore.saveAchievementLifecycleRecord(JSON.stringify(next));
    current = next;
    return result(next, newly);
  });
}
export async function confirmAchievementAward(achievementId: string, operationId: string) {
  return run(async () => {
    if (
      !current ||
      !IDS.has(achievementId) ||
      operationId !== `achievement:unlock:${achievementId}`
    )
      throw new Error('Achievement award confirmation is invalid');
    const id = achievementId as AchievementId,
      pending = current.pendingAwards.find((a) => a.achievementId === id);
    if (!pending) {
      if (current.states[id].unlocked) return;
      throw new Error('Achievement award is not pending');
    }
    const next = copy(current);
    next.pendingAwards = next.pendingAwards.filter((a) => a.achievementId !== id);
    next.states[id].unlocked = true;
    prune(next);
    invariant(next);
    await dataStore.saveAchievementLifecycleRecord(JSON.stringify(next));
    current = next;
  });
}
