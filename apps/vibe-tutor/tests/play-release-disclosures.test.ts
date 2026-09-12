import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Play release disclosures', () => {
  it('keeps release-facing data, audience, permission, and provider claims consistent', () => {
    const output = execFileSync(process.execPath, ['scripts/verify-play-release-disclosures.mjs'], {
      cwd: resolve(__dirname, '..'),
      encoding: 'utf8',
    });

    expect(output).toContain('validation passed');
  });
});
