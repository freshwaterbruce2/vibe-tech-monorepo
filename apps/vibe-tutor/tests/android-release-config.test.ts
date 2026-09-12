import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateCapacitorReleaseServerPolicy } from '../scripts/android-release-config-validator.mjs';

describe('Android release configuration', () => {
  it('preserves the API 36 and release-security invariants', () => {
    const appRoot = resolve(__dirname, '..');
    const output = execFileSync(process.execPath, ['scripts/verify-android-release-config.mjs'], {
      cwd: appRoot,
      encoding: 'utf8',
    });

    expect(output).toContain('validation passed');
  });

  it('accepts the checked-in HTTPS-only Capacitor release server policy', () => {
    const source = readFileSync(resolve(__dirname, '../capacitor.config.ts'), 'utf8');
    expect(validateCapacitorReleaseServerPolicy(source)).toEqual([]);
  });

  it.each([
    ["http scheme", "server: { androidScheme: 'http' }"],
    ['cleartext opt-in', "server: { androidScheme: 'https', cleartext: true }"],
    ['remote server URL', "server: { androidScheme: 'https', url: 'https://example.invalid' }"],
    ['navigation allowlist', "server: { androidScheme: 'https', allowNavigation: ['example.invalid'] }"],
  ])('rejects forbidden Capacitor release policy: %s', (_name, source) => {
    expect(validateCapacitorReleaseServerPolicy(source)).not.toEqual([]);
  });
});
