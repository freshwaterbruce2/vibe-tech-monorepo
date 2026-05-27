import { renderToHtml, renderToText } from '@vibetech/email';
import { createElement, type ReactElement } from 'react';
import { Resend } from 'resend';
import type { Appointment } from './types.js';

export interface ReminderDelivery {
  appointmentId: string;
  channel: 'email' | 'sms';
  destination: string;
  status: 'sent' | 'mocked';
  providerId: string;
}

const getAppBaseUrl = (): string => process.env.APP_BASE_URL ?? 'http://127.0.0.1:5330';
const getEmailFrom = (): string => process.env.EMAIL_FROM ?? 'reminders@example.com';

const buildRescheduleUrl = (appointment: Appointment): string =>
  `${getAppBaseUrl()}/reschedule/${appointment.rescheduleToken}`;

const formatAppointmentTime = (iso: string): string =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));

const isEmailContact = (contact: string): boolean => contact.includes('@');

const buildReminderText = (appointment: Appointment): string => {
  return [
    `Reminder: ${appointment.patientName}, your appointment is ${formatAppointmentTime(
      appointment.appointmentTime,
    )}.`,
    `Reschedule here: ${buildRescheduleUrl(appointment)}`,
  ].join(' ');
};

const AppointmentReminderEmail = ({
  appointment,
}: {
  appointment: Appointment;
}): ReactElement => {
  const time = formatAppointmentTime(appointment.appointmentTime);
  const rescheduleUrl = buildRescheduleUrl(appointment);

  return createElement(
    'div',
    {
      style: {
        fontFamily: 'Arial, sans-serif',
        color: '#0f172a',
        lineHeight: '1.6',
      },
    },
    createElement('h1', null, 'Appointment reminder'),
    createElement(
      'p',
      null,
      `Hi ${appointment.patientName}, this is a reminder for your appointment on ${time}.`,
    ),
    createElement(
      'p',
      null,
      'Need a different time? Use your secure reschedule link below.',
    ),
    createElement('p', null, createElement('a', { href: rescheduleUrl }, rescheduleUrl)),
  );
};

export class ReminderService {
  private readonly resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  async sendReminder(appointment: Appointment): Promise<ReminderDelivery> {
    if (isEmailContact(appointment.patientContact)) {
      return this.sendEmailReminder(appointment);
    }

    return this.sendSmsReminder(appointment);
  }

  private async sendEmailReminder(appointment: Appointment): Promise<ReminderDelivery> {
    const template = createElement(AppointmentReminderEmail, { appointment });
    const html = await renderToHtml(template);
    const text = await renderToText(template);

    if (!this.resend) {
      return {
        appointmentId: appointment.id,
        channel: 'email',
        destination: appointment.patientContact,
        status: 'mocked',
        providerId: `mock-email-${appointment.id}`,
      };
    }

    const result = await this.resend.emails.send({
      from: getEmailFrom(),
      to: appointment.patientContact,
      subject: `Appointment reminder for ${formatAppointmentTime(appointment.appointmentTime)}`,
      html,
      text,
    });

    if (result.error) {
      throw new Error(`Resend reminder failed: ${result.error.message}`);
    }

    return {
      appointmentId: appointment.id,
      channel: 'email',
      destination: appointment.patientContact,
      status: 'sent',
      providerId: result.data?.id ?? `resend-${appointment.id}`,
    };
  }

  private async sendSmsReminder(appointment: Appointment): Promise<ReminderDelivery> {
    await Promise.resolve(buildReminderText(appointment));

    return {
      appointmentId: appointment.id,
      channel: 'sms',
      destination: appointment.patientContact,
      status: 'mocked',
      providerId: `mock-sms-${appointment.id}`,
    };
  }
}
