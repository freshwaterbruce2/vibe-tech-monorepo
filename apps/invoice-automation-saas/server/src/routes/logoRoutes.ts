import multipart from '@fastify/multipart'
import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import fs from 'node:fs'
import path from 'node:path'

import { recordAudit } from '../audit.js'
import type { AuthenticatedRequest } from './types.js'

const DEFAULT_LOGO_DIR = 'D:\\data\\invoiceflow\\logos'
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
])
const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
}
const MAX_BYTES = 2 * 1024 * 1024

const getLogoDir = (): string => process.env.LOGO_DIR ?? DEFAULT_LOGO_DIR

export const registerLogoRoutes = async (
  app: FastifyInstance,
  db: Database.Database,
): Promise<void> => {
  await app.register(async (instance) => {
    await instance.register(multipart, {
      limits: { fileSize: MAX_BYTES, files: 1 },
    })

    instance.post('/api/users/me/logo', async (req, reply) => {
      const userId = (req as AuthenticatedRequest).authUserId
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

      const file = await req.file()
      if (!file) return reply.code(400).send({ error: 'logo file is required' })

      const mime = file.mimetype.toLowerCase()
      if (!ALLOWED_MIME.has(mime)) {
        return reply.code(415).send({
          error: `unsupported mime type ${mime}; allowed: ${Array.from(ALLOWED_MIME).join(', ')}`,
        })
      }

      const ext = EXT_BY_MIME[mime] ?? 'bin'
      const dir = getLogoDir()
      fs.mkdirSync(dir, { recursive: true })

      const target = path.join(dir, `${userId}.${ext}`)
      const buf = await file.toBuffer()
      if (buf.length > MAX_BYTES) {
        return reply.code(413).send({ error: 'logo exceeds size limit' })
      }
      fs.writeFileSync(target, buf)

      db.prepare('UPDATE users SET logo_path = ?, updated_at = ? WHERE id = ?').run(
        target,
        new Date().toISOString(),
        userId,
      )

      recordAudit(db, {
        actorUserId: userId,
        action: 'user.logo.updated',
        entityType: 'user',
        entityId: userId,
        metadata: { mime, bytes: buf.length },
      })

      return { logoPath: target }
    })

    instance.delete('/api/users/me/logo', async (req, reply) => {
      const userId = (req as AuthenticatedRequest).authUserId
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

      const row = db
        .prepare('SELECT logo_path FROM users WHERE id = ?')
        .get(userId) as { logo_path: string | null } | undefined
      if (row?.logo_path && fs.existsSync(row.logo_path)) {
        try {
          fs.unlinkSync(row.logo_path)
        } catch {
          // tolerate already-deleted file; we still clear the DB pointer below
        }
      }

      db.prepare('UPDATE users SET logo_path = NULL, updated_at = ? WHERE id = ?').run(
        new Date().toISOString(),
        userId,
      )

      recordAudit(db, {
        actorUserId: userId,
        action: 'user.logo.deleted',
        entityType: 'user',
        entityId: userId,
      })

      return reply.code(204).send()
    })
  })
}
