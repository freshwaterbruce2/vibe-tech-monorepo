import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { FastifyBaseLogger } from 'fastify';
import type { AuthUser } from '@vibetech/auth';
import {
  buildCheckoutSession,
  verifyWebhookSignature,
  type StripeWebhookEventLike,
} from '@vibetech/billing';
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
import { GENERATED_FEATURES, resolveFeatureAccess } from './entitlements.js';
import {
  buildProRewrite,
  reviewProposal,
  type ProposalReviewInput,
} from './reviewEngine.js';
import { loadLocalEnv } from './loadLocalEnv.js';
import {
  createResendAbandonedScorecardEmailSender,
  createScorecardLifecycleRepository,
  startAbandonedScorecardSweep,
  type AbandonedScorecardEmailSender,
  type ScorecardLifecycleRepository,
} from './scorecardLifecycle.js';
import { createRateLimitPreHandler } from './rateLimit.js';

loadLocalEnv();

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 5320);
const host = process.env.HOST ?? '127.0.0.1';
const demoCheckoutRateLimit = createRateLimitPreHandler({
  keyPrefix: 'demo-checkout',
  maxRequests: 10,
  windowMs: 60_000,
  message: 'Too many checkout requests. Please wait and try again.',
});
const stripeWebhookRateLimit = createRateLimitPreHandler({
  keyPrefix: 'stripe-webhook',
  maxRequests: 120,
  windowMs: 60_000,
  message: 'Too many webhook requests. Please wait and try again.',
});

registerJsonParserWithStripeRawBody();

const scorecardLifecycle = createScorecardLifecycle(app.log);
const stopAbandonedScorecardSweep = startScorecardLifecycleSweep(scorecardLifecycle, app.log);

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

  const review = reviewProposal(input);
  recordFreeScorecardEvent(
    req.body,
    input,
    review.score,
    req.headers.cookie,
    req.headers['x-plan'],
    scorecardLifecycle,
    app.log,
  );

  return {
    ok: true,
    review,
  };
});

app.get('/api/pro', async (req, reply) => {
  const authUser = requireGeneratedAuth(req.headers.cookie);
  if (!authUser) {
    return reply.code(401).send({
      error: 'Sign in to access the pro route',
    });
  }

  const access = resolveFeatureAccess(
    authUser,
    GENERATED_FEATURES.premiumRoute,
    req.headers['x-plan'],
  );

  if (!access.decision.allowed) {
    return reply.code(403).send({
      error: 'Upgrade required',
      plan: access.tier,
      reason: access.decision.reason,
    });
  }

  return {
    ok: true,
    user: authUser,
    plan: access.tier,
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

  const access = resolveFeatureAccess(
    authUser,
    GENERATED_FEATURES.premiumRoute,
    req.headers['x-plan'],
  );
  if (!access.decision.allowed) {
    return reply.code(403).send({
      error: 'Upgrade required',
      plan: access.tier,
      reason: access.decision.reason,
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

app.get(
  '/api/billing/demo-checkout',
  {
    preHandler: demoCheckoutRateLimit,
  },
  async (req, reply) => {
    const baseUrl = process.env.APP_BASE_URL ?? `http://${host}:${port}`;
    const authStatus = readGeneratedAuthStatus(req.headers.cookie);

    try {
      const session = await buildCheckoutSession({
        currency: 'USD',
        successUrl: `${baseUrl}/billing/success`,
        cancelUrl: `${baseUrl}/billing/canceled`,
        customerEmail: authStatus.user?.email,
        metadata: buildProRewriteCheckoutMetadata(authStatus.user),
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
  },
);

app.post(
  '/api/billing/stripe-webhook',
  {
    preHandler: stripeWebhookRateLimit,
  },
  async (req, reply) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      return reply.code(503).send({
        error: 'Stripe webhook is not configured',
      });
    }

    const signature = firstString(req.headers['stripe-signature']);
    if (!signature) {
      return reply.code(400).send({
        error: 'Missing Stripe signature',
      });
    }

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body ?? {}));
    let event: StripeWebhookEventLike;

    try {
      event = verifyWebhookSignature(rawBody, signature, webhookSecret);
    } catch {
      return reply.code(400).send({
        error: 'Invalid Stripe signature',
      });
    }

    const grant = grantProRewriteEntitlementFromStripeEvent(event, scorecardLifecycle, app.log);

    return reply.code(grant.ok ? 200 : 503).send({
      received: true,
      ...grant,
    });
  },
);

app.addHook('onClose', async () => {
  stopAbandonedScorecardSweep?.();
});

await app.listen({ port, host });

interface ScorecardLifecycleRuntime {
  repository: ScorecardLifecycleRepository;
  sender: AbandonedScorecardEmailSender;
}

interface ScorecardContact {
  email?: string;
  name?: string;
}

interface StripeCheckoutSessionLike {
  id?: string;
  customer_email?: string | null;
  customer_details?: {
    email?: string | null;
  } | null;
  metadata?: Record<string, string | null | undefined> | null;
  payment_status?: string | null;
}

interface StripeGrantResult {
  ok: boolean;
  status: string;
  eventType?: string;
  featureKey?: string;
  userEmail?: string | null;
}

function registerJsonParserWithStripeRawBody(): void {
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (request, body, done) => {
      if (request.url.startsWith('/api/billing/stripe-webhook')) {
        done(null, body);
        return;
      }

      if (body.length === 0) {
        done(null, {});
        return;
      }

      try {
        done(null, JSON.parse(body.toString('utf8')) as unknown);
      } catch (error) {
        done(error as Error, undefined);
      }
    },
  );
}

function createScorecardLifecycle(
  logger: FastifyBaseLogger,
): ScorecardLifecycleRuntime | null {
  try {
    return {
      repository: createScorecardLifecycleRepository(),
      sender: createResendAbandonedScorecardEmailSender(),
    };
  } catch (error) {
    logger.warn({ err: error }, 'Scorecard lifecycle persistence disabled');
    return null;
  }
}

function buildProRewriteCheckoutMetadata(user: AuthUser | null): Record<string, string> {
  return Object.fromEntries(
    Object.entries({
      app: 'proposal-review-saas',
      plan: 'pro',
      entitlement: 'pro-rewrite',
      featureKey: GENERATED_FEATURES.premiumRoute,
      userId: user?.id,
      userEmail: user?.email,
    }).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[1].length > 0,
    ),
  );
}

function grantProRewriteEntitlementFromStripeEvent(
  event: StripeWebhookEventLike,
  lifecycle: ScorecardLifecycleRuntime | null,
  logger: FastifyBaseLogger,
): StripeGrantResult {
  if (!isCheckoutPaidEvent(event.type)) {
    return {
      ok: true,
      status: 'ignored_event',
      eventType: event.type,
    };
  }

  const session = event.data.object as StripeCheckoutSessionLike;
  const metadata = session.metadata ?? {};
  const featureKey = metadata.featureKey ?? '';
  if (metadata.app !== 'proposal-review-saas' || featureKey !== GENERATED_FEATURES.premiumRoute) {
    return {
      ok: true,
      status: 'ignored_checkout',
      eventType: event.type,
    };
  }

  if (session.payment_status !== 'paid') {
    return {
      ok: true,
      status: 'payment_not_paid',
      eventType: event.type,
      featureKey,
    };
  }

  const userId = normalizeOptionalString(metadata.userId ?? undefined);
  const userEmail = normalizeEmail(
    metadata.userEmail ?? session.customer_email ?? session.customer_details?.email ?? undefined,
  );
  if (!userId && !userEmail) {
    logger.warn({ eventId: event.id }, 'Stripe checkout completed without entitlement identity');
    return {
      ok: true,
      status: 'missing_customer_identity',
      eventType: event.type,
      featureKey,
    };
  }

  if (!lifecycle) {
    logger.warn({ eventId: event.id }, 'Stripe entitlement grant skipped because lifecycle is disabled');
    return {
      ok: false,
      status: 'lifecycle_disabled',
      eventType: event.type,
      featureKey,
      userEmail,
    };
  }

  try {
    const entitlement = lifecycle.repository.grantUserEntitlement({
      userId,
      userEmail,
      featureKey,
      source: `stripe:${event.type}`,
    });

    return {
      ok: true,
      status: 'entitlement_granted',
      eventType: event.type,
      featureKey: entitlement.featureKey,
      userEmail: entitlement.userEmail,
    };
  } catch (error) {
    logger.error({ err: error, eventId: event.id }, 'Stripe entitlement grant failed');
    return {
      ok: false,
      status: 'entitlement_grant_failed',
      eventType: event.type,
      featureKey,
      userEmail,
    };
  }
}

function startScorecardLifecycleSweep(
  lifecycle: ScorecardLifecycleRuntime | null,
  logger: FastifyBaseLogger,
): (() => void) | null {
  if (!lifecycle || isScorecardLifecycleSweepDisabled()) {
    return null;
  }

  return startAbandonedScorecardSweep({
    repository: lifecycle.repository,
    sender: lifecycle.sender,
    intervalMs: readPositiveIntegerEnv(
      'ABANDONED_SCORECARD_SWEEP_INTERVAL_MS',
      60 * 60 * 1000,
    ),
    initialDelayMs: readPositiveIntegerEnv(
      'ABANDONED_SCORECARD_SWEEP_INITIAL_DELAY_MS',
      30 * 1000,
    ),
    onError(error) {
      logger.warn({ err: error }, 'Abandoned scorecard sweep failed');
    },
  });
}

function recordFreeScorecardEvent(
  body: unknown,
  input: ProposalReviewInput,
  reviewScore: number,
  cookieHeader: string | undefined,
  tierHeader: string | string[] | undefined,
  lifecycle: ScorecardLifecycleRuntime | null,
  logger: FastifyBaseLogger,
): void {
  if (!lifecycle) {
    return;
  }

  const authStatus = readGeneratedAuthStatus(cookieHeader);
  const contact = readScorecardContact(body);

  try {
    lifecycle.repository.recordFreeScorecard({
      user: authStatus.user,
      fallbackEmail: contact.email,
      fallbackName: contact.name,
      input,
      reviewScore,
      tierHeader,
    });
  } catch (error) {
    logger.warn({ err: error }, 'Failed to record free scorecard event');
  }
}

function readScorecardContact(body: unknown): ScorecardContact {
  if (!body || typeof body !== 'object') {
    return {};
  }

  const raw = body as Record<string, unknown>;
  return {
    email: firstString(raw.email, raw.userEmail, raw.contactEmail),
    name: firstString(raw.name, raw.userName, raw.fullName, raw.clientName),
  };
}

function isScorecardLifecycleSweepDisabled(): boolean {
  const value = process.env.ABANDONED_SCORECARD_SWEEP_DISABLED?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name];
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return undefined;
}

function normalizeEmail(value: string | undefined): string | null {
  const email = value?.trim().toLowerCase();
  return email?.includes('@') ? email : null;
}

function normalizeOptionalString(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function isCheckoutPaidEvent(eventType: string): boolean {
  return (
    eventType === 'checkout.session.completed' ||
    eventType === 'checkout.session.async_payment_succeeded'
  );
}

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
