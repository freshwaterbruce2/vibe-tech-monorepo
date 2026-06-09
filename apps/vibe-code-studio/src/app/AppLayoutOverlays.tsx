/**
 * AppLayoutOverlays - Overlay and panel components for AppLayout
 *
 * Extracts all overlay/panel JSX from AppLayout to keep it under 500 lines.
 * Consumes the same 4 app contexts directly - no prop drilling.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense } from 'react';

import { LazyCommandPalette, LazySettings } from '../components/LazyComponents';
import type { GeneratedFix } from '../services/AutoFixService';
import { logger } from '../services/Logger';
import { useAppExtras, useServices, useUIPanel, useWorkspaceCtx } from './contexts';

// Lazy-loaded overlay components
const EnhancedAgentMode = lazy(() => import('../components/EnhancedAgentMode/EnhancedAgentMode'));
const ComponentLibrary = lazy(() => import('../components/ComponentLibrary').then(m => ({ default: m.ComponentLibrary })));
const EditorStreamPanel = lazy(() => import('../components/EditorStreamPanel').then(m => ({ default: m.EditorStreamPanel })));
const ErrorFixPanel = lazy(() => import('../components/ErrorFixPanel'));
const GlobalSearch = lazy(() => import('../components/GlobalSearch').then(m => ({ default: m.GlobalSearch })));
const KeyboardShortcuts = lazy(() => import('../components/KeyboardShortcuts').then(m => ({ default: m.KeyboardShortcuts })));
const MultiFileEditApprovalPanel = lazy(() => import('../components/MultiFileEditApprovalPanel').then(m => ({ default: m.MultiFileEditApprovalPanel })));
const PerformanceMonitor = lazy(() => import('../components/PerformanceMonitor'));
const ScreenshotToCodePanel = lazy(() => import('../components/ScreenshotToCodePanel').then(m => ({ default: m.ScreenshotToCodePanel })));
const TerminalPanel = lazy(() => import('../components/TerminalPanel').then(m => ({ default: m.TerminalPanel })));
const VisualEditor = lazy(() => import('../components/VisualEditor').then(m => ({ default: m.VisualEditor })));

export function AppLayoutOverlays() {
  const services = useServices();
  const ui = useUIPanel();
  const ws = useWorkspaceCtx();
  const extras = useAppExtras();

  return (
    <>
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
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
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
              apiKey={extras.openrouterApiKey}
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
              onAcceptFile={extras.handleAcceptFile}
              onRejectFile={extras.handleRejectFile}
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
            workspaceContext={ws.workspaceFolder ? {
              workspaceFolder: ws.workspaceFolder,
              currentFile: ws.currentFile?.path,
              openFiles: ws.openFiles.map((f) => f.path),
            } : undefined}
          />
        </Suspense>
      )}
    </>
  );
}
