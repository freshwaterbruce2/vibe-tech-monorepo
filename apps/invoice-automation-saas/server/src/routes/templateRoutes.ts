import type Database from 'better-sqlite3'
import crypto from 'crypto'
import type { FastifyInstance } from 'fastify'

import { recordAudit } from '../audit.js'
import { isTemplateBase, TEMPLATE_BASES } from '../pdf/registry.js'
import { renderInvoicePdfBuffer } from '../pdf/render.js'
import type { TemplateBase, TemplateConfig } from '../pdf/templates/types.js'
import type { AuthenticatedRequest, IdParams } from './types.js'

const nowIso = () => new Date().toISOString()

interface TemplateRow {
  id: string
  user_id: string | null
  name: string
  base_template: string
  config_json: string
  is_default: number
  created_at: string
  updated_at: string
}

interface CreateTemplateBody {
  name?: unknown
  baseTemplate?: unknown
  config?: unknown
  isDefault?: unknown
}

interface PatchTemplateBody {
  name?: unknown
  baseTemplate?: unknown
  config?: unknown
  isDefault?: unknown
}

interface PreviewBody {
  baseTemplate?: unknown
  config?: unknown
}

const toApi = (row: TemplateRow) => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  baseTemplate: row.base_template as TemplateBase,
  config: JSON.parse(row.config_json) as TemplateConfig,
  isDefault: row.is_default === 1,
  builtIn: row.user_id === null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const parseConfig = (raw: unknown): TemplateConfig => {
  if (raw === undefined || raw === null) return {}
  if (typeof raw !== 'object') throw new Error('config must be an object')
  return raw as TemplateConfig
}

const SAMPLE_PREVIEW_DATA = {
  invoiceNumber: 'PREVIEW-001',
  issueDate: '2026-05-03',
  dueDate: '2026-06-02',
  client: {
    name: 'Sample Client',
    email: 'client@example.com',
    company: 'Sample Co',
    address: '123 Sample St',
  },
  subtotal: 1500,
  tax: 150,
  total: 1650,
  currency: 'USD',
  notes: 'Thank you for your business.',
  terms: 'Net 30',
  companyName: 'Your Company',
}

const SAMPLE_PREVIEW_ITEMS = [
  { description: 'Consulting services', quantity: 10, unitPrice: 100, total: 1000 },
  { description: 'Design revisions', quantity: 5, unitPrice: 100, total: 500 },
]

export const registerTemplateRoutes = (
  app: FastifyInstance,
  db: Database.Database,
): void => {
  app.get('/api/templates', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const rows = db
      .prepare(
        `SELECT * FROM invoice_templates
          WHERE user_id IS NULL OR user_id = ?
          ORDER BY user_id IS NULL DESC, created_at ASC`,
      )
      .all(userId) as TemplateRow[]

    return { templates: rows.map(toApi) }
  })

  app.post('/api/templates', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const body = (req.body ?? {}) as CreateTemplateBody
    const name = String(body.name ?? '').trim()
    if (!name) return reply.code(400).send({ error: 'name is required' })

    if (!isTemplateBase(body.baseTemplate)) {
      return reply.code(400).send({
        error: `baseTemplate must be one of ${TEMPLATE_BASES.join(', ')}`,
      })
    }

    let config: TemplateConfig
    try {
      config = parseConfig(body.config)
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message })
    }

    const isDefault = body.isDefault === true

    const id = crypto.randomUUID()
    const now = nowIso()

    const tx = db.transaction(() => {
      if (isDefault) {
        db.prepare(
          `UPDATE invoice_templates SET is_default = 0, updated_at = ? WHERE user_id = ?`,
        ).run(now, userId)
      }
      db.prepare(
        `INSERT INTO invoice_templates
           (id, user_id, name, base_template, config_json, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        userId,
        name,
        body.baseTemplate,
        JSON.stringify(config),
        isDefault ? 1 : 0,
        now,
        now,
      )
    })
    tx()

    recordAudit(db, {
      actorUserId: userId,
      action: 'template.created',
      entityType: 'invoice_template',
      entityId: id,
      metadata: { name, baseTemplate: body.baseTemplate, isDefault },
    })

    const row = db
      .prepare('SELECT * FROM invoice_templates WHERE id = ?')
      .get(id) as TemplateRow
    return reply.code(201).send({ template: toApi(row) })
  })

  app.patch('/api/templates/:id', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const id = (req.params as IdParams).id
    const existing = db
      .prepare('SELECT * FROM invoice_templates WHERE id = ?')
      .get(id) as TemplateRow | undefined
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    if (existing.user_id === null)
      return reply.code(403).send({ error: 'Built-in templates are read-only' })
    if (existing.user_id !== userId)
      return reply.code(403).send({ error: 'Forbidden' })

    const body = (req.body ?? {}) as PatchTemplateBody
    const updates: string[] = []
    const params: unknown[] = []

    if (body.name !== undefined) {
      const name = String(body.name ?? '').trim()
      if (!name) return reply.code(400).send({ error: 'name cannot be empty' })
      updates.push('name = ?')
      params.push(name)
    }
    if (body.baseTemplate !== undefined) {
      if (!isTemplateBase(body.baseTemplate))
        return reply.code(400).send({
          error: `baseTemplate must be one of ${TEMPLATE_BASES.join(', ')}`,
        })
      updates.push('base_template = ?')
      params.push(body.baseTemplate)
    }
    if (body.config !== undefined) {
      let config: TemplateConfig
      try {
        config = parseConfig(body.config)
      } catch (e) {
        return reply.code(400).send({ error: (e as Error).message })
      }
      updates.push('config_json = ?')
      params.push(JSON.stringify(config))
    }

    const setDefault = body.isDefault === true
    const now = nowIso()
    updates.push('updated_at = ?')
    params.push(now)
    params.push(id)

    const tx = db.transaction(() => {
      if (setDefault) {
        db.prepare(
          `UPDATE invoice_templates SET is_default = 0, updated_at = ? WHERE user_id = ?`,
        ).run(now, userId)
        db.prepare(
          `UPDATE invoice_templates SET is_default = 1 WHERE id = ?`,
        ).run(id)
      } else if (body.isDefault === false) {
        db.prepare(
          `UPDATE invoice_templates SET is_default = 0 WHERE id = ?`,
        ).run(id)
      }
      db.prepare(
        `UPDATE invoice_templates SET ${updates.join(', ')} WHERE id = ?`,
      ).run(...params)
    })
    tx()

    recordAudit(db, {
      actorUserId: userId,
      action: 'template.updated',
      entityType: 'invoice_template',
      entityId: id,
    })

    const row = db
      .prepare('SELECT * FROM invoice_templates WHERE id = ?')
      .get(id) as TemplateRow
    return { template: toApi(row) }
  })

  app.delete('/api/templates/:id', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const id = (req.params as IdParams).id
    const existing = db
      .prepare('SELECT user_id FROM invoice_templates WHERE id = ?')
      .get(id) as { user_id: string | null } | undefined
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    if (existing.user_id === null)
      return reply.code(403).send({ error: 'Built-in templates cannot be deleted' })
    if (existing.user_id !== userId)
      return reply.code(403).send({ error: 'Forbidden' })

    const inUse = db
      .prepare('SELECT COUNT(*) AS cnt FROM invoices WHERE template_id = ?')
      .get(id) as { cnt: number }
    if (inUse.cnt > 0) {
      return reply.code(409).send({
        error: 'Template is in use by one or more invoices',
        invoicesUsing: inUse.cnt,
      })
    }

    db.prepare('DELETE FROM invoice_templates WHERE id = ?').run(id)

    recordAudit(db, {
      actorUserId: userId,
      action: 'template.deleted',
      entityType: 'invoice_template',
      entityId: id,
    })

    return reply.code(204).send()
  })

  app.post('/api/templates/preview', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const body = (req.body ?? {}) as PreviewBody
    if (!isTemplateBase(body.baseTemplate))
      return reply.code(400).send({
        error: `baseTemplate must be one of ${TEMPLATE_BASES.join(', ')}`,
      })

    let config: TemplateConfig
    try {
      config = parseConfig(body.config)
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message })
    }

    const buf = await renderInvoicePdfBuffer(SAMPLE_PREVIEW_DATA, SAMPLE_PREVIEW_ITEMS, {
      template: body.baseTemplate,
      config,
    })

    return reply
      .code(200)
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', 'inline; filename="preview.pdf"')
      .send(buf)
  })
}
