import { describe, expect, it } from 'vitest';
import pkg from '../../../package.json';

describe('axios supply-chain CVE-2026-40175 pin guard', () => {
  it('pins axios to exact 1.14.0 (not a caret/tilde range)', () => {
    const v = pkg.dependencies.axios;
    // 1.14.1 was malicious (NK state actor RAT).
    // ^1.13.6 or ~1.13.6 would allow resolution to the compromised 1.14.1.
    expect(v).toMatch(/^1\.14\.0$/);
    expect(v.startsWith('^')).toBe(false);
    expect(v.startsWith('~')).toBe(false);
  });
});
