import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { Db } from './db.js'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const isoTime = z.string().regex(/^\d{2}:\d{2}$/)

const createPersonBody = z.object({
  name: z.string().trim().min(1).max(64),
})

const createEntryBody = z.object({
  personId: z.string().min(1),
  date: isoDate,
  time: isoTime.optional(),
  symptom: z.string().trim().min(1).max(80),
  severity: z.number().int().min(0).max(10),
  notes: z.string().trim().max(4000).optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(20).optional(),
})

const updateEntryBody = createEntryBody
  .omit({ personId: true })
  .partial()
  .extend({
    date: isoDate.optional(),
    time: isoTime.optional().nullable(),
  })

function nowIso(): string {
  return new Date().toISOString()
}

function randomId(): string {
  return randomUUID()
}

export function buildApiRouter(db: Db): Router {
  const router = Router()
  router.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    next()
  })

  router.get('/health', (_req, res) => {
    res.status(200).send(JSON.stringify({ ok: true }))
  })

  router.get('/people', (_req, res) => {
    const rows = db
      .prepare('SELECT id, name, created_at as createdAt FROM people ORDER BY created_at ASC')
      .all()
    res.status(200).send(JSON.stringify({ people: rows }))
  })

  router.post('/people', (req, res) => {
    const parsed = createPersonBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).send(JSON.stringify({ error: 'Invalid body', details: parsed.error.flatten() }))
      return
    }

    const id = randomId()
    const ts = nowIso()
    db.prepare(
      'INSERT INTO people (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ).run(id, parsed.data.name, ts, ts)

    res.status(201).send(JSON.stringify({ person: { id, name: parsed.data.name } }))
  })

  router.get('/symptoms', (req, res) => {
    const querySchema = z.object({
      personId: z.string().min(1),
      from: isoDate.optional(),
      to: isoDate.optional(),
      q: z.string().trim().max(80).optional(),
    })

    const parsed = querySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).send(JSON.stringify({ error: 'Invalid query', details: parsed.error.flatten() }))
      return
    }

    const { personId, from, to, q } = parsed.data
    const whereParts: string[] = ['person_id = ?']
    const params: Array<string> = [personId]

    if (from) {
      whereParts.push('date >= ?')
      params.push(from)
    }
    if (to) {
      whereParts.push('date <= ?')
      params.push(to)
    }
    if (q) {
      whereParts.push('(symptom LIKE ? OR notes LIKE ?)')
      params.push(`%${q}%`, `%${q}%`)
    }

    const sql = `
      SELECT
        id,
        person_id as personId,
        date,
        time,
        symptom,
        severity,
        notes,
        tags_json as tagsJson,
        created_at as createdAt,
        updated_at as updatedAt
      FROM symptom_entries
      WHERE ${whereParts.join(' AND ')}
      ORDER BY date DESC, created_at DESC
      LIMIT 1000
    `

    const rows = db.prepare(sql).all(...params).map((row: Record<string, unknown>) => {
      const tags = row.tagsJson ? (JSON.parse(row.tagsJson) as unknown) : undefined
      const { tagsJson: _tagsJson, ...rest } = row
      return { ...rest, tags }
    })

    res.status(200).send(JSON.stringify({ entries: rows }))
  })

  router.post('/symptoms', (req, res) => {
    const parsed = createEntryBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).send(JSON.stringify({ error: 'Invalid body', details: parsed.error.flatten() }))
      return
    }

    const person = db.prepare('SELECT id FROM people WHERE id = ?').get(parsed.data.personId)
    if (!person) {
      res.status(404).send(JSON.stringify({ error: 'Unknown personId' }))
      return
    }

    const id = randomId()
    const ts = nowIso()
    const tagsJson = parsed.data.tags ? JSON.stringify(parsed.data.tags) : null

    db.prepare(
      `
        INSERT INTO symptom_entries (
          id, person_id, date, time, symptom, severity, notes, tags_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      id,
      parsed.data.personId,
      parsed.data.date,
      parsed.data.time ?? null,
      parsed.data.symptom,
      parsed.data.severity,
      parsed.data.notes ?? null,
      tagsJson,
      ts,
      ts,
    )

    res.status(201).send(JSON.stringify({ entry: { id } }))
  })

  router.put('/symptoms/:id', (req, res) => {
    const id = req.params.id
    const parsed = updateEntryBody.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).send(JSON.stringify({ error: 'Invalid body', details: parsed.error.flatten() }))
      return
    }

    const existing = db.prepare('SELECT id FROM symptom_entries WHERE id = ?').get(id)
    if (!existing) {
      res.status(404).send(JSON.stringify({ error: 'Not found' }))
      return
    }

    const updates: string[] = []
    const params: Array<unknown> = []

    if (parsed.data.date !== undefined) {
      updates.push('date = ?')
      params.push(parsed.data.date)
    }
    if (parsed.data.time !== undefined) {
      updates.push('time = ?')
      params.push(parsed.data.time ?? null)
    }
    if (parsed.data.symptom !== undefined) {
      updates.push('symptom = ?')
      params.push(parsed.data.symptom)
    }
    if (parsed.data.severity !== undefined) {
      updates.push('severity = ?')
      params.push(parsed.data.severity)
    }
    if (parsed.data.notes !== undefined) {
      updates.push('notes = ?')
      params.push(parsed.data.notes ?? null)
    }
    if (parsed.data.tags !== undefined) {
      updates.push('tags_json = ?')
      params.push(parsed.data.tags ? JSON.stringify(parsed.data.tags) : null)
    }

    updates.push('updated_at = ?')
    params.push(nowIso())

    if (updates.length === 1) {
      res.status(200).send(JSON.stringify({ ok: true }))
      return
    }

    db.prepare(`UPDATE symptom_entries SET ${updates.join(', ')} WHERE id = ?`).run(
      ...(params as unknown[]),
      id,
    )

    res.status(200).send(JSON.stringify({ ok: true }))
  })

  router.delete('/symptoms/:id', (req, res) => {
    const id = req.params.id
    db.prepare('DELETE FROM symptom_entries WHERE id = ?').run(id)
    res.status(200).send(JSON.stringify({ ok: true }))
  })

  router.get('/summary', (req, res) => {
    const querySchema = z.object({
      personId: z.string().min(1),
      from: isoDate.optional(),
      to: isoDate.optional(),
    })
    const parsed = querySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).send(JSON.stringify({ error: 'Invalid query', details: parsed.error.flatten() }))
      return
    }

    const { personId, from, to } = parsed.data
    const whereParts: string[] = ['person_id = ?']
    const params: Array<string> = [personId]
    if (from) {
      whereParts.push('date >= ?')
      params.push(from)
    }
    if (to) {
      whereParts.push('date <= ?')
      params.push(to)
    }

    const rows = db
      .prepare(
        `
          SELECT symptom, COUNT(*) as count, ROUND(AVG(severity), 1) as avgSeverity
          FROM symptom_entries
          WHERE ${whereParts.join(' AND ')}
          GROUP BY symptom
          ORDER BY count DESC, avgSeverity DESC, symptom ASC
          LIMIT 50
        `,
      )
      .all(...params)

    res.status(200).send(JSON.stringify({ summary: rows }))
  })

  return router
}
