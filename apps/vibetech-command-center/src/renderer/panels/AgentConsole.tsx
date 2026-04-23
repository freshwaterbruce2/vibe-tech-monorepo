import { useState } from 'react';
import { Terminal, X, Activity, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { Panel, RelativeTime } from '@renderer/components/Panel';
import { unwrap } from '@renderer/lib/ipc';
import { useProcessList, useProcessOutput } from '@renderer/hooks';
import type { ProcessHandle, ProcessStatus } from '@shared/types';

export function AgentConsole() {
  const { data, isFetching, error, refetch } = useProcessList();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const processes = (data ?? []).slice().sort((a, b) => b.startedAt - a.startedAt);
  const selected = processes.find((p) => p.id === selectedId) ?? null;

  const handleKill = async (id: string): Promise<void> => {
    await unwrap(window.commandCenter.process.kill(id));
    await refetch();
  };

  return (
    <Panel
      title={`Processes (${processes.filter((p) => p.status === 'running').length} running, ${processes.length} total)`}
      loading={isFetching}
      error={error instanceof Error ? error.message : null}
      onRefresh={() => { void refetch(); }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-2 max-h-[60vh] overflow-auto">
          {processes.length === 0 ? (
            <div className="text-slate-500 text-sm italic p-3">
              no processes — run a backup or launch Claude to see activity here
            </div>
          ) : processes.map((p) => (
            <ProcessRow
              key={p.id}
              proc={p}
              selected={p.id === selectedId}
              onSelect={() => setSelectedId(p.id)}
              onKill={() => { void handleKill(p.id); }}
            />
          ))}
        </div>
        <div className="lg:col-span-3">
          {selected
            ? <ProcessOutput proc={selected} />
            : (
              <div className="text-slate-600 text-sm italic p-3 bg-bg-elev border border-bg-line rounded
                              h-full flex items-center justify-center">
                select a process to view its output
              </div>
            )
          }
        </div>
      </div>
    </Panel>
  );
}

function ProcessRow({ proc, selected, onSelect, onKill }: {
  proc: ProcessHandle;
  selected: boolean;
  onSelect: () => void;
  onKill: () => void;
}) {
  const cmdShort = proc.command.split(/[\\/]/).pop() ?? proc.command;
  const argsShort = proc.args.slice(0, 2).join(' ') + (proc.args.length > 2 ? '...' : '');

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer p-3 rounded border transition-colors ${
        selected
          ? 'border-pulse-cyan-700 bg-pulse-cyan-900/30'
          : 'border-bg-line bg-bg-elev hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon status={proc.status} />
            <span className="font-mono text-xs font-semibold text-slate-200 truncate">{cmdShort}</span>
            {proc.exitCode !== null && (
              <span className={`text-[10px] px-1 py-0.5 rounded font-mono ${
                proc.exitCode === 0 ? 'text-status-ok' : 'text-status-error'
              }`}>
                exit {proc.exitCode}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 font-mono truncate" title={proc.args.join(' ')}>
            {argsShort || '(no args)'}
          </div>
          <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-2">
            <RelativeTime ts={proc.startedAt} />
            {proc.pid && <span>pid {proc.pid}</span>}
          </div>
        </div>
        {proc.status === 'running' && (
          <button
            onClick={(e) => { e.stopPropagation(); onKill(); }}
            className="text-slate-500 hover:text-status-error shrink-0"
            title="kill"
            type="button"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: ProcessStatus }) {
  if (status === 'running') return <Activity size={12} className="text-pulse-cyan animate-pulse" />;
  if (status === 'exited')  return <CheckCircle2 size={12} className="text-status-ok" />;
  if (status === 'killed')  return <Ban size={12} className="text-status-warn" />;
  return <XCircle size={12} className="text-status-error" />;
}

function ProcessOutput({ proc }: { proc: ProcessHandle }) {
  const chunks = useProcessOutput(proc.id);

  return (
    <div className="bg-bg-base border border-bg-line rounded p-3 h-full max-h-[60vh] overflow-auto">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
        <Terminal size={12} />
        <span>{proc.id.slice(0, 8)} — {chunks.length} lines</span>
      </div>
      {chunks.length === 0 ? (
        <div className="text-slate-600 text-xs italic">
          {proc.status === 'running'
            ? 'waiting for output...'
            : 'no output captured (process may have ended before subscription)'}
        </div>
      ) : (
        <div className="font-mono text-xs space-y-0.5">
          {chunks.map((c, i) => (
            <div key={i} className={c.stream === 'stderr' ? 'text-status-error' : 'text-slate-300'}>
              <span className="text-slate-600">[{new Date(c.timestamp).toLocaleTimeString()}]</span> {c.data}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
