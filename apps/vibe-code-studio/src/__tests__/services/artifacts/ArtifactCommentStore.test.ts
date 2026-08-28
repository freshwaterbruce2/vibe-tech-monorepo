/**
 * ArtifactCommentStore tests — add/list in thread order, delivery flips,
 * artifact-scoped cascade delete, retention, restart persistence, and both
 * persistence paths (SQLite bridge + localStorage fallback).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArtifactCommentStore } from '../../../services/artifacts/ArtifactCommentStore';
import type { ArtifactCommentDraft } from '../../../services/artifacts/ArtifactCommentStore';

type ElectronWindow = Window & { electron?: unknown };

const draft = (overrides: Partial<ArtifactCommentDraft> = {}): ArtifactCommentDraft => ({
  artifactId: 'a-1',
  taskId: 'task-1',
  body: 'use the shared helper',
  delivery: 'queued',
  ...overrides,
});

afterEach(() => {
  delete (window as ElectronWindow).electron;
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('ArtifactCommentStore (localStorage fallback)', () => {
  beforeEach(() => {
    delete (window as ElectronWindow).electron;
    localStorage.clear();
  });

  it('adds comments with ids and timestamps', async () => {
    const store = new ArtifactCommentStore();
    await store.load();
    const comment = await store.add(draft(), 1000);
    expect(comment.id).toMatch(/^comment-/);
    expect(comment.createdAt).toBe(new Date(1000).toISOString());
    expect(comment.delivery).toBe('queued');
    expect(store.get(comment.id)?.body).toBe('use the shared helper');
  });

  it('lists in thread order (oldest first), scoped by artifact', async () => {
    const store = new ArtifactCommentStore();
    await store.load();
    await store.add(draft({ body: 'second' }), 2000);
    await store.add(draft({ body: 'first' }), 1000);
    await store.add(draft({ artifactId: 'a-2', body: 'other thread' }), 1500);

    expect(store.list().map(c => c.body)).toEqual(['first', 'other thread', 'second']);
    expect(store.list({ artifactId: 'a-1' }).map(c => c.body)).toEqual(['first', 'second']);
  });

  it('flips delivery state and persists it', async () => {
    const store = new ArtifactCommentStore();
    await store.load();
    const comment = await store.add(draft(), 1000);
    const updated = await store.setDelivery(comment.id, 'delivered');
    expect(updated?.delivery).toBe('delivered');
    expect(await store.setDelivery('missing', 'feedback')).toBeUndefined();

    const reloaded = new ArtifactCommentStore();
    await reloaded.load();
    expect(reloaded.get(comment.id)?.delivery).toBe('delivered');
  });

  it('removes all comments for an artifact', async () => {
    const store = new ArtifactCommentStore();
    await store.load();
    await store.add(draft(), 1000);
    await store.add(draft({ body: 'again' }), 2000);
    await store.add(draft({ artifactId: 'a-2', body: 'keep' }), 3000);

    expect(await store.removeByArtifact('a-1')).toBe(2);
    expect(await store.removeByArtifact('a-1')).toBe(0);
    expect(store.list().map(c => c.body)).toEqual(['keep']);
  });

  it('survives a simulated app restart', async () => {
    const store = new ArtifactCommentStore();
    await store.load();
    const comment = await store.add(draft(), 1000);

    const reloaded = new ArtifactCommentStore();
    await reloaded.load();
    expect(reloaded.get(comment.id)?.body).toBe('use the shared helper');
  });

  it('drops corrupt or incomplete persisted entries', async () => {
    localStorage.setItem('vcs_artifact_comments', 'not json');
    const store = new ArtifactCommentStore();
    await store.load();
    expect(store.list()).toHaveLength(0);

    localStorage.setItem('vcs_artifact_comments', JSON.stringify([{ id: 'x' }, { junk: 1 }]));
    const second = new ArtifactCommentStore();
    await second.load();
    expect(second.list()).toHaveLength(0);
  });

  it('defaults missing delivery to feedback on load', async () => {
    localStorage.setItem(
      'vcs_artifact_comments',
      JSON.stringify([
        {
          id: 'comment-legacy',
          artifactId: 'a-1',
          taskId: 't-1',
          body: 'old comment',
          createdAt: new Date(1000).toISOString(),
        },
      ])
    );
    const store = new ArtifactCommentStore();
    await store.load();
    expect(store.get('comment-legacy')?.delivery).toBe('feedback');
  });

  it('enforces the retention backstop (oldest dropped past 1000)', async () => {
    const store = new ArtifactCommentStore();
    await store.load();
    for (let i = 0; i < 1002; i++) {
      await store.add(draft({ body: `c${i}` }), 1000 + i);
    }
    expect(store.list()).toHaveLength(1000);
    expect(store.list().some(c => c.body === 'c0')).toBe(false);
    expect(store.list().some(c => c.body === 'c1')).toBe(false);
    expect(store.list().some(c => c.body === 'c1001')).toBe(true);
  });
});

describe('ArtifactCommentStore (electron.store fallback)', () => {
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
    const store = new ArtifactCommentStore();
    await store.load();
    await store.add(draft({ body: 'store-backed' }));
    expect(backing.get('vcs_artifact_comments')).toContain('store-backed');

    const reloaded = new ArtifactCommentStore();
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
    const store = new ArtifactCommentStore();
    await store.load();
    await store.add(draft());
    expect(store.list()).toHaveLength(1);
  });
});

describe('ArtifactCommentStore (SQLite bridge)', () => {
  const execute = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    execute.mockReset();
    execute.mockResolvedValue({ success: true, data: [] });
    (window as ElectronWindow).electron = { db: { execute } };
  });

  it('upserts with real artifact_id/task_id columns', async () => {
    const store = new ArtifactCommentStore();
    await store.load();
    const comment = await store.add(draft({ artifactId: 'a-9', taskId: 't-9' }));
    const upsert = execute.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO artifact_comments')
    );
    expect(upsert?.[1]?.[0]).toBe(comment.id);
    expect(upsert?.[1]?.[1]).toBe('a-9');
    expect(upsert?.[1]?.[2]).toBe('t-9');
    expect(JSON.parse(upsert?.[1]?.[3] as string).body).toBe('use the shared helper');
  });

  it('loads rows from the artifact_comments table', async () => {
    const stored = {
      id: 'comment-1',
      artifactId: 'a-1',
      taskId: 't-1',
      body: 'from sqlite',
      createdAt: new Date(1000).toISOString(),
      delivery: 'delivered',
    };
    execute.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'comment-1', comment_data: JSON.stringify(stored) }],
    });
    const store = new ArtifactCommentStore();
    await store.load();
    expect(store.get('comment-1')?.delivery).toBe('delivered');
  });

  it('drops rows whose comment_data is not valid JSON', async () => {
    execute.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'comment-bad', comment_data: 'not json at all' }],
    });
    const store = new ArtifactCommentStore();
    await store.load();
    expect(store.list()).toHaveLength(0);
  });

  it('falls back to localStorage when the SELECT itself rejects', async () => {
    execute.mockRejectedValue(new Error('db locked'));
    localStorage.setItem(
      'vcs_artifact_comments',
      JSON.stringify([
        {
          id: 'comment-seed',
          artifactId: 'a-1',
          taskId: 't-1',
          body: 'seed',
          createdAt: new Date(1000).toISOString(),
          delivery: 'feedback',
        },
      ])
    );
    const store = new ArtifactCommentStore();
    await store.load();
    expect(store.get('comment-seed')).toBeDefined();
  });

  it('issues DELETE on removeByArtifact and tolerates a throwing bridge', async () => {
    const store = new ArtifactCommentStore();
    await store.load();
    await store.add(draft());
    execute.mockRejectedValue(new Error('db locked'));
    expect(await store.removeByArtifact('a-1')).toBe(1);
    // persist path also survives the throwing bridge
    await store.add(draft({ body: 'after failure' }));
    expect(store.list()).toHaveLength(1);
  });
});
