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
import { OpenWindow, useDesktopWindowManager } from './useDesktopWindowManager';

export function Desktop() {
  const [apps, setApps] = useState<VibeAppManifest[]>([]);
  const [showLauncher, setShowLauncher] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [showHealing, setShowHealing] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);

  const { toasts, addToast, dismissToast } = useToasts();
  const { recordAppLaunch, available: memoryAvailable } = useMemory();

  const {
    openWindows,
    setOpenWindows,
    activeWindowId,
    setActiveWindowId,
    toggleWindow,
    handleCloseWindow,
    updateWindow,
    handleWindowClick,
  } = useDesktopWindowManager(stopApp);

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
        setShowLauncher(false);
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
    [recordAppLaunch, apps, addToast, openWindows.length, setActiveWindowId, setOpenWindows],
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
            onClick={() => {
              toggleWindow('explorer');
              setShowLauncher(false);
            }}
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
              setShowLauncher(false);
            }}
            title="Neural Memory"
          >
            <MemoryIcon size={16} />
          </button>
          <button
            className="heal-toggle-btn terminal-toggle"
            onClick={() => {
              void toggleWindow('terminal');
              setShowLauncher(false);
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
            setShowLauncher(false);
          } else {
            // App-style launch for pinned apps like nova-agent, vibe-code-studio
            void handleLaunch(id);
          }
        }}
      />
    </div>
  );
}
