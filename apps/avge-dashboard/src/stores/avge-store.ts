/**
 * AVGE Dashboard — Global State (Zustand)
 *
 * Manages pipeline state, project config, chat messages,
 * pipeline logs, and intelligence library state.
 */

import { create } from 'zustand';
import type {
    BlastStage,
    BrainConfig,
    ChatMessage,
    GeneratedScript,
    IntelligenceItem,
    NotebookProject,
    PipelineRun,
    SyncEntry,
} from '../types';

export type VoiceConfig = BrainConfig['voice'];
export type VisualIdentity = BrainConfig['visualIdentity'];

export interface LogEntry {
  time: string;
  level: 'info' | 'done' | 'warn' | 'fail';
  message: string;
}

interface AVGEStore {
  /* ── Pipeline State ── */
  currentRun: PipelineRun | null;
  runHistory: PipelineRun[];
  isRunning: boolean;

  setCurrentRun: (run: PipelineRun | null) => void;
  addRunToHistory: (run: PipelineRun) => void;
  updateStageStatus: (stage: BlastStage, status: PipelineRun['status']) => void;

  /* ── Pipeline Logs ── */
  logEntries: LogEntry[];
  addLogEntry: (level: LogEntry['level'], message: string) => void;
  clearLogs: () => void;

  /* ── Project State ── */
  activeProject: NotebookProject | null;
  sourceUrls: string[];
  brainContext: string;

  setActiveProject: (project: NotebookProject | null) => void;
  setSourceUrls: (urls: string[]) => void;
  addSourceUrl: (url: string) => void;
  removeSourceUrl: (url: string) => void;
  setBrainContext: (context: string) => void;

  /* ── Script & Assets ── */
  generatedScript: GeneratedScript | null;
  syncTable: SyncEntry[];

  setGeneratedScript: (script: GeneratedScript | null) => void;
  setSyncTable: (table: SyncEntry[]) => void;

  /* ── Chat State ── */
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  chatConversationId: string | null;

  addChatMessage: (message: ChatMessage) => void;
  setChatLoading: (loading: boolean) => void;
  setChatConversationId: (id: string | null) => void;
  clearChat: () => void;

  /* ── Brain I/O ── */
  brainLoading: boolean;
  setBrainLoading: (loading: boolean) => void;

  /* ── Intelligence Library ── */
  intelligenceTree: IntelligenceItem[];
  selectedFile: IntelligenceItem | null;

  setIntelligenceTree: (tree: IntelligenceItem[]) => void;
  setSelectedFile: (file: IntelligenceItem | null) => void;

  /* ── Personality ── */
  voiceConfig: VoiceConfig;
  visualIdentity: VisualIdentity;
  projectName: string;

  setVoiceConfig: (config: Partial<VoiceConfig>) => void;
  setVisualIdentity: (config: Partial<VisualIdentity>) => void;
  setProjectName: (name: string) => void;

  /* ── UI State ── */
  activePanel: 'pipeline' | 'intelligence' | 'chat' | 'config' | 'personality';
  sidebarCollapsed: boolean;

  setActivePanel: (panel: AVGEStore['activePanel']) => void;
  toggleSidebar: () => void;
}

function timeStamp(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

export const useAVGEStore = create<AVGEStore>((set) => ({
  /* ── Pipeline ── */
  currentRun: null,
  runHistory: [],
  isRunning: false,

  setCurrentRun: (run) => set({ currentRun: run, isRunning: run?.status === 'running' }),
  addRunToHistory: (run) => set((s) => ({ runHistory: [run, ...s.runHistory].slice(0, 50) })),
  updateStageStatus: (_stage, _status) => {
    // Phase 3: implement granular stage updates
  },

  /* ── Pipeline Logs ── */
  logEntries: [],
  addLogEntry: (level, message) => set((s) => ({
    logEntries: [...s.logEntries, { time: timeStamp(), level, message }].slice(-200),
  })),
  clearLogs: () => set({ logEntries: [] }),

  /* ── Project ── */
  activeProject: null,
  sourceUrls: [],
  brainContext: '',

  setActiveProject: (project) => set({ activeProject: project }),
  setSourceUrls: (urls) => set({ sourceUrls: urls }),
  addSourceUrl: (url) => set((s) => ({
    sourceUrls: s.sourceUrls.includes(url) ? s.sourceUrls : [...s.sourceUrls, url],
  })),
  removeSourceUrl: (url) => set((s) => ({
    sourceUrls: s.sourceUrls.filter((u) => u !== url),
  })),
  setBrainContext: (context) => set({ brainContext: context }),

  /* ── Script & Assets ── */
  generatedScript: null,
  syncTable: [],

  setGeneratedScript: (script) => set({ generatedScript: script }),
  setSyncTable: (table) => set({ syncTable: table }),

  /* ── Chat ── */
  chatMessages: [],
  chatLoading: false,
  chatConversationId: null,

  addChatMessage: (message) => set((s) => ({
    chatMessages: [...s.chatMessages, message],
  })),
  setChatLoading: (loading) => set({ chatLoading: loading }),
  setChatConversationId: (id) => set({ chatConversationId: id }),
  clearChat: () => set({ chatMessages: [], chatConversationId: null }),

  /* ── Brain I/O ── */
  brainLoading: false,
  setBrainLoading: (loading) => set({ brainLoading: loading }),

  /* ── Intelligence ── */
  intelligenceTree: [],
  selectedFile: null,

  setIntelligenceTree: (tree) => set({ intelligenceTree: tree }),
  setSelectedFile: (file) => set({ selectedFile: file }),

  /* ── Personality ── */
  voiceConfig: { formality: 'casual', pacing: 'steady', emotion: 'energetic', perspective: 'first-person' },
  visualIdentity: { primaryColors: ['#6366f1'], accentColors: ['#22d3ee'], typography: 'modern-sans', thumbnailStyle: 'cinematic' },
  projectName: '',

  setVoiceConfig: (config) => set((s) => ({ voiceConfig: { ...s.voiceConfig, ...config } })),
  setVisualIdentity: (config) => set((s) => ({ visualIdentity: { ...s.visualIdentity, ...config } })),
  setProjectName: (name) => set({ projectName: name }),

  /* ── UI ── */
  activePanel: 'pipeline',
  sidebarCollapsed: false,

  setActivePanel: (panel) => set({ activePanel: panel }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
