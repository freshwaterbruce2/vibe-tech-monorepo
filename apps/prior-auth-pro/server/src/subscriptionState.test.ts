import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  activateProSubscription,
  getSubscriptionForUser,
  recordCheckoutStarted,
  recordAppealGeneration,
} from './subscriptionState.js';

let stateDir = '';

beforeEach(() => {
  stateDir = mkdtempSync(join(tmpdir(), 'prior-auth-pro-test-'));
  process.env.PRIOR_AUTH_STATE_PATH = join(stateDir, 'state.json');
});

afterEach(() => {
  delete process.env.PRIOR_AUTH_STATE_PATH;
  rmSync(stateDir, { recursive: true, force: true });
});

describe('subscriptionState', () => {
  it('starts users on the free plan', () => {
    expect(getSubscriptionForUser('Owner@Example.com')).toMatchObject({
      email: 'owner@example.com',
      plan: 'free',
      status: 'inactive',
    });
  });

  it('records checkout and activates pro after the webhook', () => {
    recordCheckoutStarted({
      email: 'owner@example.com',
      checkoutSessionId: 'cs_test_started',
    });

    expect(getSubscriptionForUser('owner@example.com')).toMatchObject({
      plan: 'free',
      status: 'pending',
      checkoutSessionId: 'cs_test_started',
    });

    activateProSubscription({
      eventId: 'evt_1',
      email: 'owner@example.com',
      checkoutSessionId: 'cs_test_paid',
      stripeCustomerId: 'cus_test',
      stripeSubscriptionId: 'sub_test',
    });

    expect(getSubscriptionForUser('owner@example.com')).toMatchObject({
      plan: 'pro',
      status: 'active',
      checkoutSessionId: 'cs_test_paid',
      stripeCustomerId: 'cus_test',
      stripeSubscriptionId: 'sub_test',
    });
  });

  it('tracks generated appeal usage against the user subscription', () => {
    recordAppealGeneration('owner@example.com', {
      aiTokens: 123,
    });

    expect(getSubscriptionForUser('owner@example.com')).toMatchObject({
      appealGenerations: 1,
      aiTokens: 123,
    });
  });
});
