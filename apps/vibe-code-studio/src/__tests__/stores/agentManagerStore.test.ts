/**
 * agentManagerStore tests — spec 10 Phase 1 store. All actions: panel
 * open/toggle, upsert (append-once ordering + snapshot copies), setTasks
 * reset, selectTask, setInbox, reset.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { InboxEntry } from '../../services/agentManager/inbox';
import type { BackgroundTask } from '../../services/BackgroundAgentSystem';
import { useAgentManagerStore } from '../../stores/agentManagerStore';

const makeTask = (overrides: Partial<BackgroundTask> = {}): BackgroundTask => ({
  id: 'task-1',
  agentId: 'agent-manager',
  userRequest: 'do work',
  workspaceRoot: 'V:\\ws',
  parameters: {},
  status: 'pending',
  ...overrides,
});

const entry: InboxEntry = {
  id: 'msg-1',
  taskId: 'task-1',
  kind: 'queued',
  summary: 'hello agent',
  at: 1_000,
};

const state = () => useAgentManagerStore.getState();

beforeEach(() => {
  state().actions.reset();
  state().actions.setPanelOpen(false);
  state().actions.selectTask(null);
});

describe('agentManagerStore', () => {
  it('starts empty', () => {
    expect(state().tasksById).toEqual({});
    expect(state().order).toEqual([]);
    expect(state().inbox).toEqual([]);
    expect(state().selectedTaskId).toBeNull();
    expect(state().panelOpen).toBe(false);
  });

  it('setPanelOpen and togglePanel drive panel visibility', () => {
    state().actions.setPanelOpen(true);
    expect(state().panelOpen).toBe(true);
    state().actions.togglePanel();
    expect(state().panelOpen).toBe(false);
    state().actions.togglePanel();
    expect(state().panelOpen).toBe(true);
  });

  it('upsertTask appends a new task to order exactly once', () => {
    const task = makeTask();
    state().actions.upsertTask(task);
    expect(state().order).toEqual(['task-1']);
    expect(state().tasksById['task-1']).toEqual(task);
  });

  it('upsertTask stores a snapshot copy, not the live reference', () => {
    const task = makeTask();
    state().actions.upsertTask(task);
    task.userRequest = 'mutated';
    expect(state().tasksById['task-1']!.userRequest).toBe('do work');
  });

  it('upsertTask updates an existing task in place without duplicating order', () => {
    state().actions.upsertTask(makeTask());
    state().actions.upsertTask(makeTask({ status: 'running', progress: 50 }));
    expect(state().order).toEqual(['task-1']);
    expect(state().tasksById['task-1']!.status).toBe('running');
    expect(state().tasksById['task-1']!.progress).toBe(50);
  });

  it('setTasks resets ordering and snapshots every task', () => {
    state().actions.upsertTask(makeTask({ id: 'old' }));
    const t1 = makeTask({ id: 't1' });
    const t2 = makeTask({ id: 't2', status: 'running' });

    state().actions.setTasks([t1, t2]);

    expect(state().order).toEqual(['t1', 't2']);
    expect(state().tasksById['old']).toBeUndefined();
    t2.status = 'completed';
    expect(state().tasksById['t2']!.status).toBe('running');
  });

  it('selectTask sets and clears the selection', () => {
    state().actions.selectTask('task-1');
    expect(state().selectedTaskId).toBe('task-1');
    state().actions.selectTask(null);
    expect(state().selectedTaskId).toBeNull();
  });

  it('setInbox replaces the inbox', () => {
    state().actions.setInbox([entry]);
    expect(state().inbox).toEqual([entry]);
    state().actions.setInbox([]);
    expect(state().inbox).toEqual([]);
  });

  it('reset clears tasks, order, inbox and selection but not panelOpen', () => {
    state().actions.setPanelOpen(true);
    state().actions.upsertTask(makeTask());
    state().actions.selectTask('task-1');
    state().actions.setInbox([entry]);

    state().actions.reset();

    expect(state().tasksById).toEqual({});
    expect(state().order).toEqual([]);
    expect(state().inbox).toEqual([]);
    expect(state().selectedTaskId).toBeNull();
    expect(state().panelOpen).toBe(true);
  });
});
