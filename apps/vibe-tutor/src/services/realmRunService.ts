import type { SubjectType } from '../types';
import { calculateStandardGameTokens, getGameDisplayName } from './gameProgression';
import { dataStore } from './dataStore';

export const REALM_RUNS_KEY = 'vibetutor_realm_runs_v1';
const MAX = 500,
  MAX_INTENTS = 500,
  LIMIT = 1024 * 1024;
type Mode = 'standard' | 'continuous';
type State = 'active' | 'completed' | 'cancelled';
type Leg = 'token' | 'achievement';
interface Token { amount: number; reason: string; operationId: string; state: 'pending' | 'settled' }
interface Event {
  type: 'GAME_COMPLETED';
  eventId: string;
  contribution: 'ordinary' | 'mathAdventure' | 'wordBuilder';
  score: number;
  stars: number;
  state: 'pending' | 'settled';
}
type Intent = Token & { awardKey: string; ordinal: number };
interface CompletionResult { score: number; stars: number; timeSpent?: number; tokensEarned: number }
interface Run {
  id: string;
  subject: SubjectType;
  gameId: string;
  mode: Mode;
  startedAt: number;
  state: State;
  continuousIntents: Intent[];
  completion?: { result: CompletionResult; token?: Token; achievement: Event };
}
interface RecordV1 { version: 1; nextSequence: number; runs: Run[] }
let chain: Promise<void> = Promise.resolve();
const q = async <T>(work: () => Promise<T>) => {
  const result = chain.then(work);
  chain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const fail = (m = 'Realm run record is malformed'): never => {
  throw new Error(m);
};
const safe = (x: unknown, max = Number.MAX_SAFE_INTEGER): x is number =>
  typeof x === 'number' && Number.isSafeInteger(x) && x >= 0 && x <= max;
const printable = (x: unknown, max = 160): x is string =>
  typeof x === 'string' &&
  x.length > 0 &&
  x.length <= max &&
  /^[\x20-\x7e]+$/.test(x) &&
  /\S/.test(x);
const exact = (x: unknown, ks: string[]) =>
  !!x &&
  typeof x === 'object' &&
  !Array.isArray(x) &&
  Object.keys(x as object).length === ks.length &&
  ks.every((k) => Object.prototype.hasOwnProperty.call(x, k));
const pair = (subject: unknown, gameId: unknown): Mode | undefined => {
  if (subject === 'Math' && gameId === 'math') return 'continuous';
  if (subject === 'Math' && gameId === 'boss-math') return 'standard';
  if (subject === 'Language Arts' && ['anagrams', 'crossword'].includes(gameId as string))
    return 'standard';
  if (subject === 'Language Arts' && gameId === 'wordbuilder') return 'continuous';
  if (subject === 'Science' && gameId === 'boss-science') return 'standard';
  if (subject === 'History' && gameId === 'boss-history') return 'standard';
  return undefined;
};
const runId = (x: unknown): x is string =>
  typeof x === 'string' && /^realm:[1-9]\d*$/.test(x) && Number.isSafeInteger(Number(x.slice(6)));
const contribution = (gameId: string): Event['contribution'] =>
  gameId === 'math' ? 'mathAdventure' : gameId === 'wordbuilder' ? 'wordBuilder' : 'ordinary';
function parseToken(
  x: unknown,
  expected?: { amount?: number; reason?: string; operationId?: string },
): Token {
  if (
    !exact(x, ['amount', 'reason', 'operationId', 'state']) ||
    !safe((x as any).amount, 500) ||
    !printable((x as any).reason, 160) ||
    !printable((x as any).operationId, 220) ||
    !['pending', 'settled'].includes((x as any).state)
  )
    return fail();
  const t = x as Token;
  if (
    expected &&
    ((expected.amount !== undefined && t.amount !== expected.amount) ||
      (expected.reason !== undefined && t.reason !== expected.reason) ||
      (expected.operationId !== undefined && t.operationId !== expected.operationId))
  )
    return fail();
  return t;
}
function parseRun(x: unknown): Run {
  if (
    !exact(x, [
      'id',
      'subject',
      'gameId',
      'mode',
      'startedAt',
      'state',
      'continuousIntents',
      ...(Object.prototype.hasOwnProperty.call(x as object, 'completion') ? ['completion'] : []),
    ])
  )
    return fail();
  const r = x as Run,
    mode = pair(r.subject, r.gameId);
  if (
    !mode ||
    r.mode !== mode ||
    !runId(r.id) ||
    !safe(r.startedAt) ||
    !['active', 'completed', 'cancelled'].includes(r.state) ||
    !Array.isArray(r.continuousIntents) ||
    r.continuousIntents.length > MAX_INTENTS
  )
    return fail();
  const intents = r.continuousIntents.map((i) => {
    if (
      !exact(i, ['amount', 'reason', 'operationId', 'state', 'awardKey', 'ordinal']) ||
      !printable((i as any).awardKey, 120) ||
      !safe((i as any).ordinal) ||
      !(i as any).ordinal
    )
      return fail();
    return {
      ...parseToken(
        {
          amount: (i as any).amount,
          reason: (i as any).reason,
          operationId: (i as any).operationId,
          state: (i as any).state,
        },
        {
          reason: `Played ${getGameDisplayName(r.gameId)}`,
          operationId: `${r.id}:continuous:${(i as any).ordinal}`,
        },
      ),
      awardKey: (i as any).awardKey,
      ordinal: (i as any).ordinal,
    };
  });
  if (
    new Set(intents.map((i) => i.awardKey)).size !== intents.length ||
    new Set(intents.map((i) => i.ordinal)).size !== intents.length
  )
    return fail();
  if (!intents.every((intent, index) => intent.ordinal === index + 1)) return fail();
  if (r.mode === 'standard' && intents.length) return fail();
  if (r.state === 'active' && r.completion !== undefined) return fail();
  if (
    r.state === 'cancelled' &&
    (r.completion !== undefined ||
      intents.some((i) => i.state === 'pending' || (i.amount > 0 && i.state === 'settled')))
  )
    return fail();
  if (r.state === 'completed') {
    if (
      !r.completion ||
      !exact(
        r.completion,
        Object.prototype.hasOwnProperty.call(r.completion, 'token')
          ? ['result', 'token', 'achievement']
          : ['result', 'achievement'],
      )
    )
      return fail();
    const event = parseEvent(r.completion.achievement, r),
      result = r.completion.result;
    if (
      !exact(
        result,
        Object.prototype.hasOwnProperty.call(result, 'timeSpent')
          ? ['score', 'stars', 'timeSpent', 'tokensEarned']
          : ['score', 'stars', 'tokensEarned'],
      ) ||
      !safe(result.score) ||
      !safe(result.stars, 5) ||
      (result.timeSpent !== undefined && !safe(result.timeSpent, 86_400_000)) ||
      !safe(result.tokensEarned)
    )
      return fail();
    if (r.mode === 'standard') {
      if (!r.completion.token) return fail();
      const token = parseToken(r.completion.token, {
        reason: `Played ${getGameDisplayName(r.gameId)}`,
        operationId: `${r.id}:completion`,
      });
      if (
        token.amount !== calculateStandardGameTokens(r.gameId, result.stars) ||
        result.tokensEarned !== token.amount ||
        event.score !== (contribution(r.gameId) === 'ordinary' ? 0 : result.score) ||
        event.stars !== result.stars
      )
        return fail();
    } else if (
      r.completion.token !== undefined ||
      intents.some((i) => i.state === 'pending') ||
      !intents.some((i) => i.state === 'settled' && i.amount > 0)
    )
      return fail();
    else {
      const total = intents
        .filter((i) => i.state === 'settled')
        .reduce((sum, i) => sum + i.amount, 0);
      if (
        result.tokensEarned !== total ||
        result.score !== total * 10 ||
        result.stars !== (total >= 20 ? 3 : 1) ||
        event.score !== Math.min(500, result.score) ||
        event.stars !== result.stars
      )
        return fail();
    }
  }
  return clone({ ...r, continuousIntents: intents });
}
function parseEvent(x: unknown, r: Run): Event {
  if (
    !exact(x, ['type', 'eventId', 'contribution', 'score', 'stars', 'state']) ||
    (x as any).type !== 'GAME_COMPLETED' ||
    (x as any).eventId !== `game-completed:${r.id}` ||
    (x as any).contribution !== contribution(r.gameId) ||
    !safe((x as any).score, 500) ||
    !safe((x as any).stars, 5) ||
    !['pending', 'settled'].includes((x as any).state)
  )
    return fail();
  return x as Event;
}
function parse(s: string): RecordV1 {
  if (new TextEncoder().encode(s).length > LIMIT) fail('Realm run record exceeds the safe limit');
  let x: unknown;
  try {
    x = JSON.parse(s);
  } catch {
    return fail();
  }
  if (
    !exact(x, ['version', 'nextSequence', 'runs']) ||
    (x as any).version !== 1 ||
    !safe((x as any).nextSequence) ||
    (x as any).nextSequence < 1 ||
    !Array.isArray((x as any).runs) ||
    (x as any).runs.length > MAX
  )
    return fail();
  const runs = (x as any).runs.map(parseRun),
    ids = new Set<string>(),
    ops = new Set<string>(),
    events = new Set<string>();
  for (const r of runs) {
    if (ids.has(r.id) || Number(r.id.slice(6)) >= (x as any).nextSequence) return fail();
    if (
      runs.indexOf(r) > 0 &&
      Number(r.id.slice(6)) <= Number(runs[runs.indexOf(r) - 1]!.id.slice(6))
    )
      return fail();
    ids.add(r.id);
    for (const i of r.continuousIntents) {
      if (ops.has(i.operationId)) return fail();
      ops.add(i.operationId);
    }
    if (r.completion) {
      if (r.completion.token) {
        if (ops.has(r.completion.token.operationId)) return fail();
        ops.add(r.completion.token.operationId);
      }
      if (events.has(r.completion.achievement.eventId)) return fail();
      events.add(r.completion.achievement.eventId);
    }
  }
  return { version: 1, nextSequence: (x as any).nextSequence, runs };
}
function serial(r: RecordV1) {
  const s = JSON.stringify(r);
  parse(s);
  return s;
}
async function read(): Promise<RecordV1> {
  const v = await dataStore.getRealmRunRecord();
  if (v !== null) return parse(v);
  const old = await dataStore.getLegacyRealmGameSessionSequence();
  if (old !== null && (!safe(old) || old >= Number.MAX_SAFE_INTEGER))
    fail('Legacy realm sequence is malformed');
  return { version: 1, nextSequence: (old ?? 0) + 1, runs: [] };
}
function prune(r: RecordV1) {
  while (r.runs.length >= MAX) {
    const n = r.runs.findIndex(
      (x) =>
        x.state === 'cancelled' ||
        (x.state === 'completed' &&
          x.completion?.achievement.state === 'settled' &&
          (!x.completion.token || x.completion.token.state === 'settled')),
    );
    if (n < 0) fail('Realm run record exceeds the safe limit');
    r.runs.splice(n, 1);
  }
}
export async function allocateRealmRun(input: {
  subject: SubjectType;
  gameId: string;
  startedAt?: number;
}) {
  return q(async () => {
    const r = await read(),
      mode = pair(input.subject, input.gameId),
      startedAt = input.startedAt ?? Date.now();
    if (!mode || !safe(startedAt) || r.nextSequence >= Number.MAX_SAFE_INTEGER)
      fail('Realm run request is invalid');
    prune(r);
    const run: Run = {
      id: `realm:${r.nextSequence}`,
      subject: input.subject,
      gameId: input.gameId,
      mode: mode!,
      startedAt,
      state: 'active',
      continuousIntents: [],
    };
    r.nextSequence++;
    r.runs.push(run);
    await dataStore.saveRealmRunRecord(serial(r));
    return clone(run);
  });
}
export async function prepareRealmContinuousAward(
  runIdValue: string,
  awardKey: string,
  amount: number,
) {
  return q(async () => {
    const r = await read(),
      run = r.runs.find((x) => x.id === runIdValue);
    if (!run) throw new Error('Realm continuous award is invalid');
    if (
      run.state !== 'active' ||
      run.mode !== 'continuous' ||
      !printable(awardKey, 120) ||
      !safe(amount, 500) ||
      amount === 0
    )
      fail('Realm continuous award is invalid');
    const old = run.continuousIntents.find((x) => x.awardKey === awardKey);
    if (old) {
      if (old.amount !== amount) fail('Realm continuous award conflicts');
      return clone(old);
    }
    const ordinal = run.continuousIntents.length + 1,
      intent: Intent = {
        awardKey,
        ordinal,
        amount,
        reason: `Played ${getGameDisplayName(run.gameId)}`,
        operationId: `${run.id}:continuous:${ordinal}`,
        state: 'pending',
      };
    run.continuousIntents.push(intent);
    await dataStore.saveRealmRunRecord(serial(r));
    return clone(intent);
  });
}
export async function completeRealmRun(
  runIdValue: string,
  result?: { score: number; stars: number; timeSpent?: number },
) {
  return q(async () => {
    const r = await read(),
      run = r.runs.find((x) => x.id === runIdValue);
    if (!run) throw new Error('Realm run is invalid');
    if (run.state === 'completed') {
      if (run.mode === 'standard') {
        if (
          !result ||
          !run.completion?.token ||
          result.score !== run.completion.result.score ||
          result.stars !== run.completion.result.stars ||
          result.timeSpent !== run.completion.result.timeSpent ||
          run.completion.token.amount !== calculateStandardGameTokens(run.gameId, result.stars)
        )
          fail('Realm completion conflicts');
      } else if (result !== undefined) fail('Realm completion conflicts');
      return clone(run);
    }
    if (run.state !== 'active') fail('Realm run is not active');
    let completion: Run['completion'];
    if (run.mode === 'standard') {
      if (!result) throw new Error('Realm completion is invalid');
      const standard = result;
      if (
        !safe(standard.score) ||
        !safe(standard.stars, 5) ||
        (standard.timeSpent !== undefined && !safe(standard.timeSpent, 86_400_000))
      )
        fail('Realm completion is invalid');
      const token: Token = {
        amount: calculateStandardGameTokens(run.gameId, standard.stars),
        reason: `Played ${getGameDisplayName(run.gameId)}`,
        operationId: `${run.id}:completion`,
        state: 'pending',
      };
      completion = {
        result: {
          score: standard.score,
          stars: standard.stars,
          ...(standard.timeSpent === undefined ? {} : { timeSpent: standard.timeSpent }),
          tokensEarned: token.amount,
        },
        token,
        achievement: {
          type: 'GAME_COMPLETED',
          eventId: `game-completed:${run.id}`,
          contribution: contribution(run.gameId),
          score: contribution(run.gameId) === 'ordinary' ? 0 : standard.score,
          stars: standard.stars,
          state: 'pending',
        },
      };
    } else {
      if (result !== undefined || run.continuousIntents.some((x) => x.state === 'pending'))
        fail('Realm completion is invalid');
      const total = run.continuousIntents
        .filter((x) => x.state === 'settled')
        .reduce((n, x) => n + x.amount, 0);
      if (total <= 0) fail('Realm completion requires settled contribution');
      completion = {
        result: {
          score: total * 10,
          stars: total >= 20 ? 3 : 1,
          tokensEarned: total,
        },
        achievement: {
          type: 'GAME_COMPLETED',
          eventId: `game-completed:${run.id}`,
          contribution: contribution(run.gameId),
          score: Math.min(500, total * 10),
          stars: total >= 20 ? 3 : 1,
          state: 'pending',
        },
      };
    }
    run.state = 'completed';
    run.completion = completion;
    await dataStore.saveRealmRunRecord(serial(r));
    return clone(run);
  });
}
export async function cancelRealmRun(id: string) {
  return q(async () => {
    const r = await read(),
      run = r.runs.find((x) => x.id === id);
    if (!run) throw new Error('Realm run is invalid');
    if (run.state === 'cancelled') return clone(run);
    if (
      run.state !== 'active' ||
      run.continuousIntents.some(
        (x) => x.state === 'pending' || (x.state === 'settled' && x.amount > 0),
      )
    )
      fail('Realm run cannot be cancelled');
    run.state = 'cancelled';
    await dataStore.saveRealmRunRecord(serial(r));
    return clone(run);
  });
}
export async function getRecoverableRealmDeliveries() {
  return q(async () =>
    clone(
      (await read()).runs.filter(
        (r) =>
          r.continuousIntents.some((i) => i.state === 'pending') ||
          (r.completion &&
            (r.completion.achievement.state === 'pending' ||
              r.completion.token?.state === 'pending')),
      ),
    ),
  );
}
export async function markRealmDeliveryLegSettled(id: string, leg: Leg, expectedIdentity: string) {
  return q(async () => {
    if (leg !== 'token' && leg !== 'achievement') fail('Realm delivery settlement is invalid');
    const r = await read(),
      run = r.runs.find((x) => x.id === id);
    if (!run) throw new Error('Realm delivery settlement is invalid');
    let target: Token | Event | undefined;
    if (leg === 'token')
      target =
        run.continuousIntents.find((i) => i.operationId === expectedIdentity) ||
        run.completion?.token;
    else target = run.completion?.achievement;
    if (
      !target ||
      (leg === 'token' ? (target as Token).operationId : (target as Event).eventId) !==
        expectedIdentity
    )
      throw new Error('Realm delivery settlement is invalid');
    if (target.state === 'settled') return;
    target.state = 'settled';
    await dataStore.saveRealmRunRecord(serial(r));
  });
}
