// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  INVOICE_SAAS_FEATURES,
  resolveUserEntitlement,
} from './entitlements.js'

describe('invoice SaaS entitlements', () => {
  it('keeps recurring billing enabled for legacy users during the first migration step', () => {
    expect(
      resolveUserEntitlement('user-1', INVOICE_SAAS_FEATURES.recurringBilling),
    ).toEqual({
      featureKey: 'recurring.billing',
      plan: 'legacy',
      enabled: true,
    })
  })
})
