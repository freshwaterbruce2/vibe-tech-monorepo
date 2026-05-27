import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'

import { archiveDLQJob, listDLQJobs, retryDLQJob } from '../dlq.js'

export async function registerDLQRoutes(parent: FastifyInstance, db: Database.Database) {
  await parent.register(async (app) => {
    // List unresolved DLQ jobs
    app.get('/api/dlq', async (req) => {
      const query = (req.query ?? {}) as { limit?: number | string }
      const limit = Number(query.limit ?? 50)
      const jobs = listDLQJobs(db, limit)
      return { jobs }
    })

    // Retry a DLQ job (moves it back to pending)
    app.post('/api/dlq/:id/retry', async (req, reply) => {
      const { id } = req.params as { id: string }
      const newJobId = retryDLQJob(db, id)
      if (!newJobId) {
        return reply.code(404).send({ error: 'DLQ job not found or already resolved' })
      }
      return { ok: true, newJobId }
    })

    // Archive a DLQ job (mark as permanently ignored)
    app.post('/api/dlq/:id/archive', async (req) => {
      const { id } = req.params as { id: string }
      const { notes } = req.body as { notes?: string }
      archiveDLQJob(db, id, notes)
      return { ok: true }
    })
  })
}
