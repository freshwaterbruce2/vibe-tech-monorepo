/**
 * Test Explorer store — tree + run state for spec 08 Phase 1.
 * Written by services/testing/TestController; read by TestExplorerPanel.
 * Spec: FEATURE_SPECS/competitive-gaps/08-TEST-EXPLORER.md
 */
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { TestFileNode, TestNodeStatus } from '../services/testing/TestController';

export interface TestExplorerState {
  framework: string | null;
  files: TestFileNode[];
  discovering: boolean;
  runningAll: boolean;
  panelOpen: boolean;
  error: string | null;
  actions: {
    setPanelOpen: (open: boolean) => void;
    togglePanel: () => void;
    setDiscovering: (discovering: boolean) => void;
    setRunningAll: (running: boolean) => void;
    setDiscovery: (framework: string, files: TestFileNode[]) => void;
    upsertFileNode: (node: TestFileNode) => void;
    setFileStatus: (file: string, status: TestNodeStatus) => void;
    setError: (error: string | null) => void;
  };
}

type SetState = (fn: (state: TestExplorerState) => void) => void;

const placeholderNode = (file: string, status: TestNodeStatus): TestFileNode => ({
  file,
  status,
  tests: [],
  passed: 0,
  failed: 0,
  skipped: 0,
  duration: 0,
});

const createActions = (set: SetState): TestExplorerState['actions'] => ({
  setPanelOpen: open =>
    set(state => {
      state.panelOpen = open;
    }),
  togglePanel: () =>
    set(state => {
      state.panelOpen = !state.panelOpen;
    }),
  setDiscovering: discovering =>
    set(state => {
      state.discovering = discovering;
      if (discovering) state.error = null;
    }),
  setRunningAll: running =>
    set(state => {
      state.runningAll = running;
      if (running) state.error = null;
    }),
  setDiscovery: (framework, files) =>
    set(state => {
      state.framework = framework;
      state.files = files;
    }),
  upsertFileNode: node =>
    set(state => {
      const index = state.files.findIndex(file => file.file === node.file);
      if (index >= 0) {
        state.files[index] = node;
      } else {
        state.files.push(node);
      }
    }),
  setFileStatus: (file, status) =>
    set(state => {
      const node = state.files.find(candidate => candidate.file === file);
      if (node) {
        node.status = status;
      } else {
        state.files.push(placeholderNode(file, status));
      }
    }),
  setError: error =>
    set(state => {
      state.error = error;
    }),
});

export const useTestExplorerStore = create<TestExplorerState>()(
  devtools(
    subscribeWithSelector(
      immer(set => ({
        framework: null,
        files: [],
        discovering: false,
        runningAll: false,
        panelOpen: false,
        error: null,
        actions: createActions(set),
      }))
    ),
    { name: 'test-explorer-store' }
  )
);
