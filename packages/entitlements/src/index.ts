/* eslint-disable @nx/enforce-module-boundaries -- nested feature-flags workspace import is a known Nx false positive */
import type {
  EvaluationContext,
  EvaluationResult,
  FeatureFlag,
  FlagValue,
  TargetingRule,
} from '@vibetech/feature-flags-core';

export const ENTITLEMENT_FLAG_PREFIX = 'entitlement.';

export type PlanId = string;
export type FeatureKey = string;
export type PlanFeatureMatrix = Record<PlanId, readonly FeatureKey[]>;

/** Feature access metadata categories supported by the centralized access gate. */
export type AccessFeatureKind = 'boolean' | 'configuration' | 'metered';

/** Application role identifier used by RBAC checks. */
export type AccessRoleKey = string;

/** Numeric usage limit for a plan or tier; null means unlimited. */
export type AccessLimit = number | null;

/** User shape consumed by canAccess without coupling callers to a concrete auth provider. */
export interface AccessUser {
  id?: string;
  userId?: string;
  plan?: PlanId;
  tier?: PlanId;
  roles?: readonly AccessRoleKey[];
  usage?: Partial<Record<FeatureKey, number>>;
  attributes?: Record<string, unknown>;
}

/** Per-feature metadata that combines flag, plan/tier, RBAC, and metered rules. */
export interface AccessFeatureMetadata {
  kind?: AccessFeatureKind;
  flagKey?: string;
  entitlementFeatureKey?: FeatureKey;
  requiredRoles?: readonly AccessRoleKey[];
  requireAllRoles?: boolean;
  tierAccess?: Partial<Record<PlanId, boolean>>;
  tierLimits?: Partial<Record<PlanId, AccessLimit>>;
  defaultLimit?: AccessLimit;
  usageKey?: FeatureKey;
}

/** Synchronous usage provider used for metered access checks. */
export interface AccessUsageServiceLike {
  getUsage(user: AccessUser, featureKey: FeatureKey): number;
}

/** Runtime policy inputs for canAccess. */
export interface AccessPolicy {
  matrix?: PlanFeatureMatrix;
  features?: Partial<Record<FeatureKey, AccessFeatureMetadata>>;
  evaluationService?: FeatureEvaluationServiceLike;
  usageService?: AccessUsageServiceLike;
  context?: Partial<Omit<EntitlementEvaluationContext, 'attributes'>> & {
    attributes?: Record<string, unknown>;
  };
  failOpenOnServiceDisruption?: boolean;
}

/** Machine-readable result from canAccess. */
export interface AccessDecision {
  featureKey: FeatureKey;
  allowed: boolean;
  source: 'configured' | 'flag' | 'matrix' | 'rbac' | 'limit' | 'fail_open';
  reason:
    | 'allowed'
    | 'feature_not_configured'
    | 'missing_tier'
    | 'tier_denied'
    | 'role_denied'
    | 'limit_exceeded'
    | 'flag_denied'
    | 'service_disruption';
  failOpen: boolean;
  flagKey?: string;
  flagReason?: EvaluationResult['reason'];
  requiredRoles?: readonly AccessRoleKey[];
  limit?: number;
  used?: number;
  config?: Record<string, unknown>;
}

export interface EntitlementFlagBuildOptions {
  createdBy?: string;
  tags?: string[];
  descriptionPrefix?: string;
}

export interface EntitlementEvaluationContext
  extends Omit<EvaluationContext, 'attributes'> {
  attributes?: Record<string, unknown> & {
    plan?: PlanId;
  };
}

export interface FeatureFlagServiceLike {
  getFlagByKey(key: string): FeatureFlag | null;
  createFlag(data: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): FeatureFlag;
}

export interface FeatureEvaluationServiceLike {
  evaluate(flagKey: string, context: EvaluationContext): EvaluationResult;
}

export interface PlanEntitlementResult {
  featureKey: FeatureKey;
  enabled: boolean;
  source: 'matrix' | 'flag';
  flagKey: string;
  reason?: EvaluationResult['reason'];
}

const defaultEnabledValue = (): FlagValue => ({
  enabled: true,
});

const toTitleCase = (value: string): string =>
  value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const createEntitlementFlagKey = (featureKey: FeatureKey): string =>
  `${ENTITLEMENT_FLAG_PREFIX}${featureKey}`;

export const collectFeatureKeys = (matrix: PlanFeatureMatrix): FeatureKey[] =>
  Array.from(
    new Set(
      Object.values(matrix)
        .flatMap((features) => [...features])
        .sort(),
    ),
  );

export const getFeaturesForPlan = (
  matrix: PlanFeatureMatrix,
  plan: PlanId,
): FeatureKey[] => [...(matrix[plan] ?? [])];

export const hasPlanFeature = (
  matrix: PlanFeatureMatrix,
  plan: PlanId,
  featureKey: FeatureKey,
): boolean => (matrix[plan] ?? []).includes(featureKey);

export const buildEntitlementRules = (
  matrix: PlanFeatureMatrix,
  featureKey: FeatureKey,
): TargetingRule[] => {
  const plans = Object.keys(matrix).sort();
  const rules = plans.map<TargetingRule>((plan) => ({
    id: `entitlement.${featureKey}.${plan}`,
    attribute: 'plan',
    operator: 'equals',
    value: plan,
    enabled: true,
    returnValue: {
      enabled: hasPlanFeature(matrix, plan, featureKey),
    },
  }));

  rules.push({
    id: `entitlement.${featureKey}.fallback`,
    attribute: 'plan',
    operator: 'not_in_list',
    value: plans,
    enabled: true,
    returnValue: {
      enabled: false,
    },
  });

  return rules;
};

export const createEntitlementFlags = (
  matrix: PlanFeatureMatrix,
  options: EntitlementFlagBuildOptions = {},
): FeatureFlag[] => {
  const createdBy = options.createdBy ?? 'app-factory';
  const tags = ['entitlements', ...(options.tags ?? [])];
  const descriptionPrefix = options.descriptionPrefix ?? 'Plan entitlement for';
  const now = new Date().toISOString();

  return collectFeatureKeys(matrix).map<FeatureFlag>((featureKey) => ({
    id: `entitlement_${featureKey.replace(/[^a-zA-Z0-9]+/g, '_')}`,
    key: createEntitlementFlagKey(featureKey),
    name: `${toTitleCase(featureKey)} entitlement`,
    description: `${descriptionPrefix} ${featureKey}`,
    type: 'boolean',
    enabled: true,
    environments: {
      dev: defaultEnabledValue(),
      staging: defaultEnabledValue(),
      prod: defaultEnabledValue(),
    },
    rules: buildEntitlementRules(matrix, featureKey),
    tags,
    createdAt: now,
    updatedAt: now,
    createdBy,
  }));
};

export const createEntitlementContext = (
  plan: PlanId,
  context: Omit<EntitlementEvaluationContext, 'attributes'> & {
    attributes?: Record<string, unknown>;
  },
): EntitlementEvaluationContext => ({
  ...context,
  attributes: {
    ...(context.attributes ?? {}),
    plan,
  },
});

const getStringAttribute = (
  attributes: Record<string, unknown> | undefined,
  key: string,
): string | undefined => {
  const value = attributes?.[key];
  return typeof value === 'string' ? value : undefined;
};

const getAccessTier = (user: AccessUser): PlanId | undefined =>
  user.tier ??
  user.plan ??
  getStringAttribute(user.attributes, 'tier') ??
  getStringAttribute(user.attributes, 'plan');

const getAccessUserId = (user: AccessUser): string | undefined => user.userId ?? user.id;

const hasRequiredRoles = (
  userRoles: readonly AccessRoleKey[] | undefined,
  requiredRoles: readonly AccessRoleKey[],
  requireAllRoles: boolean,
): boolean => {
  const roles = new Set(userRoles ?? []);
  return requireAllRoles
    ? requiredRoles.every((role) => roles.has(role))
    : requiredRoles.some((role) => roles.has(role));
};

const resolveFeatureLimit = (
  metadata: AccessFeatureMetadata | undefined,
  tier: PlanId | undefined,
): AccessLimit | undefined => {
  if (!metadata) {
    return undefined;
  }

  if (tier) {
    const tierLimit = metadata.tierLimits?.[tier];
    if (tierLimit !== undefined) {
      return tierLimit;
    }
  }

  return metadata.defaultLimit;
};

const createAccessEvaluationContext = (
  user: AccessUser,
  tier: PlanId | undefined,
  policy: AccessPolicy,
): EvaluationContext => ({
  environment: policy.context?.environment ?? 'prod',
  userId: policy.context?.userId ?? getAccessUserId(user),
  sessionId: policy.context?.sessionId,
  appName: policy.context?.appName,
  appVersion: policy.context?.appVersion,
  attributes: {
    ...(user.attributes ?? {}),
    ...(policy.context?.attributes ?? {}),
    ...(tier ? { plan: tier, tier } : {}),
  },
});

const denyAccess = (
  featureKey: FeatureKey,
  reason: AccessDecision['reason'],
  source: AccessDecision['source'],
  details: Omit<
    Partial<AccessDecision>,
    'allowed' | 'failOpen' | 'featureKey' | 'reason' | 'source'
  > = {},
): AccessDecision => ({
  featureKey,
  allowed: false,
  source,
  reason,
  failOpen: false,
  ...details,
});

const allowAccess = (
  featureKey: FeatureKey,
  details: Omit<
    Partial<AccessDecision>,
    'allowed' | 'failOpen' | 'featureKey' | 'reason'
  > = {},
): AccessDecision => ({
  featureKey,
  allowed: true,
  source: details.source ?? 'configured',
  reason: 'allowed',
  failOpen: false,
  ...details,
});

const serviceDisruptionDecision = (
  featureKey: FeatureKey,
  failOpen: boolean,
  details: Omit<
    Partial<AccessDecision>,
    'allowed' | 'failOpen' | 'featureKey' | 'reason' | 'source'
  > = {},
): AccessDecision =>
  failOpen
    ? {
        featureKey,
        allowed: true,
        source: 'fail_open',
        reason: 'service_disruption',
        failOpen: true,
        ...details,
      }
    : denyAccess(featureKey, 'service_disruption', 'fail_open', details);

/**
 * Evaluates whether a user can access a feature by combining RBAC, plan/tier
 * entitlements, metered limits, and feature-flag gates.
 */
export const canAccess = (
  user: AccessUser,
  featureKey: FeatureKey,
  policy: AccessPolicy = {},
): AccessDecision => {
  const metadata = policy.features?.[featureKey];
  const entitlementFeatureKey = metadata?.entitlementFeatureKey ?? featureKey;
  const flagKey = metadata?.flagKey ?? createEntitlementFlagKey(entitlementFeatureKey);
  const tier = getAccessTier(user);
  const failOpen = policy.failOpenOnServiceDisruption ?? true;
  const hasConfiguredFeature = Boolean(
    metadata ?? policy.matrix ?? policy.evaluationService,
  );

  if (!hasConfiguredFeature) {
    return denyAccess(featureKey, 'feature_not_configured', 'configured');
  }

  const requiredRoles = metadata?.requiredRoles ?? [];
  if (
    requiredRoles.length > 0 &&
    !hasRequiredRoles(user.roles, requiredRoles, metadata?.requireAllRoles ?? false)
  ) {
    return denyAccess(featureKey, 'role_denied', 'rbac', { requiredRoles });
  }

  if (metadata?.tierAccess) {
    if (!tier) {
      return denyAccess(featureKey, 'missing_tier', 'configured');
    }

    if (metadata.tierAccess[tier] !== true) {
      return denyAccess(featureKey, 'tier_denied', 'configured');
    }
  }

  if (policy.matrix) {
    if (!tier) {
      return denyAccess(featureKey, 'missing_tier', 'matrix');
    }

    if (!hasPlanFeature(policy.matrix, tier, entitlementFeatureKey)) {
      return denyAccess(featureKey, 'tier_denied', 'matrix');
    }
  }

  const limit = resolveFeatureLimit(metadata, tier);
  if (metadata?.kind === 'metered' || limit !== undefined) {
    if (!tier) {
      return denyAccess(featureKey, 'missing_tier', 'limit');
    }

    if (limit !== undefined && limit !== null) {
      const usageKey = metadata?.usageKey ?? entitlementFeatureKey;
      let used: number;

      try {
        used = policy.usageService?.getUsage(user, usageKey) ?? user.usage?.[usageKey] ?? 0;
      } catch {
        return serviceDisruptionDecision(featureKey, failOpen, {
          flagKey,
          limit,
        });
      }

      if (used >= limit) {
        return denyAccess(featureKey, 'limit_exceeded', 'limit', {
          limit,
          used,
        });
      }
    }
  }

  if (policy.evaluationService) {
    let evaluation: EvaluationResult;

    try {
      evaluation = policy.evaluationService.evaluate(
        flagKey,
        createAccessEvaluationContext(user, tier, policy),
      );
    } catch {
      return serviceDisruptionDecision(featureKey, failOpen, { flagKey });
    }

    if (evaluation.reason === 'error') {
      return serviceDisruptionDecision(featureKey, failOpen, {
        flagKey,
        flagReason: evaluation.reason,
      });
    }

    if (!evaluation.enabled) {
      return denyAccess(featureKey, 'flag_denied', 'flag', {
        flagKey,
        flagReason: evaluation.reason,
      });
    }

    return allowAccess(featureKey, {
      source: 'flag',
      flagKey,
      flagReason: evaluation.reason,
      config: evaluation.payload,
    });
  }

  return allowAccess(featureKey, { source: policy.matrix ? 'matrix' : 'configured' });
};

export class EntitlementsService {
  private readonly matrix: PlanFeatureMatrix;
  private readonly evaluationService?: FeatureEvaluationServiceLike;

  constructor(
    matrix: PlanFeatureMatrix,
    evaluationService?: FeatureEvaluationServiceLike,
  ) {
    this.matrix = matrix;
    this.evaluationService = evaluationService;
  }

  getPlans(): PlanId[] {
    return Object.keys(this.matrix).sort();
  }

  getFeaturesForPlan(plan: PlanId): FeatureKey[] {
    return getFeaturesForPlan(this.matrix, plan);
  }

  seedMissingFlags(
    flagService: FeatureFlagServiceLike,
    options: EntitlementFlagBuildOptions = {},
  ): FeatureFlag[] {
    const created: FeatureFlag[] = [];
    for (const flag of createEntitlementFlags(this.matrix, options)) {
      if (flagService.getFlagByKey(flag.key)) {
        continue;
      }
      created.push(
        flagService.createFlag({
          key: flag.key,
          name: flag.name,
          description: flag.description,
          type: flag.type,
          enabled: flag.enabled,
          environments: flag.environments,
          rules: flag.rules,
          killSwitch: flag.killSwitch,
          variants: flag.variants,
          tags: flag.tags,
          createdBy: flag.createdBy,
        }),
      );
    }
    return created;
  }

  evaluateFeature(
    plan: PlanId,
    featureKey: FeatureKey,
    context: Omit<EntitlementEvaluationContext, 'attributes'> & {
      attributes?: Record<string, unknown>;
    },
  ): PlanEntitlementResult {
    const flagKey = createEntitlementFlagKey(featureKey);

    if (this.evaluationService) {
      const evaluation = this.evaluationService.evaluate(
        flagKey,
        createEntitlementContext(plan, context),
      );
      if (evaluation.reason !== 'error') {
        return {
          featureKey,
          enabled: evaluation.enabled,
          source: 'flag',
          flagKey,
          reason: evaluation.reason,
        };
      }
    }

    return {
      featureKey,
      enabled: hasPlanFeature(this.matrix, plan, featureKey),
      source: 'matrix',
      flagKey,
    };
  }

  hasFeature(
    plan: PlanId,
    featureKey: FeatureKey,
    context: Omit<EntitlementEvaluationContext, 'attributes'> & {
      attributes?: Record<string, unknown>;
    },
  ): boolean {
    return this.evaluateFeature(plan, featureKey, context).enabled;
  }

  evaluatePlan(
    plan: PlanId,
    context: Omit<EntitlementEvaluationContext, 'attributes'> & {
      attributes?: Record<string, unknown>;
    },
    featureKeys: readonly FeatureKey[] = collectFeatureKeys(this.matrix),
  ): Record<FeatureKey, PlanEntitlementResult> {
    return Object.fromEntries(
      featureKeys.map((featureKey) => [
        featureKey,
        this.evaluateFeature(plan, featureKey, context),
      ]),
    );
  }
}
