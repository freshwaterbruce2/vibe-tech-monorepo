import type { ReactNode } from 'react';
import clsx from 'clsx';
import { AlertTriangle, Database as DbIcon } from 'lucide-react';
import { Panel, Bytes, RelativeTime } from '@renderer/components/Panel';
import { useDbMetrics } from '@renderer/hooks';
import type { DbMetric } from '@shared/types';

const WAL_ALERT_MB = 100;
const SIZE_ALERT_MB = 500;

export function DbHealth() {
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

function DbRow({ db }: { db: DbMetric }) {
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

function Metric({ label, value, alert }: { label: string; value: ReactNode; alert?: string }) {
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
