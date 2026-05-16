import type Database from 'better-sqlite3'

import { getHandler } from './handlers/index.js'

interface ClaimedJob {
  id: string
  type: string
  payload_json: string
  attempts: number
  max_attempts: number
}

export interface RunnerOptions {
  pollIntervalMs?: number
  batchSize?: number
  lockDurationMs?: number
  maxBackoffMs?: number
  logger?: (msg: string, meta?: unknown) => void
}

export interface TickResult {
  processed: number
  succeeded: number
  failed: number
  retried: number
}

const DEFAULTS = {
  pollIntervalMs: 10_000,
  batchSize: 5,
  lockDurationMs: 5 * 60 * 1000,
  maxBackoffMs: 60 * 60 * 1000,
}

const RUNNER_ID = `pid-${process.pid}`

const claimBatch = (
  db: Database.Database,
  batchSize: number,
  lockDurationMs: number,
): ClaimedJob[] => {
  const now = new Date().toISOString()
  const lockUntil = new Date(Date.now() + lockDurationMs).toISOString()
  const stmt = db.prepare(
    `UPDATE jobs
        SET locked_until = ?, locked_by = ?, status = 'running', updated_at = ?
      WHERE id IN (
        SELECT id FROM jobs
         WHERE status IN ('pending', 'running')
           AND next_run_at <= ?
           AND (locked_until IS NULL OR locked_until <= ?)
         ORDER BY next_run_at ASC
         LIMIT ?
      )
      RETURNING id, type, payload_json, attempts, max_attempts`,
  )
  return stmt.all(lockUntil, RUNNER_ID, now, now, now, batchSize) as ClaimedJob[]
}

const succeed = (db: Database.Database, jobId: string): void => {
  db.prepare(
    `UPDATE jobs SET status='done', updated_at=?, locked_until=NULL, locked_by=NULL WHERE id=?`,
  ).run(new Date().toISOString(), jobId)
}

const failOrRetry = (
  db: Database.Database,
  jobId: string,
  attempts: number,
  maxAttempts: number,
  errorMessage: string,
  maxBackoffMs: number,
): 'failed' | 'retried' => {
  const now = new Date().toISOString()
  if (attempts >= maxAttempts) {
    db.prepare(
      `UPDATE jobs
          SET status='failed', last_error=?, updated_at=?, locked_until=NULL, locked_by=NULL
        WHERE id=?`,
    ).run(errorMessage, now, jobId)
    return 'failed'
  }
  const backoffMs = Math.min(2 ** attempts * 60_000, maxBackoffMs)
  const nextRunAt = new Date(Date.now() + backoffMs).toISOString()
  db.prepare(
    `UPDATE jobs
        SET status='pending', last_error=?, next_run_at=?, updated_at=?, locked_until=NULL, locked_by=NULL
      WHERE id=?`,
  ).run(errorMessage, nextRunAt, now, jobId)
  return 'retried'
}

export const tick = async (
  db: Database.Database,
  opts: RunnerOptions = {},
): Promise<TickResult> => {
  const cfg = { ...DEFAULTS, ...opts }
  const claimed = claimBatch(db, cfg.batchSize, cfg.lockDurationMs)
  let succeeded = 0
  let failed = 0
  let retried = 0

  for (const row of claimed) {
    const newAttempts = row.attempts + 1

    db.prepare('UPDATE jobs SET attempts = ?, updated_at = ? WHERE id = ?').run(
      newAttempts,
      new Date().toISOString(),
      row.id,
    )

    const handler = getHandler(row.type)
    if (!handler) {
      const r = failOrRetry(
        db,
        row.id,
        newAttempts,
        row.max_attempts,
        `No handler registered for type "${row.type}"`,
        cfg.maxBackoffMs,
      )
      if (r === 'failed') failed++
      else retried++
      continue
    }

    let payload: unknown = null
    try {
      payload = JSON.parse(row.payload_json)
    } catch (e) {
      const r = failOrRetry(
        db,
        row.id,
        newAttempts,
        row.max_attempts,
        `payload_json parse error: ${(e as Error).message}`,
        cfg.maxBackoffMs,
      )
      if (r === 'failed') failed++
      else retried++
      continue
    }

    try {
      await handler(payload, { db, jobId: row.id })
      succeed(db, row.id)
      succeeded++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const r = failOrRetry(
        db,
        row.id,
        newAttempts,
        row.max_attempts,
        msg,
        cfg.maxBackoffMs,
      )
      if (r === 'failed') failed++
      else retried++
    }
  }

  return { processed: claimed.length, succeeded, failed, retried }
}

export interface JobRunner {
  stop: () => Promise<void>
}

export const startJobRunner = (
  db: Database.Database,
  opts: RunnerOptions = {},
): JobRunner => {
  const cfg = { ...DEFAULTS, ...opts }
  let running = false
  let stopped = false

  const runOnce = async (): Promise<void> => {
    if (running || stopped) return
    running = true
    try {
      await tick(db, cfg)
    } catch (err) {
      cfg.logger?.('[jobs] runner tick failed', err)
    } finally {
      running = false
    }
  }

  const interval = setInterval(() => {
    void runOnce()
  }, cfg.pollIntervalMs)

  void runOnce()

  return {
    stop: async () => {
      stopped = true
      clearInterval(interval)
      while (running) {
        await new Promise((resolve) => setTimeout(resolve, 25))
      }
    },
  }
}
