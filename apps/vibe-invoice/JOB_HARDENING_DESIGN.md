# Job System Hardening — Implementation Design

**Date**: 2026-05-13  
**Status**: DESIGN COMPLETE — Ready for Implementation  
**Context**: Single-tenant invoice SaaS with in-process job runner using better-sqlite3

---

## Executive Summary

This document provides concrete implementation plans for hardening the job system across three critical areas:

1. **Dead-Letter Queue (DLQ)** — Capture permanently failed jobs for manual inspection and retry
2. **Execution Timeouts** — Prevent runaway jobs from blocking the system
3. **Recurring Invoice Idempotency** — Ensure duplicate recurring jobs don't create duplicate invoices on retry

Each section includes exact schema changes, code modifications, configuration additions, migration strategy, and testing approach.

---

## 1. Dead-Letter Queue (DLQ)

### Problem Statement

Currently, jobs that exceed `max_attempts` are marked `status='failed'` and left in the `jobs` table with only `last_error` recorded. There is no UI or tooling to:
- View all failed jobs
- Inspect failure details
- Manually retry after fixing root cause
- Archive old failures to prevent table bloat

### Design

#### Schema Changes

**New table**: `jobs_dlq` (dead-letter queue)

```sql
-- Migration: 0013_jobs_dlq.sql
CREATE TABLE IF NOT EXISTS jobs_dlq (
  id TEXT PRIMARY KEY,                    -- original job.id
  original_job_id TEXT NOT NULL,          -- duplicate for clarity
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  last_error TEXT NOT NULL,
  failed_at TEXT NOT NULL,                -- when it was moved to DLQ
  retry_count INTEGER NOT NULL DEFAULT 0, -- how many times manually retried
  last_retry_at TEXT,                     -- timestamp of last manual retry
  resolution_status TEXT NOT NULL DEFAULT 'unresolved', -- 'unresolved' | 'retried' | 'archived'
  resolution_notes TEXT,                  -- admin notes about the failure
  created_at TEXT NOT NULL,               -- original job creation time
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_dlq_type ON jobs_dlq(type);
CREATE INDEX IF NOT EXISTS idx_jobs_dlq_failed_at ON jobs_dlq(failed_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_dlq_resolution_status ON jobs_dlq(resolution_status);
```

**Modify existing**: `jobs` table cleanup

No schema change, but add a periodic cleanup job to remove old `status='done'` rows (keep DLQ + failed only).

#### Code Changes

**File**: `server/src/jobs/runner.ts`

Modify `failOrRetry()` to move permanently failed jobs to DLQ:

```typescript
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
    // Move to DLQ instead of just marking failed
    const job = db.prepare(
      `SELECT id, type, payload_json, attempts, created_at
       FROM jobs WHERE id = ?`
    ).get(jobId) as ClaimedJob & { created_at: string } | undefined
    
    if (job) {
      db.transaction(() => {
        // Insert into DLQ
        db.prepare(
          `INSERT INTO jobs_dlq
             (id, original_job_id, type, payload_json, attempts, last_error,
              failed_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          job.id,
          job.id,
          job.type,
          job.payload_json,
          job.attempts,
          errorMessage,
          now,
          job.created_at,
          now
        )
        
        // Delete from jobs table
        db.prepare('DELETE FROM jobs WHERE id = ?').run(jobId)
      })()
    }
    
    return 'failed'
  }
  
  // Existing retry logic unchanged
  const backoffMs = Math.min(2 ** attempts * 60_000, maxBackoffMs)
  const nextRunAt = new Date(Date.now() + backoffMs).toISOString()
  db.prepare(
    `UPDATE jobs
        SET status='pending', last_error=?, next_run_at=?, updated_at=?, locked_until=NULL, locked_by=NULL
      WHERE id=?`,
  ).run(errorMessage, nextRunAt, now, jobId)
  return 'retried'
}
```

**New file**: `server/src/jobs/dlq.ts`

```typescript
import type Database from 'better-sqlite3'
import { enqueueJob } from './enqueue.js'

interface DlqJob {
  id: string
  type: string
  payload_json: string
  attempts: number
  last_error: string
  failed_at: string
  retry_count: number
  resolution_status: string
}

export const listDlqJobs = (
  db: Database.Database,
  opts?: { type?: string; limit?: number; offset?: number }
): { jobs: DlqJob[]; total: number } => {
  const { type, limit = 50, offset = 0 } = opts ?? {}
  
  let query = 'SELECT * FROM jobs_dlq'
  let countQuery = 'SELECT COUNT(*) as count FROM jobs_dlq'
  const params: unknown[] = []
  
  if (type) {
    query += ' WHERE type = ?'
    countQuery += ' WHERE type = ?'
    params.push(type)
  }
  
  query += ' ORDER BY failed_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)
  
  const jobs = db.prepare(query).all(...params) as DlqJob[]
  const { count } = db.prepare(countQuery).get(...params.slice(0, -2)) as { count: number }
  
  return { jobs, total: count }
}

export const retryDlqJob = (
  db: Database.Database,
  dlqJobId: string,
  notes?: string
): { newJobId: string } => {
  const dlqJob = db.prepare(
    'SELECT * FROM jobs_dlq WHERE id = ?'
  ).get(dlqJobId) as DlqJob | undefined
  
  if (!dlqJob) {
    throw new Error(`DLQ job ${dlqJobId} not found`)
  }
  
  const now = new Date().toISOString()
  
  return db.transaction(() => {
    // Enqueue a new job with the same payload
    const { id: newJobId } = enqueueJob(db, {
      type: dlqJob.type,
      payload: JSON.parse(dlqJob.payload_json),
    })
    
    // Update DLQ record
    db.prepare(
      `UPDATE jobs_dlq
          SET retry_count = retry_count + 1,
              last_retry_at = ?,
              resolution_status = 'retried',
              resolution_notes = ?,
              updated_at = ?
        WHERE id = ?`
    ).run(now, notes ?? `Manually retried as job ${newJobId}`, now, dlqJobId)
    
    return { newJobId }
  })()
}

export const archiveDlqJob = (
  db: Database.Database,
  dlqJobId: string,
  notes: string
): void => {
  db.prepare(
    `UPDATE jobs_dlq
        SET resolution_status = 'archived',
            resolution_notes = ?,
            updated_at = ?
      WHERE id = ?`
  ).run(notes, new Date().toISOString(), dlqJobId)
}

export const deleteDlqJob = (
  db: Database.Database,
  dlqJobId: string
): void => {
  db.prepare('DELETE FROM jobs_dlq WHERE id = ?').run(dlqJobId)
}
```

**New file**: `server/src/routes/dlqRoutes.ts`

```typescript
import type { FastifyInstance } from 'fastify'
import { listDlqJobs, retryDlqJob, archiveDlqJob, deleteDlqJob } from '../jobs/dlq.js'
import { requireAuth } from '../auth.js'

export const registerDlqRoutes = (app: FastifyInstance) => {
  // List failed jobs
  app.get('/api/dlq', { preHandler: requireAuth }, async (req) => {
    const { type, limit, offset } = req.query as { type?: string; limit?: string; offset?: string }
    return listDlqJobs(req.db, {
      type,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    })
  })
  
  // Retry a failed job
  app.post('/api/dlq/:id/retry', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string }
    const { notes } = req.body as { notes?: string }
    return retryDlqJob(req.db, id, notes)
  })
  
  // Archive a failed job (mark as resolved without retry)
  app.patch('/api/dlq/:id/archive', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string }
    const { notes } = req.body as { notes: string }
    archiveDlqJob(req.db, id, notes)
    return { ok: true }
  })
  
  // Delete a failed job permanently
  app.delete('/api/dlq/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string }
    deleteDlqJob(req.db, id)
    return { ok: true }
  })
}
```

Register in `server/src/index.ts`:

```typescript
import { registerDlqRoutes } from './routes/dlqRoutes.js'
// ... in the boot sequence after other route registrations:
registerDlqRoutes(app)
```

**New cron job**: Cleanup old completed jobs

```typescript
// server/src/jobs/cleanup.ts
import { openDb } from '../db.js'
import { registerCronSchedule } from './cron.js'

registerCronSchedule({
  name: 'jobs-cleanup',
  expression: '0 3 * * *', // Daily at 3am
  task: () => {
    const db = openDb()
    try {
      // Keep last 7 days of completed jobs
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const result = db.prepare(
        `DELETE FROM jobs WHERE status = 'done' AND updated_at < ?`
      ).run(cutoff)
      
      console.log(`[jobs-cleanup] Removed ${result.changes} old completed jobs`)
    } finally {
      db.close()
    }
  },
})
```

#### Configuration / Environment

No new environment variables required. DLQ behavior is automatic.

Optional future enhancement:
- `DLQ_RETENTION_DAYS` (default 90) — auto-archive DLQ jobs older than X days

#### Migration Strategy

1. Add migration `0013_jobs_dlq.sql` (see schema above)
2. Deploy new code with DLQ support
3. Existing `status='failed'` jobs remain in `jobs` table (manual cleanup if needed)
4. New failures automatically move to DLQ

**Rollback safety**: If migration is applied but code is not deployed, failed jobs will stay in `jobs` table with `status='failed'` (no data loss).

#### Testing Approach

**Unit tests** (`server/src/jobs/dlq.test.ts`):

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../migrations/index.js'
import { enqueueJob } from './enqueue.js'
import { tick } from './runner.js'
import { registerHandler } from './handlers/index.js'
import { listDlqJobs, retryDlqJob, archiveDlqJob } from './dlq.js'

describe('DLQ', () => {
  let db: Database.Database
  
  beforeEach(() => {
    db = new Database(':memory:')
    runMigrations(db, './server/src/migrations')
  })
  
  afterEach(() => db.close())
  
  it('moves failed job to DLQ after max attempts', async () => {
    registerHandler('test.fail', async () => {
      throw new Error('intentional')
    })
    
    const { id } = enqueueJob(db, {
      type: 'test.fail',
      payload: { x: 1 },
      maxAttempts: 2,
    })
    
    // Run twice to exhaust attempts
    await tick(db, { batchSize: 1 })
    await tick(db, { batchSize: 1 })
    
    // Job should be gone from jobs table
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id)
    expect(job).toBeUndefined()
    
    // Should be in DLQ
    const { jobs } = listDlqJobs(db)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].id).toBe(id)
    expect(jobs[0].type).toBe('test.fail')
    expect(jobs[0].last_error).toContain('intentional')
  })
  
  it('allows manual retry from DLQ', async () => {
    let callCount = 0
    registerHandler('test.retry', async () => {
      callCount++
      if (callCount === 1) throw new Error('first fail')
    })
    
    const { id } = enqueueJob(db, {
      type: 'test.retry',
      maxAttempts: 1,
    })
    
    await tick(db)
    
    const { jobs } = listDlqJobs(db)
    expect(jobs).toHaveLength(1)
    
    // Retry from DLQ
    const { newJobId } = retryDlqJob(db, jobs[0].id)
    expect(newJobId).toBeDefined()
    
    // Run the retried job
    await tick(db)
    
    // Should succeed
    expect(callCount).toBe(2)
    const retriedJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(newJobId)
    expect(retriedJob.status).toBe('done')
  })
})
```

**Integration test**: Check API routes return correct data

---

## 2. Execution Timeouts

### Problem Statement

Jobs can run indefinitely. A stuck job holds a lock and blocks other jobs from being processed. There is no mechanism to:
- Detect hung jobs
- Terminate runaway processes
- Release locks from dead workers

### Design

#### Schema Changes

**Add to `jobs` table**:

```sql
-- Migration: 0014_jobs_timeout.sql
ALTER TABLE jobs ADD COLUMN timeout_ms INTEGER;
ALTER TABLE jobs ADD COLUMN started_at TEXT;

CREATE INDEX IF NOT EXISTS idx_jobs_started_at ON jobs(started_at);
```

`timeout_ms`: Per-job timeout in milliseconds (NULL = no timeout, use default)  
`started_at`: When the job execution began (set in `tick()` before calling handler)

#### Code Changes

**File**: `server/src/jobs/enqueue.ts`

Add `timeout_ms` to `EnqueueOptions`:

```typescript
export interface EnqueueOptions {
  type: string
  payload?: unknown
  runAt?: Date
  maxAttempts?: number
  timeoutMs?: number  // NEW
}

export const enqueueJob = (
  db: Database.Database,
  opts: EnqueueOptions,
): { id: string } => {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const runAt = (opts.runAt ?? new Date()).toISOString()
  const maxAttempts = opts.maxAttempts ?? 5
  const timeoutMs = opts.timeoutMs ?? null  // NEW

  db.prepare(
    `INSERT INTO jobs
       (id, type, payload_json, next_run_at, max_attempts, timeout_ms, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(
    id,
    opts.type,
    JSON.stringify(opts.payload ?? null),
    runAt,
    maxAttempts,
    timeoutMs,  // NEW
    now,
    now,
  )

  return { id }
}
```

**File**: `server/src/jobs/runner.ts`

Update `ClaimedJob` interface and timeout logic:

```typescript
interface ClaimedJob {
  id: string
  type: string
  payload_json: string
  attempts: number
  max_attempts: number
  timeout_ms: number | null  // NEW
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export interface RunnerOptions {
  pollIntervalMs?: number
  batchSize?: number
  lockDurationMs?: number
  maxBackoffMs?: number
  defaultTimeoutMs?: number  // NEW
  logger?: (msg: string, meta?: unknown) => void
}

const DEFAULTS = {
  pollIntervalMs: 10_000,
  batchSize: 5,
  lockDurationMs: 5 * 60 * 1000,
  maxBackoffMs: 60 * 60 * 1000,
  defaultTimeoutMs: DEFAULT_TIMEOUT_MS,  // NEW
}

const claimBatch = (
  db: Database.Database,
  batchSize: number,
  lockDurationMs: number,
): ClaimedJob[] => {
  const now = new Date().toISOString()
  const lockUntil = new Date(Date.now() + lockDurationMs).toISOString()
  const stmt = db.prepare(
    `UPDATE jobs
        SET locked_until = ?, locked_by = ?, status = 'running', started_at = ?, updated_at = ?
      WHERE id IN (
        SELECT id FROM jobs
         WHERE status IN ('pending', 'running')
           AND next_run_at <= ?
           AND (locked_until IS NULL OR locked_until <= ?)
         ORDER BY next_run_at ASC
         LIMIT ?
      )
      RETURNING id, type, payload_json, attempts, max_attempts, timeout_ms`
  )
  return stmt.all(lockUntil, RUNNER_ID, now, now, now, now, batchSize) as ClaimedJob[]
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

    // NEW: Wrap handler in timeout
    const timeoutMs = row.timeout_ms ?? cfg.defaultTimeoutMs
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Job timeout after ${timeoutMs}ms`)), timeoutMs)
    })

    try {
      await Promise.race([
        handler(payload, { db, jobId: row.id }),
        timeoutPromise,
      ])
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
```

**New cron job**: Stale lock cleanup

```typescript
// server/src/jobs/staleJobCleanup.ts
import { openDb } from '../db.js'
import { registerCronSchedule } from './cron.js'

registerCronSchedule({
  name: 'stale-jobs-cleanup',
  expression: '*/5 * * * *', // Every 5 minutes
  task: () => {
    const db = openDb()
    try {
      // Find jobs that have been running longer than their timeout + grace period
      const now = Date.now()
      const gracePeriodMs = 60_000 // 1 minute grace
      
      const staleJobs = db.prepare(
        `SELECT id, timeout_ms, started_at, type
         FROM jobs
         WHERE status = 'running'
           AND started_at IS NOT NULL
           AND locked_until IS NOT NULL`
      ).all() as Array<{
        id: string
        timeout_ms: number | null
        started_at: string
        type: string
      }>
      
      for (const job of staleJobs) {
        const startedMs = new Date(job.started_at).getTime()
        const timeoutMs = job.timeout_ms ?? (5 * 60 * 1000) // default 5min
        const elapsed = now - startedMs
        
        if (elapsed > timeoutMs + gracePeriodMs) {
          // Job is stale - unlock it and increment attempts
          const attempts = (db.prepare(
            'SELECT attempts FROM jobs WHERE id = ?'
          ).get(job.id) as { attempts: number }).attempts
          
          const maxAttempts = (db.prepare(
            'SELECT max_attempts FROM jobs WHERE id = ?'
          ).get(job.id) as { max_attempts: number }).max_attempts
          
          const errorMsg = `Stale job detected - exceeded timeout of ${timeoutMs}ms`
          
          if (attempts >= maxAttempts) {
            // Move to DLQ
            db.prepare(
              `UPDATE jobs
                  SET status = 'failed',
                      last_error = ?,
                      locked_until = NULL,
                      locked_by = NULL,
                      updated_at = ?
                WHERE id = ?`
            ).run(errorMsg, new Date().toISOString(), job.id)
          } else {
            // Retry with backoff
            const backoffMs = Math.min(2 ** attempts * 60_000, 60 * 60 * 1000)
            const nextRunAt = new Date(now + backoffMs).toISOString()
            
            db.prepare(
              `UPDATE jobs
                  SET status = 'pending',
                      last_error = ?,
                      next_run_at = ?,
                      locked_until = NULL,
                      locked_by = NULL,
                      updated_at = ?
                WHERE id = ?`
            ).run(errorMsg, nextRunAt, new Date().toISOString(), job.id)
          }
          
          console.log(`[stale-jobs] Unlocked stale job ${job.id} (${job.type}) after ${elapsed}ms`)
        }
      }
    } finally {
      db.close()
    }
  },
})
```

Register in `server/src/index.ts`:

```typescript
import './jobs/staleJobCleanup.js' // Registers the cron
```

#### Configuration / Environment

**New optional env var**: `JOB_DEFAULT_TIMEOUT_MS` (default 300000 = 5 minutes)

```typescript
// server/src/jobs/runner.ts
const DEFAULT_TIMEOUT_MS = process.env.JOB_DEFAULT_TIMEOUT_MS
  ? Number.parseInt(process.env.JOB_DEFAULT_TIMEOUT_MS, 10)
  : 5 * 60 * 1000
```

#### Migration Strategy

1. Add migration `0014_jobs_timeout.sql`
2. Deploy new code with timeout support
3. Existing jobs will use default timeout (5 minutes)
4. New jobs can specify custom `timeoutMs` in `enqueueJob()`

**Rollback safety**: If migration is applied but code is not deployed, new columns will be NULL and ignored.

#### Testing Approach

**Unit test** (`server/src/jobs/runner.test.ts`):

```typescript
it('times out long-running job', async () => {
  registerHandler('test.slow', async () => {
    await new Promise((resolve) => setTimeout(resolve, 10_000)) // 10 seconds
  })
  
  const { id } = enqueueJob(db, {
    type: 'test.slow',
    timeoutMs: 100, // 100ms timeout
  })
  
  await tick(db)
  
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id)
  expect(job.status).toBe('pending') // Will retry
  expect(job.last_error).toContain('timeout')
})

it('respects per-job timeout override', async () => {
  registerHandler('test.fast', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
  
  const { id } = enqueueJob(db, {
    type: 'test.fast',
    timeoutMs: 200, // Should succeed
  })
  
  await tick(db, { defaultTimeoutMs: 10 }) // Global default is 10ms
  
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id)
  expect(job.status).toBe('done') // Succeeds despite low default
})
```

---

## 3. Recurring Invoice Generation Idempotency

### Problem Statement

The `recurring.generate` handler calls `cloneInvoice()`, which always creates a new invoice. If the job retries due to a transient error (network, DB lock, etc.), it will create duplicate invoices for the same period.

**Current flow**:
1. Cron sweeps `recurring_schedules` where `next_run_at <= now`
2. Enqueues `recurring.generate` job for each schedule
3. Handler clones invoice, advances schedule, sends email
4. If email send fails → retry → **duplicate invoice created**

### Design

#### Schema Changes

**Add to `recurring_schedules` table**:

```sql
-- Migration: 0015_recurring_idempotency.sql
ALTER TABLE recurring_schedules ADD COLUMN last_generated_invoice_id TEXT;
ALTER TABLE recurring_schedules ADD COLUMN last_generated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_recurring_last_generated ON recurring_schedules(last_generated_at);
```

**Add idempotency key to `jobs` table**:

```sql
-- Part of 0015_recurring_idempotency.sql
ALTER TABLE jobs ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_idempotency_key
  ON jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
```

This ensures duplicate job enqueues with the same key will fail due to UNIQUE constraint.

#### Code Changes

**File**: `server/src/jobs/enqueue.ts`

Add `idempotencyKey` to options:

```typescript
export interface EnqueueOptions {
  type: string
  payload?: unknown
  runAt?: Date
  maxAttempts?: number
  timeoutMs?: number
  idempotencyKey?: string  // NEW
}

export const enqueueJob = (
  db: Database.Database,
  opts: EnqueueOptions,
): { id: string; wasNew: boolean } => {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const runAt = (opts.runAt ?? new Date()).toISOString()
  const maxAttempts = opts.maxAttempts ?? 5
  const timeoutMs = opts.timeoutMs ?? null
  const idempotencyKey = opts.idempotencyKey ?? null  // NEW

  // Check if job with this idempotency key already exists
  if (idempotencyKey) {
    const existing = db.prepare(
      'SELECT id FROM jobs WHERE idempotency_key = ? AND status IN (\'pending\', \'running\')'
    ).get(idempotencyKey) as { id: string } | undefined
    
    if (existing) {
      return { id: existing.id, wasNew: false }
    }
  }

  db.prepare(
    `INSERT INTO jobs
       (id, type, payload_json, next_run_at, max_attempts, timeout_ms, idempotency_key, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(
    id,
    opts.type,
    JSON.stringify(opts.payload ?? null),
    runAt,
    maxAttempts,
    timeoutMs,
    idempotencyKey,
    now,
    now,
  )

  return { id, wasNew: true }
}
```

**File**: `server/src/recurring/cronRegistration.ts`

Use idempotency key when enqueueing recurring jobs:

```typescript
registerCronSchedule({
  name: 'recurring-sweep',
  expression: '0 * * * *',
  task: () => {
    const db = openDb()
    try {
      const due = findDueSchedules(db)
      for (const schedule of due) {
        // Use schedule ID + next_run_at as idempotency key
        // This prevents duplicate jobs if cron runs twice in quick succession
        const idempotencyKey = `recurring:${schedule.id}:${schedule.next_run_at}`
        
        enqueueJob(db, {
          type: 'recurring.generate',
          payload: { scheduleId: schedule.id },
          idempotencyKey,
        })
      }
    } finally {
      db.close()
    }
  },
})
```

**File**: `server/src/jobs/handlers/generateRecurring.ts`

Add idempotency check before cloning:

```typescript
registerHandler<GenerateRecurringPayload>(
  'recurring.generate',
  async (payload, ctx) => {
    const { db } = ctx
    const schedule = db
      .prepare(
        `SELECT id, user_id, template_invoice_id, frequency, interval_count,
                next_run_at, end_type, end_date, occurrences_remaining, status,
                last_generated_invoice_id, last_generated_at
           FROM recurring_schedules WHERE id = ?`,
      )
      .get(payload.scheduleId) as (RecurringScheduleRow & {
        last_generated_invoice_id: string | null
        last_generated_at: string | null
      }) | undefined

    if (!schedule) {
      throw new Error(`recurring.generate: schedule ${payload.scheduleId} not found`)
    }
    if (schedule.status !== 'active') {
      return
    }

    // Idempotency check: if we already generated an invoice for this run, skip
    if (schedule.last_generated_at === schedule.next_run_at) {
      console.log(
        `[recurring.generate] Schedule ${schedule.id} already generated invoice for ${schedule.next_run_at}, skipping`
      )
      return
    }

    const generatedAt = new Date()
    
    // Clone invoice in a transaction with idempotency update
    const { newInvoiceId, newInvoiceNumber } = db.transaction(() => {
      const result = cloneInvoice(db, schedule.template_invoice_id)
      
      // Record that we generated for this period
      db.prepare(
        `UPDATE recurring_schedules
            SET last_generated_invoice_id = ?,
                last_generated_at = ?,
                updated_at = ?
          WHERE id = ?`
      ).run(
        result.newInvoiceId,
        schedule.next_run_at, // Mark this run as completed
        new Date().toISOString(),
        schedule.id
      )
      
      return result
    })()

    const advancement = computeAdvancement(schedule, generatedAt)
    updateScheduleAfterRun(db, schedule.id, advancement)

    recordAudit(db, {
      action: 'recurring.invoice_generated',
      entityType: 'recurring_schedule',
      entityId: schedule.id,
      actorUserId: schedule.user_id,
      metadata: {
        new_invoice_id: newInvoiceId,
        new_invoice_number: newInvoiceNumber,
        new_status: advancement.newStatus,
      },
    })

    enqueueJob(db, {
      type: 'email.invoice',
      payload: { invoiceId: newInvoiceId },
    })
  },
)
```

#### Configuration / Environment

No new environment variables required. Idempotency is automatic.

#### Migration Strategy

1. Add migration `0015_recurring_idempotency.sql`
2. Deploy new code
3. Existing schedules will have `last_generated_at = NULL` → first run will generate normally
4. Subsequent runs will be idempotent

**Rollback safety**: If migration is applied but code is not deployed, new columns will be NULL and ignored.

#### Testing Approach

**Unit test** (`server/src/jobs/handlers/generateRecurring.test.ts`):

```typescript
it('does not create duplicate invoice on retry', async () => {
  // Create schedule
  const scheduleId = crypto.randomUUID()
  const templateId = crypto.randomUUID()
  const userId = crypto.randomUUID()
  const now = new Date().toISOString()
  
  // ... insert schedule, template invoice, etc ...
  
  // Enqueue job twice with same idempotency key
  const key = `recurring:${scheduleId}:${now}`
  const { id: jobId1, wasNew: wasNew1 } = enqueueJob(db, {
    type: 'recurring.generate',
    payload: { scheduleId },
    idempotencyKey: key,
  })
  const { id: jobId2, wasNew: wasNew2 } = enqueueJob(db, {
    type: 'recurring.generate',
    payload: { scheduleId },
    idempotencyKey: key,
  })
  
  expect(wasNew1).toBe(true)
  expect(wasNew2).toBe(false)
  expect(jobId1).toBe(jobId2) // Same job
  
  // Run the job
  await tick(db)
  
  // Check only one invoice was created
  const invoices = db.prepare(
    'SELECT * FROM invoices WHERE parent_invoice_id = ?'
  ).all(templateId)
  expect(invoices).toHaveLength(1)
  
  // Try to run again (simulate retry)
  await tick(db)
  
  // Still only one invoice
  const invoices2 = db.prepare(
    'SELECT * FROM invoices WHERE parent_invoice_id = ?'
  ).all(templateId)
  expect(invoices2).toHaveLength(1)
})
```

**Integration test**: Create a schedule, enqueue job, force error after invoice creation but before email send, retry, verify no duplicate.

---

## Migration Rollout Plan

### Phase 1: Schema Updates (Low Risk)
1. Create and test migrations locally:
   - `0013_jobs_dlq.sql`
   - `0014_jobs_timeout.sql`
   - `0015_recurring_idempotency.sql`
2. Run migrations on staging database
3. Verify schema changes with `sqlite3 -header -column D:\databases\invoiceflow.db ".schema jobs"`

### Phase 2: Code Deployment (Incremental)
1. Deploy DLQ support first (can run independently)
2. Deploy timeout support (adds safety, low risk)
3. Deploy idempotency last (requires schema + testing recurring jobs)

### Phase 3: Validation
1. Monitor DLQ population — expect to see failed jobs move there automatically
2. Trigger a test recurring job and verify idempotency (force retry manually)
3. Create a long-running test job, verify timeout fires correctly
4. Check logs for stale job cleanup messages

### Rollback Strategy
- If code issues arise, migrations can stay applied (backward compatible)
- Old code will ignore new columns/tables
- If migrations cause issues, restore DB from backup (D:\ should have backups)

---

## Testing Strategy Summary

### Unit Tests (Vitest)
- `server/src/jobs/dlq.test.ts` — DLQ move, retry, archive flows
- `server/src/jobs/runner.test.ts` — Timeout enforcement, stale cleanup
- `server/src/jobs/handlers/generateRecurring.test.ts` — Idempotency checks
- `server/src/jobs/enqueue.test.ts` — Idempotency key deduplication

### Integration Tests
- Full recurring flow: schedule → enqueue → generate → verify no duplicates on retry
- DLQ API routes: list, retry, archive via Fastify test client
- Timeout cleanup: spawn slow job, wait for cleanup cron, verify unlock

### Manual QA Checklist
1. Create a test invoice, set up recurring schedule
2. Force the `recurring.generate` job to fail mid-execution (e.g., disconnect Resend)
3. Verify job retries without creating duplicate invoices
4. Check DLQ UI shows the failed job with error details
5. Manually retry from DLQ, verify success
6. Create a job that runs for 10 minutes, verify timeout after 5 minutes
7. Check logs for stale job cleanup messages

---

## Configuration Summary

| Environment Variable | Default | Purpose |
|---|---|---|
| `JOB_DEFAULT_TIMEOUT_MS` | 300000 (5 min) | Default timeout for jobs without explicit timeout |
| `DLQ_RETENTION_DAYS` | (future) 90 | Auto-archive DLQ jobs older than X days |

---

## API Endpoints Added

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/dlq` | List failed jobs with pagination + type filter |
| POST | `/api/dlq/:id/retry` | Manually retry a failed job |
| PATCH | `/api/dlq/:id/archive` | Mark a failed job as resolved |
| DELETE | `/api/dlq/:id` | Permanently delete a failed job |

---

## Implementation Checklist

- [ ] Create migration `0013_jobs_dlq.sql`
- [ ] Create migration `0014_jobs_timeout.sql`
- [ ] Create migration `0015_recurring_idempotency.sql`
- [ ] Update `runner.ts` — DLQ move on final failure
- [ ] Update `runner.ts` — Timeout wrapper for handlers
- [ ] Update `enqueue.ts` — Add `timeoutMs` and `idempotencyKey` options
- [ ] Create `dlq.ts` — DLQ query/retry/archive functions
- [ ] Create `dlqRoutes.ts` — REST API for DLQ management
- [ ] Create `staleJobCleanup.ts` — Cron job for stale lock cleanup
- [ ] Create `cleanup.ts` — Cron job for old completed jobs
- [ ] Update `cronRegistration.ts` — Use idempotency key for recurring jobs
- [ ] Update `generateRecurring.ts` — Add idempotency check before cloning
- [ ] Register DLQ routes in `index.ts`
- [ ] Register stale cleanup cron in `index.ts`
- [ ] Write unit tests for DLQ
- [ ] Write unit tests for timeout
- [ ] Write unit tests for idempotency
- [ ] Write integration tests
- [ ] Update `PROJECT_GUIDE.md` — Document DLQ, timeout, idempotency
- [ ] Update `CLAUDE.md` — Add DLQ API routes
- [ ] Deploy to staging and validate

---

## Future Enhancements (Out of Scope)

1. **Job Priority** — Add `priority` column, process high-priority jobs first
2. **Job Dependencies** — Add `depends_on` to wait for parent jobs to complete
3. **Batch Job Processing** — Process multiple jobs of the same type in a single handler call
4. **Job Metrics** — Track success rate, average duration, failure reasons per job type
5. **DLQ UI** — Admin panel for inspecting/retrying failed jobs (currently API-only)
6. **Distributed Locking** — Use Redis/Postgres advisory locks for multi-instance deployments (not needed for single-tenant MVP)

---

**End of Design Document**
