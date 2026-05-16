import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'

import { recordAudit } from '../audit.js'
import {
  advanceDate,
  type Frequency,
} from '../recurring/scheduler.js'

interface AuthRequest {
  authUserId?: string
}

interface ScheduleRow {
  id: string
  user_id: string
  template_invoice_id: string
  frequency: Frequency
  interval_count: number
  next_run_at: string
  end_type: string
  end_date: string | null
  occurrences_remaining: number | null
  status: string
  created_at: string
  updated_at: string
}

const VALID_FREQUENCIES = new Set<Frequency>([
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
])

const VALID_END_TYPES = new Set(['never', 'date', 'occurrences'])
const VALID_STATUSES = new Set(['active', 'paused', 'ended'])

export interface CreateScheduleInput {
  userId: string
  templateInvoiceId: string
  frequency: Frequency
  intervalCount?: number
  endType?: 'never' | 'date' | 'occurrences'
  endDate?: string | null
  occurrencesRemaining?: number | null
  startAt?: Date
}

export const createRecurringSchedule = (
  db: Database.Database,
  input: CreateScheduleInput,
): ScheduleRow => {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const interval = input.intervalCount ?? 1
  const startAt = input.startAt ?? new Date()
  const nextRunAt = advanceDate(startAt, input.frequency, interval).toISOString()

  db.prepare(
    `INSERT INTO recurring_schedules
       (id, user_id, template_invoice_id, frequency, interval_count,
        next_run_at, end_type, end_date, occurrences_remaining, status,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
  ).run(
    id,
    input.userId,
    input.templateInvoiceId,
    input.frequency,
    interval,
    nextRunAt,
    input.endType ?? 'never',
    input.endDate ?? null,
    input.occurrencesRemaining ?? null,
    now,
    now,
  )

  return db
    .prepare('SELECT * FROM recurring_schedules WHERE id = ?')
    .get(id) as ScheduleRow
}

export const registerRecurringRoutes = (
  app: FastifyInstance,
  db: Database.Database,
): void => {
  app.get('/api/recurring', async (req, reply) => {
    const userId = (req as AuthRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const rows = db
      .prepare(
        `SELECT * FROM recurring_schedules
          WHERE user_id = ?
          ORDER BY next_run_at ASC`,
      )
      .all(userId) as ScheduleRow[]
    return { schedules: rows }
  })

  app.patch('/api/recurring/:id', async (req, reply) => {
    const userId = (req as AuthRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const id = (req.params as { id: string }).id
    const body = (req.body ?? {}) as {
      status?: string
      next_run_at?: string
      frequency?: string
      interval_count?: number
      end_type?: string
      end_date?: string | null
      occurrences_remaining?: number | null
    }

    const existing = db
      .prepare('SELECT user_id FROM recurring_schedules WHERE id = ?')
      .get(id) as { user_id: string } | undefined
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    if (existing.user_id !== userId)
      return reply.code(403).send({ error: 'Forbidden' })

    if (body.status && !VALID_STATUSES.has(body.status)) {
      return reply.code(400).send({ error: 'Invalid status' })
    }
    if (body.frequency && !VALID_FREQUENCIES.has(body.frequency as Frequency)) {
      return reply.code(400).send({ error: 'Invalid frequency' })
    }
    if (body.end_type && !VALID_END_TYPES.has(body.end_type)) {
      return reply.code(400).send({ error: 'Invalid end_type' })
    }

    const sets: string[] = []
    const params: unknown[] = []
    if (body.status !== undefined) {
      sets.push('status = ?')
      params.push(body.status)
    }
    if (body.next_run_at !== undefined) {
      sets.push('next_run_at = ?')
      params.push(body.next_run_at)
    }
    if (body.frequency !== undefined) {
      sets.push('frequency = ?')
      params.push(body.frequency)
    }
    if (body.interval_count !== undefined) {
      sets.push('interval_count = ?')
      params.push(body.interval_count)
    }
    if (body.end_type !== undefined) {
      sets.push('end_type = ?')
      params.push(body.end_type)
    }
    if (body.end_date !== undefined) {
      sets.push('end_date = ?')
      params.push(body.end_date)
    }
    if (body.occurrences_remaining !== undefined) {
      sets.push('occurrences_remaining = ?')
      params.push(body.occurrences_remaining)
    }

    if (sets.length === 0) {
      return reply.code(400).send({ error: 'No fields to update' })
    }

    sets.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)

    db.prepare(
      `UPDATE recurring_schedules SET ${sets.join(', ')} WHERE id = ?`,
    ).run(...params)

    recordAudit(db, {
      action: 'recurring.updated',
      entityType: 'recurring_schedule',
      entityId: id,
      actorUserId: userId,
      metadata: body,
    })

    const updated = db
      .prepare('SELECT * FROM recurring_schedules WHERE id = ?')
      .get(id) as ScheduleRow
    return { schedule: updated }
  })

  app.delete('/api/recurring/:id', async (req, reply) => {
    const userId = (req as AuthRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const id = (req.params as { id: string }).id
    const existing = db
      .prepare('SELECT user_id FROM recurring_schedules WHERE id = ?')
      .get(id) as { user_id: string } | undefined
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    if (existing.user_id !== userId)
      return reply.code(403).send({ error: 'Forbidden' })

    db.prepare(
      `UPDATE recurring_schedules
          SET status = 'ended', updated_at = ?
        WHERE id = ?`,
    ).run(new Date().toISOString(), id)

    recordAudit(db, {
      action: 'recurring.ended',
      entityType: 'recurring_schedule',
      entityId: id,
      actorUserId: userId,
    })

    return reply.code(204).send()
  })
}
