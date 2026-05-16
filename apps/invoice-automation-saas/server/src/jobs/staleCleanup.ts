import type Database from 'better-sqlite3'

/**
 * Unlocks jobs that have been running for longer than their timeout.
 * This prevents jobs from being permanently locked if the runner crashes.
 */
export function unlockStaleJobs(db: Database.Database): number {
  const now = new Date().toISOString()

  // Jobs that have exceeded their timeout (or default 5 min)
  const stmt = db.prepare(`
    UPDATE jobs
       SET status = 'pending',
           locked_until = NULL,
           locked_by = NULL,
           started_at = NULL,
           last_error = 'Job was unlocked due to timeout',
           updated_at = ?
     WHERE status = 'running'
       AND locked_until IS NOT NULL
       AND locked_until < ?
       AND (
         (timeout_ms IS NOT NULL AND started_at IS NOT NULL AND
          datetime(started_at, '+' || (timeout_ms / 1000) || ' seconds') < datetime('now'))
         OR
         (timeout_ms IS NULL AND started_at IS NOT NULL AND
          datetime(started_at, '+5 minutes') < datetime('now'))
       )
  `)

  const result = stmt.run(now, now)
  return result.changes
}
