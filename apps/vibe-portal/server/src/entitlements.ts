import {
  setTenantPlan,
  type FeatureKey,
  type PlanLevel,
} from '@vibetech/monetization';

export const GENERATED_TENANT_ID = 'generated-client-portal-demo';

export const GENERATED_FEATURES = {
  premiumRoute: 'project.management' as FeatureKey,
  aiAssistant: 'file.sharing' as FeatureKey,

  communication_channels: 'communication.channels' as FeatureKey,

  task_management: 'task.management' as FeatureKey,

  branding_customization: 'branding.customization' as FeatureKey,

  user_roles: 'user.roles' as FeatureKey,

  reporting_analytics: 'reporting.analytics' as FeatureKey,

  api_access: 'api.access' as FeatureKey,

  dedicated_support: 'dedicated.support' as FeatureKey,

  sso_integration: 'sso.integration' as FeatureKey,
} as const satisfies Record<string, FeatureKey>;

const PLAN_LEVELS = ['free', 'starter', 'pro', 'enterprise'] as const;

const isPlanLevel = (value: string): value is PlanLevel =>
  (PLAN_LEVELS as readonly string[]).includes(value);

export function resolveGeneratedPlan(value: unknown): PlanLevel {
  return typeof value === 'string' && isPlanLevel(value) ? value : 'free';
}

const CLIENT_PORTAL_FEATURES: Record<string, string[]> = {
  free: [],
  starter: [
    'project.management',
  ],
  pro: [
    'project.management',
    'file.sharing',
    'communication.channels',
    'task.management',
    'branding.customization',
    'user.roles',
    'reporting.analytics',
  ],
  enterprise: [
    'project.management',
    'file.sharing',
    'communication.channels',
    'task.management',
    'branding.customization',
    'user.roles',
    'reporting.analytics',
    'api.access',
    'dedicated.support',
    'sso.integration',
  ],
};

export function hasFeature(plan: PlanLevel, featureKey: FeatureKey): boolean {
  setTenantPlan(GENERATED_TENANT_ID, plan);
  const appFeatures = CLIENT_PORTAL_FEATURES[plan] || [];
  return appFeatures.includes(featureKey as string);
}

