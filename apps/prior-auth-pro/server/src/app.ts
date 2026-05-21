import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { AuthUser } from '@vibetech/auth';
import { buildCheckoutSession, verifyWebhookSignature } from '@vibetech/billing';
import { PaymentReceipt, renderToHtml, renderToText } from '@vibetech/emails';

import {
  buildGeneratedLogoutCookie,
  buildGeneratedSessionCookie,
  getGeneratedAuthConfigError,
  readGeneratedAuthStatus,
  verifyGeneratedLogin,
} from './authSession.js';
import { generateAppealLetter, normalizeAppealInput } from './appeals.js';
import { createPriorAuthCheckoutSession } from './checkout.js';
import { GENERATED_FEATURES, hasFeature } from './entitlements.js';
import { loadLocalEnv } from './loadLocalEnv.js';
import { buildApiRootMetadata } from './rootMetadata.js';
import { processStripeWebhookEvent } from './stripeWebhook.js';
import {
  getPlanForUser,
  getSubscriptionForUser,
  recordAppealGeneration,
  recordCheckoutStarted,
} from './subscriptionState.js';

loadLocalEnv();

export const app = Fastify({ logger: true });

app.removeContentTypeParser('application/json');
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  const rawBody = typeof body === 'string' ? body : body.toString('utf8');
  if (req.url === '/api/billing/webhook') {
    done(null, rawBody);
    return;
  }

  try {
    done(null, rawBody.length > 0 ? JSON.parse(rawBody) : null);
  } catch (error) {
    done(error as Error);
  }
});

await app.register(cors, {
  origin: true,
  credentials: true,
});

app.get('/', async () => buildApiRootMetadata(resolveAppBaseUrl()));

app.get('/api/health', async () => ({
  ok: true,
  app: 'prior-auth-pro',
}));

app.get('/api/auth/me', async (req) => {
  const status = readGeneratedAuthStatus(req.headers.cookie);

  return {
    ok: true,
    configured: status.configured,
    user: status.user,
    subscription: status.user ? getSubscriptionForUser(status.user.email) : null,
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
    subscription: getSubscriptionForUser(user.email),
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

  const plan = getPlanForUser(authUser);

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
  const viewUrl = `${resolveAppBaseUrl()}/billing/receipt-preview`;
  const template = PaymentReceipt({
    invoiceNumber: 'DEMO-100',
    amount: 19,
    currency: 'USD',
    paidAt: '2026-05-15',
    viewUrl,
    companyName: 'PriorAuthPro',
    clientName: 'Demo customer',
  });

  return {
    ok: true,
    subject: 'Payment received for invoice DEMO-100',
    html: await renderToHtml(template),
    text: await renderToText(template),
  };
});

app.post('/api/pro/rewrite', async (req, reply) => {
  const authUser = requireGeneratedAuth(req.headers.cookie);
  if (!authUser) {
    return reply.code(401).send({
      error: 'Sign in to access pro rewrite guidance',
    });
  }

  const plan = getPlanForUser(authUser);
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
      recommendedCta: 'Open the paid PriorAuthPro workflow this week to unlock the premium action.',
    },
  };
});

app.post('/api/appeals/generate', async (req, reply) => {
  const authUser = requireGeneratedAuth(req.headers.cookie);
  if (!authUser) {
    return reply.code(401).send({
      error: 'Sign in to generate an appeal letter',
    });
  }

  const plan = getPlanForUser(authUser);
  if (!hasFeature(plan, GENERATED_FEATURES.appealGeneration)) {
    return reply.code(403).send({
      error: 'Upgrade required',
      plan,
      feature: GENERATED_FEATURES.appealGeneration,
    });
  }

  const appealInput = normalizeAppealInput(req.body);
  if (!appealInput) {
    return reply.code(400).send({
      error: 'Diagnosis, procedure, and denial reason are required',
    });
  }

  try {
    const result = await generateAppealLetter(appealInput, {
      user: authUser,
      plan,
    });
    const subscription = recordAppealGeneration(authUser.email, {
      aiTokens: result.aiUsage?.totalTokens,
    });

    return {
      ok: true,
      feature: GENERATED_FEATURES.appealGeneration,
      subscription,
      ...result,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    req.log.error({ err: error }, 'Appeal generation failed');
    return reply.code(503).send({
      error: 'Appeal generation failed',
      detail,
    });
  }
});

app.get('/api/billing/status', async (req, reply) => {
  const authUser = requireGeneratedAuth(req.headers.cookie);
  if (!authUser) {
    return reply.code(401).send({
      error: 'Sign in to view billing status',
    });
  }

  return {
    ok: true,
    subscription: getSubscriptionForUser(authUser.email),
  };
});

app.post('/api/billing/checkout', async (req, reply) => {
  const authUser = requireGeneratedAuth(req.headers.cookie);
  if (!authUser) {
    return reply.code(401).send({
      error: 'Sign in before subscribing',
    });
  }

  try {
    const session = await createPriorAuthCheckoutSession({
      user: authUser,
      baseUrl: resolveAppBaseUrl(req.headers.host),
    });
    const subscription = recordCheckoutStarted({
      email: authUser.email,
      checkoutSessionId: session.id,
    });

    return {
      ok: true,
      url: session.url,
      sessionId: session.id,
      plan: 'pro',
      monthlyPriceUsd: 29,
      subscription,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    req.log.error({ err: error }, 'Subscription checkout session failed');
    return reply.code(503).send({
      error: 'Stripe subscription checkout is not configured',
      detail,
    });
  }
});

app.get('/api/billing/demo-checkout', async (req, reply) => {
  const baseUrl = resolveAppBaseUrl(req.headers.host);

  try {
    const session = await buildCheckoutSession({
      currency: 'USD',
      successUrl: `${baseUrl}/billing/success`,
      cancelUrl: `${baseUrl}/billing/canceled`,
      metadata: {
        app: 'prior-auth-pro',
        plan: 'pro',
      },
      lineItems: [
        {
          name: 'PriorAuthPro Pro',
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

app.post('/api/billing/webhook', async (req, reply) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return reply.code(503).send({
      error: 'STRIPE_WEBHOOK_SECRET is not set',
    });
  }

  const signature = readHeader(req.headers['stripe-signature']);
  if (!signature) {
    return reply.code(400).send({
      error: 'Missing Stripe signature',
    });
  }

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});

  try {
    const event = verifyWebhookSignature(Buffer.from(rawBody), signature, secret);
    const result = processStripeWebhookEvent(event);
    return {
      ok: true,
      received: true,
      ...result,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    req.log.error({ err: error }, 'Stripe webhook verification failed');
    return reply.code(400).send({
      error: 'Stripe webhook verification failed',
      detail,
    });
  }
});

export async function startServer(): Promise<void> {
  await app.listen({
    port: Number(process.env.PORT ?? 5320),
    host: process.env.HOST ?? '127.0.0.1',
  });
}

function resolveAppBaseUrl(hostHeader?: string): string {
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  if (hostHeader) {
    const protocol =
      hostHeader.startsWith('127.0.0.1') || hostHeader.startsWith('localhost') ? 'http' : 'https';
    return `${protocol}://${hostHeader}`;
  }

  return `http://${process.env.HOST ?? '127.0.0.1'}:${process.env.PORT ?? '5320'}`;
}

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

function readHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
