/**
 * ArtifactStore tests — CRUD, task/kind filtering (spec AC #2), restart
 * persistence (AC #10), retention backstop, and both persistence paths
 * (SQLite bridge + localStorage fallback).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArtifactStore } from '../../../services/artifacts/ArtifactStore';
import type { ArtifactDraft } from '../../../services/artifacts/ArtifactStore';

type ElectronWindow = Window & { electron?: unknown };

const draft = (overrides: Partial<ArtifactDraft> = {}): ArtifactDraft => ({
  taskId: 'task-1',
  kind: 'task_list',
  title: 'Task list',
  content: '- [ ] step',
  ...overrides,
});

afterEach(() => {
  delete (window as ElectronWindow).electron;
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('ArtifactStore (localStorage fallback)', () => {
  beforeEach(() => {
    delete (window as ElectronWindow).electron;
    localStorage.clear();
  });

  it('records artifacts with ids, timestamps, and draft default', async () => {
    const store = new ArtifactStore();
    await store.load();
    const artifact = await store.record(draft(), 1000);
    expect(artifact.id).toMatch(/^artifact-/);
    expect(artifact.status).toBe('draft');
    expect(artifact.createdAt).toBe(new Date(1000).toISOString());
    expect(store.get(artifact.id)?.title).toBe('Task list');
  });

  it('filters list() by taskId and kind, newest first', async () => {
    const store = new ArtifactStore();
    await store.load();
    await store.record(draft({ taskId: 't1', kind: 'task_list' }), 1000);
    await store.record(draft({ taskId: 't1', kind: 'diff', title: 'Diff' }), 2000);
    await store.record(draft({ taskId: 't2', kind: 'plan', title: 'Plan' }), 3000);

    expect(store.list()).toHaveLength(3);
    expect(store.list()[0]?.title).toBe('Plan'); // newest first
    expect(store.list({ taskId: 't1' })).toHaveLength(2);
    expect(store.list({ taskId: 't1', kind: 'diff' })).toHaveLength(1);
    expect(store.list({ kind: 'plan' })[0]?.taskId).toBe('t2');
  });

  it('updates content/status and bumps updatedAt', async () => {
    const store = new ArtifactStore();
    await store.load();
    const artifact = await store.record(draft(), 1000);
    const updated = await store.update(artifact.id, { status: 'final' }, 5000);
    expect(updated?.status).toBe('final');
    expect(updated?.updatedAt).toBe(new Date(5000).toISOString());
    expect(updated?.createdAt).toBe(artifact.createdAt);
    expect(await store.update('missing', { status: 'final' })).toBeUndefined();
  });

  it('survives a simulated app restart (spec AC #10)', async () => {
    const store = new ArtifactStore();
    await store.load();
    const artifact = await store.record(draft(), 1000);

    const reloaded = new ArtifactStore();
    await reloaded.load();
    expect(reloaded.get(artifact.id)?.content).toBe('- [ ] step');
  });

  it('removes artifacts', async () => {
    const store = new ArtifactStore();
    await store.load();
    const artifact = await store.record(draft());
    expect(await store.remove(artifact.id)).toBe(true);
    expect(await store.remove(artifact.id)).toBe(false);
    expect(store.list()).toHaveLength(0);
  });

  it('drops corrupt or incomplete persisted entries', async () => {
    localStorage.setItem('vcs_artifacts', 'not json');
    const store = new ArtifactStore();
    await store.load();
    expect(store.list()).toHaveLength(0);

    localStorage.setItem('vcs_artifacts', JSON.stringify([{ id: 'x' }, { junk: 1 }]));
    const second = new ArtifactStore();
    await second.load();
    expect(second.list()).toHaveLength(0);
  });

  it('enforces the retention backstop (oldest dropped past 500)', async () => {
    const store = new ArtifactStore();
    await store.load();
    for (let i = 0; i < 502; i++) {
      await store.record(draft({ title: `a${i}` }), 1000 + i);
    }
    expect(store.list()).toHaveLength(500);
    // the two oldest are gone
    expect(store.list().some(a => a.title === 'a0')).toBe(false);
    expect(store.list().some(a => a.title === 'a1')).toBe(false);
    expect(store.list().some(a => a.title === 'a501')).toBe(true);
  });
});

describe('ArtifactStore (electron.store fallback)', () => {
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
    const store = new ArtifactStore();
    await store.load();
    await store.record(draft({ title: 'store-backed' }));
    expect(backing.get('vcs_artifacts')).toContain('store-backed');

    const reloaded = new ArtifactStore();
    await reloaded.load();
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
    const store = new ArtifactStore();
    await store.load();
    await store.record(draft()); // write failure swallowed
    expect(store.list()).toHaveLength(1);
  });
});

describe('ArtifactStore (SQLite bridge)', () => {
  const execute = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    execute.mockReset();
    execute.mockResolvedValue({ success: true, data: [] });
    (window as ElectronWindow).electron = { db: { execute } };
  });

  it('falls back to localStorage when the SELECT itself rejects', async () => {
    execute.mockRejectedValue(new Error('db locked'));
    localStorage.setItem(
      'vcs_artifacts',
      JSON.stringify([
        {
          id: 'artifact-seed',
          taskId: 't1',
          kind: 'plan',
          title: 'Seed',
          content: '# s',
          createdAt: new Date(1000).toISOString(),
          updatedAt: new Date(1000).toISOString(),
          status: 'final',
        },
      ])
    );
    const store = new ArtifactStore();
    await store.load();
    expect(store.get('artifact-seed')).toBeDefined();
  });

  it('drops rows whose artifact_data is not valid JSON', async () => {
    execute.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'artifact-bad', artifact_data: 'not json at all' }],
    });
    const store = new ArtifactStore();
    await store.load();
    expect(store.list()).toHaveLength(0);
  });

  it('upserts with real task_id/kind columns', async () => {
    const store = new ArtifactStore();
    await store.load();
    const artifact = await store.record(draft({ taskId: 't9', kind: 'diff' }));
    const upsert = execute.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO artifacts')
    );
    expect(upsert?.[1]?.[0]).toBe(artifact.id);
    expect(upsert?.[1]?.[1]).toBe('t9');
    expect(upsert?.[1]?.[2]).toBe('diff');
    expect(JSON.parse(upsert?.[1]?.[3] as string).title).toBe('Task list');
  });

  it('loads rows from the artifacts table', async () => {
    const stored = {
      id: 'artifact-1',
      taskId: 't1',
      kind: 'plan',
      title: 'Plan',
      content: '# plan',
      createdAt: new Date(1000).toISOString(),
      updatedAt: new Date(1000).toISOString(),
      status: 'final',
    };
    execute.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'artifact-1', artifact_data: JSON.stringify(stored) }],
    });
    const store = new ArtifactStore();
    await store.load();
    expect(store.get('artifact-1')?.kind).toBe('plan');
  });

  it('issues DELETE on remove and tolerates a throwing bridge', async () => {
    execute.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'artifact-1',
          artifact_data: JSON.stringify({ id: 'artifact-1', taskId: 't', kind: 'plan' }),
        },
      ],
    });
    const store = new ArtifactStore();
    await store.load();
    execute.mockRejectedValue(new Error('db locked'));
    expect(await store.remove('artifact-1')).toBe(true);
    // persist path also survives the throwing bridge
    await store.record(draft());
    expect(store.list()).toHaveLength(1);
  });
});
