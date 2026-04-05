/**
 * AppLayout - Main application layout component
 *
 * Consumes state from 4 React Contexts instead of receiving 95+ props.
 * See src/app/contexts.tsx for context definitions.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useMemo, useState } from 'react';
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

import type { GeneratedFix } from '../services/AutoFixService';
import { logger } from '../services/Logger';
import { useAppExtras, useServices, useUIPanel, useWorkspaceCtx } from './contexts';

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

export function AppLayout() {
  // Pull state from contexts (replaces 95+ props)
  const services = useServices();
  const ui = useUIPanel();
  const ws = useWorkspaceCtx();
  const extras = useAppExtras();

  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState(0);

  // Memoize workspaceContext to prevent unnecessary re-renders of AIChat
  const memoizedWorkspaceContext = useMemo(
    () =>
      ws.workspaceFolder
        ? {
            workspaceRoot: ws.workspaceFolder,
            currentFile: ws.currentFile?.path,
            openFiles: ws.openFiles.map((f) => f.path),
            recentFiles: ws.openFiles.slice(0, 5).map((f) => f.path),
          }
        : undefined,
    [ws.workspaceFolder, ws.currentFile?.path, ws.openFiles]
  );

  return (
    <AppContainer data-testid="app-container">
      <TitleBar
        onSettingsClick={() => ui.setSettingsOpen(true)}
        onNewFile={ws.handleNewFile}
        onOpenFolder={ws.handleOpenFolderDialog}
        onSaveAll={ws.handleSaveAll}
        onCloseFolder={ws.handleCloseFolder}
        onScreenshotToCode={() => ui.setActiveVisualPanel(ui.activeVisualPanel === 'screenshot' ? 'none' : 'screenshot')}
        onToggleSidebar={() => ui.setSidebarOpen(!ui.sidebarOpen)}
        onToggleAIChat={() => ui.setAiChatOpen(!ui.aiChatOpen)}
        onTogglePreview={() => ui.setPreviewOpen(!ui.previewOpen)}
        onToggleBackgroundPanel={() => ui.setBackgroundPanelOpen(!ui.backgroundPanelOpen)}
        previewOpen={ui.previewOpen}
      />

      <MainContent>
        {ui.sidebarOpen && (
          <Sidebar
            workspaceFolder={ws.workspaceFolder}
            onOpenFile={ws.handleOpenFile}
            onToggleAIChat={() => ui.setAiChatOpen(!ui.aiChatOpen)}
            aiChatOpen={ui.aiChatOpen}
            fileSystemService={services.fileSystemService}
            onDeleteFile={ws.handleDeleteFile}
            onCreateFile={ws.handleCreateWorkspaceFile}
            onCreateFolder={ws.handleCreateWorkspaceFolder}
            onRenamePath={ws.handleRenameWorkspacePath}
            onOpenFolder={ws.handleOpenFolderDialog}
            onShowSettings={() => ui.setSettingsOpen(true)}
            onError={extras.showError}
            refreshKey={workspaceRefreshKey}
          />
        )}

        <EditorSection>
          {ws.workspaceFolder ? (
            <>
              <Editor
                file={ws.currentFile}
                openFiles={ws.openFiles}
                onFileChange={ws.handleFileChange}
                onCloseFile={ws.handleCloseFile}
                onSaveFile={ws.handleSaveFile}
                onFileSelect={ws.setCurrentFile}
                aiService={services.aiService}
                workspaceContext={ws.workspaceContext ?? undefined}
                getFileContext={ws.getFileContext}
                settings={ws.editorSettings}
                liveStream={services.liveStream}
                onEditorMount={ws.handleEditorMount}
              />
              {ui.previewOpen && ws.currentFile && (
                <PreviewPanel
                  code={ws.currentFile.content}
                  fileName={ws.currentFile.name}
                  language={ws.currentFile.language}
                  onClose={() => ui.setPreviewOpen(false)}
                />
              )}
            </>
          ) : (
            <Suspense fallback={null}>
              <WelcomeScreen
                onOpenFolder={ws.handleOpenFolder}
                onCreateFile={ws.handleCreateFile}
                onOpenAIChat={() => ui.setAiChatOpen(true)}
                onShowSettings={() => ui.setSettingsOpen(true)}
                workspaceContext={ws.workspaceContext}
                isIndexing={ws.isIndexing}
                indexingProgress={ws.indexingProgress}
              />
            </Suspense>
          )}
        </EditorSection>

        {ui.aiChatOpen && (
          <Suspense fallback={<div>Loading AI Chat...</div>}>
            <LazyAIChat
              data-testid="ai-chat"
              messages={extras.aiMessages}
              onSendMessage={extras.handleAIMessage}
              onClose={() => ui.setAiChatOpen(false)}
              showReasoningProcess={ws.editorSettings.showReasoningProcess}
              currentModel={ws.editorSettings.aiModel}
              mode={ui.chatMode}
              onModeChange={ui.setChatMode}
              taskPlanner={services.taskPlanner}
              executionEngine={services.executionEngine}
              workspaceContext={memoizedWorkspaceContext}
              onAddMessage={extras.addAiMessage}
              onUpdateMessage={extras.updateAiMessage}
              onFileChanged={(filePath, action) => {
                logger.debug('[App] Agent file changed:', filePath, action);
                setWorkspaceRefreshKey((current) => current + 1);
                if (action === 'created' || action === 'modified') {
                  ws.handleOpenFile(filePath);
                }
              }}
              onTaskComplete={(task) => {
                extras.showSuccess('Task Completed', `Successfully executed: ${task.title}`);
              }}
              onTaskError={(task, error) => {
                extras.showError('Task Failed', `Failed to execute ${task.title}: ${error.message}`);
              }}
              onMultiFileEditDetected={extras.handleMultiFileEditDetected}
            />
          </Suspense>
        )}

        {ui.gitPanelOpen && <Suspense fallback={null}><GitPanel workingDirectory={ws.workspaceFolder ?? undefined} /></Suspense>}

        {ui.backgroundPanelOpen && (
          <Suspense fallback={null}>
            <BackgroundTaskPanel
              backgroundAgent={services.backgroundAgentSystem}
              onTaskClick={(task) => {
                logger.debug('[App] Background task clicked:', task);
              }}
            />
          </Suspense>
        )}
      </MainContent>

      <StatusBar
        currentFile={ws.currentFile}
        aiChatOpen={ui.aiChatOpen}
        backgroundPanelOpen={ui.backgroundPanelOpen}
        onToggleSidebar={() => ui.setSidebarOpen(!ui.sidebarOpen)}
        onToggleAIChat={() => ui.setAiChatOpen(!ui.aiChatOpen)}
        onToggleBackgroundPanel={() => ui.setBackgroundPanelOpen(!ui.backgroundPanelOpen)}
        onOpenAgentMode={() => {
          if (!ui.aiChatOpen) ui.setAiChatOpen(true);
          ui.setChatMode('agent');
        }}
        onOpenTerminal={() => {/* Terminal disabled */}}
        onToggleScreenshot={extras.handleToggleScreenshotPanel}
        onToggleLibrary={extras.handleToggleComponentLibrary}
        onToggleVisualEditor={extras.handleToggleVisualEditor}
      />

      <NotificationContainer notifications={extras.notifications} onClose={extras.removeNotification} />

      <Suspense fallback={null}>
        <EditorStreamPanel
          isStreaming={services.liveStream.isCurrentlyStreaming()}
          onApprove={(filePath) => {
            logger.debug(`[App] Approved changes for: ${filePath}`);
            extras.showSuccess('Changes Approved', `Applied changes to ${filePath}`);
          }}
          onReject={(filePath) => {
            logger.debug(`[App] Rejected changes for: ${filePath}`);
            extras.showWarning('Changes Rejected', `Discarded changes to ${filePath}`);
          }}
        />
      </Suspense>

      {/* Auto-Fix Error Panel */}
      {ui.errorFixPanelOpen && extras.currentError && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          zIndex: 2000,
          maxWidth: '600px',
        }}>
          <Suspense fallback={null}>
            <ErrorFixPanel
              error={extras.currentError}
              fix={extras.currentFix}
              isLoading={extras.fixLoading}
              errorMessage={extras.fixError}
              showDiff={true}
              onApplyFix={extras.handleApplyFix}
              onDismiss={() => {
                ui.setErrorFixPanelOpen(false);
                extras.setCurrentError(null);
                extras.setCurrentFix(null);
              }}
              onRetry={() => {
                if (extras.currentError && ws.editorRef.current && extras.autoFixServiceRef.current) {
                  extras.setFixLoading(true);
                  extras.setFixError('');
                  extras.autoFixServiceRef.current.generateFix(extras.currentError, ws.editorRef.current as never)
                    .then((fix: GeneratedFix) => {
                      extras.setCurrentFix(fix);
                      extras.setFixLoading(false);
                    })
                    .catch((err: Error) => {
                      extras.setFixError(err.message || 'Failed to generate fix');
                      extras.setFixLoading(false);
                    });
                }
              }}
            />
          </Suspense>
        </div>
      )}

      <Suspense fallback={<div>Loading Settings...</div>}>
        <LazySettings
          isOpen={ui.settingsOpen}
          onClose={() => ui.setSettingsOpen(false)}
          settings={ws.editorSettings}
          onSettingsChange={async (newSettings) => {
            ws.updateEditorSettings(newSettings);
            if (newSettings.aiModel && newSettings.aiModel !== ws.editorSettings.aiModel) {
              try {
                await services.aiService.setModel(newSettings.aiModel);
                extras.showSuccess('Settings Updated', 'Your preferences have been saved');
              } catch (error) {
                extras.showError(
                  'Model Error',
                  error instanceof Error ? error.message : 'Failed to update AI model'
                );
              }
            } else {
              extras.showSuccess('Settings Updated', 'Your preferences have been saved');
            }
          }}
        />
      </Suspense>

      <Suspense fallback={<div>Loading Command Palette...</div>}>
        <LazyCommandPalette
          isOpen={ui.commandPaletteOpen}
          onClose={() => ui.setCommandPaletteOpen(false)}
          commands={extras.commands}
        />
      </Suspense>

      <Suspense fallback={null}>
        <GlobalSearch
          isOpen={ui.globalSearchOpen}
          onClose={() => ui.setGlobalSearchOpen(false)}
          onOpenFile={ws.handleOpenFileFromSearch}
          onReplaceInFile={ws.handleReplaceInFile}
          onSearchInFiles={ws.handleSearchInFiles}
          workspaceFiles={ws.openFiles.map((f) => f.path)}
          workspaceRoot={ws.workspaceFolder}
        />
      </Suspense>

      <Suspense fallback={null}>
        <KeyboardShortcuts
          isOpen={ui.keyboardShortcutsOpen}
          onClose={() => ui.setKeyboardShortcutsOpen(false)}
        />
      </Suspense>

      {/* Visual No-Code Panels */}
      <AnimatePresence>
        {ui.activeVisualPanel === 'screenshot' && (
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
              apiKey={extras.deepseekApiKey}
              onInsertCode={extras.handleInsertCode}
            />
          </motion.div>
        )}

        {ui.activeVisualPanel === 'library' && (
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
            <ComponentLibrary onInsertComponent={extras.handleInsertCode} />
          </motion.div>
        )}

        {ui.activeVisualPanel === 'visual' && (
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
                extras.handleInsertCode(code);
                ui.setActiveVisualPanel('none');
              }}
            />
          </motion.div>
        )}

        {extras.multiFileApprovalOpen && extras.multiFileEditPlan && (
          <Suspense fallback={null}>
            <MultiFileEditApprovalPanel
              plan={extras.multiFileEditPlan}
              changes={extras.multiFileChanges}
              onApply={extras.handleApplyMultiFileChanges}
              onReject={extras.handleRejectMultiFileChanges}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        <TerminalPanel
          isOpen={ui.terminalOpen}
          onClose={() => ui.setTerminalOpen(false)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <PerformanceMonitor />
      </Suspense>
    </AppContainer>
  );
}
