/**
 * Suite 3 — Adversarial
 *
 * Inputs designed to exercise every failure mode from the original diagnosis:
 * empty diffs, branch fallbacks, TIMEOUT error labelling, non-timeout errors.
 * Each test actively tries to break expected behavior.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DIFFS, NX_OUTPUTS, makeAnthropicResponse } from './fixtures.js';

const flush = () => new Promise<void>((r) => setImmediate(r));

// ---------------------------------------------------------------------------
// Adversarial helpers — same pattern as regression suite
// ---------------------------------------------------------------------------

async function runCodeReviewer(opts: {
  changedFiles: string[];
  diff?: string;
  fileContent?: string;
}): Promise<{ createMock: Mock; consoleSpy: ReturnType<typeof vi.spyOn> }> {
  const createMock = vi.fn().mockResolvedValue(
    makeAnthropicResponse(DIFFS.validTs)
  );
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  vi.doMock('../tools/git-tools.js', () => ({
    gitDiff: vi.fn().mockReturnValue(opts.diff ?? DIFFS.validTs),
    gitChangedFiles: vi.fn().mockReturnValue(opts.changedFiles),
    gitStatus: vi.fn().mockReturnValue(''),
    gitLog: vi.fn().mockReturnValue(''),
  }));
  vi.doMock('../tools/file-tools.js', () => ({
    readFile: vi.fn().mockReturnValue(opts.fileContent ?? 'export const x = 1;'),
    writeFile: vi.fn(),
    listFiles: vi.fn().mockReturnValue([]),
    fileExists: vi.fn().mockReturnValue(true),
  }));
  vi.doMock('@anthropic-ai/sdk', () => ({
    default: class {
      messages = { create: createMock };
    },
  }));

  await import('../agents/code-reviewer.js');
  await flush();
  await flush();

  return { createMock, consoleSpy };
}

interface GateAdversarialOpts {
  nxAffectedImpl: (target: string) => string;
  anthropicText?: string;
}

async function runQualityGate(opts: GateAdversarialOpts): Promise<{ createMock: Mock }> {
  const createMock = vi.fn().mockResolvedValue(
    makeAnthropicResponse(opts.anthropicText ?? 'analysis')
  );

  vi.doMock('../tools/nx-tools.js', () => ({
    nxAffected: vi.fn().mockImplementation(opts.nxAffectedImpl),
    nxRunTarget: vi.fn().mockReturnValue(''),
  }));
  vi.doMock('@anthropic-ai/sdk', () => ({
    default: class {
      messages = { create: createMock };
    },
  }));

  await import('../agents/quality-gate.js');
  await flush();
  await flush();

  return { createMock };
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// code-reviewer adversarial cases
// ---------------------------------------------------------------------------

describe('code-reviewer: empty changed files', () => {
  it('does not call the LLM when no code files are changed', async () => {
    // Binary-only changes pass gitChangedFiles but fail the extension filter.
    const { createMock } = await runCodeReviewer({
      changedFiles: ['public/logo.png', 'dist/bundle.js.map'],
    });

    expect(createMock).not.toHaveBeenCalled();
  });

  it('does not call the LLM when changedFiles is empty', async () => {
    const { createMock } = await runCodeReviewer({ changedFiles: [] });
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe('code-reviewer: large diff truncation', () => {
  it('includes the exact omitted-char count in the truncation message', async () => {
    const largeDiff = DIFFS.large; // > 50 000 chars
    const expectedOmitted = largeDiff.length - 50_000;

    const { createMock } = await runCodeReviewer({
      changedFiles: ['src/big.ts'],
      diff: largeDiff,
    });

    const content = createMock.mock.calls[0][0].messages[0].content as string;
    expect(content).toContain(`${expectedOmitted} chars omitted`);
  });

  it('never sends more than 50 000 diff chars to the LLM', async () => {
    const { createMock } = await runCodeReviewer({
      changedFiles: ['src/big.ts'],
      diff: DIFFS.large,
    });

    const content = createMock.mock.calls[0][0].messages[0].content as string;
    // Find the diff block and measure it.
    const diffBlock = content.match(/```diff\n([\s\S]*?)```/)?.[1] ?? '';
    expect(diffBlock.length).toBeLessThanOrEqual(50_000 + 200); // +200 for the truncation line itself
  });
});

// ---------------------------------------------------------------------------
// quality-gate adversarial cases
// ---------------------------------------------------------------------------

describe('quality-gate: TIMEOUT error handling', () => {
  it('labels timed-out checks with TIMEOUT: in the LLM prompt', async () => {
    const timeoutErr = Object.assign(new Error('killed'), {
      killed: true,
      stdout: 'partial output',
      stderr: '',
    });

    const { createMock } = await runQualityGate({
      nxAffectedImpl: () => { throw timeoutErr; },
    });

    const content = createMock.mock.calls[0][0].messages[0].content as string;
    expect(content).toContain('TIMEOUT:');
  });

  it('includes whatever partial output was captured before the timeout', async () => {
    const timeoutErr = Object.assign(new Error('killed'), {
      killed: true,
      stdout: 'partial lint output before kill',
      stderr: '',
    });

    const { createMock } = await runQualityGate({
      nxAffectedImpl: () => { throw timeoutErr; },
    });

    const content = createMock.mock.calls[0][0].messages[0].content as string;
    expect(content).toContain('partial lint output before kill');
  });

  it('does NOT label a real lint failure as TIMEOUT', async () => {
    const lintErr = Object.assign(new Error('lint failed'), {
      killed: false,
      stderr: NX_OUTPUTS.lintFailure,
      stdout: '',
    });

    const { createMock } = await runQualityGate({
      nxAffectedImpl: () => { throw lintErr; },
    });

    const content = createMock.mock.calls[0][0].messages[0].content as string;
    expect(content).not.toContain('TIMEOUT:');
    // The real lint output should be present instead.
    expect(content).toContain(NX_OUTPUTS.lintFailure.slice(0, 50));
  });
});

describe('quality-gate: non-timeout execSync errors', () => {
  it('passes the real error message to the LLM when stderr is populated', async () => {
    const realErr = Object.assign(new Error('nx config error'), {
      killed: false,
      stderr: 'Error: project.json is malformed in apps/my-app',
      stdout: '',
    });

    const { createMock } = await runQualityGate({
      nxAffectedImpl: () => { throw realErr; },
    });

    const content = createMock.mock.calls[0][0].messages[0].content as string;
    expect(content).toContain('project.json is malformed');
  });
});

// git-tools resolveBase fallback is covered with the correct vi.mock-at-top-level
// pattern in 1-behavioral-contracts.test.ts. Duplicating it here with vi.mock
// inside an it() body would cause the factory to be hoisted and evaluated once
// at file-load time, consuming the mockImplementationOnce chain before the test
// runs. See: "falls back to HEAD~1 when main and master are both absent" in suite 1.
