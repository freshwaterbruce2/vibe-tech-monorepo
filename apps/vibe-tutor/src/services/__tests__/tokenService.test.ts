import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetTokenServiceForTests, earnTokens, getRecentTransactions, getTokenBalance, getTokenStats, initializeTokenLedger, spendTokens, subscribeToTokenChanges } from '../tokenService';

beforeEach(() => { window.localStorage.clear(); __resetTokenServiceForTests(); });

describe('tokenService durable v3 ledger', () => {
  it('creates one bounded canonical v3 record', async () => {
    await initializeTokenLedger();
    const raw = window.localStorage.getItem('vibetutor_token_ledger_v3');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ version: 3, balance: 0, transactions: [], appliedOperationIds: [] });
  });
  it('persists before it publishes a confirmed mutation', async () => {
    const listener = vi.fn(() => expect(getTokenBalance()).toBe(25));
    subscribeToTokenChanges(listener);
    const result = await earnTokens(25, 'Homework complete', 'homework:item-1');
    expect(result).toMatchObject({ ok: true, duplicate: false });
    expect(listener).toHaveBeenCalledOnce();
    expect(getTokenStats()).toMatchObject({ balance: 25, totalEarned: 25, totalSpent: 0 });
  });
  it('is idempotent for a stable operation ID', async () => {
    await earnTokens(10, 'Daily challenge', 'daily:2026-08-24');
    const duplicate = await earnTokens(10, 'Daily challenge', 'daily:2026-08-24');
    expect(duplicate).toMatchObject({ ok: true, duplicate: true });
    expect(getTokenBalance()).toBe(10);
    expect(getRecentTransactions()).toHaveLength(1);
  });
  it('serializes concurrent spending and never overdrafts', async () => {
    await earnTokens(10, 'Seed', 'seed');
    const [first, second] = await Promise.all([spendTokens(8, 'One', 'spend:one'), spendTokens(8, 'Two', 'spend:two')]);
    expect([first.ok, second.ok]).toEqual([true, false]);
    expect(getTokenBalance()).toBe(2);
  });
  it('rejects malformed canonical state instead of silently resetting it', async () => {
    window.localStorage.setItem('vibetutor_token_ledger_v3', '{bad');
    await expect(initializeTokenLedger()).rejects.toThrow('Token ledger is malformed');
  });
  it('migrates legacy userTokens once and never reimports after v3 exists', async () => {
    window.localStorage.setItem('userTokens', '40');
    await initializeTokenLedger();
    expect(getTokenBalance()).toBe(40);
    __resetTokenServiceForTests();
    window.localStorage.setItem('userTokens', '99');
    await initializeTokenLedger();
    expect(getTokenBalance()).toBe(40);
  });
  it('does not treat student_points as VibeBux', async () => {
    window.localStorage.setItem('student_points', '999');
    await initializeTokenLedger();
    expect(getTokenBalance()).toBe(0);
  });
  it('retains a pruned operation ID as an idempotent replay without re-crediting it', async () => {
    for (let index = 0; index <= 200; index += 1) {
      await earnTokens(1, 'Bounded history', `bounded:${index}`);
    }
    const replay = await earnTokens(1, 'Bounded history', 'bounded:0');
    expect(replay).toMatchObject({ ok: true, duplicate: true, transaction: null });
    expect(getTokenBalance()).toBe(201);
    expect(getRecentTransactions(200)).toHaveLength(200);
  });
  it('rejects a conflicting replay after the original transaction is pruned', async () => {
    for (let index = 0; index <= 200; index += 1) await earnTokens(1, 'Bounded history', `pruned-conflict:${index}`);
    expect(await spendTokens(1, 'Different mutation', 'pruned-conflict:0')).toMatchObject({ ok: false, reason: 'invalid_amount' });
    expect(getTokenBalance()).toBe(201);
  });
  it('migrates known v3 fingerprints and blocks an unknown retained legacy ID', async () => {
    window.localStorage.setItem('vibetutor_token_ledger_v3', JSON.stringify({ version: 3, balance: 3, totalEarned: 3, totalSpent: 0, updatedAt: 1, transactions: [{ id: 'known', type: 'earn', amount: 3, reason: 'Known', relatedId: 'known', timestamp: 1 }], appliedOperationIds: ['unknown', 'known'] }));
    await initializeTokenLedger();
    expect(await earnTokens(3, 'Known', 'known')).toMatchObject({ ok: true, duplicate: true });
    expect(await earnTokens(1, 'Cannot establish equality', 'unknown')).toMatchObject({ ok: false, reason: 'invalid_amount' });
  });
  it('rejects present operation fingerprints that omit or mismatch retained transactions', async () => {
    const base = { version: 3, balance: 3, totalEarned: 3, totalSpent: 0, updatedAt: 1, transactions: [{ id: 'known', type: 'earn', amount: 3, reason: 'Known', relatedId: 'related:known', timestamp: 1 }], appliedOperationIds: ['known'] };
    window.localStorage.setItem('vibetutor_token_ledger_v3', JSON.stringify({ ...base, operationFingerprints: [] }));
    await expect(initializeTokenLedger()).rejects.toThrow('Token ledger is malformed');

    __resetTokenServiceForTests();
    window.localStorage.setItem('vibetutor_token_ledger_v3', JSON.stringify({ ...base, operationFingerprints: [{ id: 'known', type: 'earn', amount: 3, reason: 'Known', relatedId: 'other:related' }] }));
    await expect(initializeTokenLedger()).rejects.toThrow('Token ledger is malformed');
  });
  it('immediately rewrites legacy v3 state with reconstructed operation fingerprints', async () => {
    window.localStorage.setItem('vibetutor_token_ledger_v3', JSON.stringify({ version: 3, balance: 3, totalEarned: 3, totalSpent: 0, updatedAt: 1, transactions: [{ id: 'known', type: 'earn', amount: 3, reason: 'Known', relatedId: 'related:known', timestamp: 1 }], appliedOperationIds: ['known'] }));
    await initializeTokenLedger();
    const rewritten = JSON.parse(window.localStorage.getItem('vibetutor_token_ledger_v3') ?? '{}');
    expect(rewritten.operationFingerprints).toEqual([{ id: 'known', type: 'earn', amount: 3, reason: 'Known', relatedId: 'related:known' }]);
  });
  it('rejects a conflicting replay for a retained operation ID', async () => {
    await earnTokens(10, 'Daily challenge', 'daily:conflict');
    const conflict = await spendTokens(10, 'Different operation', 'daily:conflict');
    expect(conflict).toMatchObject({ ok: false, reason: 'invalid_amount' });
    expect(getTokenBalance()).toBe(10);
  });
  it('migrates a complete valid v2 ledger and fails closed on malformed-present v2 data', async () => {
    window.localStorage.setItem('vibetutor_token_state_v2', JSON.stringify({ version: 2, balance: 6, totalEarned: 10, totalSpent: 4, updatedAt: 1 }));
    window.localStorage.setItem('vibetutor_token_transactions_v2', JSON.stringify([
      { id: 'v2:earn', type: 'earn', amount: 10, reason: 'Seed', timestamp: 1 },
      { id: 'v2:spend', type: 'spend', amount: 4, reason: 'Use', timestamp: 2 },
    ]));
    await initializeTokenLedger();
    expect(getTokenStats()).toMatchObject({ balance: 6, totalEarned: 10, totalSpent: 4 });

    window.localStorage.clear();
    __resetTokenServiceForTests();
    window.localStorage.setItem('vibetutor_token_state_v2', JSON.stringify({ version: 2, balance: 1 }));
    await expect(initializeTokenLedger()).rejects.toThrow('Legacy token ledger is malformed');
  });
  it('normalizes a legacy null relatedId at the persistence boundary', async () => {
    window.localStorage.setItem('vibetutor_token_ledger_v3', JSON.stringify({
      version: 3, balance: 5, totalEarned: 5, totalSpent: 0, updatedAt: 1,
      transactions: [{ id: 'legacy:null-related', type: 'earn', amount: 5, reason: 'Legacy', relatedId: null, timestamp: 1 }],
      appliedOperationIds: ['legacy:null-related'],
    }));
    await initializeTokenLedger();
    expect(getRecentTransactions(1)[0]).toMatchObject({ id: 'legacy:null-related', relatedId: undefined });
  });
  it('rejects impossible ledger invariants and unsafe integer mutation overflow', async () => {
    window.localStorage.setItem('vibetutor_token_ledger_v3', JSON.stringify({
      version: 3, balance: 4, totalEarned: 3, totalSpent: 0, updatedAt: 1, transactions: [], appliedOperationIds: [],
    }));
    await expect(initializeTokenLedger()).rejects.toThrow('Token ledger is malformed');

    window.localStorage.clear();
    __resetTokenServiceForTests();
    window.localStorage.setItem('vibetutor_token_ledger_v3', JSON.stringify({
      version: 3, balance: Number.MAX_SAFE_INTEGER, totalEarned: Number.MAX_SAFE_INTEGER, totalSpent: 0, updatedAt: 1, transactions: [], appliedOperationIds: [],
    }));
    const overflow = await earnTokens(1, 'Overflow', 'overflow:one');
    expect(overflow).toMatchObject({ ok: false, reason: 'invalid_amount' });
    expect(getTokenBalance()).toBe(Number.MAX_SAFE_INTEGER);
  });
});
