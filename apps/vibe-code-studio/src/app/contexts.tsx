/**
 * App-level React Contexts
 *
 * Replaces the 95-prop pass-through from App.tsx → AppLayout.
 * Organized into 4 focused contexts by domain:
 *   1. ServicesContext  — stable service instances (never re-render)
 *   2. UIPanelContext   — panel open/close state + setters
 *   3. WorkspaceContext — file/project state + file handlers
 *   4. AppExtrasContext — AI chat, error fix, notifications, misc
 */

import { createContext, useContext, type MutableRefObject } from 'react';
import type { BackgroundAgentSystem } from '../services/BackgroundAgentSystem';
import type { AgentOrchestrator } from '../services/specialized-agents/AgentOrchestrator';
import type { AgentPerformanceOptimizer } from '../services/AgentPerformanceOptimizer';
import type { AutoFixService, FixSuggestion, GeneratedFix } from '../services/AutoFixService';
import type { DetectedError } from '../services/ErrorDetector';
import type { FileSystemService } from '../services/FileSystemService';
import type { LiveEditorStream } from '../services/LiveEditorStream';
import type { ExecutionEngine } from '../services/ai/ExecutionEngine';
import type { TaskPlanner } from '../services/ai/TaskPlanner';
import type { UnifiedAIService } from '../services/ai/UnifiedAIService';
import type { AIModel, AIProvider } from '../services/ai/AIProviderInterface';
import type { SearchOptions, SearchResult, SearchScope } from '../components/GlobalSearch/types';
import type { NotificationItem } from '../hooks/useNotifications';
import type { AIMessage, ContextualFile, EditorFile, EditorSettings, WorkspaceContext as WorkspaceIndexContext } from '../types';
import type { FileChange, MultiFileEditPlan } from '../types/multifile';
import type { ChatMode, VisualPanelState } from './types';

// ---------------------------------------------------------------------------
// 1. Services — stable refs, never cause re-renders
// ---------------------------------------------------------------------------

export interface ServicesContextValue {
  aiService: UnifiedAIService;
  fileSystemService: FileSystemService;
  taskPlanner: TaskPlanner;
  liveStream: LiveEditorStream;
  executionEngine: ExecutionEngine;
  backgroundAgentSystem: BackgroundAgentSystem;
  orchestrator: AgentOrchestrator;
  performanceOptimizer: AgentPerformanceOptimizer;
}

export const ServicesContext = createContext<ServicesContextValue | null>(null);

export function useServices(): ServicesContextValue {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices must be used within ServicesContext.Provider');
  return ctx;
}

// ---------------------------------------------------------------------------
// 2. UI Panel — all open/close booleans + setters
// ---------------------------------------------------------------------------

export interface UIPanelContextValue {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  aiChatOpen: boolean;
  setAiChatOpen: (open: boolean) => void;
  gitPanelOpen: boolean;
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
  keyboardShortcutsOpen: boolean;
  setKeyboardShortcutsOpen: (open: boolean) => void;
  backgroundPanelOpen: boolean;
  setBackgroundPanelOpen: (open: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  previewOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
  terminalOpen: boolean;
  setTerminalOpen: (open: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeVisualPanel: VisualPanelState;
  setActiveVisualPanel: (panel: VisualPanelState) => void;
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;
  errorFixPanelOpen: boolean;
  setErrorFixPanelOpen: (open: boolean) => void;
  agentModeOpen: boolean;
  setAgentModeOpen: (open: boolean) => void;
}

export const UIPanelContext = createContext<UIPanelContextValue | null>(null);

export function useUIPanel(): UIPanelContextValue {
  const ctx = useContext(UIPanelContext);
  if (!ctx) throw new Error('useUIPanel must be used within UIPanelContext.Provider');
  return ctx;
}

// ---------------------------------------------------------------------------
// 3. Workspace — file/project state + file operation handlers
// ---------------------------------------------------------------------------

export interface WorkspaceContextValue {
  // State
  currentFile: EditorFile | null;
  openFiles: EditorFile[];
  workspaceFolder: string | null;
  workspaceContext: WorkspaceIndexContext | null;
  isIndexing: boolean;
  indexingProgress: number;
  getFileContext: (file: EditorFile) => ContextualFile[];
  editorSettings: EditorSettings;
  updateEditorSettings: (settings: EditorSettings) => void;
  setCurrentFile: (file: EditorFile | null) => void;

  // File handlers
  handleOpenFile: (filePath: string) => Promise<void>;
  handleCloseFile: (fileId: string) => void;
  handleFileChange: (content: string) => void;
  handleSaveFile: () => Promise<void>;
  handleDeleteFile: (filePath: string) => Promise<void>;
  handleCreateWorkspaceFile: (filePath: string) => Promise<void>;
  handleCreateWorkspaceFolder: (folderPath: string) => Promise<void>;
  handleRenameWorkspacePath: (oldPath: string, newPath: string) => Promise<void>;
  handleNewFile: () => void;
  handleOpenFolderDialog: () => Promise<void>;
  handleCloseFolder: () => void;
  handleOpenFolder: (folderPath: string) => Promise<void>;
  handleCreateFile: (name: string) => void;
  handleSaveAll: () => Promise<void>;

  // Editor mount + ref
  handleEditorMount: (editor: unknown, monaco: unknown) => void;
  editorRef: MutableRefObject<unknown>;

  // Search
  handleOpenFileFromSearch: (file: string, line?: number, column?: number) => void;
  handleReplaceInFile: (file: string, search: string, replace: string, options: SearchOptions) => Promise<void>;
  handleSearchInFiles: (
    searchText: string,
    files: string[],
    options: SearchOptions,
    scope?: SearchScope,
  ) => Promise<Record<string, SearchResult[]>>;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspaceCtx(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspaceCtx must be used within WorkspaceContext.Provider');
  return ctx;
}

// ---------------------------------------------------------------------------
// 4. App Extras — AI chat, error fix, multi-file, notifications, visual, refs
// ---------------------------------------------------------------------------

/** Command entry for the command palette */
export interface CommandEntry {
  id: string;
  title: string;
  description?: string;
  shortcut?: string;
  action: () => void;
  category?: string;
  keywords?: string[];
}

export interface AppExtrasContextValue {
  // AI Chat
  aiMessages: AIMessage[];
  handleAIMessage: (message: string) => Promise<void>;
  addAiMessage: (message: AIMessage) => void;
  updateAiMessage: (messageId: string, updater: (msg: AIMessage) => AIMessage) => void;
  handleModelChange: (model: AIModel) => Promise<void>;
  handleProviderChange: (provider: AIProvider) => Promise<void>;
  handleMultiFileEditDetected?: (plan: MultiFileEditPlan, changes: FileChange[]) => void;
  currentModel: string;
  currentProvider: string;
  openrouterApiKey: string;

  // Error fix
  currentError: DetectedError | null;
  currentFix: GeneratedFix | null;
  fixLoading: boolean;
  fixError: string;
  setCurrentError: (error: DetectedError | null) => void;
  setCurrentFix: (fix: GeneratedFix | null) => void;
  setFixLoading: (loading: boolean) => void;
  setFixError: (error: string) => void;
  handleApplyFix: (suggestion: FixSuggestion) => void;
  autoFixServiceRef: MutableRefObject<AutoFixService | null>;

  // Multi-file edit
  multiFileEditPlan: MultiFileEditPlan | null;
  multiFileChanges: FileChange[];
  multiFileApprovalOpen: boolean;
  handleApplyMultiFileChanges: (selectedFiles: string[]) => Promise<void>;
  handleRejectMultiFileChanges: () => void;

  // Notifications
  notifications: NotificationItem[];
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  removeNotification: (id: string) => void;

  // Commands
  commands: CommandEntry[];

  // Visual panel handlers
  handleToggleScreenshotPanel: () => void;
  handleToggleComponentLibrary: () => void;
  handleToggleVisualEditor: () => void;
  handleInsertCode: (code: string) => void;
}

export const AppExtrasContext = createContext<AppExtrasContextValue | null>(null);

export function useAppExtras(): AppExtrasContextValue {
  const ctx = useContext(AppExtrasContext);
  if (!ctx) throw new Error('useAppExtras must be used within AppExtrasContext.Provider');
  return ctx;
}
