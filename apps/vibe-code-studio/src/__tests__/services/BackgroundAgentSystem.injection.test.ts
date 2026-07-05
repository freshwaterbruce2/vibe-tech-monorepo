/**
 * BackgroundAgentSystem mid-run message injection (spec 09 Phase 2 primitive).
 * Covers injectMessage() queueing semantics, the drain at the next step
 * boundary (never preempting an in-flight step), and drop-on-finish/cancel.
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExecutionCallbacks, ExecutionEngine } from '../../services/ai/ExecutionEngine';
import type { TaskPlanner } from '../../services/ai/TaskPlanner';
import type { BackgroundTask, InjectedMessage } from '../../services/BackgroundAgentSystem';
import { BackgroundAgentSystem } from '../../services/BackgroundAgentSystem';
import type { AgentStep, AgentTask } from '../../types';

function makeStep(order: number, params: Record<string, unknown> = {}): AgentStep {
  return {
    id: `step-${order}`,
    taskId: 'plan-task',
    order,
    title: `Step ${order}`,
    description: `Step ${order} description`,
    action: { type: 'generate_code', params: { ...params } },
    status: 'pending',
    requiresApproval: false,
    retryCount: 0,
    maxRetries: 0,
  };
}

function makePlanner(steps: AgentStep[]): TaskPlanner {
  return {
    planTask: vi.fn(async () => ({
      task: { id: 'plan-task', steps } as unknown as AgentTask,
    })),
  } as unknown as TaskPlanner;
}

/** Engine that drives the full callback surface with a yield per step */
function makeEngine(): ExecutionEngine {
  return {
    executeTask: vi.fn(async (agentTask: AgentTask, callbacks?: ExecutionCallbacks) => {
      let completed = 0;
      for (const step of agentTask.steps) {
        callbacks?.onStepStart?.(step);
        await Promise.resolve();
        callbacks?.onStepComplete?.(step, { success: true, message: 'ok' });
        completed += 1;
        callbacks?.onTaskProgress?.(completed, agentTask.steps.length);
      }
      callbacks?.onTaskComplete?.(agentTask);
      return agentTask;
    }),
  } as unknown as ExecutionEngine;
}

function injectedParams(step: AgentStep): unknown {
  return step.action.params.injectedUserMessages;
}

describe('BackgroundAgentSystem.injectMessage', () => {
  let steps: AgentStep[];
  let system: BackgroundAgentSystem;

  beforeEach(() => {
    steps = [makeStep(1), makeStep(2)];
    system = new BackgroundAgentSystem(makeEngine(), makePlanner(steps));
  });

  it('returns null for an unknown task', () => {
    expect(system.injectMessage('missing-task', 'hello')).toBeNull();
  });

  it('returns null for a blank body', () => {
    const taskId = system.submit('agent', 'do work', '/ws');
    expect(system.injectMessage(taskId, '   ')).toBeNull();
  });

  it('queues on an active task, trims the body, and emits messageQueued', async () => {
    const queued: Array<[BackgroundTask, InjectedMessage]> = [];
    system.on('messageQueued', (task: BackgroundTask, message: InjectedMessage) => {
      queued.push([task, message]);
    });

    const taskId = system.submit('agent', 'do work', '/ws');
    const message = system.injectMessage(taskId, '  hello agent  ');

    expect(message).not.toBeNull();
    expect(message!.body).toBe('hello agent');
    expect(message!.taskId).toBe(taskId);
    expect(queued).toHaveLength(1);
    expect(queued[0]![0].id).toBe(taskId);
    expect(queued[0]![1]).toBe(message);
    await system.waitFor(taskId);
  });

  it('returns null once the task has finished', async () => {
    const taskId = system.submit('agent', 'do work', '/ws');
    await system.waitFor(taskId);
    expect(system.injectMessage(taskId, 'too late')).toBeNull();
  });

  it('folds a queued message into the next step params and emits messageInjected', async () => {
    const injected: InjectedMessage[] = [];
    system.on('messageInjected', (_task: BackgroundTask, message: InjectedMessage) => {
      injected.push(message);
    });

    const taskId = system.submit('agent', 'do work', '/ws');
    const message = system.injectMessage(taskId, 'use the shared helper');
    await system.waitFor(taskId);

    expect(injectedParams(steps[0]!)).toEqual(['use the shared helper']);
    expect(injectedParams(steps[1]!)).toBeUndefined();
    expect(injected).toEqual([message]);
  });

  it('appends to pre-existing injectedUserMessages params', async () => {
    steps = [makeStep(1, { injectedUserMessages: ['earlier note'] })];
    system = new BackgroundAgentSystem(makeEngine(), makePlanner(steps));

    const taskId = system.submit('agent', 'do work', '/ws');
    system.injectMessage(taskId, 'later note');
    await system.waitFor(taskId);

    expect(injectedParams(steps[0]!)).toEqual(['earlier note', 'later note']);
  });

  it('stamps every step with the BackgroundTask id at the step boundary (spec 11)', async () => {
    steps = [makeStep(1), makeStep(2, { backgroundTaskId: 'preset-id' })];
    system = new BackgroundAgentSystem(makeEngine(), makePlanner(steps));

    const taskId = system.submit('agent', 'do work', '/ws');
    await system.waitFor(taskId);

    expect(steps[0]!.action.params.backgroundTaskId).toBe(taskId);
    // ??= never overwrites a value already present
    expect(steps[1]!.action.params.backgroundTaskId).toBe('preset-id');
  });

  it('delivers a mid-step message at the NEXT step boundary (no preemption)', async () => {
    const taskId = system.submit('agent', 'do work', '/ws');
    system.on('stepStart', (task: BackgroundTask, step: AgentStep) => {
      if (task.id === taskId && step.order === 1) {
        system.injectMessage(taskId, 'course correction');
      }
    });
    await system.waitFor(taskId);

    expect(injectedParams(steps[0]!)).toBeUndefined();
    expect(injectedParams(steps[1]!)).toEqual(['course correction']);
  });

  it('drops messages still queued when the task completes', async () => {
    const dropped: InjectedMessage[] = [];
    const injected: InjectedMessage[] = [];
    system.on('messageDropped', (_task: BackgroundTask, message: InjectedMessage) => {
      dropped.push(message);
    });
    system.on('messageInjected', (_task: BackgroundTask, message: InjectedMessage) => {
      injected.push(message);
    });

    const taskId = system.submit('agent', 'do work', '/ws');
    system.on('stepStart', (task: BackgroundTask, step: AgentStep) => {
      if (task.id === taskId && step.order === 2) {
        system.injectMessage(taskId, 'arrives during the last step');
      }
    });
    await system.waitFor(taskId);

    expect(injected).toHaveLength(0);
    expect(dropped).toHaveLength(1);
    expect(dropped[0]!.body).toBe('arrives during the last step');
  });

  it('drops queued messages when a pending task is cancelled', () => {
    // maxConcurrent 0 keeps every submitted task pending
    const idle = new BackgroundAgentSystem(makeEngine(), makePlanner(steps), 0);
    const dropped: InjectedMessage[] = [];
    idle.on('messageDropped', (_task: BackgroundTask, message: InjectedMessage) => {
      dropped.push(message);
    });

    const taskId = idle.submit('agent', 'do work', '/ws');
    const message = idle.injectMessage(taskId, 'queued while pending');
    expect(message).not.toBeNull();
    expect(idle.cancel(taskId)).toBe(true);
    expect(dropped).toEqual([message]);
  });

  it('waitFor ignores other tasks settling and rejects on timeout', async () => {
    // Engine that never settles, so the waited-on task stays running
    const stuckEngine = {
      executeTask: vi.fn(() => new Promise<AgentTask>(() => undefined)),
    } as unknown as ExecutionEngine;
    const stuck = new BackgroundAgentSystem(stuckEngine, makePlanner(steps));

    const watchedId = stuck.submit('agent', 'never finishes', '/ws');
    const waitPromise = stuck.waitFor(watchedId, 30);

    // Settling a DIFFERENT task must not resolve the wait (id guard)
    const otherId = stuck.submit('agent-2', 'other work', '/ws');
    expect(stuck.cancel(otherId)).toBe(true);

    await expect(waitPromise).rejects.toThrow('Task timeout');
  });

  it('drops queued messages when a running task is cancelled', async () => {
    let releaseRun: (task: AgentTask) => void = () => undefined;
    const blockedEngine = {
      executeTask: vi.fn(
        (agentTask: AgentTask) =>
          new Promise<AgentTask>(resolve => {
            releaseRun = () => resolve(agentTask);
          })
      ),
    } as unknown as ExecutionEngine;
    const blocked = new BackgroundAgentSystem(blockedEngine, makePlanner(steps));
    const dropped: InjectedMessage[] = [];
    blocked.on('messageDropped', (_task: BackgroundTask, message: InjectedMessage) => {
      dropped.push(message);
    });

    const taskId = blocked.submit('agent', 'do work', '/ws');
    // Let planning finish so the engine's (blocked) execution is in flight
    await new Promise(resolve => setTimeout(resolve, 0));
    const message = blocked.injectMessage(taskId, 'never delivered');
    expect(blocked.cancel(taskId)).toBe(true);
    expect(dropped).toEqual([message]);

    releaseRun({ id: 'plan-task', steps } as unknown as AgentTask);
    await blocked.waitFor(taskId);
  });
});

describe('BackgroundAgentSystem execution lifecycle', () => {
  let steps: AgentStep[];
  let system: BackgroundAgentSystem;

  beforeEach(() => {
    steps = [makeStep(1), makeStep(2)];
    system = new BackgroundAgentSystem(makeEngine(), makePlanner(steps));
  });

  it('mirrors engine step errors and marks the task failed', async () => {
    const boom = new Error('exploded');
    const failingEngine = {
      executeTask: vi.fn(async (agentTask: AgentTask, callbacks?: ExecutionCallbacks) => {
        const step = agentTask.steps[0]!;
        callbacks?.onStepStart?.(step);
        callbacks?.onStepError?.(step, boom);
        callbacks?.onTaskError?.(agentTask, boom);
        throw boom;
      }),
    } as unknown as ExecutionEngine;
    const sys = new BackgroundAgentSystem(failingEngine, makePlanner(steps));
    const stepErrors: unknown[] = [];
    sys.on('stepError', (...args: unknown[]) => stepErrors.push(args[2]));

    const id = sys.submit('agent', 'boom', '/ws');
    const done = await sys.waitFor(id);

    expect(done.status).toBe('failed');
    expect(done.error).toBe(boom);
    expect(stepErrors).toEqual([boom]);
  });

  it('requeues a failed task when retryOnFailure is configured', async () => {
    let attempts = 0;
    const flakyEngine = {
      executeTask: vi.fn(async (agentTask: AgentTask, callbacks?: ExecutionCallbacks) => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error('first attempt fails');
        }
        for (const step of agentTask.steps) {
          callbacks?.onStepStart?.(step);
          callbacks?.onStepComplete?.(step, { success: true, message: 'ok' });
        }
        return agentTask;
      }),
    } as unknown as ExecutionEngine;
    const sys = new BackgroundAgentSystem(flakyEngine, makePlanner(steps));
    const completed = new Promise<BackgroundTask>(resolve => {
      sys.on('completed', (task: BackgroundTask) => resolve(task));
    });

    sys.submit('agent', 'flaky', '/ws', {}, { retryOnFailure: true, maxRetries: 3 });
    const done = await completed;

    expect(attempts).toBe(2);
    expect(done.status).toBe('completed');
  });

  it('cancel returns false for unknown or finished tasks', async () => {
    expect(system.cancel('missing-task')).toBe(false);
    const id = system.submit('agent', 'do work', '/ws');
    await system.waitFor(id);
    expect(system.cancel(id)).toBe(false);
  });

  it('waitFor with a timeout still resolves normally on completion', async () => {
    const id = system.submit('agent', 'do work', '/ws');
    const done = await system.waitFor(id, 5000);
    expect(done.status).toBe('completed');
  });

  it('sorts the pending queue by priority and reports stats', () => {
    const idle = new BackgroundAgentSystem(makeEngine(), makePlanner(steps), 0);
    idle.submit('agent', 'low prio', '/ws', {}, { priority: 'low' });
    idle.submit('agent', 'high prio', '/ws', {}, { priority: 'high' });

    const stats = idle.getStats();
    expect(stats.pending).toBe(2);
    expect(stats.total).toBe(2);
    expect(stats.running).toBe(0);
  });
});
