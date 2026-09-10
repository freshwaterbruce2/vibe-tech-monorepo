import { useCallback, useEffect, useState } from 'react';
import {
  activeAIUsageMode,
  getSavedAIUsageMode,
  saveAIUsageMode,
} from '../../services/AIUsageMode';
import type { AIUsageMode } from '../../services/AIUsageMode';
import { authService } from '../../services/AuthService';
import { billingService } from '../../services/BillingService';
import type { BillingStatus } from '../../services/BillingService';
import { AuthModal } from '../AuthModal';
import { Button, Select, SettingItem, SettingLabel, SettingControl } from '../Settings.styles';

export function AIPlanSection({ isOpen }: { isOpen: boolean }) {
  const [user, setUser] = useState(authService.getCurrentUser());
  const [mode, setMode] = useState(getSavedAIUsageMode);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  useEffect(() => authService.subscribe(setUser), []);

  const refresh = useCallback(async () => {
    setError('');
    setBusy(true);
    setStatus(null);
    try {
      const result = await billingService.getStatus();
      setStatus(result);
      window.dispatchEvent(new CustomEvent('subscriptionStatusUpdated', { detail: result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load billing.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    setStatus(null);
    if (user && isOpen) void refresh();
  }, [user, isOpen, refresh]);

  const billingAction = async (action: 'checkout' | 'portal') => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (action === 'checkout') await billingService.triggerCheckout();
      else await billingService.openPortal();
      setNotice(
        'Billing opened in your browser. After finishing, refresh your subscription status here.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open billing.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16, color: '#cbd5e1' }}>
      <p style={{ margin: 0 }}>
        Bring your own OpenRouter key and pay your provider directly, or subscribe for an included
        AI allowance. Your personal key is never a backup payment method for subscription usage.
      </p>
      <SettingItem>
        <SettingLabel htmlFor="ai-usage-mode">
          AI payment option<span>Saved immediately; applies the next time you launch the app.</span>
        </SettingLabel>
        <SettingControl>
          <Select
            id="ai-usage-mode"
            value={mode}
            onChange={async event => {
              const next = event.target.value as AIUsageMode;
              try {
                await saveAIUsageMode(next);
                setMode(next);
                setError('');
              } catch {
                setError(
                  'Could not save your AI payment option. Your current option is unchanged.'
                );
              }
            }}
          >
            <option value="byok">Bring my own key</option>
            <option value="subscription">Subscription AI</option>
          </Select>
        </SettingControl>
      </SettingItem>
      <p role="status" style={{ margin: 0 }}>
        Current session: {activeAIUsageMode === 'byok' ? 'Bring my own key' : 'Subscription AI'}.
        {mode !== activeAIUsageMode &&
          ' Change saved. Save your work and reopen the app to use the new option.'}
      </p>
      {mode === 'byok' && (
        <p style={{ margin: 0 }}>
          Add your OpenRouter key below. A subscription is optional. Provider charges are separate
          from any app subscription.
        </p>
      )}
      {mode === 'subscription' && (
        <p style={{ margin: 0 }}>
          Subscription AI requires a signed-in account and an active subscription. If the allowance
          runs out, AI requests stop until it resets or you explicitly switch to your own key.
        </p>
      )}
      {user ? (
        <>
          <div>Signed in as {user.email}</div>
          {status && (
            <>
              <div>Subscription: {status.subscription?.status ?? 'No subscription'}</div>
              {!status.managedAI.configured && (
                <p role="status">
                  Subscription AI is not available yet. Checkout will open when the service is
                  configured.
                </p>
              )}
              {status.managedAI.configured && (
                <>
                  <div>
                    Included AI requests: {status.managedAI.used} used of {status.managedAI.limit};{' '}
                    {status.managedAI.remaining} remaining.
                  </div>
                  {status.managedAI.resetsAt && (
                    <div>
                      Allowance resets: {new Date(status.managedAI.resetsAt).toLocaleDateString()}
                    </div>
                  )}
                  <div>
                    Included models: {status.managedAI.models.join(', ') || 'No models available'}.
                    Select one in AI Model above.
                  </div>
                  {!status.managedAI.available && (
                    <p>
                      Subscription AI is currently unavailable for this account. Review your
                      subscription and remaining allowance.
                    </p>
                  )}
                </>
              )}
              {status.subscription?.cancelAtPeriodEnd && (
                <div>
                  Cancellation scheduled
                  {status.subscription.currentPeriodEnd
                    ? ` for ${new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}`
                    : ''}
                  . Manage billing to review details.
                </div>
              )}
              {status.checkoutAvailable && (
                <Button
                  disabled={busy}
                  $variant="primary"
                  onClick={() => void billingAction('checkout')}
                >
                  View subscription checkout
                </Button>
              )}
              {status.portalAvailable && (
                <Button disabled={busy} onClick={() => void billingAction('portal')}>
                  Manage billing or cancel
                </Button>
              )}
            </>
          )}
          <Button disabled={busy} onClick={() => void refresh()}>
            {busy ? 'Loading…' : 'Refresh subscription status'}
          </Button>
          <Button disabled={busy} onClick={() => void authService.logout()}>
            Sign out
          </Button>
        </>
      ) : (
        <Button onClick={() => setShowAuth(true)}>Sign in or create a subscription account</Button>
      )}
      {error && <div role="alert">{error}</div>}
      {notice && <div role="status">{notice}</div>}
      {showAuth && !user && <AuthModal initialMode="login" onClose={() => setShowAuth(false)} />}
    </div>
  );
}
