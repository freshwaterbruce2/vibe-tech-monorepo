// @vitest-environment node
import { Resend } from 'resend'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getResend', () => {
  it('throws when RESEND_API_KEY is not set', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const { default: getResend } = await import('./resend.js')
    expect(() => getResend()).toThrow('RESEND_API_KEY is not set')
  })

  it('returns a Resend instance when the env var is set', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_dummy_for_unit_tests')
    const { default: getResend } = await import('./resend.js')
    const client = getResend()
    expect(client).toBeInstanceOf(Resend)
  })

  it('returns the same singleton on subsequent calls', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_dummy_for_unit_tests')
    const { default: getResend } = await import('./resend.js')
    const a = getResend()
    const b = getResend()
    expect(a).toBe(b)
  })
})
