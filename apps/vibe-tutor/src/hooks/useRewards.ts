import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { SetStateAction } from 'react';
import { dataStore } from '../services/dataStore';
import { MAX_REWARD_REQUESTS, type Reward, type RewardRequest, type RewardRequestStatus } from '../types';

const ACTIVE = new Set<RewardRequestStatus>(['debit_pending', 'pending_approval', 'approved', 'refund_pending']);
type TokenEffect = (amount: number, reason: string, operationId: string) => Promise<boolean>;
interface RewardsState { rewards: Reward[]; requests: RewardRequest[]; loaded: boolean; blocked: boolean; error: string | null; }
interface Action { type: 'replace'; payload: Omit<RewardsState, 'loaded'> }
const reducer = (_: RewardsState, action: Action): RewardsState => ({ ...action.payload, loaded: true });
const message = (error: unknown) => error instanceof Error ? error.message : 'The reward change could not be saved.';
const validReward = (value: Reward | undefined): value is Reward => Boolean(value && typeof value.id === 'string' && value.id && typeof value.name === 'string' && value.name.trim() && Number.isSafeInteger(value.cost) && value.cost > 0);
const requestId = () => {
  if (!globalThis.crypto || typeof globalThis.crypto.randomUUID !== 'function') throw new Error('Secure request IDs are unavailable on this device.');
  return globalThis.crypto.randomUUID();
};

export const useRewards = ({ onSpendTokens, onEarnTokens }: { onSpendTokens: TokenEffect; onEarnTokens: TokenEffect }) => {
  const [state, dispatch] = useReducer(reducer, { rewards: [], requests: [], loaded: false, blocked: false, error: null });
  const current = useRef(state); current.current = state;
  const serial = useRef(Promise.resolve());
  const run = useCallback(async <T,>(work: () => Promise<T>) => { const next = serial.current.then(work, work); serial.current = next.then(() => undefined, () => undefined); return next; }, []);
  const publish = useCallback((rewards: Reward[], requests: RewardRequest[], error: string | null, blocked = false) => { current.current = { rewards, requests, loaded: true, error, blocked }; dispatch({ type: 'replace', payload: { rewards, requests, error, blocked } }); }, []);
  const saveRequests = useCallback(async (requests: RewardRequest[]) => { await dataStore.saveRewardRequests(requests); }, []);

  useEffect(() => { void run(async () => { try { publish(await dataStore.getRewards(), await dataStore.getRewardRequests(), null); } catch (error) { publish([], [], `Reward requests are unavailable: ${message(error)}`, true); } }); }, [publish, run]);

  const retryDebit = useCallback(async (id: string) => run(async () => {
    const { rewards, requests, blocked } = current.current; if (blocked) return false; const record = requests.find((item) => item.requestId === id);
    if (record?.status !== 'debit_pending') return false;
    const spent = await onSpendTokens(record.reward.cost, `Reward request: ${record.reward.name}`, record.debitOperationId).catch(() => false);
    if (!spent) { publish(rewards, requests, 'Token debit was not accepted. Retry this request after checking the token balance.'); return false; }
    const updated = requests.map((item) => item.requestId === id ? { ...item, status: 'pending_approval' as const, updatedAt: Date.now() } : item);
    try { await saveRequests(updated); publish(rewards, updated, null); return true; } catch (error) { publish(rewards, requests, `Tokens were debited but approval state was not saved. Retry uses the same debit record: ${message(error)}`); return false; }
  }), [onSpendTokens, publish, run, saveRequests]);

  const claimReward = useCallback(async (rewardId: string) => run(async () => {
    const { rewards, requests, loaded, blocked } = current.current;
    if (!loaded || blocked) return false;
    const reward = rewards.find((item) => item.id === rewardId);
    if (!validReward(reward)) { publish(rewards, requests, 'That reward is no longer valid.'); return false; }
    if (requests.some((item) => item.reward.id === rewardId && ACTIVE.has(item.status))) { publish(rewards, requests, 'That reward already has an active request.'); return false; }
    const now = Date.now(); let id: string;
    try { id = requestId(); } catch (error) { publish(rewards, requests, message(error)); return false; }
    const pending: RewardRequest = { schemaVersion: 1, requestId: id, reward: { ...reward }, createdAt: now, updatedAt: now, status: 'debit_pending', debitOperationId: `reward-debit:${id}`, refundOperationId: `reward-refund:${id}` };
    const active = requests.filter((item) => ACTIVE.has(item.status));
    const terminal = requests.filter((item) => !ACTIVE.has(item.status)).sort((a, b) => b.updatedAt - a.updatedAt);
    const room = requests.length < MAX_REWARD_REQUESTS ? requests : active.length >= MAX_REWARD_REQUESTS ? null : [...active, ...terminal.slice(0, Math.max(0, MAX_REWARD_REQUESTS - active.length - 1))];
    if (!room) { publish(rewards, requests, 'Reward history is full; resolve active requests before making another request.'); return false; }
    const withIntent = [...room, pending];
    try { await saveRequests(withIntent); publish(rewards, withIntent, null); } catch (error) { publish(rewards, requests, `Reward request was not saved: ${message(error)}`); return false; }
    const spent = await onSpendTokens(pending.reward.cost, `Reward request: ${pending.reward.name}`, pending.debitOperationId).catch(() => false);
    if (!spent) { publish(rewards, withIntent, 'Token debit was not accepted. Retry this request after checking the token balance.'); return false; }
    const approved = withIntent.map((item) => item.requestId === id ? { ...item, status: 'pending_approval' as const, updatedAt: Date.now() } : item);
    try { await saveRequests(approved); publish(rewards, approved, null); return true; } catch (error) { publish(rewards, withIntent, `Tokens were debited but approval state was not saved. Retry uses the same debit record: ${message(error)}`); return false; }
  }), [onSpendTokens, publish, run, saveRequests]);
  const approveRequest = useCallback(async (id: string) => run(async () => {
    const { rewards, requests, blocked } = current.current; if (blocked) return false; const record = requests.find((item) => item.requestId === id);
    if (record?.status !== 'pending_approval') return false;
    const updated = requests.map((item) => item.requestId === id ? { ...item, status: 'approved' as const, updatedAt: Date.now() } : item);
    try { await saveRequests(updated); publish(rewards, updated, null); return true; } catch (error) { publish(rewards, requests, `Approval was not saved: ${message(error)}`); return false; }
  }), [publish, run, saveRequests]);
  const fulfillRequest = useCallback(async (id: string) => run(async () => {
    const { rewards, requests, blocked } = current.current; if (blocked) return false; const record = requests.find((item) => item.requestId === id);
    if (record?.status !== 'approved') return false;
    const updated = requests.map((item) => item.requestId === id ? { ...item, status: 'fulfilled' as const, updatedAt: Date.now() } : item);
    try { await saveRequests(updated); publish(rewards, updated, null); return true; } catch (error) { publish(rewards, requests, `Fulfillment was not saved: ${message(error)}`); return false; }
  }), [publish, run, saveRequests]);
  const retryRefund = useCallback(async (id: string) => run(async () => {
    const { rewards, requests, blocked } = current.current; if (blocked) return false; const record = requests.find((item) => item.requestId === id);
    if (record?.status !== 'refund_pending') return false;
    const refunded = await onEarnTokens(record.reward.cost, `Reward request refund: ${record.reward.name}`, record.refundOperationId).catch(() => false);
    if (!refunded) { publish(rewards, requests, 'Refund was not accepted. Retry this request.'); return false; }
    const updated = requests.map((item) => item.requestId === id ? { ...item, status: 'denied' as const, updatedAt: Date.now() } : item);
    try { await saveRequests(updated); publish(rewards, updated, null); return true; } catch (error) { publish(rewards, requests, `Refund was issued but denial state was not saved. Retry uses the same refund record: ${message(error)}`); return false; }
  }), [onEarnTokens, publish, run, saveRequests]);
  const denyRequest = useCallback(async (id: string) => run(async () => {
    const { rewards, requests, blocked } = current.current; if (blocked) return false; const record = requests.find((item) => item.requestId === id);
    if (!record || (record.status !== 'pending_approval' && record.status !== 'approved')) return false;
    const pending = requests.map((item) => item.requestId === id ? { ...item, status: 'refund_pending' as const, updatedAt: Date.now() } : item);
    try { await saveRequests(pending); publish(rewards, pending, null); } catch (error) { publish(rewards, requests, `Denial was not saved: ${message(error)}`); return false; }
    const refunded = await onEarnTokens(record.reward.cost, `Reward request refund: ${record.reward.name}`, record.refundOperationId).catch(() => false);
    if (!refunded) { publish(rewards, pending, 'Refund was not accepted. Retry this request.'); return false; }
    const denied = pending.map((item) => item.requestId === id ? { ...item, status: 'denied' as const, updatedAt: Date.now() } : item);
    try { await saveRequests(denied); publish(rewards, denied, null); return true; } catch (error) { publish(rewards, pending, `Refund was issued but denial state was not saved. Retry uses the same refund record: ${message(error)}`); return false; }
  }), [onEarnTokens, publish, run, saveRequests]);
  const updateRewards = useCallback(async (action: SetStateAction<Reward[]>) => run(async () => {
    const { rewards, requests, blocked } = current.current; if (blocked) return false; const next = typeof action === 'function' ? action(rewards) : action;
    if (!Array.isArray(next) || next.some((item) => !validReward(item)) || new Set(next.map((item) => item.id)).size !== next.length) { publish(rewards, requests, 'The reward catalog is invalid.'); return false; }
    try { await dataStore.saveRewards(next); publish(next, requests, null); return true; } catch (error) { publish(rewards, requests, `Reward catalog was not saved: ${message(error)}`); return false; }
  }), [publish, run]);
  return { rewards: state.rewards, claimedRewards: state.requests, rewardRequests: state.requests, error: state.error, blocked: state.blocked, loaded: state.loaded, claimReward, retryDebit, approveRequest, denyRequest, retryRefund, fulfillRequest, updateRewards };
};
