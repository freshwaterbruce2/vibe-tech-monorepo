import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { AuthUser } from '@vibetech/auth';
import {
  createStripeWebhookBus,
  getStripeClient,
  resolveStripeWebhookEvent,
  type StripeCheckoutSessionLike,
  type StripeSubscriptionLike,
  type StripeWebhookVerifierLike,
} from '@vibetech/billing';
import { getAiUsage, recordAiUsage } from '@vibetech/ai';
import { buildPaymentReceiptEmail } from '@vibetech/email';
import { createTenantCheckoutSession } from '@vibetech/payments';
import fastifyRawBody from 'fastify-raw-body';
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
import { loadLocalEnv } from './loadLocalEnv.js';
import { AppDatabase } from '@vibetech/db-app';
import { setupStripeTenant } from './stripeSetup.js';

loadLocalEnv();

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 5320);
const host = process.env.HOST ?? '127.0.0.1';

// Auto-initialize SQLite database schemas from monetization PRD
function initializeDatabaseSchema() {
  try {
    app.log.info('Initializing SQLite database schema...');
    const db = AppDatabase.getInstance().getDatabase();

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID,
        email VARCHAR(255),
        password_hash VARCHAR(255),
        role VARCHAR(50),
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS patients (
        id UUID,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        phone_number VARCHAR(20),
        email VARCHAR(255),
        date_of_birth DATE,
        address TEXT,
        notes TEXT,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS dentists (
        id UUID,
        user_id UUID,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        specialty VARCHAR(255),
        phone_number VARCHAR(20),
        email VARCHAR(255),
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID,
        patient_id UUID,
        dentist_id UUID,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        status VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS sms_notifications (
        id UUID,
        appointment_id UUID,
        patient_id UUID,
        message_body TEXT,
        sent_at TIMESTAMP,
        status VARCHAR(50)
      );
    `);

    app.log.info('SQLite database schema initialized successfully!');
  } catch (err) {
    app.log.error({ err }, 'Failed to initialize database schema');
  }
}

initializeDatabaseSchema();

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(fastifyRawBody, {
  field: 'rawBody',
  global: false,
});

const processedStripeWebhookEvents = new Set<string>();
const stripeWebhookBus = createStripeWebhookBus({
  hasProcessedEvent: (eventId) => processedStripeWebhookEvents.has(eventId),
  markEventProcessed: (event) => {
    processedStripeWebhookEvents.add(event.id);
  },
  handlers: {
    'checkout.session.completed': (event, context) => {
      const session = event.data.object as StripeCheckoutSessionLike;
      context.logger?.info?.(
        {
          app: 'dental-scheduler',
          eventId: event.id,
          sessionId: session.id,
          customerEmail: session.customer_email ?? session.customer_details?.email ?? null,
        },
        'Stripe checkout session completed',
      );
    },
  },
  prefixHandlers: [
    {
      prefix: 'customer.subscription.',
      handle: (event, context) => {
        const subscription = event.data.object as StripeSubscriptionLike;
        context.logger?.info?.(
          {
            app: 'dental-scheduler',
            eventId: event.id,
            subscriptionId: subscription.id,
            status: subscription.status,
          },
          'Stripe subscription event received',
        );
      },
    },
  ],
  defaultHandler: (event, context) => {
    context.logger?.debug?.({ type: event.type }, 'Unhandled Stripe webhook event');
  },
});

app.get('/api/health', async () => ({
  ok: true,
  app: 'dental-scheduler',
}));

app.post(
  '/api/webhooks/stripe',
  {
    config: { rawBody: true },
  },
  async (req, reply) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      req.log.warn('STRIPE_WEBHOOK_SECRET is not set - accepting unsigned local webhook payloads');
    }

    try {
      const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
      const event = resolveStripeWebhookEvent({
        rawBody,
        signature: req.headers['stripe-signature'],
        secret: webhookSecret,
        parsedBody: req.body,
        stripeClient: webhookSecret
          ? (getStripeClient() as unknown as StripeWebhookVerifierLike)
          : undefined,
        allowUnsigned: !webhookSecret,
      });
      const result = await stripeWebhookBus.dispatch(event, { logger: req.log });

      return {
        ok: true,
        handled: result.handled,
        skipped: result.skipped,
      };
    } catch (error) {
      req.log.error({ err: error }, 'Stripe webhook processing failed');
      return reply.code(400).send({
        error: 'Stripe webhook invalid',
      });
    }
  },
);

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

  const user = await verifyGeneratedLogin(body.email, body.password);
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
    feature: GENERATED_FEATURES.premiumRoute,
  };
});

app.get('/api/emails/demo-receipt', async () => {
  const viewUrl = `${process.env.APP_BASE_URL ?? `http://${host}:${port}`}/billing/receipt-preview`;
  const email = await buildPaymentReceiptEmail({
    invoiceNumber: 'DEMO-100',
    amount: 19,
    currency: 'USD',
    paidAt: '2026-05-15',
    viewUrl,
    companyName: 'Vibe-Tech',
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
      recommendedCta:
        'Open the paid Vibe-Tech workflow this week to unlock the premium action.',
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
        app: 'dental-scheduler',
        plan: 'pro',
      },
      lineItems: [
        {
          name: 'Vibe-Tech Pro',
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
    appId: 'dental-scheduler',
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
    summary: getAiUsage('dental-scheduler', 'openrouter', GENERATED_TENANT_ID),
  };
});

// Run touchless Stripe tenant provisioning on startup
await setupStripeTenant(app.log);

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
