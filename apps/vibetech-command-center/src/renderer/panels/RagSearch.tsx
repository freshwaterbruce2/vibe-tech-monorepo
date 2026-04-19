import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { Search, FileCode, Loader2, ExternalLink } from 'lucide-react';
import { Panel } from '@renderer/components/Panel';
import { useRagSearch } from '@renderer/hooks';
import type { RagHit } from '@shared/types';

export function RagSearch() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mutation = useRagSearch();

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSubmitted(q);
    mutation.mutate({ query: q, topK: 12 });
  };

  const handleOpenPath = (path: string): void => {
    void window.commandCenter.process.spawn({
      command: 'explorer.exe',
      args: ['/select,', path],
      cwd: 'C:\\dev'
    });
  };

  const data = mutation.data;

  return (
    <Panel title="RAG Search">
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="semantic search across C:\dev  (Ctrl+K)"
            className="w-full bg-bg-elev border border-bg-line rounded pl-10 pr-24 py-2.5 text-sm
                       font-mono placeholder-slate-600 focus:outline-none focus:border-pulse-cyan-700
                       focus:shadow-glow-cyan"
          />
          <button
            type="submit"
            disabled={mutation.isPending || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-primary text-xs py-1"
          >
            {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Search'}
          </button>
        </div>
      </form>

      {mutation.isError && (
        <div className="text-status-error text-sm font-mono mb-3">
          {mutation.error.message}
        </div>
      )}

      {data && (
        <div className="mb-3 flex items-center gap-3 text-xs text-slate-500 font-mono">
          <span>{data.hits.length} hits</span>
          <span>•</span>
          <span>{data.latencyMs}ms</span>
          <span>•</span>
          <span className={data.source === 'mcp-rag-server' ? 'text-status-ok' : 'text-status-warn'}>
            {data.source}
          </span>
          {data.error && <span className="text-status-error">{'— ' + data.error}</span>}
        </div>
      )}

      {data?.hits && data.hits.length > 0 && (
        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {data.hits.map((hit, i) => <HitCard key={`${hit.path}-${i}`} hit={hit} onOpen={handleOpenPath} />)}
        </div>
      )}

      {!mutation.isPending && !data && !submitted && (
        <div className="text-slate-600 text-sm italic">
          Query the local RAG index for code, docs, anything in the monorepo.
        </div>
      )}

      {data && data.hits.length === 0 && !mutation.isPending && (
        <div className="text-slate-500 text-sm">{`no hits for "${submitted}"`}</div>
      )}
    </Panel>
  );
}

function HitCard({ hit, onOpen }: { hit: RagHit; onOpen: (path: string) => void }) {
  const fileName = hit.path.split(/[\\/]/).pop() ?? hit.path;
  const parentPath = hit.path.slice(0, hit.path.length - fileName.length);

  return (
    <div className="bg-bg-elev border border-bg-line rounded p-3 hover:border-pulse-cyan-700 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode size={14} className="text-pulse-cyan shrink-0" />
          <span className="font-mono text-sm font-semibold text-slate-100 truncate">{fileName}</span>
          {hit.language && (
            <span className="text-[10px] px-1.5 py-0.5 bg-pulse-cyan-900 text-pulse-cyan-300 rounded">
              {hit.language}
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 bg-bg-panel text-slate-400 rounded font-mono">
            {hit.score.toFixed(3)}
          </span>
        </div>
        <button
          onClick={() => onOpen(hit.path)}
          className="text-slate-500 hover:text-pulse-cyan shrink-0"
          title="open in Explorer"
          type="button"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      <div className="text-xs text-slate-500 font-mono mb-2 truncate" title={hit.path}>
        {parentPath}
        {hit.startLine !== null && (
          <span className="text-pulse-cyan-400">:{hit.startLine}{hit.endLine ? `-${hit.endLine}` : ''}</span>
        )}
      </div>

      <pre className="text-xs font-mono text-slate-300 bg-bg-base border border-bg-line rounded p-2
                      overflow-x-auto whitespace-pre-wrap max-h-32">
        {hit.snippet}
      </pre>
    </div>
  );
}
