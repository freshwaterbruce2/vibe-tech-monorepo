/**
 * useArtifactCommands tests — palette entries open/toggle the Artifacts panel.
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useArtifactCommands } from '../../hooks/useArtifactCommands';
import { useArtifactsStore } from '../../stores/artifactsStore';

beforeEach(() => {
  useArtifactsStore.setState({ artifacts: [], panelOpen: false, selectedId: null });
});

describe('useArtifactCommands', () => {
  it('exposes open and toggle commands', () => {
    const { result } = renderHook(() => useArtifactCommands());
    expect(result.current.map(c => c.id)).toEqual(['artifacts-open', 'view-toggle-artifacts']);
  });

  it('open sets the panel open (idempotent)', () => {
    const { result } = renderHook(() => useArtifactCommands());
    result.current.find(c => c.id === 'artifacts-open')?.action();
    expect(useArtifactsStore.getState().panelOpen).toBe(true);
    result.current.find(c => c.id === 'artifacts-open')?.action();
    expect(useArtifactsStore.getState().panelOpen).toBe(true);
  });

  it('toggle flips visibility', () => {
    const { result } = renderHook(() => useArtifactCommands());
    result.current.find(c => c.id === 'view-toggle-artifacts')?.action();
    expect(useArtifactsStore.getState().panelOpen).toBe(true);
    result.current.find(c => c.id === 'view-toggle-artifacts')?.action();
    expect(useArtifactsStore.getState().panelOpen).toBe(false);
  });
});
