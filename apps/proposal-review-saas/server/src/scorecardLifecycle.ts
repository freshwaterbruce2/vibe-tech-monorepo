import type { AuthUser } from '@vibetech/auth';

import { GENERATED_FEATURES, resolveFeatureAccess } from './entitlements.js';
import type { ProposalReviewInput } from './reviewEngine.js';

export type AbandonedScorecardDay = 1 | 3 | 7;
export type AbandonedEmailStatus = 'sending' | 'sent' | 'mocked' | 'failed';

export interface ScorecardEvent {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  projectType: string;
  proposalFingerprint: string;
  score: number | null;
  createdAt: string;
  tierAtCreation: string;
}

export interface UserEntitlementRecord {
  id: string;
  userId: string | null;
  userEmail: string | null;
  featureKey: string;
  active: boolean;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrantUserEntitlementInput {
  userId?: string | null;
  userEmail?: string | null;
  featureKey: string;
  source?: string;
  now?: Date;
}

export interface DueAbandonedScorecardEmail extends ScorecardEvent {
  day: AbandonedScorecardDay;
}

export interface CreateScorecardEventInput {
  user: AuthUser | null;
  fallbackEmail?: string;
  fallbackName?: string;
  input: ProposalReviewInput;
  reviewScore?: number;
  tierHeader: string | string[] | undefined;
  now?: Date;
}

export interface AbandonedScorecardDelivery {
  scorecardEventId: string;
  day: AbandonedScorecardDay;
  recipient: string;
  status: Extract<AbandonedEmailStatus, 'sent' | 'mocked'>;
  providerId: string;
}

export interface AbandonedScorecardSweepResult {
  checked: number;
  reserved: number;
  sent: number;
  mocked: number;
  skippedPro: number;
  skippedDuplicate: number;
  failed: number;
}

export interface ScorecardLifecycleRepository {
  recordFreeScorecard(input: CreateScorecardEventInput): ScorecardEvent;
  grantUserEntitlement(input: GrantUserEntitlementInput): UserEntitlementRecord;
  findDueAbandonedScorecardEmails(
    now: Date,
    days: readonly AbandonedScorecardDay[],
    limit: number,
  ): DueAbandonedScorecardEmail[];
  reserveAbandonedScorecardEmail(candidate: DueAbandonedScorecardEmail, now: Date): boolean;
  markAbandonedScorecardEmailDelivered(delivery: AbandonedScorecardDelivery, now: Date): void;
  markAbandonedScorecardEmailFailed(
    candidate: DueAbandonedScorecardEmail,
    errorMessage: string,
    now: Date,
  ): void;
}

export interface AbandonedScorecardEmailSender {
  sendAbandonedScorecardEmail(
    candidate: DueAbandonedScorecardEmail,
  ): Promise<AbandonedScorecardDelivery>;
}

export type AbandonedScorecardEntitlementResolver = (
  user: AuthUser,
  scorecard: DueAbandonedScorecardEmail,
) => boolean | Promise<boolean>;

export interface RunAbandonedScorecardSweepOptions {
  repository: ScorecardLifecycleRepository;
  sender: AbandonedScorecardEmailSender;
  entitlementResolver?: AbandonedScorecardEntitlementResolver;
  now?: Date;
  days?: readonly AbandonedScorecardDay[];
  limit?: number;
}

export interface StartAbandonedScorecardSweepOptions extends RunAbandonedScorecardSweepOptions {
  intervalMs?: number;
  initialDelayMs?: number;
  onError?: (error: unknown) => void;
}

const ABANDONED_SCORECARD_DAYS = [1, 3, 7] as const;
const DEFAULT_SWEEP_LIMIT = 100;
const DEFAULT_SWEEP_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_SWEEP_INITIAL_DELAY_MS = 30 * 1000;

export { createScorecardLifecycleRepository } from './scorecardLifecycleDb.js';
export { createResendAbandonedScorecardEmailSender } from './scorecardLifecycleSender.js';

export async function runAbandonedScorecardSweep({
  repository,
  sender,
  entitlementResolver = defaultEntitlementResolver,
  now = new Date(),
  days = ABANDONED_SCORECARD_DAYS,
  limit = DEFAULT_SWEEP_LIMIT,
}: RunAbandonedScorecardSweepOptions): Promise<AbandonedScorecardSweepResult> {
  const result: AbandonedScorecardSweepResult = {
    checked: 0,
    reserved: 0,
    sent: 0,
    mocked: 0,
    skippedPro: 0,
    skippedDuplicate: 0,
    failed: 0,
  };
  const candidates = repository.findDueAbandonedScorecardEmails(now, days, limit);

  for (const candidate of candidates) {
    result.checked += 1;
    const hasProEntitlement = await entitlementResolver(buildEntitlementUser(candidate), candidate);
    if (hasProEntitlement) {
      result.skippedPro += 1;
      continue;
    }

    if (!repository.reserveAbandonedScorecardEmail(candidate, now)) {
      result.skippedDuplicate += 1;
      continue;
    }

    result.reserved += 1;
    try {
      const delivery = await sender.sendAbandonedScorecardEmail(candidate);
      repository.markAbandonedScorecardEmailDelivered(delivery, now);
      if (delivery.status === 'mocked') {
        result.mocked += 1;
      } else {
        result.sent += 1;
      }
    } catch (error) {
      result.failed += 1;
      repository.markAbandonedScorecardEmailFailed(candidate, getErrorMessage(error), now);
    }
  }

  return result;
}

export function startAbandonedScorecardSweep(
  options: StartAbandonedScorecardSweepOptions,
): () => void {
  const intervalMs = options.intervalMs ?? DEFAULT_SWEEP_INTERVAL_MS;
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_SWEEP_INITIAL_DELAY_MS;
  let running = false;

  const runOnce = (): void => {
    if (running) {
      return;
    }

    running = true;
    void runAbandonedScorecardSweep(options)
      .catch((error: unknown) => {
        options.onError?.(error);
      })
      .finally(() => {
        running = false;
      });
  };

  const initialTimer = setTimeout(runOnce, initialDelayMs);
  const intervalTimer = setInterval(runOnce, intervalMs);

  return () => {
    clearTimeout(initialTimer);
    clearInterval(intervalTimer);
  };
}

function buildEntitlementUser(candidate: DueAbandonedScorecardEmail): AuthUser {
  return {
    id: candidate.userId ?? candidate.userEmail ?? candidate.id,
    email: candidate.userEmail ?? 'unknown@example.com',
    fullName: candidate.userName ?? undefined,
  };
}

function defaultEntitlementResolver(
  user: AuthUser,
  scorecard: DueAbandonedScorecardEmail,
): boolean {
  return resolveFeatureAccess(
    user,
    GENERATED_FEATURES.premiumRoute,
    scorecard.tierAtCreation,
  ).decision.allowed;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
