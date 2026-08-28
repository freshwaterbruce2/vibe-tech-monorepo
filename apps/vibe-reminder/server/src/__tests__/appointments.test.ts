import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import {
  AppointmentRepository,
  normalizeAppointmentInput,
  normalizeFutureIso,
} from '../appointments';
import type { AppointmentInput, AppointmentStatus } from '../appointments';

const SCHEMA = `
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  patient_contact TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled','completed','no-show','rescheduled')),
  reschedule_token TEXT NOT NULL UNIQUE,
  last_reminder_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const hoursFromNow = (hours: number): string =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

interface SeedOverrides {
  tenantId?: string;
  patientName?: string;
  patientContact?: string;
  appointmentTime?: string;
  status?: AppointmentStatus;
  rescheduleToken?: string;
  lastReminderAt?: string | null;
}

let db: Database.Database;
let repo: AppointmentRepository;

const baseInput = (overrides: Partial<AppointmentInput> = {}): AppointmentInput => ({
  tenantId: 'tenant-a',
  patientName: 'Jane Doe',
  patientContact: 'jane@example.com',
  appointmentTime: hoursFromNow(3),
  ...overrides,
});

const seedRow = (overrides: SeedOverrides = {}): string => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO appointments (
       id, tenant_id, patient_name, patient_contact, appointment_time, status,
       reschedule_token, last_reminder_at, created_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    overrides.tenantId ?? 'tenant-a',
    overrides.patientName ?? 'Seed Patient',
    overrides.patientContact ?? 'seed@example.com',
    overrides.appointmentTime ?? hoursFromNow(3),
    overrides.status ?? 'scheduled',
    overrides.rescheduleToken ?? crypto.randomUUID(),
    overrides.lastReminderAt === undefined ? null : overrides.lastReminderAt,
    now,
    now,
  );
  return id;
};

beforeEach(() => {
  db = new Database(':memory:');
  db.exec(SCHEMA);
  repo = new AppointmentRepository(db);
});

afterEach(() => {
  db.close();
});

describe('AppointmentRepository.create', () => {
  it('returns a scheduled appointment with generated id and token', () => {
    const created = repo.create(baseInput());

    expect(created.status).toBe('scheduled');
    expect(created.id).toMatch(/[0-9a-f-]{36}/i);
    expect(created.rescheduleToken).toMatch(/[0-9a-f-]{36}/i);
    expect(created.rescheduleToken).not.toBe(created.id);
    expect(created.lastReminderAt).toBeNull();
    expect(created.patientName).toBe('Jane Doe');
  });

  it('persists the row in the database', () => {
    const created = repo.create(baseInput());

    const row = db
      .prepare('SELECT * FROM appointments WHERE id = ?')
      .get(created.id) as { id: string; status: string; tenant_id: string } | undefined;

    expect(row).toBeDefined();
    expect(row?.id).toBe(created.id);
    expect(row?.status).toBe('scheduled');
    expect(row?.tenant_id).toBe('tenant-a');
  });
});

describe('AppointmentRepository.listUpcoming', () => {
  it('returns only future appointments for the tenant, sorted ascending', () => {
    seedRow({ appointmentTime: hoursFromNow(5) });
    seedRow({ appointmentTime: hoursFromNow(2) });
    seedRow({ appointmentTime: hoursFromNow(-72) });

    const upcoming = repo.listUpcoming('tenant-a');

    expect(upcoming).toHaveLength(2);
    expect(new Date(upcoming[0].appointmentTime).getTime()).toBeLessThan(
      new Date(upcoming[1].appointmentTime).getTime(),
    );
    for (const appointment of upcoming) {
      expect(new Date(appointment.appointmentTime).getTime()).toBeGreaterThan(Date.now() - 1000);
    }
  });

  it('excludes appointments from other tenants', () => {
    seedRow({ tenantId: 'tenant-a', appointmentTime: hoursFromNow(4) });
    seedRow({ tenantId: 'tenant-b', appointmentTime: hoursFromNow(4) });

    const upcoming = repo.listUpcoming('tenant-a');

    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].tenantId).toBe('tenant-a');
  });

  it('honors the limit argument', () => {
    seedRow({ appointmentTime: hoursFromNow(2) });
    seedRow({ appointmentTime: hoursFromNow(3) });
    seedRow({ appointmentTime: hoursFromNow(4) });

    const upcoming = repo.listUpcoming('tenant-a', 2);

    expect(upcoming).toHaveLength(2);
  });
});

describe('AppointmentRepository.listReminderCandidates', () => {
  it('returns scheduled/rescheduled appointments within 24h with no reminder sent', () => {
    seedRow({ appointmentTime: hoursFromNow(3), status: 'scheduled' });
    seedRow({ appointmentTime: hoursFromNow(10), status: 'rescheduled' });

    const candidates = repo.listReminderCandidates('tenant-a');

    expect(candidates).toHaveLength(2);
    expect(candidates.map((c) => c.status)).toEqual(
      expect.arrayContaining(['scheduled', 'rescheduled']),
    );
  });

  it('excludes appointments that already had a reminder sent', () => {
    const id = seedRow({ appointmentTime: hoursFromNow(3) });

    expect(repo.listReminderCandidates('tenant-a')).toHaveLength(1);

    repo.markReminderSent(id);

    expect(repo.listReminderCandidates('tenant-a')).toHaveLength(0);
  });

  it('excludes past and far-future appointments', () => {
    seedRow({ appointmentTime: hoursFromNow(-72) });
    seedRow({ appointmentTime: hoursFromNow(48) });
    seedRow({ appointmentTime: hoursFromNow(3) });

    const candidates = repo.listReminderCandidates('tenant-a');

    expect(candidates).toHaveLength(1);
  });

  it('excludes completed and no-show appointments', () => {
    seedRow({ appointmentTime: hoursFromNow(3), status: 'completed' });
    seedRow({ appointmentTime: hoursFromNow(3), status: 'no-show' });

    expect(repo.listReminderCandidates('tenant-a')).toHaveLength(0);
  });
});

describe('AppointmentRepository.markNoShow', () => {
  it('sets the status to no-show for the matching tenant', () => {
    const id = seedRow({ tenantId: 'tenant-a' });

    const updated = repo.markNoShow('tenant-a', id);

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe('no-show');
  });

  it('does not change appointments for a different tenant', () => {
    const id = seedRow({ tenantId: 'tenant-a' });

    const result = repo.markNoShow('tenant-b', id);

    expect(result).toBeNull();

    const row = db
      .prepare('SELECT status FROM appointments WHERE id = ?')
      .get(id) as { status: string };
    expect(row.status).toBe('scheduled');
  });
});

describe('AppointmentRepository.findByToken', () => {
  it('returns the appointment for a known token', () => {
    const token = crypto.randomUUID();
    const id = seedRow({ rescheduleToken: token });

    const found = repo.findByToken(token);

    expect(found?.id).toBe(id);
  });

  it('returns null for an unknown token', () => {
    expect(repo.findByToken('does-not-exist')).toBeNull();
  });
});

describe('AppointmentRepository.rescheduleByToken', () => {
  it('updates time, sets rescheduled status, rotates token and clears reminder', () => {
    const token = crypto.randomUUID();
    const id = seedRow({
      rescheduleToken: token,
      appointmentTime: hoursFromNow(3),
      lastReminderAt: new Date().toISOString(),
    });

    const newTime = hoursFromNow(25);
    const updated = repo.rescheduleByToken(token, newTime);

    expect(updated).not.toBeNull();
    expect(updated?.id).toBe(id);
    expect(updated?.appointmentTime).toBe(newTime);
    expect(updated?.status).toBe('rescheduled');
    expect(updated?.lastReminderAt).toBeNull();
    expect(updated?.rescheduleToken).not.toBe(token);
  });

  it('returns null for an invalid token', () => {
    expect(repo.rescheduleByToken('not-a-real-token', hoursFromNow(25))).toBeNull();
  });
});

describe('AppointmentRepository.monthlyAnalytics', () => {
  it('computes total, noShows and noShowRate for the current month', () => {
    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    const inMonth = (day: number): string => `${month}-${String(day).padStart(2, '0')}T10:00:00.000Z`;

    seedRow({ appointmentTime: inMonth(5), status: 'no-show' });
    seedRow({ appointmentTime: inMonth(6), status: 'completed' });
    seedRow({ appointmentTime: inMonth(7), status: 'scheduled' });
    seedRow({ appointmentTime: inMonth(8), status: 'completed' });

    const analytics = repo.monthlyAnalytics('tenant-a', now);

    expect(analytics.month).toBe(month);
    expect(analytics.total).toBe(4);
    expect(analytics.noShows).toBe(1);
    expect(analytics.noShowRate).toBe(25);
  });

  it('returns a zero rate when there are no appointments', () => {
    const analytics = repo.monthlyAnalytics('tenant-a');

    expect(analytics.total).toBe(0);
    expect(analytics.noShows).toBe(0);
    expect(analytics.noShowRate).toBe(0);
  });
});

describe('normalizeAppointmentInput', () => {
  it('returns trimmed fields for a valid payload', () => {
    const result = normalizeAppointmentInput(
      {
        patientName: '  Jane Doe  ',
        patientContact: '  jane@example.com  ',
        appointmentTime: hoursFromNow(5),
      },
      'tenant-a',
    );

    expect(result).not.toBeNull();
    expect(result?.tenantId).toBe('tenant-a');
    expect(result?.patientName).toBe('Jane Doe');
    expect(result?.patientContact).toBe('jane@example.com');
  });

  it('returns null when the name is blank', () => {
    const result = normalizeAppointmentInput(
      { patientName: '   ', patientContact: 'x@example.com', appointmentTime: hoursFromNow(5) },
      'tenant-a',
    );
    expect(result).toBeNull();
  });

  it('returns null when the contact is missing', () => {
    const result = normalizeAppointmentInput(
      { patientName: 'Jane', appointmentTime: hoursFromNow(5) },
      'tenant-a',
    );
    expect(result).toBeNull();
  });

  it('returns null when the appointment time is garbage', () => {
    const result = normalizeAppointmentInput(
      { patientName: 'Jane', patientContact: 'x@example.com', appointmentTime: 'not-a-date' },
      'tenant-a',
    );
    expect(result).toBeNull();
  });

  it('returns null for a non-object body', () => {
    expect(normalizeAppointmentInput(null, 'tenant-a')).toBeNull();
    expect(normalizeAppointmentInput('string', 'tenant-a')).toBeNull();
  });
});

describe('normalizeFutureIso', () => {
  it('returns an ISO string for a valid date', () => {
    const result = normalizeFutureIso('2030-01-15T09:30:00Z');
    expect(result).toBe('2030-01-15T09:30:00.000Z');
  });

  it('returns null for a garbage value', () => {
    expect(normalizeFutureIso('definitely-not-a-date')).toBeNull();
  });
});
