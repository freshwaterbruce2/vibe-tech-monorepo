import { getStripeClient } from '@vibetech/billing';
import { parseSessionToken, getSessionCookieName } from '@vibetech/auth';
import { parseCookies } from '../lib/http-helpers.js';
import { subscriptionFor, isEntitled, usageStatus, managedConfig } from '../lib/managed-ai.js';

function configured() {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.VCS_STRIPE_PRO_PRICE_ID && process.env.VCS_BILLING_RETURN_URL && managedConfig().configured);
}

export async function handleBilling(req, res, ctx, action) {
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  try {
    const token = parseCookies(req.headers.cookie)[getSessionCookieName()];
    const parsed = token && parseSessionToken(token);
    const user = parsed?.sub && ctx.db.prepare('SELECT * FROM users WHERE id = ?').get(parsed.sub);
    if (!user) { send(401, { error: 'Unauthorized' }); return; }
    const sub = subscriptionFor(ctx.db, user.id);
    const customer = ctx.db.prepare('SELECT id FROM stripe_customers WHERE user_id = ?').get(String(user.id));
    if (action === 'status') {
      send(200, { ok: true, plan: isEntitled(sub) ? sub.plan : 'free',
        subscription: sub ? { status: sub.status, currentPeriodEnd: sub.current_period_end, cancelAtPeriodEnd: !!sub.cancel_at_period_end } : null,
        managedAI: usageStatus(ctx.db, user.id), checkoutAvailable: configured() && !isEntitled(sub),
        portalAvailable: !!customer && !!process.env.STRIPE_SECRET_KEY && !!process.env.VCS_BILLING_RETURN_URL });
      return;
    }
    if (!process.env.VCS_BILLING_RETURN_URL) { send(503, { error: 'Billing is not configured.' }); return; }
    const returnUrl = new URL(process.env.VCS_BILLING_RETURN_URL);
    if (returnUrl.protocol !== 'https:' && !(returnUrl.protocol === 'http:' && returnUrl.hostname === 'localhost')) {
      send(503, { error: 'Billing return URL must use HTTPS.' }); return;
    }
    const stripe = ctx.stripeClient || getStripeClient();
    if (action === 'portal') {
      if (!customer) { send(409, { error: 'No billing account yet.' }); return; }
      const session = await stripe.billingPortal.sessions.create({ customer: customer.id, return_url: returnUrl.href });
      send(200, { ok: true, url: session.url }); return;
    }
    if (!configured()) { send(503, { error: 'Subscriptions are not configured yet.' }); return; }
    if (isEntitled(sub)) { send(409, { error: 'You already have a subscription. Use Manage billing.' }); return; }
    const metadata = { app: 'vibe-code-studio', plan: 'pro', userId: String(user.id), userEmail: user.email };
    returnUrl.hash = 'billing/success';
    const successUrl = returnUrl.href;
    returnUrl.hash = 'billing/canceled';
    const session = await stripe.checkout.sessions.create({ mode: 'subscription',
      line_items: [{ price: process.env.VCS_STRIPE_PRO_PRICE_ID, quantity: 1 }],
      customer: customer?.id, customer_email: customer ? undefined : user.email,
      client_reference_id: String(user.id), metadata, subscription_data: { metadata },
      success_url: successUrl, cancel_url: returnUrl.href
    }, { idempotencyKey: `vcs-checkout-${user.id}-${Math.floor(Date.now() / 300000)}` });
    if (!session.url) throw new Error('Missing checkout URL');
    send(200, { ok: true, url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[Backend] Billing request failed:', err);
    send(500, { error: 'Billing request failed. Please try again.' });
  }
}
