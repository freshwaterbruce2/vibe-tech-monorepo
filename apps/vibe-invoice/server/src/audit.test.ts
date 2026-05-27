// @vitest-environment node
import Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { queryAudit, recordAudit } from './audit.js'
import { runMigrations } from './migrations/index.js'

const repoRoot = path.resolve(__dirname, '..', '..')
const migrationsDir = path.join(repoRoot, 'server', 'src', 'migrations')

describe('audit log', () => {
  let db: Database.Database
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-audit-'))
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)
  })

  afterEach(() => {
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('records a minimal entry and returns the inserted record', () => {
    const rec = recordAudit(db, {
      action: 'invoice.created',
      entityType: 'invoice',
      entityId: 'inv-1',
    })

    expect(rec.id).toMatch(/^[0-9a-f-]{36}$/i)
    expect(rec.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(rec.action).toBe('invoice.created')
  })

  it('persists metadata as JSON and round-trips it via queryAudit', () => {
    recordAudit(db, {
      actorUserId: 'user-1',
      action: 'payment.recorded',
      entityType: 'payment',
      entityId: 'pay-1',
      metadata: { amount: 100, currency: 'USD', source: 'stripe' },
      ip: '203.0.113.1',
      userAgent: 'curl/8.5.0',
    })

    const rows = queryAudit(db, { entityType: 'payment' })
    expect(rows).toHaveLength(1)
    expect(rows[0].metadata).toEqual({
      amount: 100,
      currency: 'USD',
      source: 'stripe',
    })
    expect(rows[0].ip).toBe('203.0.113.1')
    expect(rows[0].userAgent).toBe('curl/8.5.0')
  })

  it('queryAudit filters by entityType, entityId, actor, and action', () => {
    recordAudit(db, { action: 'a.x', entityType: 'invoice', entityId: 'i1' })
    recordAudit(db, { action: 'a.y', entityType: 'invoice', entityId: 'i2' })
    recordAudit(db, { action: 'b.x', entityType: 'client', entityId: 'c1' })
    recordAudit(db, {
      action: 'a.x',
      entityType: 'invoice',
      entityId: 'i1',
      actorUserId: 'u1',
    })

    expect(queryAudit(db, { entityType: 'invoice' })).toHaveLength(3)
    expect(queryAudit(db, { entityType: 'invoice', entityId: 'i1' })).toHaveLength(2)
    expect(queryAudit(db, { actorUserId: 'u1' })).toHaveLength(1)
    expect(queryAudit(db, { action: 'a.x' })).toHaveLength(2)
  })

  it('returns rows ordered by created_at DESC and respects limit', () => {
    for (let i = 0; i < 5; i++) {
      recordAudit(db, {
        action: `evt.${i}`,
        entityType: 'invoice',
        entityId: `i-${i}`,
      })
    }
    const rows = queryAudit(db, { limit: 3 })
    expect(rows).toHaveLength(3)
    expect(rows[0].action).toBe('evt.4')
  })

  it('clamps limit to [1, 1000]', () => {
    recordAudit(db, { action: 'a', entityType: 'x' })
    expect(queryAudit(db, { limit: -5 })).toHaveLength(1)
    expect(queryAudit(db, { limit: 99999 })).toHaveLength(1)
  })

  it('null metadata round-trips as null, not the string "null"', () => {
    recordAudit(db, { action: 'no-meta', entityType: 'x', entityId: 'a' })
    const [row] = queryAudit(db, {})
    expect(row.metadata).toBeNull()
  })
})
