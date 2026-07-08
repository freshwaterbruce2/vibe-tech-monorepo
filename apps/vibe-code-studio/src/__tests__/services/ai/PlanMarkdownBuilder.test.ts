/**
 * PlanMarkdownBuilder tests — spec 05 pure formatting: slug/timestamp/file
 * naming, the TaskPlanner-response adapter (title fallback, step targets,
 * defaulted warnings), and every conditional section of the rendered plan.
 */
import { describe, expect, it } from 'vitest';
import {
  buildPlanFileName,
  buildPlanMarkdown,
  formatPlanTimestamp,
  fromTaskPlanResponse,
  PLANS_DIR_SEGMENT,
  slugify,
} from '../../../services/ai/planMode/PlanMarkdownBuilder';
import type { PlanMarkdownInput } from '../../../services/ai/planMode/PlanMarkdownBuilder';
import type { AgentStep, PlanningInsights, TaskPlanResponse } from '../../../types';

const FIXED_DATE = new Date(2026, 0, 5, 7, 8, 9);

const insights: PlanningInsights = {
  overallConfidence: 0.876,
  highRiskSteps: 2,
  memoryBackedSteps: 3,
  fallbacksGenerated: 1,
  estimatedSuccessRate: 0.5,
};

function makeStep(overrides: Partial<AgentStep>): AgentStep {
  return {
    id: 'step-1',
    taskId: 'task-1',
    order: 1,
    title: 'Do a thing',
    description: 'Detailed description',
    action: { type: 'edit_file', params: {} },
    status: 'pending',
    requiresApproval: false,
    retryCount: 0,
    maxRetries: 1,
    ...overrides,
  };
}

function makeResponse(overrides?: {
  title?: string;
  steps?: AgentStep[];
  warnings?: string[] | undefined;
  reasoning?: string;
}): TaskPlanResponse {
  return {
    task: {
      id: 'task-1',
      title: overrides?.title ?? 'Refactor Login',
      description: 'desc',
      userRequest: 'req',
      steps: overrides?.steps ?? [makeStep({})],
      status: 'planning',
      createdAt: FIXED_DATE,
    },
    reasoning: overrides?.reasoning ?? 'Because reasons.',
    warnings: overrides?.warnings,
  };
}

const meta = {
  workspaceRoot: 'V:/ws',
  hasAgentStandards: true,
  createdAt: FIXED_DATE,
};

function makeInput(overrides: Partial<PlanMarkdownInput>): PlanMarkdownInput {
  return {
    title: 'My Plan',
    userRequest: 'do the thing',
    reasoning: '',
    steps: [],
    warnings: [],
    workspaceRoot: 'V:/ws',
    hasAgentStandards: false,
    createdAtIso: FIXED_DATE.toISOString(),
    ...overrides,
  };
}

describe('slugify', () => {
  it('kebab-cases mixed specials', () => {
    expect(slugify('Fix: The Login!! (v2)')).toBe('fix-the-login-v2');
  });

  it('truncates to 60 chars without a trailing dash', () => {
    const slug = slugify(`${'abcde '.repeat(20)}tail`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('falls back to "plan" when nothing survives', () => {
    expect(slugify('###!!!')).toBe('plan');
    expect(slugify('')).toBe('plan');
  });
});

describe('formatPlanTimestamp / buildPlanFileName', () => {
  it('formats a padded local timestamp', () => {
    expect(formatPlanTimestamp(FIXED_DATE)).toBe('20260105-070809');
  });

  it('builds <slug>-<timestamp>.md', () => {
    expect(buildPlanFileName('My Plan', FIXED_DATE)).toBe('my-plan-20260105-070809.md');
  });

  it('exposes the plans dir segment', () => {
    expect(PLANS_DIR_SEGMENT).toBe('.vcs/plans');
  });
});

describe('fromTaskPlanResponse', () => {
  it('maps steps, meta, and insights through to the builder input', () => {
    const input = fromTaskPlanResponse('user request', makeResponse({ warnings: ['careful'] }), {
      ...meta,
      currentFile: 'src/App.tsx',
      insights,
    });
    expect(input.title).toBe('Refactor Login');
    expect(input.userRequest).toBe('user request');
    expect(input.reasoning).toBe('Because reasons.');
    expect(input.steps).toEqual([
      {
        order: 1,
        title: 'Do a thing',
        description: 'Detailed description',
        actionType: 'edit_file',
        target: undefined,
      },
    ]);
    expect(input.warnings).toEqual(['careful']);
    expect(input.insights).toBe(insights);
    expect(input.workspaceRoot).toBe('V:/ws');
    expect(input.currentFile).toBe('src/App.tsx');
    expect(input.hasAgentStandards).toBe(true);
    expect(input.createdAtIso).toBe(FIXED_DATE.toISOString());
  });

  it('falls back to a sliced userRequest when the task title is empty', () => {
    const longRequest = 'x'.repeat(120);
    const input = fromTaskPlanResponse(longRequest, makeResponse({ title: '' }), meta);
    expect(input.title).toBe('x'.repeat(80));
  });

  it('defaults warnings to [] when the response omits them', () => {
    const input = fromTaskPlanResponse('req', makeResponse({ warnings: undefined }), meta);
    expect(input.warnings).toEqual([]);
  });

  it('extracts step targets from filePath, path, and workingDirectory', () => {
    const steps = [
      makeStep({ action: { type: 'edit_file', params: { filePath: 'src/a.ts' } } }),
      makeStep({ action: { type: 'read_file', params: { path: 'src/b.ts' } } }),
      makeStep({ action: { type: 'run_command', params: { workingDirectory: 'src/dir' } } }),
    ];
    const input = fromTaskPlanResponse('req', makeResponse({ steps }), meta);
    expect(input.steps.map(s => s.target)).toEqual(['src/a.ts', 'src/b.ts', 'src/dir']);
    expect(input.steps.map(s => s.order)).toEqual([1, 2, 3]);
  });

  it('leaves the target undefined for missing, non-string, or empty candidates', () => {
    const steps = [
      makeStep({ action: { type: 'analyze_code', params: {} } }),
      makeStep({
        action: {
          type: 'edit_file',
          params: { filePath: 42 } as unknown as AgentStep['action']['params'],
        },
      }),
      makeStep({ action: { type: 'edit_file', params: { filePath: '' } } }),
      makeStep({
        action: { type: 'custom', params: undefined } as unknown as AgentStep['action'],
      }),
    ];
    const input = fromTaskPlanResponse('req', makeResponse({ steps }), meta);
    expect(input.steps.map(s => s.target)).toEqual([undefined, undefined, undefined, undefined]);
  });

  it('reports "unknown" when a step has no action at all', () => {
    const steps = [makeStep({ action: undefined as unknown as AgentStep['action'] })];
    const input = fromTaskPlanResponse('req', makeResponse({ steps }), meta);
    expect(input.steps[0]?.actionType).toBe('unknown');
    expect(input.steps[0]?.target).toBeUndefined();
  });
});

describe('buildPlanMarkdown', () => {
  it('renders the empty-steps placeholder', () => {
    const markdown = buildPlanMarkdown(makeInput({}));
    expect(markdown).toContain('_No steps were generated._');
  });

  it('renders a step with description and target', () => {
    const markdown = buildPlanMarkdown(
      makeInput({
        steps: [
          {
            order: 1,
            title: 'Edit file',
            description: 'Change the import',
            actionType: 'edit_file',
            target: 'src/a.ts',
          },
        ],
      })
    );
    expect(markdown).toContain('- [ ] 1. Edit file — `edit_file` (`src/a.ts`)');
    expect(markdown).toContain('\n  Change the import');
  });

  it('renders a bare step without description or target', () => {
    const markdown = buildPlanMarkdown(
      makeInput({
        steps: [{ order: 2, title: 'Analyze', description: '', actionType: 'analyze_code' }],
      })
    );
    expect(markdown).toContain('- [ ] 2. Analyze — `analyze_code`');
    expect(markdown).not.toContain('(`');
  });

  it('includes warnings only when present', () => {
    const withWarnings = buildPlanMarkdown(makeInput({ warnings: ['risky', 'slow'] }));
    expect(withWarnings).toContain('## Warnings');
    expect(withWarnings).toContain('- risky');
    expect(withWarnings).toContain('- slow');

    expect(buildPlanMarkdown(makeInput({}))).not.toContain('## Warnings');
  });

  it('includes rounded confidence insights only when present', () => {
    const withInsights = buildPlanMarkdown(makeInput({ insights }));
    expect(withInsights).toContain('## Confidence');
    expect(withInsights).toContain('- Overall confidence: 88%');
    expect(withInsights).toContain('- High-risk steps: 2');
    expect(withInsights).toContain('- Memory-backed steps: 3');
    expect(withInsights).toContain('- Estimated success rate: 50%');

    expect(buildPlanMarkdown(makeInput({}))).not.toContain('## Confidence');
  });

  it('skips blank reasoning and includes trimmed reasoning', () => {
    expect(buildPlanMarkdown(makeInput({ reasoning: '   ' }))).not.toContain('## Reasoning');
    const markdown = buildPlanMarkdown(makeInput({ reasoning: '  Deep thoughts.  ' }));
    expect(markdown).toContain('## Reasoning\n\nDeep thoughts.');
  });

  it('renders context with currentFile fallback and standards flag', () => {
    const none = buildPlanMarkdown(makeInput({}));
    expect(none).toContain('- Current file: none');
    expect(none).toContain('- AGENTS.md standards applied: no');

    const withFile = buildPlanMarkdown(
      makeInput({ currentFile: 'src/App.tsx', hasAgentStandards: true })
    );
    expect(withFile).toContain('- Current file: src/App.tsx');
    expect(withFile).toContain('- AGENTS.md standards applied: yes');
  });

  it('starts with the title header and ends with a newline', () => {
    const markdown = buildPlanMarkdown(makeInput({}));
    expect(markdown.startsWith('# My Plan\n')).toBe(true);
    expect(markdown).toContain('> Generated by Plan Mode on');
    expect(markdown).toContain('## Goal\n\ndo the thing');
    expect(markdown.endsWith('\n')).toBe(true);
  });
});
