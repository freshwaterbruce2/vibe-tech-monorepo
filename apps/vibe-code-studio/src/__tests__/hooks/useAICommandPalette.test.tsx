/**
 * useAICommandPalette smoke tests — the aggregated command list includes the
 * task-runner and scheduling entries alongside the built-ins, and palette
 * visibility toggles.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAICommandPalette } from '../../hooks/useAICommandPalette';

describe('useAICommandPalette', () => {
  it('includes schedule and task commands in the aggregated list', () => {
    const { result } = renderHook(() => useAICommandPalette({}));
    const ids = result.current.commands.map(c => c.id);
    expect(ids).toContain('schedule-agent-task');
    expect(ids).toContain('view-toggle-schedules');
    expect(ids).toContain('artifacts-open');
    expect(ids).toContain('view-toggle-artifacts');
    expect(ids).toContain('view-toggle-problems');
    expect(ids).toContain('plan-mode-create');
    expect(ids).toContain('plan-mode-view-plans');
    expect(ids).toContain('browser-verify');
    expect(ids).toContain('file-new');
  });

  it('wires the /browser verify entry to the AI chat toggle', () => {
    const onToggleAIChat = vi.fn();
    const { result } = renderHook(() => useAICommandPalette({ onToggleAIChat }));
    result.current.commands.find(c => c.id === 'browser-verify')?.action();
    expect(onToggleAIChat).toHaveBeenCalledTimes(1);
  });

  it('toggles palette visibility', () => {
    const { result } = renderHook(() => useAICommandPalette({}));
    expect(result.current.commandPaletteOpen).toBe(false);
    act(() => result.current.toggleCommandPalette());
    expect(result.current.commandPaletteOpen).toBe(true);
    act(() => result.current.setCommandPaletteOpen(false));
    expect(result.current.commandPaletteOpen).toBe(false);
  });
});
