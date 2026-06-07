import { useEffect, useState } from 'react';
import { VtdeIcon } from '../icons';
import { getSelfHealingRunStatus } from '../lib/tauri-bridge';
import type { SelfHealingRunStatus } from '../types/vtde';

export interface WindowInfo {
  id: string;
  title: string;
  state: string;
  isActive: boolean;
  icon?: string;
}

interface TaskbarProps {
  windows: WindowInfo[];
  onToggleLauncher: () => void;
  onShutdown: () => void;
  onWindowClick?: (id: string) => void;
  onPinClick?: (id: string) => void;
}

const PINNED_APPS = [
  { id: 'nova-agent', title: 'Nova Agent', icon: '🧠' },
  { id: 'vibe-code-studio', title: 'Vibe Code Studio', icon: '⚡' },
  { id: 'terminal', title: 'Terminal', icon: '💻' },
  { id: 'orchestrator', title: 'Control Plane', icon: '🎛️' },
  { id: 'database', title: 'Databases', icon: '🗄️' },
  { id: 'memory-viz', title: 'Memory', icon: '🕸️' },
  { id: 'affected', title: 'Affected', icon: '📈' },
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useHealingTray() {
  const [status, setStatus] = useState<SelfHealingRunStatus | null>(null);

  useEffect(() => {
    const poll = () => {
      getSelfHealingRunStatus()
        .then(setStatus)
        .catch(() => setStatus(null));
    };
    poll();
    const id = setInterval(poll, 15_000);
    return () => clearInterval(id);
  }, []);

  return status;
}

export function Taskbar({
  windows,
  onToggleLauncher,
  onShutdown,
  onWindowClick,
  onPinClick,
}: TaskbarProps) {
  const now = useClock();
  const healing = useHealingTray();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString([], { month: 'short', day: 'numeric' });

  // Deduplicate pinned items if they are currently open
  const openIds = new Set(
    windows.map((w) => {
      if (w.id.includes('terminal')) return 'terminal';
      if (w.id.includes('nova-agent')) return 'nova-agent';
      if (w.id.includes('vibe-code-studio')) return 'vibe-code-studio';
      if (w.id.includes('orchestrator')) return 'orchestrator';
      if (w.id.includes('database')) return 'database';
      if (w.id.includes('memory-viz')) return 'memory-viz';
      if (w.id.includes('affected')) return 'affected';
      return w.id;
    }),
  );

  const healingIcon = healing?.running ? '🔄' : '🛡️';
  const healingLabel = healing?.running
    ? `Healing: ${healing.mode ?? 'running'}`
    : healing?.last_exit_code === 0
      ? 'Healed ✓'
      : 'Idle';

  return (
    <div className="taskbar">
      <button className="taskbar__start" onClick={onToggleLauncher} title="Launcher">
        <VtdeIcon size={18} />
      </button>

      <div className="taskbar__windows">
        {PINNED_APPS.map(
          (app) =>
            !openIds.has(app.id) && (
              <button
                key={`pin-${app.id}`}
                className="taskbar__window-btn taskbar__window-btn--pinned"
                title={app.title}
                onClick={() => onPinClick?.(app.id)}
              >
                <span className="taskbar__window-icon">{app.icon}</span>
                <span>{app.title}</span>
              </button>
            ),
        )}

        {windows.map((w) => {
          let icon = w.icon;
          icon ??= w.id.includes('terminal')
            ? '⚡'
            : w.id.includes('memory')
              ? '🧠'
              : w.id.includes('explorer')
                ? '📁'
                : w.id.includes('orchestrator')
                  ? '🎛️'
                  : w.id.includes('database')
                    ? '🗄️'
                    : w.id.includes('affected')
                      ? '📈'
                      : '🌐';

          return (
            <button
              key={w.id}
              className={`taskbar__window-btn${w.isActive ? ' taskbar__window-btn--active' : ''}`}
              title={w.title}
              onClick={() => onWindowClick?.(w.id)}
            >
              <span className="taskbar__window-icon">{icon}</span>
              <span>{w.title}</span>
            </button>
          );
        })}
      </div>

      <div className="taskbar__tray">
        {/* Live healing status indicator */}
        <div className="taskbar__healing-status" title={healingLabel}>
          <span>
            {healingIcon} {healingLabel}
          </span>
        </div>

        <div className="taskbar__time">
          <span>{time}</span>
          <span className="taskbar__date">{date}</span>
        </div>
        <button className="taskbar__power" onClick={onShutdown} title="Shutdown">
          ⏻
        </button>
      </div>
    </div>
  );
}
