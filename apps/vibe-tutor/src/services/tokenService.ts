/**
 * Token Service
 * Canonical token ledger for balance + transaction history.
 */

import { appStore } from '../utils/electronStore';

const TOKEN_STATE_KEY = 'vibetutor_token_state_v2';
const TOKEN_TRANSACTIONS_KEY = 'vibetutor_token_transactions_v2';
const TOKEN_MIGRATION_KEY = 'vibetutor_token_migrated_v2';

const LEGACY_BALANCE_KEY = 'vibetutor_tokens';
const LEGACY_TRANSACTIONS_KEY = 'vibetutor_transactions';
const LEGACY_USER_TOKENS_KEYS = ['userTokens', 'user_tokens'] as const;

const TOKEN_STATE_VERSION = 2;

interface TokenStateStore extends TokenBalance {
  version: number;
}

export interface TokenBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  updatedAt: number;
}

export interface TokenTransaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  reason: string;
  relatedId?: string;
  timestamp: number;
}

const DEFAULT_STATE: TokenStateStore = {
  version: TOKEN_STATE_VERSION,
  balance: 0,
  totalEarned: 0,
  totalSpent: 0,
  updatedAt: Date.now(),
};

let stateCache: TokenStateStore | null = null;
let transactionsCache: TokenTransaction[] | null = null;

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return null;
}

function parseTokenState(value: unknown): TokenStateStore | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<TokenStateStore>;
  const balance = asNumber(candidate.balance);
  const totalEarned = asNumber(candidate.totalEarned);
  const totalSpent = asNumber(candidate.totalSpent);
  const updatedAt = asNumber(candidate.updatedAt);

  if (
    balance === null ||
    totalEarned === null ||
    totalSpent === null ||
    updatedAt === null
  ) {
    return null;
  }

  return {
    version: TOKEN_STATE_VERSION,
    balance,
    totalEarned,
    totalSpent,
    updatedAt,
  };
}

function normalizeTransaction(input: unknown): TokenTransaction | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const candidate = input as Partial<TokenTransaction>;
  if (candidate.type !== 'earn' && candidate.type !== 'spend') {
    return null;
  }

  const amount = asNumber(candidate.amount);
  const timestamp = asNumber(candidate.timestamp);

  if (amount === null || amount <= 0 || timestamp === null) {
    return null;
  }

  return {
    id: typeof candidate.id === 'string' && candidate.id.length > 0 ? candidate.id : `txn_${timestamp}`,
    type: candidate.type,
    amount,
    reason: typeof candidate.reason === 'string' && candidate.reason.length > 0 ? candidate.reason : 'Token update',
    relatedId: typeof candidate.relatedId === 'string' ? candidate.relatedId : undefined,
    timestamp,
  };
}

function parseTransactionList(value: unknown): TokenTransaction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeTransaction)
    .filter((tx): tx is TokenTransaction => tx !== null);
}

function buildLegacyState(): TokenStateStore {
  const legacyState = parseTokenState(appStore.get(LEGACY_BALANCE_KEY));
  const legacyBalances = LEGACY_USER_TOKENS_KEYS
    .map((key) => asNumber(appStore.get(key)))
    .filter((value): value is number => value !== null);

  const inferredBalance = legacyBalances.length > 0 ? Math.max(...legacyBalances) : 0;

  if (!legacyState) {
    return {
      ...DEFAULT_STATE,
      balance: inferredBalance,
      totalEarned: inferredBalance,
      updatedAt: Date.now(),
    };
  }

  const balance = Math.max(legacyState.balance, inferredBalance);
  return {
    version: TOKEN_STATE_VERSION,
    balance,
    totalEarned: Math.max(legacyState.totalEarned, balance),
    totalSpent: legacyState.totalSpent,
    updatedAt: Date.now(),
  };
}

function syncCompatibilityKeys(balance: number): void {
  const serialized = String(Math.max(0, Math.floor(balance)));
  appStore.set('userTokens', serialized);
  appStore.set('user_tokens', serialized);
}

function saveStateAndTransactions(): void {
  if (!stateCache || !transactionsCache) {
    return;
  }

  appStore.set(TOKEN_STATE_KEY, stateCache);
  appStore.set(TOKEN_TRANSACTIONS_KEY, transactionsCache);
  appStore.set(TOKEN_MIGRATION_KEY, 'true');
  syncCompatibilityKeys(stateCache.balance);
}

function trimOldTransactions(daysToKeep = 90): void {
  if (!transactionsCache) {
    return;
  }

  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  transactionsCache = transactionsCache.filter((tx) => tx.timestamp >= cutoff);
}

function ensureLoaded(): void {
  if (stateCache && transactionsCache) {
    return;
  }

  const parsedState = parseTokenState(appStore.get(TOKEN_STATE_KEY));
  const parsedTransactions = parseTransactionList(appStore.get(TOKEN_TRANSACTIONS_KEY));

  if (parsedState) {
    stateCache = parsedState;
  } else {
    stateCache = buildLegacyState();
  }

  if (parsedTransactions.length > 0) {
    transactionsCache = parsedTransactions;
  } else {
    transactionsCache = parseTransactionList(appStore.get(LEGACY_TRANSACTIONS_KEY));
  }

  trimOldTransactions(90);
  saveStateAndTransactions();
}

function createTransaction(
  type: 'earn' | 'spend',
  amount: number,
  reason: string,
  relatedId?: string,
): TokenTransaction {
  return {
    id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    type,
    amount,
    reason,
    relatedId,
    timestamp: Date.now(),
  };
}

function normalizeAmount(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.max(0, Math.floor(amount));
}

function appendTransaction(transaction: TokenTransaction): void {
  ensureLoaded();

  if (!transactionsCache || !stateCache) {
    return;
  }

  transactionsCache.push(transaction);
  stateCache.updatedAt = Date.now();
  trimOldTransactions(90);
  saveStateAndTransactions();
}

function applyEarning(amount: number, reason: string, relatedId?: string): TokenTransaction {
  ensureLoaded();

  if (!stateCache) {
    throw new Error('Token state unavailable');
  }

  stateCache.balance += amount;
  stateCache.totalEarned += amount;

  const transaction = createTransaction('earn', amount, reason, relatedId);
  appendTransaction(transaction);
  return transaction;
}

function applySpending(amount: number, reason: string, relatedId?: string): TokenTransaction | null {
  ensureLoaded();

  if (!stateCache) {
    throw new Error('Token state unavailable');
  }

  if (stateCache.balance < amount) {
    return null;
  }

  stateCache.balance -= amount;
  stateCache.totalSpent += amount;

  const transaction = createTransaction('spend', amount, reason, relatedId);
  appendTransaction(transaction);
  return transaction;
}

// Public API
export function getTokenBalance(): number {
  ensureLoaded();
  return stateCache?.balance ?? 0;
}

export function getTokenStats(): TokenBalance {
  ensureLoaded();

  if (!stateCache) {
    return { ...DEFAULT_STATE };
  }

  return {
    balance: stateCache.balance,
    totalEarned: stateCache.totalEarned,
    totalSpent: stateCache.totalSpent,
    updatedAt: stateCache.updatedAt,
  };
}

export function earnTokens(amount: number, reason: string, relatedId?: string): TokenTransaction | null {
  const normalized = normalizeAmount(amount);
  if (normalized <= 0) {
    return null;
  }

  const safeReason = reason?.trim() || 'Earned tokens';
  return applyEarning(normalized, safeReason, relatedId);
}

export function spendTokens(
  amount: number,
  reason: string,
  relatedId?: string,
): TokenTransaction | null {
  const normalized = normalizeAmount(amount);
  if (normalized <= 0) {
    return null;
  }

  const safeReason = reason?.trim() || 'Spent tokens';
  return applySpending(normalized, safeReason, relatedId);
}

export function setTokenBalance(
  targetBalance: number,
  reason = 'Token balance adjusted',
  relatedId?: string,
): TokenTransaction | null {
  const normalizedTarget = normalizeAmount(targetBalance);
  const current = getTokenBalance();

  if (normalizedTarget === current) {
    return null;
  }

  if (normalizedTarget > current) {
    return applyEarning(normalizedTarget - current, reason, relatedId);
  }

  return applySpending(current - normalizedTarget, reason, relatedId);
}

export function syncTokenBalanceFromLegacy(
  legacyBalance: number,
  source = 'legacy import',
): boolean {
  const normalized = normalizeAmount(legacyBalance);
  if (normalized <= 0) {
    return false;
  }

  const current = getTokenBalance();
  if (normalized <= current) {
    return false;
  }

  applyEarning(normalized - current, `Imported from ${source}`);
  return true;
}

export function getRecentTransactions(limit = 10): TokenTransaction[] {
  ensureLoaded();
  const max = Math.max(1, Math.floor(limit));
  return [...(transactionsCache ?? [])]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, max);
}

export function getTransactionsByType(type: 'earn' | 'spend', limit = 20): TokenTransaction[] {
  ensureLoaded();
  const max = Math.max(1, Math.floor(limit));

  return [...(transactionsCache ?? [])]
    .filter((t) => t.type === type)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, max);
}

export function getTodayEarnings(): number {
  ensureLoaded();
  const today = new Date().toDateString();

  return (transactionsCache ?? [])
    .filter((t) => t.type === 'earn' && new Date(t.timestamp).toDateString() === today)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getTodaySpending(): number {
  ensureLoaded();
  const today = new Date().toDateString();

  return (transactionsCache ?? [])
    .filter((t) => t.type === 'spend' && new Date(t.timestamp).toDateString() === today)
    .reduce((sum, t) => sum + t.amount, 0);
}

export const TOKEN_REWARDS = {
  MORNING_ROUTINE_STEP: 5,
  EVENING_ROUTINE_STEP: 5,
  MORNING_ROUTINE_COMPLETE: 20,
  EVENING_ROUTINE_COMPLETE: 20,
  GAME_COMPLETE: 10,
  GAME_PERFECT: 25,
  GAME_SPEED_BONUS: 15,
  GAME_NO_HINTS: 20,
  HOMEWORK_COMPLETE: 15,
  HOMEWORK_EARLY: 10,
  THREE_DAY_STREAK: 30,
  SEVEN_DAY_STREAK: 75,
  THIRTY_DAY_STREAK: 200,
  FOCUS_SESSION_25MIN: 15,
  FOCUS_SESSION_50MIN: 35,
  FIRST_DAY_COMPLETE: 50,
  LEVEL_UP: 100,
} as const;

export function awardScheduleStep(stepName: string, scheduleId: string): TokenTransaction | null {
  return earnTokens(
    TOKEN_REWARDS.MORNING_ROUTINE_STEP,
    `Completed routine step: ${stepName}`,
    scheduleId,
  );
}

export function awardScheduleComplete(
  type: 'morning' | 'evening',
  scheduleId: string,
): TokenTransaction | null {
  const amount =
    type === 'morning'
      ? TOKEN_REWARDS.MORNING_ROUTINE_COMPLETE
      : TOKEN_REWARDS.EVENING_ROUTINE_COMPLETE;

  return earnTokens(amount, `Completed ${type} routine!`, scheduleId);
}

export function awardGameComplete(
  gameType: string,
  _score: number,
  perfect: boolean,
  _noHints: boolean,
  gameId: string,
): TokenTransaction | null {
  let amount = TOKEN_REWARDS.GAME_COMPLETE;
  const bonuses: string[] = [];

  if (perfect) {
    amount += TOKEN_REWARDS.GAME_PERFECT;
    bonuses.push('perfect score');
  }

  if (_noHints) {
    amount += TOKEN_REWARDS.GAME_NO_HINTS;
    bonuses.push('no hints');
  }

  const bonusText = bonuses.length > 0 ? ` (${bonuses.join(', ')})` : '';
  return earnTokens(amount, `Completed ${gameType}${bonusText}`, gameId);
}

export function awardFocusSession(minutes: number, sessionId: string): TokenTransaction | null {
  const amount =
    minutes >= 50 ? TOKEN_REWARDS.FOCUS_SESSION_50MIN : TOKEN_REWARDS.FOCUS_SESSION_25MIN;

  return earnTokens(amount, `Completed ${minutes}-minute focus session`, sessionId);
}

export function cleanupOldTransactions(daysToKeep = 90): void {
  ensureLoaded();
  trimOldTransactions(daysToKeep);
  saveStateAndTransactions();
}

// Test helper to avoid stale module cache state across isolated test cases.
export function __resetTokenServiceForTests(): void {
  stateCache = null;
  transactionsCache = null;
}

cleanupOldTransactions(90);
