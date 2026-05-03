import { Resend } from 'resend'

let cached: Resend | undefined

/**
 * Returns a singleton Resend SDK instance.
 *
 * Reads RESEND_API_KEY from process.env on first call. Throws immediately
 * if the env var is not set, so production startup fails fast on misconfig.
 *
 * Subsequent calls return the cached instance. Tests can reset the cache by
 * re-importing this module after `vi.resetModules()`.
 */
export default function getResend(): Resend {
  if (cached) return cached

  const key = process.env.RESEND_API_KEY
  if (!key) {
    throw new Error('RESEND_API_KEY is not set')
  }

  cached = new Resend(key)
  return cached
}
