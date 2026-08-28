import type Database from 'better-sqlite3';

export type AppointmentStatus = 'scheduled' | 'completed' | 'no-show' | 'rescheduled';

export interface Appointment {
  id: string;
  tenantId: string;
  patientName: string;
  patientContact: string;
  appointmentTime: string;
  status: AppointmentStatus;
  rescheduleToken: string;
  lastReminderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AppointmentRow {
  id: string;
  tenant_id: string;
  patient_name: string;
  patient_contact: string;
  appointment_time: string;
  status: AppointmentStatus;
  reschedule_token: string;
  last_reminder_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentInput {
  tenantId: string;
  patientName: string;
  patientContact: string;
  appointmentTime: string;
}

export interface AppointmentAnalytics {
  month: string;
  total: number;
  noShows: number;
  noShowRate: number;
}

const mapAppointment = (row: AppointmentRow): Appointment => ({
  id: row.id,
  tenantId: row.tenant_id,
  patientName: row.patient_name,
  patientContact: row.patient_contact,
  appointmentTime: row.appointment_time,
  status: row.status,
  rescheduleToken: row.reschedule_token,
  lastReminderAt: row.last_reminder_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class AppointmentRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: AppointmentInput): Appointment {
    const now = new Date().toISOString();
    const appointment: Appointment = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      patientName: input.patientName,
      patientContact: input.patientContact,
      appointmentTime: input.appointmentTime,
      status: 'scheduled',
      rescheduleToken: crypto.randomUUID(),
      lastReminderAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO appointments (
           id, tenant_id, patient_name, patient_contact, appointment_time, status,
           reschedule_token, last_reminder_at, created_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        appointment.id,
        appointment.tenantId,
        appointment.patientName,
        appointment.patientContact,
        appointment.appointmentTime,
        appointment.status,
        appointment.rescheduleToken,
        appointment.lastReminderAt,
        appointment.createdAt,
        appointment.updatedAt,
      );

    return appointment;
  }

  listUpcoming(tenantId: string, limit = 50): Appointment[] {
    const rows = this.db
      .prepare(
        `SELECT *
           FROM appointments
          WHERE tenant_id = ?
            AND appointment_time >= ?
          ORDER BY appointment_time ASC
          LIMIT ?`,
      )
      .all(tenantId, new Date().toISOString(), limit) as AppointmentRow[];

    return rows.map(mapAppointment);
  }

  listReminderCandidates(tenantId: string, horizonHours = 24): Appointment[] {
    const now = new Date();
    const horizon = new Date(now.getTime() + horizonHours * 60 * 60 * 1000);
    const rows = this.db
      .prepare(
        `SELECT *
           FROM appointments
          WHERE tenant_id = ?
            AND status IN ('scheduled', 'rescheduled')
            AND appointment_time BETWEEN ? AND ?
            AND last_reminder_at IS NULL
          ORDER BY appointment_time ASC`,
      )
      .all(tenantId, now.toISOString(), horizon.toISOString()) as AppointmentRow[];

    return rows.map(mapAppointment);
  }

  listTenantIdsWithPendingReminders(horizonHours = 24): string[] {
    const now = new Date();
    const horizon = new Date(now.getTime() + horizonHours * 60 * 60 * 1000);
    const rows = this.db
      .prepare(
        `SELECT DISTINCT tenant_id
           FROM appointments
          WHERE status IN ('scheduled', 'rescheduled')
            AND appointment_time BETWEEN ? AND ?
            AND last_reminder_at IS NULL`,
      )
      .all(now.toISOString(), horizon.toISOString()) as { tenant_id: string }[];

    return rows.map((row) => row.tenant_id);
  }

  findByToken(token: string): Appointment | null {
    const row = this.db
      .prepare('SELECT * FROM appointments WHERE reschedule_token = ?')
      .get(token) as AppointmentRow | undefined;

    return row ? mapAppointment(row) : null;
  }

  markNoShow(tenantId: string, id: string): Appointment | null {
    return this.updateStatus(tenantId, id, 'no-show');
  }

  markReminderSent(id: string): void {
    this.db
      .prepare('UPDATE appointments SET last_reminder_at = ?, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), new Date().toISOString(), id);
  }

  rescheduleByToken(token: string, appointmentTime: string): Appointment | null {
    const existing = this.findByToken(token);
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE appointments
            SET appointment_time = ?,
                status = 'rescheduled',
                reschedule_token = ?,
                last_reminder_at = NULL,
                updated_at = ?
          WHERE reschedule_token = ?`,
      )
      .run(appointmentTime, crypto.randomUUID(), now, token);

    const row = this.db
      .prepare('SELECT * FROM appointments WHERE id = ?')
      .get(existing.id) as AppointmentRow | undefined;

    return row ? mapAppointment(row) : null;
  }

  monthlyAnalytics(tenantId: string, now = new Date()): AppointmentAnalytics {
    const month = now.toISOString().slice(0, 7);
    const start = `${month}-01T00:00:00.000Z`;
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
    const row = this.db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) AS noShows
         FROM appointments
         WHERE tenant_id = ?
           AND appointment_time >= ?
           AND appointment_time < ?`,
      )
      .get(tenantId, start, end) as { total: number; noShows: number | null };

    const noShows = row.noShows ?? 0;
    return {
      month,
      total: row.total,
      noShows,
      noShowRate: row.total > 0 ? Math.round((noShows / row.total) * 1000) / 10 : 0,
    };
  }

  private updateStatus(
    tenantId: string,
    id: string,
    status: AppointmentStatus,
  ): Appointment | null {
    this.db
      .prepare(
        `UPDATE appointments
            SET status = ?,
                updated_at = ?
          WHERE tenant_id = ?
            AND id = ?`,
      )
      .run(status, new Date().toISOString(), tenantId, id);

    const row = this.db
      .prepare('SELECT * FROM appointments WHERE tenant_id = ? AND id = ?')
      .get(tenantId, id) as AppointmentRow | undefined;

    return row ? mapAppointment(row) : null;
  }

}

export const normalizeAppointmentInput = (
  body: unknown,
  tenantId: string,
): AppointmentInput | null => {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const raw = body as Record<string, unknown>;
  const patientName = typeof raw.patientName === 'string' ? raw.patientName.trim() : '';
  const patientContact = typeof raw.patientContact === 'string' ? raw.patientContact.trim() : '';
  const appointmentTime =
    typeof raw.appointmentTime === 'string' ? normalizeFutureIso(raw.appointmentTime) : null;

  if (!patientName || !patientContact || !appointmentTime) {
    return null;
  }

  return {
    tenantId,
    patientName,
    patientContact,
    appointmentTime,
  };
};

export const normalizeFutureIso = (value: string): string | null => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return date.toISOString();
};
