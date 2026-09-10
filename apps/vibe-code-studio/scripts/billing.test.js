import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { initializeUsage } from './lib/managed-ai.js';
const mocks = vi.hoisted(() => ({ checkout: vi.fn(), portal: vi.fn(), retrieve: vi.fn(), verify: vi.fn(), bus: vi.fn() }));
vi.mock('@vibetech/auth', () => ({ parseSessionToken: token => token === 'one' ? { sub: '1' } : null,
  getSessionCookieName: () => 'session', verifyPassword: vi.fn(), hashPassword: vi.fn(), createSessionToken: vi.fn() }));
vi.mock('@vibetech/billing', () => ({ getStripeClient: () => ({ checkout: { sessions: { create: mocks.checkout } },
  billingPortal: { sessions: { create: mocks.portal } }, subscriptions: { retrieve: mocks.retrieve } }),
  resolveStripeWebhookEvent: mocks.verify, createStripeWebhookBus: mocks.bus,
  readStripeObjectId: value => value, deriveStripeSubscriptionMrr: () => ({ currency: 'usd', monthlyMrrCents: 1900 }) }));
import { handleBilling } from './routes/billing.js';
import { routeAppRequest } from './routes/app-routes.js';
import { createWebhookBus } from './lib/stripe-bus.js';

let db;
const response = () => ({ writeHead: vi.fn(), end: vi.fn() });
const request = { method: 'POST', headers: { cookie: 'session=one' } };
beforeEach(() => {
  vi.clearAllMocks();
  for (const [name, value] of Object.entries({ VCS_MANAGED_AI_ENABLED: 'true', OPENROUTER_API_KEY: 'test',
    VCS_MANAGED_AI_MONTHLY_REQUESTS: '10', VCS_MANAGED_AI_MAX_TOKENS: '100', VCS_MANAGED_AI_MODELS: 'deepseek/test',
    STRIPE_SECRET_KEY: 'test', STRIPE_WEBHOOK_SECRET: 'secret', VCS_STRIPE_PRO_PRICE_ID: 'price_pro', VCS_BILLING_RETURN_URL: 'https://example.com/return' })) vi.stubEnv(name, value);
  db = new DatabaseSync(':memory:'); initializeUsage(db);
  db.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT); INSERT INTO users VALUES ('1','one@example.com');
    CREATE TABLE stripe_customers (id TEXT PRIMARY KEY, user_id TEXT, email TEXT);
    INSERT INTO stripe_customers VALUES ('cus_one','1','one@example.com');
    INSERT INTO stripe_customers VALUES ('cus_other','2','other@example.com');
    CREATE TABLE stripe_subscriptions (id TEXT PRIMARY KEY, customer_id TEXT, user_id TEXT, status TEXT, plan TEXT,
      currency TEXT, monthly_mrr_cents INTEGER, current_period_end TEXT, cancel_at_period_end INTEGER, updated_at TEXT);
    CREATE TABLE stripe_events (id TEXT PRIMARY KEY, type TEXT);`);
});
afterEach(() => { db.close(); vi.unstubAllEnvs(); });

describe('authenticated subscription billing', () => {
  it('creates a recurring configured price with metadata on subscription and checkout', async () => {
    mocks.checkout.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.com/test' });
    await handleBilling(request, response(), { db }, 'checkout');
    expect(mocks.checkout.mock.calls[0][0]).toMatchObject({ mode: 'subscription', customer: 'cus_one',
      line_items: [{ price: 'price_pro', quantity: 1 }], metadata: { userId: '1', app: 'vibe-code-studio' },
      subscription_data: { metadata: { userId: '1', app: 'vibe-code-studio' } } });
  });
  it('status and portal require authentication', async () => {
    for (const action of ['status', 'portal']) {
      const res = response(); await handleBilling({ headers: {} }, res, { db }, action);
      expect(res.writeHead).toHaveBeenCalledWith(401, expect.anything());
    }
    expect(mocks.portal).not.toHaveBeenCalled();
  });
  it('portal uses the signed-in customer and ignores client customer identifiers', async () => {
    mocks.portal.mockResolvedValue({ url: 'https://billing.stripe.com/test' });
    await handleBilling({ ...request, body: { customer: 'cus_other' } }, response(), { db }, 'portal');
    expect(mocks.portal).toHaveBeenCalledWith({ customer: 'cus_one', return_url: 'https://example.com/return' });
  });
  it('disables checkout until managed allowance and webhook verification are configured', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    const res = response(); await handleBilling(request, res, { db }, 'checkout');
    expect(res.writeHead).toHaveBeenCalledWith(503, expect.anything());
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
});

describe('Stripe webhook entitlement updates', () => {
  it('rejects missing verification configuration and invalid signatures', async () => {
    const ctx = { db, getBody: async () => '{}', stripeWebhookBus: { dispatch: vi.fn() } };
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    const unconfigured = response(); await routeAppRequest(request, unconfigured, '/api/webhooks/stripe', ctx);
    expect(unconfigured.writeHead).toHaveBeenCalledWith(503, expect.anything());
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'secret');
    mocks.verify.mockImplementation(() => { throw new Error('Bad signature'); });
    const invalid = response(); await routeAppRequest(request, invalid, '/api/webhooks/stripe', ctx);
    expect(invalid.writeHead).toHaveBeenCalledWith(400, expect.anything());
    expect(mocks.verify).toHaveBeenCalledWith(expect.objectContaining({ allowUnsigned: false }));
    expect(ctx.stripeWebhookBus.dispatch).not.toHaveBeenCalled();
  });
  it('refreshes delayed active events from Stripe instead of restoring canceled entitlement', async () => {
    mocks.bus.mockImplementation(config => config);
    const sub = { id: 'sub_one', customer: 'cus_one', status: 'canceled',
      metadata: { app: 'vibe-code-studio', userId: '1', userEmail: 'one@example.com', plan: 'pro' },
      items: { data: [{ price: { id: 'price_pro' }, current_period_end: 1999999999 }] } };
    mocks.retrieve.mockResolvedValue(sub);
    const bus = createWebhookBus(db);
    await bus.handlers['customer.subscription.updated']({ data: { object: { ...sub, status: 'active' } } });
    expect(mocks.retrieve).toHaveBeenCalledWith('sub_one');
    expect(db.prepare('SELECT status FROM stripe_subscriptions').get().status).toBe('canceled');
  });
});
