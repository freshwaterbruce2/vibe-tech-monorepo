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
    set: vi.fn(),
    remove: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('../../utils/electronStore', () => storeMock);

import { LearningAnalyticsService } from '../learningAnalytics';

const db = dbMock.databaseService;
const store = storeMock.appStore;

beforeEach(() => {
  vi.clearAllMocks();
  db.getConnection.mockReturnValue(null);
  db.recordLearningSession.mockResolvedValue(undefined);
  store.get.mockReturnValue(null);
});

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

describe('learningAnalytics — analytics key cap (SVC-09 / 2A)', () => {
  it('evicts the oldest analytics keys once the cap is exceeded', async () => {
    const existing = Array.from({ length: 100 }, (_, i) => `id-${i}`);
    store.get.mockImplementation((key: string) =>
      key === 'analytics_index' ? [...existing] : null,
    );

    const svc = new LearningAnalyticsService();
    svc.startSession('math-practice', 'math', 'easy');
    await svc.endSession(1);

    // Oldest key evicted, and the persisted index is trimmed back to the cap.
    expect(store.remove).toHaveBeenCalledWith('analytics_id-0');
    const indexWrites = store.set.mock.calls.filter(([k]) => k === 'analytics_index');
    const lastIndex = indexWrites[indexWrites.length - 1]?.[1] as string[];
    expect(lastIndex).toHaveLength(100);
    expect(lastIndex).not.toContain('id-0');
  });

  it('does not evict while under the cap', async () => {
    store.get.mockImplementation((key: string) =>
      key === 'analytics_index' ? ['only-one'] : null,
    );

    const svc = new LearningAnalyticsService();
    svc.startSession('reading', 'english', 'medium');
    await svc.endSession(0.5);

    expect(store.remove).not.toHaveBeenCalled();
  });
});
