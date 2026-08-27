/**
 * usePlanModeCommands tests — spec 05 palette entries: create-plan opens the
 * Plan Mode dialog, view-plans opens the Artifacts panel.
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePlanModeCommands } from '../../hooks/usePlanModeCommands';
import { useArtifactsStore } from '../../stores/artifactsStore';
import { usePlanModeStore } from '../../stores/planModeStore';

beforeEach(() => {
  usePlanModeStore.setState({ dialogOpen: false });
  useArtifactsStore.setState({ panelOpen: false });
});

describe('usePlanModeCommands', () => {
  it('exposes the two plan-mode commands in the Agent category', () => {
    const { result } = renderHook(() => usePlanModeCommands());
    expect(result.current.map(c => c.id)).toEqual(['plan-mode-create', 'plan-mode-view-plans']);
    expect(result.current.every(c => c.category === 'Agent')).toBe(true);
  });

  it('create command opens the Plan Mode dialog', () => {
    const { result } = renderHook(() => usePlanModeCommands());
    result.current[0]?.action();
    expect(usePlanModeStore.getState().dialogOpen).toBe(true);
  });

  it('view-plans command opens the Artifacts panel', () => {
    const { result } = renderHook(() => usePlanModeCommands());
    result.current[1]?.action();
    expect(useArtifactsStore.getState().panelOpen).toBe(true);
  });
});
