// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'

import {
  INVOICE_SAAS_FEATURES,
  resolveUserEntitlement,
} from './entitlements.js'

describe('invoice SaaS entitlements', () => {
  afterEach(() => {
    delete process.env['INVOICE_SAAS_DEFAULT_PLAN']
  })

  it('defaults users to the free plan without recurring billing', () => {
    expect(
      resolveUserEntitlement('user-1', INVOICE_SAAS_FEATURES.recurringBilling),
    ).toEqual({
      featureKey: 'recurring.billing',
      plan: 'free',
      enabled: false,
    })
  })

  it('enables recurring billing for paid Pro tenants', () => {
    process.env['INVOICE_SAAS_DEFAULT_PLAN'] = 'pro'

    expect(
      resolveUserEntitlement('user-1', INVOICE_SAAS_FEATURES.recurringBilling),
    ).toEqual({
      featureKey: 'recurring.billing',
      plan: 'pro',
      enabled: true,
    })
  })
})
