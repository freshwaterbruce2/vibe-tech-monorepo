import { describe, expect, it } from 'vitest'
import pkg from '../../../package.json'

describe('axios supply-chain CVE-2026-40175 pin guard', () => {
  // On 2026-03-31 axios@1.14.1 (and 0.30.4) were maliciously published via a
  // compromised maintainer account (NK "Sapphire Sleet" — a RAT dropped by a
  // plain-crypto-js postinstall). axios@1.14.0 was the last legitimate
  // pre-incident 1.x release; 1.15.0 patched CVE-2026-40175 (the header-injection
  // gadget chain). The enduring protection is the *discipline*, not a frozen
  // number: pin axios to an EXACT version (no caret/tilde, so a range can never
  // resolve to the malicious 1.14.1) at or after the CVE fix (>= 1.15.0). Because
  // the pin is exact and above the root override range, declared === resolved.
  it('pins axios to an exact, post-CVE version (no caret/tilde range)', () => {
    const v = pkg.dependencies.axios

    // Exact semver only — never a range that could resolve to 1.14.1.
    expect(v.startsWith('^')).toBe(false)
    expect(v.startsWith('~')).toBe(false)
    expect(v).toMatch(/^\d+\.\d+\.\d+$/)

    // Never the malicious release, and at/after the CVE-2026-40175 fix (1.15.0).
    expect(v).not.toBe('1.14.1')
    const [major, minor] = v.split('.').map(Number)
    expect(major).toBe(1)
    expect(minor).toBeGreaterThanOrEqual(15)
  })
})
