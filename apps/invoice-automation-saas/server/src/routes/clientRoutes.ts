import crypto from 'crypto'
import type { FastifyInstance } from 'fastify'

const nowIso = () => new Date().toISOString()
const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const registerClientRoutes = (app: FastifyInstance, db: Database) => {
  app.get('/api/clients', async (req, reply) => {
    const userId = (req as any).authUserId as string | undefined
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const rows = db
      .prepare('select * from clients where user_id = ? order by updated_at desc')
      .all(userId) as any[]

    return {
      clients: rows.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone ?? undefined,
        company: c.company ?? undefined,
        address: c.address ?? undefined,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    }
  })

  app.post('/api/clients', async (req, reply) => {
    const userId = (req as any).authUserId as string | undefined
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const body = (req.body ?? {}) as any
    const name = String(body.name ?? '').trim()
    const email = normalizeEmail(String(body.email ?? ''))

    if (!name) return reply.code(400).send({ error: 'name is required' })
    if (!email.includes('@')) return reply.code(400).send({ error: 'email is invalid' })

    const existing = db
      .prepare('select id from clients where user_id = ? and email = ?')
      .get(userId, email) as any
    if (existing) return reply.code(409).send({ error: 'Client with this email already exists' })

    const id = crypto.randomUUID()
    const now = nowIso()
    db.prepare(
      'insert into clients (id, user_id, name, email, phone, company, address, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      id,
      userId,
      name,
      email,
      body.phone ? String(body.phone) : null,
      body.company ? String(body.company) : null,
      body.address ? String(body.address) : null,
      now,
      now
    )

    const row = db.prepare('select * from clients where id = ?').get(id) as any
    return {
      client: {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone ?? undefined,
        company: row.company ?? undefined,
        address: row.address ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    }
  })

  app.patch('/api/clients/:id', async (req, reply) => {
    const userId = (req as any).authUserId as string | undefined
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const id = (req.params as any).id as string
    const row = db.prepare('select user_id from clients where id = ?').get(id) as any
    if (!row) return reply.code(404).send({ error: 'Not found' })
    if (row.user_id !== userId) return reply.code(403).send({ error: 'Forbidden' })

    const body = (req.body ?? {}) as any
    db.prepare(
      'update clients set name = coalesce(?, name), email = coalesce(?, email), phone = coalesce(?, phone), company = coalesce(?, company), address = coalesce(?, address), updated_at = ? where id = ?'
    ).run(
      body.name ? String(body.name).trim() : null,
      body.email ? normalizeEmail(String(body.email)) : null,
      body.phone !== undefined ? (body.phone ? String(body.phone) : null) : null,
      body.company !== undefined ? (body.company ? String(body.company) : null) : null,
      body.address !== undefined ? (body.address ? String(body.address) : null) : null,
      nowIso(),
      id
    )

    const updated = db.prepare('select * from clients where id = ?').get(id) as any
    return {
      client: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone ?? undefined,
        company: updated.company ?? undefined,
        address: updated.address ?? undefined,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    }
  })

  app.delete('/api/clients/:id', async (req, reply) => {
    const userId = (req as any).authUserId as string | undefined
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const id = (req.params as any).id as string
    const row = db.prepare('select user_id from clients where id = ?').get(id) as any
    if (!row) return reply.code(404).send({ error: 'Not found' })
    if (row.user_id !== userId) return reply.code(403).send({ error: 'Forbidden' })

    const invoiceCount = db
      .prepare('select count(*) as cnt from invoices where client_id = ?')
      .get(id) as any
    if (invoiceCount.cnt > 0) {
      return reply.code(409).send({
        error: `Cannot delete client — ${invoiceCount.cnt} invoice(s) are linked to this client`,
      })
    }

    db.prepare('delete from clients where id = ?').run(id)
    return { ok: true }
  })
}
