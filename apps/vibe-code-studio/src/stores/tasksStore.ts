/**
 * Tasks store — parsed .vcs/tasks.json task list + per-task running state.
 * Spec: FEATURE_SPECS/competitive-gaps/02-TASK-RUNNER.md
 */
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { RunningTaskInfo, VcsTask } from '../services/tasks/types';

export interface TasksState {
  tasks: VcsTask[];
  running: Record<string, RunningTaskInfo>;
  lastExitCodes: Record<string, number | null>;
  loadError: string | null;
  actions: {
    setTasks: (tasks: VcsTask[]) => void;
    setLoadError: (error: string | null) => void;
    markRunning: (label: string, sessionId: string, startedAt: number) => void;
    markStopped: (label: string, exitCode: number | null) => void;
  };
}

type SetState = (fn: (state: TasksState) => void) => void;

const createActions = (set: SetState): TasksState['actions'] => ({
  setTasks: tasks =>
    set(state => {
      state.tasks = tasks;
      state.loadError = null;
    }),
  setLoadError: error =>
    set(state => {
      state.loadError = error;
    }),
  markRunning: (label, sessionId, startedAt) =>
    set(state => {
      state.running[label] = { sessionId, startedAt };
    }),
  markStopped: (label, exitCode) =>
    set(state => {
      delete state.running[label];
      state.lastExitCodes[label] = exitCode;
    }),
});

export const useTasksStore = create<TasksState>()(
  devtools(
    subscribeWithSelector(
      immer(set => ({
        tasks: [],
        running: {},
        lastExitCodes: {},
        loadError: null,
        actions: createActions(set),
      }))
    ),
    { name: 'tasks-store' }
  )
);

export const useTasksActions = (): TasksState['actions'] => useTasksStore(state => state.actions);
