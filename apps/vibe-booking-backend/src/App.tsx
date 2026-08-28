import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navbar } from './components/Navbar';
import { BookingPortal } from './components/BookingPortal';
import { Dashboard } from './components/Dashboard';

interface GeneratedAuthUser {
  email: string;
  fullName?: string;
}

export function App() {
  const [currentView, setCurrentView] = useState<'booking' | 'dashboard'>('dashboard');
  const [currentUser, setCurrentUser] = useState<GeneratedAuthUser | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [proMessage, setProMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<'auth' | 'pro' | null>(null);
  
  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:4020', []);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/auth/me`, {
        credentials: 'include',
      });
      const body = (await response.json()) as {
        user?: GeneratedAuthUser | null;
      };
      setCurrentUser(body.user ?? null);
    } catch {
      setCurrentUser(null);
    }
  }, [apiBase]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  async function handleSignIn(emailInput: string, passwordInput: string) {
    setLoading('auth');
    setAuthMessage(null);

    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: emailInput,
          password: passwordInput,
        }),
      });
      const body = (await response.json()) as {
        user?: GeneratedAuthUser;
        error?: string;
        detail?: string;
      };

      if (!response.ok || !body.user) {
        throw new Error(body.detail ?? body.error ?? 'Unable to sign in');
      }

      setCurrentUser(body.user);
    } catch (requestError) {
      setAuthMessage(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setLoading(null);
    }
  }

  async function handleSignOut() {
    setLoading('auth');
    setAuthMessage(null);

    try {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setCurrentUser(null);
    } catch (requestError) {
      setAuthMessage(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setLoading(null);
    }
  }

  async function checkProRoute() {
    setLoading('pro');
    setProMessage(null);

    try {
      const response = await fetch(`${apiBase}/api/pro`, {
        credentials: 'include',
        headers: {
          'x-plan': 'pro',
        },
      });
      const body = (await response.json()) as {
        error?: string;
        feature?: string;
        plan?: string;
      };

      if (!response.ok || !body.feature) {
        throw new Error(body.error ?? 'Protected route check failed');
      }

      setProMessage(`Access active for plan: ${body.plan}. Current entitlement: ${body.feature}. - protected route is live`);
    } catch (requestError) {
      setProMessage(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setLoading(null);
    }
  }

  const path = window.location.pathname;

  if (path === '/terms') {
    return (
      <div className="app-container" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Terms of Service</h1>
        <p>These are the terms of service for Vibe Booking.</p>
        <a href="/" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Back to home</a>
      </div>
    );
  }

  if (path === '/privacy') {
    return (
      <div className="app-container" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Privacy Policy</h1>
        <p>This is the privacy policy for Vibe Booking.</p>
        <a href="/" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Back to home</a>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
        onSignOut={() => { void handleSignOut(); }}
      />
      
      <main className="main-content">
        {currentView === 'booking' ? (
          <BookingPortal apiBase={apiBase} />
        ) : (
          <Dashboard
            currentUser={currentUser}
            onSignIn={handleSignIn}
            loading={loading === 'auth'}
            authMessage={authMessage}
            checkProRoute={checkProRoute}
            proMessage={proMessage}
          />
        )}
      </main>

      <footer style={{ marginTop: 'auto', padding: '20px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <a href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms</a>
          <a href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy</a>
        </div>
      </footer>
    </div>
  );
}
