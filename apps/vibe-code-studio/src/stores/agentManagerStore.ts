/**
 * Agent Manager store — live task snapshots + inbox for spec 10 Phase 1.
 * Written by services/agentManager/agentManagerIntegration (event-driven,
 * not polling); read by AgentManagerPanel.
 * Spec: FEATURE_SPECS/competitive-gaps/10-AGENT-MANAGER-PARALLEL.md
 */
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { InboxEntry } from '../services/agentManager/inbox';
import type { BackgroundTask } from '../services/BackgroundAgentSystem';

export interface AgentManagerState {
  tasksById: Record<string, BackgroundTask>;
  /** Task ids in first-seen order (list renders newest last). */
  order: string[];
  inbox: InboxEntry[];
  selectedTaskId: string | null;
  panelOpen: boolean;
  actions: {
    setPanelOpen: (open: boolean) => void;
    togglePanel: () => void;
    upsertTask: (task: BackgroundTask) => void;
    setTasks: (tasks: BackgroundTask[]) => void;
    selectTask: (taskId: string | null) => void;
    setInbox: (inbox: InboxEntry[]) => void;
    reset: () => void;
  };
}

type SetState = (fn: (state: AgentManagerState) => void) => void;

const snapshot = (task: BackgroundTask): BackgroundTask => ({ ...task });

const createActions = (set: SetState): AgentManagerState['actions'] => ({
  setPanelOpen: open =>
    set(state => {
      state.panelOpen = open;
    }),
  togglePanel: () =>
    set(state => {
      state.panelOpen = !state.panelOpen;
    }),
  upsertTask: task =>
    set(state => {
      if (!state.tasksById[task.id]) {
        state.order.push(task.id);
      }
      state.tasksById[task.id] = snapshot(task);
    }),
  setTasks: tasks =>
    set(state => {
      state.tasksById = {};
      state.order = [];
      for (const task of tasks) {
        state.order.push(task.id);
        state.tasksById[task.id] = snapshot(task);
      }
    }),
  selectTask: taskId =>
    set(state => {
      state.selectedTaskId = taskId;
    }),
  setInbox: inbox =>
    set(state => {
      state.inbox = inbox;
    }),
  reset: () =>
    set(state => {
      state.tasksById = {};
      state.order = [];
      state.inbox = [];
      state.selectedTaskId = null;
    }),
});

export const useAgentManagerStore = create<AgentManagerState>()(
  devtools(
    subscribeWithSelector(
      immer(set => ({
        tasksById: {},
        order: [],
        inbox: [],
        selectedTaskId: null,
        panelOpen: false,
        actions: createActions(set),
      }))
    ),
    { name: 'agent-manager-store' }
  )
);
