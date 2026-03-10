/**
 * Suite 1 — Behavioral Contracts
 *
 * Tests invariants that must hold for every call to the tool functions and for
 * CONFIG itself. These are the properties whose violations caused the original
 * bug set: missing timeouts, bad branch refs, missing --parallel flag.
 *
 * No agent imports. All assertions are on execSync call arguments.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted before all imports, so git-tools / nx-tools will receive
// the mocked child_process when their modules are evaluated.
vi.mock('child_process', () => ({
  execSync: vi.fn().mockReturnValue(''),
}));

import { execSync } from 'child_process';
import { CONFIG } from '../config.js';
import { gitChangedFiles, gitDiff, gitLog, gitStatus } from '../tools/git-tools.js';
import { nxAffected, nxRunTarget } from '../tools/nx-tools.js';

const exec = () => vi.mocked(execSync);

beforeEach(() => {
  // Reset call history but keep the default `mockReturnValue('')`.
  exec().mockReset();
  exec().mockReturnValue('');
});

// ---------------------------------------------------------------------------
// git-tools
// ---------------------------------------------------------------------------

describe('git-tools: pager safety', () => {
  it('gitStatus uses core.pager=cat to prevent interactive-pager hangs', () => {
    gitStatus();
    expect(exec().mock.calls[0][0]).toContain('core.pager=cat');
  });

  it('gitLog uses core.pager=cat', () => {
    gitLog();
    expect(exec().mock.calls[0][0]).toContain('core.pager=cat');
  });

  it('gitDiff uses core.pager=cat', () => {
    gitDiff();
    const diffCall = exec().mock.calls.find(([cmd]) =>
      String(cmd).includes('diff --no-color')
    );
    expect(diffCall?.[0]).toContain('core.pager=cat');
  });

  it('gitChangedFiles uses core.pager=cat', () => {
    gitChangedFiles();
    const nameOnlyCall = exec().mock.calls.find(([cmd]) =>
      String(cmd).includes('--name-only')
    );
    expect(nameOnlyCall?.[0]).toContain('core.pager=cat');
  });
});

describe('git-tools: timeout enforcement', () => {
  it('all functions pass a numeric timeout to execSync', () => {
    gitStatus();
    gitLog();
    gitDiff();
    gitChangedFiles();

    for (const [, opts] of exec().mock.calls) {
      expect(opts).toHaveProperty('timeout');
      expect(typeof (opts as Record<string, unknown>).timeout).toBe('number');
      expect((opts as Record<string, unknown>).timeout as number).toBeGreaterThan(0);
    }
  });

  it('git timeout matches CONFIG.gitTimeout', () => {
    gitStatus();
    const [, opts] = exec().mock.calls[0];
    expect((opts as Record<string, unknown>).timeout).toBe(CONFIG.gitTimeout);
  });
});

describe('git-tools: resolveBase branch detection', () => {
  it('uses the requested branch when rev-parse succeeds', () => {
    // First call: rev-parse probe succeeds (returns truthy string).
    // Second call: the actual diff.
    exec().mockReturnValueOnce('abc123').mockReturnValue('diff output');

    gitDiff('main');

    const diffCall = exec().mock.calls.find(([cmd]) =>
      String(cmd).includes('diff --no-color')
    );
    expect(diffCall?.[0]).toContain('main...HEAD');
  });

  it('falls back to HEAD~1 when main and master are both absent', () => {
    // Every call throws until the final diff command (which succeeds).
    exec()
      .mockImplementationOnce(() => { throw new Error('not a git ref'); }) // probe('main')
      .mockImplementationOnce(() => { throw new Error('not a git ref'); }) // probe('master')
      .mockReturnValue('diff output'); // actual diff

    gitDiff('main');

    const diffCall = exec().mock.calls.find(([cmd]) =>
      String(cmd).includes('diff --no-color')
    );
    expect(diffCall?.[0]).toContain('HEAD~1...HEAD');
  });

  it('falls back to master when main is absent but master exists', () => {
    exec()
      .mockImplementationOnce(() => { throw new Error('no main'); }) // probe('main')
      .mockReturnValueOnce('abc123')  // probe('master') succeeds
      .mockReturnValue('diff output'); // actual diff

    gitDiff('main');

    const diffCall = exec().mock.calls.find(([cmd]) =>
      String(cmd).includes('diff --no-color')
    );
    expect(diffCall?.[0]).toContain('master...HEAD');
  });
});

describe('git-tools: diff scoping', () => {
  it('passes paths as a quoted pathspec when provided', () => {
    exec().mockReturnValueOnce('abc123').mockReturnValue('diff');

    gitDiff('main', ['src/App.tsx', 'src/utils.ts']);

    const diffCall = exec().mock.calls.find(([cmd]) =>
      String(cmd).includes('diff --no-color')
    );
    expect(diffCall?.[0]).toContain('"src/App.tsx"');
    expect(diffCall?.[0]).toContain('"src/utils.ts"');
  });

  it('omits pathspec when no paths are provided', () => {
    exec().mockReturnValueOnce('abc123').mockReturnValue('diff');

    gitDiff('main');

    const diffCall = exec().mock.calls.find(([cmd]) =>
      String(cmd).includes('diff --no-color')
    );
    // The command should end right after HEAD — no ' -- ' separator.
    expect(String(diffCall?.[0])).not.toContain(' -- ');
  });

  it('gitChangedFiles uses three-dot syntax to match gitDiff semantics', () => {
    exec().mockReturnValueOnce('abc123').mockReturnValue('src/App.tsx\n');

    gitChangedFiles('main');

    const nameOnlyCall = exec().mock.calls.find(([cmd]) =>
      String(cmd).includes('--name-only')
    );
    expect(nameOnlyCall?.[0]).toContain('main...HEAD');
  });
});

// ---------------------------------------------------------------------------
// nx-tools
// ---------------------------------------------------------------------------

describe('nx-tools: command flags', () => {
  it('nxAffected includes --parallel for concurrent project execution', () => {
    nxAffected('lint');
    expect(exec().mock.calls[0][0]).toContain('--parallel');
  });

  it('nxAffected includes --plain for parseable (non-ANSI) output', () => {
    nxAffected('typecheck');
    expect(exec().mock.calls[0][0]).toContain('--plain');
  });

  it('nxAffected uses CONFIG.nxTimeout', () => {
    nxAffected('build');
    expect(exec().mock.calls[0][1]).toMatchObject({ timeout: CONFIG.nxTimeout });
  });

  it('nxRunTarget uses CONFIG.nxTimeout', () => {
    nxRunTarget('my-app', 'build');
    expect(exec().mock.calls[0][1]).toMatchObject({ timeout: CONFIG.nxTimeout });
  });
});

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

describe('CONFIG: safety thresholds', () => {
  it('model ID follows the claude-{family}-{date} naming convention', () => {
    // Guards against the original bug: 'claude-sonnet-4-20250514' (wrong format)
    expect(CONFIG.model).toMatch(/^claude-[a-z0-9-]+-\d{8}$/);
  });

  it('nxTimeout is at least 60 s (the original hardcoded value was 120 s — must not regress below 60)', () => {
    expect(CONFIG.nxTimeout).toBeGreaterThanOrEqual(60_000);
  });

  it('gitTimeout is at least 10 s', () => {
    expect(CONFIG.gitTimeout).toBeGreaterThanOrEqual(10_000);
  });
});
