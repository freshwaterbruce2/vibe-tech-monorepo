import type Database from 'better-sqlite3'
import crypto from 'crypto'
import type { FastifyInstance } from 'fastify'

import { recordAudit } from '../audit.js'
import type { AuthenticatedRequest, IdParams } from './types.js'

const nowIso = () => new Date().toISOString()

interface ProjectRow {
  id: string
  user_id: string
  client_id: string | null
  name: string
  hourly_rate: number | null
  currency: string
  status: string
  created_at: string
  updated_at: string
}

const toApi = (row: ProjectRow) => ({
  id: row.id,
  clientId: row.client_id,
  name: row.name,
  hourlyRate: row.hourly_rate,
  currency: row.currency,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const registerProjectRoutes = (
  app: FastifyInstance,
  db: Database.Database,
): void => {
  app.get('/api/projects', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const rows = db
      .prepare(
        `SELECT * FROM projects WHERE user_id = ? ORDER BY status ASC, name ASC`,
      )
      .all(userId) as ProjectRow[]
    return { projects: rows.map(toApi) }
  })

  app.post('/api/projects', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const body = (req.body ?? {}) as Record<string, unknown>
    const name = String(body.name ?? '').trim()
    if (!name) return reply.code(400).send({ error: 'name is required' })
    const clientId = body.clientId ? String(body.clientId) : null
    const currency = String(body.currency ?? 'USD').toUpperCase()
    const hourlyRate =
      body.hourlyRate === undefined || body.hourlyRate === null
        ? null
        : Number(body.hourlyRate)
    if (hourlyRate !== null && (!Number.isFinite(hourlyRate) || hourlyRate < 0))
      return reply.code(400).send({ error: 'hourlyRate must be >= 0' })

    const id = crypto.randomUUID()
    const now = nowIso()
    db.prepare(
      `INSERT INTO projects (id, user_id, client_id, name, hourly_rate, currency, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    ).run(id, userId, clientId, name, hourlyRate, currency, now, now)
    recordAudit(db, {
      actorUserId: userId,
      action: 'project.created',
      entityType: 'project',
      entityId: id,
      metadata: { name },
    })
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow
    return reply.code(201).send({ project: toApi(row) })
  })

  app.patch('/api/projects/:id', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const id = (req.params as IdParams).id
    const existing = db
      .prepare('SELECT user_id FROM projects WHERE id = ?')
      .get(id) as { user_id: string } | undefined
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    if (existing.user_id !== userId)
      return reply.code(403).send({ error: 'Forbidden' })

    const body = (req.body ?? {}) as Record<string, unknown>
    const updates: string[] = []
    const params: unknown[] = []
    if (body.name !== undefined) {
      const name = String(body.name ?? '').trim()
      if (!name) return reply.code(400).send({ error: 'name cannot be empty' })
      updates.push('name = ?')
      params.push(name)
    }
    if (body.clientId !== undefined) {
      updates.push('client_id = ?')
      params.push(body.clientId === null ? null : String(body.clientId))
    }
    if (body.currency !== undefined) {
      updates.push('currency = ?')
      params.push(String(body.currency).toUpperCase())
    }
    if (body.hourlyRate !== undefined) {
      const r = body.hourlyRate === null ? null : Number(body.hourlyRate)
      if (r !== null && (!Number.isFinite(r) || r < 0))
        return reply.code(400).send({ error: 'hourlyRate must be >= 0' })
      updates.push('hourly_rate = ?')
      params.push(r)
    }
    if (body.status !== undefined) {
      const s = String(body.status)
      if (!['active', 'archived'].includes(s))
        return reply.code(400).send({ error: 'status must be active or archived' })
      updates.push('status = ?')
      params.push(s)
    }
    if (updates.length === 0)
      return reply.code(400).send({ error: 'no updatable fields' })
    updates.push('updated_at = ?')
    params.push(nowIso())
    params.push(id)
    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params)
    recordAudit(db, {
      actorUserId: userId,
      action: 'project.updated',
      entityType: 'project',
      entityId: id,
    })
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow
    return { project: toApi(row) }
  })

  app.delete('/api/projects/:id', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const id = (req.params as IdParams).id
    const existing = db
      .prepare('SELECT user_id FROM projects WHERE id = ?')
      .get(id) as { user_id: string } | undefined
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    if (existing.user_id !== userId)
      return reply.code(403).send({ error: 'Forbidden' })

    const inUse = db
      .prepare('SELECT COUNT(*) AS cnt FROM time_entries WHERE project_id = ?')
      .get(id) as { cnt: number }
    if (inUse.cnt > 0) {
      return reply.code(409).send({
        error: 'Project has time entries; archive instead',
        timeEntriesCount: inUse.cnt,
      })
    }
    db.prepare('DELETE FROM projects WHERE id = ?').run(id)
    recordAudit(db, {
      actorUserId: userId,
      action: 'project.deleted',
      entityType: 'project',
      entityId: id,
    })
    return reply.code(204).send()
  })
}
