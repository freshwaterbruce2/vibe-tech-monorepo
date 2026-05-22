import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { AuthUser } from '@vibetech/auth';

export type GeneratedPlan = 'free' | 'pro';
export type SubscriptionStatus = 'inactive' | 'pending' | 'active';

export interface UserSubscription {
  email: string;
  plan: GeneratedPlan;
  status: SubscriptionStatus;
  checkoutSessionId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  activatedAt?: string;
  updatedAt: string;
  appealGenerations: number;
  aiTokens: number;
}

interface SubscriptionState {
  users: Record<string, UserSubscription>;
  processedEvents: Record<string, string>;
}

export interface ActivateProSubscriptionInput {
  eventId: string;
  email: string;
  checkoutSessionId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface RecordCheckoutInput {
  email: string;
  checkoutSessionId: string;
}

const defaultState = (): SubscriptionState => ({
  users: {},
  processedEvents: {},
});

export function getSubscriptionForUser(email: string): UserSubscription {
  const state = readState();
  const normalizedEmail = normalizeEmail(email);
  return state.users[normalizedEmail] ?? buildDefaultSubscription(normalizedEmail);
}

export function getPlanForUser(user: AuthUser): GeneratedPlan {
  return getSubscriptionForUser(user.email).plan;
}

export function recordCheckoutStarted(input: RecordCheckoutInput): UserSubscription {
  const state = readState();
  const normalizedEmail = normalizeEmail(input.email);
  const existing = state.users[normalizedEmail] ?? buildDefaultSubscription(normalizedEmail);
  const updated: UserSubscription = {
    ...existing,
    email: normalizedEmail,
    status: existing.plan === 'pro' ? 'active' : 'pending',
    checkoutSessionId: input.checkoutSessionId,
    updatedAt: new Date().toISOString(),
  };

  state.users[normalizedEmail] = updated;
  writeState(state);
  return updated;
}

export function activateProSubscription(input: ActivateProSubscriptionInput): UserSubscription {
  const state = readState();
  const normalizedEmail = normalizeEmail(input.email);
  const existing = state.users[normalizedEmail] ?? buildDefaultSubscription(normalizedEmail);
  const updatedAt = new Date().toISOString();

  if (state.processedEvents[input.eventId]) {
    return existing;
  }

  const updated: UserSubscription = {
    ...existing,
    email: normalizedEmail,
    plan: 'pro',
    status: 'active',
    checkoutSessionId: input.checkoutSessionId,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    activatedAt: existing.activatedAt ?? updatedAt,
    updatedAt,
  };

  state.users[normalizedEmail] = updated;
  state.processedEvents[input.eventId] = updatedAt;
  writeState(state);
  return updated;
}

export function recordAppealGeneration(
  email: string,
  input: {
    aiTokens?: number;
  } = {},
): UserSubscription {
  const state = readState();
  const normalizedEmail = normalizeEmail(email);
  const existing = state.users[normalizedEmail] ?? buildDefaultSubscription(normalizedEmail);
  const updated: UserSubscription = {
    ...existing,
    appealGenerations: existing.appealGenerations + 1,
    aiTokens: existing.aiTokens + Math.max(0, input.aiTokens ?? 0),
    updatedAt: new Date().toISOString(),
  };

  state.users[normalizedEmail] = updated;
  writeState(state);
  return updated;
}

function buildDefaultSubscription(email: string): UserSubscription {
  return {
    email,
    plan: 'free',
    status: 'inactive',
    updatedAt: new Date(0).toISOString(),
    appealGenerations: 0,
    aiTokens: 0,
  };
}

function readState(): SubscriptionState {
  const path = getStatePath();
  if (!existsSync(path)) {
    return defaultState();
  }

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<SubscriptionState>;
    return {
      users: parsed.users ?? {},
      processedEvents: parsed.processedEvents ?? {},
    };
  } catch {
    return defaultState();
  }
}

function writeState(state: SubscriptionState): void {
  const path = getStatePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2));
}

function getStatePath(): string {
  const configuredPath = process.env.PRIOR_AUTH_STATE_PATH?.trim();
  return configuredPath && configuredPath.length > 0
    ? configuredPath
    : join(tmpdir(), 'prior-auth-pro-state.json');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
