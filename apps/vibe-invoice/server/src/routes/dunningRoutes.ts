import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'

import { recordAudit } from '../audit.js'
import {
  draftPaymentReminder,
  type ReminderTone,
  type SmartDraftInput,
} from '../clients/aiGateway.js'
import {
  getPolicy,
  upsertPolicy,
  type DunningReminder,
} from '../dunning/policy.js'
import { sendDraftReminder } from '../email/send.js'

interface AuthRequest {
  authUserId?: string
}

interface SmartDraftBody {
  invoiceId?: string
  overdueDays?: number
  amount?: number
  currency?: string
  clientName?: string
  companyName?: string
  invoiceNumber?: string
  dueDate?: string
  tone?: ReminderTone
  customInstructions?: string
}

interface InvoiceDetailRow {
  id: string
  invoice_number: string
  total: number
  currency: string
  due_date: string
  status: string
  client_name: string
  client_email: string
  client_company: string | null
  user_full_name: string | null
  user_company_name: string | null
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

  /**
   * AI Smart-Drafting endpoint for payment reminder emails / dunning notices.
   * Leverages the centralized Vibe AI Gateway with automatic resilience & template fallback.
   */
  app.post('/api/dunning/smart-draft', async (req, reply) => {
    const userId = (req as AuthRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const body = (req.body ?? {}) as SmartDraftBody

    let draftInput: SmartDraftInput

    if (body.invoiceId) {
      const row = db
        .prepare(
          `SELECT i.id, i.invoice_number, i.total, i.currency, i.due_date, i.status,
                  c.name AS client_name, c.email AS client_email, c.company AS client_company,
                  u.full_name AS user_full_name, u.company_name AS user_company_name
             FROM invoices i
             JOIN clients c ON c.id = i.client_id
             JOIN users u ON u.id = i.user_id
            WHERE i.id = ? AND i.user_id = ?`,
        )
        .get(body.invoiceId, userId) as InvoiceDetailRow | undefined

      if (!row) {
        return reply.code(404).send({ error: 'Invoice not found' })
      }

      let overdueDays = body.overdueDays
      if (typeof overdueDays !== 'number') {
        const dueTime = new Date(row.due_date).getTime()
        const diffDays = Math.floor((Date.now() - dueTime) / (1000 * 60 * 60 * 24))
        overdueDays = Math.max(0, diffDays)
      }

      draftInput = {
        invoiceNumber: row.invoice_number,
        amount: typeof body.amount === 'number' ? body.amount : row.total,
        currency: body.currency || row.currency || 'USD',
        overdueDays,
        clientName: body.clientName || row.client_name,
        companyName: body.companyName || row.user_company_name || row.user_full_name || undefined,
        dueDate: row.due_date,
        tone: body.tone,
        customInstructions: body.customInstructions,
      }
    } else {
      if (typeof body.amount !== 'number') {
        return reply.code(400).send({ error: 'Either invoiceId or amount is required' })
      }
      if (typeof body.overdueDays !== 'number') {
        return reply.code(400).send({ error: 'Either invoiceId or overdueDays is required' })
      }

      draftInput = {
        invoiceNumber: body.invoiceNumber || 'INV-0001',
        amount: body.amount,
        currency: body.currency || 'USD',
        overdueDays: body.overdueDays,
        clientName: body.clientName || 'Valued Client',
        companyName: body.companyName,
        dueDate: body.dueDate,
        tone: body.tone,
        customInstructions: body.customInstructions,
      }
    }

    try {
      const draft = await draftPaymentReminder(draftInput)

      recordAudit(db, {
        action: 'dunning.smart_draft_generated',
        entityType: 'dunning_draft',
        entityId: body.invoiceId || 'custom',
        actorUserId: userId,
        metadata: {
          invoiceNumber: draftInput.invoiceNumber,
          overdueDays: draftInput.overdueDays,
          amount: draftInput.amount,
          tone: draft.suggestedTone,
          fallbackUsed: draft.fallbackUsed,
        },
      })

      return { draft }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return reply.code(500).send({ error: `Failed to draft reminder: ${msg}` })
    }
  })

  /**
   * Send an AI-generated or custom payment reminder email to the client for an overdue invoice.
   */
  app.post('/api/dunning/send-reminder', async (req, reply) => {
    const userId = (req as AuthRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const body = (req.body ?? {}) as {
      invoiceId?: string
      subject?: string
      body?: string
    }

    if (!body.invoiceId || !body.subject || !body.body) {
      return reply.code(400).send({ error: 'invoiceId, subject, and body are required' })
    }

    const row = db
      .prepare('SELECT id, user_id FROM invoices WHERE id = ?')
      .get(body.invoiceId) as { id: string; user_id: string } | undefined

    if (row?.user_id !== userId) {
      return reply.code(404).send({ error: 'Invoice not found' })
    }

    try {
      const result = await sendDraftReminder(db, body.invoiceId, body.subject, body.body)
      recordAudit(db, {
        action: 'dunning.reminder_sent',
        entityType: 'invoice',
        entityId: body.invoiceId,
        actorUserId: userId,
        metadata: { subject: body.subject, emailLogId: result.emailLogId },
      })
      return { ok: true, emailLogId: result.emailLogId }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return reply.code(500).send({ error: `Failed to send email: ${msg}` })
    }
  })
}
