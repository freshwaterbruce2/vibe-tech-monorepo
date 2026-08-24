/**
 * AppLayout - Main application layout component
 *
 * Consumes state from 4 React Contexts instead of receiving 95+ props.
 * See src/app/contexts.tsx for context definitions.
 */

import { AnimatePresence } from 'framer-motion';
import { Suspense, useMemo, useState } from 'react';
import styled from 'styled-components';

// Eagerly loaded core components (always visible)
import Editor from '../components/Editor';
import { LazyAIChat, LazyCommandPalette, LazySettings } from '../components/LazyComponents';
import { NotificationContainer } from '../components/Notification';
import Sidebar from '../components/Sidebar';
import StatusBar from '../components/StatusBar';
import TitleBar from '../components/TitleBar';
import { zoomEditorFont } from './appLayout.zoom';
import { VisualPanelShell } from './VisualPanelShell';

// Lazy-loaded conditional panels (only loaded when their toggle opens them)
import {
  AgentManagerPanelHost,
  BackgroundTaskPanel,
  BrainScanPanel,
  BrowserPermissionPromptHost,
  ComponentLibrary,
  EditorStreamPanel,
  EnhancedAgentMode,
  ErrorFixPanel,
  GitPanel,
  GlobalSearch,
  KeyboardShortcuts,
  KnowledgePanelHost,
  MultiFileEditApprovalPanel,
  PerformanceMonitor,
  PlanModeDialogHost,
  PreviewPanel,
  ArtifactsPanelHost,
  ProblemsPanelHost,
  SchedulePanelHost,
  ScreenshotToCodePanel,
  SettingsSyncDialog,
  TerminalPanel,
  TestExplorerPanelHost,
  VisualEditor,
  WelcomeScreen,
} from './lazyPanels';

import type { GeneratedFix } from '../services/AutoFixService';
import { logger } from '../services/Logger';
import { useAgentManagerStore } from '../stores/agentManagerStore';
import { applySettingsChange } from './applySettingsChange';
import { useAppExtras, useServices, useUIPanel, useWorkspaceCtx } from './contexts';
import { useEffect } from 'react';
import { LandingPage } from '@vibetech/landing';
import { authService, type UserWithPlan } from '../services/AuthService';
import { AuthModal } from '../components/AuthModal';
import { vibeStudioLandingContent } from './landingContent';

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
  const agentManagerOpen = useAgentManagerStore(state => state.panelOpen);
  const toggleAgentManagerPanel = useAgentManagerStore(state => state.actions.togglePanel);
  // Wave-2 agent UX (RUNTIME_DIAGNOSIS.md): Tasks opens the Agent Manager; the
  // multi-agent Review overlay and the legacy BackgroundTaskPanel are opt-in.
  const reviewAgentsEnabled = import.meta.env.VITE_ENABLE_REVIEW_AGENTS === 'true';
  const legacyTaskPanelEnabled =
    import.meta.env.VITE_ENABLE_LEGACY_BACKGROUND_TASK_PANEL === 'true';
  const [user, setUser] = useState<UserWithPlan | null>(authService.getCurrentUser());
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | null>(null);

  // Check user session and subscribe
  useEffect(() => {
    const initSession = async () => {
      await authService.init();
      setSessionChecked(true);
    };
    initSession();

    const unsubscribe = authService.subscribe(u => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  // Listen to hash changes for login/signup modal triggers
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#login') {
        setAuthModalMode('login');
      } else if (hash === '#signup') {
        setAuthModalMode('signup');
      } else {
        setAuthModalMode(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Memoize workspaceContext to prevent unnecessary re-renders of AIChat
  const memoizedWorkspaceContext = useMemo(
    () =>
      ws.workspaceFolder
        ? {
            workspaceRoot: ws.workspaceFolder,
            currentFile: ws.currentFile?.path,
            openFiles: ws.openFiles.map(f => f.path),
            recentFiles: ws.openFiles.slice(0, 5).map(f => f.path),
          }
        : undefined,
    [ws.workspaceFolder, ws.currentFile?.path, ws.openFiles]
  );

  if (!sessionChecked) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#08111f',
          color: '#67e8f9',
          fontFamily: 'system-ui',
        }}
      >
        <div style={{ fontSize: '18px', fontWeight: 600 }}>Initializing Neural Interface...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage content={vibeStudioLandingContent} />
        {authModalMode && (
          <AuthModal
            initialMode={authModalMode}
            onClose={() => {
              setAuthModalMode(null);
              window.history.pushState(null, '', ' '); // Clear hash
            }}
          />
        )}
      </>
    );
  }

  return (
    <AppContainer data-testid="app-container">
      <TitleBar
        onSettingsClick={() => ui.setSettingsOpen(true)}
        onNewFile={ws.handleNewFile}
        onOpenFolder={ws.handleOpenFolderDialog}
        onSaveAll={ws.handleSaveAll}
        onCloseFolder={ws.handleCloseFolder}
        onScreenshotToCode={() =>
          ui.setActiveVisualPanel(ui.activeVisualPanel === 'screenshot' ? 'none' : 'screenshot')
        }
        onToggleSidebar={() => ui.setSidebarOpen(!ui.sidebarOpen)}
        onToggleAIChat={() => ui.setAiChatOpen(!ui.aiChatOpen)}
        onTogglePreview={() => ui.setPreviewOpen(!ui.previewOpen)}
        onToggleBackgroundPanel={
          legacyTaskPanelEnabled
            ? () => ui.setBackgroundPanelOpen(!ui.backgroundPanelOpen)
            : toggleAgentManagerPanel
        }
        onToggleGitPanel={() => ui.setGitPanelOpen(!ui.gitPanelOpen)}
        onFind={() => ui.setGlobalSearchOpen(true)}
        onReplace={() => ui.setGlobalSearchOpen(true)}
        onZoomIn={() => ws.updateEditorSettings(zoomEditorFont(ws.editorSettings, 1))}
        onZoomOut={() => ws.updateEditorSettings(zoomEditorFont(ws.editorSettings, -1))}
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
              messages={extras.aiMessages}
              isAiResponding={extras.isAiResponding}
              responseState={extras.aiResponseState}
              onSendMessage={extras.handleAIMessage}
              onCancelResponse={extras.cancelAiResponse}
              onClearMessages={extras.clearAiMessages}
              onClose={() => ui.setAiChatOpen(false)}
              showReasoningProcess={ws.editorSettings.showReasoningProcess}
              currentModel={extras.currentModel}
              mode={ui.chatMode}
              onModeChange={ui.setChatMode}
              taskPlanner={services.taskPlanner}
              executionEngine={services.executionEngine}
              agentRuntime={services.agentRuntime}
              workspaceContext={memoizedWorkspaceContext}
              onAddMessage={extras.addAiMessage}
              onUpdateMessage={extras.updateAiMessage}
              onFileChanged={(filePath, action) => {
                logger.debug('[App] Agent file changed:', filePath, action);
                setWorkspaceRefreshKey(current => current + 1);
                if (action === 'created' || action === 'modified') {
                  ws.handleOpenFile(filePath);
                }
              }}
              onTaskComplete={task => {
                extras.showSuccess('Task Completed', `Successfully executed: ${task.title}`);
              }}
              onTaskError={(task, error) => {
                extras.showError(
                  'Task Failed',
                  `Failed to execute ${task.title}: ${error.message}`
                );
              }}
              onTaskCancelled={(task, reason) => {
                extras.showWarning('Task Cancelled', `${task.title}: ${reason}`);
              }}
              onMultiFileEditDetected={extras.handleMultiFileEditDetected}
            />
          </Suspense>
        )}

        {ui.gitPanelOpen && (
          <Suspense fallback={null}>
            <GitPanel workingDirectory={ws.workspaceFolder ?? undefined} />
          </Suspense>
        )}

        {legacyTaskPanelEnabled && ui.backgroundPanelOpen && (
          <Suspense fallback={null}>
            <BackgroundTaskPanel
              backgroundAgent={services.backgroundAgentSystem}
              onTaskClick={task => {
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
        sidebarOpen={ui.sidebarOpen}
        activeVisualPanel={ui.activeVisualPanel}
        terminalOpen={ui.terminalOpen}
        agentModeOpen={ui.agentModeOpen}
        currentModel={extras.currentModel}
        onGitClick={() => ui.setGitPanelOpen(true)}
        onToggleSidebar={() => ui.setSidebarOpen(!ui.sidebarOpen)}
        onToggleAIChat={() => {
          const shouldOpen = !ui.aiChatOpen || ui.chatMode !== 'agent';
          ui.setChatMode('agent');
          ui.setAiChatOpen(shouldOpen);
        }}
        onToggleBackgroundPanel={
          legacyTaskPanelEnabled
            ? () => ui.setBackgroundPanelOpen(!ui.backgroundPanelOpen)
            : undefined
        }
        agentManagerOpen={agentManagerOpen}
        onOpenAgentManager={toggleAgentManagerPanel}
        onOpenAgentMode={reviewAgentsEnabled ? () => ui.setAgentModeOpen(true) : undefined}
        onOpenTerminal={() => ui.setTerminalOpen(!ui.terminalOpen)}
        onToggleScreenshot={extras.handleToggleScreenshotPanel}
        onToggleLibrary={extras.handleToggleComponentLibrary}
        onToggleVisualEditor={extras.handleToggleVisualEditor}
      />

      <NotificationContainer
        notifications={extras.notifications}
        onClose={extras.removeNotification}
      />

      <Suspense fallback={null}>
        <EditorStreamPanel isStreaming={services.liveStream.isCurrentlyStreaming()} />
      </Suspense>

      {/* Auto-Fix Error Panel */}
      {ui.errorFixPanelOpen && extras.currentError && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            zIndex: 2000,
            maxWidth: '600px',
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
          }}
        >
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
                if (
                  extras.currentError &&
                  ws.editorRef.current &&
                  extras.autoFixServiceRef.current
                ) {
                  extras.setFixLoading(true);
                  extras.setFixError('');
                  extras.autoFixServiceRef.current
                    .generateFix(extras.currentError, ws.editorRef.current as never)
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
          settings={{ ...ws.editorSettings, aiModel: extras.currentModel }}
          onSettingsChange={newSettings =>
            applySettingsChange(
              {
                updateEditorSettings: ws.updateEditorSettings,
                prevAiModel: extras.currentModel,
                aiService: services.aiService,
                showSuccess: extras.showSuccess,
                showError: extras.showError,
              },
              newSettings
            )
          }
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
          workspaceFiles={ws.openFiles.map(f => f.path)}
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
          <VisualPanelShell
            componentName="Screenshot to Code"
            motionVariant="side"
            onClose={() => ui.setActiveVisualPanel('none')}
          >
            <ScreenshotToCodePanel
              apiKey={extras.openrouterApiKey}
              onInsertCode={extras.handleInsertCode}
            />
          </VisualPanelShell>
        )}

        {ui.activeVisualPanel === 'library' && (
          <VisualPanelShell
            componentName="Component Library"
            motionVariant="side"
            onClose={() => ui.setActiveVisualPanel('none')}
          >
            <ComponentLibrary onInsertComponent={extras.handleInsertCode} />
          </VisualPanelShell>
        )}

        {ui.activeVisualPanel === 'visual' && (
          <VisualPanelShell
            componentName="Visual Editor"
            motionVariant="fullscreen"
            onClose={() => ui.setActiveVisualPanel('none')}
          >
            <VisualEditor
              onSave={(_elements, code) => {
                extras.handleInsertCode(code);
                ui.setActiveVisualPanel('none');
              }}
            />
          </VisualPanelShell>
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
        <TerminalPanel isOpen={ui.terminalOpen} onClose={() => ui.setTerminalOpen(false)} />
      </Suspense>

      <Suspense fallback={null}>
        <ProblemsPanelHost onOpenFile={ws.handleOpenFileFromSearch} />
      </Suspense>

      <Suspense fallback={null}>
        <SchedulePanelHost />
      </Suspense>

      <Suspense fallback={null}>
        <ArtifactsPanelHost />
      </Suspense>

      <Suspense fallback={null}>
        <BrowserPermissionPromptHost />
      </Suspense>

      <Suspense fallback={null}>
        <PlanModeDialogHost />
      </Suspense>

      <Suspense fallback={null}>
        <SettingsSyncDialog />
      </Suspense>

      <Suspense fallback={null}>
        <KnowledgePanelHost />
      </Suspense>

      <Suspense fallback={null}>
        <TestExplorerPanelHost />
      </Suspense>

      <Suspense fallback={null}>
        <AgentManagerPanelHost />
      </Suspense>

      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <PerformanceMonitor />
        </Suspense>
      )}

      {ui.brainScanOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1500,
            background: 'rgba(8, 17, 31, 0.85)',
          }}
        >
          <Suspense fallback={null}>
            <BrainScanPanel onClose={() => ui.setBrainScanOpen(false)} />
          </Suspense>
        </div>
      )}

      {ui.agentModeOpen && (
        <Suspense fallback={null}>
          <EnhancedAgentMode
            isOpen={ui.agentModeOpen}
            onClose={() => ui.setAgentModeOpen(false)}
            onComplete={() => {
              ui.setAgentModeOpen(false);
              extras.showSuccess('Agent Task Complete', 'Multi-agent task completed successfully');
            }}
            orchestrator={services.orchestrator}
            performanceOptimizer={services.performanceOptimizer}
            currentModel={extras.currentModel}
            workspaceContext={
              ws.workspaceFolder
                ? {
                    workspaceFolder: ws.workspaceFolder,
                    currentFile: ws.currentFile?.path,
                    openFiles: ws.openFiles.map(f => f.path),
                  }
                : undefined
            }
          />
        </Suspense>
      )}
    </AppContainer>
  );
}
