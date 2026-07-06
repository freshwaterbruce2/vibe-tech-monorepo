/**
 * agentManagerIntegration tests — spec 10 Phase 1 wiring. Uses a REAL
 * BackgroundAgentSystem (stub engine/planner; execution never starts because
 * submit() is only exercised through spies) and drives the subscription with
 * direct emits on its real EventEmitter surface. Covers store seeding, all
 * nine task events, inbox derivation, StrictMode-safe idempotency, and the
 * start/reply/cancel/dismiss operations.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelTask,
  dismissInboxEntry,
  initAgentManager,
  replyToTask,
  resetAgentManagerForTests,
  startAgent,
} from '../../../services/agentManager/agentManagerIntegration';
import type { InboxEntry } from '../../../services/agentManager/inbox';
import type { ExecutionEngine } from '../../../services/ai/ExecutionEngine';
import type { TaskPlanner } from '../../../services/ai/TaskPlanner';
import type { BackgroundTask, InjectedMessage } from '../../../services/BackgroundAgentSystem';
import { BackgroundAgentSystem } from '../../../services/BackgroundAgentSystem';
import { useAgentManagerStore } from '../../../stores/agentManagerStore';

const makeSystem = (): BackgroundAgentSystem =>
  new BackgroundAgentSystem(
    { executeTask: vi.fn() } as unknown as ExecutionEngine,
    { planTask: vi.fn() } as unknown as TaskPlanner
  );

const makeTask = (overrides: Partial<BackgroundTask> = {}): BackgroundTask => ({
  id: 'task-1',
  agentId: 'agent-manager',
  userRequest: 'do work',
  workspaceRoot: 'V:\\ws',
  parameters: {},
  status: 'pending',
  ...overrides,
});

const makeMessage = (overrides: Partial<InjectedMessage> = {}): InjectedMessage => ({
  id: 'msg-1',
  taskId: 'task-1',
  body: 'hello agent',
  queuedAt: 1_000,
  ...overrides,
});

const queuedEntry = (id: string, taskId: string, kind: InboxEntry['kind']): InboxEntry => ({
  id,
  taskId,
  kind,
  summary: 'summary',
  at: 1,
});

const state = () => useAgentManagerStore.getState();

beforeEach(() => {
  resetAgentManagerForTests();
});

describe('initAgentManager', () => {
  it('seeds the store from the getAllTasks snapshot', () => {
    const system = makeSystem();
    const t1 = makeTask({ id: 't1' });
    const t2 = makeTask({ id: 't2', status: 'running' });
    vi.spyOn(system, 'getAllTasks').mockReturnValue([t1, t2]);

    initAgentManager(system);

    expect(state().order).toEqual(['t1', 't2']);
    expect(state().tasksById['t2']!.status).toBe('running');
    // snapshot, not the live reference
    t1.userRequest = 'mutated';
    expect(state().tasksById['t1']!.userRequest).toBe('do work');
  });

  const TASK_EVENTS: Array<[string, BackgroundTask['status']]> = [
    ['submitted', 'pending'],
    ['started', 'running'],
    ['progress', 'running'],
    ['stepStart', 'running'],
    ['stepComplete', 'running'],
    ['stepError', 'running'],
    ['completed', 'completed'],
    ['failed', 'failed'],
    ['cancelled', 'cancelled'],
  ];

  it.each(TASK_EVENTS)('upserts a task snapshot on "%s"', (event, status) => {
    const system = makeSystem();
    initAgentManager(system);
    const task = makeTask({ id: `task-${event}`, status });

    system.emit(event, task);

    const stored = state().tasksById[task.id]!;
    expect(stored).not.toBe(task);
    expect(stored.status).toBe(status);
    // mutating the emitted task must not leak into the store copy
    task.userRequest = 'mutated after emit';
    expect(state().tasksById[task.id]!.userRequest).toBe('do work');
  });

  it('adds a failed inbox entry on the failed event', () => {
    const system = makeSystem();
    initAgentManager(system);

    system.emit('failed', makeTask({ id: 'tf', status: 'failed', error: new Error('boom') }));

    expect(state().inbox).toHaveLength(1);
    expect(state().inbox[0]).toMatchObject({
      id: 'failed-tf',
      taskId: 'tf',
      kind: 'failed',
      summary: 'boom',
    });
  });

  it('clears queued inbox entries for the task on cancelled', () => {
    const system = makeSystem();
    initAgentManager(system);
    state().actions.setInbox([
      queuedEntry('q-1', 'tc', 'queued'),
      queuedEntry('q-2', 'other', 'queued'),
      queuedEntry('d-1', 'tc', 'dropped'),
    ]);

    system.emit('cancelled', makeTask({ id: 'tc', status: 'cancelled' }));

    expect(state().inbox.map(e => e.id)).toEqual(['q-2', 'd-1']);
    expect(state().tasksById['tc']!.status).toBe('cancelled');
  });

  it('drives the inbox through messageQueued → messageInjected → messageDropped', () => {
    const system = makeSystem();
    initAgentManager(system);
    const task = makeTask({ id: 'tm', status: 'running' });
    const message = makeMessage({ id: 'm1', taskId: 'tm' });

    system.emit('messageQueued', task, message);
    expect(state().inbox).toEqual([
      { id: 'm1', taskId: 'tm', kind: 'queued', summary: 'hello agent', at: 1_000 },
    ]);
    expect(state().tasksById['tm']).toBeDefined();

    system.emit('messageInjected', task, message);
    expect(state().inbox).toEqual([]);

    system.emit('messageQueued', task, message);
    system.emit('messageDropped', task, message);
    expect(state().inbox).toEqual([
      { id: 'm1', taskId: 'tm', kind: 'dropped', summary: 'hello agent', at: 1_000 },
    ]);
  });

  it('is idempotent for the same system: same disposer, no duplicate handling', () => {
    const system = makeSystem();
    const d1 = initAgentManager(system);
    const d2 = initAgentManager(system);

    expect(d2).toBe(d1);
    expect(system.listenerCount('submitted')).toBe(1);
    expect(system.listenerCount('messageQueued')).toBe(1);

    system.emit('submitted', makeTask({ id: 'once' }));
    expect(state().order).toEqual(['once']);
  });

  it('replaces the subscription when a different system is initialized', () => {
    const systemA = makeSystem();
    const systemB = makeSystem();
    initAgentManager(systemA);
    initAgentManager(systemB);

    expect(systemA.listenerCount('submitted')).toBe(0);
    expect(systemB.listenerCount('submitted')).toBe(1);

    systemA.emit('submitted', makeTask({ id: 'from-a' }));
    expect(state().order).toEqual([]);
    systemB.emit('submitted', makeTask({ id: 'from-b' }));
    expect(state().order).toEqual(['from-b']);
  });

  it('disposer is idempotent and init works again afterwards (StrictMode)', () => {
    const system = makeSystem();
    const dispose = initAgentManager(system);

    dispose();
    dispose();
    expect(system.listenerCount('submitted')).toBe(0);
    expect(system.listenerCount('messageQueued')).toBe(0);
    expect(system.listenerCount('messageInjected')).toBe(0);
    expect(system.listenerCount('messageDropped')).toBe(0);

    system.emit('submitted', makeTask({ id: 'after-dispose' }));
    expect(state().order).toEqual([]);

    const disposeAgain = initAgentManager(system);
    expect(disposeAgain).not.toBe(dispose);
    system.emit('submitted', makeTask({ id: 'after-reinit' }));
    expect(state().order).toEqual(['after-reinit']);
  });
});

describe('startAgent', () => {
  it('returns null on a blank request without submitting', () => {
    const system = makeSystem();
    const submit = vi.spyOn(system, 'submit');
    expect(startAgent(system, '   ', 'V:\\ws')).toBeNull();
    expect(submit).not.toHaveBeenCalled();
  });

  it('returns null without a workspace root', () => {
    const system = makeSystem();
    const submit = vi.spyOn(system, 'submit');
    expect(startAgent(system, 'do x', '')).toBeNull();
    expect(submit).not.toHaveBeenCalled();
  });

  it('trims the request and submits under the agent-manager id', () => {
    const system = makeSystem();
    const submit = vi.spyOn(system, 'submit').mockReturnValue('bg-1');
    expect(startAgent(system, '  do x  ', 'V:\\ws')).toBe('bg-1');
    expect(submit).toHaveBeenCalledWith('agent-manager', 'do x', 'V:\\ws');
  });
});

describe('replyToTask / cancelTask / dismissInboxEntry', () => {
  it('replyToTask delegates to injectMessage', () => {
    const system = makeSystem();
    const message = makeMessage();
    const inject = vi.spyOn(system, 'injectMessage').mockReturnValue(message);
    expect(replyToTask(system, 'task-1', 'hello agent')).toBe(message);
    expect(inject).toHaveBeenCalledWith('task-1', 'hello agent');
  });

  it('cancelTask delegates to cancel', () => {
    const system = makeSystem();
    const cancel = vi.spyOn(system, 'cancel').mockReturnValue(true);
    expect(cancelTask(system, 'task-1')).toBe(true);
    expect(cancel).toHaveBeenCalledWith('task-1');
  });

  it('dismissInboxEntry removes the entry from the store inbox', () => {
    state().actions.setInbox([
      queuedEntry('m1', 't1', 'dropped'),
      queuedEntry('m2', 't1', 'failed'),
    ]);
    dismissInboxEntry('m1');
    expect(state().inbox.map(e => e.id)).toEqual(['m2']);
  });
});
