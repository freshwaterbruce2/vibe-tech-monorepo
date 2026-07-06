/**
 * KnowledgeStore tests — CRUD round-trips, defaults, prune, and all three
 * persistence paths (SQLite bridge, electron.store fallback, localStorage
 * fallback), mirroring the ScheduleStore suite's window.electron approach.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../../services/Logger';
import { KnowledgeStore } from '../../../services/knowledge/KnowledgeStore';
import type { KnowledgeDraft, KnowledgeItem } from '../../../services/knowledge/types';

const STORAGE_KEY = 'vcs_knowledge_items';
const NOW = new Date(2026, 6, 5, 12, 0, 0);

type ElectronWindow = Window & { electron?: unknown };

const draft = (overrides: Partial<KnowledgeDraft> = {}): KnowledgeDraft => ({
  title: 'Build uses pnpm',
  content: 'Always run pnpm, never npm.',
  ...overrides,
});

const makeItem = (id: string, updatedAt: string): KnowledgeItem => ({
  id,
  title: `Title for ${id}`,
  content: 'body',
  category: 'general',
  scopeGlobs: [],
  sourceSessionId: 'manual',
  createdAt: updatedAt,
  updatedAt,
});

const internalMap = (store: KnowledgeStore): Map<string, KnowledgeItem> =>
  (store as unknown as { items: Map<string, KnowledgeItem> }).items;

afterEach(() => {
  delete (window as ElectronWindow).electron;
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('KnowledgeStore (localStorage fallback)', () => {
  beforeEach(() => {
    // Drop the global electron mock so this describe really exercises the
    // localStorage path (the mock's backing Map is file-lifetime).
    delete (window as ElectronWindow).electron;
    localStorage.clear();
  });

  it('creates an item with defaults, a knowledge- id prefix, and a trimmed title', async () => {
    const store = new KnowledgeStore();
    await store.load();
    const created = await store.create(draft({ title: '  Trim me  ' }), () => NOW);

    expect(created.id).toMatch(/^knowledge-/);
    expect(created.title).toBe('Trim me');
    expect(created.category).toBe('general');
    expect(created.sourceSessionId).toBe('manual');
    expect(created.scopeGlobs).toEqual([]);
    expect(created.createdAt).toBe(NOW.toISOString());
    expect(created.updatedAt).toBe(created.createdAt);
    expect(store.list()).toHaveLength(1);
    expect(store.get(created.id)?.content).toBe('Always run pnpm, never npm.');
  });

  it('honors explicit category/scopeGlobs/sourceSessionId and trims the category', async () => {
    const store = new KnowledgeStore();
    await store.load();
    const created = await store.create(
      draft({ category: ' architecture ', scopeGlobs: ['src/**'], sourceSessionId: 'session-9' })
    );
    expect(created.category).toBe('architecture');
    expect(created.scopeGlobs).toEqual(['src/**']);
    expect(created.sourceSessionId).toBe('session-9');
  });

  it('falls back to the default category when the draft category is blank', async () => {
    const store = new KnowledgeStore();
    await store.load();
    const created = await store.create(draft({ category: '   ' }));
    expect(created.category).toBe('general');
  });

  it('load is idempotent', async () => {
    const store = new KnowledgeStore();
    await store.load();
    await store.create(draft());
    await store.load(); // second call must not duplicate or reset
    expect(store.list()).toHaveLength(1);
  });

  it('survives a simulated app restart via localStorage', async () => {
    const store = new KnowledgeStore();
    await store.load();
    const created = await store.create(draft());

    const reloaded = new KnowledgeStore();
    await reloaded.load();
    expect(reloaded.list()).toHaveLength(1);
    expect(reloaded.get(created.id)?.title).toBe('Build uses pnpm');
  });

  it('update merges changes, preserves id/createdAt, and bumps updatedAt', async () => {
    const store = new KnowledgeStore();
    await store.load();
    const created = await store.create(draft(), () => NOW);
    const later = new Date(2026, 6, 6, 9, 30, 0);

    const updated = await store.update(created.id, { content: 'new body' }, () => later);

    expect(updated?.id).toBe(created.id);
    expect(updated?.createdAt).toBe(created.createdAt);
    expect(updated?.content).toBe('new body');
    expect(updated?.title).toBe('Build uses pnpm'); // untouched fields preserved
    expect(updated?.updatedAt).toBe(later.toISOString());
    expect(store.get(created.id)?.content).toBe('new body');
  });

  it('update returns undefined for a missing id', async () => {
    const store = new KnowledgeStore();
    await store.load();
    expect(await store.update('missing', { content: 'x' })).toBeUndefined();
  });

  it('removes an existing item and returns false for a missing one', async () => {
    const store = new KnowledgeStore();
    await store.load();
    const created = await store.create(draft());
    expect(await store.remove(created.id)).toBe(true);
    expect(await store.remove(created.id)).toBe(false);
    expect(store.list()).toHaveLength(0);
  });

  it('ignores corrupt persisted JSON', async () => {
    localStorage.setItem(STORAGE_KEY, 'not json');
    const store = new KnowledgeStore();
    await store.load();
    expect(store.list()).toHaveLength(0);
  });

  it('skips entries missing id or title and backfills defaults on the rest', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'knowledge-no-title' },
        { title: 'no id' },
        { id: 'knowledge-sparse', title: 'Sparse', content: 'body' },
      ])
    );
    const store = new KnowledgeStore();
    await store.load();

    expect(store.list()).toHaveLength(1);
    const sparse = store.get('knowledge-sparse');
    expect(sparse?.scopeGlobs).toEqual([]);
    expect(sparse?.category).toBe('general');
    expect(sparse?.sourceSessionId).toBe('manual');
  });

  it('normalizes a non-array scopeGlobs on load', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ id: 'knowledge-bad-globs', title: 'Bad globs', scopeGlobs: 'src/**' }])
    );
    const store = new KnowledgeStore();
    await store.load();
    expect(store.get('knowledge-bad-globs')?.scopeGlobs).toEqual([]);
  });

  it('prunes the oldest item (by updatedAt) when the cap is exceeded', async () => {
    const store = new KnowledgeStore();
    await store.load();
    const items = internalMap(store);
    const base = Date.UTC(2026, 0, 1);
    for (let i = 0; i < 500; i++) {
      const stamp = new Date(base + i * 1000).toISOString();
      items.set(`knowledge-seed-${i}`, makeItem(`knowledge-seed-${i}`, stamp));
    }

    const created = await store.create(draft(), () => NOW);

    expect(items.size).toBe(500);
    expect(items.has('knowledge-seed-0')).toBe(false); // oldest evicted
    expect(items.has('knowledge-seed-1')).toBe(true);
    expect(items.has(created.id)).toBe(true);
  });
});

describe('KnowledgeStore (SQLite bridge)', () => {
  const execute = vi.fn();

  beforeEach(() => {
    execute.mockReset();
    execute.mockResolvedValue({ success: true, data: [] });
    (window as ElectronWindow).electron = { db: { execute } };
    localStorage.clear();
  });

  it('upserts to knowledge_items on create with (id, category, JSON) args', async () => {
    const store = new KnowledgeStore();
    await store.load();
    const created = await store.create(draft({ category: 'workflow' }));

    const upsert = execute.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO knowledge_items')
    );
    expect(upsert).toBeDefined();
    expect(upsert?.[1]?.[0]).toBe(created.id);
    expect(upsert?.[1]?.[1]).toBe('workflow');
    expect(JSON.parse(upsert?.[1]?.[2] as string)).toEqual(created);
  });

  it('loads rows from the knowledge_items SELECT, skipping empty item_data', async () => {
    const stored = makeItem('knowledge-db-1', new Date(2026, 6, 1).toISOString());
    execute.mockResolvedValueOnce({
      success: true,
      data: [
        { id: 'knowledge-db-1', item_data: JSON.stringify(stored) },
        { id: 'knowledge-db-2' }, // no item_data — filtered out
      ],
    });
    const store = new KnowledgeStore();
    await store.load();
    expect(store.list()).toHaveLength(1);
    expect(store.get('knowledge-db-1')?.title).toBe('Title for knowledge-db-1');
  });

  it('drops rows whose item_data is not valid JSON', async () => {
    execute.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'knowledge-db-1', item_data: 'not json at all' }],
    });
    const store = new KnowledgeStore();
    await store.load();
    expect(store.list()).toHaveLength(0);
  });

  it('falls back to the fallback store when the SELECT returns no rows', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([makeItem('knowledge-fb-1', new Date(2026, 6, 1).toISOString())])
    );
    const store = new KnowledgeStore();
    await store.load();
    expect(store.get('knowledge-fb-1')).toBeDefined();
  });

  it('treats an undefined bridge result as no rows', async () => {
    execute.mockResolvedValueOnce(undefined);
    const store = new KnowledgeStore();
    await store.load();
    expect(store.list()).toHaveLength(0);
  });

  it('logs and falls back when the SELECT throws', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    execute.mockRejectedValue(new Error('db locked'));
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([makeItem('knowledge-fb-2', new Date(2026, 6, 1).toISOString())])
    );
    const store = new KnowledgeStore();
    await store.load();
    expect(store.get('knowledge-fb-2')).toBeDefined();
    expect(errorSpy).toHaveBeenCalledWith(
      '[KnowledgeStore] Failed to load knowledge items from SQLite',
      expect.any(Error)
    );
  });

  it('logs (not throws) when the upsert fails; item stays in memory', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const store = new KnowledgeStore();
    await store.load();
    execute.mockRejectedValue(new Error('db locked'));
    const created = await store.create(draft());
    expect(store.get(created.id)).toBeDefined();
    expect(errorSpy).toHaveBeenCalledWith(
      '[KnowledgeStore] Failed to persist knowledge item to SQLite',
      expect.any(Error)
    );
  });

  it('issues a DELETE on remove', async () => {
    const store = new KnowledgeStore();
    await store.load();
    const created = await store.create(draft());
    await store.remove(created.id);
    const del = execute.mock.calls.find(([sql]) =>
      String(sql).includes('DELETE FROM knowledge_items')
    );
    expect(del?.[1]).toEqual([created.id]);
  });

  it('remove still succeeds in memory when the DELETE statement fails', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const store = new KnowledgeStore();
    await store.load();
    const created = await store.create(draft());
    execute.mockRejectedValue(new Error('db locked'));
    expect(await store.remove(created.id)).toBe(true);
    expect(store.list()).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledWith(
      '[KnowledgeStore] Failed to delete knowledge row',
      expect.any(Error)
    );
  });
});

describe('KnowledgeStore (electron.store fallback)', () => {
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
    const store = new KnowledgeStore();
    await store.load();
    await store.create(draft());
    expect(backing.get(STORAGE_KEY)).toContain('Build uses pnpm');

    const reloaded = new KnowledgeStore();
    await reloaded.load();
    expect(reloaded.list()).toHaveLength(1);
  });

  it('treats a missing stored value as an empty list', async () => {
    (window as ElectronWindow).electron = {
      store: { get: vi.fn(async () => undefined), set: vi.fn(async () => {}) },
    };
    const store = new KnowledgeStore();
    await store.load();
    expect(store.list()).toHaveLength(0);
  });

  it('survives a throwing electron.store on both read and write', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
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
    const store = new KnowledgeStore();
    await store.load();
    await store.create(draft()); // write failure is swallowed
    expect(store.list()).toHaveLength(1);
    expect(errorSpy).toHaveBeenCalledWith(
      '[KnowledgeStore] Fallback read failed',
      expect.any(Error)
    );
    expect(errorSpy).toHaveBeenCalledWith(
      '[KnowledgeStore] Fallback save failed',
      expect.any(Error)
    );
  });
});
