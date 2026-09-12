import { beforeEach, describe, expect, it, vi } from 'vitest';

/* ---------- Hoisted mocks (before importing the module under test) ---------- */
const dbMock = vi.hoisted(() => ({
  databaseService: {
    getConnection: vi.fn(),
    recordLearningSession: vi.fn(),
    getUserProgress: vi.fn(),
  },
}));
vi.mock('../databaseService', () => dbMock);

const storeMock = vi.hoisted(() => ({
  appStore: {
    get: vi.fn(),
    getStrict: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('../../utils/electronStore', () => storeMock);

const settingsMock = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    dataStore: {
      getUserSettings: vi.fn(async (key: string) => values.get(key) ?? ''),
      saveUserSettings: vi.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
    },
  };
});
vi.mock('../dataStore', () => ({ dataStore: settingsMock.dataStore }));

import { LearningAnalyticsService } from '../learningAnalytics';

const db = dbMock.databaseService;
const store = storeMock.appStore;
const settings = settingsMock.values;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.getConnection.mockReturnValue(null);
  db.recordLearningSession.mockResolvedValue(1);
  store.getStrict.mockReturnValue(null);
  settings.clear();
});

const validStoredSession = {
  sessionId: 'session',
  timestamp: '2026-08-23T12:00:00.000Z',
  activity: 'math-practice',
  subject: 'Math',
  duration: 20,
  performance: { correct: 8, incorrect: 2, accuracy: 80 },
  focusLevel: 75,
  difficulty: 'medium' as const,
  completionRate: 0.8,
};

describe('learningAnalytics — loadAnalyticsData mapping (SVC-06)', () => {
  it('maps a raw learning_sessions row into a valid LearningMetrics', async () => {
    db.getConnection.mockReturnValue({
      query: vi.fn().mockResolvedValue({
        values: [
          {
            id: 7,
            session_type: 'focus',
            duration_minutes: 25,
            focus_score: 80,
            tasks_completed: 6,
            session_date: '2026-06-30T10:00:00Z',
          },
        ],
      }),
    });

    const svc = new LearningAnalyticsService();
    await svc.initialize();

    // With the old blind cast, `activity`/`subject` were undefined and
    // analyzeLearningPatterns crashed on `activity.includes(...)`. The mapper
    // gives every field a real value, so this resolves and surfaces the session.
    const pattern = await svc.analyzeLearningPatterns();
    expect(pattern.strongSubjects.concat(pattern.weakSubjects)).toContain('focus');
  });

  it('skips rows without a usable id', async () => {
    db.getConnection.mockReturnValue({
      query: vi.fn().mockResolvedValue({ values: [{ session_type: 'focus' }] }),
    });

    const svc = new LearningAnalyticsService();
    await svc.initialize();

    const pattern = await svc.analyzeLearningPatterns();
    expect(pattern.strongSubjects).toEqual([]);
    expect(pattern.weakSubjects).toEqual([]);
  });
});

describe('learningAnalytics — legacy stored-key compatibility', () => {
  it('reads legacy per-session app-local entries without retaining their fake file path', async () => {
    store.getStrict.mockImplementation((key: string) => {
      if (key === 'analytics_index') return ['legacy-session'];
      if (key === 'analytics_legacy-session') {
        return {
          sessionId: 'legacy-session',
          timestamp: '2026-08-22T10:00:00.000Z',
          activity: 'reading',
          subject: 'Language Arts',
          duration: 20,
          performance: { correct: 8, incorrect: 2, accuracy: 80 },
          focusLevel: 75,
          difficulty: 'medium',
          completionRate: 0.8,
          path: 'legacy-only',
        };
      }
      return null;
    });

    const svc = new LearningAnalyticsService();
    await svc.initialize();
    const exported = await svc.exportLocalAnalytics();

    expect(exported.sessions).toHaveLength(1);
    expect(exported.sessions[0]).toMatchObject({ sessionId: 'legacy-session', subject: 'Language Arts' });
    expect(exported.sessions[0]).not.toHaveProperty('path');
    expect(settings.get('learning-analytics-v1')).toBeTruthy();
  });

  it('fails initialization honestly when the legacy index is malformed', async () => {
    store.getStrict.mockImplementation((key: string) => (key === 'analytics_index' ? 'not-an-index' : null));

    await expect(new LearningAnalyticsService().initialize()).resolves.toBe(false);
  });

  it('fails initialization honestly when a referenced legacy session is missing or malformed', async () => {
    store.getStrict.mockImplementation((key: string) => (key === 'analytics_index' ? ['missing-session'] : null));

    await expect(new LearningAnalyticsService().initialize()).resolves.toBe(false);
  });

  it('treats a legacy storage read failure as an initialization failure, not missing data', async () => {
    store.getStrict.mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    await expect(new LearningAnalyticsService().initialize()).resolves.toBe(false);
  });

  it('treats a referenced legacy session read failure as an initialization failure', async () => {
    store.getStrict.mockImplementation((key: string) => {
      if (key === 'analytics_index') return ['legacy-session'];
      throw new Error('storage unavailable');
    });

    await expect(new LearningAnalyticsService().initialize()).resolves.toBe(false);
  });

  it('fails initialization when a present legacy session has a non-finite metric', async () => {
    store.getStrict.mockImplementation((key: string) => {
      if (key === 'analytics_index') return ['legacy-session'];
      if (key === 'analytics_legacy-session') {
        return { ...validStoredSession, sessionId: 'legacy-session', duration: Number.POSITIVE_INFINITY };
      }
      return null;
    });

    await expect(new LearningAnalyticsService().initialize()).resolves.toBe(false);
  });
});

describe('learningAnalytics — local persistence contract', () => {
  it('persists a completed session locally and reloads it in a new service instance', async () => {
    const first = new LearningAnalyticsService();
    first.startSession('math-practice', 'Math', 'easy');

    await expect(first.endSession(0.7)).resolves.toBe(true);
    expect(settings.get('learning-analytics-v1')).toBeTruthy();

    const reloaded = new LearningAnalyticsService();
    await expect(reloaded.initialize()).resolves.toBe(true);
    const exported = await reloaded.exportLocalAnalytics();

    expect(exported.format).toBe('vibe-tutor-learning-analytics-v1');
    expect(exported.sessions).toHaveLength(1);
    expect(exported.sessions[0]).toMatchObject({ activity: 'math-practice', subject: 'Math' });
  });

  it('uses the inserted SQLite row id so canonical and database reloads deduplicate', async () => {
    db.recordLearningSession.mockResolvedValueOnce(42);
    const first = new LearningAnalyticsService();
    first.startSession('math-practice', 'Math', 'easy');
    await expect(first.endSession(0.7)).resolves.toBe(true);

    db.getConnection.mockReturnValue({
      query: vi.fn().mockResolvedValue({
        values: [
          {
            id: 42,
            session_type: 'math-practice',
            duration_minutes: 0,
            focus_score: 10,
            tasks_completed: 7,
            session_date: '2026-08-23T12:00:00.000Z',
          },
        ],
      }),
    });
    const reloaded = new LearningAnalyticsService();
    await expect(reloaded.initialize()).resolves.toBe(true);

    const exported = await reloaded.exportLocalAnalytics();
    expect(exported.sessions).toHaveLength(1);
    expect(exported.sessions[0]).toMatchObject({ sessionId: '42', activity: 'math-practice' });
  });

  it('does not persist analytics when the app-local privacy setting is disabled', async () => {
    settings.set('learning-analytics-enabled', 'false');
    const svc = new LearningAnalyticsService();

    await expect(svc.initialize()).resolves.toBe(true);
    expect(svc.startSession('reading', 'Language Arts', 'medium')).toBe(false);
    await expect(svc.logEvent('ai_call', { prompt: 'private text' })).resolves.toBe(false);
    expect(settings.get('learning-analytics-v1')).toBeUndefined();
  });

  it('reports local persistence failure instead of claiming an export was written', async () => {
    const svc = new LearningAnalyticsService();
    svc.startSession('science-practice', 'Science', 'hard');
    await expect(svc.logEvent('flush_pending_start')).resolves.toBe(true);

    vi.mocked(settingsMock.dataStore.saveUserSettings).mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(svc.endSession(1)).resolves.toBe(false);
    expect((await svc.exportLocalAnalytics()).sessions).toEqual([]);
  });

  it('does not claim persistence succeeded when storage cannot read back the written payload', async () => {
    vi.mocked(settingsMock.dataStore.saveUserSettings).mockImplementationOnce(async () => undefined);

    await expect(new LearningAnalyticsService().logEvent('activity', { activity: 'math' })).resolves.toBe(false);
    expect(settings.get('learning-analytics-v1')).toBeUndefined();
  });

  it('does not let an older pending end erase a newer session', async () => {
    const pendingRecord = deferred<number>();
    db.recordLearningSession.mockImplementationOnce(async () => pendingRecord.promise);
    const svc = new LearningAnalyticsService();
    expect(svc.startSession('first', 'Math', 'easy')).toBe(true);

    const endingFirst = svc.endSession(0.5);
    expect(svc.startSession('second', 'Science', 'hard')).toBe(true);
    const secondSessionId = svc.getCurrentSessionId();

    pendingRecord.resolve(1);
    await expect(endingFirst).resolves.toBe(true);
    expect(svc.getCurrentSessionId()).toBe(secondSessionId);
  });

  it('claims an ending session before I/O so duplicate ends cannot record it twice', async () => {
    const pendingRecord = deferred<number>();
    db.recordLearningSession.mockImplementationOnce(async () => pendingRecord.promise);
    const svc = new LearningAnalyticsService();
    svc.startSession('reading', 'Language Arts', 'medium');

    const firstEnd = svc.endSession(0.5);
    await expect(svc.endSession(0.5)).resolves.toBe(false);
    expect(db.recordLearningSession).toHaveBeenCalledTimes(1);

    pendingRecord.resolve(1);
    await expect(firstEnd).resolves.toBe(true);
    expect(db.recordLearningSession).toHaveBeenCalledTimes(1);
  });

  it.each([-0.1, 1.01, Number.POSITIVE_INFINITY])(
    'rejects an out-of-range completion rate before recording or persisting: %s',
    async (completionRate) => {
      const svc = new LearningAnalyticsService();
      svc.startSession('science-practice', 'Science', 'hard');

      await expect(svc.endSession(completionRate)).resolves.toBe(false);
      expect(db.recordLearningSession).not.toHaveBeenCalled();
      expect(svc.getCurrentSessionId()).not.toBeNull();
    },
  );

  it('fails initialization honestly for malformed persisted analytics', async () => {
    settings.set('learning-analytics-v1', JSON.stringify({ version: 1, sessions: [], events: [{ event: 'x' }] }));

    await expect(new LearningAnalyticsService().initialize()).resolves.toBe(false);
  });

  it.each([
    ['a non-plain performance record', { performance: [] }],
    ['an invalid difficulty', { difficulty: 'expert' }],
    ['a negative duration', { duration: -1 }],
    ['a non-finite correct count', { performance: { correct: Number.POSITIVE_INFINITY, incorrect: 2, accuracy: 80 } }],
    ['an out-of-range accuracy', { performance: { correct: 8, incorrect: 2, accuracy: 101 } }],
    ['an out-of-range focus level', { focusLevel: -1 }],
    ['an out-of-range completion rate', { completionRate: 1.01 }],
    ['a blank activity', { activity: '   ' }],
    ['an overlong subject', { subject: 's'.repeat(121) }],
    ['an invalid timestamp', { timestamp: 'not-a-date' }],
  ])('fails closed on persisted analytics with %s', async (_label, invalidFields) => {
    settings.set(
      'learning-analytics-v1',
      JSON.stringify({ version: 1, sessions: [{ ...validStoredSession, ...invalidFields }], events: [] }),
    );

    await expect(new LearningAnalyticsService().initialize()).resolves.toBe(false);
  });

  it('accepts finite session metrics at their valid boundaries', async () => {
    settings.set(
      'learning-analytics-v1',
      JSON.stringify({
        version: 1,
        sessions: [
          {
            ...validStoredSession,
            duration: 0,
            performance: { correct: 0, incorrect: 0, accuracy: 100 },
            focusLevel: 100,
            completionRate: 1,
          },
        ],
        events: [],
      }),
    );

    const service = new LearningAnalyticsService();
    await expect(service.initialize()).resolves.toBe(true);
    await expect(service.exportLocalAnalytics()).resolves.toMatchObject({
      sessions: [
        {
          duration: 0,
          performance: { correct: 0, incorrect: 0, accuracy: 100 },
          focusLevel: 100,
          completionRate: 1,
        },
      ],
    });
  });

  it('fails initialization honestly when the analytics database read fails', async () => {
    db.getConnection.mockReturnValue({ query: vi.fn().mockRejectedValue(new Error('database unavailable')) });

    await expect(new LearningAnalyticsService().initialize()).resolves.toBe(false);
  });
});

describe('learningAnalytics — privacy and bounded event data', () => {
  it('keeps only finite allowlisted metadata and never stores prompt or content text', async () => {
    const svc = new LearningAnalyticsService();

    await expect(
      svc.logEvent('ai_call', {
        model: 'safe-model',
        promptLength: 12,
        responseLength: Number.POSITIVE_INFINITY,
        prompt: 'private prompt text',
        content: 'private response text',
        accountEmail: 'student@example.com',
      }),
    ).resolves.toBe(true);

    const exported = await svc.exportLocalAnalytics();
    expect(exported).toEqual({
      format: 'vibe-tutor-learning-analytics-v1',
      sessions: [],
      events: [
        {
          event: 'ai_call',
          timestamp: expect.any(String),
          data: { model: 'safe-model', promptLength: 12 },
        },
      ],
    });
    expect(JSON.stringify(exported)).not.toContain('private prompt text');
    expect(JSON.stringify(exported)).not.toContain('private response text');
    expect(exported).not.toHaveProperty('path');
    expect(exported).not.toHaveProperty('file');
  });

  it('caps events and serializes overlapping local writes without losing the newest state', async () => {
    const svc = new LearningAnalyticsService();
    await Promise.all(
      Array.from({ length: 101 }, async (_, index) => svc.logEvent('activity', { activity: `lesson-${index}` })),
    );

    const exported = await svc.exportLocalAnalytics();
    expect(exported.events).toHaveLength(100);
    expect(exported.events[0]?.data.activity).toBe('lesson-1');
    expect(exported.events.at(-1)?.data.activity).toBe('lesson-100');

    const persisted = JSON.parse(settings.get('learning-analytics-v1') ?? '{}');
    expect(persisted.events).toHaveLength(100);
    expect(persisted.events.at(-1).data.activity).toBe('lesson-100');
  });

  it('rejects a current payload containing disallowed event fields', async () => {
    settings.set(
      'learning-analytics-v1',
      JSON.stringify({
        version: 1,
        sessions: [],
        events: [
          {
            event: 'ai_call',
            timestamp: '2026-08-23T12:00:00.000Z',
            data: { prompt: 'retained text' },
          },
        ],
      }),
    );

    await expect(new LearningAnalyticsService().initialize()).resolves.toBe(false);
  });

  it('fails closed on oversized canonical session or event arrays', async () => {
    settings.set(
      'learning-analytics-v1',
      JSON.stringify({
        version: 1,
        sessions: Array.from({ length: 101 }, (_, index) => ({ ...validStoredSession, sessionId: `s-${index}` })),
        events: [],
      }),
    );
    await expect(new LearningAnalyticsService().initialize()).resolves.toBe(false);

    settings.set(
      'learning-analytics-v1',
      JSON.stringify({
        version: 1,
        sessions: [],
        events: Array.from({ length: 101 }, () => ({
          event: 'activity',
          timestamp: '2026-08-23T12:00:00.000Z',
          data: { activity: 'math' },
        })),
      }),
    );
    await expect(new LearningAnalyticsService().initialize()).resolves.toBe(false);
  });
});
