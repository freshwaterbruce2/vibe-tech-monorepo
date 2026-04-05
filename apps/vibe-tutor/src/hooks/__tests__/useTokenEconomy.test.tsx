import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const tokenMockState = vi.hoisted(() => ({
  balance: 0,
}));

vi.mock('../../services/tokenService', () => ({
  earnTokens: vi.fn((amount: number) => {
    if (amount <= 0) return null;
    tokenMockState.balance += amount;
    return {
      id: `txn_${Date.now()}`,
      type: 'earn' as const,
      amount,
      reason: 'test',
      timestamp: Date.now(),
    };
  }),
  getTokenBalance: vi.fn(() => tokenMockState.balance),
  setTokenBalance: vi.fn((amount: number) => {
    const current = tokenMockState.balance;
    if (amount === current) return null;
    tokenMockState.balance = amount;
    return {
      id: `txn_${Date.now()}`,
      type: amount > current ? ('earn' as const) : ('spend' as const),
      amount: Math.abs(amount - current),
      reason: 'test',
      timestamp: Date.now(),
    };
  }),
  spendTokens: vi.fn((amount: number) => {
    if (amount <= 0 || tokenMockState.balance < amount) return null;
    tokenMockState.balance -= amount;
    return {
      id: `txn_${Date.now()}`,
      type: 'spend' as const,
      amount,
      reason: 'test',
      timestamp: Date.now(),
    };
  }),
  syncTokenBalanceFromLegacy: vi.fn((balance: number) => {
    if (balance > tokenMockState.balance) {
      tokenMockState.balance = balance;
      return true;
    }
    return false;
  }),
}));

// Mock dataStore
vi.mock('../../services/dataStore', () => ({
  dataStore: {
    getUserSettings: vi.fn().mockResolvedValue(0),
    saveUserSettings: vi.fn().mockResolvedValue(undefined),
  },
}));

import { dataStore } from '../../services/dataStore';
import { useTokenEconomy } from '../useTokenEconomy';

const mockedDataStore = vi.mocked(dataStore);

describe('useTokenEconomy', () => {
  beforeEach(() => {
    tokenMockState.balance = 0;
    vi.clearAllMocks();
    mockedDataStore.getUserSettings.mockResolvedValue(0 as unknown as string);
    mockedDataStore.saveUserSettings.mockResolvedValue(undefined);
  });

  it('should initialise with 0 tokens', () => {
    const { result } = renderHook(() => useTokenEconomy());
    expect(result.current.userTokens).toBe(0);
  });

  it('should load tokens from dataStore on mount', async () => {
    mockedDataStore.getUserSettings.mockResolvedValue(42 as unknown as string);

    const { result } = renderHook(() => useTokenEconomy());

    await vi.waitFor(() => {
      expect(result.current.userTokens).toBe(42);
    });
  });

  it('should handle string token values from storage', async () => {
    mockedDataStore.getUserSettings.mockResolvedValue('15');

    const { result } = renderHook(() => useTokenEconomy());

    await vi.waitFor(() => {
      expect(result.current.userTokens).toBe(15);
    });
  });

  it('should earn tokens', () => {
    const { result } = renderHook(() => useTokenEconomy());

    act(() => {
      result.current.earnTokens(10);
    });

    expect(result.current.userTokens).toBe(10);
  });

  it('should accumulate earned tokens', () => {
    const { result } = renderHook(() => useTokenEconomy());

    act(() => {
      result.current.earnTokens(10);
    });
    act(() => {
      result.current.earnTokens(5);
    });

    expect(result.current.userTokens).toBe(15);
  });

  it('should ignore earning zero or negative tokens', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useTokenEconomy());

    act(() => {
      result.current.earnTokens(10);
    });
    act(() => {
      result.current.earnTokens(0);
    });
    act(() => {
      result.current.earnTokens(-5);
    });

    expect(result.current.userTokens).toBe(10);
    warnSpy.mockRestore();
  });

  it('should spend tokens when sufficient balance', () => {
    const { result } = renderHook(() => useTokenEconomy());

    act(() => {
      result.current.earnTokens(20);
    });

    let success = false;
    act(() => {
      success = result.current.spendTokens(15);
    });

    expect(success).toBe(true);
    expect(result.current.userTokens).toBe(5);
  });

  it('should fail to spend more tokens than available', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useTokenEconomy());

    act(() => {
      result.current.earnTokens(5);
    });

    let success = true;
    act(() => {
      success = result.current.spendTokens(10);
    });

    expect(success).toBe(false);
    expect(result.current.userTokens).toBe(5);
    warnSpy.mockRestore();
  });

  it('should reject spending zero or negative tokens', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useTokenEconomy());

    act(() => {
      result.current.earnTokens(10);
    });

    expect(result.current.spendTokens(0)).toBe(false);
    expect(result.current.spendTokens(-3)).toBe(false);
    expect(result.current.userTokens).toBe(10);
    warnSpy.mockRestore();
  });

  it('should check hasTokens correctly', () => {
    const { result } = renderHook(() => useTokenEconomy());

    act(() => {
      result.current.earnTokens(10);
    });

    expect(result.current.hasTokens(10)).toBe(true);
    expect(result.current.hasTokens(11)).toBe(false);
    expect(result.current.hasTokens(0)).toBe(true);
  });

  it('should set tokens directly', () => {
    const { result } = renderHook(() => useTokenEconomy());

    act(() => {
      result.current.setTokens(100);
    });

    expect(result.current.userTokens).toBe(100);
  });

  it('should reject setting negative tokens', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useTokenEconomy());

    act(() => {
      result.current.setTokens(50);
    });
    act(() => {
      result.current.setTokens(-1);
    });

    expect(result.current.userTokens).toBe(50);
    warnSpy.mockRestore();
  });

  it('should persist tokens to dataStore on change', async () => {
    const { result } = renderHook(() => useTokenEconomy());

    act(() => {
      result.current.earnTokens(7);
    });

    await vi.waitFor(() => {
      expect(mockedDataStore.saveUserSettings).toHaveBeenCalledWith('userTokens', '7');
    });
  });
});
