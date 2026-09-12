import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
  getAchievementLifecycleRecord: vi.fn(),
  saveAchievementLifecycleRecord: vi.fn(),
  getLegacyAchievementLifecycleSources: vi.fn(),
}));
vi.mock('../dataStore', () => ({ dataStore: store }));
vi.mock('../../components/ui/icons/FlameIcon', () => ({ FlameIcon: () => null }));
vi.mock('../../components/ui/icons/TrophyIcon', () => ({ TrophyIcon: () => null }));
let service: typeof import('../achievementService');
const legacy = {
  achievements: [],
  homeworkStats: '',
  focusStats: '',
  gameStats: '',
  homeworkItems: [],
  focusSessions: [],
};
const task = (id: string, day = '2026-08-24') => ({
  type: 'TASK_COMPLETED' as const,
  eventId: `homework-completed:${id}`,
  payload: { completionDay: day },
});

describe('achievement lifecycle', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    store.getAchievementLifecycleRecord.mockResolvedValue(null);
    store.saveAchievementLifecycleRecord.mockResolvedValue(undefined);
    store.getLegacyAchievementLifecycleSources.mockResolvedValue(legacy);
    service = await import('../achievementService');
  });
  it('does no storage I/O merely by importing the module', () =>
    expect(store.getAchievementLifecycleRecord).not.toHaveBeenCalled());
  it('writes migration before exposing the canonical state', async () => {
    await service.initializeAchievements();
    expect(store.saveAchievementLifecycleRecord).toHaveBeenCalledTimes(1);
    expect((await service.getAchievements()).length).toBe(14);
  });
  it('deduplicates stable event ids and rejects conflicting payloads', async () => {
    await service.initializeAchievements();
    await service.checkAndUnlockAchievements(task('one'));
    await service.checkAndUnlockAchievements(task('one'));
    expect((await service.getAchievementStatsSnapshot()).tasks).toBe(1);
    await expect(service.checkAndUnlockAchievements(task('one', '2026-08-23'))).rejects.toThrow(
      'conflicts',
    );
  });
  it('rejects noncanonical IDs, impossible dates, and noncanonical game contributions', async () => {
    await service.initializeAchievements();
    await expect(
      service.checkAndUnlockAchievements({
        type: 'TASK_COMPLETED',
        eventId: 'homework-completed: padded ',
        payload: { completionDay: '2026-02-30' },
      } as never),
    ).rejects.toThrow('malformed');
    await expect(
      service.checkAndUnlockAchievements({
        type: 'GAME_COMPLETED',
        eventId: 'game-completed:other:session',
        payload: { achievementKey: 'ordinary', score: 2 },
      } as never),
    ).rejects.toThrow('malformed');
    await expect(
      service.checkAndUnlockAchievements({
        type: 'SHOP_PURCHASE',
        eventId: 'shop-purchase:avatar-purchase:not-a-uuid',
      } as never),
    ).rejects.toThrow('malformed');
  });
  it('serializes concurrent distinct events', async () => {
    await service.initializeAchievements();
    await Promise.all([
      service.checkAndUnlockAchievements(task('one')),
      service.checkAndUnlockAchievements(task('two')),
    ]);
    expect((await service.getAchievementStatsSnapshot()).tasks).toBe(2);
  });
  it('does not publish an event when canonical persistence fails', async () => {
    await service.initializeAchievements();
    store.saveAchievementLifecycleRecord.mockRejectedValueOnce(new Error('write failed'));
    await expect(service.checkAndUnlockAchievements(task('fail'))).rejects.toThrow('write failed');
    expect((await service.getAchievementStatsSnapshot()).tasks).toBe(0);
  });
  it('keeps a qualified candidate locked until its award is confirmed', async () => {
    await service.initializeAchievements();
    const result = await service.checkAndUnlockAchievements(task('one'));
    expect(result.newlyQualified[0]?.id).toBe('FIRST_TASK');
    expect((await service.getAchievements()).find((x) => x.id === 'FIRST_TASK')?.unlocked).toBe(
      false,
    );
    expect(result.pendingAwards[0]).toEqual({
      achievementId: 'FIRST_TASK',
      operationId: 'achievement:unlock:FIRST_TASK',
      amount: 25,
    });
  });
  it('retains a pending candidate after confirmation write failure and supports exact idempotence', async () => {
    await service.initializeAchievements();
    await service.checkAndUnlockAchievements(task('one'));
    store.saveAchievementLifecycleRecord.mockRejectedValueOnce(new Error('write failed'));
    await expect(
      service.confirmAchievementAward('FIRST_TASK', 'achievement:unlock:FIRST_TASK'),
    ).rejects.toThrow('write failed');
    expect(await service.getPendingAchievementAwards()).toHaveLength(1);
    await service.confirmAchievementAward('FIRST_TASK', 'achievement:unlock:FIRST_TASK');
    await service.confirmAchievementAward('FIRST_TASK', 'achievement:unlock:FIRST_TASK');
    expect((await service.getAchievements()).find((x) => x.id === 'FIRST_TASK')?.unlocked).toBe(
      true,
    );
  });
  it('derives daily streak progress from unique canonical days', async () => {
    await service.initializeAchievements();
    await service.checkAndUnlockAchievements(task('a', '2026-08-22'));
    await service.checkAndUnlockAchievements(task('b', '2026-08-23'));
    await service.checkAndUnlockAchievements(task('c', '2026-08-24'));
    expect((await service.getAchievements()).find((x) => x.id === 'STREAK_MASTER')?.progress).toBe(
      3,
    );
  });
  it('uses a maximum retained streak and never lets worksheets create a streak day', async () => {
    await service.initializeAchievements();
    await service.checkAndUnlockAchievements(task('a', '2026-08-20'));
    await service.checkAndUnlockAchievements(task('b', '2026-08-21'));
    await service.checkAndUnlockAchievements(task('c', '2026-08-22'));
    await service.checkAndUnlockAchievements(task('later', '2026-08-24'));
    const before = await service.getAchievementStatsSnapshot();
    await service.checkAndUnlockAchievements({
      type: 'WORKSHEET_COMPLETED',
      eventId: 'worksheet-completed:worksheet-one',
    });
    const stats = await service.getAchievementStatsSnapshot();
    expect(stats.taskBestStreak).toBe(3);
    expect(stats.taskDays).toEqual(before.taskDays);
  });
  it('fails closed on malformed canonical storage', async () => {
    store.getAchievementLifecycleRecord.mockResolvedValue('{"version":1}');
    await expect(service.initializeAchievements()).rejects.toThrow('malformed');
  });
  it('rejects forged derived progress and forged best-streak evidence', async () => {
    await service.initializeAchievements();
    await service.checkAndUnlockAchievements(task('one'));
    const forged = JSON.parse(
      vi.mocked(store.saveAchievementLifecycleRecord).mock.calls.at(-1)?.[0] as string,
    );
    forged.states.FIVE_TASKS.progress = 5;
    vi.resetModules();
    store.getAchievementLifecycleRecord.mockResolvedValue(JSON.stringify(forged));
    service = await import('../achievementService');
    await expect(service.initializeAchievements()).rejects.toThrow('progress');
    forged.states.FIVE_TASKS.progress = 0;
    forged.stats.taskBestStreak = 3;
    vi.resetModules();
    store.getAchievementLifecycleRecord.mockResolvedValue(JSON.stringify(forged));
    service = await import('../achievementService');
    await expect(service.initializeAchievements()).rejects.toThrow('statistics');
  });
  it('rejects initialization reads, stays unpublished, and retries', async () => {
    store.getAchievementLifecycleRecord
      .mockRejectedValueOnce(new Error('read failed'))
      .mockResolvedValueOnce(null);
    await expect(service.initializeAchievements()).rejects.toThrow('read failed');
    await expect(service.getAchievements()).rejects.toThrow('not initialized');
    await expect(service.initializeAchievements()).resolves.toBeUndefined();
  });
  it('rejects malformed legacy input before it writes or publishes', async () => {
    store.getLegacyAchievementLifecycleSources.mockResolvedValue({
      ...legacy,
      homeworkStats: '{"completedTasks":-1}',
    });
    await expect(service.initializeAchievements()).rejects.toThrow('malformed');
    expect(store.saveAchievementLifecycleRecord).not.toHaveBeenCalled();
  });
  it('creates distinct candidates for every newly qualified locked achievement', async () => {
    store.getLegacyAchievementLifecycleSources.mockResolvedValue({
      ...legacy,
      homeworkStats: '{"completedTasks":10}',
    });
    await service.initializeAchievements();
    expect((await service.getPendingAchievementAwards()).map((x) => x.achievementId)).toEqual([
      'FIRST_TASK',
      'FIVE_TASKS',
      'TEN_TASKS',
    ]);
  });
  it('caps valid long-lived legacy values and preserves unlocked achievement progress', async () => {
    store.getLegacyAchievementLifecycleSources.mockResolvedValue({
      ...legacy,
      achievements: [{ id: 'FIRST_TASK', unlocked: true, progress: 1 }],
      homeworkStats: '{"completedTasks":99}',
      focusStats: '{"completedSessions":50,"totalMinutes":900}',
      gameStats:
        '{"gamesPlayed":22,"scores":{"mathAdventure":900,"wordBuilder":77},"counts":{"patternQuest":40}}',
    });
    await service.initializeAchievements();
    expect(await service.getAchievementStatsSnapshot()).toMatchObject({
      tasks: 10,
      focusSessions: 10,
      focusMinutes: 100,
      games: 1,
      mathScore: 500,
      wordScore: 50,
      patternCount: 30,
    });
    expect((await service.getAchievements()).find((x) => x.id === 'FIRST_TASK')).toMatchObject({
      unlocked: true,
      progress: 1,
    });
    expect(
      (await service.getPendingAchievementAwards()).some((x) => x.achievementId === 'FIRST_TASK'),
    ).toBe(false);
  });
  it('accepts bounded real Brain Gym legacy game keys but rejects malformed unrelated values', async () => {
    store.getLegacyAchievementLifecycleSources.mockResolvedValue({
      ...legacy,
      gameStats:
        '{"scores":{"anagrams":1,"bossBattle":2,"crossword":3,"mathAdventure":12,"memoryMatch":4,"musicNotes":5,"patternQuest":6,"sudoku":7,"wordBuilder":8,"wordSearch":9},"counts":{"anagrams":3,"bossBattle":2,"crossword":1,"mathAdventure":4,"memoryMatch":5,"musicNotes":6,"patternQuest":2,"sudoku":7,"wordBuilder":8,"wordSearch":9}}',
    });
    await service.initializeAchievements();
    expect(await service.getAchievementStatsSnapshot()).toMatchObject({
      mathScore: 12,
      patternCount: 2,
    });
    vi.resetModules();
    vi.clearAllMocks();
    store.getAchievementLifecycleRecord.mockResolvedValue(null);
    store.saveAchievementLifecycleRecord.mockResolvedValue(undefined);
    store.getLegacyAchievementLifecycleSources.mockResolvedValue({
      ...legacy,
      gameStats: '{"scores":{"crossword":"bad"}}',
    });
    service = await import('../achievementService');
    await expect(service.initializeAchievements()).rejects.toThrow('Game scores');
  });
  it('does not mint BIG_SPENDER from locked legacy progress, but preserves an unlocked legacy record', async () => {
    store.getLegacyAchievementLifecycleSources.mockResolvedValue({
      ...legacy,
      achievements: [{ id: 'BIG_SPENDER', unlocked: false, progress: 1 }],
    });
    await service.initializeAchievements();
    expect((await service.getAchievementStatsSnapshot()).purchases).toBe(0);
    expect(
      (await service.getPendingAchievementAwards()).some((x) => x.achievementId === 'BIG_SPENDER'),
    ).toBe(false);
    vi.resetModules();
    vi.clearAllMocks();
    store.getAchievementLifecycleRecord.mockResolvedValue(null);
    store.saveAchievementLifecycleRecord.mockResolvedValue(undefined);
    store.getLegacyAchievementLifecycleSources.mockResolvedValue({
      ...legacy,
      achievements: [{ id: 'BIG_SPENDER', unlocked: true, progress: 1 }],
    });
    service = await import('../achievementService');
    await service.initializeAchievements();
    expect((await service.getAchievements()).find((x) => x.id === 'BIG_SPENDER')).toMatchObject({
      unlocked: true,
      progress: 1,
    });
  });
  it('counts a Pattern Quest event once and rejects a high-score quest payload', async () => {
    await service.initializeAchievements();
    await expect(
      service.checkAndUnlockAchievements({
        type: 'GAME_COMPLETED',
        eventId: 'game-completed:realm:pattern-one',
        payload: { achievementKey: 'patternQuest', score: 99 },
      } as never),
    ).rejects.toThrow('Game score');
    await service.checkAndUnlockAchievements({
      type: 'GAME_COMPLETED',
      eventId: 'game-completed:realm:pattern-one',
      payload: { achievementKey: 'patternQuest', score: 1 },
    });
    expect((await service.getAchievementStatsSnapshot()).patternCount).toBe(1);
  });
  it('restores pending awards from canonical storage after a restart', async () => {
    await service.initializeAchievements();
    await service.checkAndUnlockAchievements(task('one'));
    const saved = vi.mocked(store.saveAchievementLifecycleRecord).mock.calls.at(-1)?.[0] as string;
    vi.resetModules();
    store.getAchievementLifecycleRecord.mockResolvedValue(saved);
    service = await import('../achievementService');
    await service.initializeAchievements();
    expect(await service.getPendingAchievementAwards()).toEqual([
      { achievementId: 'FIRST_TASK', operationId: 'achievement:unlock:FIRST_TASK', amount: 25 },
    ]);
  });
  it('rejects stored processed events with a mismatched prefix or malformed fingerprint', async () => {
    await service.initializeAchievements();
    await service.checkAndUnlockAchievements(task('one'));
    const saved = JSON.parse(
      vi.mocked(store.saveAchievementLifecycleRecord).mock.calls.at(-1)?.[0] as string,
    );
    saved.processedEvents[0].eventId = 'shop-purchase:not-a-task';
    vi.resetModules();
    store.getAchievementLifecycleRecord.mockResolvedValue(JSON.stringify(saved));
    service = await import('../achievementService');
    await expect(service.initializeAchievements()).rejects.toThrow('Processed event');
  });
  it('prunes 512 confirmed unrelated records before admitting an active category', async () => {
    const states = Object.fromEntries(
      [
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
      ].map((id) => [
        id,
        { unlocked: id === 'BIG_SPENDER', progress: id === 'BIG_SPENDER' ? 1 : 0 },
      ]),
    );
    const canonical = {
      version: 1,
      states,
      stats: {
        tasks: 0,
        focusSessions: 0,
        focusMinutes: 0,
        games: 0,
        purchases: 1,
        mathScore: 0,
        wordScore: 0,
        patternCount: 0,
        taskDays: [],
        focusDays: [],
        taskBestStreak: 0,
        focusBestStreak: 0,
      },
      processedEvents: Array.from({ length: 512 }, (_, i) => ({
        eventId: `shop-purchase:avatar-purchase:00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        fingerprint: 'shop',
      })),
      pendingAwards: [],
    };
    store.getAchievementLifecycleRecord.mockResolvedValue(JSON.stringify(canonical));
    await service.initializeAchievements();
    await expect(service.checkAndUnlockAchievements(task('active'))).resolves.toMatchObject({
      newlyQualified: [{ id: 'FIRST_TASK' }],
    });
    expect((await service.getAchievementStatsSnapshot()).tasks).toBe(1);
  });
  it('fails closed when 512 still-active records cannot be pruned', async () => {
    const states = Object.fromEntries(
      [
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
      ].map((id) => [id, { unlocked: false, progress: 0 }]),
    );
    store.getAchievementLifecycleRecord.mockResolvedValue(
      JSON.stringify({
        version: 1,
        states,
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
        processedEvents: Array.from({ length: 512 }, (_, i) => ({
          eventId: `game-completed:realm:active-${i}`,
          fingerprint: 'game:ordinary:0',
        })),
        pendingAwards: [],
      }),
    );
    await service.initializeAchievements();
    await expect(service.checkAndUnlockAchievements(task('active'))).rejects.toThrow(
      'history is full',
    );
  });
  it('keeps an exact live streak witness when a bounded day history receives another task', async () => {
    const states = Object.fromEntries(
      [
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
      ].map((id) => [id, { unlocked: false, progress: 0 }]),
    );
    (states as Record<string, { unlocked: boolean; progress: number }>).STREAK_MASTER.progress = 2;
    const taskDays = [
      '2020-01-01',
      '2020-01-02',
      ...Array.from({ length: 510 }, (_, i) => {
        const d = new Date(Date.UTC(2020, 0, 5 + i * 2));
        return d.toISOString().slice(0, 10);
      }),
    ];
    store.getAchievementLifecycleRecord.mockResolvedValue(
      JSON.stringify({
        version: 1,
        states,
        stats: {
          tasks: 0,
          focusSessions: 0,
          focusMinutes: 0,
          games: 0,
          purchases: 0,
          mathScore: 0,
          wordScore: 0,
          patternCount: 0,
          taskDays,
          focusDays: [],
          taskBestStreak: 2,
          focusBestStreak: 0,
        },
        processedEvents: [],
        pendingAwards: [],
      }),
    );
    await service.initializeAchievements();
    await service.checkAndUnlockAchievements(task('bounded', '2026-08-24'));
    const stats = await service.getAchievementStatsSnapshot();
    expect(stats.taskDays).toHaveLength(512);
    expect(stats.taskBestStreak).toBe(2);
    expect(
      (await service.getAchievements()).find((achievement) => achievement.id === 'STREAK_MASTER'),
    ).toMatchObject({ progress: 2, unlocked: false });
    expect(
      (await service.getPendingAchievementAwards()).some(
        (award) => award.achievementId === 'STREAK_MASTER',
      ),
    ).toBe(false);
  });
});
