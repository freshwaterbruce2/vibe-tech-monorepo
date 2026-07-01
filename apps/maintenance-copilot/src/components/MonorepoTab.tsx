import type { WorkspaceHealth } from '../lib/api';
import { StatusBadge } from './StatusBadge';

interface Props {
  workspace?: WorkspaceHealth;
}

/**
 * Monorepo inspector: real apps/packages split + read-only cross-package
 * dependency-drift report. Drift is surfaced, not auto-fixed — aligning shared
 * versions across apps is a judgement call, not a safe one-click action.
 */
export function MonorepoTab({ workspace }: Props) {
  const packages = workspace?.packages ?? [];
  const apps = packages.filter((p) => p.type === 'app').length;
  const pkgs = packages.filter((p) => p.type === 'package').length;
  const drifts = workspace?.drifts ?? [];

  return (
    <section>
      <div className="topbar">
        <p className="muted">
          {apps} apps · {pkgs} packages · {drifts.length} dependencies drifting
        </p>
      </div>

      {drifts.length === 0 ? (
        <StatusBadge tone="ok">No dependency drift detected</StatusBadge>
      ) : (
        <ul className="loglist">
          {drifts.map((d) => (
            <li key={d.dependencyName}>
              <StatusBadge tone="warn">{d.dependencyName}</StatusBadge>:{' '}
              {d.versions.map((v) => `${v.version} (${v.packages.length})`).join(', ')}
            </li>
          ))}
        </ul>
      )}

      <details>
        <summary className="muted">{packages.length} workspace members</summary>
        <ul className="loglist">
          {packages.map((p) => (
            <li key={p.path}>
              <code>{p.name}</code>{' '}
              <span className="muted">
                {p.path} · {p.dependenciesCount} deps
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
