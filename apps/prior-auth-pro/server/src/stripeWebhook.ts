import type { StripeWebhookEventLike } from '@vibetech/billing';

import { activateProSubscription, type UserSubscription } from './subscriptionState.js';

export interface WebhookProcessingResult {
  processed: boolean;
  reason?: string;
  subscription?: UserSubscription;
}

interface CheckoutSessionLike {
  id?: string;
  status?: string;
  payment_status?: string;
  customer?: StripeIdLike;
  customer_email?: string | null;
  subscription?: StripeIdLike;
  metadata?: Record<string, string> | null;
}

type StripeIdLike = string | { id?: string } | null | undefined;

export function processStripeWebhookEvent(
  event: StripeWebhookEventLike,
): WebhookProcessingResult {
  if (event.type !== 'checkout.session.completed') {
    return {
      processed: false,
      reason: 'ignored-event-type',
    };
  }

  const session = event.data.object as CheckoutSessionLike;
  if (session.metadata?.app !== 'prior-auth-pro') {
    return {
      processed: false,
      reason: 'ignored-app',
    };
  }

  if (session.metadata.plan !== 'pro') {
    return {
      processed: false,
      reason: 'ignored-plan',
    };
  }

  if (!isPaidCheckoutSession(session)) {
    return {
      processed: false,
      reason: 'checkout-not-paid',
    };
  }

  const email = session.metadata.userEmail ?? session.customer_email ?? '';
  if (!session.id || !email) {
    return {
      processed: false,
      reason: 'missing-session-user',
    };
  }

  return {
    processed: true,
    subscription: activateProSubscription({
      eventId: event.id,
      email,
      checkoutSessionId: session.id,
      stripeCustomerId: readStripeId(session.customer),
      stripeSubscriptionId: readStripeId(session.subscription),
    }),
  };
}

function isPaidCheckoutSession(session: CheckoutSessionLike): boolean {
  return session.payment_status === 'paid' || session.status === 'complete';
}

function readStripeId(value: StripeIdLike): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  return value?.id;
}
