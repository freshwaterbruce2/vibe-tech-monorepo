import type Database from 'better-sqlite3'
import crypto from 'crypto'
import type { FastifyInstance } from 'fastify'

import { recordAudit } from '../audit.js'
import type { AuthenticatedRequest, IdParams } from './types.js'

const nowIso = () => new Date().toISOString()

interface TimeEntryRow {
  id: string
  user_id: string
  project_id: string | null
  client_id: string | null
  description: string | null
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  is_billable: number
  hourly_rate: number | null
  invoiced_on_invoice_id: string | null
  created_at: string
  updated_at: string
}

const toApi = (row: TimeEntryRow) => ({
  id: row.id,
  projectId: row.project_id,
  clientId: row.client_id,
  description: row.description,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  durationSeconds: row.duration_seconds,
  isBillable: row.is_billable === 1,
  hourlyRate: row.hourly_rate,
  invoicedOnInvoiceId: row.invoiced_on_invoice_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const computeDuration = (startedAt: string, endedAt: string): number => {
  const start = new Date(startedAt).getTime()
  const end = new Date(endedAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0
  return Math.floor((end - start) / 1000)
}

export const registerTimeRoutes = (
  app: FastifyInstance,
  db: Database.Database,
): void => {
  app.get('/api/time-entries', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const q = req.query as {
      from?: string
      to?: string
      projectId?: string
      clientId?: string
      unbilled?: string
    }
    const where: string[] = ['user_id = ?']
    const params: unknown[] = [userId]
    if (q.from) {
      where.push('started_at >= ?')
      params.push(q.from)
    }
    if (q.to) {
      where.push('started_at <= ?')
      params.push(q.to)
    }
    if (q.projectId) {
      where.push('project_id = ?')
      params.push(q.projectId)
    }
    if (q.clientId) {
      where.push('client_id = ?')
      params.push(q.clientId)
    }
    if (q.unbilled === '1' || q.unbilled === 'true') {
      where.push('is_billable = 1 AND invoiced_on_invoice_id IS NULL AND ended_at IS NOT NULL')
    }
    const rows = db
      .prepare(
        `SELECT * FROM time_entries WHERE ${where.join(' AND ')} ORDER BY started_at DESC`,
      )
      .all(...params) as TimeEntryRow[]
    return { timeEntries: rows.map(toApi) }
  })

  app.get('/api/time-entries/running', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const row = db
      .prepare(
        `SELECT * FROM time_entries WHERE user_id = ? AND ended_at IS NULL`,
      )
      .get(userId) as TimeEntryRow | undefined
    return { running: row ? toApi(row) : null }
  })

  app.post('/api/time-entries/start', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const body = (req.body ?? {}) as Record<string, unknown>
    const projectId = body.projectId ? String(body.projectId) : null
    const description = body.description ? String(body.description) : null

    let projectClientId: string | null = null
    let projectRate: number | null = null
    if (projectId) {
      const p = db
        .prepare('SELECT user_id, client_id, hourly_rate FROM projects WHERE id = ?')
        .get(projectId) as { user_id: string; client_id: string | null; hourly_rate: number | null } | undefined
      if (!p) return reply.code(400).send({ error: 'projectId not found' })
      if (p.user_id !== userId) return reply.code(403).send({ error: 'Forbidden' })
      projectClientId = p.client_id
      projectRate = p.hourly_rate
    }

    const id = crypto.randomUUID()
    const now = nowIso()
    try {
      db.prepare(
        `INSERT INTO time_entries
           (id, user_id, project_id, client_id, description, started_at,
            is_billable, hourly_rate, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      ).run(id, userId, projectId, projectClientId, description, now, projectRate, now, now)
    } catch (e) {
      const err = e as Error & { code?: string }
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return reply.code(409).send({ error: 'A timer is already running' })
      }
      throw err
    }

    recordAudit(db, {
      actorUserId: userId,
      action: 'time.started',
      entityType: 'time_entry',
      entityId: id,
      metadata: { projectId },
    })

    const row = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id) as TimeEntryRow
    return reply.code(201).send({ timeEntry: toApi(row) })
  })

  app.post('/api/time-entries/:id/stop', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const id = (req.params as IdParams).id

    const row = db
      .prepare('SELECT * FROM time_entries WHERE id = ?')
      .get(id) as TimeEntryRow | undefined
    if (!row) return reply.code(404).send({ error: 'Not found' })
    if (row.user_id !== userId) return reply.code(403).send({ error: 'Forbidden' })
    if (row.ended_at)
      return reply.code(409).send({ error: 'Entry already stopped' })

    const endedAt = nowIso()
    const duration = computeDuration(row.started_at, endedAt)
    db.prepare(
      `UPDATE time_entries SET ended_at = ?, duration_seconds = ?, updated_at = ? WHERE id = ?`,
    ).run(endedAt, duration, endedAt, id)
    recordAudit(db, {
      actorUserId: userId,
      action: 'time.stopped',
      entityType: 'time_entry',
      entityId: id,
      metadata: { durationSeconds: duration },
    })
    const updated = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id) as TimeEntryRow
    return { timeEntry: toApi(updated) }
  })

  // Manual entry: full started_at + ended_at provided.
  app.post('/api/time-entries', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const body = (req.body ?? {}) as Record<string, unknown>
    const startedAt = body.startedAt ? String(body.startedAt) : ''
    const endedAt = body.endedAt ? String(body.endedAt) : ''
    if (!startedAt || !endedAt)
      return reply.code(400).send({ error: 'startedAt and endedAt are required' })
    const projectId = body.projectId ? String(body.projectId) : null
    const description = body.description ? String(body.description) : null
    const isBillable = body.isBillable === false ? 0 : 1

    let projectClientId: string | null = null
    let projectRate: number | null = null
    if (projectId) {
      const p = db
        .prepare('SELECT user_id, client_id, hourly_rate FROM projects WHERE id = ?')
        .get(projectId) as { user_id: string; client_id: string | null; hourly_rate: number | null } | undefined
      if (!p) return reply.code(400).send({ error: 'projectId not found' })
      if (p.user_id !== userId) return reply.code(403).send({ error: 'Forbidden' })
      projectClientId = p.client_id
      projectRate = p.hourly_rate
    }

    const duration = computeDuration(startedAt, endedAt)
    if (duration === 0)
      return reply.code(400).send({ error: 'endedAt must be after startedAt' })
    const id = crypto.randomUUID()
    const now = nowIso()
    db.prepare(
      `INSERT INTO time_entries
         (id, user_id, project_id, client_id, description, started_at, ended_at,
          duration_seconds, is_billable, hourly_rate, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      userId,
      projectId,
      projectClientId,
      description,
      startedAt,
      endedAt,
      duration,
      isBillable,
      projectRate,
      now,
      now,
    )
    recordAudit(db, {
      actorUserId: userId,
      action: 'time.manual_added',
      entityType: 'time_entry',
      entityId: id,
      metadata: { durationSeconds: duration },
    })
    const inserted = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id) as TimeEntryRow
    return reply.code(201).send({ timeEntry: toApi(inserted) })
  })

  app.delete('/api/time-entries/:id', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const id = (req.params as IdParams).id
    const row = db
      .prepare('SELECT user_id, invoiced_on_invoice_id FROM time_entries WHERE id = ?')
      .get(id) as { user_id: string; invoiced_on_invoice_id: string | null } | undefined
    if (!row) return reply.code(404).send({ error: 'Not found' })
    if (row.user_id !== userId) return reply.code(403).send({ error: 'Forbidden' })
    if (row.invoiced_on_invoice_id)
      return reply.code(409).send({
        error: 'Entry has been invoiced; remove the invoice line item first',
      })
    db.prepare('DELETE FROM time_entries WHERE id = ?').run(id)
    recordAudit(db, {
      actorUserId: userId,
      action: 'time.deleted',
      entityType: 'time_entry',
      entityId: id,
    })
    return reply.code(204).send()
  })

  // Roll unbilled entries into a draft invoice as line items grouped by project.
  app.post('/api/invoices/:id/items/from-time', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const invoiceId = (req.params as IdParams).id
    const body = (req.body ?? {}) as { entryIds?: unknown }
    const entryIds = Array.isArray(body.entryIds) ? body.entryIds.map(String) : []
    if (entryIds.length === 0)
      return reply.code(400).send({ error: 'entryIds must be a non-empty array' })

    const inv = db
      .prepare('SELECT user_id, status FROM invoices WHERE id = ?')
      .get(invoiceId) as { user_id: string; status: string } | undefined
    if (!inv) return reply.code(404).send({ error: 'Invoice not found' })
    if (inv.user_id !== userId) return reply.code(403).send({ error: 'Forbidden' })
    if (inv.status !== 'draft')
      return reply.code(409).send({ error: 'Only draft invoices accept new line items' })

    const placeholders = entryIds.map(() => '?').join(',')
    const entries = db
      .prepare(
        `SELECT * FROM time_entries WHERE id IN (${placeholders}) AND user_id = ?`,
      )
      .all(...entryIds, userId) as TimeEntryRow[]
    if (entries.length !== entryIds.length)
      return reply.code(400).send({ error: 'one or more entryIds not owned by user' })

    const ineligible = entries.find(
      (e) => !e.ended_at || e.invoiced_on_invoice_id || !e.is_billable,
    )
    if (ineligible)
      return reply.code(400).send({
        error: 'every entry must be billable, ended, and not already invoiced',
        offendingId: ineligible.id,
      })

    interface Group {
      projectId: string | null
      hours: number
      rate: number
      total: number
      ids: string[]
    }
    const groups = new Map<string, Group>()
    for (const e of entries) {
      const key = e.project_id ?? '__none__'
      const seconds = e.duration_seconds ?? 0
      const hours = seconds / 3600
      const rate = e.hourly_rate ?? 0
      let g = groups.get(key)
      if (!g) {
        g = { projectId: e.project_id, hours: 0, rate, total: 0, ids: [] }
        groups.set(key, g)
      }
      g.hours += hours
      // If a project has multiple entries with different rates, use the latest non-zero rate.
      if (rate > 0) g.rate = rate
      g.ids.push(e.id)
    }

    const projectNames = new Map<string, string>()
    if (groups.size > 0) {
      const ids = Array.from(groups.keys()).filter((k) => k !== '__none__')
      if (ids.length > 0) {
        const ph = ids.map(() => '?').join(',')
        const rows = db
          .prepare(`SELECT id, name FROM projects WHERE id IN (${ph})`)
          .all(...ids) as { id: string; name: string }[]
        for (const r of rows) projectNames.set(r.id, r.name)
      }
    }

    const now = nowIso()
    const created: { itemId: string; projectId: string | null; hours: number; total: number }[] = []

    const tx = db.transaction(() => {
      for (const g of groups.values()) {
        const itemId = crypto.randomUUID()
        const total = +(g.hours * g.rate).toFixed(2)
        const desc = g.projectId
          ? `${projectNames.get(g.projectId) ?? 'Project'} — ${g.hours.toFixed(2)}h`
          : `Time — ${g.hours.toFixed(2)}h`
        db.prepare(
          `INSERT INTO invoice_items
             (id, invoice_id, description, quantity, price, total, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).run(itemId, invoiceId, desc, +g.hours.toFixed(4), g.rate, total, now)
        for (const eid of g.ids) {
          db.prepare(
            `UPDATE time_entries SET invoiced_on_invoice_id = ?, updated_at = ? WHERE id = ?`,
          ).run(invoiceId, now, eid)
        }
        created.push({ itemId, projectId: g.projectId, hours: g.hours, total })
      }
    })
    tx()

    recordAudit(db, {
      actorUserId: userId,
      action: 'time.invoiced',
      entityType: 'invoice',
      entityId: invoiceId,
      metadata: { entryCount: entries.length, groupCount: created.length },
    })
    return reply.code(201).send({ items: created })
  })
}
