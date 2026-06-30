import type { GatewayData } from '../hooks/useGatewayData';
import { scoreTone, countTone } from '../lib/tone';
import { MetricCard } from './MetricCard';
import { StatusBadge } from './StatusBadge';

/** Overview: top-line telemetry metrics + a real alerts roll-up. Pure consumer of the hook data. */
export function Overview({ data }: { data: GatewayData }) {
  const { telemetry, workspace, databases, dDrive } = data;
  const apps = workspace?.packages.filter((p) => p.type === 'app').length ?? 0;
  const pkgs = workspace?.packages.filter((p) => p.type === 'package').length ?? 0;
  const lockedDbs = databases?.databases.filter((d) => d.hasLock).length ?? 0;
  const drifts = workspace?.drifts ?? [];
  const crashed = dDrive?.learningSystem.crashed ?? telemetry?.hasOOM ?? false;
  const clean = drifts.length === 0 && lockedDbs === 0 && !crashed;

  return (
    <section>
      <div className="grid">
        <MetricCard
          label="Health Score"
          value={telemetry ? `${telemetry.healthScore}%` : '—'}
          tone={telemetry ? scoreTone(telemetry.healthScore) : 'info'}
        />
        <MetricCard
          label="Mismatched Deps"
          value={telemetry?.mismatchedDeps ?? '—'}
          tone={countTone(telemetry?.mismatchedDeps ?? 0)}
          hint="lodash alignment"
        />
        <MetricCard
          label="Active WAL"
          value={telemetry?.activeLockfiles ?? '—'}
          tone={countTone(telemetry?.activeLockfiles ?? 0)}
          hint="databases with -wal"
        />
        <MetricCard label="Workspace" value={`${apps} / ${pkgs}`} hint="apps / packages" />
      </div>

      <div className="alerts">
        <h2>Alerts</h2>
        {clean ? (
          <StatusBadge tone="ok">No active issues — workspace aligned</StatusBadge>
        ) : (
          <ul className="loglist">
            {drifts.map((d) => (
              <li key={d.dependencyName}>
                <StatusBadge tone="warn">
                  {d.dependencyName} drift across {d.versions.length} version(s)
                </StatusBadge>
              </li>
            ))}
            {lockedDbs > 0 && (
              <li>
                <StatusBadge tone="warn">{lockedDbs} database(s) with active WAL</StatusBadge>
              </li>
            )}
            {crashed && (
              <li>
                <StatusBadge tone="danger">
                  Learning-system OOM/crash detected
                  {dDrive?.learningSystem.reason ? `: ${dDrive.learningSystem.reason}` : ''}
                </StatusBadge>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
