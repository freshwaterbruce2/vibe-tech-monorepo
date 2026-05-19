import { describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';

import { GENERATED_FEATURES } from './entitlements.js';
import {
  runAbandonedScorecardSweep,
  type AbandonedScorecardDelivery,
  type AbandonedScorecardDay,
  type AbandonedScorecardEmailSender,
  type AbandonedScorecardEntitlementResolver,
  type CreateScorecardEventInput,
  type DueAbandonedScorecardEmail,
  type GrantUserEntitlementInput,
  type ScorecardEvent,
  type ScorecardLifecycleRepository,
  type UserEntitlementRecord,
} from './scorecardLifecycle.js';
import { createScorecardLifecycleRepository } from './scorecardLifecycleDb.js';

interface FindDueCall {
  now: Date;
  days: AbandonedScorecardDay[];
  limit: number;
}

interface ReservationCall {
  candidate: DueAbandonedScorecardEmail;
  now: Date;
}

interface DeliveryCall {
  delivery: AbandonedScorecardDelivery;
  now: Date;
}

interface FailureCall {
  candidate: DueAbandonedScorecardEmail;
  errorMessage: string;
  now: Date;
}

class InMemoryScorecardLifecycleRepository implements ScorecardLifecycleRepository {
  public readonly findDueCalls: FindDueCall[] = [];
  public readonly reservationCalls: ReservationCall[] = [];
  public readonly deliveryCalls: DeliveryCall[] = [];
  public readonly failureCalls: FailureCall[] = [];

  public constructor(
    private readonly candidates: DueAbandonedScorecardEmail[],
    private readonly reservationDecision:
      | boolean
      | ((candidate: DueAbandonedScorecardEmail) => boolean) = true,
  ) {}

  public recordFreeScorecard(_input: CreateScorecardEventInput): ScorecardEvent {
    throw new Error('recordFreeScorecard is not used by abandoned sweep tests');
  }

  public grantUserEntitlement(_input: GrantUserEntitlementInput): UserEntitlementRecord {
    throw new Error('grantUserEntitlement is not used by abandoned sweep tests');
  }

  public findDueAbandonedScorecardEmails(
    now: Date,
    days: readonly AbandonedScorecardDay[],
    limit: number,
  ): DueAbandonedScorecardEmail[] {
    this.findDueCalls.push({ now, days: [...days], limit });
    return this.candidates;
  }

  public reserveAbandonedScorecardEmail(
    candidate: DueAbandonedScorecardEmail,
    now: Date,
  ): boolean {
    this.reservationCalls.push({ candidate, now });
    if (typeof this.reservationDecision === 'function') {
      return this.reservationDecision(candidate);
    }

    return this.reservationDecision;
  }

  public markAbandonedScorecardEmailDelivered(
    delivery: AbandonedScorecardDelivery,
    now: Date,
  ): void {
    this.deliveryCalls.push({ delivery, now });
  }

  public markAbandonedScorecardEmailFailed(
    candidate: DueAbandonedScorecardEmail,
    errorMessage: string,
    now: Date,
  ): void {
    this.failureCalls.push({ candidate, errorMessage, now });
  }
}

class RecordingAbandonedScorecardEmailSender implements AbandonedScorecardEmailSender {
  public readonly sentCandidates: DueAbandonedScorecardEmail[] = [];

  public constructor(
    private readonly statusForCandidate:
      | AbandonedScorecardDelivery['status']
      | ((candidate: DueAbandonedScorecardEmail) => AbandonedScorecardDelivery['status']),
    private readonly failure?: Error,
  ) {}

  public async sendAbandonedScorecardEmail(
    candidate: DueAbandonedScorecardEmail,
  ): Promise<AbandonedScorecardDelivery> {
    this.sentCandidates.push(candidate);

    if (this.failure) {
      throw this.failure;
    }

    const status =
      typeof this.statusForCandidate === 'function'
        ? this.statusForCandidate(candidate)
        : this.statusForCandidate;

    return {
      scorecardEventId: candidate.id,
      day: candidate.day,
      recipient: candidate.userEmail ?? 'unknown@example.com',
      status,
      providerId: `${status}-${candidate.id}-${candidate.day}`,
    };
  }
}

const fixedNow = new Date('2026-05-19T12:00:00.000Z');
const createdTwoDaysAgo = new Date('2026-05-17T12:00:00.000Z');
const reviewInput = {
  clientName: 'Northwind Studio',
  projectType: 'Website redesign',
  proposalText:
    'Discovery, milestone delivery, two revision rounds, payment terms, and launch support.',
  priceUsd: 4500,
  turnaroundDays: 14,
  revisionRounds: 2,
};

function buildCandidate(
  overrides: Partial<DueAbandonedScorecardEmail> = {},
): DueAbandonedScorecardEmail {
  const day = overrides.day ?? 1;

  return {
    id: `scorecard-${day}`,
    userId: `user-${day}`,
    userEmail: `client-${day}@example.com`,
    userName: `Client ${day}`,
    projectType: 'Website redesign',
    proposalFingerprint: `fingerprint-${day}`,
    score: 84,
    createdAt: '2026-05-18T12:00:00.000Z',
    tierAtCreation: 'free',
    day,
    ...overrides,
  };
}

describe('runAbandonedScorecardSweep', () => {
  it('filters active Pro Rewrite entitlements in the SQLite candidate query', () => {
    const db = new Database(':memory:');

    try {
      const repository = createScorecardLifecycleRepository(db);
      repository.recordFreeScorecard({
        user: {
          id: 'free-user',
          email: 'free@example.com',
          fullName: 'Free User',
        },
        input: reviewInput,
        reviewScore: 71,
        tierHeader: 'free',
        now: createdTwoDaysAgo,
      });
      repository.recordFreeScorecard({
        user: {
          id: 'pro-user',
          email: 'pro@example.com',
          fullName: 'Pro User',
        },
        input: reviewInput,
        reviewScore: 87,
        tierHeader: 'free',
        now: createdTwoDaysAgo,
      });

      const entitlement = repository.grantUserEntitlement({
        userId: 'pro-user',
        userEmail: 'pro@example.com',
        featureKey: GENERATED_FEATURES.premiumRoute,
        source: 'stripe:checkout.session.completed',
        now: fixedNow,
      });

      const candidates = repository.findDueAbandonedScorecardEmails(fixedNow, [1], 10);

      expect(entitlement).toMatchObject({
        userId: 'pro-user',
        userEmail: 'pro@example.com',
        featureKey: GENERATED_FEATURES.premiumRoute,
        active: true,
        source: 'stripe:checkout.session.completed',
      });
      expect(candidates.map((candidate) => candidate.userEmail)).toEqual(['free@example.com']);
    } finally {
      db.close();
    }
  });

  it('reserves, sends or mocks, and marks due free scorecards delivered for days 1, 3, and 7', async () => {
    const candidates = [
      buildCandidate({ day: 1 }),
      buildCandidate({ day: 3 }),
      buildCandidate({ day: 7 }),
    ];
    const repository = new InMemoryScorecardLifecycleRepository(candidates);
    const sender = new RecordingAbandonedScorecardEmailSender((candidate) =>
      candidate.day === 7 ? 'mocked' : 'sent',
    );
    const entitlementResolver = vi.fn<AbandonedScorecardEntitlementResolver>(() => false);

    const result = await runAbandonedScorecardSweep({
      repository,
      sender,
      entitlementResolver,
      now: fixedNow,
    });

    expect(result).toEqual({
      checked: 3,
      reserved: 3,
      sent: 2,
      mocked: 1,
      skippedPro: 0,
      skippedDuplicate: 0,
      failed: 0,
    });
    expect(repository.findDueCalls).toEqual([
      {
        now: fixedNow,
        days: [1, 3, 7],
        limit: 100,
      },
    ]);
    expect(repository.reservationCalls).toEqual(
      candidates.map((candidate) => ({ candidate, now: fixedNow })),
    );
    expect(sender.sentCandidates).toEqual(candidates);
    expect(repository.deliveryCalls.map(({ delivery }) => delivery)).toEqual([
      {
        scorecardEventId: 'scorecard-1',
        day: 1,
        recipient: 'client-1@example.com',
        status: 'sent',
        providerId: 'sent-scorecard-1-1',
      },
      {
        scorecardEventId: 'scorecard-3',
        day: 3,
        recipient: 'client-3@example.com',
        status: 'sent',
        providerId: 'sent-scorecard-3-3',
      },
      {
        scorecardEventId: 'scorecard-7',
        day: 7,
        recipient: 'client-7@example.com',
        status: 'mocked',
        providerId: 'mocked-scorecard-7-7',
      },
    ]);
    expect(repository.deliveryCalls.every((call) => call.now === fixedNow)).toBe(true);
    expect(repository.failureCalls).toEqual([]);
    expect(entitlementResolver).toHaveBeenCalledTimes(3);

    for (const [index, candidate] of candidates.entries()) {
      expect(entitlementResolver).toHaveBeenNthCalledWith(
        index + 1,
        {
          id: candidate.userId,
          email: candidate.userEmail,
          fullName: candidate.userName,
        },
        candidate,
      );
    }
  });

  it('skips Pro-entitled users without reserving or sending', async () => {
    const candidate = buildCandidate({ userId: 'pro-user', userEmail: 'pro@example.com' });
    const repository = new InMemoryScorecardLifecycleRepository([candidate]);
    const sender = new RecordingAbandonedScorecardEmailSender('sent');
    const entitlementResolver = vi.fn<AbandonedScorecardEntitlementResolver>(() => true);

    const result = await runAbandonedScorecardSweep({
      repository,
      sender,
      entitlementResolver,
      now: fixedNow,
    });

    expect(result).toEqual({
      checked: 1,
      reserved: 0,
      sent: 0,
      mocked: 0,
      skippedPro: 1,
      skippedDuplicate: 0,
      failed: 0,
    });
    expect(entitlementResolver).toHaveBeenCalledWith(
      {
        id: 'pro-user',
        email: 'pro@example.com',
        fullName: 'Client 1',
      },
      candidate,
    );
    expect(repository.reservationCalls).toEqual([]);
    expect(sender.sentCandidates).toEqual([]);
    expect(repository.deliveryCalls).toEqual([]);
    expect(repository.failureCalls).toEqual([]);
  });

  it('does not send again when reservation fails for a duplicate candidate', async () => {
    const candidate = buildCandidate();
    const repository = new InMemoryScorecardLifecycleRepository([candidate], false);
    const sender = new RecordingAbandonedScorecardEmailSender('sent');
    const entitlementResolver = vi.fn<AbandonedScorecardEntitlementResolver>(() => false);

    const result = await runAbandonedScorecardSweep({
      repository,
      sender,
      entitlementResolver,
      now: fixedNow,
    });

    expect(result).toEqual({
      checked: 1,
      reserved: 0,
      sent: 0,
      mocked: 0,
      skippedPro: 0,
      skippedDuplicate: 1,
      failed: 0,
    });
    expect(entitlementResolver).toHaveBeenCalledWith(
      {
        id: 'user-1',
        email: 'client-1@example.com',
        fullName: 'Client 1',
      },
      candidate,
    );
    expect(repository.reservationCalls).toEqual([{ candidate, now: fixedNow }]);
    expect(sender.sentCandidates).toEqual([]);
    expect(repository.deliveryCalls).toEqual([]);
    expect(repository.failureCalls).toEqual([]);
  });

  it('marks a sender failure and increments the failed count', async () => {
    const candidate = buildCandidate({ id: 'scorecard-failure', day: 3 });
    const repository = new InMemoryScorecardLifecycleRepository([candidate]);
    const sender = new RecordingAbandonedScorecardEmailSender(
      'sent',
      new Error('Resend request failed'),
    );
    const entitlementResolver = vi.fn<AbandonedScorecardEntitlementResolver>(() => false);

    const result = await runAbandonedScorecardSweep({
      repository,
      sender,
      entitlementResolver,
      now: fixedNow,
    });

    expect(result).toEqual({
      checked: 1,
      reserved: 1,
      sent: 0,
      mocked: 0,
      skippedPro: 0,
      skippedDuplicate: 0,
      failed: 1,
    });
    expect(entitlementResolver).toHaveBeenCalledWith(
      {
        id: 'user-3',
        email: 'client-3@example.com',
        fullName: 'Client 3',
      },
      candidate,
    );
    expect(repository.reservationCalls).toEqual([{ candidate, now: fixedNow }]);
    expect(sender.sentCandidates).toEqual([candidate]);
    expect(repository.deliveryCalls).toEqual([]);
    expect(repository.failureCalls).toEqual([
      {
        candidate,
        errorMessage: 'Resend request failed',
        now: fixedNow,
      },
    ]);
  });
});
