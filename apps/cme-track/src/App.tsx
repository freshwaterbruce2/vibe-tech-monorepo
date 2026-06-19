import { LandingPage, LegalPage } from '@vibetech/landing';
import { content } from './cmeTypes';
import { useCmeApp } from './useCmeApp';

export function App() {
  const hook = useCmeApp();
  const {
    pathname, authConfigured, userEmail, setUserEmail, password, setPassword,
    currentUser, currentPlan, authMessage, proMessage, loading,
    checkoutLoading, checkoutError, activities, formTitle, setFormTitle,
    formHours, setFormHours, formCategory, setFormCategory, formDate, setFormDate,
    formProvider, setFormProvider, formMessage,
    totalHours, targetHours, progressPercent,
    signIn, signOut, checkProRoute, startCheckout, logCme, deleteCme,
  } = hook;

  if (pathname === '/billing/success') {
    return (
      <main style={{ minHeight: '100vh', padding: '48px 24px', background: '#08111f', color: '#f5f7fb', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '500px', width: '100%', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', background: 'rgba(15,23,42,0.82)', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h1 style={{ margin: '0 0 16px', fontSize: '32px' }}>Upgrade Successful!</h1>
          <p style={{ margin: '0 0 24px', color: '#b7c3d6', lineHeight: 1.6 }}>Thank you for upgrading to CME Track Pro. Your credit logging and visual target trackers are now fully active!</p>
          <button onClick={() => { window.location.href = '/'; }} style={{ width: '100%' }}>Go to Dashboard</button>
        </div>
      </main>
    );
  }

  if (pathname === '/billing/canceled') {
    return (
      <main style={{ minHeight: '100vh', padding: '48px 24px', background: '#08111f', color: '#f5f7fb', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '500px', width: '100%', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', background: 'rgba(15,23,42,0.82)', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h1 style={{ margin: '0 0 16px', fontSize: '32px' }}>Checkout Canceled</h1>
          <p style={{ margin: '0 0 24px', color: '#b7c3d6', lineHeight: 1.6 }}>The checkout session was canceled. No charges were made.</p>
          <button onClick={() => { window.location.href = '/'; }} className="secondary-button" style={{ width: '100%' }}>Return to Dashboard</button>
        </div>
      </main>
    );
  }

  if (pathname === '/terms') {
    return <LegalPage title="Terms of service" intro="This SaaS app includes terms of service for CME Track client portal." sections={[
      { heading: 'Use of the service', body: 'Use the CME Track portal to log your credit hours, track target progress, and manage certification audits.' },
      { heading: 'Billing', body: 'CME tracking logs are gated behind the $9/mo Pro tier subscription, powered by Stripe billing integrations.' },
      { heading: 'Acceptable use', body: 'Do not upload incorrect or fraudulent certification logs to the CME Track database.' },
    ]} />;
  }

  if (pathname === '/privacy') {
    return <LegalPage title="Privacy policy" intro="This privacy policy details how CME Track handles credit logs and account data." sections={[
      { heading: 'Data collection', body: 'We collect your email, logged CME credits, hours, category information, and provider details.' },
      { heading: 'Payments', body: 'Checkout details and subscription cycles are securely processed through Stripe. Card data never touches our servers.' },
      { heading: 'Data retention', body: 'CME credit logs are retained for auditing purposes and are deleted only upon user request.' },
    ]} />;
  }

  return (
    <main>
      <LandingPage content={content} />
      <section className="page auth-grid">
        <article className="grid-card">
          <div className="eyebrow">Generated auth</div>
          <h2>{currentUser ? 'Signed in' : authConfigured ? 'Sign in required' : 'Auth not configured'}</h2>
          <p>{currentUser ? `Session active for ${currentUser.fullName ?? currentUser.email}.` : authConfigured ? 'Use the generated operator account to unlock the CME credits dashboard.' : 'Set AUTH_SECRET and the DEMO_USER_* values in .env before using the starter login flow.'}</p>
          {authMessage ? <p className="message">{authMessage}</p> : null}
        </article>

        <article className="grid-card auth-form-card">
          <div className="eyebrow">Operator account</div>
          {currentUser ? (
            <button className="secondary-button" onClick={() => void signOut()} disabled={loading !== null}>
              {loading === 'auth' ? 'Signing out...' : 'Sign out'}
            </button>
          ) : (
            <>
              <label className="field">Email <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="owner@example.com" /></label>
              <label className="field">Password <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="change-this-password" /></label>
              <button onClick={() => void signIn()} disabled={loading !== null}>{loading === 'auth' ? 'Signing in...' : 'Sign in for pro access'}</button>
            </>
          )}
        </article>

        <article className="grid-card">
          <div className="eyebrow">Pro route</div>
          <h2>/api/pro</h2>
          <p>The CME Track scaffold includes a secure entitlement endpoint.</p>
          <button className="secondary-button" onClick={() => void checkProRoute()} disabled={loading !== null}>
            {loading === 'pro' ? 'Checking route...' : 'Check protected pro route'}
          </button>
          {proMessage && (
            <div style={{ marginTop: '12px' }}>
              <p className="message" style={{ color: proMessage.toLowerCase().includes('upgrade') ? '#f59e0b' : '#22d3ee', fontSize: '15px' }}>{proMessage}</p>
              {proMessage.toLowerCase().includes('upgrade') && currentPlan === 'free' && (
                <button onClick={() => void startCheckout()} disabled={checkoutLoading} style={{ marginTop: '12px', width: '100%' }}>
                  {checkoutLoading ? 'Redirecting...' : 'Upgrade Now ($9/mo)'}
                </button>
              )}
            </div>
          )}
        </article>

        {currentUser && (
          <article className="grid-card">
            <div className="eyebrow">Subscription & Billing</div>
            <h2>Plan: <span style={{ color: currentPlan === 'pro' ? '#10b981' : '#f59e0b', textTransform: 'uppercase' }}>{currentPlan}</span></h2>
            <p>{currentPlan === 'pro' ? 'Thank you for upgrading! You have unlocked unlimited credit log access and progress trackers.' : 'Upgrade to CME Track Pro ($9/mo) to unlock logging forms and visual credit status meters.'}</p>
            {currentPlan === 'free' ? (
              <button onClick={() => void startCheckout()} disabled={checkoutLoading} style={{ width: '100%', marginTop: '8px' }}>
                {checkoutLoading ? 'Redirecting to Stripe...' : 'Upgrade to Pro ($9/mo)'}
              </button>
            ) : (
              <div style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>✓ Pro features activated</div>
            )}
            {checkoutError && <p className="message" style={{ color: '#ef4444', marginTop: '8px' }}>{checkoutError}</p>}
          </article>
        )}
      </section>

      {currentUser && currentPlan === 'pro' && (
        <section className="page" style={{ paddingTop: '24px' }}>
          <div style={{ display: 'grid', gap: '24px' }}>
            <article className="grid-card">
              <div className="eyebrow">CME Progress Tracker</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <h2>{totalHours} / {targetHours} Credit Hours Earned</h2>
              </div>
              <div style={{ height: 8, background: '#1e293b', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPercent}%`, background: '#22d3ee' }} />
              </div>
            </article>

            <article className="grid-card">
              <div className="eyebrow">Log New CME Activity</div>
              <form onSubmit={logCme} style={{ display: 'grid', gap: 12 }}>
                <input placeholder="Activity title" value={formTitle} onChange={e => setFormTitle(e.target.value)} required />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input type="number" step="0.25" placeholder="Hours" value={formHours} onChange={e => setFormHours(e.target.value)} required />
                  <select value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                    <option>Category 1 AMA</option><option>Category 2</option><option>Other</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required />
                  <input placeholder="Provider / Organization" value={formProvider} onChange={e => setFormProvider(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading !== null}>{loading === 'cme' ? 'Saving...' : 'Log Activity'}</button>
                {formMessage && <p className="message">{formMessage}</p>}
              </form>
            </article>

            <article className="grid-card">
              <div className="eyebrow">Recent Activity Log ({activities.length})</div>
              {activities.length === 0 ? <p>No activities yet.</p> : (
                <table style={{ width: '100%', fontSize: 13 }}>
                  <thead><tr><th>Title</th><th>Hours</th><th>Category</th><th>Date</th><th>Provider</th><th /></tr></thead>
                  <tbody>
                    {activities.map(a => (
                      <tr key={a.id}>
                        <td>{a.title}</td><td>{a.hours}</td><td>{a.category}</td><td>{a.date_earned}</td><td>{a.provider}</td>
                        <td><button onClick={() => deleteCme(a.id)} style={{ color: '#f87171' }}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>
          </div>
        </section>
      )}
    </main>
  );
}
