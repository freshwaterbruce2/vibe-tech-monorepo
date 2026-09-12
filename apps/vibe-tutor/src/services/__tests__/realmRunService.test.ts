import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = {
  canonical: null as string | null,
  legacy: null as number | null,
  failSave: false,
  saves: 0,
};
vi.mock('../dataStore', () => ({
  dataStore: {
    getRealmRunRecord: vi.fn(async () => state.canonical),
    saveRealmRunRecord: vi.fn(async (value: string) => {
      if (state.failSave) {
        state.failSave = false;
        throw new Error('realm write failed');
      }
      state.saves++;
      state.canonical = value;
    }),
    getLegacyRealmGameSessionSequence: vi.fn(async () => state.legacy),
  },
}));
import {
  allocateRealmRun,
  cancelRealmRun,
  completeRealmRun,
  getRecoverableRealmDeliveries,
  markRealmDeliveryLegSettled,
  prepareRealmContinuousAward,
} from '../realmRunService';

describe('realmRunService', () => {
  beforeEach(() => {
    state.canonical = null;
    state.legacy = null;
    state.failSave = false;
    state.saves = 0;
  });
  it('persists an active standard run before returning, then retains exact delivery facts', async () => {
    const run = await allocateRealmRun({
      subject: 'Language Arts',
      gameId: 'anagrams',
      startedAt: 1,
    });
    expect(run).toMatchObject({ id: 'realm:1', state: 'active', mode: 'standard' });
    const done = await completeRealmRun(run.id, { score: 90, stars: 3 });
    expect(done.completion).toMatchObject({
      token: { operationId: 'realm:1:completion', reason: 'Played Anagrams', state: 'pending' },
      achievement: { eventId: 'game-completed:realm:1', contribution: 'ordinary', score: 0 },
    });
    await expect(completeRealmRun(run.id, { score: 90, stars: 3 })).resolves.toMatchObject({
      id: run.id,
    });
    await expect(completeRealmRun(run.id, { score: 1, stars: 1 })).rejects.toThrow('conflicts');
    expect(await getRecoverableRealmDeliveries()).toHaveLength(1);
  });
  it('seeds from legacy only when canonical is absent and never creates historical delivery', async () => {
    state.legacy = 41;
    await expect(
      allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 2 }),
    ).resolves.toMatchObject({ id: 'realm:42' });
    expect(JSON.parse(state.canonical!)).toMatchObject({
      nextSequence: 43,
      runs: [{ id: 'realm:42' }],
    });
  });
  it('uses durable continuous intents, independent settlement, and derives completion without a base token', async () => {
    const run = await allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 3 });
    const intent = await prepareRealmContinuousAward(run.id, 'round-1', 20);
    await expect(prepareRealmContinuousAward(run.id, 'round-1', 21)).rejects.toThrow('conflicts');
    await expect(completeRealmRun(run.id)).rejects.toThrow('invalid');
    await markRealmDeliveryLegSettled(run.id, 'token', intent.operationId);
    const done = await completeRealmRun(run.id);
    expect(done.completion).toMatchObject({
      achievement: { score: 200, stars: 3, state: 'pending' },
      result: { score: 200, stars: 3, tokensEarned: 20 },
    });
    await markRealmDeliveryLegSettled(run.id, 'achievement', `game-completed:${run.id}`);
    await expect(cancelRealmRun(run.id)).rejects.toThrow();
  });
  it('fails closed for scalar, impossible, oversize, and invalid-sequence records', async () => {
    for (const value of [
      null,
      1,
      [],
      { version: 1, nextSequence: 0, runs: [] },
      { version: 1, nextSequence: 1, runs: [], extra: true },
    ]) {
      state.canonical = JSON.stringify(value);
      await expect(
        allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 1 }),
      ).rejects.toThrow();
    }
    state.canonical = 'x'.repeat(1024 * 1024 + 1);
    await expect(getRecoverableRealmDeliveries()).rejects.toThrow('safe limit');
  });
  it('serializes concurrent allocation and uses ordered continuous intent identities', async () => {
    const runs = await Promise.all(
      Array.from({ length: 8 }, async (_, i) =>
        allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: i + 1 }),
      ),
    );
    expect(runs.map((run) => run.id)).toEqual(
      Array.from({ length: 8 }, (_, i) => `realm:${i + 1}`),
    );
    const first = await prepareRealmContinuousAward(runs[0]!.id, 'one', 2);
    const second = await prepareRealmContinuousAward(runs[0]!.id, 'two', 3);
    expect([first.ordinal, second.ordinal]).toEqual([1, 2]);
    state.canonical = JSON.stringify({
      version: 1,
      nextSequence: 2,
      runs: [
        {
          id: 'realm:1',
          subject: 'Math',
          gameId: 'math',
          mode: 'continuous',
          startedAt: 1,
          state: 'active',
          continuousIntents: [
            {
              amount: 1,
              reason: 'Played Math Adventure',
              operationId: 'realm:1:continuous:2',
              state: 'pending',
              awardKey: 'bad',
              ordinal: 2,
            },
          ],
        },
      ],
    });
    await expect(getRecoverableRealmDeliveries()).rejects.toThrow();
  });
  it('retains standard score/time evidence and rejects changed replay facts', async () => {
    const run = await allocateRealmRun({ subject: 'Math', gameId: 'boss-math', startedAt: 1 });
    const completed = await completeRealmRun(run.id, { score: 1500, stars: 3, timeSpent: 10 });
    expect(completed.completion).toMatchObject({
      result: { score: 1500, tokensEarned: 45 },
      achievement: { score: 0 },
    });
    await expect(
      completeRealmRun(run.id, { score: 1500, stars: 3, timeSpent: 10 }),
    ).resolves.toMatchObject({ id: run.id });
    await expect(completeRealmRun(run.id, { score: 91, stars: 3, timeSpent: 10 })).rejects.toThrow(
      'conflicts',
    );
    await expect(
      completeRealmRun(run.id, { score: 1500, stars: 3, timeSpent: 11 }),
    ).rejects.toThrow('conflicts');
  });
  it('preserves canonical data on write failure and recovers the serialized queue', async () => {
    state.failSave = true;
    await expect(
      allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 1 }),
    ).rejects.toThrow('realm write failed');
    await expect(
      allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 2 }),
    ).resolves.toMatchObject({ id: 'realm:1' });
  });
  it('fails closed at run and intent capacity without pruning active recovery work', async () => {
    state.canonical = JSON.stringify({
      version: 1,
      nextSequence: 501,
      runs: Array.from({ length: 500 }, (_, i) => ({
        id: `realm:${i + 1}`,
        subject: 'Math',
        gameId: 'math',
        mode: 'continuous',
        startedAt: i,
        state: 'active',
        continuousIntents: [],
      })),
    });
    await expect(
      allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 501 }),
    ).rejects.toThrow('safe limit');
    state.canonical = JSON.stringify({
      version: 1,
      nextSequence: 2,
      runs: [
        {
          id: 'realm:1',
          subject: 'Math',
          gameId: 'math',
          mode: 'continuous',
          startedAt: 1,
          state: 'active',
          continuousIntents: Array.from({ length: 500 }, (_, i) => ({
            amount: 1,
            reason: 'Played Math Adventure',
            operationId: `realm:1:continuous:${i + 1}`,
            state: 'pending',
            awardKey: `key-${i + 1}`,
            ordinal: i + 1,
          })),
        },
      ],
    });
    await expect(prepareRealmContinuousAward('realm:1', 'overflow', 1)).rejects.toThrow();
  });
  it('rejects reordered and duplicate global identities without falling back to legacy', async () => {
    state.legacy = 99;
    state.canonical = JSON.stringify({
      version: 1,
      nextSequence: 4,
      runs: [
        {
          id: 'realm:2',
          subject: 'Math',
          gameId: 'math',
          mode: 'continuous',
          startedAt: 1,
          state: 'active',
          continuousIntents: [],
        },
        {
          id: 'realm:1',
          subject: 'Math',
          gameId: 'math',
          mode: 'continuous',
          startedAt: 2,
          state: 'active',
          continuousIntents: [],
        },
      ],
    });
    await expect(
      allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 3 }),
    ).rejects.toThrow();
    state.canonical = null;
    state.legacy = -1 as never;
    await expect(
      allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 3 }),
    ).rejects.toThrow('Legacy');
  });
  it('rejects invalid pairs and preserves no-intent cancellation replay', async () => {
    await expect(
      allocateRealmRun({ subject: 'Bible', gameId: 'musicnotes', startedAt: 1 }),
    ).rejects.toThrow('invalid');
    const run = await allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 1 });
    await expect(cancelRealmRun(run.id)).resolves.toMatchObject({ state: 'cancelled' });
    await expect(cancelRealmRun(run.id)).resolves.toMatchObject({ state: 'cancelled' });
    await expect(completeRealmRun(run.id)).rejects.toThrow();
  });
  it('prunes only the oldest fully closed run and refuses partially settled recovery records', async () => {
    const cancelled = {
      id: 'realm:1',
      subject: 'Math',
      gameId: 'math',
      mode: 'continuous',
      startedAt: 1,
      state: 'cancelled',
      continuousIntents: [],
    };
    const active = Array.from({ length: 499 }, (_, i) => ({
      id: `realm:${i + 2}`,
      subject: 'Math',
      gameId: 'math',
      mode: 'continuous',
      startedAt: i + 2,
      state: 'active',
      continuousIntents: [],
    }));
    state.canonical = JSON.stringify({
      version: 1,
      nextSequence: 501,
      runs: [cancelled, ...active],
    });
    await expect(
      allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 501 }),
    ).resolves.toMatchObject({ id: 'realm:501' });
    expect(
      JSON.parse(state.canonical!).runs.some((run: { id: string }) => run.id === 'realm:1'),
    ).toBe(false);
  });
  it('rejects duplicate identities and malformed nested sources without mutation', async () => {
    const base = {
      id: 'realm:1',
      subject: 'Math',
      gameId: 'math',
      mode: 'continuous',
      startedAt: 1,
      state: 'active',
      continuousIntents: [],
    };
    for (const runs of [
      [base, { ...base }],
      [
        {
          ...base,
          continuousIntents: [
            {
              amount: 1,
              reason: 'Played Math Adventure',
              operationId: 'realm:1:continuous:1',
              state: 'pending',
              awardKey: 'a',
              ordinal: 1,
            },
            {
              amount: 1,
              reason: 'Played Math Adventure',
              operationId: 'realm:1:continuous:1',
              state: 'pending',
              awardKey: 'b',
              ordinal: 2,
            },
          ],
        },
      ],
    ]) {
      state.canonical = JSON.stringify({ version: 1, nextSequence: 2, runs });
      await expect(getRecoverableRealmDeliveries()).rejects.toThrow();
    }
    state.canonical = JSON.stringify({
      version: 1,
      nextSequence: 2,
      runs: [{ ...base, extra: true }],
    });
    await expect(getRecoverableRealmDeliveries()).rejects.toThrow();
  });
  it('settles recovery legs independently and retains high continuous totals with capped score', async () => {
    const run = await allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 1 });
    const first = await prepareRealmContinuousAward(run.id, 'a', 500);
    const second = await prepareRealmContinuousAward(run.id, 'b', 500);
    await expect(prepareRealmContinuousAward(run.id, 'a', 500)).resolves.toMatchObject({
      operationId: first.operationId,
    });
    await markRealmDeliveryLegSettled(run.id, 'token', first.operationId);
    await markRealmDeliveryLegSettled(run.id, 'token', second.operationId);
    const completed = await completeRealmRun(run.id);
    expect(completed.completion).toMatchObject({
      result: { tokensEarned: 1000, score: 10000, stars: 3 },
      achievement: { score: 500 },
    });
    expect(await getRecoverableRealmDeliveries()).toEqual([
      expect.objectContaining({ id: run.id }),
    ]);
    await expect(markRealmDeliveryLegSettled(run.id, 'achievement', 'wrong')).rejects.toThrow();
    await markRealmDeliveryLegSettled(
      run.id,
      'achievement',
      completed.completion!.achievement.eventId,
    );
    await markRealmDeliveryLegSettled(
      run.id,
      'achievement',
      completed.completion!.achievement.eventId,
    );
    expect(await getRecoverableRealmDeliveries()).toEqual([]);
  });
  it('covers standard formulas and rejects completion/event tampering', async () => {
    const plain = await allocateRealmRun({
      subject: 'Language Arts',
      gameId: 'crossword',
      startedAt: 1,
    });
    expect(
      (await completeRealmRun(plain.id, { score: 2, stars: 2 })).completion!.token!.amount,
    ).toBe(15);
    const perfect = await allocateRealmRun({
      subject: 'Science',
      gameId: 'boss-science',
      startedAt: 2,
    });
    expect(
      (await completeRealmRun(perfect.id, { score: 1500, stars: 3 })).completion!.token!.amount,
    ).toBe(45);
    const bad = JSON.parse(state.canonical!);
    bad.runs[1].completion.achievement.eventId = 'game-completed:realm:1';
    state.canonical = JSON.stringify(bad);
    await expect(getRecoverableRealmDeliveries()).rejects.toThrow();
  });
  it('rejects invalid award/settlement inputs and canonical max boundaries', async () => {
    const run = await allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 1 });
    for (const [key, amount] of [
      ['', 1],
      ['ok', 0],
      ['ok', 501],
    ] as const)
      await expect(prepareRealmContinuousAward(run.id, key, amount)).rejects.toThrow();
    await expect(markRealmDeliveryLegSettled('realm:404', 'token', 'x')).rejects.toThrow();
    await expect(markRealmDeliveryLegSettled(run.id, 'achievement', 'x')).rejects.toThrow();
    state.canonical = JSON.stringify({
      version: 1,
      nextSequence: Number.MAX_SAFE_INTEGER,
      runs: [],
    });
    await expect(
      allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 1 }),
    ).rejects.toThrow();
    state.canonical = ' '.repeat(1024 * 1024);
    await expect(getRecoverableRealmDeliveries()).rejects.toThrow();
  });
  it('recovers queue after prepare, complete, and acknowledgement write failures', async () => {
    const run = await allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 1 });
    state.failSave = true;
    await expect(prepareRealmContinuousAward(run.id, 'a', 1)).rejects.toThrow();
    const intent = await prepareRealmContinuousAward(run.id, 'a', 1);
    state.failSave = true;
    await expect(
      markRealmDeliveryLegSettled(run.id, 'token', intent.operationId),
    ).rejects.toThrow();
    await markRealmDeliveryLegSettled(run.id, 'token', intent.operationId);
    state.failSave = true;
    await expect(completeRealmRun(run.id)).rejects.toThrow();
    await expect(completeRealmRun(run.id)).resolves.toMatchObject({ state: 'completed' });
  });
  it('accepts every reachable pair with the exact expected mode and rejects zero/pending close paths', async () => {
    const pairs = [
      ['Math', 'math', 'continuous'],
      ['Math', 'boss-math', 'standard'],
      ['Language Arts', 'anagrams', 'standard'],
      ['Language Arts', 'crossword', 'standard'],
      ['Language Arts', 'wordbuilder', 'continuous'],
      ['Science', 'boss-science', 'standard'],
      ['History', 'boss-history', 'standard'],
    ] as const;
    for (const [subject, gameId, mode] of pairs)
      await expect(
        allocateRealmRun({ subject, gameId, startedAt: Date.now() }),
      ).resolves.toMatchObject({ mode });
    const zero = await allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 1 });
    await expect(completeRealmRun(zero.id)).rejects.toThrow();
    await cancelRealmRun(zero.id);
    expect((await cancelRealmRun(zero.id)).state).toBe('cancelled');
    const pending = await allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 2 });
    await prepareRealmContinuousAward(pending.id, 'pending', 1);
    await expect(cancelRealmRun(pending.id)).rejects.toThrow();
  });
  it('recovers standard token and achievement legs independently across reload-equivalent reads', async () => {
    const run = await allocateRealmRun({
      subject: 'Language Arts',
      gameId: 'anagrams',
      startedAt: 1,
    });
    const completed = await completeRealmRun(run.id, { score: 99, stars: 3 });
    const token = completed.completion!.token!;
    await expect(markRealmDeliveryLegSettled(run.id, 'token', 'wrong')).rejects.toThrow();
    await markRealmDeliveryLegSettled(run.id, 'token', token.operationId);
    expect(await getRecoverableRealmDeliveries()).toEqual([
      expect.objectContaining({ id: run.id }),
    ]);
    await markRealmDeliveryLegSettled(
      run.id,
      'achievement',
      completed.completion!.achievement.eventId,
    );
    expect((await getRecoverableRealmDeliveries()).filter((entry) => entry.id === run.id)).toEqual(
      [],
    );
  });
  it('prunes fully settled completed records but refuses partially pending completed records at capacity', async () => {
    const completed = {
      id: 'realm:1',
      subject: 'Language Arts',
      gameId: 'anagrams',
      mode: 'standard',
      startedAt: 1,
      state: 'completed',
      continuousIntents: [],
      completion: {
        result: { score: 1, stars: 1, tokensEarned: 15 },
        token: {
          amount: 15,
          reason: 'Played Anagrams',
          operationId: 'realm:1:completion',
          state: 'settled',
        },
        achievement: {
          type: 'GAME_COMPLETED',
          eventId: 'game-completed:realm:1',
          contribution: 'ordinary',
          score: 0,
          stars: 1,
          state: 'settled',
        },
      },
    };
    const active = Array.from({ length: 499 }, (_, i) => ({
      id: `realm:${i + 2}`,
      subject: 'Math',
      gameId: 'math',
      mode: 'continuous',
      startedAt: i + 2,
      state: 'active',
      continuousIntents: [],
    }));
    state.canonical = JSON.stringify({
      version: 1,
      nextSequence: 501,
      runs: [completed, ...active],
    });
    await allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 999 });
    expect(JSON.parse(state.canonical!).runs.some((r: { id: string }) => r.id === 'realm:1')).toBe(
      false,
    );
    completed.completion.achievement.state = 'pending';
    state.canonical = JSON.stringify({
      version: 1,
      nextSequence: 501,
      runs: [completed, ...active],
    });
    const before = state.canonical;
    await expect(
      allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 999 }),
    ).rejects.toThrow('safe limit');
    expect(state.canonical).toBe(before);
  });
  it('returns defensive copies and makes exact replays no-write', async () => {
    const run = await allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 1 });
    run.id = 'tampered';
    const first = await prepareRealmContinuousAward('realm:1', 'a', 1);
    const saves = state.saves;
    const replay = await prepareRealmContinuousAward('realm:1', 'a', 1);
    replay.amount = 99;
    expect(state.saves).toBe(saves);
    expect(first.amount).toBe(1);
    expect((await getRecoverableRealmDeliveries())[0]!.continuousIntents[0]!.amount).toBe(1);
    const standard = await allocateRealmRun({
      subject: 'Language Arts',
      gameId: 'anagrams',
      startedAt: 2,
    });
    const completed = await completeRealmRun(standard.id, { score: 90, stars: 3 });
    const afterComplete = state.saves;
    completed.state = 'cancelled';
    await completeRealmRun(standard.id, { score: 90, stars: 3 });
    expect(state.saves).toBe(afterComplete);
    await markRealmDeliveryLegSettled(
      standard.id,
      'token',
      completed.completion!.token!.operationId,
    );
    const afterToken = state.saves;
    await markRealmDeliveryLegSettled(
      standard.id,
      'token',
      completed.completion!.token!.operationId,
    );
    expect(state.saves).toBe(afterToken);
    const recovery = await getRecoverableRealmDeliveries();
    recovery[0]!.state = 'cancelled';
    await markRealmDeliveryLegSettled(
      standard.id,
      'achievement',
      completed.completion!.achievement.eventId,
    );
    const afterAchievement = state.saves;
    await markRealmDeliveryLegSettled(
      standard.id,
      'achievement',
      completed.completion!.achievement.eventId,
    );
    expect(state.saves).toBe(afterAchievement);
    expect(
      (await getRecoverableRealmDeliveries()).filter((entry) => entry.id === standard.id),
    ).toEqual([]);
    const cancelled = await allocateRealmRun({ subject: 'Math', gameId: 'math', startedAt: 3 });
    await cancelRealmRun(cancelled.id);
    const afterCancel = state.saves;
    await cancelRealmRun(cancelled.id);
    expect(state.saves).toBe(afterCancel);
  });
});
