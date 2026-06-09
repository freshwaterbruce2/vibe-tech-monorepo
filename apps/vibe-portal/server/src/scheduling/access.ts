import type { AuthUser } from '@vibetech/auth';
import type { PlanLevel } from '@vibetech/monetization';

import {
  GENERATED_FEATURES,
  hasFeature,
  resolveGeneratedPlan,
} from '../entitlements.js';

interface PreparedGetStatement {
  get(value: string): unknown;
}

export interface SchedulingAccessDatabase {
  prepare(sql: string): PreparedGetStatement;
}

export type SchedulingAccessResult =
  | {
      ok: true;
      tenantId: string;
      plan: PlanLevel;
      user: AuthUser;
    }
  | {
      ok: false;
      statusCode: 401 | 403;
      error: string;
      plan?: PlanLevel;
    };

interface CompanyLookupRow {
  company_id: string | null;
}

interface PlanLookupRow {
  plan_id: string | null;
}

export function resolveSchedulingAccess(
  authUser: AuthUser | null,
  db: SchedulingAccessDatabase,
): SchedulingAccessResult {
  if (!authUser) {
    return {
      ok: false,
      statusCode: 401,
      error: 'Sign in to access scheduling',
    };
  }

  const userRow = db
    .prepare('SELECT company_id FROM users WHERE email = ?')
    .get(authUser.email) as CompanyLookupRow | undefined;

  if (!userRow?.company_id) {
    return {
      ok: false,
      statusCode: 403,
      error: 'Scheduling requires an assigned company',
      plan: resolveGeneratedPlan('free'),
    };
  }

  const companyRow = db
    .prepare('SELECT plan_id FROM companies WHERE id = ?')
    .get(userRow.company_id) as PlanLookupRow | undefined;
  const plan = resolveGeneratedPlan(companyRow?.plan_id);

  if (!hasFeature(plan, GENERATED_FEATURES.schedulingAppointments)) {
    return {
      ok: false,
      statusCode: 403,
      error: 'Upgrade required',
      plan,
    };
  }

  return {
    ok: true,
    tenantId: userRow.company_id,
    plan,
    user: authUser,
  };
}
