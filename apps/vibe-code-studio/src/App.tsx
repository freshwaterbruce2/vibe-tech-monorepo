/**
 * App.tsx - Main Application Entry Point (Refactored)
 *
 * This file has been split into modular components:
 * - src/app/types.ts - Type definitions
 * - src/app/hooks/useAppState.ts - State management
 * - src/app/hooks/useAppHandlers.ts - Event handlers
 * - src/app/hooks/useAppEffects.ts - Side effects
 * - src/app/AppLayout.tsx - Visual layout
 *
 * File length optimized (~360 LOC) ✅
 */

import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

// Core Module
import { LoadingScreen } from './modules/core/components/LoadingScreen';
import { useAppServices } from './modules/core/hooks/useAppServices';

// Shared hooks
import { useAIChat } from './hooks/useAIChat';
import { useAICommandPalette } from './hooks/useAICommandPalette';
import { useAppSettings } from './hooks/useAppSettings';
import { useBackgroundTaskNotifications } from './hooks/useBackgroundTaskNotifications';
import { useFileManager } from './hooks/useFileManager';
import { useNotifications } from './hooks/useNotifications';
import { useWorkspace } from './hooks/useWorkspace';

// App-specific hooks and components
import { AppLayout } from './app/AppLayout';
import {
    useAIProviderInit,
    useApiKeyLoader,
    useAppInit,
    useDatabaseInit,
    useKeyboardShortcuts
} from './app/hooks/useAppEffects';
import { useAppHandlers } from './app/hooks/useAppHandlers';
import { useAppState } from './app/hooks/useAppState';

// Components
import { ModernErrorBoundary } from './components/ErrorBoundary/index';
import { InputDialog } from './components/InputDialog';

// Services
import { DesignTokenManager } from './services/DesignTokenManager';
import { logger } from './services/Logger';
import { getUserFriendlyError } from './utils/errorHandler';

// Types
import type { EditorFile } from './types';

function App() {
  // Input dialog state
  const [folderPathDialogOpen, setFolderPathDialogOpen] = useState(false);
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);

  // App state management
  const appState = useAppState();

  // Initialize services
  const {
    aiService,
    fileSystemService,
    multiFileEditor,
    taskPlanner,
    liveStream,
    executionEngine,
    backgroundAgentSystem,
  } = useAppServices();

  // Notifications
  const { notifications, showError, showSuccess, showWarning, removeNotification } =
    useNotifications();

  // Background task notifications
  useBackgroundTaskNotifications({
    backgroundAgentSystem,
    showSuccess,
    showError,
    showWarning,
  });

  // Workspace management
  const { workspaceContext, isIndexing, indexingProgress, getFileContext, indexWorkspace } =
    useWorkspace();

  // App settings and UI state
  const {
    settingsOpen,
    setSettingsOpen,
    editorSettings,
    updateEditorSettings,
    sidebarOpen,
    setSidebarOpen,
    workspaceFolder,
    setWorkspaceFolder,
  } = useAppSettings();

  // File management
  const {
    currentFile,
    openFiles,
    handleOpenFile: handleOpenFileRaw,
    handleCloseFile,
    handleFileChange,
    handleSaveFile,
    setCurrentFile,
    setOpenFiles,
  } = useFileManager({
    fileSystemService,
    onSaveSuccess: (fileName) => showSuccess('File Saved', `${fileName} saved successfully`),
    onSaveError: (fileName) => showError('Save Failed', `Unable to save ${fileName}`),
  });

  // Wrap handleOpenFile with error handling
  const handleOpenFile = useCallback(async (filePath: string) => {
    try {
      await handleOpenFileRaw(filePath);
    } catch (error) {
      logger.error('[App] Failed to open file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to open file';
      showError('Open File Failed', errorMessage);
    }
  }, [handleOpenFileRaw, showError]);

  // AI Chat
  const {
    aiMessages,
    aiChatOpen,
    setAiChatOpen,
    handleSendMessage: handleAIMessage,
    addAiMessage,
    updateAiMessage,
  } = useAIChat({
    aiService,
    currentFile,
    workspaceContext: workspaceContext ?? undefined,
    openFiles,
    workspaceFolder,
    sidebarOpen,
    previewOpen: appState.previewOpen,
    onError: (error) =>
      showError(
        'AI Service Error',
        getUserFriendlyError({
          message: error.message,
          timestamp: new Date(),
        })
      ),
  });

  // Initialize design tokens
  useEffect(() => {
    const loadTokens = async () => {
      await DesignTokenManager.load();
      // We don't have a specific setter for tokens exposed in context yet,
      // but this ensures the async load logic is triggered.
      // In a real scenario, we'd update a context or store here.
      // If it's intended to be a global singleton or side-effect, we just need to ensure load() is called.
    };
    loadTokens();
  }, []);

  // Handle workspace opening
  const handleOpenFolder = useCallback(async (folderPath: string) => {
    try {
      logger.debug(`Opening workspace: ${folderPath}`);
      setWorkspaceFolder(folderPath);
      const indexedContext = await indexWorkspace(folderPath);

      if (indexedContext) {
        addAiMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ **Workspace Indexed Successfully!**\n\nI've analyzed your project at \`${folderPath}\` and I'm now ready to help with:\n\n🔍 **Repository Understanding**: ${indexedContext.totalFiles || 0} files indexed\n🚀 **Multi-file Context**: I understand relationships between your files\n⚡ **Smart Suggestions**: Context-aware code completion and generation\n🧠 **Project Knowledge**: Familiar with your codebase structure\n\n**Languages Detected**: ${indexedContext.languages.join(', ') || 'Analyzing...'}\n**Test Files**: ${indexedContext.testFiles || 0} detected\n\nTry asking me:\n- "Create a new component that fits my project structure"\n- "Explain how this file relates to others"\n- "Generate tests for this function"\n- "Refactor this code to match project patterns"\n\nI'm now your context-aware coding companion! 🎯`,
          timestamp: new Date(),
        });
      } else {
        throw new Error('Failed to index workspace');
      }
    } catch (error) {
      logger.error('Failed to open workspace:', error);
      addAiMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Failed to index workspace at \`${folderPath}\`. I can still help with individual files, but won't have full project context. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      });
    }
  }, [setWorkspaceFolder, indexWorkspace, addAiMessage]);

  // Handle workspace opening with file picker
  const handleOpenFolderDialog = useCallback(async () => {
    try {
      if (window.electron?.isElectron) {
        const result = await window.electron.dialog.openFolder({});
        if (!result.canceled && result.filePaths?.length > 0 && result.filePaths[0]) {
          const normalizedPath = result.filePaths[0].replace(/\\/g, '/');
          await handleOpenFolder(normalizedPath);
        }
      } else if ('showDirectoryPicker' in window) {
        const directoryPicker = globalThis as typeof globalThis & {
          showDirectoryPicker?: () => Promise<{ path?: string; name: string }>;
        };
        const dirHandle = await directoryPicker.showDirectoryPicker?.();
        if (!dirHandle) {
          throw new Error('Directory picker not available');
        }
        const folderPath = dirHandle.path ?? dirHandle.name;
        await handleOpenFolder(folderPath);
      } else {
        // Fallback: use InputDialog for manual path entry
        setFolderPathDialogOpen(true);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      showError('Open Folder Failed', `Unable to open the selected folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [handleOpenFolder, showError]);

  // Helper function for creating new files
  const handleCreateFile = useCallback((name: string) => {
    const getLanguageFromExtension = (filePath: string): string => {
      const ext = filePath.split('.').pop()?.toLowerCase();
      const languageMap: Record<string, string> = {
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        py: 'python', java: 'java', cpp: 'cpp', c: 'c', cs: 'csharp', php: 'php',
        rb: 'ruby', go: 'go', rs: 'rust', html: 'html', css: 'css', scss: 'scss',
        json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml', md: 'markdown',
        sh: 'shell', sql: 'sql',
      };
      return languageMap[ext ?? ''] ?? 'plaintext';
    };

    const newFile: EditorFile = {
      id: name,
      name,
      path: name,
      content: '',
      language: getLanguageFromExtension(name),
      isModified: false,
    };
    setCurrentFile(newFile);
  }, [setCurrentFile]);

  // Handle file deletion
  const handleDeleteFile = useCallback(async (filePath: string): Promise<void> => {
    try {
      await fileSystemService.deleteFile(filePath);
      if (currentFile?.path === filePath) setCurrentFile(null);
      const updatedOpenFiles = openFiles.filter(file => file.path !== filePath);
      setOpenFiles(updatedOpenFiles);
      showSuccess('File Deleted', `Successfully deleted ${filePath.split('/').pop()}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Delete Failed', `Unable to delete file: ${errorMessage}`);
      throw error;
    }
  }, [fileSystemService, currentFile, openFiles, setCurrentFile, setOpenFiles, showSuccess, showError]);

  // Handle saving all open files
  const handleSaveAll = useCallback(async () => {
    try {
      let savedCount = 0;
      for (const file of openFiles) {
        if (file.isModified) {
          await fileSystemService.writeFile(file.path, file.content);
          savedCount++;
        }
      }
      if (savedCount > 0) {
        showSuccess('Files Saved', `Successfully saved ${savedCount} file(s)`);
      } else {
        showWarning('No Changes', 'No files needed to be saved');
      }
    } catch (error: unknown) {
      logger.error('Save all failed', { error });
      showError('Save Failed', 'Unable to save all files');
    }
  }, [openFiles, fileSystemService, showSuccess, showWarning, showError]);

  // Handle closing current workspace
  const handleCloseFolder = useCallback(() => {
    setWorkspaceFolder(null);
    setCurrentFile(null);
    setOpenFiles([]);
    showSuccess('Workspace Closed', 'Workspace has been closed');
  }, [setWorkspaceFolder, setCurrentFile, setOpenFiles, showSuccess]);

  // Handle creating new file
  const handleNewFile = useCallback(() => {
    setNewFileDialogOpen(true);
  }, []);

  // App handlers from useAppHandlers
  const handlers = useAppHandlers({
    aiService,
    fileSystemService,
    multiFileEditor,
    currentFile,
    openFiles,
    workspaceFolder,
    editorRef: appState.editorRef,
    autoFixServiceRef: appState.autoFixServiceRef,
    errorDetectorRef: appState.errorDetectorRef,
    codeActionProviderRef: appState.codeActionProviderRef,
    tabCompletionProviderRef: appState.tabCompletionProviderRef,
    setCurrentError: appState.setCurrentError,
    setCurrentFix: appState.setCurrentFix,
    setErrorFixPanelOpen: appState.setErrorFixPanelOpen,
    setFixLoading: appState.setFixLoading,
    setFixError: appState.setFixError,
    setMultiFileEditPlan: appState.setMultiFileEditPlan,
    setMultiFileChanges: appState.setMultiFileChanges,
    setMultiFileApprovalOpen: appState.setMultiFileApprovalOpen,
    setActiveVisualPanel: appState.setActiveVisualPanel,
    setCurrentModel: appState.setCurrentModel,
    setCurrentProvider: appState.setCurrentProvider,
    setAiChatOpen,
    setCurrentFile,
    setOpenFiles,
    showSuccess,
    showError,
    showWarning,
    handleFileChange,
    handleOpenFileRaw,
    handleAIMessage,
    currentError: appState.currentError,
    aiChatOpen,
    activeVisualPanel: appState.activeVisualPanel,
  });

  // AI-Powered Command Palette
  const { commandPaletteOpen, setCommandPaletteOpen, commands } = useAICommandPalette({
    onSaveFile: handleSaveFile,
    onOpenFolder: handleOpenFolderDialog,
    onNewFile: handleNewFile,
    onSaveAll: handleSaveAll,
    onCloseFolder: handleCloseFolder,
    onToggleSidebar: () => setSidebarOpen(!sidebarOpen),
    onToggleAIChat: () => setAiChatOpen(!aiChatOpen),
    onOpenSettings: () => setSettingsOpen(true),
    onAIExplainCode: async () => handlers.handleAICommand('explain'),
    onAIGenerateTests: async () => handlers.handleAICommand('generate-tests'),
    onAIRefactor: async () => handlers.handleAICommand('refactor'),
    onAIFixBugs: async () => handlers.handleAICommand('fix-bugs'),
    onAIOptimize: async () => handlers.handleAICommand('optimize'),
    onAIAddComments: async () => handlers.handleAICommand('add-comments'),
    onAIGenerateComponent: async () => handlers.handleAICommand('generate-component'),
    onFormatDocument: () => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'f', shiftKey: true, altKey: true, bubbles: true,
      }));
    },
    currentFile: currentFile?.path ?? null,
  });

  // Side effects
  useAIProviderInit();
  useDatabaseInit({ setDbStatus: appState.setDbStatus, showWarning, showError });
  useAppInit({ showWarning, handleOpenFolder, handleOpenFile });
  useApiKeyLoader({ setDeepseekApiKey: appState.setDeepseekApiKey });
  useKeyboardShortcuts({
    setGlobalSearchOpen: appState.setGlobalSearchOpen,
    setAiChatOpen,
    setChatMode: appState.setChatMode,
    setKeyboardShortcutsOpen: appState.setKeyboardShortcutsOpen,
    setTerminalOpen: appState.setTerminalOpen,
    terminalOpen: appState.terminalOpen,
  });

  // Loading screen
  if (appState.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ModernErrorBoundary
      onError={(error, errorInfo) => {
        logger.error('App Error:', error, errorInfo);
        showError('Application Error', 'An unexpected error occurred. Please refresh the page.');
      }}
      onReset={() => globalThis.location.reload()}
    >
      <Router>
        <AppLayout
          // Services
          aiService={aiService}
          fileSystemService={fileSystemService}
          taskPlanner={taskPlanner}
          liveStream={liveStream}
          executionEngine={executionEngine}
          backgroundAgentSystem={backgroundAgentSystem}
          // File state
          currentFile={currentFile}
          openFiles={openFiles}
          workspaceFolder={workspaceFolder}
          // Workspace
          workspaceContext={workspaceContext}
          isIndexing={isIndexing}
          indexingProgress={indexingProgress}
          getFileContext={getFileContext}
          // AI Chat
          aiMessages={aiMessages}
          // Editor settings
          editorSettings={editorSettings}
          sidebarOpen={sidebarOpen}
          // UI State
          settingsOpen={settingsOpen}
          aiChatOpen={aiChatOpen}
          gitPanelOpen={appState.gitPanelOpen}
          globalSearchOpen={appState.globalSearchOpen}
          keyboardShortcutsOpen={appState.keyboardShortcutsOpen}
          backgroundPanelOpen={appState.backgroundPanelOpen}
          commandPaletteOpen={commandPaletteOpen}
          previewOpen={appState.previewOpen}
          terminalOpen={appState.terminalOpen}
          activeVisualPanel={appState.activeVisualPanel}
          chatMode={appState.chatMode}
          // Multi-file edit
          multiFileEditPlan={appState.multiFileEditPlan}
          multiFileChanges={appState.multiFileChanges}
          multiFileApprovalOpen={appState.multiFileApprovalOpen}
          // Error fix
          currentError={appState.currentError}
          currentFix={appState.currentFix}
          errorFixPanelOpen={appState.errorFixPanelOpen}
          fixLoading={appState.fixLoading}
          fixError={appState.fixError}
          // AI Provider
          currentModel={appState.currentModel}
          currentProvider={appState.currentProvider}
          deepseekApiKey={appState.deepseekApiKey}
          // Notifications
          notifications={notifications}
          commands={commands}
          // Refs
          editorRef={appState.editorRef}
          autoFixServiceRef={appState.autoFixServiceRef}
          // Handlers
          handleOpenFile={handleOpenFile}
          handleCloseFile={handleCloseFile}
          handleFileChange={handleFileChange}
          handleSaveFile={handleSaveFile}
          handleDeleteFile={handleDeleteFile}
          handleNewFile={handleNewFile}
          handleOpenFolderDialog={handleOpenFolderDialog}
          handleCloseFolder={handleCloseFolder}
          handleOpenFolder={handleOpenFolder}
          handleCreateFile={handleCreateFile}
          handleSaveAll={handleSaveAll}
          handleEditorMount={handlers.handleEditorMount}
          handleApplyFix={handlers.handleApplyFix}
          handleInsertCode={handlers.handleInsertCode}
          handleOpenFileFromSearch={handlers.handleOpenFileFromSearch}
          handleReplaceInFile={handlers.handleReplaceInFile}
          handleSearchInFiles={handlers.handleSearchInFiles}
          handleToggleScreenshotPanel={handlers.handleToggleScreenshotPanel}
          handleToggleComponentLibrary={handlers.handleToggleComponentLibrary}
          handleToggleVisualEditor={handlers.handleToggleVisualEditor}
          handleApplyMultiFileChanges={handlers.handleApplyMultiFileChanges}
          handleRejectMultiFileChanges={handlers.handleRejectMultiFileChanges}
          handleAIMessage={handleAIMessage}
          handleModelChange={handlers.handleModelChange}
          handleProviderChange={handlers.handleProviderChange}
          handleMultiFileEditDetected={handlers.handleMultiFileEditDetected}
          addAiMessage={addAiMessage}
          updateAiMessage={updateAiMessage}
          setCurrentFile={setCurrentFile}
          // UI setters
          setSettingsOpen={setSettingsOpen}
          setAiChatOpen={setAiChatOpen}
          setSidebarOpen={setSidebarOpen}
          setGlobalSearchOpen={appState.setGlobalSearchOpen}
          setKeyboardShortcutsOpen={appState.setKeyboardShortcutsOpen}
          setBackgroundPanelOpen={appState.setBackgroundPanelOpen}
          setCommandPaletteOpen={setCommandPaletteOpen}
          setPreviewOpen={appState.setPreviewOpen}
          setTerminalOpen={appState.setTerminalOpen}
          setActiveVisualPanel={appState.setActiveVisualPanel}
          setChatMode={appState.setChatMode}
          // Error fix setters
          setErrorFixPanelOpen={appState.setErrorFixPanelOpen}
          setCurrentError={appState.setCurrentError}
          setCurrentFix={appState.setCurrentFix}
          setFixLoading={appState.setFixLoading}
          setFixError={appState.setFixError}
          // Notifications
          showSuccess={showSuccess}
          showError={showError}
          showWarning={showWarning}
          removeNotification={removeNotification}
          // Settings
          updateEditorSettings={updateEditorSettings}
        />
      </Router>

      {/* Input Dialogs */}
      <InputDialog
        isOpen={folderPathDialogOpen}
        title="Open Folder"
        placeholder="/path/to/folder"
        onConfirm={(folderPath) => {
          setFolderPathDialogOpen(false);
          if (folderPath) handleOpenFolder(folderPath);
        }}
        onCancel={() => setFolderPathDialogOpen(false)}
      />

      <InputDialog
        isOpen={newFileDialogOpen}
        title="New File"
        placeholder="script.js"
        onConfirm={(fileName) => {
          setNewFileDialogOpen(false);
          if (fileName) handleCreateFile(fileName);
        }}
        onCancel={() => setNewFileDialogOpen(false)}
      />
    </ModernErrorBoundary>
  );
}

export default App;
