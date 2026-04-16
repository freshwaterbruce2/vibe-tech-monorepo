/**
 * App-level type definitions
 * Extracted from App.tsx for modularity
 */

import type { FileChange, MultiFileEditPlan } from '@vibetech/types/multifile';
import type { editor as MonacoEditor } from 'monaco-editor';
import type * as MonacoNS from 'monaco-editor';
import type { GeneratedFix, FixSuggestion } from '../services/AutoFixService';
import type { DetectedError } from '../services/ErrorDetector';
import type { AIMessage, ContextualFile, EditorFile, EditorSettings, WorkspaceContext } from '../types';
import type { AIModel } from '../services/ai/AIProviderInterface';
import type { SearchOptions } from '../components/GlobalSearch/types';

// Chat modes available in the application
export type ChatMode = 'chat' | 'agent';

// Visual panel states
export type VisualPanelState = 'none' | 'screenshot' | 'library' | 'visual';

// Database status
export type DbStatus = 'initializing' | 'ready' | 'fallback';

// App UI State
export interface AppUIState {
  settingsOpen: boolean;
  aiChatOpen: boolean;
  gitPanelOpen: boolean;
  globalSearchOpen: boolean;
  keyboardShortcutsOpen: boolean;
  backgroundPanelOpen: boolean;
  commandPaletteOpen: boolean;
  previewOpen: boolean;
  terminalOpen: boolean;
  activeVisualPanel: VisualPanelState;
  chatMode: ChatMode;
}

// Multi-file edit state
export interface MultiFileEditState {
  plan: MultiFileEditPlan | null;
  changes: FileChange[];
  approvalOpen: boolean;
}

// Auto-fix error state
export interface ErrorFixState {
  currentError: DetectedError | null;
  currentFix: GeneratedFix | null;
  panelOpen: boolean;
  loading: boolean;
  errorMessage: string;
}

// AI Provider state
export interface AIProviderState {
  currentModel: string;
  currentProvider: string;
  openrouterApiKey: string;
}

// Combined app state for hooks
export interface AppState {
  isLoading: boolean;
  dbStatus: DbStatus;
  ui: AppUIState;
  multiFileEdit: MultiFileEditState;
  errorFix: ErrorFixState;
  aiProvider: AIProviderState;
}

// NOTE: AppLayoutProps is defined in AppLayout.tsx to keep props close to the component

// Handler functions interface
export interface AppHandlers {
  // File operations
  handleOpenFile: (filePath: string) => Promise<void>;
  handleCloseFile: (fileId: string) => void;
  handleFileChange: (content: string) => void;
  handleSaveFile: () => Promise<void>;
  handleCreateFile: (name: string) => void;
  handleDeleteFile: (filePath: string) => Promise<void>;
  handleSaveAll: () => Promise<void>;
  handleNewFile: () => void;

  // Workspace
  handleOpenFolder: (folderPath: string) => Promise<void>;
  handleOpenFolderDialog: () => Promise<void>;
  handleCloseFolder: () => void;

  // Editor
  handleEditorMount: (editor: MonacoEditor.IStandaloneCodeEditor, monaco: typeof MonacoNS) => void;
  handleApplyFix: (suggestion: FixSuggestion) => void;
  handleInsertCode: (code: string) => void;

  // Search
  handleOpenFileFromSearch: (file: string, line?: number, column?: number) => void;
  handleReplaceInFile: (file: string, search: string, replace: string, options: SearchOptions) => Promise<void>;

  // Visual panels
  handleToggleScreenshotPanel: () => void;
  handleToggleComponentLibrary: () => void;
  handleToggleVisualEditor: () => void;

  // Multi-file edit
  handleApplyMultiFileChanges: (selectedFiles: string[]) => Promise<void>;
  handleRejectMultiFileChanges: () => void;

  // AI/Model
  handleAIMessage: (message: string) => Promise<void>;
  handleAICommand: (command: string) => Promise<void>;
  handleModelChange: (model: AIModel) => Promise<void>;
  handleProviderChange: (provider: string) => Promise<void>;

  // AI Chat state
  addAiMessage: (message: AIMessage) => void;
  updateAiMessage: (messageId: string, updater: (msg: AIMessage) => AIMessage) => void;

  // File manager setters
  setCurrentFile: (file: EditorFile | null) => void;
  setOpenFiles: (files: EditorFile[]) => void;

  // UI state setters
  setSettingsOpen: (open: boolean) => void;
  setAiChatOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setGlobalSearchOpen: (open: boolean) => void;
  setKeyboardShortcutsOpen: (open: boolean) => void;
  setBackgroundPanelOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setPreviewOpen: (open: boolean) => void;
  setTerminalOpen: (open: boolean) => void;
  setActiveVisualPanel: (panel: VisualPanelState) => void;
  setChatMode: (mode: ChatMode) => void;
  // Error fix setters
  setErrorFixPanelOpen: (open: boolean) => void;
  setCurrentError: (error: DetectedError | null) => void;
  setCurrentFix: (fix: GeneratedFix | null) => void;
  setFixLoading: (loading: boolean) => void;
  setFixError: (error: string) => void;

  // Notification handlers
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  removeNotification: (id: string) => void;

  // Settings
  updateEditorSettings: (settings: EditorSettings) => void;
  setWorkspaceFolder: (folder: string | null) => void;

  // Workspace
  indexWorkspace: (folder: string) => Promise<WorkspaceContext | null>;
  getFileContext: (file: EditorFile) => ContextualFile[];
}
