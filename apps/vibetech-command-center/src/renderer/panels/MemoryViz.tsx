import { useState, useMemo, useCallback } from 'react';
import clsx from 'clsx';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Brain, Search, RefreshCw, Loader2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { unwrap } from '@renderer/lib/ipc';
import { useCurrentTime } from '@renderer/hooks';
import type { MemorySnapshot, MemorySearchResultItem, EpisodicMemoryItem, SemanticMemoryItem, ProceduralMemoryItem, DecayScoreItem, ConsolidationResult } from './memory-types';

type TabId = 'overview' | 'episodic' | 'semantic' | 'procedural' | 'decay';
type SemanticSort = 'importance' | 'lastAccessed' | 'accessCount';
type ProceduralSort = 'frequency' | 'successRate';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'episodic', label: 'Episodic' },
  { id: 'semantic', label: 'Semantic' },
  { id: 'procedural', label: 'Procedural' },
  { id: 'decay', label: 'Decay' },
];

export function MemoryViz() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [consolidateMsg, setConsolidateMsg] = useState<string | null>(null);

  const snapshotQuery = useQuery<MemorySnapshot>({
    queryKey: ['memory', 'snapshot'],
    queryFn: async () => unwrap(window.commandCenter.memory.snapshot()) as unknown as MemorySnapshot,
    refetchInterval: 30_000
  });

  const searchMutation = useMutation<{ results: MemorySearchResultItem[] }, Error, { query: string; topK: number }>({
    mutationFn: async ({ query, topK }) => ({ results: (await unwrap(window.commandCenter.memory.search(query, topK))) as unknown as MemorySearchResultItem[] })
  });

  const decayQuery = useQuery<{ scores: DecayScoreItem[] }>({
    queryKey: ['memory', 'decay'],
    queryFn: async () => ({ scores: (await unwrap(window.commandCenter.memory.decay())) as unknown as DecayScoreItem[] }),
    enabled: false
  });

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'decay') void decayQuery.refetch();
  }, [decayQuery]);

  const handleRefresh = useCallback(() => { void snapshotQuery.refetch(); }, [snapshotQuery]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchMutation.mutate({ query: searchQuery.trim(), topK: 20 });
      setSearchOpen(true);
    }
  }, [searchQuery, searchMutation]);

  const handleConsolidate = useCallback(() => {
    void (async () => {
      try {
        const result = await unwrap(window.commandCenter.memory.consolidate()) as unknown as ConsolidationResult;
        setConsolidateMsg(result.message);
        void snapshotQuery.refetch();
        setTimeout(() => setConsolidateMsg(null), 5000);
      } catch (e) {
        setConsolidateMsg(e instanceof Error ? e.message : 'Preview failed');
        setTimeout(() => setConsolidateMsg(null), 5000);
      }
    })();
  }, [snapshotQuery]);

  const { data, isLoading, isFetching, error } = snapshotQuery;

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3">
          <Brain size={20} className="text-pulse-cyan" />
          <h2 className="text-lg font-semibold text-slate-100">Memory Viz</h2>
          {isFetching && <Loader2 size={16} className="text-pulse-cyan animate-spin" />}
        </div>
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="w-64 bg-bg-elev border border-bg-line rounded pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pulse-cyan"
            />
          </form>
          <button onClick={handleRefresh} className="btn text-xs flex items-center gap-1.5" aria-label="refresh">
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {consolidateMsg && (
        <div className="mb-3 text-sm text-pulse-cyan bg-pulse-cyan-900/20 border border-pulse-cyan/30 rounded px-3 py-2">
          {consolidateMsg}
        </div>
      )}

      {searchOpen && (
        <SearchModal
          result={searchMutation.data}
          loading={searchMutation.isPending}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <div className="flex border-b border-bg-line mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id ? 'text-pulse-cyan border-pulse-cyan' : 'text-slate-400 border-transparent hover:text-slate-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="flex items-center gap-2 text-status-error text-sm">
          <AlertTriangle size={16} />
          {error instanceof Error ? error.message : 'Failed to load memory snapshot'}
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 size={16} className="animate-spin" />
          Loading memory snapshot...
        </div>
      ) : !data ? (
        <div className="text-slate-500 text-sm">No memory data available.</div>
      ) : (
        <div className="flex-1 overflow-auto">
          {activeTab === 'overview' && <OverviewTab data={data} onConsolidate={handleConsolidate} />}
          {activeTab === 'episodic' && <EpisodicTab memories={data.recentEpisodic} />}
          {activeTab === 'semantic' && <SemanticTab memories={data.recentSemantic} />}
          {activeTab === 'procedural' && <ProceduralTab memories={data.recentProcedural} />}
          {activeTab === 'decay' && <DecayTab query={decayQuery} />}
        </div>
      )}
    </div>
  );
}

function SearchModal({ result, loading, onClose }: { result?: { results: MemorySearchResultItem[] }; loading: boolean; onClose: () => void }) {
  return (
    <div className="mb-3 bg-bg-elev border border-bg-line rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-200">Search Results</span>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-200">Close</button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 size={14} className="animate-spin" /> Searching...
        </div>
      ) : !result || result.results.length === 0 ? (
        <div className="text-slate-500 text-sm">No results found.</div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-auto">
          {result.results.map((r, i) => (
            <div key={i} className="text-sm border border-bg-line rounded p-2 bg-bg-panel">
              <div className="flex items-center gap-2 mb-1">
                <StoreBadge source={r.source} />
                <span className="text-xs text-slate-500 font-mono">{(r.score * 100).toFixed(0)}%</span>
              </div>
              <div className="text-slate-300 text-xs line-clamp-3">{r.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OverviewTab({ data, onConsolidate }: { data: MemorySnapshot; onConsolidate: () => void }) {
  const stats = Object.fromEntries(data.stats.map((s) => [s.store, s]));
  const lastRun = data.consolidationStatus.lastRunAt;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Episodic" count={stats['episodic']?.recordCount ?? 0} />
        <StatCard title="Semantic" count={stats['semantic']?.recordCount ?? 0} dim={stats['semantic']?.avgEmbeddingDim} />
        <StatCard title="Procedural" count={stats['procedural']?.recordCount ?? 0} />
      </div>
      <div className="bg-bg-elev border border-bg-line rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-200">Consolidation Preview</div>
            <div className="text-xs text-slate-400 mt-1">
              Last run: {lastRun ? <RelTime ts={lastRun} /> : 'Never run'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Summarized: {data.consolidationStatus.itemsSummarized} | Pruned: {data.consolidationStatus.itemsPruned}
            </div>
          </div>
          <button onClick={onConsolidate} className="btn text-xs">Preview Decay/Consolidation</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, count, dim }: { title: string; count: number; dim?: number }) {
  return (
    <div className="bg-bg-elev border border-bg-line rounded-lg p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">{title}</div>
      <div className="text-2xl font-bold text-slate-100">{count.toLocaleString()}</div>
      {dim !== undefined && dim > 0 && <div className="text-xs text-slate-500 mt-1">{dim}d embeddings</div>}
    </div>
  );
}

function EpisodicTab({ memories }: { memories: EpisodicMemoryItem[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const toggleExpanded = useCallback((id: number) => {
    setExpanded((prev) => (prev === id ? null : id));
  }, []);
  if (memories.length === 0) return <EmptyState />;

  return (
    <div className="space-y-2">
      {memories.map((m) => (
        <div key={m.id} className="bg-bg-elev border border-bg-line rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 bg-bg-panel text-slate-400 rounded font-medium">{m.sourceId}</span>
            <RelTime ts={m.timestamp} />
          </div>
          <div className="text-xs text-slate-500 font-mono mb-1">{m.sessionId ?? '—'}</div>
          <div className="text-sm text-slate-300 line-clamp-2">{m.query}</div>
          {expanded === m.id && <div className="text-sm text-slate-400 mt-2 border-t border-bg-line pt-2">{m.response}</div>}
          <button
            onClick={() => toggleExpanded(m.id)}
            className="mt-1 flex items-center gap-1 text-xs text-pulse-cyan hover:underline"
          >
            {expanded === m.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded === m.id ? 'Collapse' : 'Expand'}
          </button>
        </div>
      ))}
    </div>
  );
}

function SemanticTab({ memories }: { memories: SemanticMemoryItem[] }) {
  const [sort, setSort] = useState<SemanticSort>('importance');
  const [page, setPage] = useState(0);
  const PAGE = 25;

  const handleSort = useCallback((k: SemanticSort) => { setSort(k); setPage(0); }, []);
  const handlePrev = useCallback(() => setPage((p) => p - 1), []);
  const handleNext = useCallback(() => setPage((p) => p + 1), []);

  const sorted = useMemo(() => {
    const arr = [...memories];
    if (sort === 'importance') arr.sort((a, b) => b.importance - a.importance);
    else if (sort === 'lastAccessed') arr.sort((a, b) => (b.lastAccessed ?? b.created) - (a.lastAccessed ?? a.created));
    else if (sort === 'accessCount') arr.sort((a, b) => b.accessCount - a.accessCount);
    return arr;
  }, [memories, sort]);

  const paged = sorted.slice(page * PAGE, (page + 1) * PAGE);
  const totalPages = Math.ceil(sorted.length / PAGE);

  if (memories.length === 0) return <EmptyState />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {(['importance', 'lastAccessed', 'accessCount'] as SemanticSort[]).map((k) => (
          <button
            key={k}
            onClick={() => handleSort(k)}
            className={clsx(
              'px-2 py-1 text-[11px] rounded border',
              sort === k ? 'bg-pulse-cyan-900 text-pulse-cyan border-pulse-cyan' : 'bg-bg-elev text-slate-400 border-bg-line hover:text-slate-200'
            )}
          >
            {k === 'lastAccessed' ? 'Last Accessed' : k === 'accessCount' ? 'Access Count' : 'Importance'}
          </button>
        ))}
        <span className="text-xs text-slate-500 ml-auto">{memories.length} total</span>
      </div>
      <div className="space-y-2">
        {paged.map((m) => (
          <div key={m.id} className="bg-bg-elev border border-bg-line rounded-lg p-3">
            <div className="text-sm text-slate-200 line-clamp-2">{m.text}</div>
            <div className="flex items-center gap-3 mt-2">
              {m.category && <span className="text-[10px] px-1.5 py-0.5 bg-bg-panel text-slate-400 rounded">{m.category}</span>}
              <ImportanceBar value={m.importance / 10} />
              <span className="text-xs text-slate-500">{m.accessCount} accesses</span>
              {m.lastAccessed && <RelTime ts={m.lastAccessed} />}
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-3">
          <button disabled={page === 0} onClick={handlePrev} className="btn text-xs disabled:opacity-30">Prev</button>
          <span className="text-xs text-slate-400">{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={handleNext} className="btn text-xs disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
}

function ProceduralTab({ memories }: { memories: ProceduralMemoryItem[] }) {
  const [sort, setSort] = useState<ProceduralSort>('frequency');

  const sorted = useMemo(() => {
    const arr = [...memories];
    if (sort === 'frequency') arr.sort((a, b) => b.frequency - a.frequency);
    else arr.sort((a, b) => b.successRate - a.successRate);
    return arr;
  }, [memories, sort]);

  if (memories.length === 0) return <EmptyState />;

  return (
    <div className="border border-bg-line rounded bg-bg-panel overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-bg-elev text-slate-400 text-xs uppercase sticky top-0">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Pattern</th>
            <th className="text-left px-3 py-2 font-medium">Context</th>
            <th className="text-left px-3 py-2 font-medium cursor-pointer hover:text-slate-200" onClick={() => setSort('frequency')}>Frequency {sort === 'frequency' && '↓'}</th>
            <th className="text-left px-3 py-2 font-medium cursor-pointer hover:text-slate-200" onClick={() => setSort('successRate')}>Success {sort === 'successRate' && '↓'}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <tr key={m.id} className="border-t border-bg-line">
              <td className="px-3 py-2 text-slate-200 font-medium">{m.pattern}</td>
              <td className="px-3 py-2 text-slate-400 text-xs">{m.context}</td>
              <td className="px-3 py-2 text-slate-300 font-mono">{m.frequency}</td>
              <td className="px-3 py-2"><SuccessBadge rate={m.successRate} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DecayTab({ query }: { query: ReturnType<typeof useQuery<{ scores: DecayScoreItem[] }>> }) {
  const { data, isFetching } = query;
  const scores = data?.scores ?? [];

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Keep (&ge;0.5)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Summarize (0.2-0.5)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Prune (&lt;0.2)</span>
        {isFetching && <Loader2 size={12} className="animate-spin text-pulse-cyan ml-auto" />}
      </div>
      {scores.length === 0 ? <EmptyState /> : (
        <div className="space-y-1">
          {scores.map((s) => (
            <DecayBar key={s.memoryId} score={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function DecayBar({ score }: { score: DecayScoreItem }) {
  const color = score.decayScore >= 0.5 ? 'bg-emerald-500' : score.decayScore >= 0.2 ? 'bg-amber-500' : 'bg-rose-500';
  return <div className="flex items-center gap-3 text-xs"><div className="w-48 truncate text-slate-400" title={score.textPreview}>{score.textPreview}</div><div className="flex-1 bg-bg-elev rounded h-3 overflow-hidden"><div className={clsx('h-full transition-all', color)} style={{ width: `${Math.min(score.decayScore * 100, 100)}%` }} /></div><div className="w-12 text-right text-slate-500 font-mono">{score.decayScore.toFixed(2)}</div></div>;
}

function ImportanceBar({ value }: { value: number }) {
  const c = Math.max(0, Math.min(1, value));
  const color = c >= 0.7 ? 'bg-emerald-500' : c >= 0.4 ? 'bg-amber-500' : 'bg-rose-500';
  return <div className="flex items-center gap-1.5"><div className="w-16 bg-bg-panel rounded h-1.5 overflow-hidden"><div className={clsx('h-full', color)} style={{ width: `${c * 100}%` }} /></div><span className="text-[10px] text-slate-500">{(c * 100).toFixed(0)}%</span></div>;
}
function SuccessBadge({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const color = pct >= 80 ? 'bg-emerald-900/40 text-emerald-400' : pct >= 50 ? 'bg-amber-900/40 text-amber-400' : 'bg-rose-900/40 text-rose-400';
  return <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium', color)}>{pct}%</span>;
}
function StoreBadge({ source }: { source: string }) {
  const color = source === 'episodic' ? 'bg-sky-900/40 text-sky-400' : source === 'semantic' ? 'bg-violet-900/40 text-violet-400' : 'bg-emerald-900/40 text-emerald-400';
  return <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium uppercase', color)}>{source}</span>;
}

function EmptyState() { return <div className="text-slate-500 text-sm py-8 text-center">No data in this store.</div>; }
function RelTime({ ts }: { ts: number }) {
  const now = useCurrentTime(30_000);
  const diff = now - ts, sec = Math.floor(diff / 1000), min = Math.floor(sec / 60), hr = Math.floor(min / 60), day = Math.floor(hr / 24);
  const text = day > 0 ? `${day}d ago` : hr > 0 ? `${hr}h ago` : min > 0 ? `${min}m ago` : `${sec}s ago`;
  return <span className="text-slate-500 font-mono text-xs">{text}</span>;
}
