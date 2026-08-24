import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { executeStepMock } = vi.hoisted(() => ({
  executeStepMock: vi.fn(),
}));

vi.mock('../../../../services/ai/execution/StepExecutor', () => ({
  executeStepWithFallbacks: executeStepMock,
}));

import { TaskLifecycleManager } from '../../../../services/ai/execution/TaskLifecycle';
import type { StepExecutionContext } from '../../../../services/ai/execution/types';
import type {
  PersistedTask,
  TaskOutcomeSummary,
  TaskPersistence,
} from '../../../../services/ai/TaskPersistence';
import type { AgentStep, AgentTask, ApprovalRequest } from '../../../../types';

function makeStep(
  action: AgentStep['action'] = { type: 'read_file', params: { filePath: 'a.ts' } }
): AgentStep {
  return {
    id: 'step-1',
    taskId: 'task-1',
    order: 1,
    title: 'Step',
    description: 'Perform the step',
    action,
    status: 'pending',
    requiresApproval: false,
    retryCount: 0,
    maxRetries: 3,
  };
}

function makeTask(step = makeStep()): AgentTask {
  return {
    id: 'task-1',
    title: 'Task',
    description: 'Test lifecycle',
    userRequest: 'do the task',
    steps: [step],
    status: 'planning',
    createdAt: new Date(),
  };
}

function makePersistence(persistedTask?: PersistedTask) {
  const transitions: string[] = [];
  const terminals: string[] = [];
  const terminalOutcomes: TaskOutcomeSummary[] = [];
  const persistence = {
    recordTransition: vi.fn(async (task: AgentTask) => {
      transitions.push(task.status);
    }),
    recordTerminalOutcome: vi.fn(
      async (task: AgentTask, _request: string, _root: string, outcome: TaskOutcomeSummary) => {
        terminals.push(task.status);
        terminalOutcomes.push(outcome);
      }
    ),
    saveTaskState: vi.fn(async () => undefined),
    getPersistedTask: vi.fn(async () => persistedTask ?? null),
    getPersistedTasks: vi.fn(async () => (persistedTask ? [persistedTask] : [])),
  } as unknown as TaskPersistence;
  return { persistence, transitions, terminals, terminalOutcomes };
}

function makeContext(task: AgentTask): StepExecutionContext {
  let fileContent: string | undefined;
  return {
    fileSystemService: {
      resolveWorkspacePath: (path: string, root: string) => `${root}/${path}`,
      exists: vi.fn(async (path: string) => path === '/ws' || fileContent !== undefined),
      readFile: vi.fn(async () => fileContent ?? ''),
      writeFile: vi.fn(async (_path: string, value: string) => {
        fileContent = value;
      }),
      deleteFile: vi.fn(async () => {
        fileContent = undefined;
      }),
      createDirectory: vi.fn(async () => undefined),
    },
    aiService: { sendContextualMessage: vi.fn() },
    workspaceService: {},
    taskState: {
      task,
      currentStep: undefined,
      userRequest: task.userRequest,
      workspaceRoot: '/ws',
    },
    metacognitiveLayer: { resetForNewTask: vi.fn() },
    reactExecutor: { resetAllHistory: vi.fn() },
    strategyMemory: { getStats: vi.fn(() => ({ totalPatterns: 0, averageSuccessRate: 0 })) },
    enableReAct: false,
    enableMemory: false,
  } as unknown as StepExecutionContext;
}

beforeEach(() => {
  executeStepMock.mockReset();
  executeStepMock.mockImplementation(async (step: AgentStep) => {
    const result = { success: true, message: 'done' };
    step.status = 'completed';
    step.result = result;
    return result;
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TaskLifecycleManager approval safety', () => {
  it('forces exact-diff approval for a mutation even when the model says it is unnecessary', async () => {
    const step = makeStep({ type: 'write_file', params: { filePath: 'a.ts', content: 'x' } });
    const task = makeTask(step);
    const context = makeContext(task);
    const { persistence, transitions, terminals, terminalOutcomes } = makePersistence();
    const onTaskCancelled = vi.fn();
    const onStepApprovalRequired = vi.fn(async (_step: AgentStep, request: ApprovalRequest) => {
      expect(request.diff).toContain('+x');
      expect(request.proposalHash).toMatch(/^[a-f0-9]{64}$/);
      return false;
    });

    const result = await new TaskLifecycleManager(persistence).executeTask(task, context, {
      onStepApprovalRequired,
      onTaskCancelled,
    });

    expect(result.status).toBe('cancelled');
    expect(step.status).toBe('rejected');
    expect(executeStepMock).not.toHaveBeenCalled();
    expect(context.fileSystemService.writeFile).not.toHaveBeenCalled();
    expect(transitions).toContain('awaiting_approval');
    expect(terminals).toEqual(['cancelled']);
    expect(terminalOutcomes[0]).toMatchObject({ reasonCode: 'approval_rejected' });
    expect(onTaskCancelled).toHaveBeenCalledWith(
      task,
      'Approval was rejected; no workspace mutation was applied.'
    );
  });

  it('cancels and aborts an unresolved approval after the deadline', async () => {
    vi.useFakeTimers();
    const step = makeStep({ type: 'write_file', params: { filePath: 'a.ts', content: 'x' } });
    const task = makeTask(step);
    const context = makeContext(task);
    const { persistence, terminalOutcomes } = makePersistence();
    let signal: AbortSignal | undefined;
    let notifyStarted: (() => void) | undefined;
    const started = new Promise<void>(resolve => {
      notifyStarted = resolve;
    });
    const callback = vi.fn(
      async (_step: AgentStep, _request: ApprovalRequest, approvalSignal?: AbortSignal) => {
        signal = approvalSignal;
        notifyStarted?.();
        return await new Promise<boolean>(() => undefined);
      }
    );

    const running = new TaskLifecycleManager(persistence).executeTask(task, context, {
      onStepApprovalRequired: callback,
    });
    await started;
    await vi.advanceTimersByTimeAsync(120_000);
    const result = await running;

    expect(signal?.aborted).toBe(true);
    expect(result.status).toBe('cancelled');
    expect(terminalOutcomes[0]).toMatchObject({
      reasonCode: 'approval_timed_out',
      event: { eventType: 'approval_timed_out', proposalId: expect.any(String) },
    });
    expect(executeStepMock).not.toHaveBeenCalled();
    expect(context.fileSystemService.writeFile).not.toHaveBeenCalled();
  });
});

describe('TaskLifecycleManager terminal handling', () => {
  it('fails immediately when a mutation executor returns failure before maxRetries', async () => {
    const step = makeStep();
    const task = makeTask(step);
    const context = makeContext(task);
    const { persistence, terminals, terminalOutcomes } = makePersistence();
    executeStepMock.mockResolvedValueOnce({ success: false, message: 'write validation failed' });

    const result = await new TaskLifecycleManager(persistence).executeTask(task, context);

    expect(result.status).toBe('failed');
    expect(result.error).toContain('write validation failed');
    expect(terminals).toEqual(['failed']);
    expect(terminalOutcomes[0]).toMatchObject({ reasonCode: 'step_failed' });
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.metadata?.executionTimeMs).toBeTypeOf('number');
  });

  it('persists completion after a planned final synthesis without requesting redundant auto-synthesis', async () => {
    const analysisStep = makeStep({
      type: 'analyze_code',
      params: { filePath: 'src/index.ts' },
    });
    analysisStep.id = 'step-analysis';
    const synthesisStep = makeStep({
      type: 'generate_code',
      params: { description: 'Synthesize the completed file analysis into a final review.' },
    });
    synthesisStep.id = 'step-synthesis';
    synthesisStep.order = 2;
    const task = makeTask(analysisStep);
    task.steps = [analysisStep, synthesisStep];
    const context = makeContext(task);
    const { persistence, terminals, terminalOutcomes } = makePersistence();
    const onTaskComplete = vi.fn();
    executeStepMock.mockImplementation(async (step: AgentStep) => {
      const result = {
        success: true,
        message: 'done',
        data: {
          generatedCode:
            step.id === analysisStep.id
              ? 'The implementation is readable.'
              : 'Final review: no changes are required.',
        },
      };
      step.status = 'completed';
      step.result = result;
      return result;
    });

    const result = await new TaskLifecycleManager(persistence).executeTask(task, context, {
      onTaskComplete,
    });

    expect(context.aiService.sendContextualMessage).not.toHaveBeenCalled();
    expect(result.status).toBe('completed');
    expect(terminals).toEqual(['completed']);
    expect(terminalOutcomes[0]).toMatchObject({
      summary: 'Final review: no changes are required.',
      reasonCode: 'completed',
    });
    expect(result.finalReport).toBe('Final review: no changes are required.');
    expect(onTaskComplete).toHaveBeenCalledOnce();
    expect(onTaskComplete).toHaveBeenCalledWith(result);
  });

  it('does not complete when display synthesis and execution evidence are empty', async () => {
    const synthesisStep = makeStep({
      type: 'generate_code',
      params: { displayOnly: true, description: 'Produce the final report.' },
    });
    const task = makeTask(synthesisStep);
    const context = makeContext(task);
    const { persistence, terminals, terminalOutcomes } = makePersistence();
    const onTaskComplete = vi.fn();
    const onTaskError = vi.fn();
    executeStepMock.mockImplementationOnce(async (step: AgentStep) => {
      const result = {
        success: true,
        message: '   ',
        data: { generatedCode: '   ', isSynthesis: true },
      };
      step.status = 'completed';
      step.result = result;
      return result;
    });

    const result = await new TaskLifecycleManager(persistence).executeTask(task, context, {
      onTaskComplete,
      onTaskError,
    });

    expect(result.status).toBe('failed');
    expect(result.finalReport).toBeUndefined();
    expect(terminals).toEqual(['failed']);
    expect(terminalOutcomes[0]).toMatchObject({ reasonCode: 'final_output_missing' });
    expect(onTaskComplete).not.toHaveBeenCalled();
    expect(onTaskError).toHaveBeenCalledOnce();
  });

  it('uses deterministic completed-step evidence when synthesis is unavailable', async () => {
    const task = makeTask();
    const context = makeContext(task);
    const { persistence, terminalOutcomes } = makePersistence();

    const result = await new TaskLifecycleManager(persistence).executeTask(task, context);

    expect(result.status).toBe('completed');
    expect(result.finalReport).toBe('Completed execution evidence:\n\nStep: done');
    expect(terminalOutcomes[0]?.summary).toBe(result.finalReport);
  });

  it('resumes an awaiting-approval checkpoint at the same step', async () => {
    const step = makeStep();
    step.status = 'awaiting_approval';
    const task = makeTask(step);
    task.status = 'awaiting_approval';
    const persistedTask: PersistedTask = {
      id: task.id,
      originalTask: task,
      currentStepIndex: 0,
      completedSteps: [],
      timestamp: new Date(),
      metadata: {
        userRequest: task.userRequest,
        workspaceRoot: '/ws',
        totalSteps: 1,
        completedStepsCount: 0,
      },
    };
    const { persistence } = makePersistence(persistedTask);
    const context = makeContext(task);

    const result = await new TaskLifecycleManager(persistence).resumeTask(task.id, context);

    expect(executeStepMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: step.id }),
      context,
      undefined
    );
    expect(result?.status).toBe('completed');
  });

  it('never mutates files during automatic rollback', async () => {
    const task = makeTask();
    const context = makeContext(task);
    const { persistence } = makePersistence();

    const result = await new TaskLifecycleManager(persistence).rollbackTask(task, context);

    expect(result).toMatchObject({ success: false, filesRestored: [] });
    expect(result.error).toMatch(/new diff approval/i);
    expect(context.fileSystemService.deleteFile).not.toHaveBeenCalled();
  });
});
