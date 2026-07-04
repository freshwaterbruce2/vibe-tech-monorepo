/**
 * Schedules store — UI mirror of persisted agent schedules plus the Schedule
 * panel's open/close state. Written by schedulerIntegration; read by
 * SchedulePanel and useScheduleCommands.
 * Spec: FEATURE_SPECS/competitive-gaps/16-AGENT-SCHEDULING.md
 */
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ScheduleDefinition } from '../services/scheduling/types';

export interface SchedulesState {
  schedules: ScheduleDefinition[];
  panelOpen: boolean;
  actions: {
    setSchedules: (schedules: ScheduleDefinition[]) => void;
    setPanelOpen: (open: boolean) => void;
    togglePanel: () => void;
  };
}

type SetState = (fn: (state: SchedulesState) => void) => void;

const createActions = (set: SetState): SchedulesState['actions'] => ({
  setSchedules: schedules =>
    set(state => {
      state.schedules = schedules;
    }),
  setPanelOpen: open =>
    set(state => {
      state.panelOpen = open;
    }),
  togglePanel: () =>
    set(state => {
      state.panelOpen = !state.panelOpen;
    }),
});

export const useSchedulesStore = create<SchedulesState>()(
  devtools(
    subscribeWithSelector(
      immer(set => ({
        schedules: [],
        panelOpen: false,
        actions: createActions(set),
      }))
    ),
    { name: 'schedules-store' }
  )
);

export const useSchedulesActions = (): SchedulesState['actions'] =>
  useSchedulesStore(state => state.actions);
