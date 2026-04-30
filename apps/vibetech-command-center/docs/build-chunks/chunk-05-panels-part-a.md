# Chunk 5 — Real Panels Part A (AppsGrid, DbHealth, BackupLog)

**Goal:** Replace the smoke-test harness with the real dashboard shell and the first three production panels. Zustand for ephemeral state, TanStack Query for server state (IPC results), TanStack Query `refetchInterval` for polling. Vibe-Tech brand tokens applied throughout.

**Session time budget:** ~2 hours.

**Explicitly NOT in this chunk:** BuildStatus, RagSearch, ClaudeLauncher, AgentConsole — those are Chunk 6. No MCP server exposure. No packaging.

**Prerequisite:** Chunk 4 complete. All 43+ tests green. Smoke harness renders all 5 sections.

---

## 0. Backup first

```powershell
Compress-Archive -Path C:\dev\apps\vibetech-command-center -DestinationPath C:\dev\_backups\pre-chunk05_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
```

---

## 1. Install UI dependencies

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm add lucide-react clsx
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- `lucide-react` — icons (Vibe-Tech uses this in Nova Agent already)
- `clsx` — conditional class composition
- `@testing-library/*` + `jsdom` — component tests

Update `vitest.config.ts` to support both node and jsdom environments:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx', 'tests/unit/**/*.spec.ts'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    environmentMatchGlobs: [
      ['src/renderer/**/*.spec.tsx', 'jsdom'],
      ['src/renderer/**/*.spec.ts', 'jsdom'],
      ['**', 'node']
    ],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/main/services/**/*.ts', 'src/renderer/**/*.{ts,tsx}'],
      exclude: ['**/*.spec.*']
    }
  },
  resolve: {
    alias: {
      '@main': resolve('src/main'),
      '@shared': resolve('src/shared'),
      '@renderer': resolve('src/renderer')
    }
  }
});
```

Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

---

## 2. Tailwind config — apply Vibe-Tech brand tokens

Replace `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        'pulse-cyan': {
          DEFAULT: '#00E5FF',
          50: '#E6FBFF',
          100: '#B8F4FF',
          200: '#7AEAFF',
          300: '#3DE0FF',
          400: '#00E5FF',
          500: '#00B8CC',
          600: '#008A99',
          700: '#005C66',
          800: '#002E33',
          900: '#001719'
        },
        bg: {
          base: '#0A0E1A',
          panel: '#111827',
          elev: '#1F2937',
          line: '#374151'
        },
        status: {
          ok: '#34D399',
          warn: '#FBBF24',
          error: '#F87171',
          off: '#6B7280'
        }
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace']
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 229, 255, 0.15)',
        'glow-cyan-strong': '0 0 30px rgba(0, 229, 255, 0.3)'
      }
    }
  },
  plugins: []
};
```

Add Google Fonts import at the top of `src/renderer/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body, #root {
    height: 100%;
  }
  body {
    @apply bg-bg-base text-slate-100 font-sans antialiased;
  }
}

@layer components {
  .panel {
    @apply bg-bg-panel border border-bg-line rounded-lg overflow-hidden;
  }
  .panel-header {
    @apply px-4 py-3 border-b border-bg-line flex items-center justify-between bg-bg-elev;
  }
  .panel-title {
    @apply text-sm font-semibold tracking-wide text-pulse-cyan uppercase;
  }
  .status-dot {
    @apply w-2 h-2 rounded-full inline-block;
  }
  .btn {
    @apply inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium
           border border-bg-line bg-bg-elev hover:bg-slate-700 transition-colors
           disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-primary {
    @apply border-pulse-cyan-700 text-pulse-cyan-300 hover:bg-pulse-cyan-800;
  }
}
```

---

## 3. TanStack Query setup and Zustand store

### `src/renderer/lib/query-client.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 15_000,
      gcTime: 5 * 60_000
    }
  }
});
```

### `src/renderer/lib/ipc.ts`

Thin helper that unwraps `IpcResult<T>` envelopes, throwing on `ok: false` so TanStack Query treats it as an error.

```typescript
import type { IpcResult } from '@shared/types';

export async function unwrap<T>(promise: Promise<IpcResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.ok) {
    const err = new Error(result.error);
    (err as Error & { code?: string }).code = result.code;
    throw err;
  }
  return result.data;
}
```

### `src/renderer/stores/index.ts`

Replace the Chunk 1 placeholder. One Zustand store for ephemeral UI state only (not server data — that lives in TanStack Query).

```typescript
import { create } from 'zustand';
import type { FileEvent } from '@shared/types';

export type PanelId = 'apps' | 'databases' | 'backups' | 'builds' | 'rag' | 'claude' | 'agents';

interface UiState {
  activePanel: PanelId;
  wsConnected: boolean;
  recentFileEvents: FileEvent[];
  sidebarCollapsed: boolean;

  setActivePanel: (p: PanelId) => void;
  setWsConnected: (c: boolean) => void;
  pushFileEvents: (events: FileEvent[]) => void;
  clearFileEvents: () => void;
  toggleSidebar: () => void;
}

const MAX_FILE_EVENTS = 200;

export const useUiStore = create<UiState>((set) => ({
  activePanel: 'apps',
  wsConnected: false,
  recentFileEvents: [],
  sidebarCollapsed: false,

  setActivePanel: (p) => set({ activePanel: p }),
  setWsConnected: (c) => set({ wsConnected: c }),
  pushFileEvents: (events) => set((s) => ({
    recentFileEvents: [...events, ...s.recentFileEvents].slice(0, MAX_FILE_EVENTS)
  })),
  clearFileEvents: () => set({ recentFileEvents: [] }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }))
}));
```

### `src/renderer/hooks/index.ts`

Replace the Chunk 1 placeholder. Shared hooks for IPC queries and stream subscriptions.

```typescript
import { useEffect } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { unwrap } from '@renderer/lib/ipc';
import { useUiStore } from '@renderer/stores';
import type {
  NxGraph, ProbeResult, DbMetric, BackupLogEntry, ProcessHandle,
  FileEvent, StreamTopic
} from '@shared/types';

export function useNxGraph(): UseQueryResult<NxGraph> {
  return useQuery({
    queryKey: ['nx', 'graph'],
    queryFn: () => unwrap(window.commandCenter.nx.get()),
    staleTime: 30_000,
    refetchInterval: 60_000
  });
}

export function useHealth(): UseQueryResult<ProbeResult[]> {
  return useQuery({
    queryKey: ['health', 'all'],
    queryFn: () => unwrap(window.commandCenter.health.probeAll()),
    refetchInterval: 5_000
  });
}

export function useDbMetrics(): UseQueryResult<DbMetric[]> {
  return useQuery({
    queryKey: ['db', 'metrics'],
    queryFn: () => unwrap(window.commandCenter.db.collectAll()),
    refetchInterval: 30_000
  });
}

export function useBackupList(limit = 20): UseQueryResult<BackupLogEntry[]> {
  return useQuery({
    queryKey: ['backups', 'recent', limit],
    queryFn: () => unwrap(window.commandCenter.backup.list(limit)),
    refetchInterval: 10_000
  });
}

export function useProcessList(): UseQueryResult<ProcessHandle[]> {
  return useQuery({
    queryKey: ['processes', 'list'],
    queryFn: () => unwrap(window.commandCenter.process.list()),
    refetchInterval: 2_000
  });
}

export function useStream<T = unknown>(topic: StreamTopic, handler: (payload: T) => void): void {
  useEffect(() => {
    const unsub = window.commandCenter.stream.subscribe(topic, (payload) => handler(payload as T));
    return unsub;
  }, [topic, handler]);
}

export function useFileEventSubscription(): void {
  const pushFileEvents = useUiStore((s) => s.pushFileEvents);
  const setWsConnected = useUiStore((s) => s.setWsConnected);
  useStream<FileEvent[]>('cc.watcher.events', pushFileEvents);
  useStream<null>('cc.watcher.ready', () => setWsConnected(true));
  useStream<{ message: string }>('cc.watcher.error', () => setWsConnected(false));
}
```

---

## 4. Shell layout

### `src/renderer/components/Shell.tsx`

Left sidebar with panel switcher, main content area, top status bar.

```typescript
import React from 'react';
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
  icon: React.ComponentType<{ className?: string; size?: number }>;
  enabled: boolean;
}

const NAV: NavItem[] = [
  { id: 'apps',      label: 'Apps',       icon: LayoutGrid, enabled: true },
  { id: 'databases', label: 'Databases',  icon: Database,   enabled: true },
  { id: 'backups',   label: 'Backups',    icon: Archive,    enabled: true },
  { id: 'builds',    label: 'Builds',     icon: Hammer,     enabled: false },
  { id: 'rag',       label: 'RAG Search', icon: Search,     enabled: false },
  { id: 'claude',    label: 'Claude',     icon: Sparkles,   enabled: false },
  { id: 'agents',    label: 'Agents',     icon: Activity,   enabled: false }
];

export function Shell({ children }: { children: React.ReactNode }): JSX.Element {
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
```

---

## 5. Shared panel primitives

### `src/renderer/components/Panel.tsx`

```typescript
import React from 'react';
import clsx from 'clsx';
import { RefreshCw } from 'lucide-react';

export interface PanelProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  className?: string;
}

export function Panel({ title, children, actions, loading, error, onRefresh, className }: PanelProps): JSX.Element {
  return (
    <section className={clsx('panel mb-6', className)}>
      <header className="panel-header">
        <h2 className="panel-title">{title}</h2>
        <div className="flex items-center gap-2">
          {actions}
          {onRefresh && (
            <button onClick={onRefresh} className="btn text-xs" aria-label="refresh">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}
        </div>
      </header>
      <div className="p-4">
        {error ? (
          <div className="text-status-error text-sm font-mono">{error}</div>
        ) : children}
      </div>
    </section>
  );
}

export function StatusDot({ ok }: { ok: boolean | 'warn' }): JSX.Element {
  const color = ok === true ? 'bg-status-ok' : ok === 'warn' ? 'bg-status-warn' : 'bg-status-error';
  return <span className={clsx('status-dot', color)} />;
}

export function Bytes({ n }: { n: number }): JSX.Element {
  const mb = n / 1024 / 1024;
  const gb = mb / 1024;
  const text = gb >= 1 ? `${gb.toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
  return <span className="font-mono">{text}</span>;
}

export function RelativeTime({ ts }: { ts: number }): JSX.Element {
  const now = Date.now();
  const diff = now - ts;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const text =
    day > 0 ? `${day}d ago` :
    hr > 0 ? `${hr}h ago` :
    min > 0 ? `${min}m ago` :
    `${sec}s ago`;
  return <span className="text-slate-500 font-mono text-xs">{text}</span>;
}
```

---

## 6. Panel: AppsGrid

**Path:** `src/renderer/panels/AppsGrid.tsx`

Grid of cards, one per Nx app. Shows: name, tags, path, reachable status for the app's known port (matched via health probe), last activity from file watcher. Click a card → one-click actions (backup, open in Explorer).

```typescript
import React, { useMemo } from 'react';
import { FolderOpen, Archive, Terminal } from 'lucide-react';
import { Panel, StatusDot, RelativeTime } from '@renderer/components/Panel';
import { useNxGraph, useHealth, useBackupList } from '@renderer/hooks';
import { useUiStore } from '@renderer/stores';
import type { NxProject, ProbeResult } from '@shared/types';

export function AppsGrid(): JSX.Element {
  const nx = useNxGraph();
  const health = useHealth();
  const backups = useBackupList(100);
  const fileEvents = useUiStore((s) => s.recentFileEvents);

  const apps = useMemo(() => {
    if (!nx.data) return [];
    return Object.values(nx.data.projects)
      .filter((p) => p.type === 'app')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [nx.data]);

  const lastActivityByApp = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of fileEvents) {
      if (!e.appName) continue;
      const prev = map.get(e.appName) ?? 0;
      if (e.timestamp > prev) map.set(e.appName, e.timestamp);
    }
    return map;
  }, [fileEvents]);

  const lastBackupByApp = useMemo(() => {
    const map = new Map<string, number>();
    if (!backups.data) return map;
    for (const b of backups.data) {
      const match = b.zipPath.match(/([a-zA-Z0-9_\-]+?)(?:_|\.zip)/);
      const key = match?.[1];
      if (!key) continue;
      const prev = map.get(key) ?? 0;
      if (b.createdAt > prev) map.set(key, b.createdAt);
    }
    return map;
  }, [backups.data]);

  if (nx.isLoading) return <Panel title="Apps"><LoadingGrid /></Panel>;

  return (
    <Panel
      title={`Apps (${apps.length})`}
      loading={nx.isFetching}
      error={nx.error instanceof Error ? nx.error.message : null}
      onRefresh={() => nx.refetch()}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {apps.map((app) => (
          <AppCard
            key={app.name}
            app={app}
            health={health.data}
            lastActivity={lastActivityByApp.get(app.name)}
            lastBackup={lastBackupByApp.get(app.name)}
          />
        ))}
      </div>
    </Panel>
  );
}

interface AppCardProps {
  app: NxProject;
  health: ProbeResult[] | undefined;
  lastActivity: number | undefined;
  lastBackup: number | undefined;
}

function AppCard({ app, lastActivity, lastBackup }: AppCardProps): JSX.Element {
  const absPath = `C:\\dev\\${app.root.replace(/\//g, '\\')}`;

  const handleBackup = async (): Promise<void> => {
    const res = await window.commandCenter.backup.create({
      sourcePath: absPath,
      label: app.name
    });
    if (!res.ok) {
      console.error('backup failed:', res.error);
    }
  };

  const handleOpenInExplorer = async (): Promise<void> => {
    await window.commandCenter.process.spawn({
      command: 'explorer.exe',
      args: [absPath],
      cwd: 'C:\\dev'
    });
  };

  const handleOpenTerminal = async (): Promise<void> => {
    await window.commandCenter.process.spawn({
      command: 'wt.exe',
      args: ['-d', absPath],
      cwd: 'C:\\dev'
    });
  };

  return (
    <div className="bg-bg-elev border border-bg-line rounded-lg p-4 hover:border-pulse-cyan-700 hover:shadow-glow-cyan transition-all">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-slate-100 font-mono text-sm truncate" title={app.name}>
          {app.name}
        </h3>
        <StatusDot ok={lastActivity && Date.now() - lastActivity < 60_000 ? true : 'warn'} />
      </div>

      <div className="text-xs text-slate-500 font-mono mb-2 truncate" title={absPath}>
        {app.root}
      </div>

      <div className="flex flex-wrap gap-1 mb-3 min-h-[20px]">
        {app.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-pulse-cyan-900 text-pulse-cyan-300 rounded">
            {tag}
          </span>
        ))}
      </div>

      <div className="text-xs space-y-1 mb-3 text-slate-400">
        <div className="flex justify-between">
          <span>last edit</span>
          {lastActivity ? <RelativeTime ts={lastActivity} /> : <span className="text-slate-600">—</span>}
        </div>
        <div className="flex justify-between">
          <span>last backup</span>
          {lastBackup ? <RelativeTime ts={lastBackup} /> : <span className="text-slate-600">—</span>}
        </div>
      </div>

      <div className="flex gap-1">
        <button onClick={handleBackup} className="btn btn-primary flex-1 text-[11px] py-1" title="Create zip backup">
          <Archive size={12} /> Backup
        </button>
        <button onClick={handleOpenInExplorer} className="btn flex-1 text-[11px] py-1" title="Open in Explorer">
          <FolderOpen size={12} />
        </button>
        <button onClick={handleOpenTerminal} className="btn flex-1 text-[11px] py-1" title="Open Windows Terminal">
          <Terminal size={12} />
        </button>
      </div>
    </div>
  );
}

function LoadingGrid(): JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-bg-elev border border-bg-line rounded-lg p-4 animate-pulse h-[180px]" />
      ))}
    </div>
  );
}
```

---

## 7. Panel: DbHealth

**Path:** `src/renderer/panels/DbHealth.tsx`

Four-DB row display with WAL size alert threshold (> 100MB red per the memory). Table row count summary. Error-state awareness.

```typescript
import React from 'react';
import clsx from 'clsx';
import { AlertTriangle, Database as DbIcon } from 'lucide-react';
import { Panel, Bytes, RelativeTime } from '@renderer/components/Panel';
import { useDbMetrics } from '@renderer/hooks';
import type { DbMetric } from '@shared/types';

const WAL_ALERT_MB = 100;
const SIZE_ALERT_MB = 500;

export function DbHealth(): JSX.Element {
  const { data, isLoading, isFetching, error, refetch } = useDbMetrics();

  return (
    <Panel
      title={`Databases (${data?.length ?? 0})`}
      loading={isFetching}
      error={error instanceof Error ? error.message : null}
      onRefresh={() => refetch()}
    >
      {isLoading ? (
        <div className="text-slate-500 text-sm">collecting metrics...</div>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((db) => <DbRow key={db.path} db={db} />)}
        </div>
      )}
    </Panel>
  );
}

function DbRow({ db }: { db: DbMetric }): JSX.Element {
  const sizeMb = db.sizeBytes / 1024 / 1024;
  const walMb = db.walSizeBytes / 1024 / 1024;
  const walAlert = walMb > WAL_ALERT_MB;
  const sizeAlert = sizeMb > SIZE_ALERT_MB;
  const totalRows = db.tables.reduce((sum, t) => sum + (t.rowCount > 0 ? t.rowCount : 0), 0);

  if (db.error) {
    return (
      <div className="bg-bg-elev border border-bg-line rounded-lg p-4">
        <div className="flex items-center gap-3 mb-2">
          <DbIcon size={16} className="text-slate-500" />
          <span className="font-mono font-semibold text-slate-300">{db.name}</span>
          <span className="text-xs text-status-error">{db.error}</span>
        </div>
        <div className="text-xs text-slate-500 font-mono">{db.path}</div>
      </div>
    );
  }

  return (
    <div className={clsx(
      'bg-bg-elev border rounded-lg p-4 transition-colors',
      walAlert || sizeAlert ? 'border-status-warn' : 'border-bg-line'
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <DbIcon size={16} className="text-pulse-cyan" />
          <span className="font-mono font-semibold text-slate-100">{db.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-bg-panel text-slate-400 rounded font-mono uppercase">
            {db.journalMode}
          </span>
        </div>
        <RelativeTime ts={db.lastCheckedAt} />
      </div>

      <div className="text-xs text-slate-500 font-mono mb-3 truncate" title={db.path}>
        {db.path}
      </div>

      <div className="grid grid-cols-4 gap-3 text-sm">
        <Metric
          label="size"
          value={<Bytes n={db.sizeBytes} />}
          alert={sizeAlert ? 'size > 500 MB' : undefined}
        />
        <Metric
          label="wal"
          value={<Bytes n={db.walSizeBytes} />}
          alert={walAlert ? 'WAL > 100 MB — checkpoint recommended' : undefined}
        />
        <Metric
          label="tables"
          value={<span className="font-mono">{db.tables.length}</span>}
        />
        <Metric
          label="rows"
          value={<span className="font-mono">{totalRows.toLocaleString()}</span>}
        />
      </div>

      {db.tables.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-pulse-cyan">
            {db.tables.length} tables
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
            {db.tables
              .slice()
              .sort((a, b) => b.rowCount - a.rowCount)
              .slice(0, 20)
              .map((t) => (
                <div key={t.name} className="flex justify-between text-slate-400">
                  <span className="truncate">{t.name}</span>
                  <span className="text-slate-500">{t.rowCount.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Metric({ label, value, alert }: { label: string; value: React.ReactNode; alert?: string }): JSX.Element {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className="text-slate-100">{value}</div>
      {alert && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-status-warn">
          <AlertTriangle size={10} /> {alert}
        </div>
      )}
    </div>
  );
}
```

---

## 8. Panel: BackupLog

**Path:** `src/renderer/panels/BackupLog.tsx`

Scrollable list of recent backups, with one-click "Backup monorepo root" action for the nuclear option.

```typescript
import React, { useState } from 'react';
import { Archive, HardDrive, FileArchive } from 'lucide-react';
import { Panel, Bytes, RelativeTime } from '@renderer/components/Panel';
import { useBackupList } from '@renderer/hooks';
import { basename } from '@renderer/lib/path';

export function BackupLog(): JSX.Element {
  const { data, isLoading, isFetching, error, refetch } = useBackupList(50);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleQuickBackup = async (sourcePath: string, label: string): Promise<void> => {
    setBusy(true);
    setLastResult(null);
    try {
      const res = await window.commandCenter.backup.create({ sourcePath, label });
      if (res.ok) {
        setLastResult(`backup created: ${basename(res.data.zipPath)} (${(res.data.sizeBytes / 1024 / 1024).toFixed(1)} MB)`);
        await refetch();
      } else {
        setLastResult(`backup failed: ${res.error}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title={`Recent Backups (${data?.length ?? 0})`}
      loading={isFetching}
      error={error instanceof Error ? error.message : null}
      onRefresh={() => refetch()}
      actions={
        <div className="flex gap-2">
          <button
            className="btn btn-primary text-xs"
            disabled={busy}
            onClick={() => handleQuickBackup('C:\\dev\\apps', 'all-apps')}
          >
            <Archive size={12} /> Backup apps/
          </button>
          <button
            className="btn btn-primary text-xs"
            disabled={busy}
            onClick={() => handleQuickBackup('C:\\dev\\packages', 'all-packages')}
          >
            <Archive size={12} /> Backup packages/
          </button>
        </div>
      }
    >
      {lastResult && (
        <div className="mb-3 text-xs font-mono text-pulse-cyan-300 bg-pulse-cyan-900/30 border border-pulse-cyan-800 rounded px-3 py-2">
          {lastResult}
        </div>
      )}

      {isLoading ? (
        <div className="text-slate-500 text-sm">loading backups...</div>
      ) : (data ?? []).length === 0 ? (
        <div className="text-slate-500 text-sm italic">no backups yet in C:\dev\_backups</div>
      ) : (
        <div className="overflow-hidden rounded border border-bg-line">
          <table className="w-full text-sm">
            <thead className="bg-bg-elev text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-medium">File</th>
                <th className="text-left px-3 py-2 font-medium">Label</th>
                <th className="text-right px-3 py-2 font-medium">Size</th>
                <th className="text-right px-3 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((b) => (
                <tr key={b.zipPath} className="border-t border-bg-line hover:bg-bg-elev/60 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileArchive size={14} className="text-pulse-cyan shrink-0" />
                      <span className="font-mono text-xs truncate max-w-[420px]" title={b.zipPath}>
                        {basename(b.zipPath)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-400 text-xs">{b.label ?? '—'}</td>
                  <td className="px-3 py-2 text-right"><Bytes n={b.sizeBytes} /></td>
                  <td className="px-3 py-2 text-right"><RelativeTime ts={b.createdAt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <HardDrive size={12} />
        <span className="font-mono">C:\dev\_backups\</span>
      </div>
    </Panel>
  );
}
```

### `src/renderer/lib/path.ts`

Tiny pure-function helper. No Node in the renderer.

```typescript
export function basename(path: string): string {
  const i = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
  return i >= 0 ? path.slice(i + 1) : path;
}
```

---

## 9. Rewire `App.tsx`

Replace the Chunk 4 smoke harness:

```typescript
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@renderer/lib/query-client';
import { Shell } from '@renderer/components/Shell';
import { AppsGrid } from '@renderer/panels/AppsGrid';
import { DbHealth } from '@renderer/panels/DbHealth';
import { BackupLog } from '@renderer/panels/BackupLog';
import { useUiStore } from '@renderer/stores';
import { useFileEventSubscription } from '@renderer/hooks';

export function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}

function AppInner(): JSX.Element {
  useFileEventSubscription();
  const activePanel = useUiStore((s) => s.activePanel);

  return (
    <Shell>
      {activePanel === 'apps'      && <AppsGrid />}
      {activePanel === 'databases' && <DbHealth />}
      {activePanel === 'backups'   && <BackupLog />}
      {(activePanel === 'builds' || activePanel === 'rag' || activePanel === 'claude' || activePanel === 'agents') && (
        <div className="text-slate-500 font-mono text-sm italic">
          This panel ships in a later chunk.
        </div>
      )}
    </Shell>
  );
}
```

---

## 10. Component tests

### `src/renderer/panels/AppsGrid.spec.tsx`

Mocks the `window.commandCenter` bridge and verifies rendering + card actions.

```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppsGrid } from './AppsGrid';
import type { CommandCenterAPI } from '@shared/types';

function mockBridge(overrides: Partial<CommandCenterAPI> = {}): void {
  const base: CommandCenterAPI = {
    version: '0.1.0',
    nx: {
      get: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          projects: {
            'nova-agent':         { name: 'nova-agent',         type: 'app', root: 'apps/nova-agent',         tags: ['scope:ai'],     implicitDependencies: [] },
            'vibe-code-studio':   { name: 'vibe-code-studio',   type: 'app', root: 'apps/vibe-code-studio',   tags: ['scope:ide'],    implicitDependencies: [] },
            'shared-ui':          { name: 'shared-ui',          type: 'lib', root: 'packages/shared-ui',      tags: ['scope:shared'], implicitDependencies: [] }
          },
          dependencies: {},
          generatedAt: Date.now()
        },
        timestamp: Date.now()
      }),
      refresh: vi.fn()
    },
    health:  { probeAll: vi.fn().mockResolvedValue({ ok: true, data: [], timestamp: Date.now() }), probeOne: vi.fn() },
    db:      { collectAll: vi.fn().mockResolvedValue({ ok: true, data: [], timestamp: Date.now() }) },
    backup:  {
      create: vi.fn().mockResolvedValue({ ok: true, data: { success: true, zipPath: 'x.zip', sizeBytes: 1024, sourcePath: 'x', label: null, startedAt: 1, completedAt: 2, durationMs: 1 }, timestamp: Date.now() }),
      list:   vi.fn().mockResolvedValue({ ok: true, data: [], timestamp: Date.now() })
    },
    process: {
      spawn: vi.fn().mockResolvedValue({ ok: true, data: { id: 'p1', command: 'x', args: [], cwd: '.', pid: 1, status: 'running', startedAt: 1, exitCode: null }, timestamp: Date.now() }),
      kill:  vi.fn(),
      list:  vi.fn().mockResolvedValue({ ok: true, data: [], timestamp: Date.now() })
    },
    claude:  { invoke: vi.fn() },
    rag:     { search: vi.fn() },
    meta:    { info: vi.fn().mockResolvedValue({ ok: true, data: { version: '0.1.0', monorepoRoot: 'C:\\dev', wsPort: 3210 }, timestamp: Date.now() }) },
    stream:  { subscribe: vi.fn(() => () => {}) },
    ...overrides
  };
  Object.defineProperty(window, 'commandCenter', { value: base, writable: true, configurable: true });
}

function renderWithQuery(ui: React.ReactElement): ReturnType<typeof render> {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('AppsGrid', () => {
  beforeEach(() => { mockBridge(); });

  it('renders only apps (filters out libs)', async () => {
    renderWithQuery(<AppsGrid />);
    await waitFor(() => {
      expect(screen.getByText('nova-agent')).toBeInTheDocument();
      expect(screen.getByText('vibe-code-studio')).toBeInTheDocument();
    });
    expect(screen.queryByText('shared-ui')).not.toBeInTheDocument();
  });

  it('clicking Backup invokes backup.create with the app path and label', async () => {
    const createMock = vi.fn().mockResolvedValue({ ok: true, data: { success: true, zipPath: 'nova.zip', sizeBytes: 1, sourcePath: '.', label: 'nova-agent', startedAt: 1, completedAt: 2, durationMs: 1 }, timestamp: Date.now() });
    mockBridge({ backup: { create: createMock, list: vi.fn().mockResolvedValue({ ok: true, data: [], timestamp: Date.now() }) } });
    const user = userEvent.setup();
    renderWithQuery(<AppsGrid />);
    await waitFor(() => expect(screen.getByText('nova-agent')).toBeInTheDocument());
    const backupButtons = screen.getAllByRole('button', { name: /backup/i });
    await user.click(backupButtons[0]!);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      sourcePath: expect.stringContaining('nova-agent'),
      label: 'nova-agent'
    }));
  });
});
```

### `src/renderer/panels/DbHealth.spec.tsx`

```typescript
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DbHealth } from './DbHealth';

function mockDbMetrics(dbs: Array<Partial<import('@shared/types').DbMetric>>): void {
  Object.defineProperty(window, 'commandCenter', {
    value: {
      db: {
        collectAll: vi.fn().mockResolvedValue({
          ok: true,
          data: dbs.map((d) => ({
            name: 'default', path: 'x.db', sizeBytes: 0, walSizeBytes: 0,
            pageCount: 0, pageSize: 4096, tables: [], journalMode: 'WAL',
            lastCheckedAt: Date.now(), ...d
          })),
          timestamp: Date.now()
        })
      }
    },
    writable: true, configurable: true
  });
}

function renderWithQuery(ui: React.ReactElement): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('DbHealth', () => {
  beforeEach(() => {});

  it('renders normal DB row', async () => {
    mockDbMetrics([{ name: 'trading', sizeBytes: 10 * 1024 * 1024, tables: [{ name: 't', rowCount: 42 }] }]);
    renderWithQuery(<DbHealth />);
    await waitFor(() => expect(screen.getByText('trading')).toBeInTheDocument());
    expect(screen.getByText(/10.0 MB/)).toBeInTheDocument();
  });

  it('shows WAL alert when wal > 100 MB', async () => {
    mockDbMetrics([{ name: 'bloated', walSizeBytes: 150 * 1024 * 1024 }]);
    renderWithQuery(<DbHealth />);
    await waitFor(() => expect(screen.getByText(/WAL > 100 MB/)).toBeInTheDocument());
  });

  it('shows error state when DB file missing', async () => {
    mockDbMetrics([{ name: 'ghost', error: 'file not found' }]);
    renderWithQuery(<DbHealth />);
    await waitFor(() => expect(screen.getByText('file not found')).toBeInTheDocument());
  });
});
```

### `src/renderer/panels/BackupLog.spec.tsx`

```typescript
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BackupLog } from './BackupLog';

function setupBridge(listData: unknown[], createImpl?: ReturnType<typeof vi.fn>): ReturnType<typeof vi.fn> {
  const create = createImpl ?? vi.fn().mockResolvedValue({
    ok: true,
    data: { success: true, zipPath: 'C:\\dev\\_backups\\x.zip', sizeBytes: 2048, sourcePath: '.', label: 'all-apps', startedAt: 1, completedAt: 2, durationMs: 1 },
    timestamp: Date.now()
  });
  Object.defineProperty(window, 'commandCenter', {
    value: {
      backup: {
        list: vi.fn().mockResolvedValue({ ok: true, data: listData, timestamp: Date.now() }),
        create
      }
    },
    writable: true, configurable: true
  });
  return create;
}

function renderWithQuery(ui: React.ReactElement): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('BackupLog', () => {
  beforeEach(() => {});

  it('renders backup rows', async () => {
    setupBridge([
      { zipPath: 'C:\\dev\\_backups\\alpha.zip', sizeBytes: 1024 * 1024, createdAt: Date.now() - 60_000, label: 'alpha' },
      { zipPath: 'C:\\dev\\_backups\\beta.zip',  sizeBytes: 2 * 1024 * 1024, createdAt: Date.now() - 120_000, label: 'beta' }
    ]);
    renderWithQuery(<BackupLog />);
    await waitFor(() => expect(screen.getByText('alpha.zip')).toBeInTheDocument());
    expect(screen.getByText('beta.zip')).toBeInTheDocument();
  });

  it('quick-backup button triggers backup.create', async () => {
    const create = setupBridge([]);
    const user = userEvent.setup();
    renderWithQuery(<BackupLog />);
    await waitFor(() => expect(screen.getByText(/Backup apps\//)).toBeInTheDocument());
    await user.click(screen.getByText(/Backup apps\//));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      sourcePath: 'C:\\dev\\apps',
      label: 'all-apps'
    }));
  });

  it('empty state when no backups', async () => {
    setupBridge([]);
    renderWithQuery(<BackupLog />);
    await waitFor(() => expect(screen.getByText(/no backups yet/i)).toBeInTheDocument());
  });
});
```

---

## 11. Run everything

```powershell
cd C:\dev\apps\vibetech-command-center
pnpm run typecheck ; pnpm run test ; pnpm run dev
```

**Expected totals:**
```
 Test Files  13 passed (13)
      Tests  51+ passed
```

**Dev window expected:**
- Left sidebar with 3 active nav items (Apps, Databases, Backups) + 4 greyed-out pending ones
- Top status bar shows `stream live` once watcher is ready, `health N/6`
- Default view: AppsGrid — a responsive grid of app cards for all ~28 Nx apps
- Click an app's Backup button → zip appears in BackupLog within 10s (auto-refresh)
- Switch to Databases → 4 DB rows, any with `error: file not found` clearly marked
- Switch to Backups → scrollable table + two quick-backup buttons
- Touch a file in `C:\dev\apps\nova-agent\src\anything.ts` → within a second, the nova-agent card shows a cyan "live" dot and the "last edit" timestamp updates

---

## Acceptance criteria

1. `pnpm run typecheck` clean.
2. `pnpm run test` — all tests green (51+ total).
3. `pnpm run dev` opens the real dashboard UI with navigable sidebar.
4. All three panels (Apps, Databases, Backups) load data within 5 seconds.
5. AppsGrid shows only apps (type: 'app'), filters out libs.
6. DbHealth shows WAL alert styling when the condition is met.
7. BackupLog quick-backup button creates a new zip, list auto-refreshes.
8. No panel file exceeds 500 lines. Sanity check: `Get-ChildItem src\renderer -Recurse -Include *.tsx | ForEach-Object { "$($_.Name): $((Get-Content $_.FullName).Count)" }`.
9. Switching panels does not refetch already-cached queries within staleTime.
10. File changes in `C:\dev\apps\*\src` reach AppsGrid cards as "last edit" updates within 1s.

---

## Hazards to flag

1. **Google Fonts on first load** — `@import url(...)` in CSS blocks rendering until fetched. If the dashboard stalls on first launch with no network, move font loading to a `<link rel="preconnect">` in `index.html` or drop the Google Fonts import and fall back to `system-ui`.

2. **`wt.exe` may not be on PATH** — the AppsGrid terminal button assumes Windows Terminal. If you don't have it installed or aliased, the spawn call will silently error (process.spawn returns ok but the process immediately exits). Fix: detect `wt.exe` existence on first mount or fall back to `cmd.exe /K`.

3. **nx graph re-runs on refetchInterval** — TanStack Query refetches every 60s, which re-shells `pnpm exec nx graph`. That's ~60 CPU-spikes per hour. If you see the fans ramp, bump `refetchInterval` on `useNxGraph` to 300_000 (5 min) — the Nx graph barely changes during normal work.

4. **AppsGrid last-backup matching is heuristic** — the regex `/([a-zA-Z0-9_\-]+?)(?:_|\.zip)/` matches the first alnum run in the zip filename. Your backup zips are named `<sourceName>_<label>_<timestamp>.zip`, so the first run is the source name — which is usually the app name. If you've been backing up with non-standard labels, some app cards will miss their "last backup" time. That's cosmetic, not a bug.

5. **QueryClient devtools** — not installed. If you want them for debugging, `pnpm add -D @tanstack/react-query-devtools` and drop `<ReactQueryDevtools />` under the provider. Optional; skip unless helpful.

---

## Post-chunk backup

```powershell
Compress-Archive -Path C:\dev\apps\vibetech-command-center -DestinationPath C:\dev\_backups\command-center-chunk05-complete_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip -CompressionLevel Optimal
```

Ping me with `chunk 5 complete` (plus any oddities) and I'll write Chunk 6 — the remaining four panels: BuildStatus, RagSearch, ClaudeLauncher, AgentConsole. Chunk 6 is where the dashboard starts to *do* things beyond observation: invoke Claude Code sessions, search the RAG index, and stream live output. The ClaudeLauncher panel in particular is the payoff of the Chunk 3 `claude-bridge` service — a visual front-end for spawning Claude Code against any app in the grid.
