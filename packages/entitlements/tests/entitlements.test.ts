import { describe, expect, it, vi } from 'vitest';
import type {
  EvaluationContext,
  EvaluationResult,
  FeatureFlag,
} from '@vibetech/feature-flags-core';
import {
  ENTITLEMENT_FLAG_PREFIX,
  EntitlementsService,
  collectFeatureKeys,
  createEntitlementContext,
  createEntitlementFlagKey,
  createEntitlementFlags,
  hasPlanFeature,
} from '../src/index.js';

const matrix = {
  free: ['invoices.read', 'clients.read'],
  pro: ['invoices.read', 'clients.read', 'billing.portal', 'reports.advanced'],
  team: [
    'invoices.read',
    'clients.read',
    'billing.portal',
    'reports.advanced',
    'seats.manage',
  ],
} as const;

describe('@vibetech/entitlements', () => {
  it('collects unique features across plans', () => {
    expect(collectFeatureKeys(matrix)).toEqual([
      'billing.portal',
      'clients.read',
      'invoices.read',
      'reports.advanced',
      'seats.manage',
    ]);
  });

  it('builds deterministic entitlement flag keys', () => {
    expect(createEntitlementFlagKey('billing.portal')).toBe(
      `${ENTITLEMENT_FLAG_PREFIX}billing.portal`,
    );
  });

  it('creates feature-flag definitions with explicit per-plan rules', () => {
    const flags = createEntitlementFlags(matrix);
    const billingPortal = flags.find((flag) => flag.key === 'entitlement.billing.portal');

    expect(flags).toHaveLength(5);
    expect(billingPortal?.rules).toEqual([
      expect.objectContaining({
        attribute: 'plan',
        operator: 'equals',
        value: 'free',
        returnValue: { enabled: false },
      }),
      expect.objectContaining({
        attribute: 'plan',
        operator: 'equals',
        value: 'pro',
        returnValue: { enabled: true },
      }),
      expect.objectContaining({
        attribute: 'plan',
        operator: 'equals',
        value: 'team',
        returnValue: { enabled: true },
      }),
      expect.objectContaining({
        attribute: 'plan',
        operator: 'not_in_list',
        value: ['free', 'pro', 'team'],
        returnValue: { enabled: false },
      }),
    ]);
  });

  it('can seed missing entitlement flags through a compatible flag service', () => {
    const existing = new Map<string, FeatureFlag>();
    const created: string[] = [];
    const flagService = {
      getFlagByKey: vi.fn((key: string) => existing.get(key) ?? null),
      createFlag: vi.fn((data: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>) => {
        const flag = {
          ...data,
          id: `created-${created.length + 1}`,
          createdAt: '2026-05-15T00:00:00.000Z',
          updatedAt: '2026-05-15T00:00:00.000Z',
        } satisfies FeatureFlag;
        existing.set(flag.key, flag);
        created.push(flag.key);
        return flag;
      }),
    };

    const service = new EntitlementsService(matrix);
    const seeded = service.seedMissingFlags(flagService, { createdBy: 'test-suite' });

    expect(seeded).toHaveLength(5);
    expect(created).toContain('entitlement.billing.portal');
    expect(flagService.createFlag).toHaveBeenCalledTimes(5);
  });

  it('falls back to the static matrix when the evaluation service has no flag', () => {
    const evaluationService = {
      evaluate: vi.fn(
        (_flagKey: string, _context: EvaluationContext): EvaluationResult => ({
          flagKey: 'entitlement.billing.portal',
          enabled: false,
          reason: 'error',
        }),
      ),
    };

    const service = new EntitlementsService(matrix, evaluationService);
    const result = service.evaluateFeature('pro', 'billing.portal', {
      environment: 'dev',
    });

    expect(result).toEqual({
      featureKey: 'billing.portal',
      enabled: true,
      source: 'matrix',
      flagKey: 'entitlement.billing.portal',
    });
  });

  it('uses the evaluation service override when a flag evaluation exists', () => {
    const evaluationService = {
      evaluate: vi.fn(
        (_flagKey: string, context: EvaluationContext): EvaluationResult => ({
          flagKey: 'entitlement.billing.portal',
          enabled: context.attributes?.plan === 'pro',
          reason: 'targeting_rule_match',
        }),
      ),
    };

    const service = new EntitlementsService(matrix, evaluationService);
    const result = service.evaluateFeature('pro', 'billing.portal', {
      environment: 'prod',
      userId: 'user-1',
    });

    expect(result).toEqual({
      featureKey: 'billing.portal',
      enabled: true,
      source: 'flag',
      flagKey: 'entitlement.billing.portal',
      reason: 'targeting_rule_match',
    });
    expect(evaluationService.evaluate).toHaveBeenCalledWith(
      'entitlement.billing.portal',
      expect.objectContaining({
        environment: 'prod',
        userId: 'user-1',
        attributes: { plan: 'pro' },
      }),
    );
  });

  it('evaluates an entire plan', () => {
    const service = new EntitlementsService(matrix);
    const result = service.evaluatePlan('free', { environment: 'staging' }, [
      'clients.read',
      'billing.portal',
    ]);

    expect(result['clients.read']?.enabled).toBe(true);
    expect(result['billing.portal']?.enabled).toBe(false);
  });

  it('creates an entitlement evaluation context with the plan attribute', () => {
    expect(
      createEntitlementContext('team', {
        environment: 'prod',
        attributes: { region: 'us' },
      }),
    ).toEqual({
      environment: 'prod',
      attributes: {
        region: 'us',
        plan: 'team',
      },
    });
  });

  it('exposes direct matrix checks', () => {
    expect(hasPlanFeature(matrix, 'team', 'seats.manage')).toBe(true);
    expect(hasPlanFeature(matrix, 'free', 'seats.manage')).toBe(false);
  });
});
