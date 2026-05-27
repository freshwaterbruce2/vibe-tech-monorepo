// @vitest-environment node
import Database from 'better-sqlite3'
import Fastify, { type FastifyInstance } from 'fastify'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { runMigrations } from '../migrations/index.js'
import { registerProjectRoutes } from './projectRoutes.js'
import { registerTimeRoutes } from './timeRoutes.js'

const repoRoot = path.resolve(__dirname, '..', '..', '..')
const migrationsDir = path.join(repoRoot, 'server', 'src', 'migrations')

const seed = (db: Database.Database) => {
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO users (id, email, password_salt, password_hash, created_at, updated_at)
     VALUES ('user-1','u@x.com',?,?,?,?)`,
  ).run(Buffer.from('s'), Buffer.from('h'), now, now)
  db.prepare(
    `INSERT INTO clients (id, user_id, name, email, created_at, updated_at)
     VALUES ('c1','user-1','Acme','a@b.com',?,?)`,
  ).run(now, now)
}

describe('time routes', () => {
  let db: Database.Database
  let tmpDir: string
  let app: FastifyInstance

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-time-'))
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)
    seed(db)

    app = Fastify()
    app.addHook('preHandler', async (req) => {
      ;(req as unknown as { authUserId: string }).authUserId = 'user-1'
    })
    registerProjectRoutes(app, db)
    registerTimeRoutes(app, db)
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  const createProject = async (name: string, hourlyRate?: number) => {
    const r = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name, hourlyRate, clientId: 'c1' },
    })
    return (r.json() as { project: { id: string } }).project.id
  }

  it('start creates a running entry', async () => {
    const projectId = await createProject('Site work', 100)
    const res = await app.inject({
      method: 'POST',
      url: '/api/time-entries/start',
      payload: { projectId, description: 'Coding' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as { timeEntry: { endedAt: string | null; hourlyRate: number } }
    expect(body.timeEntry.endedAt).toBeNull()
    expect(body.timeEntry.hourlyRate).toBe(100)
  })

  it('cannot start a second concurrent timer (uniq_time_running)', async () => {
    const projectId = await createProject('Site work', 100)
    const r1 = await app.inject({
      method: 'POST',
      url: '/api/time-entries/start',
      payload: { projectId },
    })
    expect(r1.statusCode).toBe(201)
    const r2 = await app.inject({
      method: 'POST',
      url: '/api/time-entries/start',
      payload: { projectId, description: 'second' },
    })
    expect(r2.statusCode).toBe(409)
  })

  it('stop ends the entry and computes duration', async () => {
    const projectId = await createProject('S', 50)
    const start = await app.inject({
      method: 'POST',
      url: '/api/time-entries/start',
      payload: { projectId },
    })
    const id = (start.json() as { timeEntry: { id: string } }).timeEntry.id
    // Backdate started_at by 1 hour for measurable duration (use ISO/Z so JS Date parses as UTC)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    db.prepare(`UPDATE time_entries SET started_at = ? WHERE id = ?`).run(oneHourAgo, id)

    const stop = await app.inject({
      method: 'POST',
      url: `/api/time-entries/${id}/stop`,
    })
    expect(stop.statusCode).toBe(200)
    const body = stop.json() as { timeEntry: { durationSeconds: number; endedAt: string } }
    expect(body.timeEntry.durationSeconds).toBeGreaterThan(3500)
    expect(body.timeEntry.endedAt).not.toBeNull()
  })

  it('manual entry with explicit times', async () => {
    const projectId = await createProject('S', 60)
    const res = await app.inject({
      method: 'POST',
      url: '/api/time-entries',
      payload: {
        projectId,
        startedAt: '2026-05-01T09:00:00Z',
        endedAt: '2026-05-01T10:30:00Z',
        description: 'Reviewing',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as { timeEntry: { durationSeconds: number; hourlyRate: number } }
    expect(body.timeEntry.durationSeconds).toBe(90 * 60)
    expect(body.timeEntry.hourlyRate).toBe(60)
  })

  it('manual entry rejects endedAt before startedAt', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/time-entries',
      payload: {
        startedAt: '2026-05-01T10:00:00Z',
        endedAt: '2026-05-01T09:00:00Z',
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET running returns the running entry or null', async () => {
    const initial = await app.inject({ method: 'GET', url: '/api/time-entries/running' })
    expect((initial.json() as { running: unknown }).running).toBeNull()

    const projectId = await createProject('S', 50)
    await app.inject({
      method: 'POST',
      url: '/api/time-entries/start',
      payload: { projectId },
    })
    const after = await app.inject({ method: 'GET', url: '/api/time-entries/running' })
    expect((after.json() as { running: unknown }).running).not.toBeNull()
  })

  it('from-time groups entries by project and stamps invoiced_on', async () => {
    const projectA = await createProject('Project A', 100)
    const projectB = await createProject('Project B', 50)
    // Two entries for A (1h + 30m), one for B (1h)
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO time_entries (id, user_id, project_id, started_at, ended_at, duration_seconds, is_billable, hourly_rate, created_at, updated_at)
       VALUES ('t1','user-1',?,?,?,3600,1,100,?,?)`,
    ).run(projectA, '2026-05-01T09:00:00Z', '2026-05-01T10:00:00Z', now, now)
    db.prepare(
      `INSERT INTO time_entries (id, user_id, project_id, started_at, ended_at, duration_seconds, is_billable, hourly_rate, created_at, updated_at)
       VALUES ('t2','user-1',?,?,?,1800,1,100,?,?)`,
    ).run(projectA, '2026-05-01T11:00:00Z', '2026-05-01T11:30:00Z', now, now)
    db.prepare(
      `INSERT INTO time_entries (id, user_id, project_id, started_at, ended_at, duration_seconds, is_billable, hourly_rate, created_at, updated_at)
       VALUES ('t3','user-1',?,?,?,3600,1,50,?,?)`,
    ).run(projectB, '2026-05-01T13:00:00Z', '2026-05-01T14:00:00Z', now, now)

    db.prepare(
      `INSERT INTO invoices (id, user_id, invoice_number, client_id, issue_date, due_date,
                             subtotal, tax, total, status, currency, created_at, updated_at)
       VALUES ('inv-1','user-1','INV-1','c1','2026-05-01','2026-05-31',0,0,0,'draft','USD',?,?)`,
    ).run(now, now)

    const res = await app.inject({
      method: 'POST',
      url: '/api/invoices/inv-1/items/from-time',
      payload: { entryIds: ['t1', 't2', 't3'] },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as { items: { total: number }[] }
    expect(body.items).toHaveLength(2)
    const totals = body.items.map((i) => i.total).sort((a, b) => a - b)
    expect(totals).toEqual([50, 150])

    const invoicedRows = db
      .prepare(`SELECT id FROM time_entries WHERE invoiced_on_invoice_id = 'inv-1'`)
      .all() as { id: string }[]
    expect(invoicedRows).toHaveLength(3)
  })

  it('from-time rejects already-invoiced entries', async () => {
    const projectId = await createProject('S', 50)
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO invoices (id, user_id, invoice_number, client_id, issue_date, due_date,
                             subtotal, tax, total, status, currency, created_at, updated_at)
       VALUES ('inv-1','user-1','INV-1','c1','2026-05-01','2026-05-31',0,0,0,'draft','USD',?,?)`,
    ).run(now, now)
    db.prepare(
      `INSERT INTO time_entries (id, user_id, project_id, started_at, ended_at, duration_seconds, is_billable, hourly_rate, invoiced_on_invoice_id, created_at, updated_at)
       VALUES ('t1','user-1',?,?,?,3600,1,50,'inv-other',?,?)`,
    ).run(projectId, '2026-05-01T09:00:00Z', '2026-05-01T10:00:00Z', now, now)

    const res = await app.inject({
      method: 'POST',
      url: '/api/invoices/inv-1/items/from-time',
      payload: { entryIds: ['t1'] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('project DELETE 409 when time entries exist', async () => {
    const projectId = await createProject('S', 50)
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO time_entries (id, user_id, project_id, started_at, is_billable, created_at, updated_at)
       VALUES ('t1','user-1',?,?,1,?,?)`,
    ).run(projectId, '2026-05-01T09:00:00Z', now, now)

    const res = await app.inject({ method: 'DELETE', url: `/api/projects/${projectId}` })
    expect(res.statusCode).toBe(409)
  })
})
