interface NavbarProps {
  currentView: 'booking' | 'dashboard';
  setCurrentView: (view: 'booking' | 'dashboard') => void;
  currentUser: { email: string; fullName?: string } | null;
  onSignOut: () => void;
}

export function Navbar({ currentView, setCurrentView, currentUser, onSignOut }: NavbarProps) {
  return (
    <header className="navbar">
      <div className="logo">
        <span style={{ fontSize: '24px' }}>⚡</span> VIBE BOOKING
      </div>
      <div className="nav-links">
        <button
          className={`nav-btn ${currentView === 'booking' ? 'active' : ''}`}
          onClick={() => setCurrentView('booking')}
        >
          Book Appointment
        </button>
        <button
          className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          {currentUser ? 'Merchant Dashboard' : 'Operator Portal'}
        </button>
        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {currentUser.fullName ?? currentUser.email}
            </span>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={onSignOut}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
