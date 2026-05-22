import { useCallback, useEffect, useMemo, useState } from 'react';

interface GeneratedAuthUser {
  email: string;
  fullName?: string;
}

interface AppealFormState {
  diagnosis: string;
  procedure: string;
  denialReason: string;
}

interface AppealResponse {
  appealLetter?: string;
  source?: 'ai' | 'local-draft';
  aiUsage?: {
    provider?: string;
    model?: string;
    totalTokens: number;
  };
  error?: string;
  detail?: string;
}

interface SubscriptionStatus {
  plan: 'free' | 'pro';
  status: 'inactive' | 'pending' | 'active';
  appealGenerations: number;
  aiTokens: number;
}

interface CheckoutResponse {
  url?: string;
  subscription?: SubscriptionStatus;
  error?: string;
  detail?: string;
}

const emptyAppealForm: AppealFormState = {
  diagnosis: '',
  procedure: '',
  denialReason: '',
};

export function App() {
  const pathname = window.location.pathname;
  const [authConfigured, setAuthConfigured] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<GeneratedAuthUser | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [appealForm, setAppealForm] = useState<AppealFormState>(emptyAppealForm);
  const [appealLetter, setAppealLetter] = useState('');
  const [appealSource, setAppealSource] = useState<AppealResponse['source'] | null>(null);
  const [appealUsage, setAppealUsage] = useState<AppealResponse['aiUsage'] | null>(null);
  const [appealMessage, setAppealMessage] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<'auth' | 'appeal' | 'checkout' | null>(null);
  const apiBase = useMemo(
    () => import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:5320',
    [],
  );
  const isPro = subscription?.plan === 'pro' && subscription.status === 'active';
  const checkoutNotice =
    pathname === '/billing/success'
      ? 'Payment received. The webhook can take a few seconds to unlock Pro access.'
      : pathname === '/billing/canceled'
        ? 'Checkout was canceled. You can restart the subscription when ready.'
        : null;

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/auth/me`, {
        credentials: 'include',
      });
      const body = (await response.json()) as {
        configured?: boolean;
        user?: GeneratedAuthUser | null;
        subscription?: SubscriptionStatus | null;
      };

      setAuthConfigured(Boolean(body.configured));
      setCurrentUser(body.user ?? null);
      setSubscription(body.subscription ?? null);
    } catch {
      setAuthConfigured(false);
      setCurrentUser(null);
      setSubscription(null);
    }
  }, [apiBase]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  async function signIn() {
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
          email: userEmail,
          password,
        }),
      });
      const body = (await response.json()) as {
        user?: GeneratedAuthUser;
        subscription?: SubscriptionStatus;
        error?: string;
        detail?: string;
      };

      if (!response.ok || !body.user) {
        throw new Error(body.detail ?? body.error ?? 'Unable to sign in');
      }

      setCurrentUser(body.user);
      setSubscription(body.subscription ?? null);
      setAuthConfigured(true);
      setPassword('');
    } catch (requestError) {
      setAuthMessage(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setLoading(null);
    }
  }

  async function signOut() {
    setLoading('auth');
    setAuthMessage(null);

    try {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setCurrentUser(null);
      setSubscription(null);
      setAppealLetter('');
      setAppealSource(null);
      setAppealUsage(null);
      await refreshSession();
    } catch (requestError) {
      setAuthMessage(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setLoading(null);
    }
  }

  async function generateAppeal() {
    setLoading('appeal');
    setAppealMessage(null);
    setAppealLetter('');
    setAppealSource(null);
    setAppealUsage(null);

    try {
      const response = await fetch(`${apiBase}/api/appeals/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(appealForm),
      });
      const body = (await response.json()) as AppealResponse;

      if (!response.ok || !body.appealLetter) {
        throw new Error(body.detail ?? body.error ?? 'Appeal generation failed');
      }

      setAppealLetter(body.appealLetter);
      setAppealSource(body.source ?? null);
      setAppealUsage(body.aiUsage ?? null);
      await refreshSession();
    } catch (requestError) {
      setAppealMessage(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setLoading(null);
    }
  }

  async function startCheckout() {
    setLoading('checkout');
    setBillingMessage(null);

    try {
      const response = await fetch(`${apiBase}/api/billing/checkout`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = (await response.json()) as CheckoutResponse;
      if (!response.ok || !body.url) {
        throw new Error(body.detail ?? body.error ?? 'Unable to start checkout');
      }

      if (body.subscription) {
        setSubscription(body.subscription);
      }
      window.location.assign(body.url);
    } catch (requestError) {
      setBillingMessage(requestError instanceof Error ? requestError.message : String(requestError));
      setLoading(null);
    }
  }

  if (pathname === '/terms') {
    return (
      <LegalPage
        title="Terms of service"
        intro="PriorAuthPro drafts payer appeal language from user-provided case facts. Product owners remain responsible for clinical review, payer-specific policy checks, and final submission."
        sections={[
          {
            heading: 'Clinical review',
            body: 'Generated appeal drafts must be reviewed by qualified staff before use in a patient or payer workflow.',
          },
          {
            heading: 'Billing',
            body: 'Paid access is expected to flow through the shared Stripe billing package and the plans configured for this product.',
          },
          {
            heading: 'Acceptable use',
            body: 'Submit only case details that your organization is authorized to process.',
          },
        ]}
      />
    );
  }

  if (pathname === '/privacy') {
    return (
      <LegalPage
        title="Privacy policy"
        intro="PriorAuthPro is structured for case-specific prior authorization workflows. Replace this starter policy with the production data inventory before launch."
        sections={[
          {
            heading: 'Case data',
            body: 'The app processes diagnosis, requested procedure, denial rationale, account, billing, and workflow data needed to draft appeals.',
          },
          {
            heading: 'Payments',
            body: 'Payments should be delegated to Stripe through the shared billing package. Raw card data should not be stored by the app.',
          },
          {
            heading: 'AI processing',
            body: 'Generated text is produced from submitted case facts and should be reviewed before external use.',
          },
        ]}
      />
    );
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="product-header">
          <div>
            <p className="eyebrow">PriorAuthPro</p>
            <h1>Appeal letter workspace</h1>
          </div>
          <SessionCard
            authConfigured={authConfigured}
            currentUser={currentUser}
            subscription={subscription}
            userEmail={userEmail}
            password={password}
            loading={loading}
            authMessage={authMessage}
            billingMessage={billingMessage}
            checkoutNotice={checkoutNotice}
            onEmailChange={setUserEmail}
            onPasswordChange={setPassword}
            onSignIn={() => void signIn()}
            onSignOut={() => void signOut()}
            onCheckout={() => void startCheckout()}
          />
        </header>

        <section className="appeal-grid">
          <article className="panel">
            <div className="panel-heading">
              <p className="eyebrow">Case facts</p>
              <h2>Generate a medical necessity appeal</h2>
            </div>

            <div className="form-stack">
              <label className="field">
                Diagnosis
                <input
                  value={appealForm.diagnosis}
                  onChange={(event) =>
                    setAppealForm((current) => ({
                      ...current,
                      diagnosis: event.target.value,
                    }))
                  }
                  placeholder="Example: severe obstructive sleep apnea"
                />
              </label>
              <label className="field">
                Procedure
                <input
                  value={appealForm.procedure}
                  onChange={(event) =>
                    setAppealForm((current) => ({
                      ...current,
                      procedure: event.target.value,
                    }))
                  }
                  placeholder="Example: in-lab polysomnography"
                />
              </label>
              <label className="field">
                Denial reason
                <textarea
                  value={appealForm.denialReason}
                  onChange={(event) =>
                    setAppealForm((current) => ({
                      ...current,
                      denialReason: event.target.value,
                    }))
                  }
                  placeholder="Example: payer states service is not medically necessary"
                  rows={5}
                />
              </label>
            </div>

            <button
              className="primary-action"
              onClick={() => void generateAppeal()}
              disabled={loading !== null || currentUser === null || !isPro}
            >
              {loading === 'appeal' ? 'Generating...' : 'Generate appeal'}
            </button>
            {appealMessage ? <p className="message error-message">{appealMessage}</p> : null}
            {!currentUser ? (
              <p className="message muted-message">Sign in before generating an appeal draft.</p>
            ) : !isPro ? (
              <p className="message muted-message">
                Subscribe to PriorAuthPro Pro before generating an appeal draft.
              </p>
            ) : null}
          </article>

          <article className="panel output-panel">
            <div className="panel-heading">
              <p className="eyebrow">Draft output</p>
              <h2>Appeal letter</h2>
            </div>
            {appealSource ? <p className="source-pill">Source: {appealSource}</p> : null}
            {appealUsage ? (
              <p className="source-pill">
                Metered: {appealUsage.totalTokens} tokens
                {appealUsage.provider ? ` via ${appealUsage.provider}` : ''}
              </p>
            ) : null}
            <textarea
              className="letter-output"
              value={appealLetter}
              readOnly
              placeholder="Generated appeal language will appear here."
              rows={18}
            />
          </article>
        </section>

        <footer className="legal-links">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </footer>
      </section>
    </main>
  );
}

function SessionCard({
  authConfigured,
  currentUser,
  subscription,
  userEmail,
  password,
  loading,
  authMessage,
  billingMessage,
  checkoutNotice,
  onEmailChange,
  onPasswordChange,
  onSignIn,
  onSignOut,
  onCheckout,
}: {
  authConfigured: boolean;
  currentUser: GeneratedAuthUser | null;
  subscription: SubscriptionStatus | null;
  userEmail: string;
  password: string;
  loading: 'auth' | 'appeal' | 'checkout' | null;
  authMessage: string | null;
  billingMessage: string | null;
  checkoutNotice: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onCheckout: () => void;
}) {
  const isPro = subscription?.plan === 'pro' && subscription.status === 'active';

  return (
    <aside className="session-card">
      <div>
        <p className="eyebrow">Pro access</p>
        <h2>{currentUser ? 'Active session' : authConfigured ? 'Sign in' : 'Auth setup needed'}</h2>
        <p className="session-status">
          {currentUser
            ? currentUser.fullName ?? currentUser.email
            : authConfigured
              ? 'Use the generated owner account.'
              : 'Set AUTH_SECRET before using protected routes.'}
        </p>
      </div>
      {currentUser ? (
        <div className="plan-strip">
          <span className={isPro ? 'plan-badge pro-plan' : 'plan-badge'}>
            {isPro ? 'Pro active' : 'Free plan'}
          </span>
          <span>{subscription?.appealGenerations ?? 0} appeals generated</span>
        </div>
      ) : null}
      {currentUser ? (
        <div className="compact-actions">
          {!isPro ? (
            <button onClick={onCheckout} disabled={loading !== null}>
              {loading === 'checkout' ? 'Opening checkout...' : 'Subscribe $29/mo'}
            </button>
          ) : null}
          <button className="secondary-button" onClick={onSignOut} disabled={loading !== null}>
            {loading === 'auth' ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      ) : (
        <div className="compact-form">
          <label className="field compact-field">
            Email
            <input
              type="email"
              value={userEmail}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="owner@example.com"
            />
          </label>
          <label className="field compact-field">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="change-this-password"
            />
          </label>
          <button onClick={onSignIn} disabled={loading !== null}>
            {loading === 'auth' ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      )}
      {authMessage ? <p className="message error-message">{authMessage}</p> : null}
      {billingMessage ? <p className="message error-message">{billingMessage}</p> : null}
      {checkoutNotice ? <p className="message muted-message">{checkoutNotice}</p> : null}
    </aside>
  );
}

function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
}) {
  return (
    <main className="legal-page">
      <div className="legal-panel">
        <p className="eyebrow">PriorAuthPro</p>
        <h1>{title}</h1>
        <p>{intro}</p>
        <div className="legal-section-list">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
        <div className="legal-links">
          <a href="/">Back to app</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </div>
      </div>
    </main>
  );
}
