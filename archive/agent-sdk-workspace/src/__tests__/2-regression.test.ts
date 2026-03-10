/**
 * Suite 2 — Regression (Golden Prompt)
 *
 * Runs each agent with known fixture inputs and captures what is sent to
 * anthropic.messages.create. Structural changes to the assembled prompt will
 * break these tests and must be reviewed before merging.
 *
 * Uses vi.doMock + vi.resetModules + dynamic import so the agent module is
 * re-evaluated fresh for each test with its own mock configuration.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DIFFS, REVIEW_TEXTS, QUALITY_TEXTS, NX_OUTPUTS, makeAnthropicResponse } from './fixtures.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flush the microtask + I/O queue enough for one async await chain. */
const flush = () => new Promise<void>((r) => setImmediate(r));

interface ReviewerCaptures {
  createMock: Mock;
  gitDiffMock: Mock;
  gitChangedFilesMock: Mock;
}

async function runCodeReviewer(opts: {
  changedFiles?: string[];
  diff?: string;
  fileContent?: string;
  anthropicText?: string;
}): Promise<ReviewerCaptures> {
  const gitDiffMock = vi.fn().mockReturnValue(opts.diff ?? DIFFS.validTs);
  const gitChangedFilesMock = vi.fn().mockReturnValue(opts.changedFiles ?? ['src/App.tsx']);
  const createMock = vi.fn().mockResolvedValue(
    makeAnthropicResponse(opts.anthropicText ?? REVIEW_TEXTS.withSeverities)
  );

  vi.doMock('../tools/git-tools.js', () => ({
    gitDiff: gitDiffMock,
    gitChangedFiles: gitChangedFilesMock,
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

  return { createMock, gitDiffMock, gitChangedFilesMock };
}

interface GateCaptures {
  createMock: Mock;
  lintMock: Mock;
  typecheckMock: Mock;
  buildMock: Mock;
}

async function runQualityGate(opts: {
  lintResult?: 'pass' | 'fail' | 'timeout';
  typecheckResult?: 'pass' | 'fail';
  buildResult?: 'pass' | 'fail';
  anthropicText?: string;
}): Promise<GateCaptures> {
  const makeCheck = (result: 'pass' | 'fail' | 'timeout', output: string) => {
    if (result === 'pass') return vi.fn().mockReturnValue(output);
    if (result === 'timeout') {
      const err = Object.assign(new Error('timeout'), { killed: true, stdout: '', stderr: '' });
      return vi.fn().mockImplementation(() => { throw err; });
    }
    const err = Object.assign(new Error('failed'), { killed: false, stderr: output, stdout: '' });
    return vi.fn().mockImplementation(() => { throw err; });
  };

  const lintMock = makeCheck(opts.lintResult ?? 'pass', NX_OUTPUTS.lintFailure);
  const typecheckMock = makeCheck(opts.typecheckResult ?? 'pass', NX_OUTPUTS.typecheckFailure);
  const buildMock = makeCheck(opts.buildResult ?? 'pass', NX_OUTPUTS.buildSuccess);
  const createMock = vi.fn().mockResolvedValue(
    makeAnthropicResponse(opts.anthropicText ?? QUALITY_TEXTS.withFixes)
  );

  vi.doMock('../tools/nx-tools.js', () => ({
    nxAffected: vi.fn().mockImplementation((target: string) => {
      if (target === 'lint') return lintMock();
      if (target === 'typecheck') return typecheckMock();
      if (target === 'build') return buildMock();
      return '';
    }),
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

  return { createMock, lintMock, typecheckMock, buildMock };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetModules();
});

describe('code-reviewer prompt regression', () => {
  it('passes the filtered changedFiles list as pathspec to gitDiff (key bug fix)', async () => {
    const { gitDiffMock, gitChangedFilesMock } = await runCodeReviewer({
      changedFiles: ['src/App.tsx', 'src/utils.ts'],
    });

    expect(gitChangedFilesMock).toHaveBeenCalled();
    // gitDiff MUST receive the changedFiles array as its second argument.
    // Before the fix, it was called with no paths — binary/generated files
    // could consume the 50k budget before real code appeared.
    expect(gitDiffMock).toHaveBeenCalledWith(
      expect.any(String),
      ['src/App.tsx', 'src/utils.ts']
    );
  });

  it('prompt contains both ## Diff and ## File Contents sections', async () => {
    const { createMock } = await runCodeReviewer({});
    const content = createMock.mock.calls[0][0].messages[0].content as string;

    expect(content).toContain('## Diff');
    expect(content).toContain('## File Contents');
  });

  it('prompt instructs the model to group by severity', async () => {
    const { createMock } = await runCodeReviewer({});
    const content = createMock.mock.calls[0][0].messages[0].content as string;

    expect(content).toContain('critical/warning/info');
  });

  it('model field matches CONFIG.model', async () => {
    const { createMock } = await runCodeReviewer({});
    const { CONFIG } = await import('../config.js');

    expect(createMock.mock.calls[0][0].model).toBe(CONFIG.model);
  });
});

describe('quality-gate prompt regression', () => {
  it('does NOT call Anthropic when all checks pass', async () => {
    const { createMock } = await runQualityGate({
      lintResult: 'pass',
      typecheckResult: 'pass',
      buildResult: 'pass',
    });

    expect(createMock).not.toHaveBeenCalled();
  });

  it('calls Anthropic with each failing check wrapped in a ## section', async () => {
    const { createMock } = await runQualityGate({
      lintResult: 'fail',
      typecheckResult: 'pass',
      buildResult: 'pass',
    });

    expect(createMock).toHaveBeenCalled();
    const content = createMock.mock.calls[0][0].messages[0].content as string;
    expect(content).toContain('## lint');
  });

  it('includes all three failing checks in a single prompt', async () => {
    const { createMock } = await runQualityGate({
      lintResult: 'fail',
      typecheckResult: 'fail',
      buildResult: 'fail',
    });

    const content = createMock.mock.calls[0][0].messages[0].content as string;
    expect(content).toContain('## lint');
    expect(content).toContain('## typecheck');
    expect(content).toContain('## build');
  });
});
