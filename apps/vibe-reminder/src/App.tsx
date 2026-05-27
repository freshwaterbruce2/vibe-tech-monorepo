import { useCallback, useEffect, useMemo, useState } from 'react';

type AppointmentStatus = 'scheduled' | 'completed' | 'no-show' | 'rescheduled';

interface Appointment {
  id: string;
  tenantId: string;
  patientName: string;
  patientContact: string;
  appointmentTime: string;
  status: AppointmentStatus;
  rescheduleToken: string;
  lastReminderAt: string | null;
}

interface AppointmentAnalytics {
  month: string;
  total: number;
  noShows: number;
  noShowRate: number;
}

interface RescheduleAppointment {
  id: string;
  patientName: string;
  appointmentTime: string;
  status: AppointmentStatus;
}

const tenantId = 'demo-clinic';

const toLocalInputValue = (iso: string): string => {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const fromLocalInputValue = (value: string): string => new Date(value).toISOString();

const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));

export function App() {
  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:5320', []);
  const pathname = window.location.pathname;
  const rescheduleToken = pathname.startsWith('/reschedule/') ? pathname.split('/').at(-1) : null;

  if (rescheduleToken) {
    return <ReschedulePage apiBase={apiBase} token={rescheduleToken} />;
  }

  return <ClinicDashboard apiBase={apiBase} />;
}

function ClinicDashboard({ apiBase }: { apiBase: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [analytics, setAnalytics] = useState<AppointmentAnalytics | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<'load' | 'no-show' | 'reminders' | 'create' | null>('load');
  const [patientName, setPatientName] = useState('');
  const [patientContact, setPatientContact] = useState('');
  const [appointmentTime, setAppointmentTime] = useState(toLocalInputValue(new Date().toISOString()));

  const loadAppointments = useCallback(async () => {
    const response = await fetch(`${apiBase}/api/appointments`, {
      headers: {
        'x-tenant-id': tenantId,
      },
    });
    const body = (await response.json()) as {
      appointments?: Appointment[];
      analytics?: AppointmentAnalytics;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(body.error ?? 'Unable to load appointments');
    }

    setAppointments(body.appointments ?? []);
    setAnalytics(body.analytics ?? null);
  }, [apiBase]);

  useEffect(() => {
    loadAppointments()
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : String(error));
      })
      .finally(() => setLoading(null));
  }, [loadAppointments]);

  async function createAppointment() {
    setLoading('create');
    setMessage(null);

    try {
      const response = await fetch(`${apiBase}/api/appointments`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          patientName,
          patientContact,
          appointmentTime: fromLocalInputValue(appointmentTime),
        }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to create appointment');
      }

      setPatientName('');
      setPatientContact('');
      await loadAppointments();
      setMessage('Appointment scheduled.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(null);
    }
  }

  async function markNoShow(id: string) {
    setLoading('no-show');
    setMessage(null);

    try {
      const response = await fetch(`${apiBase}/api/appointments/${id}/no-show`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({}),
      });
      const body = (await response.json()) as {
        analytics?: AppointmentAnalytics;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to mark no-show');
      }

      await loadAppointments();
      if (body.analytics) {
        setAnalytics(body.analytics);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(null);
    }
  }

  async function runReminders() {
    setLoading('reminders');
    setMessage(null);

    try {
      const response = await fetch(`${apiBase}/api/reminders/run`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({}),
      });
      const body = (await response.json()) as {
        scanned?: number;
        deliveries?: Array<{ channel: string; status: string }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to run reminders');
      }

      await loadAppointments();
      setMessage(
        `Reminder sweep scanned ${body.scanned ?? 0} appointments and sent ${
          body.deliveries?.length ?? 0
        } messages.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Clinic Autopilot</p>
          <h1>Today&apos;s appointment flow</h1>
          <p className="topbar-copy">
            Keep reminders moving, spot no-show risk, and help patients reschedule without a phone
            call.
          </p>
        </div>
        <button onClick={() => void runReminders()} disabled={loading !== null}>
          {loading === 'reminders' ? 'Sending...' : 'Run reminder sweep'}
        </button>
      </header>

      <section className="analytics-grid">
        <Metric label="Appointments this month" value={analytics?.total ?? 0} />
        <Metric label="No-shows this month" value={analytics?.noShows ?? 0} />
        <Metric label="No-show rate" value={`${analytics?.noShowRate ?? 0}%`} />
      </section>

      <section className="workspace-grid">
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            void createAppointment();
          }}
        >
          <p className="section-kicker">Quick add</p>
          <h2>Schedule appointment</h2>
          <label className="field">
            Patient
            <input
              id="patient-name"
              name="patientName"
              value={patientName}
              onChange={(event) => setPatientName(event.target.value)}
              placeholder="Patient name"
              autoComplete="name"
            />
          </label>
          <label className="field">
            Email or phone
            <input
              id="patient-contact"
              name="patientContact"
              value={patientContact}
              onChange={(event) => setPatientContact(event.target.value)}
              placeholder="patient@example.com or +15551234567"
              autoComplete="email tel"
            />
          </label>
          <label className="field">
            Time
            <input
              id="appointment-time"
              name="appointmentTime"
              type="datetime-local"
              value={appointmentTime}
              onChange={(event) => setAppointmentTime(event.target.value)}
              autoComplete="off"
            />
          </label>
          <button disabled={loading !== null}>
            {loading === 'create' ? 'Scheduling...' : 'Schedule'}
          </button>
          {message ? <p className="message">{message}</p> : null}
        </form>

        <section className="panel appointment-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Reminder queue</p>
              <h2>Upcoming appointments</h2>
            </div>
            <span>{appointments.length} scheduled</span>
          </div>
          <div className="appointment-list">
            {appointments.map((appointment) => (
              <article className="appointment-row" key={appointment.id}>
                <div>
                  <strong>{appointment.patientName}</strong>
                  <span>{appointment.patientContact}</span>
                </div>
                <div>
                  <time>{formatDateTime(appointment.appointmentTime)}</time>
                  <span className={`status status-${appointment.status.replace('-', '')}`}>
                    {appointment.status}
                  </span>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => void markNoShow(appointment.id)}
                  disabled={loading !== null || appointment.status === 'no-show'}
                >
                  Mark no-show
                </button>
              </article>
            ))}
            {!appointments.length && loading !== 'load' ? (
              <p className="empty">No upcoming appointments yet.</p>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ReschedulePage({ apiBase, token }: { apiBase: string; token: string }) {
  const [appointment, setAppointment] = useState<RescheduleAppointment | null>(null);
  const [newTime, setNewTime] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiBase}/api/appointments/reschedule/${token}`)
      .then(async (response) => {
        const body = (await response.json()) as {
          appointment?: RescheduleAppointment;
          error?: string;
        };
        if (!response.ok || !body.appointment) {
          throw new Error(body.error ?? 'Unable to open reschedule link');
        }

        setAppointment(body.appointment);
        setNewTime(toLocalInputValue(body.appointment.appointmentTime));
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : String(error)))
      .finally(() => setLoading(false));
  }, [apiBase, token]);

  async function reschedule() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${apiBase}/api/appointments/reschedule/${token}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          appointmentTime: fromLocalInputValue(newTime),
        }),
      });
      const body = (await response.json()) as {
        appointment?: RescheduleAppointment;
        error?: string;
      };

      if (!response.ok || !body.appointment) {
        throw new Error(body.error ?? 'Unable to reschedule appointment');
      }

      setAppointment(body.appointment);
      setNewTime(toLocalInputValue(body.appointment.appointmentTime));
      setMessage('Your appointment was rescheduled.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="reschedule-shell">
      <section className="reschedule-panel">
        <p className="eyebrow">Secure reschedule link</p>
        <h1>Pick a new appointment time</h1>
        {appointment ? (
          <>
            <p>
              {appointment.patientName}, your current appointment is{' '}
              {formatDateTime(appointment.appointmentTime)}.
            </p>
            <label className="field">
              New time
              <input
                id="reschedule-time"
                name="appointmentTime"
                type="datetime-local"
                value={newTime}
                onChange={(event) => setNewTime(event.target.value)}
                autoComplete="off"
              />
            </label>
            <button onClick={() => void reschedule()} disabled={loading}>
              {loading ? 'Updating...' : 'Confirm new time'}
            </button>
          </>
        ) : null}
        {message ? <p className="message">{message}</p> : null}
      </section>
    </main>
  );
}
