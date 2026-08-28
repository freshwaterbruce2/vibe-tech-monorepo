import { Resend } from 'resend'
import { getResendClient } from '@vibetech/email'

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
  return getResendClient() as unknown as Resend
}
