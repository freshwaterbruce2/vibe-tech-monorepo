/**
 * Artifacts store — UI mirror of persisted artifacts plus the Artifacts
 * panel's open/selection state. Written by artifactCapture; read by
 * ArtifactsPanel and useArtifactCommands.
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Artifact } from '../services/artifacts/types';

export interface ArtifactsState {
  artifacts: Artifact[];
  panelOpen: boolean;
  /** Artifact currently open in the viewer (null = list view) */
  selectedId: string | null;
  actions: {
    setArtifacts: (artifacts: Artifact[]) => void;
    setPanelOpen: (open: boolean) => void;
    togglePanel: () => void;
    select: (id: string | null) => void;
  };
}

type SetState = (fn: (state: ArtifactsState) => void) => void;

const createActions = (set: SetState): ArtifactsState['actions'] => ({
  setArtifacts: artifacts =>
    set(state => {
      state.artifacts = artifacts;
      if (state.selectedId && !artifacts.some(a => a.id === state.selectedId)) {
        state.selectedId = null;
      }
    }),
  setPanelOpen: open =>
    set(state => {
      state.panelOpen = open;
    }),
  togglePanel: () =>
    set(state => {
      state.panelOpen = !state.panelOpen;
    }),
  select: id =>
    set(state => {
      state.selectedId = id;
    }),
});

export const useArtifactsStore = create<ArtifactsState>()(
  devtools(
    subscribeWithSelector(
      immer(set => ({
        artifacts: [],
        panelOpen: false,
        selectedId: null,
        actions: createActions(set),
      }))
    ),
    { name: 'artifacts-store' }
  )
);

/** Insertion-ordered task groups for the panel (pure; call inside useMemo) */
export function groupByTask(artifacts: Artifact[]): Map<string, Artifact[]> {
  const groups = new Map<string, Artifact[]>();
  for (const artifact of artifacts) {
    const existing = groups.get(artifact.taskId);
    if (existing) {
      existing.push(artifact);
    } else {
      groups.set(artifact.taskId, [artifact]);
    }
  }
  return groups;
}
