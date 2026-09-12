import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Achievement, Reward, RewardRequest } from '../../types';
import { FlameIcon } from '../../components/ui/icons/FlameIcon';
import { TrophyIcon } from '../../components/ui/icons/TrophyIcon';

// Exercise the SQLite (Android/Windows = production) branch of the reward
// methods, where the cost <-> points_required mapping bug lived.
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'android',
    isNativePlatform: () => true,
  },
}));

const run = vi.fn().mockResolvedValue(undefined);
const query = vi.fn();
const fakeDb = { run, query };
const runInTransaction = vi.fn(async (work: () => Promise<void>) => work());
const appStoreGet = vi.fn(() => null);

vi.mock('../databaseService', () => ({
  databaseService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getConnection: () => fakeDb,
    runInTransaction,
  },
}));

vi.mock('../migrationService', () => ({
  migrationService: {
    isMigrationComplete: vi.fn().mockResolvedValue(true),
    performMigration: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../utils/electronStore', () => ({
  appStore: {
    get: appStoreGet,
    getStrict: appStoreGet,
    set: () => {},
    setStrict: () => {},
    delete: () => {},
    remove: () => {},
  },
}));

const { dataStore } = await import('../dataStore');

describe('dataStore rewards (SQLite path)', () => {
  beforeEach(() => {
    run.mockClear();
    query.mockReset();
    runInTransaction.mockClear();
    run.mockResolvedValue(undefined);
    appStoreGet.mockReset();
    appStoreGet.mockReturnValue(null);
    (dataStore as unknown as { useSQLite: boolean }).useSQLite = true;
  });

  it('getRewards aliases points_required onto the canonical cost field', async () => {
    query.mockResolvedValue({
      values: [{ id: 'r1', name: 'TV time', cost: 50, description: '' }],
    });
    const rewards = await dataStore.getRewards();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('points_required as cost'));
    expect(rewards[0]).toMatchObject({ id: 'r1', cost: 50 });
  });

  it('saveRewards replaces the catalog in one transaction with ordered non-nested statements', async () => {
    const rewards: Reward[] = [
      { id: 'r1', name: 'TV time', cost: 50, description: 'watch tv' },
      { id: 'r2', name: 'Game time', cost: 75 },
    ];
    await dataStore.saveRewards(rewards);
    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]).toEqual(['DELETE FROM rewards', [], false]);
    expect(run.mock.calls[1]).toEqual([expect.stringContaining('INSERT INTO rewards'), [
      'r1',
      'TV time',
      50,
      'watch tv',
    ], false]);
    expect(run.mock.calls[2]).toEqual([expect.stringContaining('INSERT INTO rewards'), [
      'r2',
      'Game time',
      75,
      '',
    ], false]);
  });

  it('hydrates SQLite rows into valid achievements with component icons and canonical fields', async () => {
    query.mockResolvedValue({
      values: [{
        id: 'STREAK_MASTER',
        title: 'Streak Master',
        description: 'Complete tasks for 3 days.',
        icon: 'flame',
        unlocked: 1,
        progress: 2,
        progressGoal: 3,
        pointsAwarded: 25,
      }],
    });

    await expect(dataStore.getAchievements()).resolves.toEqual([{
      id: 'STREAK_MASTER',
      name: 'Streak Master',
      title: 'Streak Master',
      description: 'Complete tasks for 3 days.',
      icon: FlameIcon,
      unlocked: true,
      progress: 2,
      goal: 3,
      progressGoal: 3,
      pointsAwarded: 25,
    }]);
  });

  it('hydrates current appStore values and uses a known-id fallback only for legacy missing icons', async () => {
    (dataStore as unknown as { useSQLite: boolean }).useSQLite = false;
    appStoreGet.mockReturnValue([{
      id: 'FIRST_TASK',
      name: 'First Step',
      description: 'Complete your first homework task.',
      unlocked: false,
      progress: 0,
      goal: 1,
    }]);

    await expect(dataStore.getAchievements()).resolves.toEqual([expect.objectContaining({
      id: 'FIRST_TASK',
      name: 'First Step',
      title: 'First Step',
      icon: TrophyIcon,
      unlocked: false,
      goal: 1,
      progressGoal: 1,
    })]);
  });

  it('saveRewards clears an empty catalog without touching the claimed reward queue', async () => {
    await dataStore.saveRewards([]);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith('DELETE FROM rewards', [], false);
    expect(query).not.toHaveBeenCalled();
  });

  it('saveRewards rejects when its delete or insert fails so the transaction can roll back', async () => {
    run.mockRejectedValueOnce(new Error('delete failed'));
    await expect(dataStore.saveRewards([])).rejects.toThrow('delete failed');

    run.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('insert failed'));
    await expect(dataStore.saveRewards([{ id: 'r1', name: 'TV time', cost: 50 }])).rejects.toThrow('insert failed');
  });

  it('rejects a malformed catalog before deleting the existing SQLite catalog', async () => {
    await expect(dataStore.saveRewards([{ id: 'r1', name: '', cost: 50 }])).rejects.toThrow('Stored reward catalog is malformed');
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects malformed SQLite catalog rows instead of publishing them', async () => {
    query.mockResolvedValue({ values: [{ id: 'r1', name: 'TV time', cost: 0 }] });
    await expect(dataStore.getRewards()).rejects.toThrow('Stored reward catalog is malformed');
  });

  it('saveAchievements replaces the complete set in one transaction with ordered non-nested statements', async () => {
    const achievements: Achievement[] = [{
      id: 'a1',
      name: 'First task',
      title: 'First task',
      description: 'Complete one task',
      icon: TrophyIcon,
      unlocked: false,
      progress: 1,
      progressGoal: 3,
      pointsAwarded: 10,
    }];
    await dataStore.saveAchievements(achievements);
    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]).toEqual(['DELETE FROM achievements', [], false]);
    expect(run.mock.calls[1]).toEqual([expect.stringContaining('INSERT INTO achievements'), [
      'a1',
      'First task',
      'Complete one task',
      'trophy',
      0,
      1,
      3,
      10,
    ], false]);
    expect(typeof run.mock.calls[1]![1]?.[3]).toBe('string');
  });

  it('saveAchievements clears an empty set and rejects on delete or insert failure', async () => {
    await dataStore.saveAchievements([]);
    expect(run).toHaveBeenCalledWith('DELETE FROM achievements', [], false);

    run.mockRejectedValueOnce(new Error('delete failed'));
    await expect(dataStore.saveAchievements([])).rejects.toThrow('delete failed');

    run.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('insert failed'));
    await expect(dataStore.saveAchievements([{
      id: 'a1',
      name: 'First task',
      description: 'Complete one task',
      icon: TrophyIcon,
      unlocked: false,
    }])).rejects.toThrow('insert failed');
  });

  it('rejects unsupported or malformed achievement icon state before inserting a catalog row', async () => {
    await expect(dataStore.saveAchievements([{
      id: 'FIRST_TASK',
      name: 'First task',
      description: 'Complete one task',
      icon: () => null,
      unlocked: false,
    }])).rejects.toThrow('Stored achievement icon is unsupported');

    await expect(dataStore.saveAchievements([{
      id: 'UNKNOWN',
      name: 'Unknown',
      description: 'Unknown achievement',
      icon: undefined as never,
      unlocked: false,
    }])).rejects.toThrow('Stored achievement icon is unsupported');
    expect(run.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO achievements'))).toHaveLength(0);
  });

  it('getRewardRequests reads and strictly validates the canonical request schema', async () => {
    const requests: RewardRequest[] = [{ schemaVersion: 1, requestId: 'request-1', reward: { id: 'r1', name: 'TV time', cost: 50 }, createdAt: 1, updatedAt: 1, status: 'pending_approval', debitOperationId: 'reward-debit:request-1', refundOperationId: 'reward-refund:request-1' }];
    query.mockResolvedValue({ values: [{ value: JSON.stringify(requests) }] });
    const result = await dataStore.getRewardRequests();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('key = ?'), ['rewardRequests:v1']);
    expect(result).toEqual(requests);
  });

  it('rejects malformed request JSON instead of manufacturing a queue', async () => {
    query.mockResolvedValue({ values: [{ value: '{broken' }] });
    await expect(dataStore.getRewardRequests()).rejects.toThrow();
  });

  it('rejects duplicate identifiers, noncanonical operations, and invalid timestamp order', async () => {
    const request = { schemaVersion: 1, requestId: 'request-1', reward: { id: 'r1', name: 'TV time', cost: 50 }, createdAt: 2, updatedAt: 1, status: 'pending_approval', debitOperationId: 'reward-debit:request-1', refundOperationId: 'reward-refund:request-1' };
    query.mockResolvedValue({ values: [{ value: JSON.stringify([request]) }] });
    await expect(dataStore.getRewardRequests()).rejects.toThrow('Stored reward request is malformed');

    query.mockResolvedValue({ values: [{ value: JSON.stringify([{ ...request, createdAt: 1, updatedAt: 1, debitOperationId: 'debit-1' }]) }] });
    await expect(dataStore.getRewardRequests()).rejects.toThrow('Stored reward request is malformed');

    const canonical = { ...request, createdAt: 1, updatedAt: 1 };
    query.mockResolvedValue({ values: [{ value: JSON.stringify([canonical, { ...canonical }]) }] });
    await expect(dataStore.getRewardRequests()).rejects.toThrow('Stored reward request is malformed');
  });

  it('rejects whitespace-padded canonical identifiers and malformed legacy queue state', async () => {
    const padded = { schemaVersion: 1, requestId: ' request-1 ', reward: { id: 'r1', name: 'TV time', cost: 50 }, createdAt: 1, updatedAt: 1, status: 'pending_approval', debitOperationId: 'reward-debit: request-1 ', refundOperationId: 'reward-refund: request-1 ' };
    query.mockResolvedValue({ values: [{ value: JSON.stringify([padded]) }] });
    await expect(dataStore.getRewardRequests()).rejects.toThrow('Stored reward request is malformed');

    query.mockResolvedValueOnce({ values: [] }).mockResolvedValueOnce({ values: [{ value: JSON.stringify({ legacy: true }) }] });
    await expect(dataStore.getRewardRequests()).rejects.toThrow('Legacy reward claims require parent review');
  });

  it('saveRewardRequests persists the canonical queue as JSON in user_settings', async () => {
    const requests: RewardRequest[] = [{ schemaVersion: 1, requestId: 'request-1', reward: { id: 'r1', name: 'TV time', cost: 50 }, createdAt: 1, updatedAt: 1, status: 'pending_approval', debitOperationId: 'reward-debit:request-1', refundOperationId: 'reward-refund:request-1' }];
    await dataStore.saveRewardRequests(requests);
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO user_settings'),
      ['rewardRequests:v1', JSON.stringify(requests)],
    );
  });
});
