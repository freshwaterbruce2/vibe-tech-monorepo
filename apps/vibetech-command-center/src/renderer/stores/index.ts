import { create } from 'zustand';
import type { FileEvent, ClaudeInvocationResult } from '@shared/types';

export type PanelId = 'apps' | 'databases' | 'backups' | 'builds' | 'rag' | 'claude' | 'agents';

export interface CompletedClaudeRun {
  invocationId: string;
  result: ClaudeInvocationResult;
}

interface UiState {
  activePanel: PanelId;
  wsConnected: boolean;
  recentFileEvents: FileEvent[];
  sidebarCollapsed: boolean;
  claudeCompletedRun: CompletedClaudeRun | null;

  setActivePanel: (p: PanelId) => void;
  setWsConnected: (c: boolean) => void;
  pushFileEvents: (events: FileEvent[]) => void;
  clearFileEvents: () => void;
  toggleSidebar: () => void;
  setClaudeCompletedRun: (run: CompletedClaudeRun | null) => void;
}

const MAX_FILE_EVENTS = 200;

export const useUiStore = create<UiState>((set) => ({
  activePanel: 'apps',
  wsConnected: false,
  recentFileEvents: [],
  sidebarCollapsed: false,
  claudeCompletedRun: null,

  setActivePanel: (p) => set({ activePanel: p }),
  setWsConnected: (c) => set({ wsConnected: c }),
  pushFileEvents: (events) => set((s) => ({
    recentFileEvents: [...events, ...s.recentFileEvents].slice(0, MAX_FILE_EVENTS)
  })),
  clearFileEvents: () => set({ recentFileEvents: [] }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setClaudeCompletedRun: (run) => set({ claudeCompletedRun: run })
}));
