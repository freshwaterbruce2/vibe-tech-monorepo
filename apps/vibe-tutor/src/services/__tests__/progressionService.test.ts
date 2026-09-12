import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubjectType, WorksheetSession } from '../../types';

// In-memory settings store for persistence across calls
const settingsStore = new Map<string, string>();

// Mock dataStore with persistent getUserSettings/saveUserSettings
vi.mock('../dataStore', () => ({
  dataStore: {
    getWorksheetProgressRecord: vi.fn(
      async () => settingsStore.get('vibetutor_worksheet_progress_v1') ?? null,
    ),
    saveWorksheetProgressRecord: vi.fn(async (value: string) => {
      settingsStore.set('vibetutor_worksheet_progress_v1', value);
    }),
    getLegacyWorksheetProgressRecord: vi.fn(
      async () => settingsStore.get('subject-progress') ?? null,
    ),
    getUserSettings: vi.fn(async (key: string) => settingsStore.get(key) ?? ''),
    saveUserSettings: vi.fn(async (key: string, value: string) => {
      settingsStore.set(key, value);
    }),
  },
}));

// Import after mocks
const {
  loadProgress,
  getSubjectProgress,
  recordWorksheetCompletion,
  getNextDifficulty,
  getProgressToNextLevel,
  getTotalStars,
  getTotalWorksheetsCompleted,
  completeWorksheet,
  getRecoverableWorksheetDeliveries,
  markWorksheetDeliveryLegSettled,
  getDailyChallengeStatus,
  claimDailyChallenge,
  confirmDailyChallengeClaim,
} = await import('../progressionService');
const { dataStore } = await import('../dataStore');

function makeSession(overrides: Partial<WorksheetSession> = {}): WorksheetSession {
  const subject = overrides.subject ?? 'Math';
  const difficulty = overrides.difficulty ?? 'Beginner';
  const stars = overrides.starsEarned ?? 5;
  const scoreByStars = [0, 50, 60, 70, 80, 100];
  const score = scoreByStars[stars] ?? 100;
  const correct = Math.round((score / 100) * 20);
  const questions = Array.from({ length: 20 }, (_, index) => ({
    id: `q${index}`,
    subject,
    difficulty,
    type: 'multiple-choice' as const,
    question: `Question ${index + 1}?`,
    options: ['Yes', 'No'],
    correctAnswer: 0,
  }));
  return {
    id: `worksheet:${crypto.randomUUID()}`,
    subject,
    difficulty,
    score,
    starsEarned: stars,
    completedAt: Date.now(),
    timeSpent: 0,
    questions,
    answers: questions.map((_, index) => (index < correct ? 0 : 1)),
    ...overrides,
  } as WorksheetSession;
}

describe('progressionService', () => {
  beforeEach(() => {
    settingsStore.clear();
    vi.clearAllMocks();
  });

  it('accepts normalized fill-blank answers but rejects forged score and stars', async () => {
    const base = {
      id: `worksheet:${crypto.randomUUID()}`,
      subject: 'Math' as const,
      difficulty: 'Beginner' as const,
      completedAt: Date.now(),
      timeSpent: 0,
      questions: [
        {
          id: 'fill',
          subject: 'Math' as const,
          difficulty: 'Beginner' as const,
          type: 'fill-blank' as const,
          question: 'Type it',
          correctAnswer: 'ANSWER',
        },
      ],
    };
    await expect(
      completeWorksheet({ ...base, answers: ['  ANSWER  '], score: 100, starsEarned: 5 }),
    ).resolves.toBeDefined();
    await expect(
      completeWorksheet({
        ...base,
        id: `worksheet:${crypto.randomUUID()}`,
        answers: ['WRONG'],
        score: 100,
        starsEarned: 5,
      }),
    ).rejects.toThrow();
  });

  async function canonicalFixture() {
    await completeWorksheet(makeSession({ starsEarned: 0 }));
    return JSON.parse(settingsStore.get('vibetutor_worksheet_progress_v1')!) as Record<string, any>;
  }

  async function rejectCanonical(mutator: (record: Record<string, any>) => void) {
    const record = await canonicalFixture();
    mutator(record);
    settingsStore.set('vibetutor_worksheet_progress_v1', JSON.stringify(record));
    await expect(loadProgress()).rejects.toThrow();
  }

  async function capacityFixture(count: number, settledIndexes: number[] = []) {
    const record = await canonicalFixture();
    const base = structuredClone(record.deliveries[0]);
    const question = base.source.questions[0];
    record.subjects.Math.history = [];
    record.subjects.Math.totalWorksheetsCompleted = count;
    record.subjects.Math.averageScore = 0;
    record.subjects.Math.bestScore = 0;
    record.subjects.Math.currentStreak = 0;
    record.subjects.Math.starsCollected = 0;
    record.deliveries = Array.from({ length: count }, (_, index) => {
      const id = `worksheet:${crypto.randomUUID()}`;
      const source = {
        ...base.source,
        id,
        questions: [question],
        answers: [1],
        score: 0,
        starsEarned: 0,
      };
      return {
        ...base,
        source,
        token: {
          ...base.token,
          amount: 0,
          operationId: `worksheet:complete:${id}`,
          state: 'settled',
        },
        achievement: {
          ...base.achievement,
          eventId: `worksheet-completed:${id}`,
          state: settledIndexes.includes(index) ? 'settled' : 'pending',
        },
      };
    });
    return record;
  }

  describe('canonical fail-closed validation', () => {
    it.each([
      ['missing top level', (r: any) => delete r.deliveries],
      [
        'unknown top level',
        (r: any) => {
          r.extra = true;
        },
      ],
      ['missing subject', (r: any) => delete r.subjects.Math],
      [
        'unknown subject',
        (r: any) => {
          r.subjects.Art = r.subjects.Math;
        },
      ],
      ['missing progress field', (r: any) => delete r.subjects.Math.bestScore],
      [
        'unknown progress field',
        (r: any) => {
          r.subjects.Math.extra = true;
        },
      ],
      ['missing session field', (r: any) => delete r.subjects.Math.history[0].score],
      [
        'unknown session field',
        (r: any) => {
          r.subjects.Math.history[0].extra = true;
        },
      ],
      [
        'missing question field',
        (r: any) => delete r.subjects.Math.history[0].questions[0].question,
      ],
      [
        'unknown question field',
        (r: any) => {
          r.subjects.Math.history[0].questions[0].extra = true;
        },
      ],
      [
        'invalid UUID',
        (r: any) => {
          r.subjects.Math.history[0].id = 'worksheet:not-a-uuid';
        },
      ],
      [
        'uppercase UUID',
        (r: any) => {
          r.subjects.Math.history[0].id = r.subjects.Math.history[0].id.toUpperCase();
        },
      ],
      [
        'non-v4 UUID',
        (r: any) => {
          r.subjects.Math.history[0].id = r.subjects.Math.history[0].id.replace('-4', '-1');
        },
      ],
      [
        'control character',
        (r: any) => {
          r.subjects.Math.history[0].questions[0].question = 'bad\u0001';
        },
      ],
      [
        'unpaired surrogate',
        (r: any) => {
          r.subjects.Math.history[0].questions[0].question = '\ud800';
        },
      ],
      [
        'option bounds',
        (r: any) => {
          r.subjects.Math.history[0].questions[0].options = [];
        },
      ],
      [
        'correct answer bounds',
        (r: any) => {
          r.subjects.Math.history[0].questions[0].correctAnswer = 99;
        },
      ],
      [
        'answer bounds',
        (r: any) => {
          r.subjects.Math.history[0].answers[0] = 99;
        },
      ],
      [
        'duplicate question id',
        (r: any) => {
          r.subjects.Math.history[0].questions[1].id = r.subjects.Math.history[0].questions[0].id;
        },
      ],
      [
        'forged score',
        (r: any) => {
          r.subjects.Math.history[0].score = 20;
        },
      ],
      [
        'forged stars',
        (r: any) => {
          r.subjects.Math.history[0].starsEarned = 4;
        },
      ],
      [
        'difficulty mismatch',
        (r: any) => {
          r.subjects.Math.history[0].difficulty = 'Intermediate';
        },
      ],
      [
        'duplicate history across subjects',
        (r: any) => {
          r.subjects.Science.history = [r.subjects.Math.history[0]];
          r.subjects.Science.totalWorksheetsCompleted = 1;
          r.subjects.Science.averageScore = 0;
          r.subjects.Science.bestScore = 0;
        },
      ],
      [
        'total invariant',
        (r: any) => {
          r.subjects.Math.totalWorksheetsCompleted = 0;
        },
      ],
      [
        'streak invariant',
        (r: any) => {
          r.subjects.Math.currentStreak = 2;
        },
      ],
      [
        'non-master stars',
        (r: any) => {
          r.subjects.Math.starsCollected = 5;
        },
      ],
      [
        'average invariant',
        (r: any) => {
          r.subjects.Math.averageScore = 1;
        },
      ],
      [
        'best invariant',
        (r: any) => {
          r.subjects.Math.bestScore = 101;
        },
      ],
    ])('rejects %s', async (_label, mutate) => rejectCanonical(mutate));

    it('accepts representative shipped Unicode worksheet text', async () => {
      const record = await canonicalFixture();
      record.subjects.Math.history[0].questions[0].question = 'π × ² ÷ ∫ ° Hernán';
      record.deliveries[0].source.questions[0].question = 'π × ² ÷ ∫ ° Hernán';
      settingsStore.set('vibetutor_worksheet_progress_v1', JSON.stringify(record));
      await expect(loadProgress()).resolves.toBeDefined();
    });

    it('does not fall back to legacy or write when canonical is malformed', async () => {
      const record = await canonicalFixture();
      delete record.deliveries;
      settingsStore.set('vibetutor_worksheet_progress_v1', JSON.stringify(record));
      settingsStore.set('subject-progress', JSON.stringify({ Math: {} }));
      const writes = vi.mocked(dataStore.saveWorksheetProgressRecord).mock.calls.length;
      await expect(loadProgress()).rejects.toThrow();
      expect(vi.mocked(dataStore.saveWorksheetProgressRecord)).toHaveBeenCalledTimes(writes);
    });
  });

  describe('worksheet delivery settlement', () => {
    it.each([
      [
        'retained source mismatch',
        (r: any) => {
          r.deliveries[0].source.score = 10;
        },
      ],
      [
        'duplicate source',
        (r: any) => {
          r.deliveries.push(structuredClone(r.deliveries[0]));
        },
      ],
      [
        'duplicate operation',
        (r: any) => {
          r.deliveries.push({
            ...structuredClone(r.deliveries[0]),
            source: { ...r.deliveries[0].source, id: `worksheet:${crypto.randomUUID()}` },
            token: { ...r.deliveries[0].token },
            achievement: { ...r.deliveries[0].achievement },
          });
        },
      ],
      [
        'zero token pending',
        (r: any) => {
          r.deliveries[0].token.state = 'pending';
        },
      ],
      [
        'wrong token amount',
        (r: any) => {
          r.deliveries[0].token.amount = 9;
        },
      ],
      [
        'wrong event type',
        (r: any) => {
          r.deliveries[0].achievement.type = 'OTHER';
        },
      ],
      [
        'false with new difficulty',
        (r: any) => {
          r.deliveries[0].result.newDifficulty = 'Intermediate';
        },
      ],
      [
        'wrong level stars',
        (r: any) => {
          r.deliveries[0].result.starsToNextLevel = 9;
        },
      ],
    ])('rejects malformed delivery %s', async (_label, mutate) => rejectCanonical(mutate));

    it('returns cloned exact pending facts and settles each leg independently', async () => {
      const session = makeSession({ starsEarned: 2 });
      await completeWorksheet(session);
      const [delivery] = await getRecoverableWorksheetDeliveries();
      expect(delivery).toMatchObject({
        source: { id: session.id },
        token: { amount: 2, operationId: `worksheet:complete:${session.id}`, state: 'pending' },
        achievement: { eventId: `worksheet-completed:${session.id}`, state: 'pending' },
      });
      delivery.token.state = 'settled';
      expect((await getRecoverableWorksheetDeliveries())[0]?.token.state).toBe('pending');
      await markWorksheetDeliveryLegSettled(
        session.id,
        'token',
        `worksheet:complete:${session.id}`,
      );
      expect((await getRecoverableWorksheetDeliveries())[0]).toMatchObject({
        token: { state: 'settled' },
        achievement: { state: 'pending' },
      });
      await markWorksheetDeliveryLegSettled(
        session.id,
        'achievement',
        `worksheet-completed:${session.id}`,
      );
      await expect(getRecoverableWorksheetDeliveries()).resolves.toEqual([]);
    });

    it('rejects settlement identity/leg errors without a write and makes a repeated acknowledgement idempotent', async () => {
      const session = makeSession({ starsEarned: 2 });
      await completeWorksheet(session);
      const writes = vi.mocked(dataStore.saveWorksheetProgressRecord).mock.calls.length;
      await expect(markWorksheetDeliveryLegSettled(session.id, 'token', 'wrong')).rejects.toThrow();
      await expect(markWorksheetDeliveryLegSettled('missing', 'token', 'wrong')).rejects.toThrow();
      await expect(
        markWorksheetDeliveryLegSettled(session.id, 'bad' as never, 'wrong'),
      ).rejects.toThrow();
      expect(vi.mocked(dataStore.saveWorksheetProgressRecord)).toHaveBeenCalledTimes(writes);
      await markWorksheetDeliveryLegSettled(
        session.id,
        'token',
        `worksheet:complete:${session.id}`,
      );
      const settledWrites = vi.mocked(dataStore.saveWorksheetProgressRecord).mock.calls.length;
      await markWorksheetDeliveryLegSettled(
        session.id,
        'token',
        `worksheet:complete:${session.id}`,
      );
      expect(vi.mocked(dataStore.saveWorksheetProgressRecord)).toHaveBeenCalledTimes(settledWrites);
    });

    it('keeps a failed acknowledgement recoverable for an exact retry', async () => {
      const session = makeSession({ starsEarned: 2 });
      await completeWorksheet(session);
      vi.mocked(dataStore.saveWorksheetProgressRecord).mockRejectedValueOnce(
        new Error('write failed'),
      );
      await expect(
        markWorksheetDeliveryLegSettled(session.id, 'token', `worksheet:complete:${session.id}`),
      ).rejects.toThrow('write failed');
      expect((await getRecoverableWorksheetDeliveries())[0]?.token.state).toBe('pending');
      await markWorksheetDeliveryLegSettled(
        session.id,
        'token',
        `worksheet:complete:${session.id}`,
      );
      expect((await getRecoverableWorksheetDeliveries())[0]?.token.state).toBe('settled');
    });

    it('serializes concurrent independent acknowledgements without losing either leg', async () => {
      const session = makeSession({ starsEarned: 2 });
      await completeWorksheet(session);
      await Promise.all([
        markWorksheetDeliveryLegSettled(session.id, 'token', `worksheet:complete:${session.id}`),
        markWorksheetDeliveryLegSettled(
          session.id,
          'achievement',
          `worksheet-completed:${session.id}`,
        ),
      ]);
      await expect(getRecoverableWorksheetDeliveries()).resolves.toEqual([]);
    });
  });

  describe('delivery retention boundaries', () => {
    it('rejects 501 canonical deliveries without writing', async () => {
      const record = await capacityFixture(501);
      const writes = vi.mocked(dataStore.saveWorksheetProgressRecord).mock.calls.length;
      settingsStore.set('vibetutor_worksheet_progress_v1', JSON.stringify(record));
      await expect(loadProgress()).rejects.toThrow();
      expect(vi.mocked(dataStore.saveWorksheetProgressRecord)).toHaveBeenCalledTimes(writes);
    });

    it('retains pending oldest and prunes only an eligible closed pruned delivery at capacity', async () => {
      const record = await capacityFixture(500, [1]);
      const pendingId = record.deliveries[0].source.id;
      const eligibleId = record.deliveries[1].source.id;
      settingsStore.set('vibetutor_worksheet_progress_v1', JSON.stringify(record));
      await completeWorksheet(makeSession({ starsEarned: 0 }));
      const saved = JSON.parse(settingsStore.get('vibetutor_worksheet_progress_v1')!);
      expect(saved.deliveries).toHaveLength(500);
      expect(saved.deliveries.some((entry: any) => entry.source.id === pendingId)).toBe(true);
      expect(saved.deliveries.some((entry: any) => entry.source.id === eligibleId)).toBe(false);
    });

    it('rejects a full unresolved record before write and preserves it', async () => {
      const record = await capacityFixture(500);
      const serialized = JSON.stringify(record);
      settingsStore.set('vibetutor_worksheet_progress_v1', serialized);
      const writes = vi.mocked(dataStore.saveWorksheetProgressRecord).mock.calls.length;
      await expect(completeWorksheet(makeSession({ starsEarned: 0 }))).rejects.toThrow(
        /safe limit/i,
      );
      expect(vi.mocked(dataStore.saveWorksheetProgressRecord)).toHaveBeenCalledTimes(writes);
      expect(settingsStore.get('vibetutor_worksheet_progress_v1')).toBe(serialized);
    });

    it('does not prune a closed delivery that remains in visible history', async () => {
      const record = await capacityFixture(500, [0]);
      record.subjects.Math.history = [record.deliveries[0].source];
      settingsStore.set('vibetutor_worksheet_progress_v1', JSON.stringify(record));
      await expect(completeWorksheet(makeSession({ starsEarned: 0 }))).rejects.toThrow(
        /safe limit/i,
      );
    });
    it('replays a valid history-pruned delivery without writing or incrementing progression', async () => {
      const first = makeSession({ starsEarned: 0 });
      await completeWorksheet(first);
      for (let index = 0; index < 50; index += 1) {
        await completeWorksheet(makeSession({ starsEarned: 0 }));
      }
      const before = await getSubjectProgress('Math');
      expect(before.history.some((session) => session.id === first.id)).toBe(false);
      const writes = vi.mocked(dataStore.saveWorksheetProgressRecord).mock.calls.length;
      await expect(completeWorksheet(first)).resolves.toMatchObject({ replayed: true });
      expect(vi.mocked(dataStore.saveWorksheetProgressRecord)).toHaveBeenCalledTimes(writes);
      expect((await getSubjectProgress('Math')).totalWorksheetsCompleted).toBe(
        before.totalWorksheetsCompleted,
      );
      await expect(
        completeWorksheet({
          ...first,
          answers: first.answers.map((_, index) => (index < 10 ? 0 : 1)),
          score: 50,
          starsEarned: 1,
        }),
      ).rejects.toThrow(/conflicts/i);
    });

    it('rejects a forged pruned delivery when lifetime accounting cannot cover it', async () => {
      await rejectCanonical((record) => {
        const source = structuredClone(record.deliveries[0].source);
        source.id = `worksheet:${crypto.randomUUID()}`;
        record.deliveries.push({
          ...structuredClone(record.deliveries[0]),
          source,
          token: { ...record.deliveries[0].token, operationId: `worksheet:complete:${source.id}` },
          achievement: {
            ...record.deliveries[0].achievement,
            eventId: `worksheet-completed:${source.id}`,
          },
        });
      });
    });

    it('rejects an actual UTF-8 record above the safe byte limit without writing', async () => {
      const writes = vi.mocked(dataStore.saveWorksheetProgressRecord).mock.calls.length;
      settingsStore.set(
        'vibetutor_worksheet_progress_v1',
        `{"version":1,"padding":"${'π'.repeat(600_000)}"}`,
      );
      await expect(loadProgress()).rejects.toThrow(/safe limit/i);
      expect(vi.mocked(dataStore.saveWorksheetProgressRecord)).toHaveBeenCalledTimes(writes);
    });
  });

  describe('legacy and completion serialization', () => {
    it('rejects malformed legacy without writing a canonical replacement', async () => {
      settingsStore.set('subject-progress', JSON.stringify({ Math: { subject: 'Science' } }));
      const writes = vi.mocked(dataStore.saveWorksheetProgressRecord).mock.calls.length;
      await expect(loadProgress()).rejects.toThrow(/legacy/i);
      expect(vi.mocked(dataStore.saveWorksheetProgressRecord)).toHaveBeenCalledTimes(writes);
    });

    it('imports a safe legacy history without retroactive delivery and writes one modern delivery later', async () => {
      const legacy = makeSession({ id: 'worksheet_1725000000000', starsEarned: 0 });
      settingsStore.set(
        'subject-progress',
        JSON.stringify({
          Math: { history: [legacy], totalWorksheetsCompleted: 1, averageScore: 0, bestScore: 0 },
        }),
      );
      expect(await getRecoverableWorksheetDeliveries()).toEqual([]);
      await expect(completeWorksheet(legacy)).rejects.toThrow();
      await completeWorksheet(makeSession({ starsEarned: 0 }));
      const canonical = JSON.parse(settingsStore.get('vibetutor_worksheet_progress_v1')!);
      expect(canonical.subjects.Math.history).toHaveLength(2);
      expect(canonical.deliveries).toHaveLength(1);
      expect(settingsStore.get('subject-progress')).toContain('worksheet_1725000000000');
    });

    it('serializes distinct completions and de-duplicates an exact concurrent source', async () => {
      const first = makeSession({ starsEarned: 0 });
      const second = makeSession({ starsEarned: 0 });
      await Promise.all([completeWorksheet(first), completeWorksheet(second)]);
      expect((await getSubjectProgress('Math')).totalWorksheetsCompleted).toBe(2);
      const same = makeSession({ starsEarned: 0 });
      const results = await Promise.all([completeWorksheet(same), completeWorksheet(same)]);
      expect(results.filter((result) => result.replayed).length).toBe(1);
    });

    it('rejects a wrapper subject mismatch before a canonical write', async () => {
      const writes = vi.mocked(dataStore.saveWorksheetProgressRecord).mock.calls.length;
      await expect(
        recordWorksheetCompletion('Science', makeSession({ starsEarned: 0 })),
      ).rejects.toThrow(/subject conflicts/i);
      expect(vi.mocked(dataStore.saveWorksheetProgressRecord)).toHaveBeenCalledTimes(writes);
    });

    it('publishes no completion after a canonical write failure and releases the queue for an exact retry', async () => {
      const session = makeSession({ starsEarned: 0 });
      vi.mocked(dataStore.saveWorksheetProgressRecord).mockRejectedValueOnce(
        new Error('write failed'),
      );
      await expect(completeWorksheet(session)).rejects.toThrow('write failed');
      expect(settingsStore.has('vibetutor_worksheet_progress_v1')).toBe(false);
      await expect(completeWorksheet(session)).resolves.toMatchObject({ starsToNextLevel: 5 });
      expect((await getSubjectProgress('Math')).totalWorksheetsCompleted).toBe(1);
    });

    it('serializes conflicting concurrent facts for one identity into one success and one conflict', async () => {
      const session = makeSession({ starsEarned: 0 });
      const changed = {
        ...session,
        answers: session.answers.map((_, index) => (index < 10 ? 0 : 1)),
        score: 50,
        starsEarned: 1,
      };
      const results = await Promise.allSettled([
        completeWorksheet(session),
        completeWorksheet(changed),
      ]);
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
      const progress = await getSubjectProgress('Math');
      expect(progress.totalWorksheetsCompleted).toBe(1);
      expect(progress.history).toHaveLength(1);
      expect(await getRecoverableWorksheetDeliveries()).toHaveLength(1);
    });
  });

  describe('daily challenge claim serialization', () => {
    const day = new Date(2026, 7, 24, 12, 0, 0).getTime();
    const prepareEligibleDay = async (completedAt = day) => {
      for (let index = 0; index < 3; index += 1) {
        await recordWorksheetCompletion(
          'Math',
          makeSession({ starsEarned: 0, completedAt: completedAt + index }),
        );
      }
    };

    it('guards a same-date concurrent claim while the first pending write is blocked', async () => {
      await prepareEligibleDay();
      let release: (() => void) | undefined;
      const blocked = new Promise<void>((resolve) => {
        release = resolve;
      });
      vi.mocked(dataStore.saveUserSettings).mockImplementationOnce(async () => blocked);
      const first = claimDailyChallenge(3, day);
      await Promise.resolve();
      await expect(claimDailyChallenge(3, day)).resolves.toMatchObject({ claimed: false });
      expect(vi.mocked(dataStore.saveUserSettings)).toHaveBeenCalledTimes(1);
      release?.();
      await expect(first).resolves.toMatchObject({ claimed: true });
    });

    it('returns an exact-date pending claim without another write', async () => {
      await prepareEligibleDay();
      settingsStore.set(
        'daily-worksheet-challenge-claim',
        JSON.stringify({ date: '2026-08-24', claimedAt: day, state: 'pending' }),
      );
      const writes = vi.mocked(dataStore.saveUserSettings).mock.calls.length;
      await expect(claimDailyChallenge(3, day)).resolves.toMatchObject({ claimed: true });
      expect(vi.mocked(dataStore.saveUserSettings)).toHaveBeenCalledTimes(writes);
    });

    it('releases the date guard after a failed pending write for a later retry', async () => {
      await prepareEligibleDay();
      vi.mocked(dataStore.saveUserSettings).mockRejectedValueOnce(new Error('write failed'));
      await expect(claimDailyChallenge(3, day)).resolves.toMatchObject({ claimed: false });
      await expect(claimDailyChallenge(3, day)).resolves.toMatchObject({ claimed: true });
    });

    it('serializes a blocked older claim with a later-local-date claim without overwriting the later date', async () => {
      const laterDay = day + 86_400_000;
      await prepareEligibleDay();
      await prepareEligibleDay(laterDay);
      let releaseOlderWrite: (() => void) | undefined;
      const olderWriteBlocked = new Promise<void>((resolve) => {
        releaseOlderWrite = resolve;
      });
      vi.mocked(dataStore.saveUserSettings).mockImplementationOnce(async () => olderWriteBlocked);

      const olderClaim = claimDailyChallenge(3, day);
      await Promise.resolve();
      await expect(claimDailyChallenge(3, day)).resolves.toMatchObject({ claimed: false });
      let laterSettled = false;
      const laterClaim = claimDailyChallenge(3, laterDay).then((result) => {
        laterSettled = true;
        return result;
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(laterSettled).toBe(false);
      releaseOlderWrite?.();

      await expect(olderClaim).resolves.toMatchObject({ claimed: true });
      await expect(laterClaim).resolves.toMatchObject({ claimed: true });
      expect(
        JSON.parse(settingsStore.get('daily-worksheet-challenge-claim') ?? '{}'),
      ).toMatchObject({
        date: '2026-08-25',
        state: 'pending',
      });
    });

    it.each([
      ['broken JSON', '{broken'],
      [
        'invalid keys',
        JSON.stringify({ date: '2026-08-24', claimedAt: day, state: 'rewarded', extra: true }),
      ],
      ['invalid date', JSON.stringify({ date: '2026-99-99', claimedAt: day, state: 'rewarded' })],
      [
        'invalid claimedAt',
        JSON.stringify({ date: '2026-08-24', claimedAt: -1, state: 'rewarded' }),
      ],
      ['invalid state', JSON.stringify({ date: '2026-08-24', claimedAt: day, state: 'claimed' })],
    ])('fails closed for %s stored claim data without overwriting it', async (_kind, stored) => {
      await prepareEligibleDay();
      settingsStore.set('daily-worksheet-challenge-claim', stored);
      const writes = vi.mocked(dataStore.saveUserSettings).mock.calls.length;

      await expect(getDailyChallengeStatus(3, day)).resolves.toMatchObject({ claimed: false });
      await expect(claimDailyChallenge(3, day)).resolves.toMatchObject({ claimed: false });
      expect(settingsStore.get('daily-worksheet-challenge-claim')).toBe(stored);
      expect(vi.mocked(dataStore.saveUserSettings)).toHaveBeenCalledTimes(writes);
    });

    it('continues to interpret the exact legacy claim shape as rewarded', async () => {
      await prepareEligibleDay();
      settingsStore.set(
        'daily-worksheet-challenge-claim',
        JSON.stringify({ date: '2026-08-24', claimedAt: day }),
      );
      const writes = vi.mocked(dataStore.saveUserSettings).mock.calls.length;

      await expect(getDailyChallengeStatus(3, day)).resolves.toMatchObject({ claimed: true });
      await expect(claimDailyChallenge(3, day)).resolves.toMatchObject({ claimed: false });
      expect(vi.mocked(dataStore.saveUserSettings)).toHaveBeenCalledTimes(writes);
    });
  });

  // ── loadProgress ────────────────────────────────────────────────
  describe('loadProgress', () => {
    it('returns default progress when no saved data', async () => {
      const progress = await loadProgress();

      expect(progress.Math).toBeDefined();
      expect(progress.Science).toBeDefined();
      expect(progress.History).toBeDefined();
      expect(progress.Bible).toBeDefined();
      expect(progress['Language Arts']).toBeDefined();

      expect(progress.Math.currentDifficulty).toBe('Beginner');
      expect(progress.Math.starsCollected).toBe(0);
      expect(progress.Math.totalWorksheetsCompleted).toBe(0);
    });

    it('merges saved data with defaults', async () => {
      const saved = { Math: { starsCollected: 3, currentDifficulty: 'Intermediate' } };
      settingsStore.set('subject-progress', JSON.stringify(saved));

      const progress = await loadProgress();
      expect(progress.Math.starsCollected).toBe(3);
      expect(progress.Math.currentDifficulty).toBe('Intermediate');
      // Other subjects still have defaults
      expect(progress.Science).toBeDefined();
      expect(progress.Science.currentDifficulty).toBe('Beginner');
    });

    it('fails closed on malformed legacy progress', async () => {
      settingsStore.set('subject-progress', '{{invalid json}}');
      await expect(loadProgress()).rejects.toThrow();
    });
  });

  // ── canonical persistence ───────────────────────────────────────
  describe('canonical persistence', () => {
    it('propagates a persistence failure instead of reporting a completed worksheet write', async () => {
      vi.mocked(dataStore.saveWorksheetProgressRecord).mockRejectedValueOnce(
        new Error('storage unavailable'),
      );

      await expect(completeWorksheet(makeSession())).rejects.toThrow('storage unavailable');
    });

    it('does not overwrite malformed stored progress during a worksheet mutation', async () => {
      settingsStore.set('subject-progress', '{broken');

      await expect(completeWorksheet(makeSession())).rejects.toThrow();
    });
  });

  // ── recordWorksheetCompletion ──────────────────────────────────
  describe('recordWorksheetCompletion', () => {
    it('increments worksheets completed', async () => {
      const result = await recordWorksheetCompletion('Math', makeSession());
      expect(result.progress.totalWorksheetsCompleted).toBe(1);
    });

    it('adds stars earned', async () => {
      const result = await recordWorksheetCompletion('Math', makeSession({ starsEarned: 4 }));
      expect(result.starsEarned).toBe(4);
      expect(result.progress.starsCollected).toBe(4);
    });

    it('accumulates across multiple calls', async () => {
      await recordWorksheetCompletion('Math', makeSession({ starsEarned: 2 }));
      const result = await recordWorksheetCompletion('Math', makeSession({ starsEarned: 2 }));
      expect(result.progress.totalWorksheetsCompleted).toBe(2);
      expect(result.progress.starsCollected).toBe(4);
    });

    it('triggers level-up when stars reach threshold (5)', async () => {
      await recordWorksheetCompletion('Math', makeSession({ starsEarned: 4 }));
      const result = await recordWorksheetCompletion('Math', makeSession({ starsEarned: 2 }));

      expect(result.leveledUp).toBe(true);
      expect(result.newDifficulty).toBe('Intermediate');
      expect(result.progress.starsCollected).toBe(0); // Reset after level-up
    });

    it('increments streak for 3+ stars', async () => {
      const result = await recordWorksheetCompletion('Math', makeSession({ starsEarned: 3 }));
      expect(result.progress.currentStreak).toBe(1);
    });

    it('resets streak for fewer than 3 stars', async () => {
      await recordWorksheetCompletion('Math', makeSession({ starsEarned: 4 }));
      const result = await recordWorksheetCompletion('Math', makeSession({ starsEarned: 1 }));
      expect(result.progress.currentStreak).toBe(0);
    });

    it('caps history at 50 sessions', async () => {
      for (let i = 0; i < 55; i++) {
        await recordWorksheetCompletion('Math', makeSession({ starsEarned: 0 }));
      }
      const progress = await getSubjectProgress('Math');
      expect(progress.history.length).toBeLessThanOrEqual(50);
    });
  });

  // ── getNextDifficulty ──────────────────────────────────────────
  describe('getNextDifficulty', () => {
    it('returns next difficulty in order', () => {
      expect(getNextDifficulty('Beginner')).toBe('Intermediate');
      expect(getNextDifficulty('Intermediate')).toBe('Advanced');
      expect(getNextDifficulty('Advanced')).toBe('Expert');
      expect(getNextDifficulty('Expert')).toBe('Master');
    });

    it('returns null at max difficulty', () => {
      expect(getNextDifficulty('Master')).toBeNull();
    });
  });

  // ── getProgressToNextLevel ─────────────────────────────────────
  describe('getProgressToNextLevel', () => {
    it('returns 0 when no progress', async () => {
      const ratio = await getProgressToNextLevel('Math');
      expect(ratio).toBe(0);
    });

    it('returns fraction after earning some stars', async () => {
      await recordWorksheetCompletion('Math', makeSession({ starsEarned: 2 }));
      const ratio = await getProgressToNextLevel('Math');
      expect(ratio).toBeCloseTo(0.4); // 2/5
    });
  });

  // ── getTotalStars ──────────────────────────────────────────────
  describe('getTotalStars', () => {
    it('sums stars from all session histories', async () => {
      await recordWorksheetCompletion('Math', makeSession({ starsEarned: 2 }));
      await recordWorksheetCompletion(
        'Science',
        makeSession({ subject: 'Science' as SubjectType, starsEarned: 3 }),
      );

      const total = await getTotalStars();
      expect(total).toBe(5);
    });
  });

  // ── getTotalWorksheetsCompleted ────────────────────────────────
  describe('getTotalWorksheetsCompleted', () => {
    it('sums worksheets across all subjects', async () => {
      await recordWorksheetCompletion('Math', makeSession({ starsEarned: 0 }));
      await recordWorksheetCompletion('Math', makeSession({ starsEarned: 0 }));

      const total = await getTotalWorksheetsCompleted();
      expect(total).toBe(2);
    });
  });

  // ── completeWorksheet ──────────────────────────────────────────
  describe('completeWorksheet', () => {
    it('returns starsToNextLevel', async () => {
      const result = await completeWorksheet(makeSession({ starsEarned: 2 }));
      expect(result.starsToNextLevel).toBe(3); // 5 - 2
      expect(result.leveledUp).toBe(false);
    });

    it('replays an exact retained source without a second record write', async () => {
      const session = makeSession({ starsEarned: 2 });
      await completeWorksheet(session);
      const writes = vi.mocked(dataStore.saveWorksheetProgressRecord).mock.calls.length;
      const replay = await completeWorksheet(session);
      expect(replay.replayed).toBe(true);
      expect(vi.mocked(dataStore.saveWorksheetProgressRecord)).toHaveBeenCalledTimes(writes);
    });

    it('rejects changed facts under the same session identity', async () => {
      const session = makeSession();
      await completeWorksheet(session);
      await expect(
        completeWorksheet({
          ...session,
          answers: session.answers.map((_, index) => (index < 14 ? 0 : 1)),
          score: 70,
          starsEarned: 3,
        }),
      ).rejects.toThrow(/conflicts/i);
    });

    it('rejects a supplied legacy subject mismatch', async () => {
      settingsStore.set('subject-progress', JSON.stringify({ Math: { subject: 'Science' } }));
      await expect(loadProgress()).rejects.toThrow(/legacy/i);
    });

    it('uses canonical state rather than falling back to a legacy record', async () => {
      await completeWorksheet(makeSession());
      settingsStore.set('subject-progress', JSON.stringify({ Math: { subject: 'Science' } }));
      await expect(loadProgress()).resolves.toMatchObject({
        Math: { totalWorksheetsCompleted: 1 },
      });
    });
  });

  // ── daily worksheet challenge ─────────────────────────────────
  describe('daily worksheet challenge', () => {
    const firstDay = new Date(2026, 7, 23, 12, 0, 0).getTime();
    const secondDay = new Date(2026, 7, 24, 12, 0, 0).getTime();

    it('counts only timestamped worksheet completions from the current local day', async () => {
      await recordWorksheetCompletion('Math', makeSession({ completedAt: firstDay - 86_400_000 }));
      await recordWorksheetCompletion(
        'Science',
        makeSession({ subject: 'Science', completedAt: firstDay }),
      );

      const status = await getDailyChallengeStatus(3, firstDay);

      expect(status.completedCount).toBe(1);
      expect(status.claimed).toBe(false);
    });

    it('does not reinterpret legacy lifetime totals as current-day progress', async () => {
      settingsStore.set(
        'subject-progress',
        JSON.stringify({
          Math: { totalWorksheetsCompleted: 99, history: [] },
        }),
      );

      const status = await getDailyChallengeStatus(3, firstDay);

      expect(status.completedCount).toBe(0);
      expect(status.claimed).toBe(false);
    });

    it('keeps a pending claim retryable until the ledger-confirmed claim is finalized', async () => {
      for (let index = 0; index < 3; index += 1) {
        await recordWorksheetCompletion(
          'Math',
          makeSession({ starsEarned: 0, completedAt: firstDay + index }),
        );
      }

      expect((await claimDailyChallenge(3, firstDay)).claimed).toBe(true);
      expect((await getDailyChallengeStatus(3, firstDay)).claimed).toBe(false);
      expect((await claimDailyChallenge(3, firstDay)).claimed).toBe(true);
      await confirmDailyChallengeClaim('2026-08-23', firstDay);
      expect((await claimDailyChallenge(3, firstDay)).claimed).toBe(false);
      expect((await getDailyChallengeStatus(3, firstDay)).claimed).toBe(true);
    });

    it('resets progress and eligibility on the next local day', async () => {
      for (let index = 0; index < 3; index += 1) {
        await recordWorksheetCompletion(
          'Math',
          makeSession({ starsEarned: 0, completedAt: firstDay + index }),
        );
      }
      await claimDailyChallenge(3, firstDay);

      const nextDay = await getDailyChallengeStatus(3, secondDay);

      expect(nextDay.completedCount).toBe(0);
      expect(nextDay.claimed).toBe(false);
    });
  });
});
