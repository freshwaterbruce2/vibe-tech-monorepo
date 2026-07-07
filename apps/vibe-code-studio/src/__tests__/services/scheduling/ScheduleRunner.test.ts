/**
 * ScheduleRunner tests — trigger firing, workspace-scope guard (AC #11),
 * missed-run policies, once-completion, recurrence advancement, and run
 * finalization from BackgroundAgentSystem completed/failed events.
 * Uses a fake submitter + injected clock; no real timers beyond vi.useFakeTimers.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduleRunner } from '../../../services/scheduling/ScheduleRunner';
import { ScheduleStore } from '../../../services/scheduling/ScheduleStore';
import type { ScheduleDraft, ScheduleTaskSubmitter } from '../../../services/scheduling/types';

const NOW = new Date(2026, 6, 4, 12, 0, 0).getTime();
const WORKSPACE = 'V:\\monorepo';

type Listener = (...args: unknown[]) => void;

/** Fake BackgroundAgentSystem: records submits, lets tests emit completions */
function makeSubmitter(): ScheduleTaskSubmitter & {
  submits: unknown[][];
  emit: (event: string, payload: unknown) => void;
} {
  const listeners = new Map<string, Set<Listener>>();
  let counter = 0;
  const submits: unknown[][] = [];
  return {
    submits,
    submit: (...args: unknown[]) => {
      submits.push(args);
      return `task-${++counter}`;
    },
    on: (event, listener) => {
      const set = listeners.get(event) ?? new Set();
      set.add(listener);
      listeners.set(event, set);
    },
    off: (event, listener) => {
      listeners.get(event)?.delete(listener);
    },
    emit: (event, payload) => {
      for (const listener of listeners.get(event) ?? []) listener(payload);
    },
  };
}

const draft = (overrides: Partial<ScheduleDraft> = {}): ScheduleDraft => ({
  agentId: 'frontend',
  userRequest: 'run the audit',
  workspaceRoot: WORKSPACE,
  cadence: { type: 'interval', everyMinutes: 60 },
  ...overrides,
});

interface Harness {
  store: ScheduleStore;
  submitter: ReturnType<typeof makeSubmitter>;
  notify: ReturnType<typeof vi.fn>;
  deliver: ReturnType<typeof vi.fn>;
  onSchedulesChanged: ReturnType<typeof vi.fn>;
  runner: ScheduleRunner;
  clock: { nowMs: number };
}

function makeHarness(workspaceRoot: string | null = WORKSPACE): Harness {
  const store = new ScheduleStore();
  const submitter = makeSubmitter();
  const notify = vi.fn();
  const deliver = vi.fn();
  const onSchedulesChanged = vi.fn();
  const clock = { nowMs: NOW };
  const runner = new ScheduleRunner({
    store,
    submitter,
    getWorkspaceRoot: () => workspaceRoot,
    notify,
    deliver,
    onSchedulesChanged,
    now: () => clock.nowMs,
    tickMs: 1000,
  });
  return { store, submitter, notify, deliver, onSchedulesChanged, runner, clock };
}

beforeEach(() => {
  // Drop the global electron mock so ScheduleStore persists via localStorage,
  // which is cleared per test (the mock's backing Map is file-lifetime).
  delete (window as Window & { electron?: unknown }).electron;
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('ScheduleRunner firing', () => {
  it('fires a due schedule with the stored submit arguments', async () => {
    const h = makeHarness();
    await h.store.load(NOW);
    const created = await h.store.create(
      draft({ parameters: { files: ['a.ts'] }, options: { priority: 'high' } }),
      NOW
    );
    await h.store.update(created.id, { nextRunAtMs: NOW - 1 });

    await h.runner.start();

    expect(h.submitter.submits).toHaveLength(1);
    expect(h.submitter.submits[0]).toEqual([
      'frontend',
      'run the audit',
      WORKSPACE,
      { files: ['a.ts'] },
      { priority: 'high' },
    ]);
    const schedule = h.store.get(created.id);
    expect(schedule?.runs[0]?.status).toBe('running');
    expect(schedule?.lastRunAt).toBeDefined();
    expect(schedule?.nextRunAtMs).toBe(NOW + 60 * 60_000);
    h.runner.stop();
  });

  it('does not fire paused or future schedules', async () => {
    const h = makeHarness();
    await h.store.load(NOW);
    const due = await h.store.create(draft(), NOW);
    await h.store.update(due.id, { nextRunAtMs: NOW - 1, status: 'paused' });
    await h.store.create(draft(), NOW); // future (NOW + 60min)

    await h.runner.start();
    expect(h.submitter.submits).toHaveLength(0);
    h.runner.stop();
  });

  it('fires on a later tick when a schedule becomes due', async () => {
    const h = makeHarness();
    await h.store.load(NOW);
    await h.store.create(draft({ cadence: { type: 'interval', everyMinutes: 1 } }), NOW);
    await h.runner.start();
    expect(h.submitter.submits).toHaveLength(0);

    h.clock.nowMs = NOW + 61_000;
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.submitter.submits).toHaveLength(1);
    h.runner.stop();
  });

  it('completes a once schedule after firing and never refires', async () => {
    const h = makeHarness();
    await h.store.load(NOW);
    const runAt = new Date(NOW + 1000).toISOString();
    const created = await h.store.create(draft({ cadence: { type: 'once', runAt } }), NOW);

    await h.runner.start();
    h.clock.nowMs = NOW + 2000;
    await vi.advanceTimersByTimeAsync(1000);

    expect(h.submitter.submits).toHaveLength(1);
    const schedule = h.store.get(created.id);
    expect(schedule?.status).toBe('completed');
    expect(schedule?.nextRunAtMs).toBeNull();

    h.clock.nowMs = NOW + 10_000;
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.submitter.submits).toHaveLength(1);
    h.runner.stop();
  });

  it('start is idempotent', async () => {
    const h = makeHarness();
    await h.runner.start();
    await h.runner.start();
    h.runner.stop();
  });
});

describe('workspace-scope guard (AC #11)', () => {
  it('records a failed run instead of firing against the wrong workspace', async () => {
    const h = makeHarness('D:\\other-repo');
    await h.store.load(NOW);
    const created = await h.store.create(draft(), NOW);
    await h.store.update(created.id, { nextRunAtMs: NOW - 1 });

    await h.runner.start();

    expect(h.submitter.submits).toHaveLength(0);
    const schedule = h.store.get(created.id);
    expect(schedule?.runs[0]?.status).toBe('failed');
    expect(schedule?.runs[0]?.error).toContain('Workspace not open');
    expect(h.notify).toHaveBeenCalledWith(
      'error',
      'Scheduled task skipped',
      expect.stringContaining(WORKSPACE)
    );
    // still advances so it doesn't hot-loop on every tick
    expect(schedule?.nextRunAtMs).toBe(NOW + 60 * 60_000);
    h.runner.stop();
  });
});

describe('missed-run policies', () => {
  it('run-on-launch fires the missed trigger on start', async () => {
    const h = makeHarness();
    await h.store.load(NOW);
    const created = await h.store.create(draft({ missedRunPolicy: 'run-on-launch' }), NOW);
    await h.store.update(created.id, { nextRunAtMs: NOW - 60_000 });

    await h.runner.start();
    expect(h.submitter.submits).toHaveLength(1);
    h.runner.stop();
  });

  it('skip records a skipped run and advances without firing', async () => {
    const h = makeHarness();
    await h.store.load(NOW);
    const created = await h.store.create(draft({ missedRunPolicy: 'skip' }), NOW);
    await h.store.update(created.id, { nextRunAtMs: NOW - 60_000 });

    await h.runner.start();
    expect(h.submitter.submits).toHaveLength(0);
    const schedule = h.store.get(created.id);
    expect(schedule?.runs[0]?.status).toBe('skipped');
    expect(schedule?.nextRunAtMs).toBe(NOW + 60 * 60_000);
    h.runner.stop();
  });
});

describe('run finalization', () => {
  it('marks the run completed and notifies on task completion', async () => {
    const h = makeHarness();
    await h.store.load(NOW);
    const created = await h.store.create(draft(), NOW);
    await h.store.update(created.id, { nextRunAtMs: NOW - 1 });
    await h.runner.start();

    h.clock.nowMs = NOW + 5000;
    h.submitter.emit('completed', { id: 'task-1' });
    await vi.advanceTimersByTimeAsync(0);

    const run = h.store.get(created.id)?.runs[0];
    expect(run?.status).toBe('completed');
    expect(run?.durationMs).toBe(5000);
    expect(h.notify).toHaveBeenCalledWith('success', 'Scheduled task completed', 'run the audit');
    expect(h.deliver).toHaveBeenCalledWith({
      runId: run?.id,
      scheduleId: created.id,
      taskId: 'task-1',
      status: 'completed',
      userRequest: 'run the audit',
      finishedAtMs: NOW + 5000,
    });
    h.runner.stop();
  });

  it('marks the run failed with the task error message', async () => {
    const h = makeHarness();
    await h.store.load(NOW);
    const created = await h.store.create(draft(), NOW);
    await h.store.update(created.id, { nextRunAtMs: NOW - 1 });
    await h.runner.start();

    h.submitter.emit('failed', { id: 'task-1', error: { message: 'boom' } });
    await vi.advanceTimersByTimeAsync(0);

    const run = h.store.get(created.id)?.runs[0];
    expect(run?.status).toBe('failed');
    expect(run?.error).toBe('boom');
    expect(h.notify).toHaveBeenCalledWith('error', 'Scheduled task failed', 'boom');
    expect(h.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: created.id,
        taskId: 'task-1',
        status: 'failed',
        error: 'boom',
      })
    );
    h.runner.stop();
  });

  it('does not deliver to the inbox for tasks it did not submit', async () => {
    const h = makeHarness();
    await h.store.load(NOW);
    const created = await h.store.create(draft(), NOW);
    await h.store.update(created.id, { nextRunAtMs: NOW - 1 });
    await h.runner.start();

    h.submitter.emit('completed', { id: 'someone-elses-task' });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.deliver).not.toHaveBeenCalled();
    h.runner.stop();
  });

  it('ignores tasks it did not submit and events after stop()', async () => {
    const h = makeHarness();
    await h.store.load(NOW);
    const created = await h.store.create(draft(), NOW);
    await h.store.update(created.id, { nextRunAtMs: NOW - 1 });
    await h.runner.start();

    h.submitter.emit('completed', { id: 'someone-elses-task' });
    h.submitter.emit('completed', {}); // no id
    await vi.advanceTimersByTimeAsync(0);
    expect(h.store.get(created.id)?.runs[0]?.status).toBe('running');

    h.runner.stop();
    h.submitter.emit('completed', { id: 'task-1' });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.store.get(created.id)?.runs[0]?.status).toBe('running');
  });
});
