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
