import { describe, expect, it, beforeEach } from 'vitest';

import {
  PlanRequiredError,
  canUseFeature,
  currentTenantId,
  requirePlan,
  resetUsage,
  runWithTenant,
  setTenantPlan,
  trackUsage,
} from './monetization';

describe('@vibetech/monetization', () => {
  beforeEach(() => {
    resetUsage();
    setTenantPlan('default', 'free');
  });

  it('defaults tenants to the free plan with a three invoice monthly limit', () => {
    expect(canUseFeature('tenant-free', 'invoices.create')).toBe(true);
    expect(trackUsage('tenant-free', 'invoices.created')).toMatchObject({
      used: 1,
      limit: 3,
      allowed: true,
    });
    trackUsage('tenant-free', 'invoices.created');
    trackUsage('tenant-free', 'invoices.created');
    expect(trackUsage('tenant-free', 'invoices.created')).toMatchObject({
      used: 4,
      limit: 3,
      allowed: false,
    });
  });

  it('unlocks unlimited invoices for paid plans', () => {
    setTenantPlan('tenant-pro', 'pro');

    expect(canUseFeature('tenant-pro', 'invoices.unlimited')).toBe(true);
    expect(trackUsage('tenant-pro', 'invoices.created', 100)).toMatchObject({
      limit: null,
      allowed: true,
    });
  });

  it('supports tenant context for background work', () => {
    setTenantPlan('tenant-business', 'business');

    const result = runWithTenant('tenant-business', () => ({
      tenantId: currentTenantId(),
      canUseAi: canUseFeature('ai.assistant'),
    }));

    expect(result).toEqual({
      tenantId: 'tenant-business',
      canUseAi: true,
    });
  });

  it('throws a typed error when a tenant needs a higher plan', () => {
    expect(() => requirePlan('tenant-free', 'starter')).toThrow(PlanRequiredError);
  });
});
