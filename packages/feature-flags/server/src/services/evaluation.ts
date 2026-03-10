import type {
  FeatureFlag,
  EvaluationContext,
  EvaluationResult,
  EvaluationReason,
  TargetingRule,
} from '@dev/feature-flags-core';
import { isInPercentageRollout, assignVariant } from '@dev/feature-flags-core';
import { FlagService } from './flag-service.js';

export class EvaluationService {
  private flagService: FlagService;

  constructor(flagService: FlagService) {
    this.flagService = flagService;
  }

  evaluate(flagKey: string, context: EvaluationContext): EvaluationResult {
    const flag = this.flagService.getFlagByKey(flagKey);

    if (!flag) {
      return {
        flagKey,
        enabled: false,
        reason: 'error' as EvaluationReason,
      };
    }

    return this.evaluateFlag(flag, context);
  }

  evaluateMultiple(
    flagKeys: string[],
    context: EvaluationContext
  ): Record<string, EvaluationResult> {
    const results: Record<string, EvaluationResult> = {};

    for (const key of flagKeys) {
      results[key] = this.evaluate(key, context);
    }

    return results;
  }

  evaluateAll(context: EvaluationContext): Record<string, EvaluationResult> {
    const flags = this.flagService.getAllFlags();
    const results: Record<string, EvaluationResult> = {};

    for (const flag of flags) {
      results[flag.key] = this.evaluateFlag(flag, context);
    }

    return results;
  }

  private evaluateFlag(flag: FeatureFlag, context: EvaluationContext): EvaluationResult {
    // Kill switch - always check first
    if (flag.type === 'kill_switch') {
      return {
        flagKey: flag.key,
        enabled: flag.enabled,
        reason: flag.enabled ? 'kill_switch_active' : 'default_value',
      };
    }

    // Global disabled
    if (!flag.enabled) {
      return {
        flagKey: flag.key,
        enabled: false,
        reason: 'flag_disabled',
      };
    }

    // Environment-specific value
    const envValue = flag.environments[context.environment];
    if (!envValue?.enabled) {
      return {
        flagKey: flag.key,
        enabled: false,
        reason: 'flag_disabled',
      };
    }

    // Check targeting rules
    for (const rule of flag.rules || []) {
      if (!rule.enabled) continue;

      if (this.evaluateRule(rule, context)) {
        return {
          flagKey: flag.key,
          enabled: rule.returnValue?.enabled ?? true,
          reason: 'targeting_rule_match',
          ruleId: rule.id,
        };
      }
    }

    // Percentage rollout
    if ('percentage' in envValue && typeof envValue.percentage === 'number') {
      const identifier = context.userId ?? context.sessionId ?? 'anonymous';
      const inRollout = isInPercentageRollout(identifier, flag.key, envValue.percentage);

      return {
        flagKey: flag.key,
        enabled: inRollout,
        reason: 'percentage_rollout',
      };
    }

    // Variant assignment
    if (flag.variants && flag.variants.length > 0) {
      const identifier = context.userId ?? context.sessionId ?? 'anonymous';
      const variantKey = assignVariant(identifier, flag.key, flag.variants);
      const variant = flag.variants.find((v) => v.key === variantKey);

      return {
        flagKey: flag.key,
        enabled: true,
        variant: variantKey,
        payload: variant?.payload,
        reason: 'variant_assignment',
      };
    }

    // Default enabled
    return {
      flagKey: flag.key,
      enabled: true,
      reason: 'default_value',
    };
  }

  private evaluateRule(rule: TargetingRule, context: EvaluationContext): boolean {
    const attrValue = this.getAttributeValue(rule.attribute, context);

    switch (rule.operator) {
      case 'equals':
        return attrValue === rule.value;
      case 'not_equals':
        return attrValue !== rule.value;
      case 'contains':
        return String(attrValue).includes(String(rule.value));
      case 'not_contains':
        return !String(attrValue).includes(String(rule.value));
      case 'in_list':
        return Array.isArray(rule.value) && rule.value.includes(attrValue);
      case 'not_in_list':
        return Array.isArray(rule.value) && !rule.value.includes(attrValue);
      case 'percentage':
        const id = context.userId ?? context.sessionId ?? 'anonymous';
        return isInPercentageRollout(id, rule.id, Number(rule.value));
      default:
        return false;
    }
  }

  private getAttributeValue(attribute: string, context: EvaluationContext): unknown {
    switch (attribute) {
      case 'userId':
        return context.userId;
      case 'sessionId':
        return context.sessionId;
      case 'environment':
        return context.environment;
      case 'appName':
        return context.appName;
      case 'appVersion':
        return context.appVersion;
      default:
        return context.attributes?.[attribute];
    }
  }
}