import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { processStripeWebhookEvent } from './stripeWebhook.js';

let stateDir = '';

beforeEach(() => {
  stateDir = mkdtempSync(join(tmpdir(), 'prior-auth-pro-webhook-test-'));
  process.env.PRIOR_AUTH_STATE_PATH = join(stateDir, 'state.json');
});

afterEach(() => {
  delete process.env.PRIOR_AUTH_STATE_PATH;
  rmSync(stateDir, { recursive: true, force: true });
});

describe('stripeWebhook', () => {
  it('activates the pro subscription for a paid checkout session', () => {
    const result = processStripeWebhookEvent({
      id: 'evt_test_checkout',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_paid',
          status: 'complete',
          payment_status: 'paid',
          customer: 'cus_test',
          subscription: 'sub_test',
          metadata: {
            app: 'prior-auth-pro',
            plan: 'pro',
            userEmail: 'owner@example.com',
          },
        },
      },
    });

    expect(result).toMatchObject({
      processed: true,
      subscription: {
        plan: 'pro',
        status: 'active',
        email: 'owner@example.com',
      },
    });
  });
});
