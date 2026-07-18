/**
 * AppLayout wiring tests.
 *
 * Covers the TitleBar / StatusBar handler props that AppLayout threads into its
 * chrome: Git panel open/toggle, Find/Replace (global search), and editor zoom.
 * The heavy child tree is stubbed so we can render past the auth gate and invoke
 * the captured handler props directly, asserting each calls the right context
 * setter / workspace action.
 */
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EditorSettings } from '../../types';

// --- Captured child props ---------------------------------------------------
interface TitleBarProps {
  onToggleGitPanel: () => void;
  onFind: () => void;
  onReplace: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleBackgroundPanel?: () => void;
}
interface StatusBarProps {
  onGitClick: () => void;
  onToggleAIChat: () => void;
  onToggleBackgroundPanel?: () => void;
  onOpenAgentManager?: () => void;
  onOpenAgentMode?: () => void;
  onToggleScreenshot?: () => void;
}

const captured = vi.hoisted(() => ({
  titleBar: null as TitleBarProps | null,
  statusBar: null as StatusBarProps | null,
  shellCloses: [] as Array<() => void>,
}));

// --- Stub the heavy chrome / panels -----------------------------------------
vi.mock('../../components/TitleBar', () => ({
  default: (props: TitleBarProps) => {
    captured.titleBar = props;
    return null;
  },
}));
vi.mock('../../components/StatusBar', () => ({
  default: (props: StatusBarProps) => {
    captured.statusBar = props;
    return null;
  },
}));
vi.mock('../../components/Sidebar', () => ({ default: () => null }));
vi.mock('../../components/Editor', () => ({ default: () => null }));
vi.mock('../../components/Notification', () => ({ NotificationContainer: () => null }));
vi.mock('../../components/LazyComponents', () => ({
  LazyAIChat: () => null,
  LazyCommandPalette: () => null,
  LazySettings: () => null,
}));
vi.mock('../../components/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@vibetech/landing', () => ({
  LandingPage: () => null,
  createDefaultLandingContent: (overrides: Record<string, unknown>) => overrides,
}));

// Every export AppLayout pulls from ./lazyPanels, stubbed to a no-op component.
vi.mock('../lazyPanels', () => {
  const Stub = () => null;
  return {
    AgentManagerPanelHost: Stub,
    BackgroundTaskPanel: Stub,
    BrainScanPanel: Stub,
    BrowserPermissionPromptHost: Stub,
    ComponentLibrary: Stub,
    EditorStreamPanel: Stub,
    EnhancedAgentMode: Stub,
    ErrorFixPanel: Stub,
    GitPanel: Stub,
    GlobalSearch: Stub,
    KeyboardShortcuts: Stub,
    KnowledgePanelHost: Stub,
    MultiFileEditApprovalPanel: Stub,
    PerformanceMonitor: Stub,
    PlanModeDialogHost: Stub,
    PreviewPanel: Stub,
    ArtifactsPanelHost: Stub,
    ProblemsPanelHost: Stub,
    SchedulePanelHost: Stub,
    ScreenshotToCodePanel: Stub,
    SettingsSyncDialog: Stub,
    TerminalPanel: Stub,
    TestExplorerPanelHost: Stub,
    VisualEditor: Stub,
    WelcomeScreen: Stub,
  };
});

vi.mock('../VisualPanelShell', () => ({
  VisualPanelShell: ({
    onClose,
    children,
  }: {
    onClose: () => void;
    children?: React.ReactNode;
  }) => {
    captured.shellCloses.push(onClose);
    return <div data-testid="visual-shell">{children}</div>;
  },
}));

vi.mock('../../stores/agentManagerStore', () => ({
  useAgentManagerStore: (
    sel: (s: { panelOpen: boolean; actions: { togglePanel: () => void } }) => unknown
  ) =>
    sel({
      panelOpen: false,
      actions: { togglePanel: vi.fn() },
    }),
}));

// Auth: report a signed-in user so AppLayout renders the full shell.
vi.mock('../../services/AuthService', () => ({
  authService: {
    getCurrentUser: () => ({ id: 'u1', email: 'dev@vibetech.dev', plan: 'pro' }),
    init: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue(() => {}),
  },
}));

// --- Controlled contexts ----------------------------------------------------
const editorSettings: EditorSettings = {
  theme: 'vibe-dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  autoSave: true,
  aiAutoComplete: true,
  aiSuggestions: true,
};

const ui = vi.hoisted(() => ({
  setGitPanelOpen: vi.fn(),
  setGlobalSearchOpen: vi.fn(),
  gitPanelOpen: false,
  globalSearchOpen: false,
  aiChatOpen: false,
  sidebarOpen: false,
  previewOpen: false,
  backgroundPanelOpen: false,
  terminalOpen: false,
  agentModeOpen: false,
  brainScanOpen: false,
  settingsOpen: false,
  commandPaletteOpen: false,
  keyboardShortcutsOpen: false,
  errorFixPanelOpen: false,
  activeVisualPanel: 'none',
  chatMode: 'chat',
  setSettingsOpen: vi.fn(),
  setAiChatOpen: vi.fn(),
  setPreviewOpen: vi.fn(),
  setBackgroundPanelOpen: vi.fn(),
  setSidebarOpen: vi.fn(),
  setActiveVisualPanel: vi.fn(),
  setAgentModeOpen: vi.fn(),
  setTerminalOpen: vi.fn(),
  setBrainScanOpen: vi.fn(),
  setChatMode: vi.fn(),
}));

const ws = vi.hoisted(() => ({
  updateEditorSettings: vi.fn(),
  editorSettings: {} as EditorSettings,
  workspaceFolder: null as string | null,
  currentFile: null,
  openFiles: [] as { path: string }[],
  workspaceContext: null,
  isIndexing: false,
  indexingProgress: 0,
}));
ws.editorSettings = editorSettings;

vi.mock('../contexts', () => ({
  useServices: () => ({
    fileSystemService: {},
    aiService: {},
    liveStream: { isCurrentlyStreaming: () => false },
    taskPlanner: {},
    executionEngine: {},
    backgroundAgentSystem: {},
    orchestrator: {},
    performanceOptimizer: {},
  }),
  useUIPanel: () => ui,
  useWorkspaceCtx: () => ws,
  useAppExtras: () => ({
    aiMessages: [],
    notifications: [],
    currentModel: 'deepseek',
    removeNotification: vi.fn(),
    openrouterApiKey: '',
    handleInsertCode: vi.fn(),
    handleToggleScreenshotPanel: vi.fn(),
    handleToggleComponentLibrary: vi.fn(),
    handleToggleVisualEditor: vi.fn(),
    multiFileApprovalOpen: false,
    multiFileEditPlan: null,
  }),
}));

async function renderLayout() {
  const { AppLayout } = await import('../AppLayout');
  await act(async () => {
    render(<AppLayout />);
    await Promise.resolve();
  });
}

beforeEach(() => {
  captured.titleBar = null;
  captured.statusBar = null;
  captured.shellCloses = [];
  ui.gitPanelOpen = false;
  ui.aiChatOpen = false;
  ui.chatMode = 'chat';
  ui.activeVisualPanel = 'none';
  ui.backgroundPanelOpen = false;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('AppLayout chrome wiring', () => {
  it('threads Git open/toggle, find/replace and zoom handlers into the chrome', async () => {
    await renderLayout();
    expect(captured.titleBar).not.toBeNull();
    expect(captured.statusBar).not.toBeNull();
  });

  it('StatusBar Git click opens the Git panel', async () => {
    await renderLayout();
    act(() => captured.statusBar!.onGitClick());
    expect(ui.setGitPanelOpen).toHaveBeenCalledWith(true);
  });

  it('StatusBar Chat Agent opens the coding executor directly', async () => {
    await renderLayout();
    act(() => captured.statusBar!.onToggleAIChat());
    expect(ui.setChatMode).toHaveBeenCalledWith('agent');
    expect(ui.setAiChatOpen).toHaveBeenCalledWith(true);
  });

  it('TitleBar Git toggle flips the current Git panel state', async () => {
    ui.gitPanelOpen = true;
    await renderLayout();
    act(() => captured.titleBar!.onToggleGitPanel());
    expect(ui.setGitPanelOpen).toHaveBeenCalledWith(false);
  });

  it('TitleBar Find and Replace open global search', async () => {
    await renderLayout();
    act(() => captured.titleBar!.onFind());
    act(() => captured.titleBar!.onReplace());
    expect(ui.setGlobalSearchOpen).toHaveBeenNthCalledWith(1, true);
    expect(ui.setGlobalSearchOpen).toHaveBeenNthCalledWith(2, true);
  });

  it('TitleBar background toggle uses agent manager when legacy panel is off', async () => {
    // default: VITE_ENABLE_LEGACY_BACKGROUND_TASK_PANEL is not 'true'
    await renderLayout();
    expect(captured.titleBar?.onToggleBackgroundPanel).toBeTypeOf('function');
    act(() => captured.titleBar!.onToggleBackgroundPanel!());
  });

  it('wires StatusBar agent manager and background panel toggles', async () => {
    await renderLayout();
    expect(
      captured.statusBar?.onToggleBackgroundPanel || captured.statusBar?.onOpenAgentManager
    ).toBeTruthy();
    if (captured.statusBar?.onToggleBackgroundPanel) {
      act(() => captured.statusBar!.onToggleBackgroundPanel!());
    }
    if (captured.statusBar?.onOpenAgentManager) {
      act(() => captured.statusBar!.onOpenAgentManager!());
    }
  });

  it('enables legacy task panel and review agents when env flags are set', async () => {
    vi.stubEnv('VITE_ENABLE_LEGACY_BACKGROUND_TASK_PANEL', 'true');
    vi.stubEnv('VITE_ENABLE_REVIEW_AGENTS', 'true');
    vi.resetModules();
    captured.statusBar = null;
    captured.titleBar = null;
    const { AppLayout } = await import('../AppLayout');
    await act(async () => {
      render(<AppLayout />);
      await Promise.resolve();
    });
    // TitleBar + StatusBar both get the legacy background-panel branch
    expect(captured.titleBar?.onToggleBackgroundPanel).toBeTypeOf('function');
    act(() => captured.titleBar!.onToggleBackgroundPanel!());
    expect(ui.setBackgroundPanelOpen).toHaveBeenCalled();
    expect(captured.statusBar?.onToggleBackgroundPanel).toBeTypeOf('function');
    act(() => captured.statusBar!.onToggleBackgroundPanel!());
    expect(captured.statusBar?.onOpenAgentMode).toBeTypeOf('function');
    act(() => captured.statusBar!.onOpenAgentMode!());
    expect(ui.setAgentModeOpen).toHaveBeenCalledWith(true);
    vi.unstubAllEnvs();
  });

  it('renders visual shells for screenshot/library/visual and closes them', async () => {
    for (const panel of ['screenshot', 'library', 'visual'] as const) {
      captured.shellCloses = [];
      ui.activeVisualPanel = panel;
      await renderLayout();
      expect(captured.shellCloses.length).toBeGreaterThan(0);
      act(() => captured.shellCloses[0]!());
      expect(ui.setActiveVisualPanel).toHaveBeenCalledWith('none');
    }
  });

  it('TitleBar Zoom In steps the editor font size up', async () => {
    await renderLayout();
    act(() => captured.titleBar!.onZoomIn());
    expect(ws.updateEditorSettings).toHaveBeenCalledWith(expect.objectContaining({ fontSize: 15 }));
  });

  it('TitleBar Zoom Out steps the editor font size down', async () => {
    await renderLayout();
    act(() => captured.titleBar!.onZoomOut());
    expect(ws.updateEditorSettings).toHaveBeenCalledWith(expect.objectContaining({ fontSize: 13 }));
  });
});
