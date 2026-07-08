/**
 * schedulesStore tests — UI mirror actions and panel visibility state.
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ScheduleDefinition } from '../../services/scheduling/types';
import { useSchedulesActions, useSchedulesStore } from '../../stores/schedulesStore';

const schedule: ScheduleDefinition = {
  id: 's-1',
  agentId: 'frontend',
  userRequest: 'run the audit',
  workspaceRoot: 'V:\\monorepo',
  parameters: {},
  options: {},
  cadence: { type: 'interval', everyMinutes: 60 },
  status: 'active',
  missedRunPolicy: 'run-on-launch',
  createdAt: new Date(2026, 6, 4).toISOString(),
  nextRunAtMs: null,
  runs: [],
};

beforeEach(() => {
  useSchedulesStore.setState({ schedules: [], panelOpen: false, createPrefill: null });
});

describe('schedulesStore', () => {
  it('setSchedules replaces the list', () => {
    useSchedulesStore.getState().actions.setSchedules([schedule]);
    expect(useSchedulesStore.getState().schedules).toHaveLength(1);
    useSchedulesStore.getState().actions.setSchedules([]);
    expect(useSchedulesStore.getState().schedules).toHaveLength(0);
  });

  it('useSchedulesActions exposes the actions slice', () => {
    const { result } = renderHook(() => useSchedulesActions());
    result.current.setPanelOpen(true);
    expect(useSchedulesStore.getState().panelOpen).toBe(true);
  });

  it('setPanelOpen and togglePanel control visibility', () => {
    const { actions } = useSchedulesStore.getState();
    actions.setPanelOpen(true);
    expect(useSchedulesStore.getState().panelOpen).toBe(true);
    actions.togglePanel();
    expect(useSchedulesStore.getState().panelOpen).toBe(false);
    actions.togglePanel();
    expect(useSchedulesStore.getState().panelOpen).toBe(true);
  });

  it('openCreateWithPrefill opens the panel and stores the prefill', () => {
    const { actions } = useSchedulesStore.getState();
    actions.openCreateWithPrefill('run the audit later');
    expect(useSchedulesStore.getState().panelOpen).toBe(true);
    expect(useSchedulesStore.getState().createPrefill).toBe('run the audit later');
  });

  it('clearCreatePrefill resets the prefill without closing the panel', () => {
    const { actions } = useSchedulesStore.getState();
    actions.openCreateWithPrefill('run the audit later');
    actions.clearCreatePrefill();
    expect(useSchedulesStore.getState().createPrefill).toBeNull();
    expect(useSchedulesStore.getState().panelOpen).toBe(true);
  });
});
