import {
  setTenantPlan,
  type FeatureKey,
  type PlanLevel,
} from '@vibetech/monetization';

export const GENERATED_TENANT_ID = 'generated-dental-scheduler-demo';

export const GENERATED_FEATURES = {
  premiumRoute: 'scheduling.automated_slots' as FeatureKey,
  aiAssistant: 'notifications.sms_reminders' as FeatureKey,

  patient_management_dashboard: 'patient_management.dashboard' as FeatureKey,

  scheduling_online_booking: 'scheduling.online_booking' as FeatureKey,

  staff_management_dentist_profiles: 'staff_management.dentist_profiles' as FeatureKey,
} as const satisfies Record<string, FeatureKey>;

const PLAN_LEVELS = ['free', 'starter', 'pro'] as const;

const isPlanLevel = (value: string): value is PlanLevel =>
  (PLAN_LEVELS as readonly string[]).includes(value);

export function resolveGeneratedPlan(value: unknown): PlanLevel {
  return typeof value === 'string' && isPlanLevel(value) ? value : 'free';
}

const DENTAL_FEATURES: Record<PlanLevel, string[]> = {
  free: [
    'scheduling.automated_slots',
    'notifications.sms_reminders',
    'patient_management.dashboard',
  ],
  starter: [
    'scheduling.automated_slots',
    'notifications.sms_reminders',
    'patient_management.dashboard',
    'scheduling.online_booking',
  ],
  pro: [
    'scheduling.automated_slots',
    'notifications.sms_reminders',
    'patient_management.dashboard',
    'scheduling.online_booking',
    'staff_management.dentist_profiles',
  ],
  business: [
    'scheduling.automated_slots',
    'notifications.sms_reminders',
    'patient_management.dashboard',
    'scheduling.online_booking',
    'staff_management.dentist_profiles',
  ],
};

export function hasFeature(plan: PlanLevel, featureKey: FeatureKey): boolean {
  setTenantPlan(GENERATED_TENANT_ID, plan);
  const appFeatures = DENTAL_FEATURES[plan] || [];
  return appFeatures.includes(featureKey as string);
}
