/**
 * AppLayout - Main application layout component
 * Contains the visual structure extracted from App.tsx
 */

import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useMemo, type MutableRefObject } from 'react';
import styled from 'styled-components';

// Eagerly loaded core components (always visible)
import Editor from '../components/Editor';
import { LazyAIChat, LazyCommandPalette, LazySettings } from '../components/LazyComponents';
import { NotificationContainer } from '../components/Notification';
import Sidebar from '../components/Sidebar';
import StatusBar from '../components/StatusBar';
import TitleBar from '../components/TitleBar';

// Lazy-loaded conditional components (only loaded when their panel is opened)
const BackgroundTaskPanel = lazy(() => import('../components/BackgroundTaskPanel').then(m => ({ default: m.BackgroundTaskPanel })));
const ComponentLibrary = lazy(() => import('../components/ComponentLibrary').then(m => ({ default: m.ComponentLibrary })));
const EditorStreamPanel = lazy(() => import('../components/EditorStreamPanel').then(m => ({ default: m.EditorStreamPanel })));
const ErrorFixPanel = lazy(() => import('../components/ErrorFixPanel'));
const GitPanel = lazy(() => import('../components/GitPanel'));
const GlobalSearch = lazy(() => import('../components/GlobalSearch').then(m => ({ default: m.GlobalSearch })));
const KeyboardShortcuts = lazy(() => import('../components/KeyboardShortcuts').then(m => ({ default: m.KeyboardShortcuts })));
const MultiFileEditApprovalPanel = lazy(() => import('../components/MultiFileEditApprovalPanel').then(m => ({ default: m.MultiFileEditApprovalPanel })));
const PerformanceMonitor = lazy(() => import('../components/PerformanceMonitor'));
const PreviewPanel = lazy(() => import('../components/PreviewPanel').then(m => ({ default: m.PreviewPanel })));
const ScreenshotToCodePanel = lazy(() => import('../components/ScreenshotToCodePanel').then(m => ({ default: m.ScreenshotToCodePanel })));
const TerminalPanel = lazy(() => import('../components/TerminalPanel').then(m => ({ default: m.TerminalPanel })));
const VisualEditor = lazy(() => import('../components/VisualEditor').then(m => ({ default: m.VisualEditor })));
const WelcomeScreen = lazy(() => import('../components/WelcomeScreen'));

import { logger } from '../services/Logger';
import type { AIModel, AIProvider } from '../services/ai/AIProviderInterface';
import type { SearchScope } from '../components/GlobalSearch/types';
import type { AIMessage, EditorFile } from '../types';
import type { ChatMode, VisualPanelState } from './types';

// Styled Components
const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: #1e1e1e;
  color: #d4d4d4;
  overflow: hidden;
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const EditorSection = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
`;

export interface AppLayoutProps {
  // Services
  aiService: any;
  fileSystemService: any;
  taskPlanner: any;
  liveStream: any;
  executionEngine: any;
  backgroundAgentSystem: any;

  // File state
  currentFile: EditorFile | null;
  openFiles: EditorFile[];
  workspaceFolder: string | null;

  // Workspace
  workspaceContext: any;
  isIndexing: boolean;
  indexingProgress: number;
  getFileContext: (file: EditorFile) => any[];

  // AI Chat
  aiMessages: AIMessage[];

  // Editor settings
  editorSettings: any;
  sidebarOpen: boolean;

  // UI State
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

  // Multi-file edit state
  multiFileEditPlan: any;
  multiFileChanges: any[];
  multiFileApprovalOpen: boolean;

  // Error fix state
  currentError: any;
  currentFix: any;
  errorFixPanelOpen: boolean;
  fixLoading: boolean;
  fixError: string;

  // AI Provider state
  currentModel: string;
  currentProvider: string;
  deepseekApiKey: string;

  // Notifications
  notifications: any[];

  // Commands
  commands: any[];

  // AutoFix refs for retrying
  editorRef: MutableRefObject<any>;
  autoFixServiceRef: MutableRefObject<any>;

  // Handlers
  handleOpenFile: (filePath: string) => Promise<void>;
  handleCloseFile: (fileId: string) => void;
  handleFileChange: (content: string) => void;
  handleSaveFile: () => Promise<void>;
  handleDeleteFile: (filePath: string) => Promise<void>;
  handleNewFile: () => void;
  handleOpenFolderDialog: () => Promise<void>;
  handleCloseFolder: () => void;
  handleOpenFolder: (folderPath: string) => Promise<void>;
  handleCreateFile: (name: string) => void;
  handleSaveAll: () => Promise<void>;
  handleEditorMount: (editor: any, monaco: any) => void;
  handleApplyFix: (suggestion: any) => void;
  handleInsertCode: (code: string) => void;
  handleOpenFileFromSearch: (file: string, line?: number, column?: number) => void;
  handleReplaceInFile: (file: string, search: string, replace: string, options: any) => Promise<void>;
  handleSearchInFiles: (
    searchText: string,
    files: string[],
    options: any,
    scope?: SearchScope
  ) => Promise<Record<string, any>>;
  handleToggleScreenshotPanel: () => void;
  handleToggleComponentLibrary: () => void;
  handleToggleVisualEditor: () => void;
  handleApplyMultiFileChanges: (selectedFiles: string[]) => Promise<void>;
  handleRejectMultiFileChanges: () => void;
  handleAIMessage: (message: string) => Promise<void>;
  handleModelChange: (model: AIModel) => Promise<void>;
  handleProviderChange: (provider: AIProvider) => Promise<void>;
  handleMultiFileEditDetected?: (plan: any, changes: any[]) => void;
  addAiMessage: (message: AIMessage) => void;
  updateAiMessage: (messageId: string, updater: (msg: AIMessage) => AIMessage) => void;
  setCurrentFile: (file: EditorFile | null) => void;

  // UI State setters
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
  setCurrentError: (error: any) => void;
  setCurrentFix: (fix: any) => void;
  setFixLoading: (loading: boolean) => void;
  setFixError: (error: string) => void;

  // Notification handlers
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  removeNotification: (id: string) => void;

  // Settings
  updateEditorSettings: (settings: any) => void;
}

export function AppLayout(props: AppLayoutProps) {
  const {
    aiService,
    fileSystemService,
    taskPlanner,
    liveStream,
    executionEngine,
    backgroundAgentSystem,
    currentFile,
    openFiles,
    workspaceFolder,
    workspaceContext,
    isIndexing,
    indexingProgress,
    getFileContext,
    aiMessages,
    editorSettings,
    sidebarOpen,
    settingsOpen,
    aiChatOpen,
    gitPanelOpen,
    globalSearchOpen,
    keyboardShortcutsOpen,
    backgroundPanelOpen,
    commandPaletteOpen,
    previewOpen,
    terminalOpen,
    activeVisualPanel,
    chatMode,
    multiFileEditPlan,
    multiFileChanges,
    multiFileApprovalOpen,
    currentError,
    currentFix,
    errorFixPanelOpen,
    fixLoading,
    fixError,
    currentModel,
    // currentProvider,
    deepseekApiKey,
    notifications,
    commands,
    editorRef,
    autoFixServiceRef,
    handleOpenFile,
    handleCloseFile,
    handleFileChange,
    handleSaveFile,
    handleDeleteFile,
    handleNewFile,
    handleOpenFolderDialog,
    handleCloseFolder,
    handleOpenFolder,
    handleCreateFile,
    handleSaveAll,
    handleEditorMount,
    handleApplyFix,
    handleInsertCode,
    handleOpenFileFromSearch,
    handleReplaceInFile,
    handleSearchInFiles,
    handleToggleScreenshotPanel,
    handleToggleComponentLibrary,
    handleToggleVisualEditor,
    handleApplyMultiFileChanges,
    handleRejectMultiFileChanges,
    handleAIMessage,
    // handleModelChange,
    // handleProviderChange,
    handleMultiFileEditDetected,
    addAiMessage,
    updateAiMessage,
    setCurrentFile,
    setSettingsOpen,
    setAiChatOpen,
    setSidebarOpen,
    setGlobalSearchOpen,
    setKeyboardShortcutsOpen,
    setBackgroundPanelOpen,
    setCommandPaletteOpen,
    setPreviewOpen,
    setTerminalOpen,
    setActiveVisualPanel,
    setChatMode,
    setErrorFixPanelOpen,
    setCurrentError,
    setCurrentFix,
    setFixLoading,
    setFixError,
    showSuccess,
    showError,
    showWarning,
    removeNotification,
    updateEditorSettings,
  } = props;

  // Memoize workspaceContext to prevent unnecessary re-renders of AIChat
  const memoizedWorkspaceContext = useMemo(
    () =>
      workspaceFolder
        ? {
            workspaceRoot: workspaceFolder,
            currentFile: currentFile?.path,
            openFiles: openFiles.map((f) => f.path),
            recentFiles: openFiles.slice(0, 5).map((f) => f.path),
          }
        : undefined,
    [workspaceFolder, currentFile?.path, openFiles]
  );

  return (
    <AppContainer data-testid="app-container">
      <TitleBar
        onSettingsClick={() => setSettingsOpen(true)}
        onNewFile={handleNewFile}
        onOpenFolder={handleOpenFolderDialog}
        onSaveAll={handleSaveAll}
        onCloseFolder={handleCloseFolder}
        onScreenshotToCode={() => setActiveVisualPanel(activeVisualPanel === 'screenshot' ? 'none' : 'screenshot')}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onToggleAIChat={() => setAiChatOpen(!aiChatOpen)}
        onTogglePreview={() => setPreviewOpen(!previewOpen)}
        onToggleBackgroundPanel={() => setBackgroundPanelOpen(!backgroundPanelOpen)}
        previewOpen={previewOpen}
      />

      <MainContent>
        {sidebarOpen && (
          <Sidebar
            workspaceFolder={workspaceFolder}
            onOpenFile={handleOpenFile}
            onToggleAIChat={() => setAiChatOpen(!aiChatOpen)}
            aiChatOpen={aiChatOpen}
            fileSystemService={fileSystemService}
            onDeleteFile={handleDeleteFile}
            onOpenFolder={handleOpenFolderDialog}
            onShowSettings={() => setSettingsOpen(true)}
            onError={showError}
          />
        )}

        <EditorSection>
          {workspaceFolder ? (
            <>
              <Editor
                file={currentFile}
                openFiles={openFiles}
                onFileChange={handleFileChange}
                onCloseFile={handleCloseFile}
                onSaveFile={handleSaveFile}
                onFileSelect={setCurrentFile}
                aiService={aiService}
                workspaceContext={workspaceContext ?? undefined}
                getFileContext={getFileContext}
                settings={editorSettings}
                liveStream={liveStream}
                onEditorMount={handleEditorMount}
              />
              {previewOpen && currentFile && (
                <PreviewPanel
                  code={currentFile.content}
                  fileName={currentFile.name}
                  language={currentFile.language}
                  onClose={() => setPreviewOpen(false)}
                />
              )}
            </>
          ) : (
            <Suspense fallback={null}>
              <WelcomeScreen
                onOpenFolder={handleOpenFolder}
                onCreateFile={handleCreateFile}
                onOpenAIChat={() => setAiChatOpen(true)}
                onShowSettings={() => setSettingsOpen(true)}
                workspaceContext={workspaceContext}
                isIndexing={isIndexing}
                indexingProgress={indexingProgress}
              />
            </Suspense>
          )}
        </EditorSection>

        {aiChatOpen && (
          <Suspense fallback={<div>Loading AI Chat...</div>}>
            <LazyAIChat
              data-testid="ai-chat"
              messages={aiMessages}
              onSendMessage={handleAIMessage}
              onClose={() => setAiChatOpen(false)}
              showReasoningProcess={editorSettings.showReasoningProcess}
              currentModel={editorSettings.aiModel}
              mode={chatMode}
              onModeChange={setChatMode}
              taskPlanner={taskPlanner}
              executionEngine={executionEngine}
              workspaceContext={memoizedWorkspaceContext}
              onAddMessage={addAiMessage}
              onUpdateMessage={updateAiMessage}
              onFileChanged={(filePath, action) => {
                logger.debug('[App] Agent file changed:', filePath, action);
                if (action === 'created' || action === 'modified') {
                  handleOpenFile(filePath);
                }
              }}
              onTaskComplete={(task) => {
                showSuccess('Task Completed', `Successfully executed: ${task.title}`);
              }}
              onTaskError={(task, error) => {
                showError('Task Failed', `Failed to execute ${task.title}: ${error.message}`);
              }}
              onMultiFileEditDetected={handleMultiFileEditDetected}
            />
          </Suspense>
        )}

        {gitPanelOpen && <Suspense fallback={null}><GitPanel workingDirectory={workspaceFolder ?? undefined} /></Suspense>}

        {backgroundPanelOpen && (
          <Suspense fallback={null}>
            <BackgroundTaskPanel
              backgroundAgent={backgroundAgentSystem}
              onTaskClick={(task) => {
                logger.debug('[App] Background task clicked:', task);
              }}
            />
          </Suspense>
        )}
      </MainContent>

      <StatusBar
        currentFile={currentFile}
        aiChatOpen={aiChatOpen}
        backgroundPanelOpen={backgroundPanelOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onToggleAIChat={() => setAiChatOpen(!aiChatOpen)}
        onToggleBackgroundPanel={() => setBackgroundPanelOpen(!backgroundPanelOpen)}
        onOpenAgentMode={() => {
          if (!aiChatOpen) setAiChatOpen(true);
          setChatMode('agent');
        }}
        onOpenTerminal={() => {/* Terminal disabled */}}
        onToggleScreenshot={handleToggleScreenshotPanel}
        onToggleLibrary={handleToggleComponentLibrary}
        onToggleVisualEditor={handleToggleVisualEditor}
      />

      <NotificationContainer notifications={notifications} onClose={removeNotification} />

      <Suspense fallback={null}>
        <EditorStreamPanel
          isStreaming={liveStream.isCurrentlyStreaming()}
          onApprove={(filePath) => {
            logger.debug(`[App] Approved changes for: ${filePath}`);
            showSuccess('Changes Approved', `Applied changes to ${filePath}`);
          }}
          onReject={(filePath) => {
            logger.debug(`[App] Rejected changes for: ${filePath}`);
            showWarning('Changes Rejected', `Discarded changes to ${filePath}`);
          }}
        />
      </Suspense>

      {/* Auto-Fix Error Panel */}
      {errorFixPanelOpen && currentError && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          zIndex: 2000,
          maxWidth: '600px',
        }}>
          <Suspense fallback={null}>
            <ErrorFixPanel
              error={currentError}
              fix={currentFix}
              isLoading={fixLoading}
              errorMessage={fixError}
              showDiff={true}
              onApplyFix={handleApplyFix}
              onDismiss={() => {
                setErrorFixPanelOpen(false);
                setCurrentError(null);
                setCurrentFix(null);
              }}
              onRetry={() => {
                if (currentError && editorRef.current && autoFixServiceRef.current) {
                  setFixLoading(true);
                  setFixError('');
                  autoFixServiceRef.current.generateFix(currentError, editorRef.current)
                    .then((fix: any) => {
                      setCurrentFix(fix);
                      setFixLoading(false);
                    })
                    .catch((err: Error) => {
                      setFixError(err.message || 'Failed to generate fix');
                      setFixLoading(false);
                    });
                }
              }}
            />
          </Suspense>
        </div>
      )}

      <Suspense fallback={<div>Loading Settings...</div>}>
        <LazySettings
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={editorSettings}
          onSettingsChange={async (newSettings) => {
            updateEditorSettings(newSettings);
            if (newSettings.aiModel && newSettings.aiModel !== editorSettings.aiModel) {
              try {
                await aiService.setModel(newSettings.aiModel);
                showSuccess('Settings Updated', 'Your preferences have been saved');
              } catch (error) {
                showError(
                  'Model Error',
                  error instanceof Error ? error.message : 'Failed to update AI model'
                );
              }
            } else {
              showSuccess('Settings Updated', 'Your preferences have been saved');
            }
          }}
        />
      </Suspense>

      <Suspense fallback={<div>Loading Command Palette...</div>}>
        <LazyCommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          commands={commands}
        />
      </Suspense>

      <Suspense fallback={null}>
        <GlobalSearch
          isOpen={globalSearchOpen}
          onClose={() => setGlobalSearchOpen(false)}
          onOpenFile={handleOpenFileFromSearch}
          onReplaceInFile={handleReplaceInFile}
          onSearchInFiles={handleSearchInFiles}
          workspaceFiles={openFiles.map((f) => f.path)}
          workspaceRoot={workspaceFolder}
        />
      </Suspense>

      <Suspense fallback={null}>
        <KeyboardShortcuts
          isOpen={keyboardShortcutsOpen}
          onClose={() => setKeyboardShortcutsOpen(false)}
        />
      </Suspense>

      {/* Visual No-Code Panels */}
      <AnimatePresence>
        {activeVisualPanel === 'screenshot' && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '450px',
              zIndex: 100,
              boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
            }}
          >
            <ScreenshotToCodePanel
              apiKey={deepseekApiKey}
              onInsertCode={handleInsertCode}
            />
          </motion.div>
        )}

        {activeVisualPanel === 'library' && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '450px',
              zIndex: 100,
              boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
            }}
          >
            <ComponentLibrary onInsertComponent={handleInsertCode} />
          </motion.div>
        )}

        {activeVisualPanel === 'visual' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 200,
              background: 'rgba(0,0,0,0.95)',
            }}
          >
            <VisualEditor
              onSave={(_elements, code) => {
                handleInsertCode(code);
                setActiveVisualPanel('none');
              }}
            />
          </motion.div>
        )}

        {multiFileApprovalOpen && multiFileEditPlan && (
          <Suspense fallback={null}>
            <MultiFileEditApprovalPanel
              plan={multiFileEditPlan}
              changes={multiFileChanges}
              onApply={handleApplyMultiFileChanges}
              onReject={handleRejectMultiFileChanges}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        <TerminalPanel
          isOpen={terminalOpen}
          onClose={() => setTerminalOpen(false)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <PerformanceMonitor />
      </Suspense>
    </AppContainer>
  );
}
