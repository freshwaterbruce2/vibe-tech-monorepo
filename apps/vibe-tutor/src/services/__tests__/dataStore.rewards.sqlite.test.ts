import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClaimedReward, Reward } from '../../types';

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

vi.mock('../databaseService', () => ({
  databaseService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getConnection: () => fakeDb,
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
    get: () => null,
    set: () => {},
    delete: () => {},
    remove: () => {},
  },
}));

const { dataStore } = await import('../dataStore');

describe('dataStore rewards (SQLite path)', () => {
  beforeEach(() => {
    run.mockClear();
    query.mockReset();
  });

  it('getRewards aliases points_required onto the canonical cost field', async () => {
    query.mockResolvedValue({
      values: [{ id: 'r1', name: 'TV time', cost: 50, description: '' }],
    });
    const rewards = await dataStore.getRewards();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('points_required as cost'));
    expect(rewards[0]).toMatchObject({ id: 'r1', cost: 50 });
  });

  it('saveRewards writes cost into points_required via an upsert that preserves claimed', async () => {
    const rewards: Reward[] = [{ id: 'r1', name: 'TV time', cost: 50, description: 'watch tv' }];
    await dataStore.saveRewards(rewards);
    expect(run).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT(id) DO UPDATE'), [
      'r1',
      'TV time',
      50,
      'watch tv',
    ]);
  });

  it('getClaimedRewards reads the claim queue from the user_settings JSON list', async () => {
    const claimed: ClaimedReward[] = [{ id: 'r1', name: 'TV time', cost: 50, claimedDate: 1 }];
    query.mockResolvedValue({ values: [{ value: JSON.stringify(claimed) }] });
    const result = await dataStore.getClaimedRewards();
    expect(query).toHaveBeenCalledWith(expect.stringContaining("key = 'claimedRewards'"));
    expect(result).toEqual(claimed);
  });

  it('getClaimedRewards returns an empty array when nothing is stored', async () => {
    query.mockResolvedValue({ values: [] });
    expect(await dataStore.getClaimedRewards()).toEqual([]);
  });

  it('saveClaimedRewards persists the queue as JSON in user_settings', async () => {
    const claimed: ClaimedReward[] = [{ id: 'r1', name: 'TV time', cost: 50, claimedDate: 1 }];
    await dataStore.saveClaimedRewards(claimed);
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO user_settings'),
      ['claimedRewards', JSON.stringify(claimed)],
    );
  });
});
