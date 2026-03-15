import { getCurrentWindow } from '@tauri-apps/api/window';
import { Folder } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useHealingNotifier } from '../hooks/useHealingNotifier';
import { useMemory } from '../hooks/useMemory';
import { HealingIcon, MemoryIcon, TerminalIcon } from '../icons';
import { getApps, launchApp, stopApp } from '../lib/tauri-bridge';
import type { VibeAppManifest } from '../types/vtde';
import { AppIcon } from '../widgets/AppIcon';
import { HealingDashboard } from '../widgets/HealingDashboard';
import { MemoryPanel } from '../widgets/MemoryPanel';
import { NovaQuickChat } from '../widgets/NovaQuickChat';
import { SystemMonitor } from '../widgets/SystemMonitor';
import { Terminal } from '../widgets/Terminal';
import { TerminalErrorBoundary } from '../widgets/TerminalErrorBoundary';
import { ToastContainer } from '../widgets/Toast';
import { useToasts } from '../widgets/useToasts';
import { VibeExplorer } from '../widgets/VibeExplorer';
import { WindowFrame } from '../widgets/WindowFrame';
import { AffectedVisualizer } from './apps/AffectedVisualizer';
import { AgentOrchestrator } from './apps/AgentOrchestrator';
import { DatabaseExplorer } from './apps/DatabaseExplorer';
import { MemoryVisualizer } from './apps/MemoryVisualizer';
import { DelayedIframe } from './DelayedIframe';
import { Launcher } from './Launcher';
import { Taskbar } from './Taskbar';

interface Position {
  x: number;
  y: number;
}
interface Size {
  w: number;
  h: number;
}

interface OpenWindow {
  id: string;
  type:
    | 'terminal'
    | 'memory'
    | 'app'
    | 'explorer'
    | 'orchestrator'
    | 'database'
    | 'memory-viz'
    | 'affected';
  title: string;
  url?: string;
  pid?: number;
  // Window metrics for persistence and snapping
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  maximized?: boolean;
  minimized?: boolean;
  preMax?: { pos: Position; size: Size };
}

interface PersistedLayout {
  version: number;
  windows: OpenWindow[];
  activeWindowId: string | null;
  timestamp: number;
}

export function Desktop() {
  const [apps, setApps] = useState<VibeAppManifest[]>([]);
  const [showLauncher, setShowLauncher] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [showHealing, setShowHealing] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>(() => {
    try {
      // eslint-disable-next-line electron-security/no-localstorage-electron
      const saved = localStorage.getItem('vtde:layout:v2');
      if (saved) {
        const layout: PersistedLayout = JSON.parse(saved);
        if (layout.version === 2) {
          return layout.windows
            .filter((w) => !w.pid)
            .map((w) => ({ ...w, minimized: w.minimized ?? false }));
        }
      }
    } catch (e) {
      console.error('Failed to restore VTDE layout:', e);
    }
    return [];
  });
  const [activeWindowId, setActiveWindowId] = useState<string | null>(() => {
    try {
      // eslint-disable-next-line electron-security/no-localstorage-electron
      const saved = localStorage.getItem('vtde:layout:v2');
      if (saved) {
        const layout: PersistedLayout = JSON.parse(saved);
        if (layout.version === 2) {
          return layout.activeWindowId;
        }
      }
    } catch {
      // Ignored
    }
    return null;
  });
  const { toasts, addToast, dismissToast } = useToasts();
  const { recordAppLaunch, available: memoryAvailable } = useMemory();

  // Save layout when state changes (debounced)
  useEffect(() => {
    const saveLayout = () => {
      try {
        const layout: PersistedLayout = {
          version: 2,
          windows: openWindows,
          activeWindowId,
          timestamp: Date.now(),
        };
        // eslint-disable-next-line electron-security/no-localstorage-electron
        localStorage.setItem('vtde:layout:v2', JSON.stringify(layout));
      } catch (e) {
        console.error('Failed to save VTDE layout:', e);
      }
    };

    // Debounce saves to avoid excessive writes
    const timeoutId = setTimeout(saveLayout, 500);
    return () => clearTimeout(timeoutId);
  }, [openWindows, activeWindowId]);

  const toggleWindow = useCallback((type: OpenWindow['type']) => {
    setOpenWindows((prev) => {
      const id = `vtde-${type}`;
      const exists = prev.find((w) => w.id === id);
      if (exists) {
        const updates: Partial<OpenWindow> = { minimized: false };

        const minWindowWidth = 360;
        const minWindowHeight = 240;
        const viewportWidth = window.innerWidth;
        const viewportHeight = Math.max(320, window.innerHeight - 48);

        if (typeof exists.w !== 'number' || exists.w < minWindowWidth) {
          updates.w = ['memory', 'orchestrator'].includes(type)
            ? 500
            : type === 'terminal'
              ? 720
              : 900;
        }
        if (typeof exists.h !== 'number' || exists.h < minWindowHeight) {
          updates.h = type === 'memory' ? 520 : type === 'terminal' ? 420 : 600;
        }

        const width = updates.w ?? exists.w ?? 640;
        const height = updates.h ?? exists.h ?? 480;

        if (
          typeof exists.x !== 'number' ||
          typeof exists.y !== 'number' ||
          exists.x > viewportWidth - 48 ||
          exists.y > viewportHeight - 48 ||
          exists.x < -width + 48 ||
          exists.y < -height + 48
        ) {
          updates.x = Math.max(24, Math.round((viewportWidth - width) / 2));
          updates.y = Math.max(24, Math.round((viewportHeight - height) / 2));
        }

        setActiveWindowId(id);
        return prev.map((w) => (w.id === id ? { ...w, ...updates } : w));
      }

      const titles: Record<string, string> = {
        terminal: 'VTDE Terminal',
        memory: 'Neural Memory',
        explorer: 'Vibe Explorer',
        orchestrator: 'Agent Orchestrator',
        database: 'Database Explorer',
        'memory-viz': 'Memory Visualizer',
        affected: 'Affected Intelligence',
      };

      const newWin: OpenWindow = {
        id,
        type,
        title: titles[type] ?? type,
      };
      setActiveWindowId(id);
      return [...prev, newWin];
    });
    setShowLauncher(false);
  }, []);

  const handleCloseWindow = useCallback((id: string) => {
    setOpenWindows((prev) => {
      const win = prev.find((w) => w.id === id);
      // Kill background process for app windows
      if (win?.type === 'app' && win.pid) {
        void stopApp(win.pid);
      }
      return prev.filter((w) => w.id !== id);
    });
  }, []);

  const updateWindow = useCallback((id: string, updates: Partial<OpenWindow>) => {
    setOpenWindows((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
  }, []);

  useEffect(() => {
    getApps().then(setApps).catch(console.error);

    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'Space') {
        e.preventDefault();
        setShowNova((v) => !v);
      }
      if (e.key === 'Meta' || (e.ctrlKey && e.key === ' ')) {
        setShowLauncher((v) => !v);
      }
      if (e.ctrlKey && e.code === 'Backquote') {
        e.preventDefault();
        toggleWindow('terminal');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleWindow]);

  // Background healing cycle notifications
  useHealingNotifier(
    useCallback(
      (cycle) => {
        const mode = cycle.dry_run ? '🔒 Dry Run' : '⚡ Live';
        const issues = cycle.fixable_issues;
        const fixes = cycle.fixes_attempted;
        addToast({
          icon: '🛡️',
          title: `Healing Cycle Complete (${mode})`,
          body: `${issues} issues found, ${fixes} fixes applied in ${cycle.elapsed_seconds.toFixed(0)}s`,
          accent: fixes > 0 ? '#10b981' : '#f59e0b',
        });
      },
      [addToast],
    ),
  );

  const handleLaunch = useCallback(
    async (appId: string) => {
      try {
        const result = await launchApp(appId);
        await recordAppLaunch(appId);
        setShowLauncher(false);

        if (result.app_type === 'web' && result.url) {
          // Open embedded iframe window
          const app = apps.find((a) => a.id === appId);
          const newWin: OpenWindow = {
            id: `app-${appId}-${Date.now()}`,
            type: 'app',
            title: app?.name ?? appId,
            url: result.url,
            pid: result.pid,
            x: 80 + openWindows.length * 30,
            y: 40 + openWindows.length * 20,
            w: 1024,
            h: 640,
          };
          setOpenWindows((prev) => [...prev, newWin]);
          setActiveWindowId(newWin.id);
        } else {
          addToast({
            icon: '🚀',
            title: 'App Launched',
            body: `${appId} opened as native window`,
            accent: '#06b6d4',
          });
        }
      } catch (err) {
        addToast({
          icon: '❌',
          title: 'Launch Failed',
          body: String(err),
          accent: '#ef4444',
        });
      }
    },
    [recordAppLaunch, apps, addToast, openWindows.length, setActiveWindowId], // Added openWindows.length and setActiveWindowId to dependencies
  );

  const handleShutdown = useCallback(async () => {
    try {
      addToast({
        icon: '🛑',
        title: 'Shutting Down',
        body: 'Closing the Vibe-Tech Desktop Environment...',
        accent: '#ef4444',
      });
      await getCurrentWindow().close();
    } catch (err) {
      console.error('Failed to shutdown:', err);
      addToast({
        icon: '⚠️',
        title: 'Shutdown Failed',
        body: String(err),
        accent: '#f59e0b',
      });
    }
  }, [addToast]);

  const handleWindowClick = useCallback(
    (windowId: string) => {
      const window = openWindows.find((w) => w.id === windowId);
      if (!window) return;

      if (window.minimized) {
        // Restore minimized window
        updateWindow(windowId, { minimized: false });
        setActiveWindowId(windowId);
      } else if (windowId === activeWindowId) {
        // Minimize active window if clicked again
        updateWindow(windowId, { minimized: true });
      } else {
        // Focus inactive window
        setActiveWindowId(windowId);
      }
    },
    [openWindows, activeWindowId, updateWindow],
  );

  const pinned = apps.slice(0, 12);

  // Build taskbar window list from open windows
  const windowList = openWindows.map((w) => ({
    id: w.id,
    title: w.title,
    state: 'normal' as const,
    isActive: w.id === activeWindowId,
  }));

  return (
    <div className="vtde-desktop">
      <div className="vtde-desktop__workspace">
        {/* Desktop Icons */}
        <div className="vtde-desktop__icons">
          {pinned.map((app) => (
            <button
              key={app.id}
              onDoubleClick={() => void handleLaunch(app.id)}
              className="desktop-icon"
            >
              <AppIcon src={app.icon} name={app.name} category={app.category} />
              <span className="desktop-icon__label">{app.name}</span>
            </button>
          ))}
        </div>

        {/* Floating Widgets */}
        <div className="vtde-desktop__widgets">
          {showMonitor && <SystemMonitor onClose={() => setShowMonitor(false)} />}
          <button
            className="heal-toggle-btn"
            onClick={() => setShowMonitor((v) => !v)}
            title="System Monitor"
          >
            <span className="heal-toggle-label">SYS</span>
          </button>
          <button
            className="heal-toggle-btn"
            onClick={() => toggleWindow('explorer')}
            title="Vibe Explorer (Win+E)"
          >
            <Folder size={16} />
          </button>
          <button
            className="heal-toggle-btn"
            onClick={() => {
              void setShowHealing((v) => !v);
            }}
            title="Self-Healing Monitor"
          >
            <HealingIcon size={16} />
          </button>
          <button
            className="heal-toggle-btn memory-toggle"
            onClick={() => {
              void toggleWindow('memory');
            }}
            title="Neural Memory"
          >
            <MemoryIcon size={16} />
          </button>
          <button
            className="heal-toggle-btn terminal-toggle"
            onClick={() => {
              void toggleWindow('terminal');
            }}
            title="Terminal (Ctrl+`)"
          >
            <TerminalIcon size={16} />
          </button>
          {memoryAvailable && (
            <span className="memory-indicator" title="Memory System Online">
              ●
            </span>
          )}
        </div>

        {/* Windowed Widgets */}
        {openWindows.map((w, i) => {
          const icons: Record<string, string> = {
            terminal: '⚡',
            memory: '🧠',
            app: '🌐',
            explorer: '📁',
            orchestrator: '🎛️',
            database: '🗄️',
            'memory-viz': '🕸️',
            affected: '📈',
          };
          const isApp = w.type === 'app';
          const isLarge = ['database', 'affected', 'orchestrator'].includes(w.type);
          return (
            <WindowFrame
              key={w.id}
              id={w.id}
              title={w.title}
              icon={icons[w.type] ?? '🌐'}
              x={w.x ?? (isApp ? 80 + i * 30 : 160 + i * 40)}
              y={w.y ?? (isApp ? 40 + i * 20 : 60 + i * 30)}
              w={
                w.w ??
                (isApp
                  ? 1024
                  : isLarge
                    ? 900
                    : w.type === 'explorer'
                      ? 800
                      : w.type === 'terminal'
                        ? 720
                        : 500)
              }
              h={
                w.h ??
                (isApp ? 640 : w.type === 'explorer' ? 600 : w.type === 'terminal' ? 420 : 520)
              }
              maximized={w.maximized ?? false}
              minimized={w.minimized ?? false}
              preMax={w.preMax}
              onUpdateState={(changes) => updateWindow(w.id, changes)}
              onClose={() => handleCloseWindow(w.id)}
              onFocus={() => setActiveWindowId(w.id)}
              zIndex={w.id === activeWindowId ? 100 : 10 + i}
            >
              {w.type === 'terminal' && (
                <TerminalErrorBoundary>
                  <Terminal onClose={() => handleCloseWindow(w.id)} />
                </TerminalErrorBoundary>
              )}
              {w.type === 'memory' && <MemoryPanel onClose={() => handleCloseWindow(w.id)} />}
              {w.type === 'explorer' && <VibeExplorer />}
              {w.type === 'app' && w.url && <DelayedIframe url={w.url} title={w.title} />}
              {w.type === 'orchestrator' && <AgentOrchestrator />}
              {w.type === 'database' && <DatabaseExplorer />}
              {w.type === 'memory-viz' && <MemoryVisualizer />}
              {w.type === 'affected' && <AffectedVisualizer />}
            </WindowFrame>
          );
        })}

        {showHealing && <HealingDashboard onClose={() => setShowHealing(false)} />}
      </div>

      {showLauncher && (
        <Launcher
          apps={apps}
          onLaunch={(id: string) => void handleLaunch(id)}
          onClose={() => setShowLauncher(false)}
        />
      )}

      {showNova && <NovaQuickChat onClose={() => setShowNova(false)} />}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <Taskbar
        windows={windowList}
        onToggleLauncher={() => setShowLauncher((v) => !v)}
        onShutdown={() => void handleShutdown()}
        onWindowClick={handleWindowClick}
        onPinClick={(id) => {
          const typeMap: Record<string, OpenWindow['type']> = {
            terminal: 'terminal',
            orchestrator: 'orchestrator',
            database: 'database',
            'memory-viz': 'memory-viz',
            affected: 'affected',
          };
          const windowType = typeMap[id];
          if (windowType) {
            toggleWindow(windowType);
          } else {
            // App-style launch for pinned apps like nova-agent, vibe-code-studio
            void handleLaunch(id);
          }
        }}
      />
    </div>
  );
}
