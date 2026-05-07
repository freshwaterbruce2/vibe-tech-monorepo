import type Database from 'better-sqlite3'

export interface EnqueueOptions {
  type: string
  payload?: unknown
  runAt?: Date
  maxAttempts?: number
}

export const enqueueJob = (
  db: Database.Database,
  opts: EnqueueOptions,
): { id: string } => {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const runAt = (opts.runAt ?? new Date()).toISOString()
  const maxAttempts = opts.maxAttempts ?? 5

  db.prepare(
    `INSERT INTO jobs
       (id, type, payload_json, next_run_at, max_attempts, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
  ).run(
    id,
    opts.type,
    JSON.stringify(opts.payload ?? null),
    runAt,
    maxAttempts,
    now,
    now,
  )

  return { id }
}
