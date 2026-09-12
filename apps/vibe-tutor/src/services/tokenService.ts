/** Durable, single-record VibeBux ledger. */
import { Capacitor } from '@capacitor/core';
import { dataStore } from './dataStore';
import { appStore } from '../utils/electronStore';

const TOKEN_STATE_KEY = 'vibetutor_token_ledger_v3';
const MAX_TRANSACTIONS = 200,
  MAX_OPERATION_IDS = 500,
  MAX_REASON_LENGTH = 160,
  MAX_OPERATION_ID_LENGTH = 160;
export interface TokenBalance {
  balance: number; totalEarned: number; totalSpent: number; updatedAt: number;
}
export interface TokenTransaction { id: string; type: 'earn' | 'spend'; amount: number; reason: string; relatedId?: string; timestamp: number; }
interface OperationFingerprint { id: string; type: 'earn' | 'spend'; amount: number; reason: string; relatedId?: string; }
interface TokenLedger extends TokenBalance {
  version: 3; transactions: TokenTransaction[]; appliedOperationIds: string[];
  operationFingerprints: OperationFingerprint[];
}
export type TokenMutationResult =
  | {
    ok: true;
    transaction: TokenTransaction | null;
    balance: TokenBalance;
    duplicate: boolean;
  }
  | {
    ok: false;
    reason: 'invalid_amount' | 'insufficient_funds' | 'persistence_failed' | 'not_initialized';
    balance: TokenBalance;
  };
const emptyLedger = (): TokenLedger => ({
  version: 3, balance: 0, totalEarned: 0, totalSpent: 0, updatedAt: Date.now(),
  transactions: [], appliedOperationIds: [], operationFingerprints: [],
});
let ledger: TokenLedger | null = null,
  initialization: Promise<void> | null = null,
  mutationQueue: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();
const integer = (value: unknown, positive = false): number | null => typeof value === 'number' && Number.isSafeInteger(value) && value >= (positive ? 1 : 0) ? value : null;
const text = (value: unknown, max: number): string | null => typeof value === 'string' && value.trim().length > 0 && value.length <= max ? value.trim() : null;
const snapshot = (state: TokenLedger | null = ledger): TokenBalance => state
  ? {
    balance: state.balance,
    totalEarned: state.totalEarned,
    totalSpent: state.totalSpent,
    updatedAt: state.updatedAt,
  }
  : { balance: 0, totalEarned: 0, totalSpent: 0, updatedAt: 0 };
function parseTransaction(value: unknown): TokenTransaction | null { if (!value || typeof value !== 'object') return null; const item = value as Record<string, unknown>; const id = text(item.id, MAX_OPERATION_ID_LENGTH), amount = integer(item.amount, true), reason = text(item.reason, MAX_REASON_LENGTH), timestamp = integer(item.timestamp); if (!id || !amount || !reason || timestamp === null || (item.type !== 'earn' && item.type !== 'spend')) return null; const parsedRelatedId = item.relatedId === undefined || item.relatedId === null ? undefined : text(item.relatedId, MAX_OPERATION_ID_LENGTH); if (item.relatedId !== undefined && item.relatedId !== null && !parsedRelatedId) return null; const relatedId = parsedRelatedId ?? undefined; return { id, type: item.type, amount, reason, relatedId, timestamp }; }
function fingerprint(transaction: Pick<TokenTransaction, 'id' | 'type' | 'amount' | 'reason' | 'relatedId'>): OperationFingerprint { return { id: transaction.id, type: transaction.type, amount: transaction.amount, reason: transaction.reason, ...(transaction.relatedId ? { relatedId: transaction.relatedId } : {}) }; }
function parseFingerprint(value: unknown): OperationFingerprint | null {
  const parsed = parseTransaction({ ...(value as object), timestamp: 0 });
  return parsed ? fingerprint(parsed) : null;
}
function parseLedger(value: unknown): TokenLedger | null { if (!value || typeof value !== 'object') return null; const item = value as Record<string, unknown>; const balance = integer(item.balance), totalEarned = integer(item.totalEarned), totalSpent = integer(item.totalSpent), updatedAt = integer(item.updatedAt); if (item.version !== 3 || balance === null || totalEarned === null || totalSpent === null || updatedAt === null || totalEarned < balance || totalEarned - totalSpent !== balance || !Array.isArray(item.transactions) || !Array.isArray(item.appliedOperationIds) || item.transactions.length > MAX_TRANSACTIONS || item.appliedOperationIds.length > MAX_OPERATION_IDS) return null; const transactions = item.transactions.map(parseTransaction), ids = item.appliedOperationIds.map((id) => text(id, MAX_OPERATION_ID_LENGTH)); if (transactions.some((v): v is null => v === null) || ids.some((v): v is null => v === null)) return null; const typedTransactions = transactions as TokenTransaction[], typedIds = ids as string[]; if (new Set(typedIds).size !== typedIds.length || new Set(typedTransactions.map((transaction) => transaction.id)).size !== typedTransactions.length || typedTransactions.some((transaction) => !typedIds.includes(transaction.id))) return null; const rawFingerprints = item.operationFingerprints === undefined ? typedTransactions.map(fingerprint) : Array.isArray(item.operationFingerprints) ? item.operationFingerprints.map(parseFingerprint) : null; if (!rawFingerprints || rawFingerprints.some((entry): entry is null => entry === null) || rawFingerprints.length > MAX_OPERATION_IDS) return null; const operationFingerprints = rawFingerprints as OperationFingerprint[]; const equal = (left: OperationFingerprint, right: OperationFingerprint) => left.id === right.id && left.type === right.type && left.amount === right.amount && left.reason === right.reason && left.relatedId === right.relatedId; if (new Set(operationFingerprints.map((entry) => entry.id)).size !== operationFingerprints.length || operationFingerprints.some((entry) => !typedIds.includes(entry.id)) || (item.operationFingerprints !== undefined && typedTransactions.some((transaction) => { const found = operationFingerprints.find((entry) => entry.id === transaction.id); return !found || !equal(fingerprint(transaction), found); }))) return null; return { version: 3, balance, totalEarned, totalSpent, updatedAt, transactions: typedTransactions, appliedOperationIds: typedIds, operationFingerprints }; }
function parseV2(stateValue: unknown, transactionsValue: unknown): TokenLedger | null { if (!stateValue || typeof stateValue !== 'object') return null; const state = stateValue as Record<string, unknown>; const balance = integer(state.balance), totalEarned = integer(state.totalEarned), totalSpent = integer(state.totalSpent), updatedAt = integer(state.updatedAt); if (state.version !== 2 || balance === null || totalEarned === null || totalSpent === null || updatedAt === null || totalEarned < balance || totalEarned - totalSpent !== balance || !Array.isArray(transactionsValue)) return null; const transactions = transactionsValue.map(parseTransaction); if (transactions.some((v): v is null => v === null) || transactions.length > MAX_TRANSACTIONS) return null; const typed = transactions as TokenTransaction[]; const ids = typed.map((transaction) => transaction.id); if (new Set(ids).size !== ids.length) return null; return { version: 3, balance, totalEarned, totalSpent, updatedAt, transactions: typed, appliedOperationIds: ids.slice(-MAX_OPERATION_IDS), operationFingerprints: typed.map(fingerprint).slice(-MAX_OPERATION_IDS) }; }
function legacyNumber(value: unknown): number | null { if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value; if (typeof value === 'string' && /^\d+$/.test(value)) { const parsed = Number(value); return Number.isSafeInteger(parsed) ? parsed : null; } return value && typeof value === 'object' ? legacyNumber((value as Record<string, unknown>).balance) : null; }
async function readCanonical(): Promise<string> { if (Capacitor.getPlatform() === 'android') return dataStore.getUserSettings(TOKEN_STATE_KEY); const value = appStore.getStrict<unknown>(TOKEN_STATE_KEY); return value === null ? '' : typeof value === 'string' ? value : JSON.stringify(value); }
async function persist(state: TokenLedger): Promise<void> { const serialized = JSON.stringify(state); if (Capacitor.getPlatform() === 'android') await dataStore.saveUserSettings(TOKEN_STATE_KEY, serialized); else appStore.setStrict(TOKEN_STATE_KEY, serialized); }
function publish(): void {
  for (const listener of listeners) {
    try { listener(); } catch { /* isolated */ }
  }
}
export async function initializeTokenLedger(): Promise<void> { if (ledger) return; if (initialization) return initialization; initialization = (async () => { const raw = await readCanonical(); if (raw) { let decoded: unknown; try { decoded = JSON.parse(raw); } catch { throw new Error('Token ledger is malformed'); } const parsed = parseLedger(decoded); if (!parsed) throw new Error('Token ledger is malformed'); if (!Array.isArray((decoded as Record<string, unknown>).operationFingerprints)) await persist(parsed); ledger = parsed; return; } const v2State = appStore.getStrict<unknown>('vibetutor_token_state_v2'); const v2Transactions = appStore.getStrict<unknown>('vibetutor_token_transactions_v2'); if (v2State !== null || v2Transactions !== null) { const migrated = parseV2(v2State, v2Transactions); if (!migrated) throw new Error('Legacy token ledger is malformed'); await persist(migrated); ledger = migrated; return; } const legacyValues: unknown[] = [appStore.getStrict<unknown>('vibetutor_tokens'), appStore.getStrict<unknown>('userTokens'), appStore.getStrict<unknown>('user_tokens')]; if (Capacitor.getPlatform() === 'android') legacyValues.push(await dataStore.getUserSettings('userTokens'), await dataStore.getUserSettings('user_tokens')); const balance = Math.max(0, ...legacyValues.map(legacyNumber).filter((value): value is number => value !== null)); const next = emptyLedger(); next.balance = balance; next.totalEarned = balance; await persist(next); ledger = next; })().finally(() => { initialization = null; }); return initialization; }
async function mutate(type: 'earn' | 'spend', amount: number, reason: string, operationId: string): Promise<TokenMutationResult> { const normalizedAmount = integer(amount, true), safeReason = text(reason, MAX_REASON_LENGTH), safeOperationId = text(operationId, MAX_OPERATION_ID_LENGTH); if (!normalizedAmount || !safeReason || !safeOperationId) return { ok: false, reason: 'invalid_amount', balance: snapshot() }; try { await initializeTokenLedger(); } catch { return { ok: false, reason: 'not_initialized', balance: snapshot() }; } let result: TokenMutationResult = { ok: false, reason: 'persistence_failed', balance: snapshot() }; const work = mutationQueue.then(async () => { if (!ledger) { result = { ok: false, reason: 'not_initialized', balance: snapshot() }; return; } const existing = ledger.transactions.find((transaction) => transaction.id === safeOperationId); if (ledger.appliedOperationIds.includes(safeOperationId)) { const known = ledger.operationFingerprints.find((entry) => entry.id === safeOperationId); if (known?.type !== type || known.amount !== normalizedAmount || known.reason !== safeReason) { result = { ok: false, reason: 'invalid_amount', balance: snapshot() }; return; } result = { ok: true, transaction: existing ?? null, balance: snapshot(), duplicate: true }; return; } if (type === 'spend' && ledger.balance < normalizedAmount) { result = { ok: false, reason: 'insufficient_funds', balance: snapshot() }; return; } const now = Date.now(), transaction: TokenTransaction = { id: safeOperationId, type, amount: normalizedAmount, reason: safeReason, relatedId: safeOperationId, timestamp: now }; const nextBalance = ledger.balance + (type === 'earn' ? normalizedAmount : -normalizedAmount), nextEarned = ledger.totalEarned + (type === 'earn' ? normalizedAmount : 0), nextSpent = ledger.totalSpent + (type === 'spend' ? normalizedAmount : 0); if (!Number.isSafeInteger(nextBalance) || !Number.isSafeInteger(nextEarned) || !Number.isSafeInteger(nextSpent)) { result = { ok: false, reason: 'invalid_amount', balance: snapshot() }; return; } const next: TokenLedger = { ...ledger, balance: nextBalance, totalEarned: nextEarned, totalSpent: nextSpent, updatedAt: now, transactions: [...ledger.transactions, transaction].slice(-MAX_TRANSACTIONS), appliedOperationIds: [...ledger.appliedOperationIds, safeOperationId].slice(-MAX_OPERATION_IDS), operationFingerprints: [...ledger.operationFingerprints, fingerprint(transaction)].slice(-MAX_OPERATION_IDS) }; try { await persist(next); } catch { result = { ok: false, reason: 'persistence_failed', balance: snapshot() }; return; } ledger = next; result = { ok: true, transaction, balance: snapshot(), duplicate: false }; publish(); }); mutationQueue = work.catch(() => undefined); await work; return result; }
export const subscribeToTokenChanges = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getTokenBalance = (): number => ledger?.balance ?? 0;
export const getTokenStats = (): TokenBalance => snapshot();
export const getRecentTransactions = (limit = 10): TokenTransaction[] => (
  [...(ledger?.transactions ?? [])].reverse().slice(0, Math.max(1, Math.floor(limit)))
);
export const getTransactionsByType = (type: TokenTransaction['type'], limit = 20): TokenTransaction[] => getRecentTransactions(MAX_TRANSACTIONS).filter((transaction) => transaction.type === type).slice(0, Math.max(1, Math.floor(limit)));
export const getTodayEarnings = (): number => getRecentTransactions(MAX_TRANSACTIONS).filter((transaction) => transaction.type === 'earn' && new Date(transaction.timestamp).toDateString() === new Date().toDateString()).reduce((sum, transaction) => sum + transaction.amount, 0);
export const getTodaySpending = (): number => getRecentTransactions(MAX_TRANSACTIONS).filter((transaction) => transaction.type === 'spend' && new Date(transaction.timestamp).toDateString() === new Date().toDateString()).reduce((sum, transaction) => sum + transaction.amount, 0);
export const earnTokens = async (amount: number, reason: string, operationId: string) => mutate('earn', amount, reason, operationId);
export const spendTokens = async (amount: number, reason: string, operationId: string) => mutate('spend', amount, reason, operationId);
export function __resetTokenServiceForTests(): void {
  ledger = null; initialization = null; mutationQueue = Promise.resolve(); listeners.clear();
}
export const TOKEN_REWARDS = {
  MORNING_ROUTINE_STEP: 5, EVENING_ROUTINE_STEP: 5, MORNING_ROUTINE_COMPLETE: 20,
  EVENING_ROUTINE_COMPLETE: 20, GAME_COMPLETE: 10, GAME_PERFECT: 25, GAME_SPEED_BONUS: 15,
  GAME_NO_HINTS: 20, HOMEWORK_COMPLETE: 15, HOMEWORK_EARLY: 10, THREE_DAY_STREAK: 30,
  SEVEN_DAY_STREAK: 75, THIRTY_DAY_STREAK: 200, FOCUS_SESSION_25MIN: 15,
  FOCUS_SESSION_50MIN: 35, FIRST_DAY_COMPLETE: 50, LEVEL_UP: 100,
} as const;
