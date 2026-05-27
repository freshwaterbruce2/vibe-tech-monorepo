import type { AuthUser } from '@vibetech/auth';
import { activateLicense, normalizeLicenseKey } from '@vibetech/billing/client';
import { EntitlementsService, type PlanEntitlementResult } from '@vibetech/entitlements';
import type { TutorPlan } from '../domain/tutoring';

export const VIBE_TUTOR_FEATURES = {
  premiumLessons: 'tutor.premium_lessons',
  unlimitedChat: 'tutor.unlimited_chat',
  parentInsights: 'tutor.parent_insights',
} as const;

export type VibeTutorFeature = (typeof VIBE_TUTOR_FEATURES)[keyof typeof VIBE_TUTOR_FEATURES];

const entitlementService = new EntitlementsService({
  free: [],
  plus: [VIBE_TUTOR_FEATURES.premiumLessons, VIBE_TUTOR_FEATURES.unlimitedChat],
  family: [
    VIBE_TUTOR_FEATURES.premiumLessons,
    VIBE_TUTOR_FEATURES.unlimitedChat,
    VIBE_TUTOR_FEATURES.parentInsights,
  ],
});

export interface MobileEntitlementContext {
  user: AuthUser;
  plan: TutorPlan;
  deviceName: string;
}

export function canUseFeature(
  plan: TutorPlan,
  feature: VibeTutorFeature,
): boolean {
  return entitlementService.hasFeature(plan, feature, {
    environment: 'prod',
    attributes: {
      platform: 'android',
    },
  });
}

export function evaluateMobilePlan(plan: TutorPlan): Record<string, PlanEntitlementResult> {
  return entitlementService.evaluatePlan(plan, {
    environment: 'prod',
    attributes: {
      platform: 'android',
    },
  });
}

export async function activateMobilePass(
  licenseKey: string,
  context: MobileEntitlementContext,
): Promise<TutorPlan> {
  const normalized = normalizeLicenseKey(licenseKey);
  const activation = await activateLicense({
    appId: 'vibe-tutor-mobile',
    licenseKey: normalized,
    deviceName: context.deviceName,
  });

  if (activation.status !== 'active') {
    return context.plan;
  }

  return normalized.includes('FAMILY') ? 'family' : 'plus';
}
