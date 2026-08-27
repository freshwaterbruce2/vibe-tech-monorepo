import type { GitReport } from '../lib/api';
import { StatusBadge } from './StatusBadge';

/** Git tab: real branch / dirty state / recent commits, degrading to "unavailable" off a repo. */
export function GitTab({ git }: { git?: GitReport }) {
  if (!git || git.branch === 'unknown') {
    return <StatusBadge tone="info">Git unavailable</StatusBadge>;
  }
  return (
    <section>
      <div className="topbar">
        <p>
          <strong>{git.branch}</strong>{' '}
          <StatusBadge tone={git.isDirty ? 'warn' : 'ok'}>
            {git.isDirty ? 'uncommitted changes' : 'clean working tree'}
          </StatusBadge>
        </p>
      </div>
      <h2>Recent Commits</h2>
      <ul className="loglist">
        {git.recentCommits.map((c) => (
          <li key={c.hash}>
            <code>{c.hash}</code> {c.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
