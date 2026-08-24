import { describe, expect, it, vi } from 'vitest';

import { AgentRuntime } from '../../../services/agent-runtime/AgentRuntime';
import type { ExecutionEngine } from '../../../services/ai/ExecutionEngine';
import type { TaskPersistence } from '../../../services/ai/TaskPersistence';
import {
  AgentPlanningCancelledError,
  AgentPlanningError,
  AgentPlanningTimeoutError,
  type TaskPlanner,
} from '../../../services/ai/TaskPlanner';
import type { AgentTask, TaskPlanRequest } from '../../../types';

const request: TaskPlanRequest = {
  userRequest: 'inspect the project',
  context: { workspaceRoot: 'V:\\monorepo', openFiles: [], recentFiles: [] },
};

function makeTask(): AgentTask {
  return {
    id: 'provider-task-id',
    title: 'Inspect',
    description: 'Inspect project',
    userRequest: request.userRequest,
    status: 'awaiting_approval',
    createdAt: new Date(),
    steps: [
      {
        id: 'old-step',
        taskId: 'provider-task-id',
        order: 99,
        title: 'Read',
        description: 'Read manifest',
        action: { type: 'read_file', params: { filePath: 'package.json' } },
        status: 'pending',
        requiresApproval: false,
        retryCount: 0,
        maxRetries: 1,
      },
    ],
  };
}

function setup(planTask: ReturnType<typeof vi.fn>) {
  const recordTransition = vi.fn().mockResolvedValue(undefined);
  const recordTerminalOutcome = vi.fn().mockResolvedValue(undefined);
  const executeTask = vi.fn(async (task: AgentTask) => task);
  const setTaskContext = vi.fn();
  const runtime = new AgentRuntime(
    { planTask } as unknown as TaskPlanner,
    { executeTask, setTaskContext } as unknown as ExecutionEngine,
    { recordTransition, recordTerminalOutcome } as unknown as TaskPersistence
  );
  return { runtime, recordTransition, recordTerminalOutcome, executeTask, setTaskContext };
}

describe('AgentRuntime', () => {
  it('creates a durable planning record before calling the provider', async () => {
    const order: string[] = [];
    const planTask = vi.fn(async () => {
      order.push('provider');
      return { task: makeTask(), reasoning: 'inspect first' };
    });
    const context = setup(planTask);
    context.recordTransition.mockImplementation(async () => {
      order.push('persist');
    });

    const result = await context.runtime.planTask(request);

    expect(order.slice(0, 2)).toEqual(['persist', 'provider']);
    expect(result.task.id).not.toBe('provider-task-id');
    expect(result.task.steps[0]).toMatchObject({ order: 1, taskId: result.task.id });
  });

  it('persists provider planning failures as terminal audit outcomes', async () => {
    const context = setup(vi.fn().mockRejectedValue(new Error('empty structured response')));

    await expect(context.runtime.planTask(request)).rejects.toThrow('empty structured response');

    expect(context.recordTerminalOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error: 'empty structured response' }),
      request.userRequest,
      request.context.workspaceRoot,
      expect.objectContaining({ errorMessage: 'empty structured response' })
    );
  });

  it('does not call the provider when the pre-planning audit write fails', async () => {
    const planTask = vi.fn();
    const context = setup(planTask);
    context.recordTransition.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(context.runtime.planTask(request)).rejects.toThrow('database unavailable');

    expect(planTask).not.toHaveBeenCalled();
    expect(context.recordTerminalOutcome).not.toHaveBeenCalled();
  });

  it('preserves sanitized provider metadata on planning failure', async () => {
    const metadata = {
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-pro',
      requestId: 'generation-123',
      finishReason: 'stop',
      planningProtocol: 'agent_plan_v1' as const,
      responseShape: 'json_schema_content' as const,
      validationSummary: {
        schemaVersion: 1 as const,
        valid: false,
        attemptCount: 2,
        issues: ['steps: required'],
      },
    };
    const context = setup(
      vi.fn().mockRejectedValue(new AgentPlanningError('schema validation failed', metadata))
    );

    await expect(context.runtime.planTask(request)).rejects.toThrow('schema validation failed');

    expect(context.recordTerminalOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', metadata: expect.objectContaining(metadata) }),
      request.userRequest,
      request.context.workspaceRoot,
      expect.objectContaining({ reasonCode: 'planning_failed' })
    );
  });

  it.each([
    [new AgentPlanningTimeoutError({ provider: 'openrouter' }), 'failed', 'planning_timeout'],
    [
      new AgentPlanningCancelledError({ provider: 'openrouter' }),
      'cancelled',
      'planning_cancelled',
    ],
  ] as const)(
    'persists terminal planning classification for %s',
    async (error, status, reasonCode) => {
      const context = setup(vi.fn().mockRejectedValue(error));
      await expect(context.runtime.planTask(request)).rejects.toBe(error);
      expect(context.recordTerminalOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          status,
          metadata: expect.objectContaining({ provider: 'openrouter' }),
        }),
        request.userRequest,
        request.context.workspaceRoot,
        expect.objectContaining({
          reasonCode,
          modelMetadata: expect.objectContaining({ provider: 'openrouter' }),
        })
      );
    }
  );

  it('executes through the shared engine with the exact workspace root', async () => {
    const context = setup(vi.fn());
    const task = makeTask();
    await context.runtime.executeTask(task, request.context.workspaceRoot);
    expect(context.setTaskContext).toHaveBeenCalledWith(
      task.userRequest,
      request.context.workspaceRoot
    );
    expect(context.executeTask).toHaveBeenCalledWith(task, undefined);
  });
});
