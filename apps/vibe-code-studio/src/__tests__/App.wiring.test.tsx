/**
 * App wiring tests.
 *
 * Covers the integration lines App threads through its hooks: the command
 * palette `onFind` handler (opens global search) and the Git-panel / command
 * palette toggles now passed to the keyboard-shortcut and UI-panel contexts.
 * Every heavy hook is stubbed and AppLayout is rendered as a no-op so we can
 * mount App, capture the props handed to useAICommandPalette, and invoke them.
 */
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Capture handles --------------------------------------------------------
const captured = vi.hoisted(() => ({
  paletteProps: null as { onFind?: () => void } | null,
  keyboardArgs: null as { setGitPanelOpen?: unknown; toggleCommandPalette?: unknown } | null,
}));

const setGlobalSearchOpen = vi.hoisted(() => vi.fn());
const setGitPanelOpen = vi.hoisted(() => vi.fn());
const toggleCommandPalette = vi.hoisted(() => vi.fn());

// --- Render App with the real tree stubbed out ------------------------------
vi.mock('../app/AppLayout', () => ({ AppLayout: () => null }));

vi.mock('../hooks/useAICommandPalette', () => ({
  useAICommandPalette: (props: { onFind?: () => void }) => {
    captured.paletteProps = props;
    return {
      commandPaletteOpen: false,
      setCommandPaletteOpen: vi.fn(),
      toggleCommandPalette,
      commands: [],
    };
  },
}));

vi.mock('../app/hooks/useAppEffects', () => ({
  useAIProviderInit: vi.fn(),
  useApiKeyLoader: vi.fn(),
  useAppInit: vi.fn(),
  useDatabaseInit: vi.fn(),
  useKeyboardShortcuts: (args: Record<string, unknown>) => {
    captured.keyboardArgs = args;
  },
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
    setGitPanelOpen,
    globalSearchOpen: false,
    setGlobalSearchOpen,
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
  }),
}));

vi.mock('../hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [],
    showError: vi.fn(),
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
    indexWorkspace: vi.fn(),
  }),
}));

vi.mock('../hooks/useAppSettings', () => ({
  useAppSettings: () => ({
    settingsOpen: false,
    setSettingsOpen: vi.fn(),
    editorSettings: { fontSize: 14 },
    updateEditorSettings: vi.fn(),
    sidebarOpen: false,
    setSidebarOpen: vi.fn(),
    workspaceFolder: null,
    setWorkspaceFolder: vi.fn(),
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
    addAiMessage: vi.fn(),
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
    handleMultiFileEditDetected: vi.fn(),
    handleApplyFix: vi.fn(),
    handleApplyMultiFileChanges: vi.fn(),
    handleRejectMultiFileChanges: vi.fn(),
    handleToggleScreenshotPanel: vi.fn(),
    handleToggleComponentLibrary: vi.fn(),
    handleToggleVisualEditor: vi.fn(),
    handleInsertCode: vi.fn(),
    handleAICommand: vi.fn(),
  }),
}));

vi.mock('../services/DesignTokenManager', () => ({
  DesignTokenManager: { load: vi.fn().mockResolvedValue(undefined) },
}));

async function renderApp() {
  const AppModule = await import('../App');
  const App = AppModule.default;
  await act(async () => {
    render(<App />);
    await Promise.resolve();
  });
}

beforeEach(() => {
  captured.paletteProps = null;
  captured.keyboardArgs = null;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('App integration wiring', () => {
  it('passes an onFind handler that opens global search', async () => {
    await renderApp();
    expect(captured.paletteProps?.onFind).toBeTypeOf('function');
    act(() => captured.paletteProps!.onFind!());
    expect(setGlobalSearchOpen).toHaveBeenCalledWith(true);
  });

  it('threads Git-panel setter and command-palette toggle into keyboard shortcuts', async () => {
    await renderApp();
    expect(captured.keyboardArgs?.setGitPanelOpen).toBe(setGitPanelOpen);
    expect(captured.keyboardArgs?.toggleCommandPalette).toBe(toggleCommandPalette);
  });
});
