import { isTauri } from '@tauri-apps/api/core';
import { backendBaseUrl } from './AIUsageMode';

export interface BillingStatus {
  ok: boolean;
  plan: string;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  managedAI: {
    available: boolean;
    configured: boolean;
    limit: number;
    used: number;
    remaining: number;
    resetsAt: string | null;
    models: string[];
    maxTokens: number;
  };
  checkoutAvailable: boolean;
  portalAvailable: boolean;
}

class BillingService {
  private async request<T>(path: string, method = 'GET'): Promise<T> {
    const response = await fetch(`${backendBaseUrl}/api/billing/${path}`, {
      method,
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Billing is unavailable. Please try again.');
    }
    return data as T;
  }

  getStatus(): Promise<BillingStatus> {
    return this.request<BillingStatus>('status');
  }

  private async openSession(path: 'checkout' | 'portal'): Promise<void> {
    const data = await this.request<{ ok: boolean; url: string }>(path, 'POST');
    const url = new URL(data.url);
    const expectedHost = path === 'checkout' ? 'checkout.stripe.com' : 'billing.stripe.com';
    if (url.protocol !== 'https:' || url.hostname !== expectedHost) {
      throw new Error('The billing service returned an invalid payment link.');
    }
    if (isTauri()) {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url.href);
    } else if (!window.open(url.href, '_blank')) {
      throw new Error('Allow pop-ups to open the secure billing page, then try again.');
    }
  }

  triggerCheckout(): Promise<void> {
    return this.openSession('checkout');
  }
  openPortal(): Promise<void> {
    return this.openSession('portal');
  }
}

export const billingService = new BillingService();
