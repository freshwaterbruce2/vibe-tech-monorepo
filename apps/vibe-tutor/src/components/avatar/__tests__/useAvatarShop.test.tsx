import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAvatarShop } from '../useAvatarShop';
import { SHOP_ITEMS } from '../../../services/avatarShopData';

const dataStoreMock = vi.hoisted(() => ({ getAvatarState: vi.fn(), saveAvatarState: vi.fn() }));
vi.mock('../../../services/dataStore', () => ({ dataStore: dataStoreMock }));

const hat = SHOP_ITEMS.find((item) => item.id === 'hat-math')!;
const ownedState = { equippedItems: {}, ownedItems: [], unlockedAvatars: ['avatar-boy-headphones'], selectedAvatarId: 'avatar-boy-headphones' };

async function ready(result: { current: ReturnType<typeof useAvatarShop> }) {
  await vi.waitFor(() => expect(result.current.loading).toBe(false));
  dataStoreMock.saveAvatarState.mockClear();
}

describe('useAvatarShop durable purchase contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => '123e4567-e89b-42d3-a456-426614174003') });
    dataStoreMock.getAvatarState.mockResolvedValue(ownedState);
    dataStoreMock.saveAvatarState.mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('saves an intent before debiting and leaves it pending when debit returns false or throws', async () => {
    const debit = vi.fn().mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('ledger down'));
    const complete = vi.fn();
    const { result } = renderHook(() => useAvatarShop({ userTokens: 100, onSpendTokens: debit, onPurchaseComplete: complete }));
    await ready(result);
    await act(async () => { await result.current.handleBuy(hat); });
    const pending = result.current.avatarState!.pendingPurchase!;
    expect(dataStoreMock.saveAvatarState.mock.invocationCallOrder[0]).toBeLessThan(debit.mock.invocationCallOrder[0]);
    expect(pending).toMatchObject({ itemId: hat.id, cost: hat.cost, reason: "Bought Mathematician's Cap", operationId: 'avatar-purchase:123e4567-e89b-42d3-a456-426614174003' });
    expect(result.current.avatarState!.ownedItems).not.toContain(hat.id);
    await act(async () => { await result.current.retryPendingPurchase(); });
    expect(result.current.avatarState!.pendingPurchase).toEqual(pending);
    expect(result.current.avatarState!.ownedItems).not.toContain(hat.id);
    expect(complete).not.toHaveBeenCalled();
  });

  it('keeps a debit-confirmed purchase pending when ownership persistence fails', async () => {
    const debit = vi.fn().mockResolvedValue(true);
    dataStoreMock.saveAvatarState.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('disk full'));
    const { result } = renderHook(() => useAvatarShop({ userTokens: 100, onSpendTokens: debit }));
    await ready(result);
    await act(async () => { await result.current.handleBuy(hat); });
    expect(result.current.avatarState!.pendingPurchase).toMatchObject({ itemId: hat.id });
    expect(result.current.avatarState!.ownedItems).not.toContain(hat.id);
    expect(result.current.error).toContain('disk full');
  });

  it('retries a reloaded pending intent with its exact persisted operation, regardless of displayed balance, and commits once', async () => {
    const operationId = 'avatar-purchase:123e4567-e89b-42d3-a456-426614174001';
    const pending = { ...ownedState, pendingPurchase: { schemaVersion: 1 as const, operationId, itemId: hat.id, cost: 100, reason: "Bought Mathematician's Cap", createdAt: 1 } };
    dataStoreMock.getAvatarState.mockResolvedValue(pending);
    const debit = vi.fn().mockResolvedValue(true);
    const complete = vi.fn();
    const { result } = renderHook(() => useAvatarShop({ userTokens: 0, onSpendTokens: debit, onPurchaseComplete: complete }));
    await ready(result);
    await act(async () => { await result.current.retryPendingPurchase(); });
    expect(debit).toHaveBeenCalledWith(100, "Bought Mathematician's Cap", operationId);
    expect(result.current.avatarState!.pendingPurchase).toBeUndefined();
    expect(result.current.avatarState!.ownedItems.filter((id) => id === hat.id)).toHaveLength(1);
    expect(complete).toHaveBeenCalledWith(operationId);
  });

  it('serializes double-buy, rejects insecure/insufficient/already-owned attempts, and preserves confirmed state after an intent-save failure', async () => {
    let releaseDebit!: (ok: boolean) => void;
    const debit = vi.fn(async () => new Promise<boolean>((resolve) => { releaseDebit = resolve; }));
    const { result } = renderHook(() => useAvatarShop({ userTokens: 100, onSpendTokens: debit }));
    await ready(result);
    act(() => { void result.current.handleBuy(hat); void result.current.handleBuy(hat); });
    await vi.waitFor(() => expect(debit).toHaveBeenCalledTimes(1));
    await act(async () => { releaseDebit(true); });
    expect(result.current.avatarState!.ownedItems).toContain(hat.id);
    dataStoreMock.saveAvatarState.mockClear(); debit.mockClear();
    await act(async () => { await result.current.handleBuy(hat); });
    expect(dataStoreMock.saveAvatarState).not.toHaveBeenCalled(); expect(debit).not.toHaveBeenCalled();
    const { result: insufficient } = renderHook(() => useAvatarShop({ userTokens: 99, onSpendTokens: debit }));
    await ready(insufficient);
    await act(async () => { await insufficient.current.handleBuy(hat); });
    expect(dataStoreMock.saveAvatarState).not.toHaveBeenCalled(); expect(debit).not.toHaveBeenCalled();
    vi.stubGlobal('crypto', undefined);
    const { result: insecure } = renderHook(() => useAvatarShop({ userTokens: 100, onSpendTokens: debit }));
    await ready(insecure);
    await act(async () => { await insecure.current.handleBuy(hat); });
    expect(insecure.current.error).toContain('secure purchase ID'); expect(debit).not.toHaveBeenCalled();
    dataStoreMock.getAvatarState.mockResolvedValue(ownedState); dataStoreMock.saveAvatarState.mockRejectedValueOnce(new Error('write failed')).mockResolvedValue(undefined);
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => '123e4567-e89b-42d3-a456-426614174004') });
    debit.mockResolvedValue(false);
    const { result: retry } = renderHook(() => useAvatarShop({ userTokens: 100, onSpendTokens: debit }));
    await ready(retry);
    await act(async () => { await retry.current.handleBuy(hat); });
    expect(retry.current.avatarState!.pendingPurchase).toBeUndefined();
    await act(async () => { await retry.current.handleBuy(hat); });
    expect(retry.current.avatarState!.pendingPurchase).toMatchObject({ operationId: 'avatar-purchase:123e4567-e89b-42d3-a456-426614174004' });
    expect(debit).toHaveBeenCalledTimes(1);
  });

  it('does not publish an equip change until storage succeeds', async () => {
    const owned = { ...ownedState, ownedItems: [hat.id] };
    dataStoreMock.getAvatarState.mockResolvedValue(owned);
    dataStoreMock.saveAvatarState.mockRejectedValueOnce(new Error('write failed')).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAvatarShop({ userTokens: 100, onSpendTokens: vi.fn().mockResolvedValue(true) }));
    await ready(result);
    await act(async () => { await result.current.handleEquip(hat); });
    expect(result.current.avatarState!.equippedItems.hat).toBeUndefined();
    await act(async () => { await result.current.handleEquip(hat); });
    expect(result.current.avatarState!.equippedItems.hat).toBe(hat.id);
  });

  it('contains an achievement callback false result only after durable ownership has succeeded', async () => {
    const complete = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useAvatarShop({ userTokens: 100, onSpendTokens: vi.fn().mockResolvedValue(true), onPurchaseComplete: complete }));
    await ready(result);
    await act(async () => { await result.current.handleBuy(hat); });
    expect(result.current.avatarState!.ownedItems).toContain(hat.id);
    expect(result.current.avatarState!.pendingPurchase).toBeUndefined();
    expect(complete).toHaveBeenCalledWith('avatar-purchase:123e4567-e89b-42d3-a456-426614174003');
    expect(result.current.error).toBeNull();
  });

  it('contains an achievement callback rejection only after durable ownership has succeeded', async () => {
    const complete = vi.fn().mockRejectedValue(new Error('achievement down'));
    const { result } = renderHook(() => useAvatarShop({ userTokens: 100, onSpendTokens: vi.fn().mockResolvedValue(true), onPurchaseComplete: complete }));
    await ready(result);
    await act(async () => { await result.current.handleBuy(hat); });
    expect(result.current.avatarState!.ownedItems).toContain(hat.id);
    expect(result.current.avatarState!.pendingPurchase).toBeUndefined();
    expect(complete).toHaveBeenCalledWith('avatar-purchase:123e4567-e89b-42d3-a456-426614174003');
    expect(result.current.error).toBeNull();
  });
});
