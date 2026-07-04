/**
 * schedulerIntegration tests — singleton lifecycle, UI-store syncing on every
 * mutation, resume recomputing the next trigger, and the AC #12 submit
 * preview.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildSubmitPreview,
  createSchedule,
  deleteSchedule,
  initScheduling,
  pauseSchedule,
  resetSchedulingForTests,
  resumeSchedule,
  runScheduleAction,
} from '../../../services/scheduling/schedulerIntegration';
import type { ScheduleDraft, ScheduleTaskSubmitter } from '../../../services/scheduling/types';
import { useSchedulesStore } from '../../../stores/schedulesStore';

const submitter: ScheduleTaskSubmitter = {
  submit: vi.fn(() => 'task-1'),
  on: vi.fn(),
  off: vi.fn(),
};

const draft = (overrides: Partial<ScheduleDraft> = {}): ScheduleDraft => ({
  agentId: 'frontend',
  userRequest: 'run the audit',
  workspaceRoot: 'V:\\monorepo',
  cadence: { type: 'interval', everyMinutes: 60 },
  ...overrides,
});

async function init(): Promise<void> {
  await initScheduling({
    submitter,
    getWorkspaceRoot: () => 'V:\\monorepo',
    notify: vi.fn(),
  });
}

beforeEach(() => {
  // The global mockElectron store Map persists across tests within a file and
  // ScheduleStore prefers window.electron.store over localStorage — drop the
  // mock so persistence goes through localStorage, which each test clears.
  delete (window as Window & { electron?: unknown }).electron;
  localStorage.clear();
  useSchedulesStore.setState({ schedules: [], panelOpen: false });
});

afterEach(() => {
  resetSchedulingForTests();
  localStorage.clear();
});

describe('initScheduling', () => {
  it('is idempotent — a second init returns the same runner', async () => {
    const first = await initScheduling({
      submitter,
      getWorkspaceRoot: () => null,
      notify: vi.fn(),
    });
    const second = await initScheduling({
      submitter,
      getWorkspaceRoot: () => null,
      notify: vi.fn(),
    });
    expect(second).toBe(first);
  });

  it('syncs persisted schedules into the UI store on init', async () => {
    localStorage.setItem(
      'vcs_agent_schedules',
      JSON.stringify([
        {
          id: 's-1',
          agentId: 'backend',
          userRequest: 'nightly',
          workspaceRoot: 'V:\\monorepo',
          cadence: { type: 'daily', hour: 2, minute: 0 },
          status: 'paused',
          missedRunPolicy: 'skip',
          nextRunAtMs: null,
          runs: [],
        },
      ])
    );
    await init();
    expect(useSchedulesStore.getState().schedules.map(s => s.id)).toEqual(['s-1']);
  });
});

describe('mutations', () => {
  it('createSchedule adds to the UI store', async () => {
    await init();
    const created = await createSchedule(draft());
    expect(useSchedulesStore.getState().schedules.map(s => s.id)).toContain(created.id);
  });

  it('pause and resume update status and recompute the next trigger', async () => {
    await init();
    const created = await createSchedule(draft());
    await pauseSchedule(created.id);
    expect(useSchedulesStore.getState().schedules[0]?.status).toBe('paused');

    await resumeSchedule(created.id);
    const resumed = useSchedulesStore.getState().schedules[0];
    expect(resumed?.status).toBe('active');
    expect(resumed?.nextRunAtMs).toBeGreaterThan(Date.now());
  });

  it('resumeSchedule is a no-op for unknown ids', async () => {
    await init();
    await expect(resumeSchedule('missing')).resolves.toBeUndefined();
  });

  it('deleteSchedule removes from the UI store', async () => {
    await init();
    const created = await createSchedule(draft());
    await deleteSchedule(created.id);
    expect(useSchedulesStore.getState().schedules).toHaveLength(0);
  });

  it('mutations throw before init', async () => {
    resetSchedulingForTests();
    await expect(createSchedule(draft())).rejects.toThrow(/not initialized/);
  });
});

describe('runScheduleAction', () => {
  it('runs the action and swallows/logs rejections', async () => {
    const ok = vi.fn().mockResolvedValue('done');
    runScheduleAction(ok, 'ok-case');
    runScheduleAction(() => Promise.reject(new Error('nope')), 'fail-case');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(ok).toHaveBeenCalled();
  });
});

describe('buildSubmitPreview (AC #12)', () => {
  it('renders the exact submit arguments', () => {
    const preview = buildSubmitPreview(
      draft({ parameters: { files: ['a.ts'] }, options: { priority: 'high' } })
    );
    expect(preview).toContain('BackgroundAgentSystem.submit(');
    expect(preview).toContain('"frontend"');
    expect(preview).toContain('"run the audit"');
    expect(preview).toContain('"V:\\\\monorepo"');
    expect(preview).toContain('{"files":["a.ts"]}');
    expect(preview).toContain('{"priority":"high"}');
  });

  it('defaults parameters and options to empty objects', () => {
    const preview = buildSubmitPreview(draft());
    expect(preview.match(/\{\}/g)).toHaveLength(2);
  });
});
