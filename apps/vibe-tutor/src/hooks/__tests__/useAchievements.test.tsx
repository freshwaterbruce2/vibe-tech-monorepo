import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAchievements } from '../useAchievements';

vi.mock('../../services/dataStore', () => ({
  dataStore: {
    getAchievements: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../services/achievementService', () => ({
  checkAndUnlockAchievements: vi.fn().mockResolvedValue({
    achievements: [],
    newlyUnlocked: [],
    totalBonusTokens: 0,
    totalBonusPoints: 0,
  }),
}));

import { checkAndUnlockAchievements } from '../../services/achievementService';
import { dataStore } from '../../services/dataStore';

const mockedDataStore = vi.mocked(dataStore);
const mockedCheck = vi.mocked(checkAndUnlockAchievements);

describe('useAchievements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockedDataStore.getAchievements.mockResolvedValue([]);
    mockedCheck.mockResolvedValue({
      achievements: [],
      newlyUnlocked: [],
      totalBonusTokens: 0,
      totalBonusPoints: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialise with empty achievements and 0 bonus tokens', () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.achievements).toEqual([]);
    expect(result.current.newlyUnlocked).toBeNull();
    expect(result.current.bonusTokens).toBe(0);
  });

  it('should load achievements from dataStore', async () => {
    const mockAchievements = [
      { id: 'a1', name: 'First Steps', description: '', unlocked: false, icon: () => null },
    ];
    mockedDataStore.getAchievements.mockResolvedValue(mockAchievements as any);

    const { result } = renderHook(() => useAchievements());

    await vi.waitFor(() => {
      expect(result.current.achievements).toHaveLength(1);
    });
  });

  it('should handle achievement event with unlock and award tokens through callback', async () => {
    vi.useRealTimers();

    const fakeAchievement = {
      id: 'ach1',
      name: 'Star Pupil',
      description: 'Got it',
      unlocked: true,
      icon: () => null,
    };
    const onAwardTokens = vi.fn();

    mockedDataStore.getAchievements.mockResolvedValue([fakeAchievement as any]);
    mockedCheck.mockResolvedValue({
      achievements: [fakeAchievement as any],
      newlyUnlocked: [fakeAchievement as any],
      totalBonusTokens: 10,
      totalBonusPoints: 10,
    });

    const { result } = renderHook(() => useAchievements({ onAwardTokens }));

    await vi.waitFor(() => {
      expect(result.current.achievements).toHaveLength(1);
    });

    await act(async () => {
      await result.current.handleAchievementEvent({ type: 'TASK_COMPLETED' });
    });

    expect(onAwardTokens).toHaveBeenCalledWith(10, 'Achievement unlocked: Star Pupil');
    expect(result.current.newlyUnlocked?.name).toBe('Star Pupil');
    expect(result.current.bonusTokens).toBe(10);

    vi.useFakeTimers();
  });

  it('should auto-clear notification after 5 seconds', async () => {
    const fakeAchievement = {
      id: 'ach1',
      name: 'Focus!',
      description: '',
      unlocked: true,
      icon: () => null,
    };
    mockedCheck.mockResolvedValue({
      achievements: [fakeAchievement as any],
      newlyUnlocked: [fakeAchievement as any],
      totalBonusTokens: 5,
      totalBonusPoints: 5,
    });

    const { result } = renderHook(() => useAchievements());

    await act(async () => {
      await result.current.handleAchievementEvent({
        type: 'FOCUS_SESSION_COMPLETED',
        payload: { duration: 25 },
      });
    });

    expect(result.current.newlyUnlocked).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.newlyUnlocked).toBeNull();
    expect(result.current.bonusTokens).toBe(0);
  });

  it('should handle achievement event with no unlocks', async () => {
    mockedCheck.mockResolvedValue({
      achievements: [
        { id: 'a1', name: 'X', description: '', unlocked: false, icon: () => null } as any,
      ],
      newlyUnlocked: [],
      totalBonusTokens: 0,
      totalBonusPoints: 0,
    });

    const { result } = renderHook(() => useAchievements());

    await act(async () => {
      await result.current.handleAchievementEvent({ type: 'TASK_COMPLETED' });
    });

    expect(result.current.newlyUnlocked).toBeNull();
    expect(result.current.bonusTokens).toBe(0);
  });

  it('should clear notification manually', async () => {
    const fakeAchievement = {
      id: 'a1',
      name: 'X',
      description: '',
      unlocked: true,
      icon: () => null,
    };
    mockedCheck.mockResolvedValue({
      achievements: [fakeAchievement as any],
      newlyUnlocked: [fakeAchievement as any],
      totalBonusTokens: 3,
      totalBonusPoints: 3,
    });

    const { result } = renderHook(() => useAchievements());

    await act(async () => {
      await result.current.handleAchievementEvent({ type: 'TASK_COMPLETED' });
    });

    expect(result.current.newlyUnlocked).toBeTruthy();

    act(() => {
      result.current.clearNotification();
    });

    expect(result.current.newlyUnlocked).toBeNull();
    expect(result.current.bonusTokens).toBe(0);
  });
});
