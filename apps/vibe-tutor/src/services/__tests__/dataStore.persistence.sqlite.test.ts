import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeworkItem } from '../../types';

// Exercise the SQLite (Android/Windows = production) branch for homework saves
// (transactional) and focus-session round-trip mapping.
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'android',
    isNativePlatform: () => true,
  },
}));

const query = vi.fn();
const fakeDb = { run: vi.fn().mockResolvedValue(undefined), query };
const runInTransaction = vi.fn(async (work: () => Promise<void>) => {
  await work();
});
const saveHomeworkItem = vi.fn().mockResolvedValue(undefined);

vi.mock('../databaseService', () => ({
  databaseService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getConnection: () => fakeDb,
    runInTransaction,
    saveHomeworkItem,
    recordLearningSession: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../migrationService', () => ({
  migrationService: {
    isMigrationComplete: vi.fn().mockResolvedValue(true),
    performMigration: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../utils/electronStore', () => ({
  appStore: { get: () => null, set: () => {}, delete: () => {}, remove: () => {} },
}));

const { dataStore } = await import('../dataStore');

describe('dataStore persistence (SQLite path)', () => {
  beforeEach(() => {
    query.mockReset();
    runInTransaction.mockClear();
    saveHomeworkItem.mockClear();
  });

  it('saveHomeworkItems writes every item inside a single transaction (SVC-05)', async () => {
    const items = [
      { id: 'h1', subject: 'Math', title: 'A', dueDate: '2026-07-01', completed: false },
      { id: 'h2', subject: 'Science', title: 'B', dueDate: '2026-07-02', completed: true },
    ] as HomeworkItem[];

    await dataStore.saveHomeworkItems(items);

    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(saveHomeworkItem).toHaveBeenCalledTimes(2);
  });

  it('getFocusSessions maps rows into complete FocusSession objects (SVC-03)', async () => {
    query.mockResolvedValue({
      values: [{ id: 5, duration_minutes: 25, focus_score: 80, session_date: '2026-06-30T10:00:00Z' }],
    });

    const sessions = await dataStore.getFocusSessions();

    expect(query).toHaveBeenCalledWith(expect.stringContaining("session_type = 'focus'"));
    expect(sessions).toHaveLength(1);
    const s = sessions[0]!;
    expect(s.id).toBe('5');
    expect(s.duration).toBe(25);
    expect(s.points).toBe(80);
    expect(s.completed).toBe(true);
    expect(typeof s.startTime).toBe('number');
    expect(s.endTime).toBe(s.startTime + 25 * 60_000);
  });
});
