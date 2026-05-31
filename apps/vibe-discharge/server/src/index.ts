import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { AuthUser } from '@vibetech/auth';
import {
  createStripeWebhookBus,
  deriveStripeSubscriptionMrr,
  getStripeClient,
  readStripeObjectId,
  resolveStripeWebhookEvent,
  type StripeCheckoutSessionLike,
  type StripeInvoiceLike,
  type StripeSubscriptionLike,
  type StripeWebhookBusEvent,
  type StripeWebhookVerifierLike,
} from '@vibetech/billing';
import {
  getAiUsage,
  recordAiUsage,
  createFetchGeminiProvider,
  createFetchOpenRouterProvider,
  generateWithMetering,
  type AiGenerateInput,
  type AiProvider,
} from '@vibetech/ai';
import { buildPaymentReceiptEmail } from '@vibetech/email';
import {
  buildLogoutCookie,
  buildSessionCookie,
  getAuthConfigError,
  readAuthStatus,
  verifyLogin,
} from './authSession.js';
import {
  GENERATED_FEATURES,
  GENERATED_TENANT_ID,
  hasFeature,
  resolveGeneratedPlan,
} from './entitlements.js';
import fastifyRawBody from 'fastify-raw-body';
import { loadLocalEnv } from './loadLocalEnv.js';
import {
  getActiveSubscriptionForEmail,
  getStoredMrrMetadata,
  getStripeCustomerIdForUser,
  hasProcessedEvent,
  markEventProcessed,
  upsertCustomer,
  upsertSubscription,
  updateSubscriptionStatus,
  type MrrMetadata,
} from './db.js';

loadLocalEnv();

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 5320);
const host = process.env.HOST ?? '127.0.0.1';

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(fastifyRawBody, {
  field: 'rawBody',
  global: false,
});

app.get('/api/health', async () => ({
  ok: true,
  app: 'discharge-ez',
}));

app.get('/api/auth/me', async (req) => {
  const status = await readAuthStatus(req.headers.cookie);

  return {
    ok: true,
    configured: status.configured,
    user: status.user,
  };
});

app.post('/api/auth/login', async (req, reply) => {
  if (!(await isAuthReady())) {
    return reply.code(503).send({
      error: 'Authentication is not configured',
      detail: getAuthConfigError(),
    });
  }

  const body = normalizeLoginInput(req.body);
  if (!body) {
    return reply.code(400).send({
      error: 'Invalid login payload',
    });
  }

  const user = await verifyLogin(body.email, body.password);
  if (!user) {
    return reply.code(401).send({
      error: 'Invalid email or password',
    });
  }

  reply.header('set-cookie', buildSessionCookie(user));
  return {
    ok: true,
    user,
  };
});

app.post('/api/auth/logout', async (_req, reply) => {
  reply.header('set-cookie', buildLogoutCookie());
  return {
    ok: true,
  };
});

app.get('/api/pro', async (req, reply) => {
  const authUser = await requireAuth(req.headers.cookie);
  if (!authUser) {
    return reply.code(401).send({
      error: 'Sign in to access the pro route',
    });
  }

  // Prefer DB-backed subscription state; fall back to x-plan header for dev/test
  const dbSub = authUser.email
    ? getActiveSubscriptionForEmail(authUser.email)
    : null;
  const plan = dbSub ? (dbSub.plan as 'free' | 'starter' | 'pro' | 'business') : resolveGeneratedPlan(req.headers['x-plan']);

  if (!hasFeature(plan, GENERATED_FEATURES.premiumRoute)) {
    return reply.code(403).send({
      error: 'Upgrade required to access this feature.',
      plan,
      upgradeUrl: `${process.env.APP_BASE_URL ?? `http://${host}:${port}`}#pricing`,
    });
  }

  return {
    ok: true,
    user: authUser,
    plan,
    feature: GENERATED_FEATURES.premiumRoute,
  };
});

interface StripeListResponse<T> {
  data: T[];
}

interface StripeApiClient {
  checkout: {
    sessions: {
      create(input: StripeSubscriptionCheckoutInput): Promise<{
        id: string;
        url: string | null;
      }>;
    };
  };
  subscriptions: {
    retrieve(subscriptionId: string, options?: { expand?: string[] }): Promise<StripeSubscriptionLike>;
    list(input: {
      status: 'active';
      limit: number;
      expand?: string[];
    }): Promise<StripeListResponse<StripeSubscriptionLike>>;
  };
  webhooks: {
    constructEvent(rawBody: Buffer, signature: string, secret: string): StripeWebhookBusEvent;
  };
}

interface StripeSubscriptionCheckoutInput {
  mode: 'subscription';
  line_items: Array<
    | {
        price: string;
        quantity: number;
      }
    | {
        price_data: {
          currency: string;
          product_data: {
            name: string;
          };
          unit_amount: number;
          recurring: {
            interval: 'month';
          };
        };
        quantity: number;
      }
  >;
  success_url: string;
  cancel_url: string;
  customer?: string;
  customer_email?: string;
  metadata: Record<string, string>;
  subscription_data: {
    metadata: Record<string, string>;
  };
  allow_promotion_codes: boolean;
}

const stripeWebhookBus = createStripeWebhookBus({
  hasProcessedEvent,
  markEventProcessed: (event) => {
    markEventProcessed(event.id, event.type);
  },
  handlers: {
    'checkout.session.completed': async (event) => {
      const session = event.data.object as StripeCheckoutSessionLike;
      if (session.mode !== 'subscription' || !session.customer || !session.subscription) {
        return;
      }

      const customerId = readStripeObjectId(session.customer);
      const subscriptionId = readStripeObjectId(session.subscription);
      const email = session.customer_email ?? session.customer_details?.email ?? '';
      const userId = session.metadata?.userId ?? null;
      if (customerId && email) {
        upsertCustomer(customerId, email, userId);
      }

      if (!subscriptionId) {
        return;
      }

      const sub = await getStripeApiClient().subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
      });
      mirrorStripeSubscription(sub, {
        fallbackCustomerId: customerId,
        fallbackUserId: userId,
        fallbackEmail: email,
      });
    },
    'customer.subscription.created': (event) => {
      mirrorStripeSubscription(event.data.object as StripeSubscriptionLike);
    },
    'customer.subscription.updated': (event) => {
      mirrorStripeSubscription(event.data.object as StripeSubscriptionLike);
    },
    'customer.subscription.deleted': (event) => {
      const sub = event.data.object as StripeSubscriptionLike;
      updateSubscriptionStatus(sub.id, 'canceled', null, false);
    },
    'customer.subscription.trial_will_end': (event, context) => {
      mirrorStripeSubscription(event.data.object as StripeSubscriptionLike);
      context.logger?.info?.({ eventId: event.id }, 'Trial ending soon event received');
    },
    'invoice.payment_failed': (event) => {
      const invoice = event.data.object as StripeInvoiceLike;
      const subId = readStripeObjectId(invoice.subscription);
      if (subId) {
        updateSubscriptionStatus(subId, 'past_due', null, false);
      }
    },
  },
  prefixHandlers: [
    {
      prefix: 'customer.subscription.',
      handle: (event) => {
        mirrorStripeSubscription(event.data.object as StripeSubscriptionLike);
      },
    },
  ],
  defaultHandler: (event, context) => {
    context.logger?.debug?.({ type: event.type }, 'Unhandled Stripe event type');
  },
});

// ── Stripe webhook ────────────────────────────────────────────────────────────

app.post('/api/webhooks/stripe', {
  config: { rawBody: true },
}, async (req, reply) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    req.log.warn('STRIPE_WEBHOOK_SECRET is not set — skipping signature verification');
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return reply.code(503).send({ error: 'Stripe is not configured' });
  }

  const stripe = getStripeApiClient();
  let event: StripeWebhookBusEvent;

  try {
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    event = resolveStripeWebhookEvent({
      rawBody,
      signature: req.headers['stripe-signature'],
      secret: webhookSecret,
      parsedBody: req.body,
      stripeClient: stripe as unknown as StripeWebhookVerifierLike,
      allowUnsigned: !webhookSecret,
    });
  } catch (err) {
    req.log.error({ err }, 'Stripe webhook signature verification failed');
    return reply.code(400).send({ error: 'Webhook signature invalid' });
  }

  try {
    const result = await stripeWebhookBus.dispatch(event, { logger: req.log });
    return { ok: true, handled: result.handled, skipped: result.skipped };
  } catch (err) {
    req.log.error({ err, eventId: event.id }, 'Failed to process Stripe event');
    return reply.code(500).send({ error: 'Webhook handler error' });
  }
});

app.get('/api/emails/demo-receipt', async () => {
  const viewUrl = `${process.env.APP_BASE_URL ?? `http://${host}:${port}`}/billing/receipt-preview`;
  const email = await buildPaymentReceiptEmail({
    invoiceNumber: 'DEMO-100',
    amount: 19,
    currency: 'USD',
    paidAt: '2026-05-15',
    viewUrl,
    companyName: 'DischargeEz',
    clientName: 'Demo customer',
  });

  return {
    ok: true,
    subject: email.subject,
    html: email.html,
    text: email.text,
  };
});

app.post('/api/pro/rewrite', async (req, reply) => {
  const authUser = await requireAuth(req.headers.cookie);
  if (!authUser) {
    return reply.code(401).send({
      error: 'Sign in to access pro rewrite guidance',
    });
  }

  const plan = resolveGeneratedPlan(req.headers['x-plan']);
  if (!hasFeature(plan, GENERATED_FEATURES.premiumRoute)) {
    return reply.code(403).send({
      error: 'Upgrade required',
      plan,
    });
  }

  return {
    ok: true,
    user: authUser,
    plan,
    rewrite: {
      recommendedCta: 'Open the paid DischargeEz workflow this week to unlock the premium action.',
    },
  };
});

app.get('/api/billing/demo-checkout', async (req, reply) => {
  const authUser = await requireAuth(req.headers.cookie);
  if (!authUser) {
    return reply.code(401).send({
      error: 'Sign in before starting checkout',
    });
  }

  const baseUrl = process.env.APP_BASE_URL ?? `http://${host}:${port}`;
  const plan = 'pro';

  try {
    const stripe = getStripeApiClient();
    const existingCustomerId = getStripeCustomerIdForUser(authUser.id);
    const metadata = {
      app: 'discharge-ez',
      tenant_id: GENERATED_TENANT_ID,
      plan,
      userId: authUser.id,
      userEmail: authUser.email,
    };
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: buildCheckoutLineItems(),
      success_url: `${baseUrl}/billing/success`,
      cancel_url: `${baseUrl}/billing/canceled`,
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_email: authUser.email }),
      metadata,
      subscription_data: {
        metadata,
      },
      allow_promotion_codes: true,
    });

    return {
      ok: true,
      url: session.url,
      sessionId: session.id,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    req.log.error({ err: error }, 'Demo checkout session failed');
    return reply.code(503).send({
      error: 'Stripe checkout is not configured',
      detail,
    });
  }
});

app.get('/api/billing/mrr', async () => {
  return {
    ok: true,
    monetization: await getMrrMetadata(),
  };
});

app.post('/api/ai/demo-usage', async (req, reply) => {
  const authUser = await requireAuth(req.headers.cookie);
  if (!authUser) {
    return reply.code(401).send({
      error: 'Sign in to access AI usage metering',
    });
  }

  const plan = resolveGeneratedPlan(req.headers['x-plan']);
  if (!hasFeature(plan, GENERATED_FEATURES.aiAssistant)) {
    return reply.code(403).send({
      error: 'Upgrade required',
      plan,
    });
  }

  const usage = recordAiUsage({
    appId: 'discharge-ez',
    tenantId: GENERATED_TENANT_ID,
    provider: 'openrouter',
    usage: {
      inputTokens: 120,
      outputTokens: 80,
      totalTokens: 200,
      costUsd: 0,
    },
  });

  return {
    ok: true,
    user: authUser,
    usage,
    summary: getAiUsage('discharge-ez', 'openrouter', GENERATED_TENANT_ID),
  };
});

function getAiProvider() {
  if (process.env.GEMINI_API_KEY) {
    return createFetchGeminiProvider({ apiKey: process.env.GEMINI_API_KEY });
  }
  if (process.env.OPENROUTER_API_KEY) {
    return createFetchOpenRouterProvider({ apiKey: process.env.OPENROUTER_API_KEY });
  }
  return {
    name: 'gemini' as const,
    async generate(input: AiGenerateInput) {
      const promptText = input.prompt ?? '';
      const mockResult = `[SIMPLIFIED INSTRUCTION (Mocked Gemini Output)]:\nHere are the simplified, 5th-grade reading level patient instructions:\n\n1. Take your medication as prescribed.\n2. Keep your surgical site clean and dry.\n3. Drink plenty of water and rest.\n\nInput received: "${promptText.substring(0, 50)}..."`;
      return {
        provider: 'gemini' as const,
        model: 'mock-model',
        text: mockResult,
        usage: { inputTokens: 50, outputTokens: 80, totalTokens: 130 }
      };
    }
  } as AiProvider;
}

app.post('/api/simplify', async (req, reply) => {
  const body = req.body as { text?: string; language?: string };
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const language = typeof body.language === 'string' ? body.language.trim() : 'English';

  if (!text) {
    return reply.code(400).send({ error: 'Text input is required' });
  }

  const prompt = `Simplify the following clinical patient discharge instructions to a 5th-grade reading level. Keep the tone empathetic and clear. Translate the output to ${language}.\n\nClinical Instructions:\n${text}`;

  try {
    const provider = getAiProvider();
    const result = await generateWithMetering(provider, {
      appId: 'discharge-ez',
      prompt,
      tenantId: GENERATED_TENANT_ID,
      model: provider.name === 'gemini' ? 'gemini-2.5-flash' : 'google/gemini-2.5-flash',
    });

    return {
      ok: true,
      originalText: text,
      simplifiedText: result.text,
      language,
      usage: result.usage,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    req.log.error({ err: error }, 'AI generation failed');
    return reply.code(500).send({
      error: 'Failed to simplify instructions',
      detail,
    });
  }
});

await app.listen({ port, host });

function normalizeLoginInput(body: unknown): {
  email: string;
  password: string;
} | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const raw = body as Record<string, unknown>;
  const email = typeof raw.email === 'string' ? raw.email.trim() : '';
  const password = typeof raw.password === 'string' ? raw.password : '';

  if (!email || !password) {
    return null;
  }

  return {
    email,
    password,
  };
}

async function isAuthReady(): Promise<boolean> {
  return (await readAuthStatus(undefined)).configured;
}

async function requireAuth(cookieHeader: string | undefined): Promise<AuthUser | null> {
  const status = await readAuthStatus(cookieHeader);
  if (!status.configured) {
    return null;
  }

  return status.user;
}

function getStripeApiClient(): StripeApiClient {
  return getStripeClient() as unknown as StripeApiClient;
}

function buildCheckoutLineItems(): StripeSubscriptionCheckoutInput['line_items'] {
  const configuredPriceId =
    process.env.DISCHARGE_EZ_STRIPE_PRICE_ID?.trim() ??
    process.env.STRIPE_PRO_PRICE_ID?.trim();

  if (configuredPriceId) {
    return [
      {
        price: configuredPriceId,
        quantity: 1,
      },
    ];
  }

  return [
    {
      price_data: {
        currency: (process.env.DISCHARGE_EZ_PRO_CURRENCY ?? 'usd').toLowerCase(),
        product_data: {
          name: 'DischargeEz Pro',
        },
        unit_amount: readPositiveInteger(process.env.DISCHARGE_EZ_PRO_MONTHLY_CENTS, 900),
        recurring: {
          interval: 'month',
        },
      },
      quantity: 1,
    },
  ];
}

function mirrorStripeSubscription(
  sub: StripeSubscriptionLike,
  fallback: {
    fallbackCustomerId?: string | null;
    fallbackUserId?: string | null;
    fallbackEmail?: string | null;
  } = {},
): void {
  const customerId = readStripeObjectId(sub.customer) ?? fallback.fallbackCustomerId;
  const userId = sub.metadata?.userId ?? fallback.fallbackUserId ?? null;
  const email = sub.metadata?.userEmail ?? fallback.fallbackEmail ?? null;

  if (!customerId) {
    return;
  }

  if (email) {
    upsertCustomer(customerId, email, userId);
  }

  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;
  const mrr = deriveStripeSubscriptionMrr(sub);

  upsertSubscription(
    sub.id,
    customerId,
    userId,
    sub.status,
    sub.metadata?.plan ?? 'pro',
    mrr.currency,
    sub.status === 'active' ? mrr.monthlyMrrCents : 0,
    periodEnd,
    Boolean(sub.cancel_at_period_end),
  );
}

async function getMrrMetadata(): Promise<MrrMetadata> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return getStoredMrrMetadata();
  }

  try {
    const subscriptions = await getStripeApiClient().subscriptions.list({
      status: 'active',
      limit: 100,
      expand: ['data.items.data.price'],
    });
    const totals = new Map<string, { mrrCents: number; activeSubscriptions: number }>();

    for (const subscription of subscriptions.data) {
      const mrr = deriveStripeSubscriptionMrr(subscription);
      const current = totals.get(mrr.currency) ?? { mrrCents: 0, activeSubscriptions: 0 };
      current.mrrCents += mrr.monthlyMrrCents;
      current.activeSubscriptions += 1;
      totals.set(mrr.currency, current);
    }

    const [currency, total] =
      [...totals.entries()].sort((left, right) => right[1].mrrCents - left[1].mrrCents)[0] ??
      ['usd', { mrrCents: 0, activeSubscriptions: 0 }];

    return {
      mrrCents: Math.round(total.mrrCents),
      currency,
      activeSubscriptions: total.activeSubscriptions,
      source: 'stripe-live',
    };
  } catch {
    return getStoredMrrMetadata();
  }
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
