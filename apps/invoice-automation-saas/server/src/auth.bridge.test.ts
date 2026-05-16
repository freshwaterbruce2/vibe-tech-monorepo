// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const authFns = vi.hoisted(() => ({
  createSessionToken: vi.fn(),
  getSessionCookieName: vi.fn(),
  getSessionTtlSeconds: vi.fn(),
  getUserById: vi.fn(),
  hashPassword: vi.fn(),
  parseSessionToken: vi.fn(),
  verifyPassword: vi.fn(),
}))

vi.mock('@vibetech/auth', () => authFns)

describe('auth bridge', () => {
  it('re-exports the shared auth package surface', async () => {
    const auth = await import('./auth.js')

    expect(auth.createSessionToken).toBe(authFns.createSessionToken)
    expect(auth.getSessionCookieName).toBe(authFns.getSessionCookieName)
    expect(auth.getSessionTtlSeconds).toBe(authFns.getSessionTtlSeconds)
    expect(auth.getUserById).toBe(authFns.getUserById)
    expect(auth.hashPassword).toBe(authFns.hashPassword)
    expect(auth.parseSessionToken).toBe(authFns.parseSessionToken)
    expect(auth.verifyPassword).toBe(authFns.verifyPassword)
  })
})
