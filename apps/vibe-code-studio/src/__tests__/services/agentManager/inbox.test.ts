/**
 * inbox reducer tests — spec 10 Phase 1 (Agent Manager). Pure reducers,
 * every branch: idempotent adds, delivery resolution, dropped upgrade vs
 * add-missing, failure summary fallback, cancellation sweep, dismissal.
 */
import { describe, expect, it } from 'vitest';
import type { InboxEntry } from '../../../services/agentManager/inbox';
import {
  addFailed,
  addQueued,
  addScheduleRun,
  clearQueuedForTask,
  dismissEntry,
  markDropped,
  resolveInjected,
} from '../../../services/agentManager/inbox';
import type { BackgroundTask, InjectedMessage } from '../../../services/BackgroundAgentSystem';
import type { ScheduleRunDelivery } from '../../../services/scheduling/types';

const makeMessage = (overrides: Partial<InjectedMessage> = {}): InjectedMessage => ({
  id: 'msg-1',
  taskId: 'task-1',
  body: 'hello agent',
  queuedAt: 1_000,
  ...overrides,
});

const makeTask = (overrides: Partial<BackgroundTask> = {}): BackgroundTask => ({
  id: 'task-1',
  agentId: 'agent-manager',
  userRequest: 'do work',
  workspaceRoot: 'V:\\ws',
  parameters: {},
  status: 'failed',
  ...overrides,
});

const entry = (overrides: Partial<InboxEntry> = {}): InboxEntry => ({
  id: 'msg-1',
  taskId: 'task-1',
  kind: 'queued',
  summary: 'hello agent',
  at: 1_000,
  ...overrides,
});

describe('addQueued', () => {
  it('appends a queued entry mapped from the message', () => {
    const result = addQueued([], makeMessage());
    expect(result).toEqual([
      { id: 'msg-1', taskId: 'task-1', kind: 'queued', summary: 'hello agent', at: 1_000 },
    ]);
  });

  it('is idempotent per message id (returns the same array)', () => {
    const entries = addQueued([], makeMessage());
    const again = addQueued(entries, makeMessage());
    expect(again).toBe(entries);
    expect(again).toHaveLength(1);
  });

  it('does not mutate the input array', () => {
    const entries: InboxEntry[] = [];
    addQueued(entries, makeMessage());
    expect(entries).toHaveLength(0);
  });
});

describe('resolveInjected', () => {
  it('removes only the delivered message id', () => {
    const entries = [entry(), entry({ id: 'msg-2', summary: 'other' })];
    const result = resolveInjected(entries, makeMessage());
    expect(result).toEqual([entry({ id: 'msg-2', summary: 'other' })]);
  });

  it('is a no-op for an unknown id', () => {
    const entries = [entry()];
    expect(resolveInjected(entries, makeMessage({ id: 'missing' }))).toEqual(entries);
  });
});

describe('markDropped', () => {
  it('upgrades an existing entry to dropped in place', () => {
    const entries = [entry(), entry({ id: 'msg-2' })];
    const result = markDropped(entries, makeMessage());
    expect(result[0]).toEqual(entry({ kind: 'dropped' }));
    expect(result[1]).toEqual(entry({ id: 'msg-2' }));
    expect(result).toHaveLength(2);
  });

  it('adds a dropped entry when the message is missing', () => {
    const result = markDropped([entry({ id: 'msg-2' })], makeMessage());
    expect(result).toEqual([
      entry({ id: 'msg-2' }),
      { id: 'msg-1', taskId: 'task-1', kind: 'dropped', summary: 'hello agent', at: 1_000 },
    ]);
  });
});

describe('addFailed', () => {
  it('adds a failed entry using error.message', () => {
    const task = makeTask({ error: new Error('boom') });
    const result = addFailed([], task, 2_000);
    expect(result).toEqual([
      { id: 'failed-task-1', taskId: 'task-1', kind: 'failed', summary: 'boom', at: 2_000 },
    ]);
  });

  it('falls back to "<agentId> failed" when there is no error', () => {
    const result = addFailed([], makeTask(), 2_000);
    expect(result[0]!.summary).toBe('agent-manager failed');
  });

  it('is idempotent per task (returns the same array)', () => {
    const entries = addFailed([], makeTask({ error: new Error('boom') }), 2_000);
    const again = addFailed(entries, makeTask({ error: new Error('boom again') }), 3_000);
    expect(again).toBe(entries);
    expect(again).toHaveLength(1);
  });
});

describe('addScheduleRun (spec 16 AC #5)', () => {
  const makeDelivery = (overrides: Partial<ScheduleRunDelivery> = {}): ScheduleRunDelivery => ({
    runId: 'run-1',
    scheduleId: 'sched-1',
    taskId: 'task-1',
    status: 'completed',
    userRequest: 'run the audit',
    finishedAtMs: 5_000,
    ...overrides,
  });

  it('adds a schedule-completed entry summarizing the request', () => {
    const result = addScheduleRun([], makeDelivery());
    expect(result).toEqual([
      {
        id: 'schedule-run-run-1',
        taskId: 'task-1',
        kind: 'schedule-completed',
        summary: 'run the audit',
        at: 5_000,
      },
    ]);
  });

  it('adds a schedule-failed entry with the error appended', () => {
    const result = addScheduleRun([], makeDelivery({ status: 'failed', error: 'boom' }));
    expect(result[0]).toEqual({
      id: 'schedule-run-run-1',
      taskId: 'task-1',
      kind: 'schedule-failed',
      summary: 'run the audit — boom',
      at: 5_000,
    });
  });

  it('falls back to the request when a failed run has no error', () => {
    const result = addScheduleRun([], makeDelivery({ status: 'failed' }));
    expect(result[0]!.kind).toBe('schedule-failed');
    expect(result[0]!.summary).toBe('run the audit');
  });

  it('is idempotent per run id (returns the same array)', () => {
    const entries = addScheduleRun([], makeDelivery());
    const again = addScheduleRun(entries, makeDelivery({ status: 'failed', error: 'later' }));
    expect(again).toBe(entries);
    expect(again).toHaveLength(1);
  });

  it('does not mutate the input array', () => {
    const entries: InboxEntry[] = [];
    addScheduleRun(entries, makeDelivery());
    expect(entries).toHaveLength(0);
  });
});

describe('clearQueuedForTask', () => {
  it('removes only the queued entries of the given task', () => {
    const entries = [
      entry({ id: 'q-1', taskId: 'task-1', kind: 'queued' }),
      entry({ id: 'q-2', taskId: 'task-2', kind: 'queued' }),
      entry({ id: 'd-1', taskId: 'task-1', kind: 'dropped' }),
      entry({ id: 'f-1', taskId: 'task-1', kind: 'failed' }),
    ];
    const result = clearQueuedForTask(entries, 'task-1');
    expect(result.map(e => e.id)).toEqual(['q-2', 'd-1', 'f-1']);
  });
});

describe('dismissEntry', () => {
  it('removes the entry with the given id', () => {
    const entries = [entry(), entry({ id: 'msg-2' })];
    expect(dismissEntry(entries, 'msg-1')).toEqual([entry({ id: 'msg-2' })]);
  });

  it('is a no-op for an unknown id', () => {
    const entries = [entry()];
    expect(dismissEntry(entries, 'missing')).toEqual(entries);
  });
});
