/**
 * useAppState - Centralized state management for App.tsx
 * Extracts all useState calls into a single hook for cleaner organization
 */

import type { FileChange, MultiFileEditPlan } from '@vibetech/types';
import { useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
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
  setCurrentError: Dispatch<SetStateAction<DetectedError | null>>;
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

interface AppRefs {
  editorRef: MutableRefObject<MonacoEditor.IStandaloneCodeEditor | null>;
  errorDetectorRef: MutableRefObject<ErrorDetector | null>;
  autoFixServiceRef: MutableRefObject<AutoFixService | null>;
  codeActionProviderRef: MutableRefObject<{ dispose: () => void } | null>;
  tabCompletionProviderRef: MutableRefObject<{ dispose: () => void } | null>;
}

function useAppRefs(): AppRefs {
  // Refs for Monaco editor and auto-fix
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const errorDetectorRef = useRef<ErrorDetector | null>(null);
  const autoFixServiceRef = useRef<AutoFixService | null>(null);
  const codeActionProviderRef = useRef<{ dispose: () => void } | null>(null);
  const tabCompletionProviderRef = useRef<{ dispose: () => void } | null>(null);
  return {
    editorRef,
    errorDetectorRef,
    autoFixServiceRef,
    codeActionProviderRef,
    tabCompletionProviderRef,
  };
}

interface ComputedStateInput {
  gitPanelOpen: boolean;
  globalSearchOpen: boolean;
  keyboardShortcutsOpen: boolean;
  backgroundPanelOpen: boolean;
  previewOpen: boolean;
  terminalOpen: boolean;
  activeVisualPanel: VisualPanelState;
  chatMode: ChatMode;
  multiFileEditPlan: MultiFileEditPlan | null;
  multiFileChanges: FileChange[];
  multiFileApprovalOpen: boolean;
  currentError: DetectedError | null;
  currentFix: GeneratedFix | null;
  errorFixPanelOpen: boolean;
  fixLoading: boolean;
  fixError: string;
  currentModel: string;
  currentProvider: string;
  openrouterApiKey: string;
}

interface ComputedState {
  uiState: AppUIState;
  multiFileEditState: MultiFileEditState;
  errorFixState: ErrorFixState;
  aiProviderState: AIProviderState;
}

function buildComputedState(s: ComputedStateInput): ComputedState {
  const uiState: AppUIState = {
    settingsOpen: false, // Managed by useAppSettings
    aiChatOpen: false, // Managed by useAIChat
    gitPanelOpen: s.gitPanelOpen,
    globalSearchOpen: s.globalSearchOpen,
    keyboardShortcutsOpen: s.keyboardShortcutsOpen,
    backgroundPanelOpen: s.backgroundPanelOpen,
    commandPaletteOpen: false, // Managed by useAICommandPalette
    previewOpen: s.previewOpen,
    terminalOpen: s.terminalOpen,
    activeVisualPanel: s.activeVisualPanel,
    chatMode: s.chatMode,
  };

  const multiFileEditState: MultiFileEditState = {
    plan: s.multiFileEditPlan,
    changes: s.multiFileChanges,
    approvalOpen: s.multiFileApprovalOpen,
  };

  const errorFixState: ErrorFixState = {
    currentError: s.currentError,
    currentFix: s.currentFix,
    panelOpen: s.errorFixPanelOpen,
    loading: s.fixLoading,
    errorMessage: s.fixError,
  };

  const aiProviderState: AIProviderState = {
    currentModel: s.currentModel,
    currentProvider: s.currentProvider,
    openrouterApiKey: s.openrouterApiKey,
  };

  return { uiState, multiFileEditState, errorFixState, aiProviderState };
}

function useUIStateGroup() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('chat');
  const [gitPanelOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = useState(false);
  const [backgroundPanelOpen, setBackgroundPanelOpen] = useState(false);
  const [activeVisualPanel, setActiveVisualPanel] = useState<VisualPanelState>('none');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [agentModeOpen, setAgentModeOpen] = useState(false);
  return {
    previewOpen, setPreviewOpen, chatMode, setChatMode, gitPanelOpen,
    globalSearchOpen, setGlobalSearchOpen, keyboardShortcutsOpen, setKeyboardShortcutsOpen,
    backgroundPanelOpen, setBackgroundPanelOpen, activeVisualPanel, setActiveVisualPanel,
    terminalOpen, setTerminalOpen, agentModeOpen, setAgentModeOpen,
  };
}

function useMultiFileStateGroup() {
  const [multiFileEditPlan, setMultiFileEditPlan] = useState<MultiFileEditPlan | null>(null);
  const [multiFileChanges, setMultiFileChanges] = useState<FileChange[]>([]);
  const [multiFileApprovalOpen, setMultiFileApprovalOpen] = useState(false);
  return {
    multiFileEditPlan, setMultiFileEditPlan, multiFileChanges, setMultiFileChanges,
    multiFileApprovalOpen, setMultiFileApprovalOpen,
  };
}

function useErrorFixStateGroup() {
  const [currentError, setCurrentError] = useState<DetectedError | null>(null);
  const [currentFix, setCurrentFix] = useState<GeneratedFix | null>(null);
  const [errorFixPanelOpen, setErrorFixPanelOpen] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState<string>('');
  return {
    currentError, setCurrentError, currentFix, setCurrentFix,
    errorFixPanelOpen, setErrorFixPanelOpen, fixLoading, setFixLoading, fixError, setFixError,
  };
}

function useAIProviderStateGroup() {
  const [currentModel, setCurrentModel] = useState('moonshot/kimi-2.5-pro');
  // Use OpenRouter as default (routes all providers)
  const [currentProvider, setCurrentProvider] = useState('openrouter');
  const [openrouterApiKey, setOpenrouterApiKey] = useState<string>('');
  return {
    currentModel, setCurrentModel, currentProvider, setCurrentProvider,
    openrouterApiKey, setOpenrouterApiKey,
  };
}

export function useAppState(): UseAppStateReturn {
  // Loading - start without loading screen
  const [isLoading] = useState(false);

  // Database status
  const [dbStatus, setDbStatus] = useState<DbStatus>('initializing');

  // Grouped state bags
  const ui = useUIStateGroup();
  const multiFile = useMultiFileStateGroup();
  const errorFix = useErrorFixStateGroup();
  const aiProvider = useAIProviderStateGroup();

  // Refs for Monaco editor and auto-fix
  const refs = useAppRefs();

  // Computed state objects for props
  const computed = buildComputedState({
    gitPanelOpen: ui.gitPanelOpen,
    globalSearchOpen: ui.globalSearchOpen,
    keyboardShortcutsOpen: ui.keyboardShortcutsOpen,
    backgroundPanelOpen: ui.backgroundPanelOpen,
    previewOpen: ui.previewOpen,
    terminalOpen: ui.terminalOpen,
    activeVisualPanel: ui.activeVisualPanel,
    chatMode: ui.chatMode,
    multiFileEditPlan: multiFile.multiFileEditPlan,
    multiFileChanges: multiFile.multiFileChanges,
    multiFileApprovalOpen: multiFile.multiFileApprovalOpen,
    currentError: errorFix.currentError,
    currentFix: errorFix.currentFix,
    errorFixPanelOpen: errorFix.errorFixPanelOpen,
    fixLoading: errorFix.fixLoading,
    fixError: errorFix.fixError,
    currentModel: aiProvider.currentModel,
    currentProvider: aiProvider.currentProvider,
    openrouterApiKey: aiProvider.openrouterApiKey,
  });

  return {
    isLoading,
    dbStatus,
    setDbStatus,
    ...ui,
    ...multiFile,
    ...errorFix,
    ...aiProvider,
    ...refs,
    ...computed,
  };
}
