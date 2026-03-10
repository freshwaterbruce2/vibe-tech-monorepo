import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAchievements } from '../useAchievements';

// Mock dataStore
vi.mock('../../services/dataStore', () => ({
  dataStore: {
    getAchievements: vi.fn().mockResolvedValue([]),
    getStudentPoints: vi.fn().mockResolvedValue(0),
    saveStudentPoints: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock achievementService
vi.mock('../../services/achievementService', () => ({
  checkAndUnlockAchievements: vi.fn().mockResolvedValue({
    achievements: [],
    newlyUnlocked: [],
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
    mockedDataStore.getStudentPoints.mockResolvedValue(0);
    mockedDataStore.saveStudentPoints.mockResolvedValue(undefined);
    mockedCheck.mockResolvedValue({
      achievements: [],
      newlyUnlocked: [],
      totalBonusPoints: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialise with empty achievements and 0 points', () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.achievements).toEqual([]);
    expect(result.current.points).toBe(0);
    expect(result.current.newlyUnlocked).toBeNull();
    expect(result.current.bonusPoints).toBe(0);
  });

  it('should load achievements and points from dataStore', async () => {
    const mockAchievements = [
      { id: 'a1', name: 'First Steps', description: '', unlocked: false, icon: () => null },
    ];
    mockedDataStore.getAchievements.mockResolvedValue(mockAchievements as any);
    mockedDataStore.getStudentPoints.mockResolvedValue(25);

    const { result } = renderHook(() => useAchievements());

    await vi.waitFor(() => {
      expect(result.current.achievements).toHaveLength(1);
      expect(result.current.points).toBe(25);
    });
  });

  it('should award points', () => {
    const { result } = renderHook(() => useAchievements());

    act(() => {
      result.current.awardPoints(10);
    });

    expect(result.current.points).toBe(10);
  });

  it('should accumulate awarded points', () => {
    const { result } = renderHook(() => useAchievements());

    act(() => {
      result.current.awardPoints(10);
    });
    act(() => {
      result.current.awardPoints(5);
    });

    expect(result.current.points).toBe(15);
  });

  it('should deduct points when sufficient balance', () => {
    const { result } = renderHook(() => useAchievements());

    act(() => {
      result.current.awardPoints(20);
    });

    let success: boolean;
    act(() => {
      success = result.current.deductPoints(15);
    });

    expect(success!).toBe(true);
    expect(result.current.points).toBe(5);
  });

  it('should refuse to deduct points when insufficient balance', () => {
    const { result } = renderHook(() => useAchievements());

    act(() => {
      result.current.awardPoints(5);
    });

    let success: boolean;
    act(() => {
      success = result.current.deductPoints(10);
    });

    expect(success!).toBe(false);
    expect(result.current.points).toBe(5); // unchanged
  });

  it('should clamp points to 0 when deducting exactly', () => {
    const { result } = renderHook(() => useAchievements());

    act(() => {
      result.current.awardPoints(10);
    });

    act(() => {
      result.current.deductPoints(10);
    });

    expect(result.current.points).toBe(0);
  });

  it('should handle achievement event with unlock', async () => {
    // Use real timers so mockResolvedValue promises resolve via microtask queue
    vi.useRealTimers();

    const fakeAchievement = {
      id: 'ach1',
      name: 'Star Pupil',
      description: 'Got it',
      unlocked: true,
      icon: () => null,
    };

    // Set up mocks BEFORE rendering so mount effect doesn't overwrite with []
    mockedDataStore.getAchievements.mockResolvedValue([fakeAchievement as any]);
    mockedCheck.mockResolvedValue({
      achievements: [fakeAchievement as any],
      newlyUnlocked: [fakeAchievement as any],
      totalBonusPoints: 10,
    });

    const { result } = renderHook(() => useAchievements());

    // Wait for mount effect to settle first
    await vi.waitFor(() => {
      expect(result.current.achievements).toHaveLength(1);
    });

    await act(async () => {
      await result.current.handleAchievementEvent({ type: 'TASK_COMPLETED' });
    });

    expect(result.current.achievements).toHaveLength(1);
    expect(result.current.newlyUnlocked).toBeTruthy();
    expect(result.current.newlyUnlocked?.name).toBe('Star Pupil');
    expect(result.current.bonusPoints).toBe(10);
    expect(result.current.points).toBe(10); // bonus points added

    // Restore fake timers for subsequent tests
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

    // Advance 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.newlyUnlocked).toBeNull();
    expect(result.current.bonusPoints).toBe(0);
  });

  it('should handle achievement event with no unlocks', async () => {
    mockedCheck.mockResolvedValue({
      achievements: [
        { id: 'a1', name: 'X', description: '', unlocked: false, icon: () => null } as any,
      ],
      newlyUnlocked: [],
      totalBonusPoints: 0,
    });

    const { result } = renderHook(() => useAchievements());

    await act(async () => {
      await result.current.handleAchievementEvent({ type: 'TASK_COMPLETED' });
    });

    expect(result.current.newlyUnlocked).toBeNull();
    expect(result.current.bonusPoints).toBe(0);
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
    expect(result.current.bonusPoints).toBe(0);
  });

  it('should persist points to dataStore', async () => {
    const { result } = renderHook(() => useAchievements());

    act(() => {
      result.current.awardPoints(7);
    });

    await vi.waitFor(() => {
      expect(mockedDataStore.saveStudentPoints).toHaveBeenCalledWith(7);
    });
  });
});
