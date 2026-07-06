/**
 * useTestExplorerCommands tests — palette entries open/toggle the Test
 * Explorer panel (spec 08 Phase 1).
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTestExplorerCommands } from '../../hooks/useTestExplorerCommands';
import { useTestExplorerStore } from '../../stores/testExplorerStore';

beforeEach(() => {
  useTestExplorerStore.setState({ panelOpen: false });
});

describe('useTestExplorerCommands', () => {
  it('exposes the open and toggle commands with Testing/View categories', () => {
    const { result } = renderHook(() => useTestExplorerCommands());
    expect(result.current.map(command => command.id)).toEqual([
      'tests-open-explorer',
      'view-toggle-test-explorer',
    ]);
    expect(result.current.map(command => command.category)).toEqual(['Testing', 'View']);
  });

  it('open command sets the panel open (idempotent)', () => {
    const { result } = renderHook(() => useTestExplorerCommands());
    const open = result.current.find(command => command.id === 'tests-open-explorer');
    open?.action();
    expect(useTestExplorerStore.getState().panelOpen).toBe(true);
    open?.action();
    expect(useTestExplorerStore.getState().panelOpen).toBe(true);
  });

  it('toggle command flips panel visibility each call', () => {
    const { result } = renderHook(() => useTestExplorerCommands());
    const toggle = result.current.find(command => command.id === 'view-toggle-test-explorer');
    toggle?.action();
    expect(useTestExplorerStore.getState().panelOpen).toBe(true);
    toggle?.action();
    expect(useTestExplorerStore.getState().panelOpen).toBe(false);
  });
});
