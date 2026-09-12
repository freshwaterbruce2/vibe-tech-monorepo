import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));

vi.mock('../../../utils/electronStore', () => ({ appStore: mocks }));
vi.mock('../../../services/gameProgression', () => ({
  calculateStandardGameTokens: vi.fn(() => 12),
}));
vi.mock('../../../services/tokenService', () => ({
  TOKEN_REWARDS: { THREE_DAY_STREAK: 30, SEVEN_DAY_STREAK: 75, THIRTY_DAY_STREAK: 200 },
}));

import { useBrainGymState } from '../useBrainGymState';

type AwardTokens = (amount: number, reason: string, operationId: string) => Promise<boolean>;

const today = new Date().toISOString().split('T')[0] ?? '';
const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0] ?? '';

describe('useBrainGymState durable token awards', () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.set.mockReset();
    mocks.get.mockReturnValue(null);
  });

  it('does not publish completion stats before a pending award accepts and retries with the same ID', async () => {
    let settle: ((value: boolean) => void) | undefined;
    const onEarnTokens = vi.fn<AwardTokens>(async () => new Promise<boolean>((resolve) => { settle = resolve; }));
    const { result } = renderHook(() => useBrainGymState({ userTokens: 0, onEarnTokens, onClose: vi.fn() }));

    await act(async () => { result.current.launchGame('memory'); });
    await act(async () => { void result.current.handleGameComplete('memory', 90, 3, 12, { autoCloseDelayMs: 0 }); });
    expect(result.current.stats.gamesPlayed).toBe(0);
    expect(onEarnTokens).toHaveBeenCalledTimes(1);
    const operationId = onEarnTokens.mock.calls[0]?.[2];

    await act(async () => { settle?.(false); });
    expect(result.current.stats.gamesPlayed).toBe(0);
    await act(async () => { void result.current.handleGameComplete('memory', 90, 3, 12, { autoCloseDelayMs: 0 }); });
    expect(onEarnTokens.mock.calls[1]?.[2]).toBe(operationId);
    expect(result.current.stats.gamesPlayed).toBe(0);

    // The second attempt is pending too; it must not create a duplicate completion.
    expect(onEarnTokens).toHaveBeenCalledTimes(2);
  });

  it('requires every earned bonus before saving chest, daily, or streak progress', async () => {
    mocks.get.mockReturnValue({
      xp: 0, level: 0, streak: 2, lastPlayDate: yesterday, gamesPlayed: 4,
      chestsOpened: 0, chestProgress: 4, dailyGoalDate: today, dailyGoalProgress: 2,
      dailyGoalCompletedOn: '', gameStats: {},
    });
    const onEarnTokens = vi.fn<AwardTokens>().mockResolvedValue(true);
    const { result } = renderHook(() => useBrainGymState({ userTokens: 0, onEarnTokens, onClose: vi.fn() }));
    await act(async () => { result.current.launchGame('memory'); });
    await act(async () => { await result.current.handleGameComplete('memory', 90, 3, 12, { autoCloseDelayMs: 0 }); });

    expect(onEarnTokens).toHaveBeenCalledTimes(4);
    expect(onEarnTokens.mock.calls.map((call) => call[2])).toEqual([
      expect.stringMatching(/:completion$/), expect.stringMatching(/:chest:1$/),
      expect.stringMatching(/:daily:/), expect.stringMatching(/:streak:.*:3$/),
    ]);
    expect(result.current.stats).toMatchObject({ gamesPlayed: 5, chestProgress: 0, chestsOpened: 1, dailyGoalProgress: 3, streak: 3 });
    expect(mocks.set).toHaveBeenCalled();
  });
});
