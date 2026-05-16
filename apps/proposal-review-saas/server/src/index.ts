import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { AuthUser } from '@vibetech/auth';
import { buildCheckoutSession } from '@vibetech/billing';
import {
  PaymentReceipt,
  renderToHtml,
  renderToText,
} from '@vibetech/emails';

import {
  buildGeneratedLogoutCookie,
  buildGeneratedSessionCookie,
  getGeneratedAuthConfigError,
  readGeneratedAuthStatus,
  verifyGeneratedLogin,
} from './authSession.js';
import { GENERATED_FEATURES, hasFeature } from './entitlements.js';
import {
  buildProRewrite,
  reviewProposal,
  type ProposalReviewInput,
} from './reviewEngine.js';
import { loadLocalEnv } from './loadLocalEnv.js';

loadLocalEnv();

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 5320);
const host = process.env.HOST ?? '127.0.0.1';

await app.register(cors, {
  origin: true,
  credentials: true,
});

app.get('/api/health', async () => ({
  ok: true,
  app: 'proposal-review-saas',
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

app.post('/api/review', async (req, reply) => {
  const input = normalizeReviewInput(req.body);

  if (!input) {
    return reply.code(400).send({
      error: 'Invalid proposal review payload',
    });
  }

  return {
    ok: true,
    review: reviewProposal(input),
  };
});

app.get('/api/pro', async (req, reply) => {
  const authUser = requireGeneratedAuth(req.headers.cookie);
  if (!authUser) {
    return reply.code(401).send({
      error: 'Sign in to access the pro route',
    });
  }

  const plan = req.headers['x-plan'] === 'pro' ? 'pro' : 'free';

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
  const template = PaymentReceipt({
    invoiceNumber: 'PR-100',
    amount: 19,
    currency: 'USD',
    paidAt: '2026-05-15',
    viewUrl,
    companyName: 'Proposal Review',
    clientName: 'Northwind Studio',
  });

  return {
    ok: true,
    subject: 'Payment received for invoice PR-100',
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

  const plan = req.headers['x-plan'] === 'pro' ? 'pro' : 'free';
  if (!hasFeature(plan, GENERATED_FEATURES.premiumRoute)) {
    return reply.code(403).send({
      error: 'Upgrade required',
      plan,
    });
  }

  const input = normalizeReviewInput(req.body);
  if (!input) {
    return reply.code(400).send({
      error: 'Invalid proposal review payload',
    });
  }

  const review = reviewProposal(input);
  return {
    ok: true,
    user: authUser,
    review,
    rewrite: buildProRewrite(input, review),
  };
});

app.get('/api/billing/demo-checkout', async (req, reply) => {
  const baseUrl = process.env.APP_BASE_URL ?? `http://${host}:${port}`;

  try {
    const session = await buildCheckoutSession({
      currency: 'USD',
      successUrl: `${baseUrl}/billing/success`,
      cancelUrl: `${baseUrl}/billing/canceled`,
      metadata: {
        app: 'proposal-review-saas',
        plan: 'pro',
      },
      lineItems: [
        {
          name: 'ProposalReviewSaas Pro',
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

await app.listen({ port, host });

function normalizeReviewInput(body: unknown): ProposalReviewInput | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const raw = body as Record<string, unknown>;
  const proposalText =
    typeof raw.proposalText === 'string' ? raw.proposalText.trim() : '';
  const projectType =
    typeof raw.projectType === 'string' ? raw.projectType.trim() : '';

  if (!proposalText || !projectType) {
    return null;
  }

  return {
    clientName: typeof raw.clientName === 'string' ? raw.clientName.trim() : '',
    projectType,
    proposalText,
    priceUsd: normalizePositiveNumber(raw.priceUsd, 0),
    turnaroundDays: normalizePositiveNumber(raw.turnaroundDays, 7),
    revisionRounds: normalizePositiveNumber(raw.revisionRounds, 2),
  };
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeLoginInput(
  body: unknown,
): {
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
