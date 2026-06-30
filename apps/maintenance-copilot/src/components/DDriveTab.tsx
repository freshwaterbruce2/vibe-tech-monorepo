import type { DDriveHealth, DatabaseHealth } from '../lib/api';
import { countTone } from '../lib/tone';
import { MetricCard } from './MetricCard';
import { StatusBadge } from './StatusBadge';

interface Props {
  dDrive?: DDriveHealth;
  databases?: DatabaseHealth;
}

/** D:\ tab: disk + databases + the REAL learning-system reframe (no fabricated epoch/loss). */
export function DDriveTab({ dDrive, databases }: Props) {
  const ls = dDrive?.learningSystem;
  const dbs = databases?.databases ?? [];

  return (
    <section>
      <div className="grid">
        <MetricCard
          label="Free Space"
          value={dDrive?.freeSpace ?? '—'}
          hint={`of ${dDrive?.totalSize ?? '—'}`}
        />
        <MetricCard
          label="Drive Status"
          value={ls?.status ?? '—'}
          tone={ls?.crashed ? 'danger' : 'ok'}
        />
        <MetricCard
          label="Stale Files"
          value={ls?.staleFileCount ?? '—'}
          tone={countTone(ls?.staleFileCount ?? 0)}
          hint="≥30 days old"
        />
        <MetricCard
          label="Insights Available"
          value={ls?.insightsCount ?? '—'}
          hint="learning_insights.json"
        />
      </div>

      {ls?.crashed ? (
        <p className="alerts">
          <StatusBadge tone="danger">
            Learning-system OOM/crash{ls.reason ? `: ${ls.reason}` : ''}
          </StatusBadge>
        </p>
      ) : null}

      <h2>Databases</h2>
      {dbs.length === 0 ? (
        <StatusBadge tone="info">No databases found</StatusBadge>
      ) : (
        <ul className="loglist">
          {dbs.map((d) => (
            <li key={d.path}>
              <StatusBadge tone={d.status === 'OK' ? 'ok' : 'danger'}>{d.status}</StatusBadge>{' '}
              <code>{d.path}</code>{' '}
              <span className="muted">
                {d.size} · WAL {d.walStatus}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
