import cors from '@fastify/cors';
import Fastify from 'fastify';
import Stripe from 'stripe';
import type { AuthUser } from '@vibetech/auth';
import {
  getAiUsage,
  recordAiUsage,
  createFetchGeminiProvider,
  createFetchOpenRouterProvider,
  generateWithMetering,
} from '@vibetech/ai';
import { buildPaymentReceiptEmail } from '@vibetech/email';
import { createTenantCheckoutSession } from '@vibetech/payments';
import {
  buildGeneratedLogoutCookie,
  buildGeneratedSessionCookie,
  getGeneratedAuthConfigError,
  readGeneratedAuthStatus,
  verifyGeneratedLogin,
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
  hasProcessedEvent,
  markEventProcessed,
  upsertCustomer,
  upsertSubscription,
  updateSubscriptionStatus,
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
  const status = readGeneratedAuthStatus(req.headers.cookie);

  return {
    ok: true,
    configured: status.configured,
    user: status.user,
  };
});

app.post('/api/auth/login', async (req, reply) => {
  if (!isGeneratedAuthReady()) {
    return reply.code(503).send({
      error: 'Generated auth is not configured',
      detail: getGeneratedAuthConfigError(),
    });
  }

  const body = normalizeLoginInput(req.body);
  if (!body) {
    return reply.code(400).send({
      error: 'Invalid login payload',
    });
  }

  const user = verifyGeneratedLogin(body.email, body.password);
  if (!user) {
    return reply.code(401).send({
      error: 'Invalid email or password',
    });
  }

  reply.header('set-cookie', buildGeneratedSessionCookie(user));
  return {
    ok: true,
    user,
  };
});

app.post('/api/auth/logout', async (_req, reply) => {
  reply.header('set-cookie', buildGeneratedLogoutCookie());
  return {
    ok: true,
  };
});

app.get('/api/pro', async (req, reply) => {
  const authUser = requireGeneratedAuth(req.headers.cookie);
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

interface StripeSubscription {
  id: string;
  status: string;
  customer: string | { id: string };
  current_period_end: number | null;
  metadata?: Record<string, string | undefined>;
  cancel_at_period_end: boolean;
}

interface StripeInvoice {
  subscription: string | { id: string } | null;
}

// ── Stripe webhook ────────────────────────────────────────────────────────────

app.post('/api/webhooks/stripe', {
  config: { rawBody: true },
}, async (req, reply) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    req.log.warn('STRIPE_WEBHOOK_SECRET is not set — skipping signature verification');
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return reply.code(503).send({ error: 'Stripe is not configured' });
  }

  const stripe = new Stripe(stripeSecretKey);
  let event: Stripe.Event;

  try {
    const sig = req.headers['stripe-signature'];
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;

    if (webhookSecret && sig && rawBody) {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      // No secret configured (dev mode) — trust the parsed body
      event = req.body as Stripe.Event;
    }
  } catch (err) {
    req.log.error({ err }, 'Stripe webhook signature verification failed');
    return reply.code(400).send({ error: 'Webhook signature invalid' });
  }

  // Idempotency guard
  if (hasProcessedEvent(event.id)) {
    req.log.info({ eventId: event.id }, 'Stripe event already processed — skipping');
    return { ok: true, skipped: true };
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.customer && session.subscription) {
          const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
          const email = session.customer_email ?? session.customer_details?.email ?? '';
          if (email) upsertCustomer(customerId, email);

          // Fetch full subscription to get period end and plan
          const sub = (await stripe.subscriptions.retrieve(
            typeof session.subscription === 'string' ? session.subscription : session.subscription.id,
          )) as unknown as StripeSubscription;
          const periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;
          const planName = sub.metadata?.plan ?? 'pro';
          upsertSubscription(sub.id, customerId, sub.status, planName, periodEnd, sub.cancel_at_period_end);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as unknown as StripeSubscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;
        upsertSubscription(sub.id, customerId, sub.status, sub.metadata?.plan ?? 'pro', periodEnd, sub.cancel_at_period_end);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as unknown as StripeSubscription;
        updateSubscriptionStatus(sub.id, 'canceled', null, false);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as StripeInvoice;
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : (invoice.subscription?.id ?? null);
        if (subId) {
          updateSubscriptionStatus(subId, 'past_due', null, false);
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        // Log for now — hook into email/notification here
        req.log.info({ eventId: event.id }, 'Trial ending soon event received');
        break;
      }

      default:
        req.log.debug({ type: event.type }, 'Unhandled Stripe event type');
    }

    markEventProcessed(event.id, event.type);
    return { ok: true };
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
  const authUser = requireGeneratedAuth(req.headers.cookie);
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
  const baseUrl = process.env.APP_BASE_URL ?? `http://${host}:${port}`;
  const plan = 'pro';

  try {
    const session = await createTenantCheckoutSession({
      tenantId: GENERATED_TENANT_ID,
      plan,
      currency: 'USD',
      successUrl: `${baseUrl}/billing/success`,
      cancelUrl: `${baseUrl}/billing/canceled`,
      metadata: {
        app: 'discharge-ez',
        plan: 'pro',
      },
      lineItems: [
        {
          name: 'DischargeEz Pro',
          unitAmount: 19,
        },
      ],
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

app.post('/api/ai/demo-usage', async (req, reply) => {
  const authUser = requireGeneratedAuth(req.headers.cookie);
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
    async generate(input: { prompt: string }) {
      const mockResult = `[SIMPLIFIED INSTRUCTION (Mocked Gemini Output)]:\nHere are the simplified, 5th-grade reading level patient instructions:\n\n1. Take your medication as prescribed.\n2. Keep your surgical site clean and dry.\n3. Drink plenty of water and rest.\n\nInput received: "${input.prompt.substring(0, 50)}..."`;
      return {
        provider: 'gemini' as const,
        model: 'mock-model',
        text: mockResult,
        usage: { inputTokens: 50, outputTokens: 80, totalTokens: 130 }
      };
    }
  };
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

function isGeneratedAuthReady(): boolean {
  return readGeneratedAuthStatus(undefined).configured;
}

function requireGeneratedAuth(cookieHeader: string | undefined): AuthUser | null {
  const status = readGeneratedAuthStatus(cookieHeader);
  if (!status.configured) {
    return null;
  }

  return status.user;
}
