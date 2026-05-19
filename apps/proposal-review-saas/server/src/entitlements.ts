import type { AuthUser } from '@vibetech/auth';
import {
  canAccess,
  type AccessDecision,
  type AccessPolicy,
  type FeatureKey,
  type PlanFeatureMatrix,
} from '@vibetech/entitlements';

export const GENERATED_FEATURES = {
  premiumRoute: 'premium.route',
} as const;

const PLAN_FEATURES = {
  free: [],
  pro: [GENERATED_FEATURES.premiumRoute],
} as const satisfies PlanFeatureMatrix;

const DEFAULT_TIER = Object.keys(PLAN_FEATURES)[0] ?? 'default';

const ACCESS_POLICY = {
  matrix: PLAN_FEATURES,
  features: {
    [GENERATED_FEATURES.premiumRoute]: {
      kind: 'boolean',
      entitlementFeatureKey: GENERATED_FEATURES.premiumRoute,
    },
  },
  failOpenOnServiceDisruption: true,
} as const satisfies AccessPolicy;

export interface ProposalFeatureAccess {
  tier: string;
  decision: AccessDecision;
}

export function resolveFeatureAccess(
  user: AuthUser,
  featureKey: FeatureKey,
  tierHeader: string | string[] | undefined,
): ProposalFeatureAccess {
  const tier = normalizeTier(tierHeader);
  const decision = canAccess(
    {
      id: user.id,
      userId: user.id,
      tier,
      plan: tier,
      attributes: {
        email: user.email,
      },
    },
    featureKey,
    {
      ...ACCESS_POLICY,
      context: {
        environment: getEntitlementEnvironment(),
        appName: 'proposal-review-saas',
      },
    },
  );

  return {
    tier,
    decision,
  };
}

function normalizeTier(value: string | string[] | undefined): string {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const tier = rawValue?.trim();
  return tier && tier.length > 0 ? tier : DEFAULT_TIER;
}

function getEntitlementEnvironment(): 'dev' | 'staging' | 'prod' {
  switch (process.env.NODE_ENV) {
    case 'production':
      return 'prod';
    case 'staging':
      return 'staging';
    default:
      return 'dev';
  }
}
