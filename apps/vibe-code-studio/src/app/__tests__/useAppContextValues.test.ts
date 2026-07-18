import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAppContextValues } from '../useAppContextValues';
import type {
  AppExtrasContextValue,
  ServicesContextValue,
  UIPanelContextValue,
  WorkspaceContextValue,
} from '../contexts';

describe('useAppContextValues', () => {
  it('memoizes the four context provider values', () => {
    const services = {
      aiService: { id: 'ai' },
      fileSystemService: { id: 'fs' },
      taskPlanner: {},
      liveStream: {},
      executionEngine: {},
      agentRuntime: {},
      backgroundAgentSystem: {},
      orchestrator: {},
      performanceOptimizer: {},
    } as unknown as ServicesContextValue;

    const uiPanel = {
      settingsOpen: false,
      setSettingsOpen: vi.fn(),
      aiChatOpen: false,
      setAiChatOpen: vi.fn(),
      gitPanelOpen: false,
      setGitPanelOpen: vi.fn(),
      globalSearchOpen: false,
      setGlobalSearchOpen: vi.fn(),
      keyboardShortcutsOpen: false,
      setKeyboardShortcutsOpen: vi.fn(),
      backgroundPanelOpen: false,
      setBackgroundPanelOpen: vi.fn(),
      commandPaletteOpen: false,
      setCommandPaletteOpen: vi.fn(),
      previewOpen: false,
      setPreviewOpen: vi.fn(),
      terminalOpen: false,
      setTerminalOpen: vi.fn(),
      sidebarOpen: true,
      setSidebarOpen: vi.fn(),
      activeVisualPanel: null,
      setActiveVisualPanel: vi.fn(),
      chatMode: 'chat',
      setChatMode: vi.fn(),
      errorFixPanelOpen: false,
      setErrorFixPanelOpen: vi.fn(),
      agentModeOpen: false,
      setAgentModeOpen: vi.fn(),
      brainScanOpen: false,
      setBrainScanOpen: vi.fn(),
    } as unknown as UIPanelContextValue;

    const workspace = {
      currentFile: null,
      openFiles: [],
      workspaceFolder: null,
      workspaceContext: null,
      isIndexing: false,
      indexingProgress: 0,
      getFileContext: vi.fn(),
      editorSettings: {},
      updateEditorSettings: vi.fn(),
      setCurrentFile: vi.fn(),
      handleOpenFile: vi.fn(),
      handleCloseFile: vi.fn(),
      handleFileChange: vi.fn(),
      handleSaveFile: vi.fn(),
      handleDeleteFile: vi.fn(),
      handleCreateWorkspaceFile: vi.fn(),
      handleCreateWorkspaceFolder: vi.fn(),
      handleRenameWorkspacePath: vi.fn(),
      handleNewFile: vi.fn(),
      handleOpenFolderDialog: vi.fn(),
      handleCloseFolder: vi.fn(),
      handleOpenFolder: vi.fn(),
      handleCreateFile: vi.fn(),
      handleSaveAll: vi.fn(),
      handleEditorMount: vi.fn(),
      editorRef: { current: null },
      handleOpenFileFromSearch: vi.fn(),
      handleReplaceInFile: vi.fn(),
      handleSearchInFiles: vi.fn(),
    } as unknown as WorkspaceContextValue;

    const extras = {
      aiMessages: [],
      isAiResponding: false,
      aiResponseState: 'idle',
      handleAIMessage: vi.fn(),
      cancelAiResponse: vi.fn(),
      addAiMessage: vi.fn(),
      updateAiMessage: vi.fn(),
      clearAiMessages: vi.fn(),
      handleModelChange: vi.fn(),
      handleProviderChange: vi.fn(),
      currentModel: 'm',
      currentProvider: 'p',
      openrouterApiKey: '',
      currentError: null,
      currentFix: null,
      fixLoading: false,
      fixError: '',
      setCurrentError: vi.fn(),
      setCurrentFix: vi.fn(),
      setFixLoading: vi.fn(),
      setFixError: vi.fn(),
      handleApplyFix: vi.fn(),
      autoFixServiceRef: { current: null },
      multiFileEditPlan: null,
      multiFileChanges: [],
      multiFileApprovalOpen: false,
      handleApplyMultiFileChanges: vi.fn(),
      handleRejectMultiFileChanges: vi.fn(),
      notifications: [],
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showWarning: vi.fn(),
      removeNotification: vi.fn(),
      commands: [],
      handleToggleScreenshotPanel: vi.fn(),
      handleToggleComponentLibrary: vi.fn(),
      handleToggleVisualEditor: vi.fn(),
      handleInsertCode: vi.fn(),
    } as unknown as AppExtrasContextValue;

    const { result } = renderHook(() =>
      useAppContextValues({ services, uiPanel, workspace, extras })
    );

    expect(result.current.servicesContextValue).toBe(services);
    expect(result.current.uiPanelContextValue.sidebarOpen).toBe(true);
    expect(result.current.workspaceContextValue.workspaceFolder).toBeNull();
    expect(result.current.appExtrasContextValue.currentModel).toBe('m');
  });
});
