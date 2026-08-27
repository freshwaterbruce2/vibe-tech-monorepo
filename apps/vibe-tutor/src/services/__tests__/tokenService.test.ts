import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetTokenServiceForTests,
  awardFocusSession,
  awardGameComplete,
  awardScheduleComplete,
  awardScheduleStep,
  cleanupOldTransactions,
  earnTokens,
  getRecentTransactions,
  getTodayEarnings,
  getTodaySpending,
  getTokenBalance,
  getTokenStats,
  getTransactionsByType,
  setTokenBalance,
  spendTokens,
  subscribeToTokenChanges,
  syncTokenBalanceFromLegacy,
  TOKEN_REWARDS,
} from '../tokenService';

// VibeBux is real-reward currency for kids — treat the ledger like financial
// logic and assert earn/spend/persistence/caps explicitly.
beforeEach(() => {
  window.localStorage.clear();
  __resetTokenServiceForTests();
});

describe('tokenService ledger', () => {
  it('starts at a zero balance', () => {
    expect(getTokenBalance()).toBe(0);
    expect(getTokenStats()).toMatchObject({ balance: 0, totalEarned: 0, totalSpent: 0 });
  });

  it('earns tokens and tracks totals', () => {
    earnTokens(50, 'Homework complete');
    expect(getTokenBalance()).toBe(50);
    const stats = getTokenStats();
    expect(stats.totalEarned).toBe(50);
    expect(stats.totalSpent).toBe(0);
  });

  it('ignores non-positive earns', () => {
    expect(earnTokens(0, 'x')).toBeNull();
    expect(earnTokens(-5, 'x')).toBeNull();
    expect(getTokenBalance()).toBe(0);
  });

  it('spends tokens when the balance is sufficient', () => {
    earnTokens(100, 'seed');
    const txn = spendTokens(30, 'Reward');
    expect(txn).not.toBeNull();
    expect(getTokenBalance()).toBe(70);
    expect(getTokenStats().totalSpent).toBe(30);
  });

  it('never lets the balance go negative', () => {
    earnTokens(20, 'seed');
    expect(spendTokens(50, 'too much')).toBeNull();
    expect(getTokenBalance()).toBe(20);
  });

  it('rejects non-positive spends', () => {
    earnTokens(20, 'seed');
    expect(spendTokens(0, 'x')).toBeNull();
    expect(spendTokens(-1, 'x')).toBeNull();
    expect(getTokenBalance()).toBe(20);
  });

  it('persists the balance across a cache reset (round-trips through storage)', () => {
    earnTokens(42, 'seed');
    __resetTokenServiceForTests();
    expect(getTokenBalance()).toBe(42);
  });

  it('setTokenBalance raises and lowers toward a target, no-ops when equal', () => {
    setTokenBalance(80);
    expect(getTokenBalance()).toBe(80);
    setTokenBalance(30);
    expect(getTokenBalance()).toBe(30);
    expect(setTokenBalance(30)).toBeNull();
  });

  it('syncTokenBalanceFromLegacy only ever raises the balance', () => {
    earnTokens(10, 'seed');
    expect(syncTokenBalanceFromLegacy(5)).toBe(false);
    expect(getTokenBalance()).toBe(10);
    expect(syncTokenBalanceFromLegacy(40)).toBe(true);
    expect(getTokenBalance()).toBe(40);
  });

  it('records and filters transactions by type', () => {
    earnTokens(10, 'a');
    earnTokens(20, 'b');
    spendTokens(5, 'c');
    expect(getRecentTransactions(10)).toHaveLength(3);
    expect(getTransactionsByType('earn')).toHaveLength(2);
    expect(getTransactionsByType('spend')).toHaveLength(1);
  });

  it('aggregates today earnings and spending', () => {
    earnTokens(15, 'today earn');
    spendTokens(5, 'today spend');
    expect(getTodayEarnings()).toBe(15);
    expect(getTodaySpending()).toBe(5);
  });

  it('cleanupOldTransactions keeps recent transactions', () => {
    earnTokens(10, 'recent');
    cleanupOldTransactions(90);
    expect(getRecentTransactions(10).length).toBeGreaterThanOrEqual(1);
  });
});

describe('tokenService award helpers', () => {
  it('awardScheduleStep / awardScheduleComplete credit the right amounts', () => {
    awardScheduleStep('brush teeth', 'morning-1');
    expect(getTokenBalance()).toBe(TOKEN_REWARDS.MORNING_ROUTINE_STEP);
    awardScheduleComplete('evening', 'evening-1');
    expect(getTokenBalance()).toBe(
      TOKEN_REWARDS.MORNING_ROUTINE_STEP + TOKEN_REWARDS.EVENING_ROUTINE_COMPLETE,
    );
  });

  it('awardGameComplete adds perfect + no-hint bonuses', () => {
    awardGameComplete('Sudoku', 100, true, true, 'g1');
    expect(getTokenBalance()).toBe(
      TOKEN_REWARDS.GAME_COMPLETE + TOKEN_REWARDS.GAME_PERFECT + TOKEN_REWARDS.GAME_NO_HINTS,
    );
  });

  it('awardGameComplete with no bonuses credits only the base amount', () => {
    awardGameComplete('Memory', 60, false, false, 'g2');
    expect(getTokenBalance()).toBe(TOKEN_REWARDS.GAME_COMPLETE);
  });

  it('awardFocusSession scales with minutes', () => {
    awardFocusSession(50, 's1');
    expect(getTokenBalance()).toBe(TOKEN_REWARDS.FOCUS_SESSION_50MIN);
    __resetTokenServiceForTests();
    window.localStorage.clear();
    awardFocusSession(25, 's2');
    expect(getTokenBalance()).toBe(TOKEN_REWARDS.FOCUS_SESSION_25MIN);
  });
});

describe('tokenService subscriptions', () => {
  it('notifies subscribers on earn/spend and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToTokenChanges(listener);
    earnTokens(10, 'a');
    spendTokens(5, 'b');
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    earnTokens(3, 'c');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('isolates listener errors from the ledger', () => {
    subscribeToTokenChanges(() => {
      throw new Error('boom');
    });
    expect(() => earnTokens(5, 'a')).not.toThrow();
    expect(getTokenBalance()).toBe(5);
  });
});
