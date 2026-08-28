/**
 * useKnowledgeCommands tests — palette entries open/toggle the Knowledge
 * panel through the UI store.
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useKnowledgeCommands } from '../../hooks/useKnowledgeCommands';
import { useKnowledgeStore } from '../../stores/knowledgeStore';

beforeEach(() => {
  useKnowledgeStore.setState({ items: [], panelOpen: false, categoryFilter: null });
});

describe('useKnowledgeCommands', () => {
  it('exposes the open and toggle commands with metadata', () => {
    const { result } = renderHook(() => useKnowledgeCommands());
    expect(result.current.map(c => c.id)).toEqual([
      'knowledge-open-panel',
      'knowledge-toggle-panel',
    ]);
    expect(result.current[0]!.category).toBe('Agent');
    expect(result.current[1]!.category).toBe('View');
    expect(result.current[0]!.icon).toBeTruthy();
  });

  it('the open command sets the panel open (idempotent)', () => {
    const { result } = renderHook(() => useKnowledgeCommands());
    result.current.find(c => c.id === 'knowledge-open-panel')?.action();
    expect(useKnowledgeStore.getState().panelOpen).toBe(true);
    // opening again keeps it open (setPanelOpen, not toggle)
    result.current.find(c => c.id === 'knowledge-open-panel')?.action();
    expect(useKnowledgeStore.getState().panelOpen).toBe(true);
  });

  it('the toggle command flips panel visibility', () => {
    const { result } = renderHook(() => useKnowledgeCommands());
    result.current.find(c => c.id === 'knowledge-toggle-panel')?.action();
    expect(useKnowledgeStore.getState().panelOpen).toBe(true);
    result.current.find(c => c.id === 'knowledge-toggle-panel')?.action();
    expect(useKnowledgeStore.getState().panelOpen).toBe(false);
  });
});
