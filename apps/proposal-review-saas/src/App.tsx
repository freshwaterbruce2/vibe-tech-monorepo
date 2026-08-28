import { useCallback, useEffect, useMemo, useState } from 'react';

import { LandingPage } from '@vibetech/landing';

import { LegalPage } from './LegalPage';
import { privacyLegalPage, termsLegalPage } from './legalContent';
import { initialInput, landingContent } from './proposalContent';
import type { AuthUser, ReviewInput, ReviewResult, RewriteResult } from './proposalTypes';

export function App() {
  const pathname = window.location.pathname;
  const [form, setForm] = useState<ReviewInput>(initialInput);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authConfigured, setAuthConfigured] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [rewrite, setRewrite] = useState<RewriteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'review' | 'pro' | 'checkout' | 'auth' | null>(null);

  const apiBase = useMemo(
    () => import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:5320',
    [],
  );

  const payload = useMemo(
    () => ({
      clientName: form.clientName,
      projectType: form.projectType,
      proposalText: form.proposalText,
      priceUsd: Number(form.priceUsd),
      turnaroundDays: Number(form.turnaroundDays),
      revisionRounds: Number(form.revisionRounds),
    }),
    [form],
  );

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/auth/me`, {
        credentials: 'include',
      });
      const body = (await response.json()) as {
        configured?: boolean;
        user?: AuthUser | null;
      };

      setAuthConfigured(Boolean(body.configured));
      setUser(body.user ?? null);
    } catch {
      setAuthConfigured(false);
      setUser(null);
    }
  }, [apiBase]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const runFreeReview = async () => {
    setLoading('review');
    setError(null);
    setRewrite(null);

    try {
      const response = await fetch(`${apiBase}/api/review`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { review?: ReviewResult; error?: string };
      if (!response.ok || !body.review) {
        throw new Error(body.error ?? 'Review request failed');
      }
      setReview(body.review);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setLoading(null);
    }
  };

  const runProPreview = async () => {
    if (!user) {
      setError('Sign in with the generated operator account to unlock the pro rewrite lane.');
      return;
    }

    setLoading('pro');
    setError(null);

    try {
      const response = await fetch(`${apiBase}/api/pro/rewrite`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-plan': 'pro',
        },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        review?: ReviewResult;
        rewrite?: RewriteResult;
        error?: string;
      };
      if (!response.ok || !body.review || !body.rewrite) {
        throw new Error(body.error ?? 'Pro preview request failed');
      }
      setReview(body.review);
      setRewrite(body.rewrite);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setLoading(null);
    }
  };

  const signIn = async () => {
    setLoading('auth');
    setAuthError(null);

    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });
      const body = (await response.json()) as {
        user?: AuthUser;
        error?: string;
        detail?: string;
      };

      if (!response.ok || !body.user) {
        throw new Error(body.detail ?? body.error ?? 'Unable to sign in');
      }

      setUser(body.user);
      setAuthConfigured(true);
      setLoginPassword('');
    } catch (requestError) {
      setAuthError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setLoading(null);
    }
  };

  const signOut = async () => {
    setLoading('auth');
    setAuthError(null);

    try {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      await refreshSession();
    } catch (requestError) {
      setAuthError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setLoading(null);
    }
  };

  const startCheckout = async () => {
    setLoading('checkout');
    setCheckoutError(null);

    try {
      const response = await fetch(`${apiBase}/api/billing/demo-checkout`);
      const body = (await response.json()) as { url?: string; error?: string; detail?: string };
      if (!response.ok || !body.url) {
        throw new Error(body.detail ?? body.error ?? 'Checkout is not available');
      }
      window.location.assign(body.url);
    } catch (requestError) {
      setCheckoutError(
        requestError instanceof Error ? requestError.message : String(requestError),
      );
    } finally {
      setLoading(null);
    }
  };

  if (pathname === '/terms') {
    return <LegalPage {...termsLegalPage} />;
  }

  if (pathname === '/privacy') {
    return <LegalPage {...privacyLegalPage} />;
  }

  return (
    <div>
      <LandingPage content={landingContent} />

      <main id="review-tool" className="tool-shell">
        <section className="tool-header">
          <div>
            <div className="section-badge">Live micro-tool</div>
            <h2>Proposal scorecard</h2>
            <p>
              Drop in the client proposal, run the free review, then unlock the pro rewrite
              guidance when the proposal needs stronger scope and pricing language.
            </p>
          </div>
          <div className="status-card">
            <div className="status-label">Factory lane</div>
            <div className="status-value">generated SaaS app</div>
            <div className="status-meta">auth, billing, landing, analytics, entitlements</div>
          </div>
        </section>

        <section className="auth-grid">
          <article className="status-card">
            <div className="status-label">Auth status</div>
            <div className="status-value">
              {user ? 'signed in' : authConfigured ? 'sign-in required' : 'not configured'}
            </div>
            <div className="status-meta">
              {user
                ? `Signed in as ${user.fullName ?? user.email}`
                : authConfigured
                  ? 'Use the generated operator account to unlock pro rewrite guidance.'
                  : 'Set AUTH_SECRET and the DEMO_USER_* values in .env before using the generated login flow.'}
            </div>
          </article>
          <article className="editor-card auth-card">
            <div className="results-title">Generated login</div>
            {user ? (
              <>
                <p className="placeholder">
                  The starter operator session is active for {user.email}.
                </p>
                <div className="action-row">
                  <button className="secondary" onClick={() => void signOut()} disabled={loading !== null}>
                    {loading === 'auth' ? 'Signing out...' : 'Sign out'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <label>
                  Email
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    placeholder="owner@example.com"
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="change-this-password"
                  />
                </label>
                <div className="action-row">
                  <button onClick={() => void signIn()} disabled={loading !== null}>
                    {loading === 'auth' ? 'Signing in...' : 'Sign in for pro access'}
                  </button>
                </div>
              </>
            )}
            {authError ? <div className="message error">{authError}</div> : null}
          </article>
        </section>

        <section className="tool-grid">
          <article className="editor-card">
            <label>
              Client
              <input
                value={form.clientName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, clientName: event.target.value }))
                }
              />
            </label>
            <label>
              Project type
              <input
                value={form.projectType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, projectType: event.target.value }))
                }
              />
            </label>
            <div className="compact-grid">
              <label>
                Price (USD)
                <input
                  type="number"
                  value={form.priceUsd}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, priceUsd: event.target.value }))
                  }
                />
              </label>
              <label>
                Turnaround days
                <input
                  type="number"
                  value={form.turnaroundDays}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, turnaroundDays: event.target.value }))
                  }
                />
              </label>
              <label>
                Revision rounds
                <input
                  type="number"
                  value={form.revisionRounds}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, revisionRounds: event.target.value }))
                  }
                />
              </label>
            </div>
            <label>
              Proposal text
              <textarea
                rows={12}
                value={form.proposalText}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, proposalText: event.target.value }))
                }
              />
            </label>

            <div className="action-row">
              <button onClick={() => void runFreeReview()} disabled={loading !== null}>
                {loading === 'review' ? 'Running review...' : 'Run free review'}
              </button>
              <button className="secondary" onClick={() => void runProPreview()} disabled={loading !== null}>
                {loading === 'pro'
                  ? 'Loading pro...'
                  : user
                    ? 'Preview pro rewrite'
                    : 'Sign in for pro rewrite'}
              </button>
              <button className="secondary" onClick={() => void startCheckout()} disabled={loading !== null}>
                {loading === 'checkout' ? 'Starting checkout...' : 'Open Stripe checkout'}
              </button>
            </div>

            {error ? <div className="message error">{error}</div> : null}
            {checkoutError ? <div className="message error">{checkoutError}</div> : null}
          </article>

          <article className="results-card">
            <div className="results-section">
              <div className="results-title">Free review output</div>
              {review ? (
                <>
                  <div className={`score-pill verdict-${review.verdict}`}>
                    {review.score}/100 · {review.verdict}
                  </div>
                  <p className="next-step">{review.nextStep}</p>
                  <div className="list-block">
                    <h3>Strengths</h3>
                    <ul>
                      {review.strengths.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="list-block">
                    <h3>Risks</h3>
                    <ul>
                      {review.risks.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="placeholder">Run the free review to score the proposal.</p>
              )}
            </div>

            <div className="results-section">
              <div className="results-title">Pro rewrite output</div>
              {rewrite ? (
                <>
                  <p className="next-step">{rewrite.summary}</p>
                  <div className="callout">
                    <div className="callout-label">Recommended CTA</div>
                    <div>{rewrite.recommendedCta}</div>
                  </div>
                  <div className="list-block">
                    <h3>Scope guardrails</h3>
                    <ul>
                      {rewrite.scopeGuardrails.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="list-block">
                    <h3>Follow-up checklist</h3>
                    <ul>
                      {rewrite.followUpChecklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="placeholder">
                  Use the pro preview to load rewrite guidance from the gated route.
                </p>
              )}
            </div>
          </article>
        </section>

        <section className="tool-footer">
          <div className="tool-footer-copy">
            Proposal Review runs on the factory SaaS scaffold with shared billing, landing,
            analytics, and entitlement primitives.
          </div>
          <div className="tool-footer-links">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
          </div>
        </section>
      </main>
    </div>
  );
}
