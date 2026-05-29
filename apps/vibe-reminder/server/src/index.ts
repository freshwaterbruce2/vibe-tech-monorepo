import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { AuthUser } from '@vibetech/auth';
import { buildCheckoutSession } from '@vibetech/billing';
import { PaymentReceipt, renderToHtml, renderToText } from '@vibetech/emails';

import {
  buildGeneratedLogoutCookie,
  buildGeneratedSessionCookie,
  getGeneratedAuthConfigError,
  readGeneratedAuthStatus,
  verifyGeneratedLogin,
} from './authSession.js';
import {
  AppointmentRepository,
  normalizeAppointmentInput,
  normalizeFutureIso,
} from './appointments.js';
import { openDb } from './db.js';
import { GENERATED_FEATURES, hasFeature } from './entitlements.js';
import { loadLocalEnv } from './loadLocalEnv.js';
import { ReminderService } from './reminders.js';

loadLocalEnv();

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 5320);
const host = process.env.HOST ?? '127.0.0.1';
const appointments = new AppointmentRepository(openDb());
const reminders = new ReminderService();

await app.register(cors, {
  origin: true,
  credentials: true,
});

app.get('/api/health', async () => ({
  ok: true,
  app: 'appointment-reminder-saas',
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
    invoiceNumber: 'DEMO-100',
    amount: 19,
    currency: 'USD',
    paidAt: '2026-05-15',
    viewUrl,
    companyName: 'AppointmentReminderSaas',
    clientName: 'Demo customer',
  });

  return {
    ok: true,
    subject: 'Payment received for invoice DEMO-100',
    html: await renderToHtml(template),
    text: await renderToText(template),
  };
});

app.get('/api/appointments', async (req) => {
  const tenantId = readTenantId(req.headers['x-tenant-id']);

  return {
    ok: true,
    appointments: appointments.listUpcoming(tenantId),
    analytics: appointments.monthlyAnalytics(tenantId),
  };
});

app.post('/api/appointments', async (req, reply) => {
  const tenantId = readTenantId(req.headers['x-tenant-id']);
  const input = normalizeAppointmentInput(req.body, tenantId);

  if (!input) {
    return reply.code(400).send({
      error: 'Invalid appointment payload',
    });
  }

  return {
    ok: true,
    appointment: appointments.create(input),
  };
});

app.post('/api/appointments/:id/no-show', async (req, reply) => {
  const tenantId = readTenantId(req.headers['x-tenant-id']);
  const { id } = req.params as { id: string };
  const appointment = appointments.markNoShow(tenantId, id);

  if (!appointment) {
    return reply.code(404).send({
      error: 'Appointment not found',
    });
  }

  return {
    ok: true,
    appointment,
    analytics: appointments.monthlyAnalytics(tenantId),
  };
});

app.post('/api/reminders/run', async (req) => {
  const tenantId = readTenantId(req.headers['x-tenant-id']);
  const candidates = appointments.listReminderCandidates(tenantId);
  const deliveries = [];

  for (const appointment of candidates) {
    const delivery = await reminders.sendReminder(appointment);
    appointments.markReminderSent(appointment.id);
    deliveries.push(delivery);
  }

  return {
    ok: true,
    scanned: candidates.length,
    deliveries,
  };
});

app.get('/api/appointments/reschedule/:token', async (req, reply) => {
  const { token } = req.params as { token: string };
  const appointment = appointments.findByToken(token);

  if (!appointment) {
    return reply.code(404).send({
      error: 'Reschedule link is invalid or expired',
    });
  }

  return {
    ok: true,
    appointment: {
      id: appointment.id,
      patientName: appointment.patientName,
      appointmentTime: appointment.appointmentTime,
      status: appointment.status,
    },
  };
});

app.post('/api/appointments/reschedule/:token', async (req, reply) => {
  const { token } = req.params as { token: string };
  const appointmentTime = normalizeRescheduleInput(req.body);

  if (!appointmentTime) {
    return reply.code(400).send({
      error: 'Invalid reschedule payload',
    });
  }

  const appointment = appointments.rescheduleByToken(token, appointmentTime);
  if (!appointment) {
    return reply.code(404).send({
      error: 'Reschedule link is invalid or expired',
    });
  }

  return {
    ok: true,
    appointment: {
      id: appointment.id,
      patientName: appointment.patientName,
      appointmentTime: appointment.appointmentTime,
      status: appointment.status,
    },
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

  return {
    ok: true,
    user: authUser,
    plan,
    rewrite: {
      recommendedCta:
        'Open the paid AppointmentReminderSaas workflow this week to unlock the premium action.',
    },
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
        app: 'appointment-reminder-saas',
        plan: 'pro',
      },
      lineItems: [
        {
          name: 'AppointmentReminderSaas Pro',
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

function normalizeRescheduleInput(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const raw = body as Record<string, unknown>;
  return typeof raw.appointmentTime === 'string' ? normalizeFutureIso(raw.appointmentTime) : null;
}

function readTenantId(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  return value?.trim() ? value.trim() : 'demo-clinic';
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
