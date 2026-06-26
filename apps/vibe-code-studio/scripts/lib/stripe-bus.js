/**
 * Stripe webhook bus wiring for the Vibe Code Studio companion backend.
 *
 * Extracted from backend-server.js (size cap) with NO logic change: mirrors
 * Stripe customers/subscriptions into the local SQLite state used for plan
 * resolution. `createWebhookBus(db)` returns the configured bus.
 */
import {
  createStripeWebhookBus,
  readStripeObjectId,
  deriveStripeSubscriptionMrr,
  getStripeClient,
} from '@vibetech/billing';

function hasProcessedEvent(db, eventId) {
  const row = db.prepare('SELECT 1 FROM stripe_events WHERE id = ? LIMIT 1').get(eventId);
  return !!row;
}

function markEventProcessed(db, event) {
  db.prepare('INSERT OR IGNORE INTO stripe_events (id, type) VALUES (?, ?)').run(
    event.id,
    event.type
  );
}

/** Upsert a Stripe customer row keyed by customer id (no-op without id+email). */
function upsertCustomer(db, customerId, userId, email) {
  if (!customerId || !email) return;
  db.prepare(`
    INSERT INTO stripe_customers (id, user_id, email)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = COALESCE(excluded.user_id, stripe_customers.user_id),
      email = excluded.email
  `).run(customerId, userId, email.trim().toLowerCase());
}

function mirrorStripeSubscription(db, sub, fallbackCustomerId, fallbackUserId, fallbackEmail) {
  const customerId = readStripeObjectId(sub.customer) || fallbackCustomerId;
  const userId = (sub.metadata && sub.metadata.userId) || fallbackUserId || null;
  const email = (sub.metadata && sub.metadata.userEmail) || fallbackEmail || null;

  if (!customerId) return;

  upsertCustomer(db, customerId, userId, email);

  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;
  const mrr = deriveStripeSubscriptionMrr(sub);

  db.prepare(`
    INSERT OR REPLACE INTO stripe_subscriptions
      (id, customer_id, user_id, status, plan, currency, monthly_mrr_cents, current_period_end, cancel_at_period_end, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    sub.id,
    customerId,
    userId,
    sub.status,
    (sub.metadata && sub.metadata.plan) || 'pro',
    mrr.currency,
    mrr.monthlyMrrCents,
    periodEnd,
    sub.cancel_at_period_end ? 1 : 0
  );
}

async function handleCheckoutCompleted(db, event) {
  const session = event.data.object;
  if (session.mode !== 'subscription' || !session.customer || !session.subscription) {
    return;
  }

  const customerId = readStripeObjectId(session.customer);
  const subscriptionId = readStripeObjectId(session.subscription);
  const email =
    session.customer_email ||
    (session.customer_details && session.customer_details.email) ||
    '';
  const userId = session.metadata ? session.metadata.userId : null;

  upsertCustomer(db, customerId, userId, email);

  if (subscriptionId) {
    try {
      const stripe = getStripeClient();
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      mirrorStripeSubscription(db, sub, customerId, userId, email);
    } catch (err) {
      console.error('[Backend] Failed to retrieve subscription details:', err);
    }
  }
}

function markSubscriptionCanceled(db, sub) {
  db.prepare(`
    UPDATE stripe_subscriptions
    SET status = ?, current_period_end = ?, cancel_at_period_end = ?, monthly_mrr_cents = 0, updated_at = datetime('now')
    WHERE id = ?
  `).run('canceled', null, 0, sub.id);
}

function buildHandlers(db) {
  return {
    'checkout.session.completed': (event) => handleCheckoutCompleted(db, event),
    'customer.subscription.created': (event) => mirrorStripeSubscription(db, event.data.object),
    'customer.subscription.updated': (event) => mirrorStripeSubscription(db, event.data.object),
    'customer.subscription.deleted': (event) => markSubscriptionCanceled(db, event.data.object),
  };
}

/** Build the Stripe webhook bus bound to the given SQLite db. */
export function createWebhookBus(db) {
  return createStripeWebhookBus({
    hasProcessedEvent: (eventId) => hasProcessedEvent(db, eventId),
    markEventProcessed: (event) => markEventProcessed(db, event),
    handlers: buildHandlers(db),
  });
}
