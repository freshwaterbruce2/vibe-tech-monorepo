import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRewards } from '../useRewards';
vi.mock('../../services/dataStore', () => ({ dataStore: { getRewards: vi.fn(), getRewardRequests: vi.fn(), saveRewards: vi.fn(), saveRewardRequests: vi.fn() } }));
import { dataStore } from '../../services/dataStore';
const store = vi.mocked(dataStore);
const catalog = [{ id: 'tv', name: 'TV time', cost: 50 }];
const tokens = { spend: vi.fn(), earn: vi.fn() };
const setup = () => renderHook(() => useRewards({ onSpendTokens: tokens.spend, onEarnTokens: tokens.earn }));
const request = (id: string, status: 'debit_pending' | 'pending_approval' | 'approved' | 'refund_pending' | 'denied' | 'fulfilled', updatedAt = 1, reward = catalog[0]!) => ({ schemaVersion: 1 as const, requestId: id, reward, createdAt: 1, updatedAt, status, debitOperationId: `reward-debit:${id}`, refundOperationId: `reward-refund:${id}` });
describe('useRewards durable request saga', () => {
  beforeEach(() => { vi.clearAllMocks(); store.getRewards.mockResolvedValue(catalog); store.getRewardRequests.mockResolvedValue([]); store.saveRewards.mockResolvedValue(undefined); store.saveRewardRequests.mockResolvedValue(undefined); tokens.spend.mockResolvedValue(true); tokens.earn.mockResolvedValue(true); });
  it('persists debit intent before one request-scoped debit and publishes only confirmed approval state', async () => { const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true)); await act(async () => { await result.current.claimReward('tv'); }); expect(tokens.spend).toHaveBeenCalledOnce(); const request = result.current.rewardRequests[0]!; expect(request.status).toBe('pending_approval'); expect(tokens.spend).toHaveBeenCalledWith(50, expect.any(String), request.debitOperationId); expect(store.saveRewardRequests.mock.invocationCallOrder[0]).toBeLessThan(tokens.spend.mock.invocationCallOrder[0]!); });
  it('does not debit if intent persistence fails', async () => { store.saveRewardRequests.mockRejectedValueOnce(new Error('full')); const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true)); await act(async () => { await result.current.claimReward('tv'); }); expect(tokens.spend).not.toHaveBeenCalled(); expect(result.current.rewardRequests).toEqual([]); });
  it('keeps debit_pending and reuses its operation id after post-debit state failure', async () => { store.saveRewardRequests.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('write')).mockResolvedValueOnce(undefined); const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true)); await act(async () => { await result.current.claimReward('tv'); }); const id = result.current.rewardRequests[0]!.requestId; const operation = result.current.rewardRequests[0]!.debitOperationId; expect(result.current.rewardRequests[0]!.status).toBe('debit_pending'); await act(async () => { await result.current.retryDebit(id); }); expect(tokens.spend.mock.calls.map((call) => call[2])).toEqual([operation, operation]); expect(result.current.rewardRequests[0]!.status).toBe('pending_approval'); });
  it('serializes duplicate claims and keeps approval distinct from fulfillment', async () => { const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true)); await act(async () => { await Promise.all([result.current.claimReward('tv'), result.current.claimReward('tv')]); }); expect(tokens.spend).toHaveBeenCalledOnce(); const id = result.current.rewardRequests[0]!.requestId; await act(async () => { await result.current.approveRequest(id); }); expect(result.current.rewardRequests[0]!.status).toBe('approved'); await act(async () => { await result.current.fulfillRequest(id); }); expect(result.current.rewardRequests[0]!.status).toBe('fulfilled'); });
  it('persists refund pending before a stable-id refund retry', async () => { const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true)); await act(async () => { await result.current.claimReward('tv'); }); const id = result.current.rewardRequests[0]!.requestId; tokens.earn.mockResolvedValueOnce(false).mockResolvedValueOnce(true); await act(async () => { await result.current.denyRequest(id); }); const operation = result.current.rewardRequests[0]!.refundOperationId; expect(result.current.rewardRequests[0]!.status).toBe('refund_pending'); await act(async () => { await result.current.retryRefund(id); }); expect(tokens.earn.mock.calls.map((call) => call[2])).toEqual([operation, operation]); expect(result.current.rewardRequests[0]!.status).toBe('denied'); });
  it('fails closed when legacy reward rows have no debit proof', async () => { store.getRewardRequests.mockRejectedValue(new Error('Legacy reward claims require parent review')); const { result } = setup(); await vi.waitFor(() => expect(result.current.error).toMatch(/Legacy reward claims/)); await act(async () => { await result.current.claimReward('tv'); }); expect(tokens.spend).not.toHaveBeenCalled(); });
  it('retries a reloaded debit intent with its stored operation id', async () => {
    const request = { schemaVersion: 1 as const, requestId: 'request-1', reward: catalog[0]!, createdAt: 1, updatedAt: 1, status: 'debit_pending' as const, debitOperationId: 'reward-debit:request-1', refundOperationId: 'reward-refund:request-1' };
    store.getRewardRequests.mockResolvedValue([request]); const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => { await result.current.retryDebit(request.requestId); });
    expect(tokens.spend).toHaveBeenCalledWith(50, expect.any(String), 'reward-debit:request-1');
  });
  it('retries a reloaded refund intent with its stored operation id', async () => {
    const request = { schemaVersion: 1 as const, requestId: 'request-1', reward: catalog[0]!, createdAt: 1, updatedAt: 1, status: 'refund_pending' as const, debitOperationId: 'reward-debit:request-1', refundOperationId: 'reward-refund:request-1' };
    store.getRewardRequests.mockResolvedValue([request]); const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => { await result.current.retryRefund(request.requestId); });
    expect(tokens.earn).toHaveBeenCalledWith(50, expect.any(String), 'reward-refund:request-1');
  });
  it('does not write or debit when secure UUID generation is unavailable', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
    try { const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true)); await act(async () => { await result.current.claimReward('tv'); }); expect(store.saveRewardRequests).not.toHaveBeenCalled(); expect(tokens.spend).not.toHaveBeenCalled(); }
    finally { if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor); else Reflect.deleteProperty(globalThis, 'crypto'); }
  });
  it('leaves a saved debit intent pending when token spend is rejected', async () => {
    tokens.spend.mockResolvedValue(false); const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => { await result.current.claimReward('tv'); });
    expect(result.current.rewardRequests[0]!.status).toBe('debit_pending');
  });
  it('retains pending approval when approval persistence fails', async () => {
    store.getRewardRequests.mockResolvedValue([request('approve', 'pending_approval')]); store.saveRewardRequests.mockRejectedValueOnce(new Error('write'));
    const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true)); await act(async () => { await result.current.approveRequest('approve'); }); expect(result.current.rewardRequests[0]!.status).toBe('pending_approval');
  });
  it('retains approved when fulfillment persistence fails', async () => {
    store.getRewardRequests.mockResolvedValue([request('fulfill', 'approved')]); store.saveRewardRequests.mockRejectedValueOnce(new Error('write'));
    const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true)); await act(async () => { await result.current.fulfillRequest('fulfill'); }); expect(result.current.rewardRequests[0]!.status).toBe('approved');
  });
  it('does not refund when the initial denial transition cannot persist', async () => {
    store.getRewardRequests.mockResolvedValue([request('deny', 'pending_approval')]); store.saveRewardRequests.mockRejectedValueOnce(new Error('write'));
    const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true)); await act(async () => { await result.current.denyRequest('deny'); });
    expect(result.current.rewardRequests[0]!.status).toBe('pending_approval'); expect(tokens.earn).not.toHaveBeenCalled();
  });
  it('allows an approved request to be denied and refunded', async () => {
    store.getRewardRequests.mockResolvedValue([request('approved', 'approved')]); const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => { await result.current.denyRequest('approved'); }); expect(tokens.earn).toHaveBeenCalledWith(50, expect.any(String), 'reward-refund:approved'); expect(result.current.rewardRequests[0]!.status).toBe('denied');
  });
  it('does not publish a catalog when storage rejects it', async () => {
    store.saveRewards.mockRejectedValueOnce(new Error('write')); const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => { await result.current.updateRewards([{ id: 'game', name: 'Game', cost: 10 }]); }); expect(result.current.rewards).toEqual(catalog);
  });
  it('blocks every public mutation after unsafe reward storage is detected', async () => {
    store.getRewardRequests.mockRejectedValueOnce(new Error('malformed')); const { result } = setup(); await vi.waitFor(() => expect(result.current.blocked).toBe(true));
    await act(async () => { expect(await result.current.claimReward('tv')).toBe(false); expect(await result.current.retryDebit('x')).toBe(false); expect(await result.current.approveRequest('x')).toBe(false); expect(await result.current.denyRequest('x')).toBe(false); expect(await result.current.retryRefund('x')).toBe(false); expect(await result.current.fulfillRequest('x')).toBe(false); expect(await result.current.updateRewards([])).toBe(false); });
    expect(store.saveRewardRequests).not.toHaveBeenCalled(); expect(tokens.spend).not.toHaveBeenCalled(); expect(tokens.earn).not.toHaveBeenCalled();
  });
  it('rejects a new request when all 100 durable records are active', async () => {
    store.getRewardRequests.mockResolvedValue(Array.from({ length: 100 }, (_, index) => request(`active-${index}`, 'pending_approval', 1, { id: `other-${index}`, name: 'Other', cost: 1 }))); const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => { await result.current.claimReward('tv'); }); expect(store.saveRewardRequests).not.toHaveBeenCalled(); expect(tokens.spend).not.toHaveBeenCalled();
  });
  it('keeps all active requests and the newest terminal history when pruning before an append', async () => {
    const active = request('active', 'pending_approval', 1, { id: 'other', name: 'Other', cost: 1 });
    const terminal = Array.from({ length: 99 }, (_, index) => request(`terminal-${index}`, 'fulfilled', index + 2));
    store.getRewardRequests.mockResolvedValue([active, ...terminal]); const { result } = setup(); await vi.waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => { await result.current.claimReward('tv'); });
    const firstSaved = store.saveRewardRequests.mock.calls[0]![0]; expect(firstSaved).toHaveLength(100); expect(firstSaved.some((item) => item.requestId === 'active')).toBe(true); expect(firstSaved.some((item) => item.requestId === 'terminal-0')).toBe(false); expect(firstSaved.some((item) => item.requestId === 'terminal-98')).toBe(true);
  });
});
