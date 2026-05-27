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
  resolveGeneratedPlan,
} from './entitlements.js';
import { loadLocalEnv } from './loadLocalEnv.js';
import { AppDatabase } from '@vibetech/db-app';
import { setupStripeTenant } from './stripeSetup.js';

loadLocalEnv();

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 5360);
const host = process.env.HOST ?? '127.0.0.1';

// Auto-initialize SQLite database schemas from monetization PRD
function initializeDatabaseSchema() {
  try {
    app.log.info('Initializing SQLite database schema...');
    const db = AppDatabase.getInstance().getDatabase();

    db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID,
        name VARCHAR(255),
        plan_id VARCHAR(50),
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID,
        email VARCHAR(255),
        password_hash VARCHAR(255),
        company_id UUID,
        role VARCHAR(50),
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS cme_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        title TEXT NOT NULL,
        hours REAL NOT NULL,
        category TEXT NOT NULL,
        date_earned TEXT NOT NULL,
        provider TEXT NOT NULL
      );
    `);

    app.log.info('SQLite database schema initialized successfully!');

    // Seed default company and operator user if they don't exist
    const email = process.env.DEMO_USER_EMAIL || 'owner@example.com';
    const defaultPlan = process.env.DEMO_PLAN || 'free';
    const companyId = 'default-company-uuid';

    // Always sync the plan on startup to match environment settings (crucial for E2E tests)
    const existingCompany = db.prepare('SELECT id FROM companies WHERE id = ?').get(companyId);
    if (existingCompany) {
      db.prepare('UPDATE companies SET plan_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(defaultPlan, companyId);
      app.log.info(`Synchronized company plan to ${defaultPlan} on startup`);
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!existingUser) {
      app.log.info('Seeding default operator user and company in SQLite...');
      const userId = 'generated-owner'; // Must match GENERATED_USER_ID from authSession.ts
      
      if (!existingCompany) {
        db.prepare(`
          INSERT INTO companies (id, name, plan_id, created_at, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(companyId, 'CME Track Owner Company', defaultPlan);
      }
      
      db.prepare(`
        INSERT INTO users (id, email, password_hash, company_id, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(userId, email, 'no-password-hash-needed-for-demo', companyId, 'owner');
      
      app.log.info('Seeding completed successfully!');
    }
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
    'checkout.session.completed': async (event, context) => {
      const session = event.data.object as StripeCheckoutSessionLike;
      context.logger?.info?.(
        {
          app: 'cme-track',
          eventId: event.id,
          sessionId: session.id,
          customerEmail: session.customer_email ?? session.customer_details?.email ?? null,
        },
        'Stripe checkout session completed',
      );

      const email = session.metadata?.email || session.customer_email || session.customer_details?.email;
      const plan = session.metadata?.plan || 'pro';

      if (email) {
        try {
          const db = AppDatabase.getInstance().getDatabase();
          const userRow = db.prepare('SELECT company_id FROM users WHERE email = ?').get(email) as { company_id: string } | undefined;
          if (userRow?.company_id) {
            db.prepare('UPDATE companies SET plan_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(plan, userRow.company_id);
            context.logger?.info?.({ email, plan, companyId: userRow.company_id }, 'Successfully upgraded company plan in database via webhook');
          } else {
            context.logger?.info?.({ email }, 'User or company not found for plan upgrade in webhook');
          }

          // Write back monetization metrics to vibe-app.json
          const fs = await import('node:fs');
          const path = await import('node:path');
          const manifestPath = path.join(process.cwd(), 'vibe-app.json');
          if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            manifest.monetization = manifest.monetization || {};
            manifest.monetization.stripeConnected = true;
            if (!manifest.monetization.firstRevenueAt) {
              manifest.monetization.firstRevenueAt = new Date().toISOString().split('T')[0];
            }
            const addedMrr = plan === 'pro' ? 900 : 0;
            manifest.monetization.mrrCents = (manifest.monetization.mrrCents ?? 0) + addedMrr;
            manifest.monetization.currency = (session as any).currency || manifest.monetization.currency || 'usd';

            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
            context.logger?.info?.({}, 'Updated vibe-app.json with webhook monetization signals');
          }
        } catch (dbErr) {
          context.logger?.info?.({ err: dbErr, email }, 'Failed to process checkout webhook SQL/manifest updates');
        }
      }
    },
  },
  prefixHandlers: [
    {
      prefix: 'customer.subscription.',
      handle: (event, context) => {
        const subscription = event.data.object as StripeSubscriptionLike;
        context.logger?.info?.(
          {
            app: 'cme-track',
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
  app: 'cme-track',
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

  const db = AppDatabase.getInstance().getDatabase();
  const userRow = db.prepare('SELECT company_id FROM users WHERE email = ?').get(authUser.email) as { company_id: string } | undefined;
  let plan = resolveGeneratedPlan('free');
  if (userRow?.company_id) {
    const companyRow = db.prepare('SELECT plan_id FROM companies WHERE id = ?').get(userRow.company_id) as { plan_id: string } | undefined;
    plan = resolveGeneratedPlan(companyRow?.plan_id);
  }

  if (plan !== 'pro') {
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
    amount: 9,
    currency: 'USD',
    paidAt: '2026-05-15',
    viewUrl,
    companyName: 'CME Track',
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

  const db = AppDatabase.getInstance().getDatabase();
  const userRow = db.prepare('SELECT company_id FROM users WHERE email = ?').get(authUser.email) as { company_id: string } | undefined;
  let plan = resolveGeneratedPlan('free');
  if (userRow?.company_id) {
    const companyRow = db.prepare('SELECT plan_id FROM companies WHERE id = ?').get(userRow.company_id) as { plan_id: string } | undefined;
    plan = resolveGeneratedPlan(companyRow?.plan_id);
  }

  if (plan !== 'pro') {
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
      recommendedCta: 'Open the paid CME Track workflow this week to unlock the premium action.',
    },
  };
});

app.get('/api/billing/demo-checkout', async (req, reply) => {
  const authUser = requireGeneratedAuth(req.headers.cookie);
  if (!authUser) {
    return reply.code(401).send({
      error: 'Sign in to access checkout',
    });
  }

  const baseUrl = process.env.APP_BASE_URL ?? `http://${host}:${port}`;
  const plan = 'pro';

  try {
    const session = await createTenantCheckoutSession({
      tenantId: GENERATED_TENANT_ID,
      plan,
      currency: 'USD',
      successUrl: `${baseUrl}/billing/success`,
      cancelUrl: `${baseUrl}/billing/canceled`,
      customerEmail: authUser.email,
      metadata: {
        app: 'cme-track',
        plan: 'pro',
        email: authUser.email,
      },
      lineItems: [
        {
          name: 'CME Track Pro',
          unitAmount: 9,
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

  const db = AppDatabase.getInstance().getDatabase();
  const userRow = db.prepare('SELECT company_id FROM users WHERE email = ?').get(authUser.email) as { company_id: string } | undefined;
  let plan = resolveGeneratedPlan('free');
  if (userRow?.company_id) {
    const companyRow = db.prepare('SELECT plan_id FROM companies WHERE id = ?').get(userRow.company_id) as { plan_id: string } | undefined;
    plan = resolveGeneratedPlan(companyRow?.plan_id);
  }

  if (plan !== 'pro') {
    return reply.code(403).send({
      error: 'Upgrade required',
      plan,
    });
  }

  const usage = recordAiUsage({
    appId: 'cme-track',
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
    summary: getAiUsage('cme-track', 'openrouter', GENERATED_TENANT_ID),
  };
});

// Gated CME Tracker CRUD endpoints
app.get('/api/cme', async (req, reply) => {
  const authUser = requireGeneratedAuth(req.headers.cookie);
  if (!authUser) {
    return reply.code(401).send({
      error: 'Sign in to access the CME tracker',
    });
  }

  const db = AppDatabase.getInstance().getDatabase();
  const userRow = db.prepare('SELECT company_id FROM users WHERE email = ?').get(authUser.email) as { company_id: string } | undefined;
  let plan = resolveGeneratedPlan('free');
  if (userRow?.company_id) {
    const companyRow = db.prepare('SELECT plan_id FROM companies WHERE id = ?').get(userRow.company_id) as { plan_id: string } | undefined;
    plan = resolveGeneratedPlan(companyRow?.plan_id);
  }

  if (plan !== 'pro') {
    return reply.code(403).send({
      error: 'Upgrade required',
      plan,
    });
  }

  const activities = db.prepare('SELECT * FROM cme_activities WHERE user_email = ? ORDER BY date_earned DESC').all(authUser.email);
  return {
    ok: true,
    activities,
  };
});

app.post('/api/cme', async (req, reply) => {
  const authUser = requireGeneratedAuth(req.headers.cookie);
  if (!authUser) {
    return reply.code(401).send({
      error: 'Sign in to log CME credits',
    });
  }

  const db = AppDatabase.getInstance().getDatabase();
  const userRow = db.prepare('SELECT company_id FROM users WHERE email = ?').get(authUser.email) as { company_id: string } | undefined;
  let plan = resolveGeneratedPlan('free');
  if (userRow?.company_id) {
    const companyRow = db.prepare('SELECT plan_id FROM companies WHERE id = ?').get(userRow.company_id) as { plan_id: string } | undefined;
    plan = resolveGeneratedPlan(companyRow?.plan_id);
  }

  if (plan !== 'pro') {
    return reply.code(403).send({
      error: 'Upgrade required',
      plan,
    });
  }

  const body = req.body as {
    title: string;
    hours: number;
    category: string;
    date_earned: string;
    provider: string;
  };

  if (!body.title || typeof body.hours !== 'number' || !body.category || !body.date_earned || !body.provider) {
    return reply.code(400).send({
      error: 'Missing required CME activity fields',
    });
  }

  db.prepare(`
    INSERT INTO cme_activities (user_email, title, hours, category, date_earned, provider)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(authUser.email, body.title, body.hours, body.category, body.date_earned, body.provider);

  return {
    ok: true,
  };
});

app.delete('/api/cme/:id', async (req, reply) => {
  const authUser = requireGeneratedAuth(req.headers.cookie);
  if (!authUser) {
    return reply.code(401).send({
      error: 'Sign in to delete CME credits',
    });
  }

  const db = AppDatabase.getInstance().getDatabase();
  const userRow = db.prepare('SELECT company_id FROM users WHERE email = ?').get(authUser.email) as { company_id: string } | undefined;
  let plan = resolveGeneratedPlan('free');
  if (userRow?.company_id) {
    const companyRow = db.prepare('SELECT plan_id FROM companies WHERE id = ?').get(userRow.company_id) as { plan_id: string } | undefined;
    plan = resolveGeneratedPlan(companyRow?.plan_id);
  }

  if (plan !== 'pro') {
    return reply.code(403).send({
      error: 'Upgrade required',
      plan,
    });
  }

  const { id } = req.params as { id: string };

  db.prepare('DELETE FROM cme_activities WHERE id = ? AND user_email = ?').run(id, authUser.email);

  return {
    ok: true,
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
