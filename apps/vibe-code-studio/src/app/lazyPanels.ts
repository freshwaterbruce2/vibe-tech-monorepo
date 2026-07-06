/**
 * Lazy-loaded conditional panels for AppLayout.
 *
 * Extracted from AppLayout.tsx to keep that file within the 500 +/- 100 line target.
 * Each panel is code-split and only loaded when its toggle opens it.
 */
import { lazy } from 'react';

export const EnhancedAgentMode = lazy(
  () => import('../components/EnhancedAgentMode/EnhancedAgentMode')
);
export const ArtifactsPanelHost = lazy(() =>
  import('../components/ArtifactsPanel/ArtifactsPanelHost').then(m => ({
    default: m.ArtifactsPanelHost,
  }))
);
export const BackgroundTaskPanel = lazy(() =>
  import('../components/BackgroundTaskPanel').then(m => ({ default: m.BackgroundTaskPanel }))
);
export const BrainScanPanel = lazy(() =>
  import('../components/BrainScanPanel').then(m => ({ default: m.BrainScanPanel }))
);
export const BrowserPermissionPromptHost = lazy(() =>
  import('../components/BrowserVerification/BrowserPermissionPromptHost').then(m => ({
    default: m.BrowserPermissionPromptHost,
  }))
);
export const ComponentLibrary = lazy(() =>
  import('../components/ComponentLibrary').then(m => ({ default: m.ComponentLibrary }))
);
export const EditorStreamPanel = lazy(() =>
  import('../components/EditorStreamPanel').then(m => ({ default: m.EditorStreamPanel }))
);
export const ErrorFixPanel = lazy(() => import('../components/ErrorFixPanel'));
export const GitPanel = lazy(() => import('../components/GitPanel'));
export const GlobalSearch = lazy(() =>
  import('../components/GlobalSearch').then(m => ({ default: m.GlobalSearch }))
);
export const KnowledgePanelHost = lazy(() =>
  import('../components/KnowledgePanel/KnowledgePanelHost').then(m => ({
    default: m.KnowledgePanelHost,
  }))
);
export const KeyboardShortcuts = lazy(() =>
  import('../components/KeyboardShortcuts').then(m => ({ default: m.KeyboardShortcuts }))
);
export const MultiFileEditApprovalPanel = lazy(() =>
  import('../components/MultiFileEditApprovalPanel').then(m => ({
    default: m.MultiFileEditApprovalPanel,
  }))
);
export const PerformanceMonitor = lazy(() => import('../components/PerformanceMonitor'));
export const PlanModeDialogHost = lazy(() =>
  import('../components/PlanMode/PlanModeDialogHost').then(m => ({
    default: m.PlanModeDialogHost,
  }))
);
export const PreviewPanel = lazy(() =>
  import('../components/PreviewPanel').then(m => ({ default: m.PreviewPanel }))
);
export const ProblemsPanelHost = lazy(() =>
  import('../components/ProblemsPanel/ProblemsPanelHost').then(m => ({
    default: m.ProblemsPanelHost,
  }))
);
export const SchedulePanelHost = lazy(() =>
  import('../components/SchedulePanel/SchedulePanelHost').then(m => ({
    default: m.SchedulePanelHost,
  }))
);
export const SettingsSyncDialog = lazy(() =>
  import('../components/SettingsSync/SettingsSyncDialog').then(m => ({
    default: m.SettingsSyncDialog,
  }))
);
export const ScreenshotToCodePanel = lazy(() =>
  import('../components/ScreenshotToCodePanel').then(m => ({ default: m.ScreenshotToCodePanel }))
);
export const TerminalPanel = lazy(() =>
  import('../components/TerminalPanel').then(m => ({ default: m.TerminalPanel }))
);
export const VisualEditor = lazy(() =>
  import('../components/VisualEditor').then(m => ({ default: m.VisualEditor }))
);
export const WelcomeScreen = lazy(() => import('../components/WelcomeScreen'));
