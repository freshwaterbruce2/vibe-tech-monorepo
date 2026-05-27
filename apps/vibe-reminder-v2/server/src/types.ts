
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

export interface ReminderDelivery {
  appointmentId: string;
  channel: 'email' | 'sms';
  destination: string;
  status: 'sent' | 'mocked';
  providerId: string;
}
