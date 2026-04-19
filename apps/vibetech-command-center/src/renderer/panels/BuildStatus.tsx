import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { Panel, RelativeTime } from '@renderer/components/Panel';
import { unwrap } from '@renderer/lib/ipc';
import { useNxGraph } from '@renderer/hooks';
import type { NxProject, FsStatResult } from '@shared/types';

const STALE_BUILD_MS = 24 * 60 * 60 * 1000;
const FRESH_BUILD_MS = 60 * 60 * 1000;

export function BuildStatus() {
  const nx = useNxGraph();

  const apps = useMemo(() => {
    if (!nx.data) return [];
    return Object.values(nx.data.projects)
      .filter((p) => p.type === 'app')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [nx.data]);

  return (
    <Panel
      title={`Build Status (${apps.length} apps)`}
      loading={nx.isFetching}
      error={nx.error instanceof Error ? nx.error.message : null}
      onRefresh={() => nx.refetch()}
    >
      {apps.length === 0 ? (
        <div className="text-slate-500 text-sm">loading projects...</div>
      ) : (
        <div className="overflow-hidden rounded border border-bg-line">
          <table className="w-full text-sm">
            <thead className="bg-bg-elev text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-left px-3 py-2 font-medium">App</th>
                <th className="text-left px-3 py-2 font-medium">Tags</th>
                <th className="text-right px-3 py-2 font-medium">Dist Size</th>
                <th className="text-right px-3 py-2 font-medium">Built</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => <BuildRow key={app.name} app={app} />)}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function BuildRow({ app }: { app: NxProject }) {
  const distPath = `C:\\dev\\${app.root.replace(/\//g, '\\')}\\dist`;

  const { data, isLoading } = useQuery<FsStatResult>({
    queryKey: ['fs', 'stat', distPath],
    queryFn: () => unwrap(window.commandCenter.fs.stat(distPath)),
    staleTime: 30_000,
    refetchInterval: 60_000
  });

  const status = (() => {
    if (isLoading) return 'loading';
    if (!data?.exists) return 'never';
    if (!data.mtimeMs) return 'never';
    const age = Date.now() - data.mtimeMs;
    if (age < FRESH_BUILD_MS) return 'fresh';
    if (age > STALE_BUILD_MS) return 'stale';
    return 'ok';
  })();

  return (
    <tr className="border-t border-bg-line hover:bg-bg-elev/60">
      <td className="px-3 py-2"><StatusBadge status={status} /></td>
      <td className="px-3 py-2 font-mono text-xs">{app.name}</td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {app.tags.slice(0, 2).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-bg-elev text-slate-400 rounded">{t}</span>
          ))}
        </div>
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs text-slate-400">
        {data?.exists && data.isDirectory ? `${(data.sizeBytes / 1024 / 1024).toFixed(1)} MB` : '—'}
      </td>
      <td className="px-3 py-2 text-right">
        {data?.mtimeMs ? <RelativeTime ts={data.mtimeMs} /> : <span className="text-slate-600 text-xs">never</span>}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: 'loading' | 'never' | 'fresh' | 'ok' | 'stale' }) {
  if (status === 'loading') return <Circle size={14} className="text-slate-600 animate-pulse" />;
  if (status === 'never')   return <Circle size={14} className="text-slate-600" />;
  if (status === 'fresh')   return <CheckCircle2 size={14} className="text-status-ok" />;
  if (status === 'ok')      return <CheckCircle2 size={14} className="text-slate-400" />;
  return <AlertCircle size={14} className="text-status-warn" />;
}
