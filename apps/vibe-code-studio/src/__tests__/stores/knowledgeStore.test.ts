/**
 * knowledgeStore (UI) tests — all actions of the zustand mirror store for
 * spec 04: setItems, setPanelOpen, togglePanel, setCategoryFilter.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { KnowledgeItem } from '../../services/knowledge/types';
import { useKnowledgeStore } from '../../stores/knowledgeStore';

const item = (id: string, category = 'general'): KnowledgeItem => ({
  id,
  title: `Title ${id}`,
  content: 'body',
  category,
  scopeGlobs: [],
  sourceSessionId: 'manual',
  createdAt: '2026-07-05T00:00:00.000Z',
  updatedAt: '2026-07-05T00:00:00.000Z',
});

beforeEach(() => {
  useKnowledgeStore.setState({ items: [], panelOpen: false, categoryFilter: null });
});

describe('useKnowledgeStore', () => {
  it('starts with an empty snapshot, closed panel, and no filter', () => {
    const state = useKnowledgeStore.getState();
    expect(state.items).toEqual([]);
    expect(state.panelOpen).toBe(false);
    expect(state.categoryFilter).toBeNull();
  });

  it('setItems replaces the item snapshot', () => {
    const { actions } = useKnowledgeStore.getState();
    actions.setItems([item('knowledge-1'), item('knowledge-2', 'architecture')]);
    expect(useKnowledgeStore.getState().items.map(i => i.id)).toEqual([
      'knowledge-1',
      'knowledge-2',
    ]);

    actions.setItems([item('knowledge-3')]);
    expect(useKnowledgeStore.getState().items.map(i => i.id)).toEqual(['knowledge-3']);
  });

  it('setPanelOpen sets the flag explicitly in both directions', () => {
    const { actions } = useKnowledgeStore.getState();
    actions.setPanelOpen(true);
    expect(useKnowledgeStore.getState().panelOpen).toBe(true);
    actions.setPanelOpen(true); // idempotent
    expect(useKnowledgeStore.getState().panelOpen).toBe(true);
    actions.setPanelOpen(false);
    expect(useKnowledgeStore.getState().panelOpen).toBe(false);
  });

  it('togglePanel flips visibility each call', () => {
    const { actions } = useKnowledgeStore.getState();
    actions.togglePanel();
    expect(useKnowledgeStore.getState().panelOpen).toBe(true);
    actions.togglePanel();
    expect(useKnowledgeStore.getState().panelOpen).toBe(false);
  });

  it('setCategoryFilter sets and clears the filter', () => {
    const { actions } = useKnowledgeStore.getState();
    actions.setCategoryFilter('architecture');
    expect(useKnowledgeStore.getState().categoryFilter).toBe('architecture');
    actions.setCategoryFilter(null);
    expect(useKnowledgeStore.getState().categoryFilter).toBeNull();
  });
});
