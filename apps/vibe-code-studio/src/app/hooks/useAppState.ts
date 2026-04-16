/**
 * useAppState - Centralized state management for App.tsx
 * Extracts all useState calls into a single hook for cleaner organization
 */

import type { FileChange, MultiFileEditPlan } from '@vibetech/types/multifile';
import { useRef, useState, type MutableRefObject } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';
import type { AutoFixService, GeneratedFix } from '../../services/AutoFixService';
import type { DetectedError, ErrorDetector } from '../../services/ErrorDetector';
import type {
    AIProviderState,
    AppUIState,
    ChatMode,
    DbStatus,
    ErrorFixState,
    MultiFileEditState,
    VisualPanelState,
} from '../types';

export interface UseAppStateReturn {
  // Loading state
  isLoading: boolean;

  // Database status
  dbStatus: DbStatus;
  setDbStatus: (status: DbStatus) => void;

  // UI State
  previewOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;
  gitPanelOpen: boolean;
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
  keyboardShortcutsOpen: boolean;
  setKeyboardShortcutsOpen: (open: boolean) => void;
  backgroundPanelOpen: boolean;
  setBackgroundPanelOpen: (open: boolean) => void;
  activeVisualPanel: VisualPanelState;
  setActiveVisualPanel: (panel: VisualPanelState) => void;
  terminalOpen: boolean;
  setTerminalOpen: (open: boolean) => void;

  // Multi-file edit
  multiFileEditPlan: MultiFileEditPlan | null;
  setMultiFileEditPlan: (plan: MultiFileEditPlan | null) => void;
  multiFileChanges: FileChange[];
  setMultiFileChanges: (changes: FileChange[]) => void;
  multiFileApprovalOpen: boolean;
  setMultiFileApprovalOpen: (open: boolean) => void;

  // Error fix state
  currentError: DetectedError | null;
  setCurrentError: (error: DetectedError | null) => void;
  currentFix: GeneratedFix | null;
  setCurrentFix: (fix: GeneratedFix | null) => void;
  errorFixPanelOpen: boolean;
  setErrorFixPanelOpen: (open: boolean) => void;
  agentModeOpen: boolean;
  setAgentModeOpen: (open: boolean) => void;
  fixLoading: boolean;
  setFixLoading: (loading: boolean) => void;
  fixError: string;
  setFixError: (error: string) => void;

  // AI Provider state
  currentModel: string;
  setCurrentModel: (model: string) => void;
  currentProvider: string;
  setCurrentProvider: (provider: string) => void;
  openrouterApiKey: string;
  setOpenrouterApiKey: (key: string) => void;

  // Refs
  editorRef: MutableRefObject<MonacoEditor.IStandaloneCodeEditor | null>;
  errorDetectorRef: MutableRefObject<ErrorDetector | null>;
  autoFixServiceRef: MutableRefObject<AutoFixService | null>;
  codeActionProviderRef: MutableRefObject<{ dispose: () => void } | null>;
  tabCompletionProviderRef: MutableRefObject<{ dispose: () => void } | null>;

  // Computed state objects
  uiState: AppUIState;
  multiFileEditState: MultiFileEditState;
  errorFixState: ErrorFixState;
  aiProviderState: AIProviderState;
}

export function useAppState(): UseAppStateReturn {
  // Loading - start without loading screen
  const [isLoading] = useState(false);

  // Database status
  const [dbStatus, setDbStatus] = useState<DbStatus>('initializing');

  // UI State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('chat');
  const [gitPanelOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = useState(false);
  const [backgroundPanelOpen, setBackgroundPanelOpen] = useState(false);
  const [activeVisualPanel, setActiveVisualPanel] = useState<VisualPanelState>('none');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [agentModeOpen, setAgentModeOpen] = useState(false);

  // Multi-file edit
  const [multiFileEditPlan, setMultiFileEditPlan] = useState<MultiFileEditPlan | null>(null);
  const [multiFileChanges, setMultiFileChanges] = useState<FileChange[]>([]);
  const [multiFileApprovalOpen, setMultiFileApprovalOpen] = useState(false);

  // Error fix state
  const [currentError, setCurrentError] = useState<DetectedError | null>(null);
  const [currentFix, setCurrentFix] = useState<GeneratedFix | null>(null);
  const [errorFixPanelOpen, setErrorFixPanelOpen] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState<string>('');

  // AI Provider state
  const [currentModel, setCurrentModel] = useState('moonshot/kimi-2.5-pro');
  const [currentProvider, setCurrentProvider] = useState('openrouter'); // Use OpenRouter as default (routes all providers)
  const [openrouterApiKey, setOpenrouterApiKey] = useState<string>('');

  // Refs for Monaco editor and auto-fix
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const errorDetectorRef = useRef<ErrorDetector | null>(null);
  const autoFixServiceRef = useRef<AutoFixService | null>(null);
  const codeActionProviderRef = useRef<{ dispose: () => void } | null>(null);
  const tabCompletionProviderRef = useRef<{ dispose: () => void } | null>(null);

  // Computed state objects for props
  const uiState: AppUIState = {
    settingsOpen: false, // Managed by useAppSettings
    aiChatOpen: false, // Managed by useAIChat
    gitPanelOpen,
    globalSearchOpen,
    keyboardShortcutsOpen,
    backgroundPanelOpen,
    commandPaletteOpen: false, // Managed by useAICommandPalette
    previewOpen,
    terminalOpen,
    activeVisualPanel,
    chatMode,
  };

  const multiFileEditState: MultiFileEditState = {
    plan: multiFileEditPlan,
    changes: multiFileChanges,
    approvalOpen: multiFileApprovalOpen,
  };

  const errorFixState: ErrorFixState = {
    currentError,
    currentFix,
    panelOpen: errorFixPanelOpen,
    loading: fixLoading,
    errorMessage: fixError,
  };

  const aiProviderState: AIProviderState = {
    currentModel,
    currentProvider,
    openrouterApiKey,
  };

  return {
    isLoading,
    dbStatus,
    setDbStatus,
    previewOpen,
    setPreviewOpen,
    chatMode,
    setChatMode,
    gitPanelOpen,
    globalSearchOpen,
    setGlobalSearchOpen,
    keyboardShortcutsOpen,
    setKeyboardShortcutsOpen,
    backgroundPanelOpen,
    setBackgroundPanelOpen,
    activeVisualPanel,
    setActiveVisualPanel,
    terminalOpen,
    setTerminalOpen,
    agentModeOpen,
    setAgentModeOpen,
    multiFileEditPlan,
    setMultiFileEditPlan,
    multiFileChanges,
    setMultiFileChanges,
    multiFileApprovalOpen,
    setMultiFileApprovalOpen,
    currentError,
    setCurrentError,
    currentFix,
    setCurrentFix,
    errorFixPanelOpen,
    setErrorFixPanelOpen,
    fixLoading,
    setFixLoading,
    fixError,
    setFixError,
    currentModel,
    setCurrentModel,
    currentProvider,
    setCurrentProvider,
    openrouterApiKey,
    setOpenrouterApiKey,
    editorRef,
    errorDetectorRef,
    autoFixServiceRef,
    codeActionProviderRef,
    tabCompletionProviderRef,
    uiState,
    multiFileEditState,
    errorFixState,
    aiProviderState,
  };
}
