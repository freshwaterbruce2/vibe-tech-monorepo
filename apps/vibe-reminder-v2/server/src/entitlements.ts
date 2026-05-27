import {
  canUseFeature,
  getTenantPlan,
  setTenantPlan,
  type FeatureKey,
  type PlanLevel,
} from '@vibetech/monetization';

export const GENERATED_TENANT_ID = 'generated-saas-demo';

export const GENERATED_FEATURES = {
  premiumRoute: 'analytics.revenue',
  aiAssistant: 'ai.assistant',
} as const satisfies Record<string, FeatureKey>;

const PLAN_LEVELS = ['free', 'starter', 'pro', 'business'] as const;

const isPlanLevel = (value: string): value is PlanLevel =>
  (PLAN_LEVELS as readonly string[]).includes(value);

export function resolveGeneratedPlan(value: unknown): PlanLevel {
  return typeof value === 'string' && isPlanLevel(value) ? value : 'free';
}

export function hasFeature(plan: PlanLevel, featureKey: FeatureKey): boolean {
  setTenantPlan(GENERATED_TENANT_ID, plan);
  return canUseFeature(GENERATED_TENANT_ID, featureKey);
}

export function getGeneratedPlan(): PlanLevel {
  return getTenantPlan(GENERATED_TENANT_ID);
}

