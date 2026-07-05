/**
 * ScheduleStore tests — CRUD round-trips, run-history capping, and both
 * persistence paths (SQLite bridge + localStorage fallback), including a
 * simulated app restart (fresh store reloads persisted state).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduleStore } from '../../../services/scheduling/ScheduleStore';
import type { ScheduleDraft } from '../../../services/scheduling/types';
import { MAX_RUN_HISTORY } from '../../../services/scheduling/types';

const NOW = new Date(2026, 6, 4, 12, 0, 0).getTime();

const draft = (overrides: Partial<ScheduleDraft> = {}): ScheduleDraft => ({
  agentId: 'frontend',
  userRequest: 'run the dependency audit',
  workspaceRoot: 'V:\\monorepo',
  cadence: { type: 'interval', everyMinutes: 60 },
  ...overrides,
});

type ElectronWindow = Window & { electron?: unknown };

afterEach(() => {
  delete (window as ElectronWindow).electron;
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('ScheduleStore (localStorage fallback)', () => {
  beforeEach(() => {
    // Drop the global electron mock so this describe really exercises the
    // localStorage path (the mock's backing Map is file-lifetime).
    delete (window as ElectronWindow).electron;
    localStorage.clear();
  });

  it('creates a schedule with computed next run and defaults', async () => {
    const store = new ScheduleStore();
    await store.load(NOW);
    const created = await store.create(draft(), NOW);
    expect(created.id).toMatch(/^schedule-/);
    expect(created.status).toBe('active');
    expect(created.missedRunPolicy).toBe('run-on-launch');
    expect(created.nextRunAtMs).toBe(NOW + 60 * 60_000);
    expect(store.list()).toHaveLength(1);
    expect(store.get(created.id)?.userRequest).toBe('run the dependency audit');
  });

  it('sets nextRunAtMs null for a once cadence already in the past', async () => {
    const store = new ScheduleStore();
    await store.load(NOW);
    const past = new Date(NOW - 60_000).toISOString();
    const created = await store.create(draft({ cadence: { type: 'once', runAt: past } }), NOW);
    expect(created.nextRunAtMs).toBeNull();
  });

  it('survives a simulated app restart via localStorage', async () => {
    const store = new ScheduleStore();
    await store.load(NOW);
    const created = await store.create(draft(), NOW);

    const reloaded = new ScheduleStore();
    await reloaded.load(NOW + 1000);
    expect(reloaded.list()).toHaveLength(1);
    expect(reloaded.get(created.id)?.agentId).toBe('frontend');
  });

  it('load is idempotent', async () => {
    const store = new ScheduleStore();
    await store.load(NOW);
    await store.create(draft(), NOW);
    await store.load(NOW); // second call must not duplicate or reset
    expect(store.list()).toHaveLength(1);
  });

  it('updates and pauses a schedule', async () => {
    const store = new ScheduleStore();
    await store.load(NOW);
    const created = await store.create(draft(), NOW);
    const updated = await store.update(created.id, { status: 'paused' });
    expect(updated?.status).toBe('paused');
    expect(await store.update('missing', { status: 'paused' })).toBeUndefined();
  });

  it('removes a schedule', async () => {
    const store = new ScheduleStore();
    await store.load(NOW);
    const created = await store.create(draft(), NOW);
    expect(await store.remove(created.id)).toBe(true);
    expect(await store.remove(created.id)).toBe(false);
    expect(store.list()).toHaveLength(0);
  });

  it('records runs newest-first, replaces same-id runs, and caps history', async () => {
    const store = new ScheduleStore();
    await store.load(NOW);
    const created = await store.create(draft(), NOW);

    await store.recordRun(created.id, {
      id: 'run-1',
      startedAt: new Date(NOW).toISOString(),
      status: 'running',
    });
    await store.recordRun(created.id, {
      id: 'run-1',
      startedAt: new Date(NOW).toISOString(),
      status: 'completed',
    });
    let schedule = store.get(created.id);
    expect(schedule?.runs).toHaveLength(1);
    expect(schedule?.runs[0]?.status).toBe('completed');

    for (let i = 2; i <= MAX_RUN_HISTORY + 5; i++) {
      await store.recordRun(created.id, {
        id: `run-${i}`,
        startedAt: new Date(NOW + i).toISOString(),
        status: 'completed',
      });
    }
    schedule = store.get(created.id);
    expect(schedule?.runs).toHaveLength(MAX_RUN_HISTORY);
    expect(schedule?.runs[0]?.id).toBe(`run-${MAX_RUN_HISTORY + 5}`);
    expect(
      await store.recordRun('missing', {
        id: 'x',
        startedAt: new Date(NOW).toISOString(),
        status: 'completed',
      })
    ).toBeUndefined();
  });

  it('ignores corrupt persisted JSON', async () => {
    localStorage.setItem('vcs_agent_schedules', 'not json');
    const store = new ScheduleStore();
    await store.load(NOW);
    expect(store.list()).toHaveLength(0);
  });

  it('drops entries missing required fields', async () => {
    localStorage.setItem('vcs_agent_schedules', JSON.stringify([{ notASchedule: true }]));
    const store = new ScheduleStore();
    await store.load(NOW);
    expect(store.list()).toHaveLength(0);
  });
});

describe('ScheduleStore (SQLite bridge)', () => {
  const execute = vi.fn();

  beforeEach(() => {
    execute.mockReset();
    execute.mockResolvedValue({ success: true, data: [] });
    (window as ElectronWindow).electron = { db: { execute } };
  });

  it('upserts to agent_schedules on create', async () => {
    const store = new ScheduleStore();
    await store.load(NOW);
    const created = await store.create(draft(), NOW);
    const upsert = execute.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO agent_schedules')
    );
    expect(upsert).toBeDefined();
    expect(upsert?.[1]?.[0]).toBe(created.id);
    expect(JSON.parse(upsert?.[1]?.[1] as string).userRequest).toBe('run the dependency audit');
  });

  it('loads rows from agent_schedules', async () => {
    const stored = {
      id: 'schedule-1',
      agentId: 'backend',
      userRequest: 'nightly refactor',
      workspaceRoot: 'V:\\monorepo',
      parameters: {},
      options: {},
      cadence: { type: 'daily', hour: 2, minute: 0 },
      status: 'active',
      missedRunPolicy: 'skip',
      createdAt: new Date(NOW).toISOString(),
      nextRunAtMs: NOW + 1000,
      runs: [],
    };
    execute.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'schedule-1', definition_data: JSON.stringify(stored) }],
    });
    const store = new ScheduleStore();
    await store.load(NOW);
    expect(store.list()).toHaveLength(1);
    expect(store.get('schedule-1')?.userRequest).toBe('nightly refactor');
  });

  it('issues a DELETE on remove', async () => {
    execute.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'schedule-1',
          definition_data: JSON.stringify({
            id: 'schedule-1',
            cadence: { type: 'interval', everyMinutes: 5 },
            runs: [],
          }),
        },
      ],
    });
    const store = new ScheduleStore();
    await store.load(NOW);
    await store.remove('schedule-1');
    const del = execute.mock.calls.find(([sql]) =>
      String(sql).includes('DELETE FROM agent_schedules')
    );
    expect(del?.[1]).toEqual(['schedule-1']);
  });

  it('falls back to localStorage when the bridge throws', async () => {
    execute.mockRejectedValue(new Error('db locked'));
    localStorage.setItem(
      'vcs_agent_schedules',
      JSON.stringify([{ id: 's-2', cadence: { type: 'interval', everyMinutes: 5 }, runs: [] }])
    );
    const store = new ScheduleStore();
    await store.load(NOW);
    expect(store.get('s-2')).toBeDefined();
    // persist path also survives the throwing bridge
    await store.create(draft(), NOW);
    expect(store.list()).toHaveLength(2);
  });

  it('remove still succeeds in memory when the DELETE statement fails', async () => {
    execute.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'schedule-1',
          definition_data: JSON.stringify({
            id: 'schedule-1',
            cadence: { type: 'interval', everyMinutes: 5 },
            runs: [],
          }),
        },
      ],
    });
    const store = new ScheduleStore();
    await store.load(NOW);
    execute.mockRejectedValue(new Error('db locked'));
    expect(await store.remove('schedule-1')).toBe(true);
    expect(store.list()).toHaveLength(0);
  });

  it('drops rows whose definition_data is not valid JSON', async () => {
    execute.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'schedule-1', definition_data: 'not json at all' }],
    });
    const store = new ScheduleStore();
    await store.load(NOW);
    expect(store.list()).toHaveLength(0);
  });
});

describe('ScheduleStore (electron.store fallback)', () => {
  it('persists and reloads via window.electron.store when no db bridge exists', async () => {
    const backing = new Map<string, string>();
    (window as ElectronWindow).electron = {
      store: {
        get: vi.fn(async (key: string) => backing.get(key)),
        set: vi.fn(async (key: string, value: string) => {
          backing.set(key, value);
        }),
      },
    };
    const store = new ScheduleStore();
    await store.load(NOW);
    await store.create(draft(), NOW);
    expect(backing.get('vcs_agent_schedules')).toContain('run the dependency audit');

    const reloaded = new ScheduleStore();
    await reloaded.load(NOW);
    expect(reloaded.list()).toHaveLength(1);
  });

  it('survives a throwing electron.store on both read and write', async () => {
    (window as ElectronWindow).electron = {
      store: {
        get: vi.fn(async () => {
          throw new Error('store broken');
        }),
        set: vi.fn(async () => {
          throw new Error('store broken');
        }),
      },
    };
    const store = new ScheduleStore();
    await store.load(NOW);
    await store.create(draft(), NOW); // write failure is swallowed
    expect(store.list()).toHaveLength(1);
  });
});
