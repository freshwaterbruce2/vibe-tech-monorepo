import {
  canUseFeature,
  setTenantPlan,
  type FeatureKey,
  type PlanLevel,
} from '@vibetech/monetization';

export const GENERATED_TENANT_ID = 'generated-monetized-mcp-service-demo';

export const GENERATED_FEATURES = {
  premiumRoute: 'analytics.revenue' as FeatureKey,
  aiAssistant: 'ai.assistant' as FeatureKey,
} as const satisfies Record<string, FeatureKey>;

const PLAN_LEVELS = ['free', 'pro'] as const;

const isPlanLevel = (value: string): value is PlanLevel =>
  (PLAN_LEVELS as readonly string[]).includes(value);

export function resolveGeneratedPlan(value: unknown): PlanLevel {
  return typeof value === 'string' && isPlanLevel(value) ? value : 'free';
}

export function hasFeature(plan: PlanLevel, featureKey: FeatureKey): boolean {
  setTenantPlan(GENERATED_TENANT_ID, plan);
  return canUseFeature(GENERATED_TENANT_ID, featureKey);
}
