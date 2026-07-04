/**
 * useScheduleCommands tests — palette entries open/toggle the Schedule panel.
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useScheduleCommands } from '../../hooks/useScheduleCommands';
import { useSchedulesStore } from '../../stores/schedulesStore';

beforeEach(() => {
  useSchedulesStore.setState({ schedules: [], panelOpen: false });
});

describe('useScheduleCommands', () => {
  it('exposes the /schedule and toggle commands', () => {
    const { result } = renderHook(() => useScheduleCommands());
    expect(result.current.map(c => c.id)).toEqual(['schedule-agent-task', 'view-toggle-schedules']);
  });

  it('/schedule opens the panel', () => {
    const { result } = renderHook(() => useScheduleCommands());
    result.current.find(c => c.id === 'schedule-agent-task')?.action();
    expect(useSchedulesStore.getState().panelOpen).toBe(true);
    // opening again keeps it open (setPanelOpen, not toggle)
    result.current.find(c => c.id === 'schedule-agent-task')?.action();
    expect(useSchedulesStore.getState().panelOpen).toBe(true);
  });

  it('toggle flips panel visibility', () => {
    const { result } = renderHook(() => useScheduleCommands());
    result.current.find(c => c.id === 'view-toggle-schedules')?.action();
    expect(useSchedulesStore.getState().panelOpen).toBe(true);
    result.current.find(c => c.id === 'view-toggle-schedules')?.action();
    expect(useSchedulesStore.getState().panelOpen).toBe(false);
  });
});
