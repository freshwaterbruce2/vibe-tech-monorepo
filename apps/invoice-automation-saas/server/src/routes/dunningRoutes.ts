import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'

import { recordAudit } from '../audit.js'
import {
  getPolicy,
  upsertPolicy,
  type DunningReminder,
} from '../dunning/policy.js'

interface AuthRequest {
  authUserId?: string
}

export const registerDunningRoutes = (
  app: FastifyInstance,
  db: Database.Database,
): void => {
  app.get('/api/dunning/policy', async (req, reply) => {
    const userId = (req as AuthRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    return { policy: getPolicy(db, userId) }
  })

  app.put('/api/dunning/policy', async (req, reply) => {
    const userId = (req as AuthRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const body = (req.body ?? {}) as {
      enabled?: boolean
      reminders?: DunningReminder[]
    }
    if (typeof body.enabled !== 'boolean') {
      return reply.code(400).send({ error: 'enabled must be a boolean' })
    }
    if (!Array.isArray(body.reminders)) {
      return reply.code(400).send({ error: 'reminders must be an array' })
    }

    try {
      const policy = upsertPolicy(db, userId, {
        enabled: body.enabled,
        reminders: body.reminders,
      })
      recordAudit(db, {
        action: 'dunning.policy_updated',
        entityType: 'dunning_policy',
        entityId: userId,
        actorUserId: userId,
        metadata: { enabled: policy.enabled, reminders: policy.reminders },
      })
      return { policy }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return reply.code(400).send({ error: msg })
    }
  })
}
