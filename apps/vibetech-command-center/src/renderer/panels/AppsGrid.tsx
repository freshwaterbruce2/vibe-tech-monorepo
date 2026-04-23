import { useMemo } from 'react';
import { FolderOpen, Archive, Terminal } from 'lucide-react';
import { Panel, StatusDot, RelativeTime } from '@renderer/components/Panel';
import { useNxGraph, useHealth, useBackupList, useCurrentTime } from '@renderer/hooks';
import { useUiStore } from '@renderer/stores';
import type { NxProject, ProbeResult } from '@shared/types';

export function AppsGrid() {
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
      onRefresh={() => { void nx.refetch(); }}
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

function AppCard({ app, lastActivity, lastBackup }: AppCardProps) {
  const absPath = `C:\\dev\\${app.root.replace(/\//g, '\\')}`;
  const now = useCurrentTime(60_000);

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
        <StatusDot ok={lastActivity != null && now - lastActivity < 60_000 ? true : 'warn'} />
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
        <button
          onClick={() => { void handleBackup(); }}
          className="btn btn-primary flex-1 text-[11px] py-1"
          title="Create zip backup"
        >
          <Archive size={12} /> Backup
        </button>
        <button
          onClick={() => { void handleOpenInExplorer(); }}
          className="btn flex-1 text-[11px] py-1"
          title="Open in Explorer"
        >
          <FolderOpen size={12} />
        </button>
        <button
          onClick={() => { void handleOpenTerminal(); }}
          className="btn flex-1 text-[11px] py-1"
          title="Open Windows Terminal"
        >
          <Terminal size={12} />
        </button>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-bg-elev border border-bg-line rounded-lg p-4 animate-pulse h-[180px]" />
      ))}
    </div>
  );
}
