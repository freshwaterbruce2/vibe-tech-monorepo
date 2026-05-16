import { BriefcaseBusiness, Headphones, Plane, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clearToken, getToken } from './api';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="appShell">
      <header className="siteHeader">
        <Link to="/" className="brand">
          <span className="brandMark">
            <BriefcaseBusiness size={19} aria-hidden="true" />
          </span>
          <span>Business Booking Next</span>
        </Link>
        <nav className="siteNav" aria-label="Primary">
          <Link to="/">Stays</Link>
          <Link to="/search?destination=Miami&checkIn=2026-05-04&checkOut=2026-05-06&guests=2">
            Deals
          </Link>
          <a href="#support">Support</a>
        </nav>
        <HeaderAction />
      </header>
      {children}
      <footer className="siteFooter" id="support">
        <div>
          <strong>Business Booking Next</strong>
          <p>Fast stays for work trips, group travel, and client-ready hotel plans.</p>
        </div>
        <div className="footerLinks">
          <span>
            <Plane size={16} aria-hidden="true" /> Flight-ready itineraries
          </span>
          <span>
            <Headphones size={16} aria-hidden="true" /> 24/7 booking support
          </span>
        </div>
      </footer>
    </div>
  );
}

function HeaderAction() {
  const location = useLocation();
  const hasToken = Boolean(getToken());

  if (!hasToken) {
    return (
      <Link className="headerSignIn" to={`/booking/h_1${location.search || ''}`}>
        <UserRound size={17} aria-hidden="true" />
        Sign in
      </Link>
    );
  }

  return (
    <button
      className="headerSignIn"
      type="button"
      onClick={() => {
        clearToken();
        if (location.pathname.startsWith('/booking') || location.pathname.startsWith('/payment')) {
          window.location.href = '/';
        }
      }}
    >
      <UserRound size={17} aria-hidden="true" />
      Sign out
    </button>
  );
}
