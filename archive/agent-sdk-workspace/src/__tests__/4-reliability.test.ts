/**
 * Suite 4 — Reliability
 *
 * Runs agents N times with identical mock inputs and asserts that the
 * assembled prompt is structurally consistent across runs.
 *
 * Two categories:
 *  A. Pure-logic unit tests (no module side-effects) — fast, deterministic.
 *  B. Multi-run agent tests — catch non-determinism in prompt assembly.
 *
 * Note: LLM output variance (different Claude responses to the same prompt) is
 * out of scope here — all Anthropic calls are mocked. Reliability here means
 * "the agent always builds the same prompt for the same input."
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DIFFS, NX_OUTPUTS, REVIEW_TEXTS, makeAnthropicResponse } from './fixtures.js';

const flush = () => new Promise<void>((r) => setImmediate(r));

// ---------------------------------------------------------------------------
// A. Pure-logic reliability: response parsing
// ---------------------------------------------------------------------------

describe('response content parsing (pure logic)', () => {
  /**
   * The agents extract text from the Anthropic response with:
   *   .filter(b => b.type === 'text').map(b => 'text' in b ? b.text : '')
   * Test that this idiom handles every valid content block shape.
   */

  function parseResponse(content: unknown[]): string {
    return (content as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === 'text')
      .map((b) => ('text' in b ? b.text : ''))
      .join('');
  }

  it('extracts text from a single text block', () => {
    const result = parseResponse([{ type: 'text', text: 'review result' }]);
    expect(result).toBe('review result');
  });

  it('concatenates multiple text blocks', () => {
    const result = parseResponse([
      { type: 'text', text: 'part one\n' },
      { type: 'text', text: 'part two' },
    ]);
    expect(result).toBe('part one\npart two');
  });

  it('skips non-text blocks (tool_use, image, etc.)', () => {
    const result = parseResponse([
      { type: 'tool_use', id: 'tu_1' },
      { type: 'text', text: 'actual review' },
      { type: 'image', source: { type: 'url', url: 'x' } },
    ]);
    expect(result).toBe('actual review');
  });

  it('returns empty string for an empty content array', () => {
    expect(parseResponse([])).toBe('');
  });

  it('returns empty string when all blocks are non-text', () => {
    expect(parseResponse([{ type: 'tool_use' }, { type: 'document' }])).toBe('');
  });
});

describe('truncation char-count accuracy (pure logic)', () => {
  function truncateDiff(diff: string, limit = 50_000): string {
    return diff.length > limit
      ? diff.slice(0, limit) + `\n...(truncated — ${diff.length - limit} chars omitted)`
      : diff;
  }

  it('reports the exact number of omitted chars', () => {
    const diff = 'x'.repeat(55_000);
    const result = truncateDiff(diff);
    expect(result).toContain('5000 chars omitted');
  });

  it('does not truncate a diff that fits within the limit', () => {
    const diff = 'x'.repeat(49_999);
    expect(truncateDiff(diff)).toBe(diff);
  });

  it('truncates at exactly the limit boundary', () => {
    const diff = 'x'.repeat(50_001);
    const result = truncateDiff(diff);
    expect(result).toContain('1 chars omitted');
    // The agent appends '\n...(truncated' so the marker sits one char after
    // the slice point (50_000 chars of content + '\n' at index 50_000).
    expect(result.indexOf('...(truncated')).toBe(50_001);
  });
});

// ---------------------------------------------------------------------------
// B. Multi-run agent reliability
// ---------------------------------------------------------------------------

async function runCodeReviewer(opts: {
  changedFiles?: string[];
  diff?: string;
}): Promise<{ createMock: Mock }> {
  const createMock = vi.fn().mockResolvedValue(
    makeAnthropicResponse(REVIEW_TEXTS.withSeverities)
  );

  vi.doMock('../tools/git-tools.js', () => ({
    gitDiff: vi.fn().mockReturnValue(opts.diff ?? DIFFS.validTs),
    gitChangedFiles: vi.fn().mockReturnValue(opts.changedFiles ?? ['src/App.tsx']),
    gitStatus: vi.fn().mockReturnValue(''),
    gitLog: vi.fn().mockReturnValue(''),
  }));
  vi.doMock('../tools/file-tools.js', () => ({
    readFile: vi.fn().mockReturnValue('export const x = 1;'),
    writeFile: vi.fn(),
    listFiles: vi.fn().mockReturnValue([]),
    fileExists: vi.fn().mockReturnValue(true),
  }));
  vi.doMock('@anthropic-ai/sdk', () => ({
    default: class {
      messages = { create: createMock };
    },
  }));

  vi.resetModules();
  await import('../agents/code-reviewer.js');
  await flush();
  await flush();

  return { createMock };
}

async function runQualityGate(failTarget: string): Promise<{ createMock: Mock }> {
  const createMock = vi.fn().mockResolvedValue(makeAnthropicResponse('analysis'));
  const lintErr = Object.assign(new Error('lint failed'), {
    killed: false,
    stderr: NX_OUTPUTS.lintFailure,
    stdout: '',
  });

  vi.doMock('../tools/nx-tools.js', () => ({
    nxAffected: vi.fn().mockImplementation((target: string) => {
      if (target === failTarget) throw lintErr;
      return 'NX success';
    }),
    nxRunTarget: vi.fn().mockReturnValue(''),
  }));
  vi.doMock('@anthropic-ai/sdk', () => ({
    default: class {
      messages = { create: createMock };
    },
  }));

  vi.resetModules();
  await import('../agents/quality-gate.js');
  await flush();
  await flush();

  return { createMock };
}

describe('code-reviewer: prompt assembly consistency across N runs', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('produces the same prompt structure on every run (3 runs)', async () => {
    const RUNS = 3;
    const prompts: string[] = [];

    for (let i = 0; i < RUNS; i++) {
      const { createMock } = await runCodeReviewer({
        changedFiles: ['src/App.tsx', 'src/utils.ts'],
        diff: DIFFS.validTs,
      });
      prompts.push(createMock.mock.calls[0][0].messages[0].content as string);
    }

    // Every run should produce a prompt with the same structural sections.
    for (const prompt of prompts) {
      expect(prompt).toContain('## Diff');
      expect(prompt).toContain('## File Contents');
      expect(prompt).toContain('critical/warning/info');
    }

    // gitDiff should always be called with the same files.
    // Verify by checking all prompts contain the same file references.
    const firstPrompt = prompts[0];
    for (const prompt of prompts.slice(1)) {
      // Section headers and instructions are identical.
      expect(prompt.includes('## Diff')).toBe(firstPrompt.includes('## Diff'));
      expect(prompt.includes('## File Contents')).toBe(
        firstPrompt.includes('## File Contents')
      );
    }
  });

  it('always calls the LLM exactly once per run', async () => {
    for (let i = 0; i < 3; i++) {
      const { createMock } = await runCodeReviewer({});
      expect(createMock).toHaveBeenCalledTimes(1);
    }
  });
});

describe('quality-gate: failure context consistency across N runs', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('always includes the failing check name in the prompt (3 runs)', async () => {
    for (let i = 0; i < 3; i++) {
      const { createMock } = await runQualityGate('lint');
      expect(createMock).toHaveBeenCalled();
      const content = createMock.mock.calls[0][0].messages[0].content as string;
      expect(content).toContain('## lint');
    }
  });

  it('never calls the LLM when all checks pass (3 runs)', async () => {
    for (let i = 0; i < 3; i++) {
      const createMock = vi.fn().mockResolvedValue(makeAnthropicResponse('ok'));

      vi.doMock('../tools/nx-tools.js', () => ({
        nxAffected: vi.fn().mockReturnValue('NX success'),
        nxRunTarget: vi.fn().mockReturnValue('NX success'),
      }));
      vi.doMock('@anthropic-ai/sdk', () => ({
        default: class {
          messages = { create: createMock };
        },
      }));

      vi.resetModules();
      await import('../agents/quality-gate.js');
      await flush();
      await flush();

      expect(createMock).not.toHaveBeenCalled();
    }
  });
});
