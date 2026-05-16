import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Play, Square, RotateCcw, Search, Activity, Server } from 'lucide-react';
import clsx from 'clsx';
import { Panel, RelativeTime } from '@renderer/components/Panel';
import { unwrap } from '@renderer/lib/ipc';
import { useNxGraph, useCurrentTime } from '@renderer/hooks';
import type { ProcessHandle, AgentTaskLauncher, McpServerStatus, AgentTaskSpec, LogSearchFilters, ProcessChunk } from '@shared/types';

const TARGETS = ['build', 'test', 'lint', 'typecheck', 'dev', 'e2e'];

export function AgentOrchestrator() {
  const mcpQuery = useQuery({
    queryKey: ['agent', 'mcpStatus'],
    queryFn: async () => unwrap(window.commandCenter.agent.mcpStatus()),
    refetchInterval: 10_000
  });
  const taskQuery = useQuery({
    queryKey: ['agent', 'taskList'],
    queryFn: async () => unwrap(window.commandCenter.agent.taskList()),
    refetchInterval: 5_000
  });
  const taskRun = useMutation({
    mutationFn: async (spec: AgentTaskLauncher) => unwrap(window.commandCenter.agent.taskRun(spec))
  });
  const healthyCount = mcpQuery.data?.filter((s) => s.healthy === true).length ?? 0;
  const unhealthyCount = mcpQuery.data?.filter((s) => s.healthy === false).length ?? 0;

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="shrink-0 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-pulse-cyan">Agent Orchestrator</h1>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-status-ok"><Activity size={12} /> {healthyCount} healthy</span>
          <span className="flex items-center gap-1 text-status-error"><Activity size={12} /> {unhealthyCount} unhealthy</span>
        </div>
      </div>
      <div className="flex-[2] min-h-0 flex flex-col gap-4 overflow-hidden">
        <McpHealthStrip servers={mcpQuery.data ?? []} isLoading={mcpQuery.isFetching} />
        <NxTaskLauncher onLaunch={(spec) => taskRun.mutate(spec)} isPending={taskRun.isPending} lastHandle={taskRun.data ?? null} />
      </div>
      <div className="flex-[3] min-h-0 flex flex-col gap-4 overflow-hidden">
        <TaskList tasks={taskQuery.data ?? []} isLoading={taskQuery.isFetching} onRefetch={useCallback(() => { void taskQuery.refetch(); }, [taskQuery])} />
        <LogSearch tasks={taskQuery.data ?? []} />
      </div>
    </div>
  );
}

function McpHealthStrip({ servers, isLoading }: { servers: McpServerStatus[]; isLoading: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const handleSelect = useCallback((name: string, isSelected: boolean) => {
    setSelected(isSelected ? null : name);
  }, []);
  if (isLoading && servers.length === 0) return <div className="text-slate-500 text-sm">loading mcp status...</div>;
  return (
    <div className="shrink-0 space-y-2">
      <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">MCP Server Health</div>
      <div className="flex flex-wrap gap-2">
        {servers.map((s) => {
          const isSelected = selected === s.name;
          const colorClass = s.healthy === true
            ? 'bg-emerald-900 text-emerald-300 border-emerald-700'
            : s.runtimeStatus === 'installed-not-running'
              ? 'bg-amber-900 text-amber-300 border-amber-700'
            : 'bg-rose-900 text-rose-300 border-rose-700';
          return (
            <div key={s.name} className="relative">
              <button onClick={() => handleSelect(s.name, isSelected)} className={clsx('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors', colorClass)} type="button">
                <span className="flex items-center gap-1.5"><Server size={12} />{s.name}<span className="opacity-75">({s.transport})</span></span>
              </button>
              {isSelected && (
                <div className="absolute z-10 mt-1 w-56 bg-bg-elev border border-bg-line rounded-lg p-3 shadow-glow-cyan">
                  <div className="text-xs text-slate-300 space-y-1">
                    {s.port !== undefined && <div>port: <span className="font-mono">{s.port}</span></div>}
                    {s.runtimeStatus && <div>status: <span className="font-mono">{s.runtimeStatus}</span></div>}
                    <div>probed: <RelativeTime ts={s.lastProbeAt} /></div>
                    {s.error && <div className="text-status-error">{s.error}</div>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {servers.length === 0 && <span className="text-slate-500 text-xs italic">no mcp servers configured</span>}
      </div>
    </div>
  );
}

function NxTaskLauncher({ onLaunch, isPending, lastHandle }: { onLaunch: (spec: AgentTaskLauncher) => void; isPending: boolean; lastHandle: ProcessHandle | null }) {
  const nxQuery = useNxGraph();
  const [project, setProject] = useState('');
  const [target, setTarget] = useState('build');
  const [args, setArgs] = useState('');
  const projects = useMemo(() => Object.values(nxQuery.data?.projects ?? {}).sort((a, b) => a.name.localeCompare(b.name)), [nxQuery.data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !target) return;
    const argList = args.trim().length > 0 ? args.split(/\s+/).filter(Boolean) : undefined;
    onLaunch({ project, target, args: argList });
  };

  return (
    <div className="bg-bg-elev border border-bg-line rounded-lg p-4 shrink-0">
      <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Nx Task Launcher</div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase text-slate-500">Project</label>
          <select value={project} onChange={(e) => setProject(e.target.value)} className="bg-bg-panel border border-bg-line rounded px-2 py-1.5 text-sm text-slate-200 min-w-[160px]">
            <option value="">Select project</option>
            {projects.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase text-slate-500">Target</label>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="bg-bg-panel border border-bg-line rounded px-2 py-1.5 text-sm text-slate-200 min-w-[120px]">
            {TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
          <label className="text-[10px] uppercase text-slate-500">Args</label>
          <input type="text" value={args} onChange={(e) => setArgs(e.target.value)} placeholder="--skip-nx-cache" className="bg-bg-panel border border-bg-line rounded px-2 py-1.5 text-sm text-slate-200" />
        </div>
        <button type="submit" disabled={isPending || !project} className="btn btn-primary"><Play size={14} />{isPending ? 'Launching...' : 'Run'}</button>
      </form>
      {lastHandle && (
        <div className="mt-2 text-xs">
          <span className="text-status-ok">Launched</span> process <span className="font-mono text-slate-300">{lastHandle.id}</span> —{' '}
          <span className={clsx(lastHandle.status === 'running' ? 'text-pulse-cyan' : lastHandle.status === 'exited' && lastHandle.exitCode === 0 ? 'text-status-ok' : 'text-status-error')}>
            {lastHandle.status}
          </span>
        </div>
      )}
    </div>
  );
}

function TaskList({ tasks, isLoading, onRefetch }: { tasks: AgentTaskSpec[]; isLoading: boolean; onRefetch: () => void }) {
  const now = useCurrentTime(1000);
  const sorted = useMemo(() => [...tasks].sort((a, b) => b.startedAt - a.startedAt), [tasks]);

  const handleKill = useCallback((id: string) => {
    void (async () => {
      await unwrap(window.commandCenter.process.kill(id));
      onRefetch();
    })();
  }, [onRefetch]);
  const handleRestart = useCallback((task: AgentTaskSpec) => {
    void (async () => {
      await unwrap(window.commandCenter.agent.taskRun({ project: task.project, target: task.target, args: task.args }));
      onRefetch();
    })();
  }, [onRefetch]);

  return (
    <Panel title={`Tasks (${tasks.filter((t) => t.status === 'running').length} running, ${tasks.length} total)`} loading={isLoading} onRefresh={onRefetch}>
      <div className="overflow-auto max-h-[35vh]">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-500 border-b border-bg-line">
            <tr>
              <th className="text-left py-2 px-3">Project</th>
              <th className="text-left py-2 px-3">Target</th>
              <th className="text-left py-2 px-3">Status</th>
              <th className="text-left py-2 px-3">Started</th>
              <th className="text-left py-2 px-3">Duration</th>
              <th className="text-left py-2 px-3">Exit</th>
              <th className="text-right py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((task) => <TaskRow key={task.id} task={task} now={now} onKill={handleKill} onRestart={handleRestart} />)}
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="py-4 text-slate-500 text-sm italic text-center">no tasks yet — launch one above</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

interface StatusMeta {
  label: string;
  color: string;
  dot?: boolean;
}

const DEFAULT_STATUS_META: StatusMeta = { label: 'Error', color: 'text-status-error' };

const STATUS_META: Record<string, StatusMeta> = {
  running: { label: 'Running', color: 'text-pulse-cyan', dot: true },
  exited: { label: 'Success', color: 'text-status-ok' },
  exited_fail: { label: 'Failed', color: 'text-status-error' },
  killed: { label: 'Killed', color: 'text-status-warn' },
  pending: { label: 'Pending', color: 'text-slate-400' },
  error: { label: 'Error', color: 'text-status-error' }
};

function TaskRow({ task, now, onKill, onRestart }: { task: AgentTaskSpec; now: number; onKill: (id: string) => void; onRestart: (task: AgentTaskSpec) => void }) {
  const durationMs = task.status === 'running' ? now - task.startedAt : (task.exitedAt ?? now) - task.startedAt;
  const durationSec = Math.floor(durationMs / 1000);
  const durationText = durationSec < 60 ? `${durationSec}s` : `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`;
  const metaKey = task.status === 'exited' && task.exitCode !== 0 ? 'exited_fail' : task.status;
  const meta = STATUS_META[metaKey] ?? STATUS_META.error ?? DEFAULT_STATUS_META;

  return (
    <tr className="border-b border-bg-line hover:bg-bg-elev transition-colors">
      <td className="py-2 px-3 font-mono text-slate-200">{task.project}</td>
      <td className="py-2 px-3 text-slate-300">{task.target}</td>
      <td className="py-2 px-3">
        <span className={clsx('flex items-center gap-1.5 text-xs font-medium', meta.color)}>
          {meta.dot && <span className="w-2 h-2 rounded-full bg-pulse-cyan animate-pulse" />}
          {meta.label}
        </span>
      </td>
      <td className="py-2 px-3"><RelativeTime ts={task.startedAt} /></td>
      <td className="py-2 px-3 font-mono text-xs text-slate-400">{durationText}</td>
      <td className="py-2 px-3 font-mono text-xs">
        {task.exitCode !== null ? (
          <span className={task.exitCode === 0 ? 'text-status-ok' : 'text-status-error'}>{task.exitCode}</span>
        ) : <span className="text-slate-600">—</span>}
      </td>
      <td className="py-2 px-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {task.status === 'running' && (
            <button onClick={() => onKill(task.id)} className="text-slate-500 hover:text-status-error" title="kill" aria-label="Kill task" type="button"><Square size={14} /></button>
          )}
          {(task.status === 'exited' || task.status === 'killed' || task.status === 'error') && (
            <button onClick={() => onRestart(task)} className="text-slate-500 hover:text-pulse-cyan" title="restart" aria-label="Restart task" type="button"><RotateCcw size={14} /></button>
          )}
        </div>
      </td>
    </tr>
  );
}

function LogSearch({ tasks }: { tasks: AgentTaskSpec[] }) {
  const [processId, setProcessId] = useState('');
  const [stream, setStream] = useState<'all' | 'stdout' | 'stderr'>('all');
  const [sinceMinutes, setSinceMinutes] = useState<number | undefined>(undefined);
  const [results, setResults] = useState<ProcessChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = () => {
    void (async () => {
      setIsSearching(true);
      setError(null);
      try {
        const filters: LogSearchFilters = {
          processId: processId || undefined,
          stream: stream === 'all' ? undefined : stream,
          since: sinceMinutes !== undefined ? Date.now() - sinceMinutes * 60_000 : undefined
        };
        const res = await unwrap(window.commandCenter.agent.logSearch(filters));
        setResults(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsSearching(false);
      }
    })();
  };

  return (
    <Panel title="Log Search" loading={isSearching}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase text-slate-500">Process</label>
            <select value={processId} onChange={(e) => setProcessId(e.target.value)} className="bg-bg-panel border border-bg-line rounded px-2 py-1.5 text-sm text-slate-200 min-w-[140px]">
              <option value="">All</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.project} ({t.id.slice(0, 8)})</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase text-slate-500">Stream</label>
            <div className="flex border border-bg-line rounded overflow-hidden">
              {(['all', 'stdout', 'stderr'] as const).map((s) => (
                <button key={s} onClick={() => setStream(s)} className={clsx('px-3 py-1.5 text-xs capitalize transition-colors', stream === s ? 'bg-pulse-cyan-900 text-pulse-cyan' : 'text-slate-400 hover:bg-bg-elev')} type="button">{s}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase text-slate-500">Since</label>
            <div className="flex gap-1">
              {[1, 5, 15].map((m) => (
                <button key={m} onClick={() => setSinceMinutes(sinceMinutes === m ? undefined : m)} className={clsx('px-2 py-1.5 text-xs rounded border transition-colors', sinceMinutes === m ? 'border-pulse-cyan-700 bg-pulse-cyan-900 text-pulse-cyan' : 'border-bg-line text-slate-400 hover:bg-bg-elev')} type="button">{m}m</button>
              ))}
            </div>
          </div>
          <button onClick={handleSearch} disabled={isSearching} className="btn btn-primary ml-auto" type="button"><Search size={14} />Search</button>
        </div>
        {error && <div className="text-status-error text-sm font-mono">{error}</div>}
        <div className="bg-bg-base border border-bg-line rounded p-3 h-48 overflow-auto font-mono text-xs space-y-0.5">
          {results.length === 0 ? (
            <div className="text-slate-600 italic">{isSearching ? 'searching...' : 'no results — adjust filters and search'}</div>
          ) : (
            results.map((chunk, i) => (
              <div key={i} className={clsx('flex gap-2', chunk.stream === 'stderr' ? 'text-status-error' : 'text-slate-300')}>
                <span className="text-slate-600 shrink-0">[{new Date(chunk.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                <span className="text-slate-600 shrink-0">[{chunk.stream}]</span>
                <span>{chunk.data}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}
