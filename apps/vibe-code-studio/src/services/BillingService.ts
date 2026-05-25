import { authService } from './AuthService';

class BillingService {
  async triggerCheckout(): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('You must be logged in to upgrade to Pro.');
    }

    try {
      const res = await fetch('http://localhost:5004/api/billing/checkout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to initialize billing session');
      }

      const data = await res.json();
      if (data.ok && data.url) {
        // Redirect the user to the Stripe Checkout page
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned from backend server');
      }
    } catch (err: any) {
      console.error('[BillingService] Checkout error:', err);
      throw new Error(err.message || 'Billing error');
    }
  }
}

export const billingService = new BillingService();
