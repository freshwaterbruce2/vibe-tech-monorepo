/**
 * Guard for the crypto.randomUUID() sweep (CodeQL #389): ID generation across
 * ~20 service files calls crypto.randomUUID(), so the vitest environment must
 * provide it (natively or via the setup polyfill). If this fails, fix the test
 * setup — do not revert call sites to Math.random().
 */
import { describe, expect, it } from 'vitest';

describe('test environment crypto', () => {
  it('provides crypto.randomUUID for ID-generation code paths', () => {
    expect(typeof globalThis.crypto?.randomUUID).toBe('function');
    expect(crypto.randomUUID()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});
