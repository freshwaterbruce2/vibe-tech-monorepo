/**
 * Lazy-loaded conditional panels for AppLayout.
 *
 * Extracted from AppLayout.tsx to keep that file within the 500 +/- 100 line target.
 * Each panel is code-split and only loaded when its toggle opens it.
 * Uses lazyRetry so a single Vite/HMR fetch blip does not permanently break a panel.
 */
import { lazyRetry } from '../utils/lazyRetry';

export const EnhancedAgentMode = lazyRetry(
  () => import('../components/EnhancedAgentMode/EnhancedAgentMode')
);
export const AgentManagerPanelHost = lazyRetry(() =>
  import('../components/AgentManagerPanel/AgentManagerPanelHost').then(m => ({
    default: m.AgentManagerPanelHost,
  }))
);
export const ArtifactsPanelHost = lazyRetry(() =>
  import('../components/ArtifactsPanel/ArtifactsPanelHost').then(m => ({
    default: m.ArtifactsPanelHost,
  }))
);
export const BackgroundTaskPanel = lazyRetry(() =>
  import('../components/BackgroundTaskPanel').then(m => ({ default: m.BackgroundTaskPanel }))
);
export const BrainScanPanel = lazyRetry(() =>
  import('../components/BrainScanPanel').then(m => ({ default: m.BrainScanPanel }))
);
export const BrowserPermissionPromptHost = lazyRetry(() =>
  import('../components/BrowserVerification/BrowserPermissionPromptHost').then(m => ({
    default: m.BrowserPermissionPromptHost,
  }))
);
export const ComponentLibrary = lazyRetry(() =>
  import('../components/ComponentLibrary').then(m => ({ default: m.ComponentLibrary }))
);
export const EditorStreamPanel = lazyRetry(() =>
  import('../components/EditorStreamPanel').then(m => ({ default: m.EditorStreamPanel }))
);
export const ErrorFixPanel = lazyRetry(() => import('../components/ErrorFixPanel'));
export const GitPanel = lazyRetry(() => import('../components/GitPanel'));
export const GlobalSearch = lazyRetry(() =>
  import('../components/GlobalSearch').then(m => ({ default: m.GlobalSearch }))
);
export const KnowledgePanelHost = lazyRetry(() =>
  import('../components/KnowledgePanel/KnowledgePanelHost').then(m => ({
    default: m.KnowledgePanelHost,
  }))
);
export const KeyboardShortcuts = lazyRetry(() =>
  import('../components/KeyboardShortcuts').then(m => ({ default: m.KeyboardShortcuts }))
);
export const MultiFileEditApprovalPanel = lazyRetry(() =>
  import('../components/MultiFileEditApprovalPanel').then(m => ({
    default: m.MultiFileEditApprovalPanel,
  }))
);
export const PerformanceMonitor = lazyRetry(() => import('../components/PerformanceMonitor'));
export const PlanModeDialogHost = lazyRetry(() =>
  import('../components/PlanMode/PlanModeDialogHost').then(m => ({
    default: m.PlanModeDialogHost,
  }))
);
export const PreviewPanel = lazyRetry(() =>
  import('../components/PreviewPanel').then(m => ({ default: m.PreviewPanel }))
);
export const ProblemsPanelHost = lazyRetry(() =>
  import('../components/ProblemsPanel/ProblemsPanelHost').then(m => ({
    default: m.ProblemsPanelHost,
  }))
);
export const SchedulePanelHost = lazyRetry(() =>
  import('../components/SchedulePanel/SchedulePanelHost').then(m => ({
    default: m.SchedulePanelHost,
  }))
);
export const SettingsSyncDialog = lazyRetry(() =>
  import('../components/SettingsSync/SettingsSyncDialog').then(m => ({
    default: m.SettingsSyncDialog,
  }))
);
export const ScreenshotToCodePanel = lazyRetry(() => import('../components/ScreenshotToCodePanel'));
export const TestExplorerPanelHost = lazyRetry(() =>
  import('../components/TestExplorerPanel/TestExplorerPanelHost').then(m => ({
    default: m.TestExplorerPanelHost,
  }))
);
export const TerminalPanel = lazyRetry(() =>
  import('../components/TerminalPanel').then(m => ({ default: m.TerminalPanel }))
);
export const VisualEditor = lazyRetry(() =>
  import('../components/VisualEditor').then(m => ({ default: m.VisualEditor }))
);
export const WelcomeScreen = lazyRetry(() => import('../components/WelcomeScreen'));
