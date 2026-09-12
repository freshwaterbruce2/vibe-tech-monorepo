import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAchievements } from '../useAchievements';
const api = vi.hoisted(() => ({
  getAchievements: vi.fn(),
  getPendingAchievementAwards: vi.fn(),
  checkAndUnlockAchievements: vi.fn(),
  confirmAchievementAward: vi.fn(),
}));
vi.mock('../../services/achievementService', () => api);
const a = (id: string) => ({
  id,
  name: id,
  description: '',
  goal: 1,
  progress: 1,
  unlocked: true,
  icon: () => null,
});
const e = {
  type: 'TASK_COMPLETED' as const,
  eventId: 'homework-completed:task',
  payload: { completionDay: '2026-08-24' },
};
describe('useAchievements canonical settlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    api.getAchievements.mockResolvedValue([a('FIRST_TASK')]);
    api.getPendingAchievementAwards.mockResolvedValue([]);
    api.checkAndUnlockAchievements.mockResolvedValue({
      achievements: [],
      newlyQualified: [],
      pendingAwards: [],
      totalBonusTokens: 0,
      totalBonusPoints: 0,
    });
    api.confirmAchievementAward.mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());
  it('loads canonical achievements', async () => {
    const { result } = renderHook(() => useAchievements({ onAwardTokens: vi.fn() }));
    await vi.waitFor(() => expect(result.current.achievements).toHaveLength(1));
    expect(api.getAchievements).toHaveBeenCalled();
  });
  it('settles every pending award individually before confirmation', async () => {
    const awards = [
      { achievementId: 'FIRST_TASK', operationId: 'achievement:unlock:FIRST_TASK', amount: 25 },
      { achievementId: 'FIVE_TASKS', operationId: 'achievement:unlock:FIVE_TASKS', amount: 50 },
    ];
    api.getPendingAchievementAwards.mockResolvedValueOnce(awards).mockResolvedValue([]);
    const earn = vi.fn().mockResolvedValue(true);
    renderHook(() => useAchievements({ onAwardTokens: earn }));
    await vi.waitFor(() => expect(api.confirmAchievementAward).toHaveBeenCalledTimes(2));
    expect(earn.mock.calls).toEqual([
      [25, 'Achievement unlocked: FIRST_TASK', 'achievement:unlock:FIRST_TASK'],
      [50, 'Achievement unlocked: FIVE_TASKS', 'achievement:unlock:FIVE_TASKS'],
    ]);
    expect(api.confirmAchievementAward.mock.invocationCallOrder[0]).toBeGreaterThan(
      earn.mock.invocationCallOrder[0]!,
    );
  });
  it('leaves pending and exposes retry after false award', async () => {
    api.getPendingAchievementAwards.mockResolvedValue([
      { achievementId: 'FIRST_TASK', operationId: 'achievement:unlock:FIRST_TASK', amount: 25 },
    ]);
    const earn = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useAchievements({ onAwardTokens: earn }));
    await vi.waitFor(() => expect(result.current.achievementError).toBe(true));
    expect(api.confirmAchievementAward).not.toHaveBeenCalled();
    earn.mockResolvedValue(true);
    await act(async () => {
      await result.current.retryAchievements();
    });
    await vi.waitFor(() => expect(api.confirmAchievementAward).toHaveBeenCalled());
  });
  it('keeps a thrown token award retryable without confirming', async () => {
    api.getPendingAchievementAwards.mockResolvedValue([
      { achievementId: 'FIRST_TASK', operationId: 'achievement:unlock:FIRST_TASK', amount: 25 },
    ]);
    const award = vi
      .fn()
      .mockRejectedValueOnce(new Error('ledger unavailable'))
      .mockResolvedValue(true);
    const { result } = renderHook(() => useAchievements({ onAwardTokens: award }));
    await vi.waitFor(() => expect(result.current.achievementError).toBe(true));
    expect(api.confirmAchievementAward).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.retryAchievements();
    });
    await vi.waitFor(() =>
      expect(api.confirmAchievementAward).toHaveBeenCalledWith(
        'FIRST_TASK',
        'achievement:unlock:FIRST_TASK',
      ),
    );
  });
  it('retries a confirmation write with the same stable award details and resolves only after success', async () => {
    const pending = {
      achievementId: 'FIRST_TASK',
      operationId: 'achievement:unlock:FIRST_TASK',
      amount: 25,
    };
    api.getPendingAchievementAwards.mockResolvedValue([pending]);
    api.confirmAchievementAward
      .mockRejectedValueOnce(new Error('write failed'))
      .mockResolvedValueOnce(undefined);
    const award = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useAchievements({ onAwardTokens: award }));
    await vi.waitFor(() => expect(result.current.achievementError).toBe(true));
    expect(api.confirmAchievementAward).toHaveBeenCalledTimes(1);
    await act(async () => {
      await result.current.retryAchievements();
    });
    await vi.waitFor(() => expect(api.confirmAchievementAward).toHaveBeenCalledTimes(2));
    expect(award.mock.calls).toEqual([
      [25, 'Achievement unlocked: FIRST_TASK', 'achievement:unlock:FIRST_TASK'],
      [25, 'Achievement unlocked: FIRST_TASK', 'achievement:unlock:FIRST_TASK'],
    ]);
    expect(result.current.achievementError).toBe(false);
  });
  it('never confirms when the token callback is missing or confirmation persistence fails', async () => {
    api.getPendingAchievementAwards.mockResolvedValue([
      { achievementId: 'FIRST_TASK', operationId: 'achievement:unlock:FIRST_TASK', amount: 25 },
    ]);
    const { result, rerender } = renderHook(
      ({ award }) => useAchievements({ onAwardTokens: award }),
      { initialProps: { award: undefined as undefined | ReturnType<typeof vi.fn> } },
    );
    await vi.waitFor(() => expect(result.current.achievementError).toBe(true));
    expect(api.confirmAchievementAward).not.toHaveBeenCalled();
    const earn = vi.fn().mockResolvedValue(true);
    api.confirmAchievementAward.mockRejectedValueOnce(new Error('write failed'));
    rerender({ award: earn });
    await act(async () => {
      await result.current.retryAchievements();
    });
    expect(api.confirmAchievementAward).toHaveBeenCalledWith(
      'FIRST_TASK',
      'achievement:unlock:FIRST_TASK',
    );
    expect(result.current.achievementError).toBe(true);
  });
  it('retains staged event failures and queues confirmed notifications', async () => {
    vi.useRealTimers();
    api.checkAndUnlockAchievements.mockRejectedValueOnce(new Error('write')).mockResolvedValueOnce({
      achievements: [],
      newlyQualified: [a('FIRST_TASK'), a('FIVE_TASKS')],
      pendingAwards: [],
      totalBonusTokens: 0,
      totalBonusPoints: 0,
    });
    const { result } = renderHook(() =>
      useAchievements({ onAwardTokens: vi.fn().mockResolvedValue(true) }),
    );
    await act(async () => {
      await result.current.handleAchievementEvent(e);
    });
    expect(result.current.achievementError).toBe(true);
    await act(async () => {
      await result.current.retryAchievements();
    });
    expect(result.current.newlyUnlocked?.id).toBe('FIRST_TASK');
    act(() => result.current.clearNotification());
    expect(result.current.newlyUnlocked?.id).toBe('FIVE_TASKS');
  });
  it('keeps the retry error when a staged event fails again even if award settlement succeeds', async () => {
    vi.useRealTimers();
    api.checkAndUnlockAchievements.mockRejectedValue(new Error('write'));
    const { result } = renderHook(() =>
      useAchievements({ onAwardTokens: vi.fn().mockResolvedValue(true) }),
    );
    await act(async () => {
      await result.current.handleAchievementEvent(e);
    });
    await act(async () => {
      await result.current.retryAchievements();
    });
    expect(result.current.achievementError).toBe(true);
  });
});
