import { useState } from 'react';

interface Service {
  id: string;
  name: string;
  price: string;
  duration: string;
  description: string;
}

const SERVICES: Service[] = [
  {
    id: 'consult',
    name: 'Tech Consultation',
    price: '$49',
    duration: '30 mins',
    description: 'Advisory and roadmap alignment with top engineers.',
  },
  {
    id: 'audit',
    name: 'AI Automation Audit',
    price: '$199',
    duration: '1 hr',
    description: 'Deep dive into your current processes and AI integration plan.',
  },
  {
    id: 'architecture',
    name: 'Enterprise Architecture Planning',
    price: '$499',
    duration: '2 hrs',
    description: 'Custom codebase structure design, monorepo setup, and scaling roadmap.',
  },
];

interface BookingPortalProps {
  apiBase: string;
}

export function BookingPortal({ apiBase }: BookingPortalProps) {
  const [selectedService, setSelectedService] = useState<Service>(SERVICES[0] as Service);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate a mock list of days (28 days)
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const timeSlots = ['09:00 AM', '10:30 AM', '11:00 AM', '01:30 PM', '03:00 PM', '04:30 PM'];

  async function handleBookNow(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDay || !selectedSlot || !name || !email) {
      setErrorMsg('Please complete all steps to book your slot.');
      return;
    }

    setCheckoutLoading(true);
    setErrorMsg(null);

    try {
      // Call backend checkout session endpoint
      const response = await fetch(`${apiBase}/api/billing/demo-checkout`);
      const data = await response.json();
      
      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error((data as { error?: string }).error ?? 'Failed to create checkout session.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Stripe checkout could not be reached.');
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="booking-grid">
      {/* Sidebar: Selected Service Info */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <span className="eyebrow">Step 1</span>
          <h2 style={{ fontSize: '24px', margin: '8px 0' }}>Select Service</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Select the type of appointment you would like to book.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {SERVICES.map((s) => (
            <div
              key={s.id}
              className={`service-card ${selectedService.id === s.id ? 'selected' : ''}`}
              onClick={() => setSelectedService(s)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>{s.name}</span>
                <span style={{ color: 'var(--primary)' }}>{s.price}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                ⏱ {s.duration}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '4px' }}>
                {s.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Flow: Slot Selection & Customer Details */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Step 2: Calendar Slot */}
        <div>
          <span className="eyebrow">Step 2</span>
          <h2 style={{ fontSize: '24px', margin: '8px 0' }}>Select Date & Time</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Choose an available date this month followed by a convenient time slot.
          </p>
          
          <div className="calendar-container">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="calendar-day-header">{d}</div>
            ))}
            {/* Empty offset for layout alignment */}
            <div className="calendar-day empty"></div>
            <div className="calendar-day empty"></div>
            {days.map((day) => (
              <div
                key={day}
                className={`calendar-day clickable ${selectedDay === day ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedDay(day);
                  setSelectedSlot(null); // Reset slot when day changes
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {selectedDay && (
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '8px' }}>
                Available slots for June {selectedDay}:
              </h4>
              <div className="slots-container">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    className={`slot-btn ${selectedSlot === slot ? 'selected' : ''}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Details & Stripe Submit */}
        {selectedDay && selectedSlot && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
            <span className="eyebrow">Step 3</span>
            <h2 style={{ fontSize: '24px', margin: '8px 0' }}>Provide Details</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Enter your details below to finalize booking your
              {` ${selectedService.name} on June ${selectedDay} at ${selectedSlot}.`}
            </p>

            <form onSubmit={(e) => { void handleBookNow(e); }} style={{ display: 'grid', gap: '16px' }}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="jane.doe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Notes / Requirements (Optional)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Any special details for the meeting..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {errorMsg && (
                <div style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 500 }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', marginTop: '8px' }}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? 'Redirecting to secure Stripe Checkout...' : `Confirm & Pay ${selectedService.price}`}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
