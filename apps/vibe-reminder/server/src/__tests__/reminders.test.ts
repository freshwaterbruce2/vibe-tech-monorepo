import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Appointment } from '../appointments.js';

const messagesCreate = vi.fn(async () => ({ sid: 'SM_test_123' }));
const emailsSend = vi.fn(async () => ({ data: { id: 'resend_test_id' }, error: null }));

vi.mock('twilio', () => ({
  default: vi.fn(() => ({
    messages: { create: messagesCreate },
  })),
}));

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { send: emailsSend },
  })),
}));

const buildAppointment = (overrides: Partial<Appointment> = {}): Appointment => {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    id: 'appt-1',
    tenantId: 'tenant-1',
    patientName: 'Jane Doe',
    patientContact: '+15551234567',
    appointmentTime: future,
    status: 'scheduled',
    rescheduleToken: 'token-1',
    lastReminderAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

const TWILIO_KEYS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM_NUMBER',
  'RESEND_API_KEY',
] as const;

describe('ReminderService.sendReminder', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = {};
    for (const key of TWILIO_KEYS) {
      originalEnv[key] = process.env[key];
      Reflect.deleteProperty(process.env, key);
    }
    messagesCreate.mockClear();
    emailsSend.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of TWILIO_KEYS) {
      if (originalEnv[key] === undefined) {
        Reflect.deleteProperty(process.env, key);
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it('mocks SMS delivery when Twilio is not configured', async () => {
    const { ReminderService } = await import('../reminders.js');
    const service = new ReminderService();

    const delivery = await service.sendReminder(buildAppointment());

    expect(delivery.channel).toBe('sms');
    expect(delivery.status).toBe('mocked');
    expect(delivery.providerId).toBe('mock-sms-appt-1');
    expect(delivery.destination).toBe('+15551234567');
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it('sends real SMS via Twilio when configured', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_AUTH_TOKEN = 'auth_test';
    process.env.TWILIO_FROM_NUMBER = '+15559999999';

    const { ReminderService } = await import('../reminders.js');
    const service = new ReminderService();

    const appointment = buildAppointment();
    const delivery = await service.sendReminder(appointment);

    expect(delivery.channel).toBe('sms');
    expect(delivery.status).toBe('sent');
    expect(delivery.providerId).toBe('SM_test_123');
    expect(messagesCreate).toHaveBeenCalledTimes(1);
    expect(messagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+15551234567',
        from: '+15559999999',
        body: expect.stringContaining('Jane Doe'),
      }),
    );
  });

  it('mocks email delivery when Resend is not configured', async () => {
    const { ReminderService } = await import('../reminders.js');
    const service = new ReminderService();

    const delivery = await service.sendReminder(
      buildAppointment({ patientContact: 'x@example.com' }),
    );

    expect(delivery.channel).toBe('email');
    expect(delivery.status).toBe('mocked');
    expect(delivery.destination).toBe('x@example.com');
    expect(emailsSend).not.toHaveBeenCalled();
  });
});
