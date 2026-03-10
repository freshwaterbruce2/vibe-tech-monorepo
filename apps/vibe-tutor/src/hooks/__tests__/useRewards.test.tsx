import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRewards } from '../useRewards';

// Mock dataStore
vi.mock('../../services/dataStore', () => ({
  dataStore: {
    getRewards: vi.fn().mockResolvedValue([]),
    getClaimedRewards: vi.fn().mockResolvedValue([]),
    saveRewards: vi.fn().mockResolvedValue(undefined),
  },
}));

import { dataStore } from '../../services/dataStore';

const mockedDataStore = vi.mocked(dataStore);

const mockRewards = [
  { id: 'r1', name: '30 min TV', cost: 50 },
  { id: 'r2', name: 'Ice Cream', cost: 100 },
  { id: 'r3', name: 'New Game', cost: 500 },
];

describe('useRewards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDataStore.getRewards.mockResolvedValue([]);
    mockedDataStore.getClaimedRewards.mockResolvedValue([]);
    mockedDataStore.saveRewards.mockResolvedValue(undefined);
  });

  it('should initialise with empty rewards and claimedRewards', () => {
    const { result } = renderHook(() => useRewards());
    expect(result.current.rewards).toEqual([]);
    expect(result.current.claimedRewards).toEqual([]);
  });

  it('should load rewards and claimed rewards from dataStore', async () => {
    const claimedReward = { id: 'r1', name: '30 min TV', cost: 50, claimedDate: Date.now() };
    mockedDataStore.getRewards.mockResolvedValue(mockRewards);
    mockedDataStore.getClaimedRewards.mockResolvedValue([claimedReward]);

    const { result } = renderHook(() => useRewards());

    await vi.waitFor(() => {
      expect(result.current.rewards).toHaveLength(3);
      expect(result.current.claimedRewards).toHaveLength(1);
    });
  });

  it('should claim a reward when user has enough points', async () => {
    mockedDataStore.getRewards.mockResolvedValue(mockRewards);

    const { result } = renderHook(() => useRewards());

    await vi.waitFor(() => {
      expect(result.current.rewards).toHaveLength(3);
    });

    let cost: number;
    act(() => {
      cost = result.current.claimReward('r1', 100); // 100 points, reward costs 50
    });

    expect(cost!).toBe(50);
    expect(result.current.claimedRewards).toHaveLength(1);
    expect(result.current.claimedRewards[0]!.name).toBe('30 min TV');
    expect(result.current.claimedRewards[0]!.claimedDate).toBeDefined();
  });

  it('should refuse to claim a reward when user has insufficient points', async () => {
    mockedDataStore.getRewards.mockResolvedValue(mockRewards);

    const { result } = renderHook(() => useRewards());

    await vi.waitFor(() => {
      expect(result.current.rewards).toHaveLength(3);
    });

    let cost: number;
    act(() => {
      cost = result.current.claimReward('r2', 50); // 50 points, reward costs 100
    });

    expect(cost!).toBe(0);
    expect(result.current.claimedRewards).toHaveLength(0);
  });

  it('should return 0 for non-existent reward', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedDataStore.getRewards.mockResolvedValue(mockRewards);

    const { result } = renderHook(() => useRewards());

    await vi.waitFor(() => {
      expect(result.current.rewards).toHaveLength(3);
    });

    let cost: number;
    act(() => {
      cost = result.current.claimReward('nonexistent', 1000);
    });

    expect(cost!).toBe(0);
    errorSpy.mockRestore();
  });

  it('should approve a claimed reward (no refund)', async () => {
    mockedDataStore.getRewards.mockResolvedValue(mockRewards);

    const { result } = renderHook(() => useRewards());

    await vi.waitFor(() => {
      expect(result.current.rewards).toHaveLength(3);
    });

    // Claim the reward first
    act(() => {
      result.current.claimReward('r1', 100);
    });

    const claimedId = result.current.claimedRewards[0]!.id;

    let refund: number;
    act(() => {
      refund = result.current.handleRewardApproval(claimedId, true);
    });

    expect(refund!).toBe(0);
    expect(result.current.claimedRewards).toHaveLength(0); // removed from claimed
  });

  it('should deny a claimed reward (returns refund amount)', async () => {
    mockedDataStore.getRewards.mockResolvedValue(mockRewards);

    const { result } = renderHook(() => useRewards());

    await vi.waitFor(() => {
      expect(result.current.rewards).toHaveLength(3);
    });

    act(() => {
      result.current.claimReward('r1', 100);
    });

    const claimedId = result.current.claimedRewards[0]!.id;

    let refund: number;
    act(() => {
      refund = result.current.handleRewardApproval(claimedId, false);
    });

    expect(refund!).toBe(50); // cost of r1
    expect(result.current.claimedRewards).toHaveLength(0);
  });

  it('should return 0 refund for non-existent claimed reward', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useRewards());

    let refund: number;
    act(() => {
      refund = result.current.handleRewardApproval('no-such-id', false);
    });

    expect(refund!).toBe(0);
    errorSpy.mockRestore();
  });

  it('should update rewards with a direct array', async () => {
    mockedDataStore.getRewards.mockResolvedValue(mockRewards);

    const { result } = renderHook(() => useRewards());

    await vi.waitFor(() => {
      expect(result.current.rewards).toHaveLength(3);
    });

    const newRewards = [{ id: 'x1', name: 'Big Prize', cost: 999 }];

    act(() => {
      result.current.updateRewards(newRewards);
    });

    expect(result.current.rewards).toEqual(newRewards);
  });

  it('should update rewards with a callback function', async () => {
    mockedDataStore.getRewards.mockResolvedValue(mockRewards);

    const { result } = renderHook(() => useRewards());

    await vi.waitFor(() => {
      expect(result.current.rewards).toHaveLength(3);
    });

    act(() => {
      result.current.updateRewards((prev) => [
        ...prev,
        { id: 'r4', name: 'Extra Reward', cost: 75 },
      ]);
    });

    expect(result.current.rewards).toHaveLength(4);
    expect(result.current.rewards[3]!.name).toBe('Extra Reward');
  });
});
