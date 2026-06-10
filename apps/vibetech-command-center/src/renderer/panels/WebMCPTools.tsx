import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Play, Wrench } from 'lucide-react';
import clsx from 'clsx';
import { Panel } from '@renderer/components/Panel';
import { unwrap } from '@renderer/lib/ipc';

/**
 * Verification surface for the WebMCP-over-IPC gateway.
 *
 * Both the tool list and the executions go through the MAIN process
 * (window.commandCenter.webmcp.*), not the local WebMCPManager - so a tool
 * listed or executed here proves the full renderer -> main -> renderer
 * round trip works.
 */
export function WebMCPTools() {
  const statusQuery = useQuery({
    queryKey: ['webmcp', 'status'],
    queryFn: async () => unwrap(window.commandCenter.webmcp.status()),
    refetchInterval: 10_000
  });
  const listQuery = useQuery({
    queryKey: ['webmcp', 'list'],
    queryFn: async () => unwrap(window.commandCenter.webmcp.list()),
    refetchInterval: 10_000
  });

  const tools = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const [selected, setSelected] = useState('');
  const [argsText, setArgsText] = useState('{}');
  const [parseError, setParseError] = useState<string | null>(null);

  const execute = useMutation({
    mutationFn: async (input: { name: string; args: Record<string, unknown> }) =>
      unwrap(window.commandCenter.webmcp.execute(input.name, input.args))
  });

  const selectedTool = tools.find((t) => t.name === selected) ?? null;
  const status = statusQuery.data;

  const handleRun = () => {
    if (!selectedTool) return;
    setParseError(null);
    let parsed: Record<string, unknown>;
    try {
      const raw: unknown = JSON.parse(argsText.trim() === '' ? '{}' : argsText);
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error('args must be a JSON object');
      }
      parsed = raw as Record<string, unknown>;
    } catch (e) {
      setParseError(e instanceof Error ? e.message : String(e));
      return;
    }
    execute.mutate({ name: selectedTool.name, args: parsed });
  };

  return (
    <Panel
      title={`WebMCP UI Tools (${tools.length} bridged via main)`}
      loading={listQuery.isFetching}
      onRefresh={() => { void listQuery.refetch(); void statusQuery.refetch(); }}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs">
          <span className={clsx('w-2 h-2 rounded-full', status?.connected ? 'bg-status-ok' : 'bg-status-error')} />
          <span className="text-slate-400">
            gateway {status?.connected ? 'connected' : 'disconnected'}
            {status?.lastSyncAt !== null && status?.lastSyncAt !== undefined && (
              <> - last sync {new Date(status.lastSyncAt).toLocaleTimeString('en-US', { hour12: false })}</>
            )}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {tools.map((t) => (
            <button
              key={t.name}
              onClick={() => { setSelected(t.name === selected ? '' : t.name); execute.reset(); }}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5',
                t.name === selected
                  ? 'bg-pulse-cyan-900 text-pulse-cyan border-pulse-cyan-700'
                  : 'bg-bg-panel text-slate-300 border-bg-line hover:bg-bg-elev'
              )}
              type="button"
            >
              <Wrench size={12} />{t.name}<span className="opacity-60">({t.type})</span>
            </button>
          ))}
          {tools.length === 0 && (
            <span className="text-slate-500 text-xs italic">no WebMCP tools bridged yet</span>
          )}
        </div>
        {selectedTool && (
          <div className="space-y-2 border border-bg-line rounded-lg p-3 bg-bg-elev">
            <div className="text-xs text-slate-400">{selectedTool.description}</div>
            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[10px] uppercase text-slate-500" htmlFor="webmcp-args">Args (JSON)</label>
                <textarea
                  id="webmcp-args"
                  value={argsText}
                  onChange={(e) => setArgsText(e.target.value)}
                  rows={2}
                  spellCheck={false}
                  className="bg-bg-panel border border-bg-line rounded px-2 py-1.5 text-sm font-mono text-slate-200 resize-y"
                />
              </div>
              <button onClick={handleRun} disabled={execute.isPending} className="btn btn-primary" type="button">
                <Play size={14} />{execute.isPending ? 'Executing...' : 'Execute via gateway'}
              </button>
            </div>
            {parseError && <div className="text-status-error text-xs font-mono">{parseError}</div>}
            {execute.isError && (
              <div className="text-status-error text-xs font-mono">{execute.error.message}</div>
            )}
            {execute.isSuccess && (
              <pre className="bg-bg-base border border-bg-line rounded p-2 text-xs font-mono text-status-ok overflow-auto max-h-32">
                {JSON.stringify(execute.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
