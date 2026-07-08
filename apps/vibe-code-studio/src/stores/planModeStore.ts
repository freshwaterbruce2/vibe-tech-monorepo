/**
 * Plan Mode store — lifecycle state for spec 05 Phase 1 (research pass →
 * markdown plan under .vcs/plans/). Read by the Plan Mode dialog + commands.
 * Spec: FEATURE_SPECS/competitive-gaps/05-PLAN-MODE.md
 */
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type PlanModePhase = 'idle' | 'researching' | 'writing' | 'done' | 'error';

export interface PlanModeState {
  phase: PlanModePhase;
  dialogOpen: boolean;
  /** Absolute path of the most recently written plan file. */
  latestPlanPath: string | null;
  /** Paths written this session, newest first. */
  history: string[];
  error: string | null;
  actions: {
    setDialogOpen: (open: boolean) => void;
    start: () => void;
    setPhase: (phase: PlanModePhase) => void;
    succeed: (planPath: string) => void;
    fail: (message: string) => void;
    reset: () => void;
  };
}

type SetState = (fn: (state: PlanModeState) => void) => void;

const createActions = (set: SetState): PlanModeState['actions'] => ({
  setDialogOpen: open =>
    set(state => {
      state.dialogOpen = open;
    }),
  start: () =>
    set(state => {
      state.phase = 'researching';
      state.error = null;
    }),
  setPhase: phase =>
    set(state => {
      state.phase = phase;
    }),
  succeed: planPath =>
    set(state => {
      state.phase = 'done';
      state.latestPlanPath = planPath;
      state.history = [planPath, ...state.history].slice(0, 50);
      state.error = null;
    }),
  fail: message =>
    set(state => {
      state.phase = 'error';
      state.error = message;
    }),
  reset: () =>
    set(state => {
      state.phase = 'idle';
      state.error = null;
    }),
});

export const usePlanModeStore = create<PlanModeState>()(
  devtools(
    subscribeWithSelector(
      immer(set => ({
        phase: 'idle' as PlanModePhase,
        dialogOpen: false,
        latestPlanPath: null,
        history: [],
        error: null,
        actions: createActions(set),
      }))
    ),
    { name: 'plan-mode-store' }
  )
);

export const usePlanModeActions = (): PlanModeState['actions'] =>
  usePlanModeStore(state => state.actions);
