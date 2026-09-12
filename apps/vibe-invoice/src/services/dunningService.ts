import { apiFetch } from '../lib/apiFetch'

export type ReminderTone = 'friendly' | 'firm' | 'urgent' | 'final_notice'

export interface SmartDraftInput {
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

export interface SmartDraftResult {
  subject: string
  headline: string
  body: string
  suggestedTone: ReminderTone
  overdueDays: number
  amount: number
  currency: string
  callToAction: string
  modelUsed?: string
  fallbackUsed?: boolean
}

export const dunningService = {
  async generateSmartDraft(input: SmartDraftInput): Promise<SmartDraftResult> {
    const res = await apiFetch<{ draft: SmartDraftResult }>('/api/dunning/smart-draft', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return res.draft
  },

  async sendReminderEmail(params: {
    invoiceId: string
    subject: string
    body: string
  }): Promise<{ ok: boolean; emailLogId?: string }> {
    return await apiFetch<{ ok: boolean; emailLogId?: string }>('/api/dunning/send-reminder', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
}
