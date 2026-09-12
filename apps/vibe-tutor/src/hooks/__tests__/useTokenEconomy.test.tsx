import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ balance: 0, listener: undefined as (() => void) | undefined }));
vi.mock('../../services/tokenService', () => ({
  getTokenBalance: vi.fn(() => state.balance),
  initializeTokenLedger: vi.fn(async () => undefined),
  subscribeToTokenChanges: vi.fn((listener: () => void) => { state.listener = listener; return () => { state.listener = undefined; }; }),
  earnTokens: vi.fn(async (amount: number) => { state.balance += amount; state.listener?.(); return { ok: true, duplicate: false, transaction: {}, balance: {} }; }),
  spendTokens: vi.fn(async (amount: number) => amount > state.balance ? { ok: false, reason: 'insufficient_funds', balance: {} } : (state.balance -= amount, state.listener?.(), { ok: true, duplicate: false, transaction: {}, balance: {} })),
}));
import { useTokenEconomy } from '../useTokenEconomy';

beforeEach(() => { state.balance = 0; state.listener = undefined; vi.clearAllMocks(); });
describe('useTokenEconomy', () => {
  it('initializes from the canonical ledger', async () => { const { result } = renderHook(() => useTokenEconomy()); await vi.waitFor(() => expect(result.current.isInitialized).toBe(true)); expect(result.current.userTokens).toBe(0); });
  it('only reflects an earn after its durable ledger result resolves', async () => { const { result } = renderHook(() => useTokenEconomy()); await act(async () => { await result.current.earnTokens(10, 'Test', 'test:earn'); }); expect(result.current.userTokens).toBe(10); });
  it('returns an honest insufficient-funds result', async () => { const { result } = renderHook(() => useTokenEconomy()); let response: Awaited<ReturnType<typeof result.current.spendTokens>>; await act(async () => { response = await result.current.spendTokens(1, 'Test', 'test:spend'); }); expect(response!).toMatchObject({ ok: false, reason: 'insufficient_funds' }); });
});
