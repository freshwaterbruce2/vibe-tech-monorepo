import type { ReactNode } from 'react';
import clsx from 'clsx';
import { RefreshCw } from 'lucide-react';
import { useCurrentTime } from '@renderer/hooks';

export interface PanelProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  className?: string;
}

export function Panel({ title, children, actions, loading, error, onRefresh, className }: PanelProps) {
  return (
    <section className={clsx('panel mb-6', className)}>
      <header className="panel-header">
        <h2 className="panel-title">{title}</h2>
        <div className="flex items-center gap-2">
          {actions}
          {onRefresh && (
            <button onClick={onRefresh} className="btn text-xs" aria-label="refresh">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}
        </div>
      </header>
      <div className="p-4">
        {error ? (
          <div className="text-status-error text-sm font-mono">{error}</div>
        ) : children}
      </div>
    </section>
  );
}

export function StatusDot({ ok }: { ok: boolean | 'warn' }) {
  const color = ok === true ? 'bg-status-ok' : ok === 'warn' ? 'bg-status-warn' : 'bg-status-error';
  return <span className={clsx('status-dot', color)} />;
}

export function Bytes({ n }: { n: number }) {
  const mb = n / 1024 / 1024;
  const gb = mb / 1024;
  const text = gb >= 1 ? `${gb.toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
  return <span className="font-mono">{text}</span>;
}

export function RelativeTime({ ts }: { ts: number }) {
  const now = useCurrentTime(1000);
  const diff = now - ts;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const text =
    day > 0 ? `${day}d ago` :
    hr > 0 ? `${hr}h ago` :
    min > 0 ? `${min}m ago` :
    `${sec}s ago`;
  return <span className="text-slate-500 font-mono text-xs">{text}</span>;
}
