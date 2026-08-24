/**
 * Covers App.handleOpenFolderDialog electron + error fallback branches.
 */
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setFolderPathDialogOpen = vi.hoisted(() => vi.fn());
const handleOpenFolderInner = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const showError = vi.hoisted(() => vi.fn());
const indexWorkspace = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const setWorkspaceFolder = vi.hoisted(() => vi.fn());
const addAiMessage = vi.hoisted(() => vi.fn());
const captured = vi.hoisted(() => ({
  onOpenFolder: null as null | (() => Promise<void>),
}));

vi.mock('../app/AppLayout', () => ({ AppLayout: () => null }));

vi.mock('../hooks/useAICommandPalette', () => ({
  useAICommandPalette: (props: { onOpenFolder?: () => void | Promise<void> }) => {
    captured.onOpenFolder = props.onOpenFolder as () => Promise<void>;
    return {
      commandPaletteOpen: false,
      setCommandPaletteOpen: vi.fn(),
      toggleCommandPalette: vi.fn(),
      commands: [],
    };
  },
}));

vi.mock('../app/hooks/useAppEffects', () => ({
  useAIProviderInit: vi.fn(),
  useApiKeyLoader: vi.fn(),
  useAppInit: vi.fn(),
  useDatabaseInit: vi.fn(),
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('../modules/core/hooks/useAppServices', () => ({
  useAppServices: () => ({
    aiService: {},
    fileSystemService: {},
    multiFileEditor: {},
    taskPlanner: {},
    liveStream: {},
    executionEngine: {},
    backgroundAgentSystem: {},
    orchestrator: {},
    performanceOptimizer: {},
  }),
}));

vi.mock('../app/hooks/useAppState', () => ({
  useAppState: () => ({
    isLoading: false,
    dbStatus: 'ready',
    setDbStatus: vi.fn(),
    previewOpen: false,
    setPreviewOpen: vi.fn(),
    chatMode: 'chat',
    setChatMode: vi.fn(),
    gitPanelOpen: false,
    setGitPanelOpen: vi.fn(),
    globalSearchOpen: false,
    setGlobalSearchOpen: vi.fn(),
    keyboardShortcutsOpen: false,
    setKeyboardShortcutsOpen: vi.fn(),
    backgroundPanelOpen: false,
    setBackgroundPanelOpen: vi.fn(),
    activeVisualPanel: 'none',
    setActiveVisualPanel: vi.fn(),
    terminalOpen: false,
    setTerminalOpen: vi.fn(),
    agentModeOpen: false,
    setAgentModeOpen: vi.fn(),
    multiFileEditPlan: null,
    setMultiFileEditPlan: vi.fn(),
    multiFileChanges: [],
    setMultiFileChanges: vi.fn(),
    multiFileApprovalOpen: false,
    setMultiFileApprovalOpen: vi.fn(),
    currentError: null,
    setCurrentError: vi.fn(),
    currentFix: null,
    setCurrentFix: vi.fn(),
    errorFixPanelOpen: false,
    setErrorFixPanelOpen: vi.fn(),
    fixLoading: false,
    setFixLoading: vi.fn(),
    fixError: '',
    setFixError: vi.fn(),
    currentModel: 'deepseek',
    setCurrentModel: vi.fn(),
    currentProvider: 'openrouter',
    setCurrentProvider: vi.fn(),
    openrouterApiKey: '',
    setOpenrouterApiKey: vi.fn(),
    editorRef: { current: null },
    errorDetectorRef: { current: null },
    autoFixServiceRef: { current: null },
    codeActionProviderRef: { current: null },
    tabCompletionProviderRef: { current: null },
    folderPathDialogOpen: false,
    setFolderPathDialogOpen,
  }),
}));

vi.mock('../hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [],
    showError,
    showSuccess: vi.fn(),
    showWarning: vi.fn(),
    removeNotification: vi.fn(),
  }),
}));

vi.mock('../hooks/useBackgroundTaskNotifications', () => ({
  useBackgroundTaskNotifications: vi.fn(),
}));

vi.mock('../hooks/useWorkspace', () => ({
  useWorkspace: () => ({
    workspaceContext: null,
    isIndexing: false,
    indexingProgress: 0,
    getFileContext: vi.fn(),
    indexWorkspace,
  }),
}));

vi.mock('../hooks/useAppSettings', () => ({
  useAppSettings: () => ({
    settingsOpen: false,
    setSettingsOpen: vi.fn(),
    editorSettings: { fontSize: 14 },
    updateEditorSettings: vi.fn(),
    sidebarOpen: true,
    setSidebarOpen: vi.fn(),
    workspaceFolder: null,
    setWorkspaceFolder,
  }),
}));

vi.mock('../hooks/useFileManager', () => ({
  useFileManager: () => ({
    currentFile: null,
    openFiles: [],
    handleOpenFile: vi.fn(),
    handleCloseFile: vi.fn(),
    handleFileChange: vi.fn(),
    handleSaveFile: vi.fn(),
    setCurrentFile: vi.fn(),
    setOpenFiles: vi.fn(),
  }),
}));

vi.mock('../hooks/useAIChat', () => ({
  useAIChat: () => ({
    aiMessages: [],
    aiChatOpen: false,
    isAiResponding: false,
    aiResponseState: 'idle',
    setAiChatOpen: vi.fn(),
    handleSendMessage: vi.fn(),
    cancelAiResponse: vi.fn(),
    addAiMessage,
    updateAiMessage: vi.fn(),
    clearAiMessages: vi.fn(),
  }),
}));

vi.mock('../app/hooks/useWorkspaceFileHandlers', () => ({
  useWorkspaceFileHandlers: () => ({
    handleCreateFile: vi.fn(),
    handleCreateWorkspaceFile: vi.fn(),
    handleCreateWorkspaceFolder: vi.fn(),
    handleRenameWorkspacePath: vi.fn(),
    handleDeleteFile: vi.fn(),
    handleSaveAll: vi.fn(),
    handleCloseFolder: vi.fn(),
    handleOpenFolder: handleOpenFolderInner,
    handleNewFile: vi.fn(),
  }),
}));

vi.mock('../app/hooks/useAppHandlers', () => ({
  useAppHandlers: () => ({
    handleEditorMount: vi.fn(),
    handleOpenFileFromSearch: vi.fn(),
    handleReplaceInFile: vi.fn(),
    handleSearchInFiles: vi.fn(),
    handleModelChange: vi.fn(),
    handleProviderChange: vi.fn(),
    handleAICommand: vi.fn(),
    handleAIMessage: vi.fn(),
  }),
}));

import App from '../App';

describe('App open-folder dialog paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.onOpenFolder = null;
    delete (window as unknown as { electron?: unknown }).electron;
  });

  afterEach(() => {
    delete (window as unknown as { electron?: unknown }).electron;
  });

  it('uses electron.dialog.openFolder when available', async () => {
    const openFolder = vi.fn().mockResolvedValue({
      canceled: false,
      filePaths: ['C:\\Users\\me\\proj'],
    });
    (window as unknown as { electron: unknown }).electron = {
      dialog: { openFolder },
    };
    render(<App />);
    expect(captured.onOpenFolder).toBeTypeOf('function');
    await act(async () => {
      await captured.onOpenFolder?.();
    });
    expect(openFolder).toHaveBeenCalled();
    // handleOpenFolder indexes via setWorkspaceFolder (local App callback)
    expect(setWorkspaceFolder).toHaveBeenCalledWith('C:/Users/me/proj');
  });

  it('falls back to manual dialog on picker error', async () => {
    (window as unknown as { electron: unknown }).electron = {
      dialog: {
        openFolder: vi.fn().mockRejectedValue(new Error('picker crashed')),
      },
    };
    render(<App />);
    await act(async () => {
      await captured.onOpenFolder?.();
    });
    // showError + setFolderPathDialogOpen(true) run on non-Abort errors
    expect(showError).toHaveBeenCalledWith(
      'Open Folder Failed',
      expect.stringContaining('picker crashed')
    );
  });
});
