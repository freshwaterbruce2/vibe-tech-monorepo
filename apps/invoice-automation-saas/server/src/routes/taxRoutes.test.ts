// @vitest-environment node
import Database from 'better-sqlite3'
import Fastify, { type FastifyInstance } from 'fastify'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { runMigrations } from '../migrations/index.js'
import { registerTaxRoutes } from './taxRoutes.js'

const repoRoot = path.resolve(__dirname, '..', '..', '..')
const migrationsDir = path.join(repoRoot, 'server', 'src', 'migrations')

const seedUser = (db: Database.Database, userId = 'user-1') => {
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO users (id, email, password_salt, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(userId, `${userId}@example.com`, Buffer.from('s'), Buffer.from('h'), now, now)
}

describe('tax routes', () => {
  let db: Database.Database
  let tmpDir: string
  let app: FastifyInstance

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-tax-'))
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)
    seedUser(db)

    app = Fastify()
    app.addHook('preHandler', async (req) => {
      ;(req as unknown as { authUserId: string }).authUserId = 'user-1'
    })
    registerTaxRoutes(app, db)
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('creates a tax rate', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tax-rates',
      payload: { name: 'VAT 20%', ratePct: 20, regionCode: 'GB', isDefault: true },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as { taxRate: { name: string; ratePct: number; isDefault: boolean } }
    expect(body.taxRate.name).toBe('VAT 20%')
    expect(body.taxRate.ratePct).toBe(20)
    expect(body.taxRate.isDefault).toBe(true)
  })

  it('rejects ratePct out of range', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tax-rates',
      payload: { name: 'Bad', ratePct: 150 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('only one default per user', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/tax-rates',
      payload: { name: 'A', ratePct: 5, isDefault: true },
    })
    await app.inject({
      method: 'POST',
      url: '/api/tax-rates',
      payload: { name: 'B', ratePct: 10, isDefault: true },
    })
    const defaults = db
      .prepare(`SELECT name FROM tax_rates WHERE user_id = 'user-1' AND is_default = 1`)
      .all() as { name: string }[]
    expect(defaults).toHaveLength(1)
    expect(defaults[0].name).toBe('B')
  })

  it('PATCH updates ratePct', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/tax-rates',
      payload: { name: 'X', ratePct: 5 },
    })
    const id = (created.json() as { taxRate: { id: string } }).taxRate.id

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tax-rates/${id}`,
      payload: { ratePct: 7.5 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { taxRate: { ratePct: number } }
    expect(body.taxRate.ratePct).toBe(7.5)
  })

  it('DELETE returns 204 when not in use', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/tax-rates',
      payload: { name: 'D', ratePct: 5 },
    })
    const id = (created.json() as { taxRate: { id: string } }).taxRate.id

    const res = await app.inject({ method: 'DELETE', url: `/api/tax-rates/${id}` })
    expect(res.statusCode).toBe(204)
  })

  it('DELETE returns 409 when assigned as client default', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/tax-rates',
      payload: { name: 'InUse', ratePct: 5 },
    })
    const id = (created.json() as { taxRate: { id: string } }).taxRate.id

    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO clients (id, user_id, name, email, default_tax_rate_id, created_at, updated_at)
       VALUES ('c1','user-1','Acme','a@b.com',?,?,?)`,
    ).run(id, now, now)

    const res = await app.inject({ method: 'DELETE', url: `/api/tax-rates/${id}` })
    expect(res.statusCode).toBe(409)
  })

  it('GET lists in default-first order', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/tax-rates',
      payload: { name: 'Zebra', ratePct: 1 },
    })
    await app.inject({
      method: 'POST',
      url: '/api/tax-rates',
      payload: { name: 'Apple', ratePct: 2, isDefault: true },
    })
    const res = await app.inject({ method: 'GET', url: '/api/tax-rates' })
    const body = res.json() as { taxRates: { name: string; isDefault: boolean }[] }
    expect(body.taxRates[0].name).toBe('Apple')
    expect(body.taxRates[0].isDefault).toBe(true)
  })
})
