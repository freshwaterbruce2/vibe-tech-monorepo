/**
 * StepExecutor ReAct-merge tests — under the default ReAct path the step result
 * was rebuilt purely from the observation, dropping the raw action's file
 * mutations and data. That silently broke rollback tracking, editor-tree
 * updates, and auto-synthesis (which reads data.generatedCode). The merge must
 * preserve filesCreated/filesModified/filesDeleted and the action data.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  approveStagedMutation,
  prepareStepMutation,
} from '../../../../services/agent-runtime/MutationService';
import { executeStepWithRetry } from '../../../../services/ai/execution/StepExecutor';
import type {
  AgentStep,
  ReActCycle,
  StepExecutionContext,
} from '../../../../services/ai/execution/types';

function makeStep(): AgentStep {
  return {
    id: 's1',
    taskId: 't1',
    order: 0,
    title: 'Analyze file',
    description: 'analyze a file',
    action: { type: 'analyze_code', params: { filePath: 'a.ts' } },
    status: 'pending',
    requiresApproval: false,
    retryCount: 0,
    maxRetries: 3,
  } as AgentStep;
}

function makeCycle(step: AgentStep): ReActCycle {
  return {
    stepId: step.id,
    thought: {
      reasoning: 'r',
      approach: 'write_file',
      alternatives: [],
      confidence: 90,
      risks: [],
      expectedOutcome: 'file written',
      timestamp: new Date(),
    },
    action: step.action,
    observation: {
      actualOutcome: 'Created file: /ws/a.ts',
      success: true,
      differences: [],
      learnings: [],
      unexpectedEvents: [],
      timestamp: new Date(),
    },
    reflection: {
      whatWorked: [],
      whatFailed: [],
      shouldRetry: false,
      suggestedChanges: [],
      knowledgeGained: '',
      timestamp: new Date(),
    },
    cycleNumber: 1,
    totalDurationMs: 5,
    result: {
      success: true,
      message: 'Created file: /ws/a.ts',
      filesCreated: ['/ws/a.ts'],
      filesModified: ['/ws/m.ts'],
      filesDeleted: ['/ws/d.ts'],
      data: { generatedCode: 'x' },
    },
  } as ReActCycle;
}

function makeContext(step: AgentStep, cycle: ReActCycle): StepExecutionContext {
  return {
    metacognitiveLayer: { monitorStepStart: vi.fn() },
    reactExecutor: { executeReActCycle: vi.fn(async () => cycle) },
    strategyMemory: {
      queryPatterns: vi.fn(async () => []),
      storeSuccessfulPattern: vi.fn(async () => {}),
    },
    enableReAct: true,
    enableMemory: false,
    taskState: { task: { id: 't1', steps: [step] }, userRequest: 'x', workspaceRoot: '/ws' },
  } as unknown as StepExecutionContext;
}

describe('executeStepWithRetry (ReAct path)', () => {
  it('preserves the raw action file mutations and data on the step result', async () => {
    const step = makeStep();
    const cycle = makeCycle(step);
    const context = makeContext(step, cycle);

    const result = await executeStepWithRetry(step, context);

    expect(result.success).toBe(true);
    expect(result.filesCreated).toEqual(['/ws/a.ts']);
    expect(result.filesModified).toEqual(['/ws/m.ts']);
    expect(result.filesDeleted).toEqual(['/ws/d.ts']);
    expect(result.data).toMatchObject({ generatedCode: 'x' });
    // ReAct metadata is still attached for UI display
    expect((result.data as Record<string, unknown>)['reActCycle']).toBe(cycle);
    expect(step.status).toBe('completed');
  });

  it('marks the step skipped when the raw action result was skipped', async () => {
    const step = makeStep();
    const cycle = makeCycle(step);
    cycle.result = { success: false, skipped: true, message: 'optional file missing' };
    cycle.observation.success = false;
    const context = makeContext(step, cycle);

    const result = await executeStepWithRetry(step, context);

    expect(result.skipped).toBe(true);
    expect(step.status).toBe('skipped');
  });

  it('never routes a mutation through a ReAct cycle', async () => {
    const step = {
      ...makeStep(),
      action: { type: 'write_file', params: { filePath: 'a.ts', content: 'x' } },
    } as AgentStep;
    const cycle = makeCycle(step);
    const context = makeContext(step, cycle);

    const result = await executeStepWithRetry(step, context);

    expect(context.reactExecutor.executeReActCycle).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: false });
    expect(result.message).toMatch(/without retry/i);
  });

  it('retains proposal identity when an approved mutation fails', async () => {
    let content = 'const value = 1;';
    const step = {
      ...makeStep(),
      action: {
        type: 'edit_file',
        params: {
          filePath: 'a.ts',
          oldContent: content,
          newContent: 'const value = 2;',
        },
      },
    } as AgentStep;
    const cycle = makeCycle(step);
    const context = makeContext(step, cycle);
    const writeFile = vi.fn(async (_path: string, value: string) => {
      content = value;
    });
    Object.assign(context, {
      fileSystemService: {
        resolveWorkspacePath: (path: string, root: string) => `${root}/${path}`,
        readFile: vi.fn(async () => content),
        writeFile,
        exists: vi.fn(async () => true),
      },
    });
    const { proposal } = await prepareStepMutation(step, context);
    approveStagedMutation(step, proposal.id, proposal.hash);
    writeFile.mockRejectedValueOnce(new Error('disk write denied'));

    const result = await executeStepWithRetry(step, context);

    expect(result).toMatchObject({
      success: false,
      data: {
        mutation: {
          proposalId: proposal.id,
          proposalHash: proposal.hash,
          path: '/ws/a.ts',
          changeType: 'modify',
          validated: false,
          error: 'disk write denied',
        },
      },
    });
    expect(step.result).toEqual(result);
  });
});

describe('executeStepWithRetry (soft failure honored)', () => {
  it('fails the step when an executor RETURNS success:false (not skipped)', async () => {
    // A `custom` action now returns success:false; the executor must route that
    // through the fail path instead of marking the step completed.
    const step = {
      ...makeStep(),
      action: { type: 'custom', params: { userRequest: 'do X' } },
      maxRetries: 0,
    } as AgentStep;

    const context = {
      metacognitiveLayer: {
        monitorStepStart: vi.fn(),
        analyzeStuckPattern: vi.fn(async () => ({
          isStuck: false,
          recommendation: '',
          confidence: 0,
        })),
      },
      reactExecutor: { executeReActCycle: vi.fn() },
      strategyMemory: { queryPatterns: vi.fn(async () => []) },
      enableReAct: false,
      enableMemory: false,
      taskState: { task: { id: 't1', steps: [step] }, userRequest: 'x', workspaceRoot: '/ws' },
    } as unknown as StepExecutionContext;

    const result = await executeStepWithRetry(step, context);

    expect(result.success).toBe(false);
    expect(step.status).toBe('failed');
  });
});
