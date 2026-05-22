import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  clearStripeCustomerLinks,
  createTenantCheckoutSession,
  getStripeCustomerId,
  linkStripeCustomer,
  lookupSubscriptionStatus,
  type StripeSubscriptionClientLike,
} from './payments';

describe('@vibetech/payments', () => {
  beforeEach(() => {
    clearStripeCustomerLinks();
  });

  it('links Stripe customers to tenants', () => {
    linkStripeCustomer('tenant-a', 'cus_123', {
      email: 'billing@example.com',
      now: new Date('2026-05-19T12:00:00Z'),
    });

    expect(getStripeCustomerId('tenant-a')).toBe('cus_123');
  });

  it('creates tenant checkout sessions with tenant metadata', async () => {
    const create = vi.fn(async () => ({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.test/session',
    }));
    const stripeClient = {
      checkout: {
        sessions: {
          create,
        },
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    };

    const session = await createTenantCheckoutSession(
      {
        tenantId: 'tenant-a',
        plan: 'pro',
        currency: 'USD',
        successUrl: 'https://example.test/success',
        cancelUrl: 'https://example.test/cancel',
        lineItems: [
          {
            name: 'Pro plan',
            unitAmount: 19,
          },
        ],
      },
      stripeClient,
    );

    expect(session.url).toBe('https://checkout.stripe.test/session');
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      metadata: {
        tenant_id: 'tenant-a',
        plan: 'pro',
      },
    });
  });

  it('normalizes subscription status from Stripe', async () => {
    const stripeClient = {
      checkout: {
        sessions: {
          create: vi.fn(),
        },
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
      subscriptions: {
        retrieve: vi.fn(async () => ({
          id: 'sub_123',
          status: 'active',
          customer: { id: 'cus_123' },
          current_period_end: 1_779_194_400,
          cancel_at_period_end: false,
        })),
      },
    } satisfies StripeSubscriptionClientLike;

    await expect(lookupSubscriptionStatus('sub_123', stripeClient)).resolves.toMatchObject({
      id: 'sub_123',
      status: 'active',
      stripeCustomerId: 'cus_123',
      cancelAtPeriodEnd: false,
    });
  });
});
