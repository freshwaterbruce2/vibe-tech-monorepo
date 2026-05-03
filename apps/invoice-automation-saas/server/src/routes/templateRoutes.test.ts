// @vitest-environment node
import Database from 'better-sqlite3'
import Fastify, { type FastifyInstance } from 'fastify'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { runMigrations } from '../migrations/index.js'
import { registerTemplateRoutes } from './templateRoutes.js'

const repoRoot = path.resolve(__dirname, '..', '..', '..')
const migrationsDir = path.join(repoRoot, 'server', 'src', 'migrations')

const seedUser = (db: Database.Database, userId = 'user-1') => {
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO users (id, email, password_salt, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(userId, `${userId}@example.com`, Buffer.from('s'), Buffer.from('h'), now, now)
}

describe('template routes', () => {
  let db: Database.Database
  let tmpDir: string
  let app: FastifyInstance

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-tpl-'))
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)
    seedUser(db)

    app = Fastify()
    app.addHook('preHandler', async (req) => {
      ;(req as unknown as { authUserId: string }).authUserId = 'user-1'
    })
    registerTemplateRoutes(app, db)
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('creates a template and returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/templates',
      payload: {
        name: 'My Modern',
        baseTemplate: 'modern',
        config: { accentColor: '#7c3aed' },
        isDefault: true,
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as { template: { id: string; name: string; isDefault: boolean; config: { accentColor: string } } }
    expect(body.template.name).toBe('My Modern')
    expect(body.template.isDefault).toBe(true)
    expect(body.template.config.accentColor).toBe('#7c3aed')
  })

  it('rejects unknown baseTemplate', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/templates',
      payload: { name: 'X', baseTemplate: 'fancy', config: {} },
    })
    expect(res.statusCode).toBe(400)
  })

  it('only one default per user via the unique partial index', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/templates',
      payload: { name: 'A', baseTemplate: 'classic', config: {}, isDefault: true },
    })
    await app.inject({
      method: 'POST',
      url: '/api/templates',
      payload: { name: 'B', baseTemplate: 'modern', config: {}, isDefault: true },
    })

    const defaults = db
      .prepare(
        `SELECT id, name FROM invoice_templates WHERE user_id = ? AND is_default = 1`,
      )
      .all('user-1') as { id: string; name: string }[]
    expect(defaults).toHaveLength(1)
    expect(defaults[0].name).toBe('B')
  })

  it('lists own templates', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/templates',
      payload: { name: 'A', baseTemplate: 'classic', config: {} },
    })
    const res = await app.inject({ method: 'GET', url: '/api/templates' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { templates: unknown[] }
    expect(body.templates.length).toBeGreaterThanOrEqual(1)
  })

  it('PATCH updates name and config', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/templates',
      payload: { name: 'Original', baseTemplate: 'classic', config: {} },
    })
    const id = (created.json() as { template: { id: string } }).template.id

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/templates/${id}`,
      payload: { name: 'Renamed', config: { accentColor: '#ff0000' } },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { template: { name: string; config: { accentColor: string } } }
    expect(body.template.name).toBe('Renamed')
    expect(body.template.config.accentColor).toBe('#ff0000')
  })

  it('DELETE returns 204 when not in use', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/templates',
      payload: { name: 'D', baseTemplate: 'classic', config: {} },
    })
    const id = (created.json() as { template: { id: string } }).template.id

    const res = await app.inject({ method: 'DELETE', url: `/api/templates/${id}` })
    expect(res.statusCode).toBe(204)
  })

  it('DELETE returns 409 when template is in use by an invoice', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/templates',
      payload: { name: 'InUse', baseTemplate: 'classic', config: {} },
    })
    const id = (created.json() as { template: { id: string } }).template.id

    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO clients (id, user_id, name, email, created_at, updated_at)
       VALUES ('c1','user-1','Acme','a@b.com',?,?)`,
    ).run(now, now)
    db.prepare(
      `INSERT INTO invoices
         (id, user_id, invoice_number, client_id, issue_date, due_date,
          subtotal, tax, total, status, currency, template_id, created_at, updated_at)
       VALUES ('inv-1','user-1','INV-1','c1','2026-05-01','2026-05-31',
               100,0,100,'sent','USD',?,?,?)`,
    ).run(id, now, now)

    const res = await app.inject({ method: 'DELETE', url: `/api/templates/${id}` })
    expect(res.statusCode).toBe(409)
  })

  it('preview returns a non-empty PDF', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/templates/preview',
      payload: { baseTemplate: 'modern', config: { accentColor: '#7c3aed' } },
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('application/pdf')
    const body = res.rawPayload
    expect(body.length).toBeGreaterThan(1000)
    expect(body.subarray(0, 4).toString('utf8')).toBe('%PDF')
  })
})
