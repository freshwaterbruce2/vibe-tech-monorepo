/**
 * knowledgeIntegration tests — singleton lifecycle, UI-store sync, and the
 * buildKnowledgeSection injection block (top-N, char budget, tags, catch).
 * Persistence rides the global window.electron.store mock (file-lifetime
 * Map), reset per test via the storage key.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addKnowledgeItem,
  buildKnowledgeSection,
  deleteKnowledgeItem,
  loadKnowledge,
  resetKnowledgeForTests,
  updateKnowledgeItem,
} from '../../../services/knowledge/knowledgeIntegration';
import type { KnowledgeItem } from '../../../services/knowledge/types';
import { useKnowledgeStore } from '../../../stores/knowledgeStore';

const STORAGE_KEY = 'vcs_knowledge_items';

type StoreBridge = { set: (key: string, value: string) => Promise<unknown> };
const electronStore = (): StoreBridge =>
  (window as unknown as { electron: { store: StoreBridge } }).electron.store;

const persisted = (overrides: Partial<KnowledgeItem> = {}): KnowledgeItem => ({
  id: 'knowledge-seeded',
  title: 'Seeded fact',
  content: 'Persisted body',
  category: 'general',
  scopeGlobs: [],
  sourceSessionId: 'manual',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(async () => {
  resetKnowledgeForTests();
  useKnowledgeStore.setState({ items: [], panelOpen: false, categoryFilter: null });
  await electronStore().set(STORAGE_KEY, JSON.stringify([]));
});

describe('knowledgeIntegration CRUD + UI sync', () => {
  it('loadKnowledge pulls persisted items and syncs the UI store', async () => {
    await electronStore().set(STORAGE_KEY, JSON.stringify([persisted()]));
    resetKnowledgeForTests(); // fresh singleton so load() re-reads storage

    const items = await loadKnowledge();

    expect(items).toHaveLength(1);
    expect(items[0]!.id).toBe('knowledge-seeded');
    expect(useKnowledgeStore.getState().items).toHaveLength(1);
    expect(useKnowledgeStore.getState().items[0]!.title).toBe('Seeded fact');
  });

  it('add/update/delete round-trip through the singleton and sync the UI store', async () => {
    const created = await addKnowledgeItem({ title: 'Ports', content: 'Vite uses 5173' });
    expect(created.id).toMatch(/^knowledge-/);
    expect(useKnowledgeStore.getState().items.map(i => i.id)).toEqual([created.id]);

    const updated = await updateKnowledgeItem(created.id, { content: 'Vite uses 5173-5199' });
    expect(updated?.content).toBe('Vite uses 5173-5199');
    expect(useKnowledgeStore.getState().items[0]!.content).toBe('Vite uses 5173-5199');

    expect(await deleteKnowledgeItem(created.id)).toBe(true);
    expect(useKnowledgeStore.getState().items).toHaveLength(0);
  });

  it('updateKnowledgeItem returns undefined and deleteKnowledgeItem false for missing ids', async () => {
    expect(await updateKnowledgeItem('missing', { content: 'x' })).toBeUndefined();
    expect(await deleteKnowledgeItem('missing')).toBe(false);
  });
});

describe('buildKnowledgeSection', () => {
  it('returns an empty string when no items exist', async () => {
    expect(await buildKnowledgeSection('anything at all')).toBe('');
  });

  it('returns an empty string when no item matches the context', async () => {
    await addKnowledgeItem({ title: 'zzz only', content: 'yyy body' });
    expect(await buildKnowledgeSection('completely unrelated request')).toBe('');
  });

  it('injects header, source tag, title, and content for a matching item', async () => {
    const item = await addKnowledgeItem({
      title: 'kraken websocket reconnect',
      content: 'Use exponential backoff on reconnect.',
    });

    const section = await buildKnowledgeSection('fix the kraken websocket handler');

    expect(section).toContain('WORKSPACE KNOWLEDGE ITEMS:');
    expect(section).toContain(`<!-- knowledge: ${item.id} (manual) -->`);
    expect(section).toContain('### kraken websocket reconnect');
    expect(section).toContain('Use exponential backoff on reconnect.');
  });

  it('caps injection at the top 3 items by relevance', async () => {
    const context = 'alpha beta gamma delta';
    const first = await addKnowledgeItem({ title: 'alpha beta gamma delta', content: 'body one' });
    const second = await addKnowledgeItem({ title: 'alpha beta gamma zzz1', content: 'body two' });
    const third = await addKnowledgeItem({ title: 'alpha beta zzz1 zzz2', content: 'body three' });
    const fourth = await addKnowledgeItem({ title: 'alpha zzz1 zzz2 zzz3', content: 'body four' });

    const section = await buildKnowledgeSection(context);

    expect(section).toContain(first.id);
    expect(section).toContain(second.id);
    expect(section).toContain(third.id);
    expect(section).not.toContain(fourth.id);
  });

  it('returns an empty string when the first (only) block busts the char budget', async () => {
    await addKnowledgeItem({ title: 'alpha beta gamma', content: 'x'.repeat(4100) });
    expect(await buildKnowledgeSection('alpha beta gamma')).toBe('');
  });

  it('stops at the char budget after including earlier smaller blocks', async () => {
    const small = await addKnowledgeItem({
      title: 'alpha beta gamma delta',
      content: 'small fact',
    });
    const huge = await addKnowledgeItem({
      title: 'alpha beta gamma zzz1',
      content: 'y'.repeat(4100),
    });

    const section = await buildKnowledgeSection('alpha beta gamma delta');

    expect(section).toContain(small.id);
    expect(section).not.toContain(huge.id);
  });
});

describe('buildKnowledgeSection error path', () => {
  it('returns an empty string when the underlying store load rejects', async () => {
    vi.resetModules();
    vi.doMock('../../../services/knowledge/KnowledgeStore', () => ({
      KnowledgeStore: class {
        load(): Promise<void> {
          return Promise.reject(new Error('boom'));
        }

        list(): KnowledgeItem[] {
          return [];
        }
      },
    }));

    const fresh = await import('../../../services/knowledge/knowledgeIntegration');
    await expect(fresh.buildKnowledgeSection('anything')).resolves.toBe('');

    vi.doUnmock('../../../services/knowledge/KnowledgeStore');
    vi.resetModules();
  });
});
