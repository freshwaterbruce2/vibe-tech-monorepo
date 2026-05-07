import { useState, useMemo, useCallback } from 'react';
import clsx from 'clsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Play, Search, AlertTriangle, Loader2 } from 'lucide-react';
import { unwrap } from '@renderer/lib/ipc';
import type { AffectedProject, AffectedGraph } from '@shared/types';

type FilterType = 'all' | 'app' | 'lib';
type FilterRisk = 'all' | 'has' | 'none';

export function AffectedDashboard() {
  const queryClient = useQueryClient();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [riskFilter, setRiskFilter] = useState<FilterRisk>('all');

  const {
    data,
    isLoading,
    isFetching,
    error,
    dataUpdatedAt
  } = useQuery<AffectedGraph>({
    queryKey: ['affected', 'graph'],
    queryFn: async () => unwrap(window.commandCenter.affected.get()),
    staleTime: 15_000
  });

  const handleRefresh = useCallback(() => {
    void (async () => {
      await window.commandCenter.affected.refresh();
      void queryClient.invalidateQueries({ queryKey: ['affected', 'graph'] });
    })();
  }, [queryClient]);

  const projects = useMemo(() => data?.projects ?? [], [data?.projects]);

  const filtered = useMemo(() => {
    let list = projects;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') {
      list = list.filter((p) => p.type === typeFilter);
    }
    if (riskFilter === 'has') {
      list = list.filter((p) => p.riskFlags.length > 0);
    } else if (riskFilter === 'none') {
      list = list.filter((p) => p.riskFlags.length === 0);
    }
    return list;
  }, [projects, search, typeFilter, riskFilter]);

  const selected = useMemo(
    () => projects.find((p) => p.name === selectedName) ?? null,
    [projects, selectedName]
  );

  const runAffected = useCallback(() => {
    void window.commandCenter.process.spawn({
      command: 'pnpm',
      args: ['exec', 'nx', 'affected', '-t', 'lint', 'typecheck', 'test'],
      cwd: 'C:\\dev'
    });
  }, []);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-100">Affected Intelligence</h2>
          {isFetching && <Loader2 size={16} className="text-pulse-cyan animate-spin" />}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono">
            {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}
          </span>
          <button
            onClick={handleRefresh}
            className="btn text-xs flex items-center gap-1.5"
            aria-label="refresh affected graph"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <div className="flex items-center gap-2 text-status-error text-sm">
          <AlertTriangle size={16} />
          {error instanceof Error ? error.message : 'Failed to load affected graph'}
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 size={16} className="animate-spin" />
          Loading affected projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="text-slate-500 text-sm">No affected projects found.</div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          {/* Left: project list */}
          <div className="lg:w-[40%] flex flex-col gap-3 min-h-0">
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full bg-bg-elev border border-bg-line rounded pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pulse-cyan"
                />
              </div>
              <div className="flex gap-2">
                <FilterToggle<FilterType>
                  options={[
                    { key: 'all', label: 'All' },
                    { key: 'app', label: 'Apps' },
                    { key: 'lib', label: 'Libs' }
                  ] as const}
                  value={typeFilter}
                  onChange={setTypeFilter}
                />
                <FilterToggle<FilterRisk>
                  options={[
                    { key: 'all', label: 'All' },
                    { key: 'has', label: 'Has Risks' },
                    { key: 'none', label: 'No Risks' }
                  ] as const}
                  value={riskFilter}
                  onChange={setRiskFilter}
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto border border-bg-line rounded bg-bg-panel">
              <table className="w-full text-sm">
                <thead className="bg-bg-elev text-slate-400 text-xs uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Project</th>
                    <th className="text-left px-3 py-2 font-medium">Type</th>
                    <th className="text-left px-3 py-2 font-medium">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((project) => (
                    <tr
                      key={project.name}
                      onClick={() => setSelectedName(project.name)}
                      className={clsx(
                        'border-t border-bg-line cursor-pointer transition-colors',
                        selectedName === project.name
                          ? 'bg-pulse-cyan-900/40'
                          : 'hover:bg-bg-elev/60'
                      )}
                    >
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-200 text-xs">{project.name}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {project.riskFlags.map((flag) => (
                            <span
                              key={flag}
                              className="text-[9px] px-1 py-0.5 rounded bg-status-warn/20 text-status-warn font-medium"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <TypeBadge type={project.type} />
                      </td>
                      <td className="px-3 py-2">
                        <HealthBadge score={project.healthScore} />
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-slate-500 text-xs">
                        No projects match filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: detail panel */}
          <div className="lg:w-[60%] border border-bg-line rounded bg-bg-panel p-4 overflow-auto">
            {selected ? (
              <ProjectDetail project={selected} onRunAffected={runAffected} />
            ) : (
              <div className="text-slate-500 text-sm text-center py-12">
                Select a project to view dependency graph
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterToggle<T extends string>({
  options,
  value,
  onChange
}: {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded border border-bg-line overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={clsx(
            'px-2.5 py-1 text-[11px] font-medium transition-colors',
            value === opt.key
              ? 'bg-pulse-cyan-900 text-pulse-cyan'
              : 'bg-bg-elev text-slate-400 hover:text-slate-200'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function TypeBadge({ type }: { type: 'app' | 'lib' }) {
  return (
    <span
      className={clsx(
        'text-[10px] px-1.5 py-0.5 rounded font-medium uppercase',
        type === 'app'
          ? 'bg-emerald-900/40 text-emerald-400'
          : 'bg-sky-900/40 text-sky-400'
      )}
    >
      {type}
    </span>
  );
}

function HealthBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-900/40 text-emerald-400' :
    score >= 50 ? 'bg-amber-900/40 text-amber-400' :
    'bg-rose-900/40 text-rose-400';
  return (
    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium', color)}>
      {score}
    </span>
  );
}

function ProjectDetail({
  project,
  onRunAffected
}: {
  project: AffectedProject;
  onRunAffected: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100">{project.name}</h3>
          <div className="text-xs text-slate-500 font-mono mt-0.5">{project.root}</div>
        </div>
        <button
          onClick={onRunAffected}
          className="btn text-xs flex items-center gap-1.5"
          aria-label="run affected"
        >
          <Play size={12} />
          Run Affected
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 bg-bg-elev text-slate-400 rounded"
          >
            {tag}
          </span>
        ))}
        {project.targets.map((target) => (
          <span
            key={target}
            className="text-[10px] px-1.5 py-0.5 bg-bg-elev text-pulse-cyan rounded"
          >
            {target}
          </span>
        ))}
      </div>

      <DependencySection title="Upstream" items={project.upstream} empty="No projects depend on this" />
      <DependencySection title="Downstream" items={project.downstream} empty="This project has no dependencies" />
    </div>
  );
}

function DependencySection({
  title,
  items,
  empty
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        {title} ({items.length})
      </h4>
      {items.length === 0 ? (
        <div className="text-xs text-slate-600">{empty}</div>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li
              key={item}
              className="text-xs text-slate-300 font-mono bg-bg-elev border border-bg-line rounded px-2 py-1"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
