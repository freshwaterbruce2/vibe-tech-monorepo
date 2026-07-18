/**
 * ResponseParser tests — JSON extraction across response formats (code block,
 * embedded object, brace scan), task/step construction defaults, action
 * validation, approval rules (destructive/dangerous/all), fallback-task
 * degradation, and the reasoning/warnings/task validators.
 */
import { describe, expect, it } from 'vitest';
import {
  extractReasoning,
  extractWarnings,
  generateTitle,
  parseTaskPlan,
  shouldRequireApproval,
  validateAction,
  validateTask,
} from '../../../../services/ai/planning/ResponseParser';
import type { AgentTask } from '../../../../types';

function planJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    title: 'Do the work',
    description: 'A plan',
    reasoning: 'because',
    steps: [
      {
        order: 1,
        title: 'Read it',
        description: 'Read the file',
        action: { type: 'read_file', params: { filePath: 'a.ts' } },
        requiresApproval: false,
        maxRetries: 2,
      },
    ],
    ...overrides,
  });
}

function taskWith(actionTypes: string[]): AgentTask {
  return {
    id: 't',
    title: 'T',
    description: 'd',
    userRequest: 'u',
    status: 'awaiting_approval',
    createdAt: new Date(),
    steps: actionTypes.map((type, index) => ({
      id: `s${index}`,
      taskId: 't',
      order: index + 1,
      title: `Step ${index + 1}`,
      description: 'd',
      action: { type, params: {} },
      status: 'pending',
      requiresApproval: false,
      retryCount: 0,
      maxRetries: 3,
    })),
  } as AgentTask;
}

describe('parseTaskPlan extraction formats', () => {
  it('parses a plain JSON response', () => {
    const task = parseTaskPlan(planJson(), 'do the work');
    expect(task.title).toBe('Do the work');
    expect(task.status).toBe('planning');
    expect(task.steps).toHaveLength(1);
    expect(task.steps[0]).toMatchObject({
      order: 1,
      title: 'Read it',
      action: { type: 'read_file', params: { filePath: 'a.ts' } },
      requiresApproval: false,
      maxRetries: 2,
    });
    expect(task.steps[0]?.id).toBe(`${task.id}_step_1`);
  });

  it('extracts JSON from a markdown code block', () => {
    const response = `Here is the plan:\n\`\`\`json\n${planJson()}\n\`\`\`\nDone.`;
    expect(parseTaskPlan(response, 'req').title).toBe('Do the work');
  });

  it('extracts an embedded JSON object containing "taskId"', () => {
    const body = planJson({ taskId: 'abc' });
    const task = parseTaskPlan(`preamble ${body} postamble`, 'req');
    expect(task.title).toBe('Do the work');
  });

  it('falls back to brace-position extraction for JSON wrapped in prose', () => {
    const task = parseTaskPlan(`The plan follows ${planJson()} thanks!`, 'req');
    expect(task.title).toBe('Do the work');
  });
});

describe('parseTaskPlan invalid response handling', () => {
  it.each([
    ['empty response', ''],
    ['no JSON at all', 'I cannot produce a plan right now.'],
    ['reversed braces only', '} not json {'],
    ['invalid JSON', '{ "title": broken'],
    [
      'invalid action type',
      planJson({ steps: [{ title: 't', description: 'd', action: { type: 'launch_missiles' } }] }),
    ],
    ['missing steps array', '{ "title": "no steps" }'],
  ])('rejects %s instead of inventing an executable fallback', (_label, response) => {
    expect(() => parseTaskPlan(response, 'the request')).toThrow(
      /Planning response was not executable/
    );
  });
});

describe('parseTaskPlan defaults and approval precedence', () => {
  it('defaults order, maxRetries, title, and description', () => {
    const response = JSON.stringify({
      steps: [{ title: 'Step', description: 'd', action: { type: 'analyze_code' } }],
    });
    const task = parseTaskPlan(response, 'Analyze my code. Then report.');
    expect(task.title).toBe('Analyze my code');
    expect(task.description).toBe('Analyze my code. Then report.');
    expect(task.steps[0]).toMatchObject({ order: 1, maxRetries: 3, requiresApproval: false });
  });

  it('applies the system approval rule when the AI omits requiresApproval', () => {
    const response = JSON.stringify({
      title: 'Write',
      steps: [
        {
          title: 'w',
          description: 'd',
          action: { type: 'write_file', params: { filePath: 'a.ts', content: 'x' } },
          requiresApproval: false,
        },
      ],
    });
    expect(parseTaskPlan(response, 'req').steps[0]?.requiresApproval).toBe(true);
  });

  it('normalizes hostile model order values to contiguous one-based positions', () => {
    const response = planJson({
      steps: [
        { order: 99, title: 'a', description: 'a', action: { type: 'analyze_code' } },
        { order: -4, title: 'b', description: 'b', action: { type: 'review_project' } },
      ],
    });
    expect(parseTaskPlan(response, 'req').steps.map(step => step.order)).toEqual([1, 2]);
  });

  it('marks a final fileless report after two inspections as display-only synthesis', () => {
    const reportDescription = 'Report the verified compiled artifacts and configuration findings';
    const task = parseTaskPlan(
      planJson({
        steps: [
          {
            title: 'Read package metadata',
            description: 'Inspect package.json',
            action: { type: 'read_file', params: { filePath: 'package.json' } },
          },
          {
            title: 'Analyze compiler settings',
            description: 'Inspect tsconfig.json',
            action: { type: 'analyze_code', params: { filePath: 'tsconfig.json' } },
          },
          {
            title: 'Synthesize verified report',
            description: 'Summarize the inspected findings without changing files',
            action: { type: 'generate_code', params: { description: reportDescription } },
          },
        ],
      }),
      'Review the workspace without making changes'
    );

    expect(task.steps[2]).toMatchObject({
      action: {
        type: 'generate_code',
        params: { description: reportDescription, displayOnly: true },
      },
      requiresApproval: false,
    });
  });
});

describe('validateAction', () => {
  it('accepts valid types and defaults params to {}', () => {
    expect(validateAction({ type: 'browser_action' })).toEqual({
      type: 'browser_action',
      params: {},
    });
  });

  it('throws on unknown action types', () => {
    expect(() => validateAction({ type: 'nuke_everything' })).toThrow(/Invalid action type/);
  });

  it('validates required action parameters', () => {
    expect(() => validateAction({ type: 'read_file' })).toThrow(/filePath/);
    expect(() => validateAction({ type: 'write_file', params: { filePath: 'a.ts' } })).toThrow(
      /content/
    );
    expect(() => validateAction({ type: 'run_command' })).toThrow(/command/);
    expect(() => validateAction({ type: 'run_tests' })).toThrow(/projectName/);
    expect(() =>
      validateAction({
        type: 'run_tests',
        params: { projectName: 'vibe-code-studio', targets: [42] },
      })
    ).toThrow(/targets/);
    expect(
      validateAction({
        type: 'run_tests',
        params: { projectName: 'vibe-code-studio', targets: ['typecheck', 'test'] },
      })
    ).toMatchObject({ type: 'run_tests' });
    expect(() =>
      validateAction({
        type: 'run_tests',
        params: { projectName: 'vibe-code-studio', targets: ['lint-fix'] },
      })
    ).toThrow(/typecheck, lint, test, or build/);
    expect(() =>
      validateAction({
        type: 'run_tests',
        params: { projectName: '--help', targets: ['test'] },
      })
    ).toThrow(/projectName/);
    expect(() =>
      validateAction({
        type: 'search_codebase',
        params: { searchQuery: '' },
      })
    ).toThrow(/non-empty searchQuery/);
    expect(() =>
      validateAction({
        type: 'search_codebase',
        params: { searchQuery: [] },
      })
    ).toThrow(/non-empty searchQuery/);
    expect(() =>
      validateAction({
        type: 'generate_code',
        params: { filePath: 'src/index.ts' },
      })
    ).toThrow(/description/);
    expect(
      validateAction({
        type: 'search_codebase',
        params: { searchQuery: 'TODO' },
      })
    ).toMatchObject({ type: 'search_codebase' });
    expect(
      validateAction({
        type: 'search_codebase',
        params: { searchQuery: ['asset', 'image'] },
      })
    ).toMatchObject({ type: 'search_codebase' });
  });
});

describe('shouldRequireApproval', () => {
  it('always flags destructive actions', () => {
    expect(shouldRequireApproval({ type: 'delete_file', params: {} })).toBe(true);
    expect(shouldRequireApproval({ type: 'git_commit', params: {} })).toBe(true);
  });

  it('requires approval for every command, regardless of command text', () => {
    expect(shouldRequireApproval({ type: 'run_command', params: { command: 'rm -rf /' } })).toBe(
      true
    );
    expect(shouldRequireApproval({ type: 'run_command', params: { command: 'pnpm build' } })).toBe(
      true
    );
    expect(shouldRequireApproval({ type: 'run_command', params: {} })).toBe(true);
  });

  it('honors requireApprovalForAll', () => {
    expect(
      shouldRequireApproval({ type: 'read_file', params: {} }, { requireApprovalForAll: true })
    ).toBe(true);
    expect(shouldRequireApproval({ type: 'read_file', params: {} })).toBe(false);
  });
});

describe('generateTitle', () => {
  it('uses the first sentence when short enough', () => {
    expect(generateTitle('Fix the bug. Then celebrate.')).toBe('Fix the bug');
  });

  it('truncates long first sentences to 50 chars', () => {
    const long = 'a'.repeat(60);
    expect(generateTitle(long)).toBe(`${'a'.repeat(47)}...`);
    expect(generateTitle(long)).toHaveLength(50);
  });

  it('falls back to a raw prefix when the first sentence is empty', () => {
    expect(generateTitle('. leading punctuation request')).toBe(
      '. leading punctuation request'.substring(0, 50)
    );
  });
});

describe('extractReasoning', () => {
  it('returns the default for empty input', () => {
    expect(extractReasoning('')).toBe('Task decomposed into executable steps');
  });

  it('reads reasoning from a json code block', () => {
    expect(extractReasoning('```json\n{"reasoning": "solid plan"}\n```')).toBe('solid plan');
  });

  it('reads reasoning from a bare code block and defaults when missing', () => {
    expect(extractReasoning('```\n{"title": "x"}\n```')).toBe('No reasoning provided');
  });

  it('scrapes reasoning from prose when JSON parsing fails', () => {
    expect(extractReasoning('reasoning: careful refactor first')).toBe('careful refactor first');
  });

  it('returns the default when nothing matches', () => {
    expect(extractReasoning('just some text')).toBe('Task decomposed into executable steps');
  });

  it('returns the default for an empty code block', () => {
    expect(extractReasoning('```json\n\n```')).toBe('Task decomposed into executable steps');
  });
});

describe('extractWarnings', () => {
  it('merges AI-provided warnings with automatic action warnings', () => {
    const response = `\`\`\`json\n${JSON.stringify({ warnings: ['ai says careful'] })}\n\`\`\``;
    const warnings = extractWarnings(
      response,
      taskWith(['delete_file', 'git_commit', 'run_command'])
    );
    expect(warnings).toContain('ai says careful');
    expect(warnings.some(w => w.includes('file deletions'))).toBe(true);
    expect(warnings.some(w => w.includes('git commits'))).toBe(true);
    expect(warnings.some(w => w.includes('terminal commands'))).toBe(true);
  });

  it('warns on complex tasks (more than 8 steps) and ignores unparseable responses', () => {
    const warnings = extractWarnings('not json', taskWith(Array(9).fill('read_file')));
    expect(warnings.some(w => w.includes('9 steps'))).toBe(true);
    expect(warnings).toHaveLength(1);
  });

  it('returns no warnings for a small safe task', () => {
    expect(extractWarnings('{}', taskWith(['read_file']))).toEqual([]);
  });
});

describe('validateTask', () => {
  it('accepts a well-formed task', () => {
    expect(validateTask(taskWith(['read_file']))).toEqual({ valid: true, errors: [] });
  });

  it('rejects a task with no steps', () => {
    const result = validateTask(taskWith([]));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Task has no steps');
  });

  it('reports steps missing action types or titles', () => {
    const task = taskWith(['read_file']);
    task.steps[0]!.title = '';
    (task.steps[0]!.action as { type?: string }).type = undefined as unknown as string;
    const result = validateTask(task);
    expect(result.errors).toContain('Step 1 has no action type');
    expect(result.errors).toContain('Step 1 has no title');
  });
});
