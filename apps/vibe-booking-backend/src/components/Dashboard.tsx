import { useState } from 'react';

interface Appointment {
  id: string;
  name: string;
  email: string;
  service: string;
  date: string;
  time: string;
  price: string;
  status: 'confirmed' | 'pending';
}

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    name: 'Sarah Connor',
    email: 'sarah@resistance.net',
    service: 'AI Automation Audit',
    date: 'June 12, 2026',
    time: '10:30 AM',
    price: '$199',
    status: 'confirmed',
  },
  {
    id: '2',
    name: 'Miles Dyson',
    email: 'miles@cyberdyne.com',
    service: 'Enterprise Architecture Planning',
    date: 'June 15, 2026',
    time: '01:30 PM',
    price: '$499',
    status: 'pending',
  },
  {
    id: '3',
    name: 'John Connor',
    email: 'john@resistance.net',
    service: 'Tech Consultation',
    date: 'June 18, 2026',
    time: '09:00 AM',
    price: '$49',
    status: 'confirmed',
  },
];

interface DashboardProps {
  currentUser: { email: string; fullName?: string } | null;
  onSignIn: (email: string, pass: string) => Promise<void>;
  loading: boolean;
  authMessage: string | null;
  checkProRoute: () => Promise<void>;
  proMessage: string | null;
}

export function Dashboard({
  currentUser,
  onSignIn,
  loading,
  authMessage,
  checkProRoute,
  proMessage,
}: DashboardProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!currentUser) {
    return (
      <div style={{ maxWidth: '500px', margin: '40px auto' }} className="glass-card">
        <span className="eyebrow">Operator Portal</span>
        <h2 style={{ fontSize: '28px', margin: '8px 0' }}>Operator Sign In</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
          Authenticate using your operator credentials to manage client schedules, view billing records, and access entitlements.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSignIn(email, password);
          }}
          style={{ display: 'grid', gap: '16px' }}
        >
          <div className="form-group">
            <label>Operator Email</label>
            <input
              type="email"
              className="form-input"
              required
              placeholder="owner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Operator Password</label>
            <input
              type="password"
              className="form-input"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {authMessage && (
            <div style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 500 }}>
              ⚠️ {authMessage}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In as Operator'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header bar showing active entitlement */}
      <div className="operator-info-bar">
        <div>
          🔐 Signed in as <strong>{currentUser.fullName ?? currentUser.email}</strong> (Operator)
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => { void checkProRoute(); }}>
            Check Pro Entitlement
          </button>
        </div>
      </div>

      {proMessage && (
        <div className="glass-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--secondary)' }}>
          🚀 <strong>Entitlement Server Response:</strong> {proMessage}
        </div>
      )}

      {/* Metrics Row */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <span className="eyebrow">Gross Revenue</span>
          <div className="stat-value">$747</div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>From 3 active consultations</p>
        </div>
        <div className="stat-card">
          <span className="eyebrow">Active Slots</span>
          <div className="stat-value">6 / Day</div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Configured scheduling availability</p>
        </div>
        <div className="stat-card">
          <span className="eyebrow">Total Clients</span>
          <div className="stat-value">12</div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Unique client contact records</p>
        </div>
      </div>

      {/* Booking List Table */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '20px' }}>Client Appointments</h3>
          <span className="eyebrow">Live schedule</span>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Service</th>
                <th>Date & Time</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {INITIAL_APPOINTMENTS.map((app) => (
                <tr key={app.id}>
                  <td>
                    <strong>{app.name}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{app.email}</div>
                  </td>
                  <td>{app.service}</td>
                  <td>{app.date} at {app.time}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{app.price}</td>
                  <td>
                    <span className={`status-badge ${app.status}`}>
                      {app.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
