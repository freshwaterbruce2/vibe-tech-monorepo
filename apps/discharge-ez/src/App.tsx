import { useCallback, useEffect, useMemo, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthUser {
  email: string;
  fullName?: string;
}

interface ApiAuthMeResponse {
  configured?: boolean;
  user?: AuthUser | null;
}

interface ApiLoginResponse {
  user?: AuthUser;
  error?: string;
  detail?: string;
}

interface ApiSimplifyResponse {
  simplifiedText?: string;
  error?: string;
}

interface ApiCheckoutResponse {
  url?: string;
  error?: string;
  detail?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = [
  'English',
  'Spanish',
  'Mandarin',
  'French',
  'Portuguese',
  'Arabic',
  'Hindi',
  'Vietnamese',
  'Tagalog',
  'Russian',
] as const;

// ─── App ──────────────────────────────────────────────────────────────────────

export function App() {
  const pathname = window.location.pathname;
  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:5320', []);

  // Auth state
  const [authConfigured, setAuthConfigured] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // AI Simplifier state
  const [clinicalText, setClinicalText] = useState('');
  const [simplifiedText, setSimplifiedText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<string>('English');
  const [simplifyLoading, setSimplifyLoading] = useState(false);
  const [simplifyError, setSimplifyError] = useState<string | null>(null);

  // Billing state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // ── Session refresh ──────────────────────────────────────────────────────────

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/auth/me`, { credentials: 'include' });
      const body = (await res.json()) as ApiAuthMeResponse;
      setAuthConfigured(Boolean(body.configured));
      setCurrentUser(body.user ?? null);
    } catch {
      setAuthConfigured(false);
      setCurrentUser(null);
    }
  }, [apiBase]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  // ── Auth handlers ────────────────────────────────────────────────────────────

  async function signIn() {
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password }),
      });
      const body = (await res.json()) as ApiLoginResponse;
      if (!res.ok || !body.user) {
        throw new Error(body.detail ?? body.error ?? 'Unable to sign in');
      }
      setCurrentUser(body.user);
      setAuthConfigured(true);
      setPassword('');
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut() {
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      await fetch(`${apiBase}/api/auth/logout`, { method: 'POST', credentials: 'include' });
      setCurrentUser(null);
      await refreshSession();
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setAuthLoading(false);
    }
  }

  // ── Simplifier handler ───────────────────────────────────────────────────────

  async function handleSimplify() {
    setSimplifyLoading(true);
    setSimplifyError(null);
    setSimplifiedText('');
    try {
      const res = await fetch(`${apiBase}/api/simplify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: clinicalText, language: targetLanguage }),
      });
      const data = (await res.json()) as ApiSimplifyResponse;
      if (!res.ok) throw new Error(data.error ?? 'Failed to simplify text');
      setSimplifiedText(data.simplifiedText ?? '');
    } catch (err) {
      setSimplifyError(err instanceof Error ? err.message : String(err));
    } finally {
      setSimplifyLoading(false);
    }
  }

  // ── Billing handler ──────────────────────────────────────────────────────────

  async function handleCheckout() {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch(`${apiBase}/api/billing/demo-checkout`, { credentials: 'include' });
      const data = (await res.json()) as ApiCheckoutResponse;
      if (!res.ok || !data.url) {
        throw new Error(data.detail ?? data.error ?? 'Failed to create checkout session');
      }
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : String(err));
      setCheckoutLoading(false);
    }
  }

  // ── Route: billing pages ─────────────────────────────────────────────────────

  if (pathname === '/billing/success') {
    return (
      <StatusPage
        emoji="🎉"
        title="You're now a DischargeEz Pro member"
        body="Your subscription is active. Clinicians on your team can now simplify discharge instructions in any language — no more patient callbacks."
        cta={{ label: 'Open the app', href: '/' }}
      />
    );
  }

  if (pathname === '/billing/canceled') {
    return (
      <StatusPage
        emoji="👋"
        title="Checkout canceled"
        body="No charge was made. Whenever you're ready, upgrade to Pro to unlock multi-language simplification for your entire team."
        cta={{ label: 'Back to DischargeEz', href: '/' }}
      />
    );
  }

  // ── Route: legal pages ───────────────────────────────────────────────────────

  if (pathname === '/terms') {
    return (
      <LegalPage
        title="Terms of Service"
        intro="DischargeEz helps clinical teams turn complex discharge instructions into clear, plain-language patient guidance. By using this service you agree to the following terms."
        sections={[
          {
            heading: 'Use of the service',
            body: 'DischargeEz is intended for use by licensed healthcare providers and their administrative staff. You are responsible for reviewing all AI-generated output before providing it to patients. DischargeEz output does not constitute medical advice.',
          },
          {
            heading: 'Billing',
            body: 'Subscriptions are billed monthly through Stripe. You may cancel at any time from your account settings. Refunds are issued at our discretion for accidental charges.',
          },
          {
            heading: 'Patient data',
            body: 'Do not enter identifiable patient information (PHI) into the simplifier. DischargeEz is not a HIPAA Business Associate and does not execute BAAs. Use de-identified or synthetic clinical text only.',
          },
          {
            heading: 'Acceptable use',
            body: 'This service may not be used for purposes other than generating patient-facing discharge content. Automated scraping, resale of output, or use to train competing models is prohibited.',
          },
        ]}
      />
    );
  }

  if (pathname === '/privacy') {
    return (
      <LegalPage
        title="Privacy Policy"
        intro="DischargeEz is committed to protecting the privacy of our users. This policy explains what we collect, how we use it, and your rights."
        sections={[
          {
            heading: 'What we collect',
            body: 'We collect your email address, authentication credentials, and billing information through Stripe. We log API requests for abuse prevention and quality assurance.',
          },
          {
            heading: 'What we do not collect',
            body: 'DischargeEz does not store the clinical text you enter in the simplifier beyond the duration of your request. We do not retain AI-generated output on our servers.',
          },
          {
            heading: 'Payments',
            body: 'All payment processing is handled by Stripe. DischargeEz does not store raw card numbers or full payment details.',
          },
          {
            heading: 'Third parties',
            body: 'We use Gemini or OpenRouter to process simplification requests. These providers may retain inputs per their own terms. We recommend de-identifying all input text.',
          },
        ]}
      />
    );
  }

  // ── Main app ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#08111f', color: '#f5f7fb', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Hero ── */}
      <header style={{ borderBottom: '1px solid rgba(148,163,184,0.12)', padding: '0 24px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🏥</span>
            <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>DischargeEz</span>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '14px' }}>
            {currentUser ? (
              <>
                <span style={{ color: '#94a3b8' }}>{currentUser.fullName ?? currentUser.email}</span>
                <button
                  onClick={() => void signOut()}
                  disabled={authLoading}
                  style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(148,163,184,0.2)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <a href="#sign-in" style={{ color: '#67e8f9', textDecoration: 'none', fontSize: '14px' }}>Sign in</a>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero section ── */}
      <section style={{ padding: '80px 24px 64px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', marginBottom: '20px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(14,165,233,0.12)', color: '#67e8f9', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          AI-powered • Multi-language • HIPAA-aware
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 20px' }}>
          Turn clinical jargon into<br />
          <span style={{ color: '#67e8f9' }}>clear patient instructions</span>
        </h1>
        <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '560px', margin: '0 auto 36px', lineHeight: 1.6 }}>
          DischargeEz instantly rewrites complex discharge instructions into plain language — in 10+ languages — so patients actually understand their care.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="#simplifier"
            style={{ padding: '14px 28px', borderRadius: '8px', background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: '16px', textDecoration: 'none', display: 'inline-block' }}
          >
            Try it free →
          </a>
          <button
            onClick={() => void handleCheckout()}
            disabled={checkoutLoading}
            style={{ padding: '14px 28px', borderRadius: '8px', border: '1px solid rgba(14,165,233,0.4)', background: 'transparent', color: '#67e8f9', fontWeight: 600, fontSize: '16px', cursor: 'pointer' }}
          >
            {checkoutLoading ? 'Loading...' : 'Upgrade to Pro — $9/mo'}
          </button>
        </div>
        {checkoutError && (
          <p style={{ marginTop: '12px', color: '#ef4444', fontSize: '13px' }}>{checkoutError}</p>
        )}
      </section>

      {/* ── Feature highlights ── */}
      <section style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {[
            { icon: '🌐', title: '10+ languages', body: 'Instantly translate simplified instructions into Spanish, Mandarin, French, Portuguese, Arabic, Hindi, Vietnamese, and more.' },
            { icon: '🤖', title: 'AI-powered simplification', body: 'Powered by Gemini 2.5 Flash. Clinical discharge notes become clear, empathetic 5th-grade-level instructions patients can follow.' },
            { icon: '⚡', title: 'Seconds, not hours', body: 'What used to take a nurse 20 minutes of rewording now takes 3 seconds. Reduce callbacks and improve patient satisfaction scores.' },
          ].map((f) => (
            <div key={f.title} style={{ padding: '24px', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.12)', background: 'rgba(15,23,42,0.6)' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{f.icon}</div>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700 }}>{f.title}</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Simplifier ── */}
      <section id="simplifier" style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px' }}>Discharge Instruction Simplifier</h2>
            <p style={{ color: '#94a3b8', margin: 0 }}>Paste clinical discharge notes below — get plain language output in seconds.</p>
          </div>
          <div style={{ borderRadius: '12px', border: '1px solid rgba(148,163,184,0.12)', background: 'rgba(15,23,42,0.8)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <textarea
              value={clinicalText}
              onChange={(e) => setClinicalText(e.target.value)}
              placeholder="Paste patient clinical discharge instructions here... e.g. 'Patient is to maintain strict NPO status for 8 hours post-operatively. Administer Metoprolol Succinate 50mg PO QD for cardiac rate control. Monitor surgical incision for signs of dehiscence or erythema...'"
              rows={7}
              style={{ width: '100%', padding: '14px', borderRadius: '8px', background: '#08111f', border: '1px solid rgba(148,163,184,0.2)', color: '#f5f7fb', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#94a3b8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Output Language
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '8px', background: '#08111f', border: '1px solid rgba(148,163,184,0.2)', color: '#f5f7fb', fontSize: '14px', minWidth: '160px' }}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => void handleSimplify()}
                disabled={simplifyLoading || !clinicalText.trim()}
                style={{ padding: '10px 24px', borderRadius: '8px', background: simplifyLoading || !clinicalText.trim() ? '#1e3a5f' : '#0ea5e9', color: simplifyLoading || !clinicalText.trim() ? '#64748b' : '#fff', border: 'none', cursor: simplifyLoading || !clinicalText.trim() ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '14px', transition: 'background 0.15s' }}
              >
                {simplifyLoading ? '⏳ Simplifying...' : '✨ Simplify Instructions'}
              </button>
            </div>

            {simplifyError && (
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '13px' }}>
                {simplifyError}
              </div>
            )}

            {simplifiedText && (
              <div style={{ padding: '20px', borderRadius: '8px', background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    ✓ Simplified — {targetLanguage}
                  </span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', color: '#f5f7fb', fontSize: '14px', lineHeight: 1.7 }}>
                  {simplifiedText}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px' }}>Simple, honest pricing</h2>
            <p style={{ color: '#94a3b8', margin: 0 }}>Start free. Upgrade when your team is ready.</p>
          </div>
          <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>

            {/* Free tier */}
            <div style={{ padding: '28px', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.5)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Free</div>
              <div style={{ fontSize: '36px', fontWeight: 800, marginBottom: '4px' }}>$0</div>
              <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Always free, no credit card</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['English output only', '20 simplifications/month', 'AI-powered simplification', 'Basic support'].map((f) => (
                  <li key={f} style={{ display: 'flex', gap: '8px', fontSize: '14px', color: '#cbd5e1' }}>
                    <span style={{ color: '#22c55e' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="#simplifier" style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>
                Start free
              </a>
            </div>

            {/* Pro tier */}
            <div style={{ padding: '28px', borderRadius: '12px', border: '1px solid rgba(14,165,233,0.4)', background: 'rgba(14,165,233,0.05)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '4px 14px', borderRadius: '999px', background: '#0ea5e9', color: '#fff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Most popular
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Pro</div>
              <div style={{ fontSize: '36px', fontWeight: 800, marginBottom: '4px' }}>$9<span style={{ fontSize: '16px', fontWeight: 400, color: '#94a3b8' }}>/mo</span></div>
              <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Per clinician, billed monthly</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['10+ output languages', 'Unlimited simplifications', 'AI-powered simplification', 'Priority support', 'Team sharing (coming soon)', 'EHR copy-paste mode (coming soon)'].map((f) => (
                  <li key={f} style={{ display: 'flex', gap: '8px', fontSize: '14px', color: '#cbd5e1' }}>
                    <span style={{ color: '#22c55e' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => void handleCheckout()}
                disabled={checkoutLoading}
                style={{ display: 'block', width: '100%', padding: '12px', borderRadius: '8px', background: '#0ea5e9', color: '#fff', border: 'none', cursor: checkoutLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '15px' }}
              >
                {checkoutLoading ? 'Loading...' : 'Upgrade to Pro →'}
              </button>
              {checkoutError && (
                <p style={{ marginTop: '10px', color: '#fca5a5', fontSize: '12px', textAlign: 'center' }}>{checkoutError}</p>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── Auth section ── */}
      <section id="sign-in" style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ padding: '32px', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.12)', background: 'rgba(15,23,42,0.8)' }}>
            {currentUser ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>👋</div>
                <h3 style={{ margin: '0 0 6px', fontSize: '18px' }}>Signed in as {currentUser.fullName ?? currentUser.email}</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 24px' }}>Your Pro features are active.</p>
                <button
                  onClick={() => void signOut()}
                  disabled={authLoading}
                  style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
                >
                  {authLoading ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700 }}>
                  {authConfigured ? 'Sign in to DischargeEz' : 'Operator access'}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 24px' }}>
                  {authConfigured
                    ? 'Sign in to access Pro features.'
                    : 'Set AUTH_SECRET and DEMO_USER_* in .env to enable authentication.'}
                </p>
                {authMessage && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '13px', marginBottom: '16px' }}>
                    {authMessage}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Email
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="you@clinic.com"
                      style={{ padding: '10px 14px', borderRadius: '8px', background: '#08111f', border: '1px solid rgba(148,163,184,0.2)', color: '#f5f7fb', fontSize: '14px' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Password
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      onKeyDown={(e) => { if (e.key === 'Enter') void signIn(); }}
                      style={{ padding: '10px 14px', borderRadius: '8px', background: '#08111f', border: '1px solid rgba(148,163,184,0.2)', color: '#f5f7fb', fontSize: '14px' }}
                    />
                  </label>
                  <button
                    onClick={() => void signIn()}
                    disabled={authLoading || !authConfigured}
                    style={{ padding: '12px', borderRadius: '8px', background: authLoading || !authConfigured ? '#1e3a5f' : '#0ea5e9', color: authLoading || !authConfigured ? '#64748b' : '#fff', border: 'none', cursor: authLoading || !authConfigured ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '14px' }}
                  >
                    {authLoading ? 'Signing in...' : 'Sign in'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(148,163,184,0.1)', padding: '24px', color: '#475569', fontSize: '13px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <span>© 2026 DischargeEz. All rights reserved.</span>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="/terms" style={{ color: '#67e8f9', textDecoration: 'none' }}>Terms</a>
            <a href="/privacy" style={{ color: '#67e8f9', textDecoration: 'none' }}>Privacy</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPage({ emoji, title, body, cta }: {
  emoji: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08111f', color: '#f5f7fb', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px' }}>
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>{emoji}</div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 16px' }}>{title}</h1>
        <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: '0 0 32px' }}>{body}</p>
        <a href={cta.href} style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '8px', background: '#0ea5e9', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>
          {cta.label}
        </a>
      </div>
    </div>
  );
}

function LegalPage({ title, intro, sections }: {
  title: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
}) {
  return (
    <div style={{ minHeight: '100vh', padding: '48px 24px', background: '#08111f', color: '#f5f7fb', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <a href="/" style={{ color: '#67e8f9', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '32px' }}>
          ← Back to DischargeEz
        </a>
        <h1 style={{ fontSize: '40px', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>{title}</h1>
        <p style={{ color: '#94a3b8', lineHeight: 1.7, margin: '0 0 40px', fontSize: '16px' }}>{intro}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {sections.map((s) => (
            <section key={s.heading} style={{ padding: '24px', borderRadius: '10px', border: '1px solid rgba(148,163,184,0.12)', background: 'rgba(15,23,42,0.6)' }}>
              <h2 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 700 }}>{s.heading}</h2>
              <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.7 }}>{s.body}</p>
            </section>
          ))}
        </div>
        <div style={{ marginTop: '40px', display: 'flex', gap: '16px', color: '#475569', fontSize: '13px' }}>
          <a href="/terms" style={{ color: '#67e8f9', textDecoration: 'none' }}>Terms</a>
          <a href="/privacy" style={{ color: '#67e8f9', textDecoration: 'none' }}>Privacy</a>
        </div>
      </div>
    </div>
  );
}
