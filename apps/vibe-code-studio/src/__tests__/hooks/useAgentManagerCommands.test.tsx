/**
 * useAgentManagerCommands tests — palette entries open/toggle the Agent
 * Manager panel (spec 10 Phase 1).
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAgentManagerCommands } from '../../hooks/useAgentManagerCommands';
import { useAgentManagerStore } from '../../stores/agentManagerStore';

beforeEach(() => {
  useAgentManagerStore.getState().actions.reset();
  useAgentManagerStore.getState().actions.setPanelOpen(false);
});

describe('useAgentManagerCommands', () => {
  it('exposes the open and toggle commands', () => {
    const { result } = renderHook(() => useAgentManagerCommands());
    expect(result.current.map(c => c.id)).toEqual([
      'agents-open-manager',
      'view-toggle-agent-manager',
    ]);
  });

  it('open sets the panel open (and keeps it open on repeat)', () => {
    const { result } = renderHook(() => useAgentManagerCommands());
    result.current.find(c => c.id === 'agents-open-manager')?.action();
    expect(useAgentManagerStore.getState().panelOpen).toBe(true);
    result.current.find(c => c.id === 'agents-open-manager')?.action();
    expect(useAgentManagerStore.getState().panelOpen).toBe(true);
  });

  it('toggle flips panel visibility', () => {
    const { result } = renderHook(() => useAgentManagerCommands());
    result.current.find(c => c.id === 'view-toggle-agent-manager')?.action();
    expect(useAgentManagerStore.getState().panelOpen).toBe(true);
    result.current.find(c => c.id === 'view-toggle-agent-manager')?.action();
    expect(useAgentManagerStore.getState().panelOpen).toBe(false);
  });
});
