import type { FastifyInstance } from 'fastify';
import { AppDatabase } from '@vibetech/db-app';

import { readGeneratedAuthStatus } from '../authSession.js';
import { resolveSchedulingAccess } from './access.js';
import {
  AppointmentRepository,
  normalizeAppointmentInput,
  normalizeFutureIso,
} from './appointments.js';
import { openDb } from './db.js';
import { ReminderService } from './reminders.js';

export function registerSchedulingRoutes(app: FastifyInstance): void {
  const appointments = new AppointmentRepository(openDb());
  const reminders = new ReminderService();

  app.get('/api/appointments', async (req, reply) => {
    const access = resolveRequestAccess(req.headers.cookie);
    if (!access.ok) {
      return reply.code(access.statusCode).send({
        error: access.error,
        plan: access.plan,
      });
    }

    return {
      ok: true,
      tenantId: access.tenantId,
      plan: access.plan,
      appointments: appointments.listUpcoming(access.tenantId),
      analytics: appointments.monthlyAnalytics(access.tenantId),
    };
  });

  app.post('/api/appointments', async (req, reply) => {
    const access = resolveRequestAccess(req.headers.cookie);
    if (!access.ok) {
      return reply.code(access.statusCode).send({
        error: access.error,
        plan: access.plan,
      });
    }

    const input = normalizeAppointmentInput(req.body, access.tenantId);

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
    const access = resolveRequestAccess(req.headers.cookie);
    if (!access.ok) {
      return reply.code(access.statusCode).send({
        error: access.error,
        plan: access.plan,
      });
    }

    const { id } = req.params as { id: string };
    const appointment = appointments.markNoShow(access.tenantId, id);

    if (!appointment) {
      return reply.code(404).send({
        error: 'Appointment not found',
      });
    }

    return {
      ok: true,
      appointment,
      analytics: appointments.monthlyAnalytics(access.tenantId),
    };
  });

  app.post('/api/reminders/run', async (req, reply) => {
    const access = resolveRequestAccess(req.headers.cookie);
    if (!access.ok) {
      return reply.code(access.statusCode).send({
        error: access.error,
        plan: access.plan,
      });
    }

    const candidates = appointments.listReminderCandidates(access.tenantId);
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
}

function resolveRequestAccess(cookieHeader: string | undefined) {
  const status = readGeneratedAuthStatus(cookieHeader);
  const authUser = status.configured ? status.user : null;
  const db = AppDatabase.getInstance().getDatabase();
  return resolveSchedulingAccess(authUser, db);
}

function normalizeRescheduleInput(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const raw = body as Record<string, unknown>;
  return typeof raw['appointmentTime'] === 'string' ? normalizeFutureIso(raw['appointmentTime']) : null;
}
