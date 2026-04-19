import type { ReactNode, ComponentType } from 'react';
import clsx from 'clsx';
import {
  LayoutGrid, Database, Archive, Hammer, Search,
  Sparkles, Activity, Menu
} from 'lucide-react';
import { useUiStore, type PanelId } from '@renderer/stores';
import { useHealth } from '@renderer/hooks';

interface NavItem {
  id: PanelId;
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  enabled: boolean;
}

const NAV: NavItem[] = [
  { id: 'apps',      label: 'Apps',       icon: LayoutGrid, enabled: true },
  { id: 'databases', label: 'Databases',  icon: Database,   enabled: true },
  { id: 'backups',   label: 'Backups',    icon: Archive,    enabled: true },
  { id: 'builds',    label: 'Builds',     icon: Hammer,     enabled: true },
  { id: 'rag',       label: 'RAG Search', icon: Search,     enabled: true },
  { id: 'claude',    label: 'Claude',     icon: Sparkles,   enabled: true },
  { id: 'agents',    label: 'Agents',     icon: Activity,   enabled: true }
];

export function Shell({ children }: { children: ReactNode }) {
  const activePanel = useUiStore((s) => s.activePanel);
  const setActivePanel = useUiStore((s) => s.setActivePanel);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const wsConnected = useUiStore((s) => s.wsConnected);
  const healthQuery = useHealth();
  const reachableCount = healthQuery.data?.filter((h) => h.reachable).length ?? 0;
  const totalCount = healthQuery.data?.length ?? 0;

  return (
    <div className="flex h-screen">
      <aside className={clsx(
        'flex flex-col bg-bg-panel border-r border-bg-line transition-[width]',
        sidebarCollapsed ? 'w-14' : 'w-56'
      )}>
        <div className="px-4 py-4 border-b border-bg-line flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="text-slate-400 hover:text-pulse-cyan"
            aria-label="toggle sidebar"
          >
            <Menu size={18} />
          </button>
          {!sidebarCollapsed && (
            <span className="font-bold text-pulse-cyan text-sm tracking-wider">COMMAND CENTER</span>
          )}
        </div>

        <nav className="flex-1 py-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = activePanel === item.id;
            return (
              <button
                key={item.id}
                disabled={!item.enabled}
                onClick={() => item.enabled && setActivePanel(item.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  active && 'bg-pulse-cyan-900 text-pulse-cyan-300 border-l-2 border-pulse-cyan',
                  !active && item.enabled && 'text-slate-300 hover:bg-bg-elev hover:text-pulse-cyan',
                  !item.enabled && 'text-slate-600 cursor-not-allowed'
                )}
                title={!item.enabled ? 'coming in a later chunk' : item.label}
              >
                <Icon size={16} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className={clsx('px-4 py-3 border-t border-bg-line text-xs', sidebarCollapsed && 'text-center')}>
          <div className="flex items-center gap-2">
            <span className={clsx('status-dot', wsConnected ? 'bg-status-ok' : 'bg-status-off')} />
            {!sidebarCollapsed && <span className="text-slate-400">stream {wsConnected ? 'live' : 'idle'}</span>}
          </div>
          {!sidebarCollapsed && (
            <div className="mt-1 text-slate-500">
              health {reachableCount}/{totalCount}
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 border-b border-bg-line bg-bg-panel flex items-center px-6 justify-between">
          <div className="text-sm text-slate-400">
            <span className="text-pulse-cyan">{NAV.find((n) => n.id === activePanel)?.label ?? ''}</span>
          </div>
          <div className="text-xs text-slate-500 font-mono">C:\dev</div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
