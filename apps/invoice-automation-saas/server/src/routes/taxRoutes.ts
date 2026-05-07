import type Database from 'better-sqlite3'
import crypto from 'crypto'
import type { FastifyInstance } from 'fastify'

import { recordAudit } from '../audit.js'
import type { AuthenticatedRequest, IdParams } from './types.js'

const nowIso = () => new Date().toISOString()

interface TaxRateRow {
  id: string
  user_id: string
  name: string
  rate_pct: number
  region_code: string | null
  is_compound: number
  is_default: number
  created_at: string
}

interface CreateTaxRateBody {
  name?: unknown
  ratePct?: unknown
  regionCode?: unknown
  isCompound?: unknown
  isDefault?: unknown
}

interface PatchTaxRateBody {
  name?: unknown
  ratePct?: unknown
  regionCode?: unknown
  isCompound?: unknown
  isDefault?: unknown
}

const toApi = (row: TaxRateRow) => ({
  id: row.id,
  name: row.name,
  ratePct: row.rate_pct,
  regionCode: row.region_code,
  isCompound: row.is_compound === 1,
  isDefault: row.is_default === 1,
  createdAt: row.created_at,
})

const validateRate = (raw: unknown): number | null => {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0 || n > 100) return null
  return n
}

export const registerTaxRoutes = (
  app: FastifyInstance,
  db: Database.Database,
): void => {
  app.get('/api/tax-rates', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const rows = db
      .prepare(
        `SELECT * FROM tax_rates WHERE user_id = ?
         ORDER BY is_default DESC, name ASC`,
      )
      .all(userId) as TaxRateRow[]
    return { taxRates: rows.map(toApi) }
  })

  app.post('/api/tax-rates', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const body = (req.body ?? {}) as CreateTaxRateBody
    const name = String(body.name ?? '').trim()
    if (!name) return reply.code(400).send({ error: 'name is required' })

    const ratePct = validateRate(body.ratePct)
    if (ratePct === null)
      return reply.code(400).send({ error: 'ratePct must be a number between 0 and 100' })

    const regionCode = body.regionCode ? String(body.regionCode).trim() || null : null
    const isCompound = body.isCompound === true ? 1 : 0
    const isDefault = body.isDefault === true ? 1 : 0

    const id = crypto.randomUUID()
    const now = nowIso()

    const tx = db.transaction(() => {
      if (isDefault) {
        db.prepare(
          `UPDATE tax_rates SET is_default = 0 WHERE user_id = ?`,
        ).run(userId)
      }
      db.prepare(
        `INSERT INTO tax_rates
           (id, user_id, name, rate_pct, region_code, is_compound, is_default, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, userId, name, ratePct, regionCode, isCompound, isDefault, now)
    })
    tx()

    recordAudit(db, {
      actorUserId: userId,
      action: 'tax_rate.created',
      entityType: 'tax_rate',
      entityId: id,
      metadata: { name, ratePct, isDefault: isDefault === 1 },
    })

    const row = db.prepare('SELECT * FROM tax_rates WHERE id = ?').get(id) as TaxRateRow
    return reply.code(201).send({ taxRate: toApi(row) })
  })

  app.patch('/api/tax-rates/:id', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const id = (req.params as IdParams).id
    const existing = db
      .prepare('SELECT user_id FROM tax_rates WHERE id = ?')
      .get(id) as { user_id: string } | undefined
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    if (existing.user_id !== userId)
      return reply.code(403).send({ error: 'Forbidden' })

    const body = (req.body ?? {}) as PatchTaxRateBody
    const updates: string[] = []
    const params: unknown[] = []

    if (body.name !== undefined) {
      const name = String(body.name ?? '').trim()
      if (!name) return reply.code(400).send({ error: 'name cannot be empty' })
      updates.push('name = ?')
      params.push(name)
    }
    if (body.ratePct !== undefined) {
      const r = validateRate(body.ratePct)
      if (r === null)
        return reply.code(400).send({ error: 'ratePct must be a number between 0 and 100' })
      updates.push('rate_pct = ?')
      params.push(r)
    }
    if (body.regionCode !== undefined) {
      updates.push('region_code = ?')
      params.push(body.regionCode ? String(body.regionCode).trim() || null : null)
    }
    if (body.isCompound !== undefined) {
      updates.push('is_compound = ?')
      params.push(body.isCompound === true ? 1 : 0)
    }

    const setDefault = body.isDefault === true
    const clearDefault = body.isDefault === false

    const tx = db.transaction(() => {
      if (setDefault) {
        db.prepare(`UPDATE tax_rates SET is_default = 0 WHERE user_id = ?`).run(userId)
        db.prepare(`UPDATE tax_rates SET is_default = 1 WHERE id = ?`).run(id)
      } else if (clearDefault) {
        db.prepare(`UPDATE tax_rates SET is_default = 0 WHERE id = ?`).run(id)
      }
      if (updates.length > 0) {
        params.push(id)
        db.prepare(
          `UPDATE tax_rates SET ${updates.join(', ')} WHERE id = ?`,
        ).run(...params)
      }
    })
    tx()

    recordAudit(db, {
      actorUserId: userId,
      action: 'tax_rate.updated',
      entityType: 'tax_rate',
      entityId: id,
    })

    const row = db.prepare('SELECT * FROM tax_rates WHERE id = ?').get(id) as TaxRateRow
    return { taxRate: toApi(row) }
  })

  app.delete('/api/tax-rates/:id', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const id = (req.params as IdParams).id
    const existing = db
      .prepare('SELECT user_id FROM tax_rates WHERE id = ?')
      .get(id) as { user_id: string } | undefined
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    if (existing.user_id !== userId)
      return reply.code(403).send({ error: 'Forbidden' })

    const inUse = db
      .prepare(
        `SELECT
            (SELECT COUNT(*) FROM clients WHERE default_tax_rate_id = ?) +
            (SELECT COUNT(*) FROM invoice_items WHERE tax_rate_id = ?)
          AS cnt`,
      )
      .get(id, id) as { cnt: number }
    if (inUse.cnt > 0) {
      return reply.code(409).send({
        error: 'Tax rate is in use by clients or invoice items',
        usagesCount: inUse.cnt,
      })
    }

    db.prepare('DELETE FROM tax_rates WHERE id = ?').run(id)

    recordAudit(db, {
      actorUserId: userId,
      action: 'tax_rate.deleted',
      entityType: 'tax_rate',
      entityId: id,
    })

    return reply.code(204).send()
  })
}
