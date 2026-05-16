// @vitest-environment node
import Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { runMigrations } from '../migrations/index.js'
import { enqueueJob } from './enqueue.js'
import { clearHandlers, registerHandler } from './handlers/index.js'
import { startJobRunner, tick } from './runner.js'

const repoRoot = path.resolve(__dirname, '..', '..', '..')
const migrationsDir = path.join(repoRoot, 'server', 'src', 'migrations')

describe('job runner', () => {
  let db: Database.Database
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-jobs-'))
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)
    clearHandlers()
  })

  afterEach(() => {
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
    clearHandlers()
  })

  it('runs an enqueued job once and marks it done', async () => {
    let calls = 0
    registerHandler<{ x: number }>('test.echo', async (payload) => {
      expect(payload.x).toBe(42)
      calls++
    })

    enqueueJob(db, { type: 'test.echo', payload: { x: 42 } })

    const result = await tick(db)

    expect(result.processed).toBe(1)
    expect(result.succeeded).toBe(1)
    expect(calls).toBe(1)
    const row = db
      .prepare('SELECT status, attempts FROM jobs')
      .get() as { status: string; attempts: number }
    expect(row.status).toBe('done')
    expect(row.attempts).toBe(1)
  })

  it('retries with exponential backoff on handler throw', async () => {
    registerHandler('test.fail', async () => {
      throw new Error('boom')
    })
    enqueueJob(db, { type: 'test.fail', payload: { v: 1 }, maxAttempts: 3 })

    const r1 = await tick(db)
    expect(r1.retried).toBe(1)
    const after1 = db
      .prepare(
        'SELECT status, attempts, last_error, next_run_at FROM jobs',
      )
      .get() as {
      status: string
      attempts: number
      last_error: string
      next_run_at: string
    }
    expect(after1.status).toBe('pending')
    expect(after1.attempts).toBe(1)
    expect(after1.last_error).toBe('boom')
    expect(new Date(after1.next_run_at).getTime()).toBeGreaterThan(Date.now() + 30_000)
  })

  it('marks job failed after max_attempts exceeded', async () => {
    registerHandler('test.fail', async () => {
      throw new Error('nope')
    })
    enqueueJob(db, { type: 'test.fail', maxAttempts: 2 })

    db.prepare(`UPDATE jobs SET next_run_at = datetime('now', '-1 hour')`).run()
    const r1 = await tick(db)
    expect(r1.retried).toBe(1)

    db.prepare(`UPDATE jobs SET next_run_at = datetime('now', '-1 hour')`).run()
    const r2 = await tick(db)
    expect(r2.failed).toBe(1)

    const row = db
      .prepare('SELECT status, attempts FROM jobs')
      .get() as { status: string; attempts: number }
    expect(row.status).toBe('failed')
    expect(row.attempts).toBe(2)
  })

  it('does not double-execute a job across two sequential ticks', async () => {
    let calls = 0
    registerHandler('test.once', async () => {
      calls++
    })
    enqueueJob(db, { type: 'test.once' })

    await tick(db)
    await tick(db)

    expect(calls).toBe(1)
  })

  it('skips jobs whose run_at is in the future', async () => {
    let calls = 0
    registerHandler('test.future', async () => {
      calls++
    })
    enqueueJob(db, {
      type: 'test.future',
      runAt: new Date(Date.now() + 60_000),
    })

    const r = await tick(db)
    expect(r.processed).toBe(0)
    expect(calls).toBe(0)
  })

  it('reclaims a stuck running job once its lock expires', async () => {
    let calls = 0
    registerHandler('test.stuck', async () => {
      calls++
    })
    enqueueJob(db, { type: 'test.stuck' })

    db.prepare(
      `UPDATE jobs SET status='running', locked_until=datetime('now', '-1 hour')`,
    ).run()

    const r = await tick(db)
    expect(r.processed).toBe(1)
    expect(calls).toBe(1)
  })

  it('fails immediately when no handler is registered for the type', async () => {
    enqueueJob(db, { type: 'unknown.type', maxAttempts: 1 })
    const r = await tick(db)
    expect(r.failed).toBe(1)
    const row = db
      .prepare('SELECT status, last_error FROM jobs')
      .get() as { status: string; last_error: string }
    expect(row.status).toBe('failed')
    expect(row.last_error).toMatch(/No handler registered/)
  })

  it('startJobRunner runs the loop and stop() halts cleanly', async () => {
    let calls = 0
    registerHandler('test.runner', async () => {
      calls++
    })
    enqueueJob(db, { type: 'test.runner' })

    const runner = startJobRunner(db, { pollIntervalMs: 10 })

    await new Promise((resolve) => setTimeout(resolve, 100))
    await runner.stop()

    expect(calls).toBe(1)
    const row = db.prepare('SELECT status FROM jobs').get() as { status: string }
    expect(row.status).toBe('done')
  })
})
