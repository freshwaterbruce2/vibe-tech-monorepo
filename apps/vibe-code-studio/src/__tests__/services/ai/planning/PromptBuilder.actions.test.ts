/**
 * PromptBuilder tests — the generate_code action doc must tell the planner that
 * supplying a filePath WRITES the file (so file-creation plans stop emitting
 * content-less write_file steps or filePath-less generate_code no-ops).
 */
import { describe, expect, it } from 'vitest';
import { buildPlanningPrompt } from '../../../../services/ai/planning/PromptBuilder';
import type { PlanningContext } from '../../../../services/ai/planning/types';

function makeContext(): PlanningContext {
  return {
    userRequest: 'create a new file',
    workspaceRoot: '/ws',
    openFiles: [],
    recentFiles: [],
    maxSteps: 10,
    allowDestructive: true,
  } as PlanningContext;
}

describe('buildPlanningPrompt', () => {
  it('documents that generate_code with a filePath writes the file', () => {
    const prompt = buildPlanningPrompt(makeContext());

    expect(prompt).toContain('the generated code is WRITTEN to that file');
    expect(prompt).toContain('filePath: string');
  });

  it('binds named file mutations to the final synthesis action', () => {
    const prompt = buildPlanningPrompt(makeContext());

    expect(prompt).toContain('the mutation action MUST include that exact path');
    expect(prompt).toContain('that FINAL generate_code step MUST include the exact filePath');
    expect(prompt).toContain('do not emit a separate synthesis-only step instead');
  });
});
