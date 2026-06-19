import { useCallback, useEffect, useMemo, useState } from 'react';
import { GeneratedAuthUser, CmeActivity } from './cmeTypes';

export function useCmeApp() {
  const pathname = window.location.pathname;
  const [authConfigured, setAuthConfigured] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<GeneratedAuthUser | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [proMessage, setProMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<'auth' | 'pro' | 'cme' | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [activities, setActivities] = useState<CmeActivity[]>([]);
  const [formTitle, setFormTitle] = useState('');
  const [formHours, setFormHours] = useState('');
  const [formCategory, setFormCategory] = useState('Category 1 AMA');
  const [formDate, setFormDate] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:5360', []);

  const fetchCmeLogs = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/cme`, { credentials: 'include' });
      const body = await response.json();
      if (response.ok && Array.isArray(body.activities)) setActivities(body.activities);
    } catch {}
  }, [apiBase]);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/auth/me`, { credentials: 'include' });
      const body = (await response.json()) as { configured?: boolean; user?: GeneratedAuthUser | null };
      setAuthConfigured(Boolean(body.configured));
      setCurrentUser(body.user ?? null);

      if (body.user) {
        const proRes = await fetch(`${apiBase}/api/pro`, { credentials: 'include' });
        const proBody = await proRes.json();
        if (proRes.ok) {
          setCurrentPlan(proBody.plan || 'pro');
          await fetchCmeLogs();
        } else {
          setCurrentPlan(proBody.plan || 'free');
        }
      } else {
        setCurrentPlan('free');
        setActivities([]);
      }
    } catch {
      setAuthConfigured(false);
      setCurrentUser(null);
      setCurrentPlan('free');
      setActivities([]);
    }
  }, [apiBase, fetchCmeLogs]);

  useEffect(() => { void refreshSession(); }, [refreshSession]);

  async function signIn() {
    setLoading('auth'); setAuthMessage(null);
    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password }),
      });
      const body = (await response.json()) as { user?: GeneratedAuthUser; error?: string; detail?: string };
      if (!response.ok || !body.user) throw new Error(body.detail ?? body.error ?? 'Unable to sign in');
      setCurrentUser(body.user); setAuthConfigured(true); setPassword('');
      await refreshSession();
    } catch (requestError) {
      setAuthMessage(requestError instanceof Error ? requestError.message : String(requestError));
    } finally { setLoading(null); }
  }

  async function signOut() {
    setLoading('auth'); setAuthMessage(null);
    try {
      await fetch(`${apiBase}/api/auth/logout`, { method: 'POST', credentials: 'include' });
      setCurrentUser(null); await refreshSession();
    } catch (requestError) {
      setAuthMessage(requestError instanceof Error ? requestError.message : String(requestError));
    } finally { setLoading(null); }
  }

  async function checkProRoute() {
    setLoading('pro'); setProMessage(null);
    try {
      const response = await fetch(`${apiBase}/api/pro`, { credentials: 'include' });
      const body = (await response.json()) as { error?: string; feature?: string; plan?: string };
      if (!response.ok || !body.feature) throw new Error(body.error ?? 'Protected route check failed');
      setProMessage(`Protected route is live for the ${body.plan} plan: ${body.feature}.`);
    } catch (requestError) {
      setProMessage(requestError instanceof Error ? requestError.message : String(requestError));
    } finally { setLoading(null); }
  }

  async function startCheckout() {
    setCheckoutLoading(true); setCheckoutError(null);
    try {
      const response = await fetch(`${apiBase}/api/billing/demo-checkout`, { method: 'GET', credentials: 'include' });
      const body = await response.json();
      if (!response.ok || !body.url) throw new Error(body.error ?? body.detail ?? 'Failed to generate checkout session');
      window.location.href = body.url;
    } catch (err) { setCheckoutError(err instanceof Error ? err.message : String(err)); }
    finally { setCheckoutLoading(false); }
  }

  async function logCme(event: React.FormEvent) {
    event.preventDefault(); setFormMessage(null); setLoading('cme');
    const hours = parseFloat(formHours);
    if (isNaN(hours) || hours <= 0) { setFormMessage('Hours must be a valid number greater than 0'); setLoading(null); return; }
    try {
      const response = await fetch(`${apiBase}/api/cme`, {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: formTitle, hours, category: formCategory, date_earned: formDate, provider: formProvider }),
      });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error ?? 'Failed to log CME activity'); }
      setFormTitle(''); setFormHours(''); setFormCategory('Category 1 AMA'); setFormDate(''); setFormProvider('');
      await fetchCmeLogs(); setFormMessage('Activity logged successfully!');
    } catch (err) { setFormMessage(err instanceof Error ? err.message : String(err)); }
    finally { setLoading(null); }
  }

  async function deleteCme(id: number) {
    setFormMessage(null);
    try {
      const response = await fetch(`${apiBase}/api/cme/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error ?? 'Failed to delete CME activity'); }
      await fetchCmeLogs(); setFormMessage('Activity deleted successfully.');
    } catch (err) { setFormMessage(err instanceof Error ? err.message : String(err)); }
  }

  const totalHours = useMemo(() => activities.reduce((sum, act) => sum + act.hours, 0), [activities]);
  const targetHours = 50;
  const progressPercent = Math.min(100, Math.round((totalHours / targetHours) * 100));

  return {
    pathname, authConfigured, userEmail, setUserEmail, password, setPassword,
    currentUser, currentPlan, authMessage, proMessage, loading,
    checkoutLoading, checkoutError, activities, formTitle, setFormTitle,
    formHours, setFormHours, formCategory, setFormCategory, formDate, setFormDate,
    formProvider, setFormProvider, formMessage,
    totalHours, targetHours, progressPercent,
    signIn, signOut, checkProRoute, startCheckout, logCme, deleteCme,
  };
}
