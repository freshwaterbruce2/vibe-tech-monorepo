import type { FastifyInstance } from 'fastify';
import { AppointmentRepository, normalizeAppointmentInput, normalizeFutureIso } from './appointments.js';
import { ReminderService } from './reminders.js';
import { openDb } from './db.js';
import { resolveGeneratedPlan, hasFeature, GENERATED_FEATURES } from './entitlements.js';

function readTenantId(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  return value?.trim() ? value.trim() : 'demo-clinic';
}

function normalizeRescheduleInput(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const raw = body as Record<string, unknown>;
  return typeof raw.appointmentTime === 'string' ? normalizeFutureIso(raw.appointmentTime) : null;
}

export const registerRoutes = async (app: FastifyInstance): Promise<void> => {
  const db = openDb();
  const appointments = new AppointmentRepository(db);
  const reminders = new ReminderService();

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

  app.post('/api/reminders/run', async (req, reply) => {
    const plan = resolveGeneratedPlan(req.headers['x-plan']);
    if (!hasFeature(plan, GENERATED_FEATURES.premiumRoute)) {
      return reply.code(403).send({
        error: 'Upgrade required',
        plan,
      });
    }

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
};
