import { describe, expect, it } from 'vitest';

import {
  resolveSchedulingAccess,
  type SchedulingAccessDatabase,
} from '../server/src/scheduling/access.js';

function createAccessDb(planId: string | null, companyId = 'company-a'): SchedulingAccessDatabase {
  return {
    prepare(sql: string) {
      return {
        get(value: string) {
          if (sql.includes('FROM users')) {
            return value === 'owner@example.com' ? { company_id: companyId } : undefined;
          }

          if (sql.includes('FROM companies')) {
            return value === companyId && planId ? { plan_id: planId } : undefined;
          }

          return undefined;
        },
      };
    },
  };
}

describe('resolveSchedulingAccess', () => {
  it('rejects anonymous scheduling requests', () => {
    const access = resolveSchedulingAccess(null, createAccessDb('starter'));

    expect(access.ok).toBe(false);
    expect(access.statusCode).toBe(401);
  });

  it('uses the authenticated user company id as the scheduling tenant id', () => {
    const access = resolveSchedulingAccess(
      { id: 'generated-owner', email: 'owner@example.com' },
      createAccessDb('starter', 'tenant-company-1'),
    );

    expect(access.ok).toBe(true);
    if (access.ok) {
      expect(access.tenantId).toBe('tenant-company-1');
      expect(access.plan).toBe('starter');
    }
  });

  it('rejects free-plan users for paid scheduling actions', () => {
    const access = resolveSchedulingAccess(
      { id: 'generated-owner', email: 'owner@example.com' },
      createAccessDb('free'),
    );

    expect(access.ok).toBe(false);
    expect(access.statusCode).toBe(403);
  });
});
