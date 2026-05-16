import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Database as DbIcon, Table, ChevronRight, ChevronDown,
  Play, Loader2, AlertCircle, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { unwrap } from '@renderer/lib/ipc';
import type { DbExplorerDatabase, DbTableSchema, DbExplorerResult } from '@shared/types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString();
}

function truncatePath(p: string, max = 40): string {
  if (p.length <= max) return p;
  return '...' + p.slice(-(max - 3));
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function Spinner({ className }: { className?: string }) {
  return <Loader2 size={16} className={clsx('animate-spin text-slate-400', className)} />;
}

function Badge({
  children,
  variant = 'default'
}: {
  children: React.ReactNode;
  variant?: 'default' | 'warn' | 'success' | 'danger';
}) {
  const map = {
    default: 'bg-bg-panel text-slate-400 border-bg-line',
    warn: 'bg-status-warn/10 text-status-warn border-status-warn/30',
    success: 'bg-status-ok/10 text-status-ok border-status-ok/30',
    danger: 'bg-status-error/10 text-status-error border-status-error/30'
  };
  return (
    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase', map[variant])}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Panel                                                        */
/* ------------------------------------------------------------------ */

export function DbExplorer() {
  const [selectedDbPath, setSelectedDbPath] = useState<string | null>(null);
  const [sql, setSql] = useState('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const listQuery = useQuery<DbExplorerDatabase[]>({
    queryKey: ['dbExplorer', 'list'],
    queryFn: async () => unwrap(window.commandCenter.dbExplorer.list())
  });

  const schemaQuery = useQuery<DbTableSchema[]>({
    queryKey: ['dbExplorer', 'schema', selectedDbPath],
    queryFn: async () => {
      if (!selectedDbPath) return [];
      return unwrap(window.commandCenter.dbExplorer.schema(selectedDbPath));
    },
    enabled: !!selectedDbPath
  });

  const queryMutation = useMutation<DbExplorerResult, Error, { dbPath: string; sql: string }>({
    mutationFn: async ({ dbPath, sql: q }) => unwrap(window.commandCenter.dbExplorer.query(dbPath, q))
  });

  const selectedDb = useMemo(
    () => listQuery.data?.find((d) => d.path === selectedDbPath) ?? null,
    [listQuery.data, selectedDbPath]
  );

  const toggleTable = (name: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleTableClick = (name: string) => {
    setSql(`SELECT * FROM "${name}" LIMIT 100`);
  };

  const runQuery = () => {
    if (!selectedDbPath || !sql.trim()) return;
    queryMutation.mutate({ dbPath: selectedDbPath, sql: sql.trim() });
  };

  return (
    <div className="flex h-full gap-4">
      {/* ---------- Left: Database list ---------- */}
      <div className="w-[25%] flex flex-col gap-3 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Databases</h3>
          {listQuery.isFetching && <Spinner />}
        </div>

        {listQuery.isLoading && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Spinner /> Loading…
          </div>
        )}

        {listQuery.error && (
          <div className="text-status-error text-sm flex items-center gap-1">
            <AlertCircle size={14} />
            {listQuery.error instanceof Error ? listQuery.error.message : 'Failed to load databases'}
          </div>
        )}

        {!listQuery.isLoading && !listQuery.error && (listQuery.data?.length === 0) && (
          <div className="text-slate-500 text-sm">No databases found.</div>
        )}

        <div className="flex-1 overflow-auto space-y-2 pr-1">
          {listQuery.data?.map((db) => (
            <button
              key={db.path}
              onClick={() => setSelectedDbPath(db.path)}
              className={clsx(
                'w-full text-left rounded-lg border p-3 transition-colors',
                selectedDbPath === db.path
                  ? 'bg-pulse-cyan-900/20 border-pulse-cyan/40'
                  : 'bg-bg-elev border-bg-line hover:border-slate-600'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <DbIcon size={14} className="text-pulse-cyan shrink-0" />
                <span className="font-semibold text-slate-200 text-sm truncate">{db.name}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate mb-2" title={db.path}>
                {truncatePath(db.path)}
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge>{fmtBytes(db.sizeBytes)}</Badge>
                {db.walSizeBytes > 0 && <Badge variant="warn">WAL {fmtBytes(db.walSizeBytes)}</Badge>}
                <Badge variant="default">{fmtTime(db.lastModifiedAt)}</Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Center: Schema tree ---------- */}
      <div className="w-[35%] flex flex-col gap-3 min-w-0 border-l border-bg-line pl-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Schema</h3>
          {schemaQuery.isFetching && <Spinner />}
        </div>

        {!selectedDb && (
          <div className="text-slate-500 text-sm">Select a database to view its schema.</div>
        )}

        {selectedDb && schemaQuery.isLoading && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Spinner /> Loading schema…
          </div>
        )}

        {schemaQuery.error && (
          <div className="text-status-error text-sm flex items-center gap-1">
            <AlertCircle size={14} />
            {schemaQuery.error instanceof Error ? schemaQuery.error.message : 'Failed to load schema'}
          </div>
        )}

        {selectedDb && !schemaQuery.isLoading && !schemaQuery.error && (
          <div className="flex-1 overflow-auto space-y-1 pr-1">
            {schemaQuery.data?.map((table) => {
              const expanded = expandedTables.has(table.name);
              return (
                <div
                  key={table.name}
                  className="rounded border border-bg-line bg-bg-elev overflow-hidden"
                >
                  <button
                    onClick={() => toggleTable(table.name)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-panel/50 transition-colors"
                  >
                    {expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                    <Table size={14} className="text-pulse-cyan shrink-0" />
                    <span className="font-semibold text-slate-200 text-sm truncate">{table.name}</span>
                    <span className="ml-auto text-[10px] text-slate-500 font-mono">{table.rowCount.toLocaleString()} rows</span>
                  </button>

                  {expanded && (
                    <div className="px-3 pb-2">
                      <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Columns</div>
                      <div className="space-y-1">
                        {table.columns.map((col) => (
                          <button
                            key={col.name}
                            onClick={() => handleTableClick(table.name)}
                            className="w-full flex items-center justify-between text-left text-xs text-slate-400 hover:text-pulse-cyan transition-colors"
                            title={`Click to auto-fill query: SELECT * FROM "${table.name}" LIMIT 100`}
                          >
                            <span className="font-mono">{col.name}</span>
                            <span className="text-slate-500 font-mono">{col.type}{col.notNull ? ' NOT NULL' : ''}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-2">
                        <button
                          onClick={() => handleTableClick(table.name)}
                          className="text-[10px] text-pulse-cyan hover:underline"
                        >
                          SELECT * FROM "{table.name}" LIMIT 100
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {schemaQuery.data?.length === 0 && (
              <div className="text-slate-500 text-sm">No tables found.</div>
            )}
          </div>
        )}
      </div>

      {/* ---------- Right: Query + Results ---------- */}
      <div className="w-[40%] flex flex-col gap-3 min-w-0 border-l border-bg-line pl-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Query</h3>
          <Badge variant="success"><ShieldCheck size={10} className="inline mr-1" />Read-only</Badge>
        </div>

        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              runQuery();
            }
          }}
          placeholder={selectedDb ? 'Enter SELECT query…' : 'Select a database first'}
          disabled={!selectedDb}
          className={clsx(
            'w-full h-28 resize-none rounded-lg border bg-bg-panel p-3 text-xs font-mono text-slate-200',
            'focus:outline-none focus:border-pulse-cyan/60',
            !selectedDb && 'opacity-50 cursor-not-allowed'
          )}
          spellCheck={false}
        />

        <div className="flex items-center gap-2">
          <button
            onClick={runQuery}
            disabled={!selectedDb || !sql.trim() || queryMutation.isPending}
            className={clsx(
              'btn flex items-center gap-2 text-xs',
              (!selectedDb || !sql.trim() || queryMutation.isPending) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {queryMutation.isPending ? <Spinner /> : <Play size={12} />}
            Run Query
          </button>
          <span className="text-[10px] text-slate-500">Ctrl+Enter to run</span>
        </div>

        {queryMutation.error && (
          <div className="rounded-lg border border-status-error/30 bg-status-error/10 p-3 text-status-error text-sm flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {queryMutation.error instanceof Error ? queryMutation.error.message : 'Query failed'}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-auto min-h-0">
          {queryMutation.isIdle ? (
            <div className="text-slate-500 text-sm">Run a query to see results.</div>
          ) : queryMutation.isPending ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Spinner /> Executing…
            </div>
          ) : queryMutation.data ? (
            <div className="flex flex-col h-full gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Results</span>
                <Badge>{queryMutation.data.rowCount.toLocaleString()} rows</Badge>
                <Badge>{queryMutation.data.executionMs.toFixed(1)} ms</Badge>
                {queryMutation.data.truncated && (
                  <Badge variant="warn"><AlertTriangle size={10} className="inline mr-1" />Truncated to 1,000 rows</Badge>
                )}
              </div>

              <div className="overflow-auto rounded border border-bg-line">
                <table className="w-full text-xs">
                  <thead className="bg-bg-elev text-slate-400 uppercase tracking-wider sticky top-0">
                    <tr>
                      {queryMutation.data.columns.map((col) => (
                        <th key={col} className="text-left px-2 py-1.5 font-medium whitespace-nowrap border-b border-bg-line">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryMutation.data.rows.map((row, i) => (
                      <tr key={i} className="border-t border-bg-line hover:bg-bg-elev/40">
                        {row.map((cell, j) => (
                          <td key={j} className="px-2 py-1.5 text-slate-300 font-mono whitespace-nowrap max-w-[200px] truncate">
                            {cell === null ? (
                              <span className="text-slate-600 italic">NULL</span>
                            ) : typeof cell === 'object' ? (
                              JSON.stringify(cell)
                            ) : (
                              String(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
