// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
  buildFallbackDraft,
  determineTone,
  draftPaymentReminder,
  type SmartDraftInput,
} from './aiGateway.js'
import type { VibeAIClient } from '../shared/ai-client/index.js'

describe('aiGateway client tests', () => {
  it('correctly determines tone based on overdue days', () => {
    expect(determineTone(3)).toBe('friendly')
    expect(determineTone(7)).toBe('friendly')
    expect(determineTone(8)).toBe('firm')
    expect(determineTone(21)).toBe('firm')
    expect(determineTone(30)).toBe('urgent')
    expect(determineTone(45)).toBe('urgent')
    expect(determineTone(60)).toBe('final_notice')
    expect(determineTone(3, 'urgent')).toBe('urgent')
  })

  it('builds high-quality deterministic fallback drafts', () => {
    const input: SmartDraftInput = {
      invoiceNumber: 'INV-101',
      amount: 1500,
      currency: 'USD',
      overdueDays: 10,
      clientName: 'Acme Corp',
      companyName: 'Studio Vibe',
      dueDate: '2026-08-31',
    }

    const friendly = buildFallbackDraft(input, 'friendly')
    expect(friendly.subject).toContain('INV-101')
    expect(friendly.suggestedTone).toBe('friendly')
    expect(friendly.fallbackUsed).toBe(true)

    const firm = buildFallbackDraft(input, 'firm')
    expect(firm.subject).toContain('Past Due')
    expect(firm.body).toContain('10 days overdue')
    expect(firm.suggestedTone).toBe('firm')
    expect(firm.fallbackUsed).toBe(true)

    const urgent = buildFallbackDraft(input, 'urgent')
    expect(urgent.subject).toContain('Urgent')
    expect(urgent.suggestedTone).toBe('urgent')

    const finalNotice = buildFallbackDraft(input, 'final_notice')
    expect(finalNotice.subject).toContain('FINAL NOTICE')
    expect(finalNotice.suggestedTone).toBe('final_notice')
  })

  it('successfully generates AI draft via VibeAIClient mock', async () => {
    const mockClient = {
      generateText: vi.fn().mockResolvedValue(
        JSON.stringify({
          subject: 'Friendly follow-up regarding invoice INV-202',
          headline: 'Invoice INV-202 Payment Follow-Up',
          body: 'Hi Jane, just checking in on invoice INV-202 for $500.00.',
          suggestedTone: 'friendly',
          overdueDays: 5,
          amount: 500,
          currency: 'USD',
          callToAction: 'Pay Invoice Online',
        }),
      ),
    } as unknown as VibeAIClient

    const result = await draftPaymentReminder(
      {
        invoiceNumber: 'INV-202',
        amount: 500,
        currency: 'USD',
        overdueDays: 5,
        clientName: 'Jane Doe',
      },
      mockClient,
    )

    expect(result.fallbackUsed).toBe(false)
    expect(result.subject).toBe('Friendly follow-up regarding invoice INV-202')
    expect(result.callToAction).toBe('Pay Invoice Online')
    expect(mockClient.generateText).toHaveBeenCalled()
  })

  it('gracefully strips markdown backticks from AI Gateway response', async () => {
    const mockClient = {
      generateText: vi.fn().mockResolvedValue(
        '```json\n' +
          JSON.stringify({
            subject: 'Important: Invoice INV-303 Overdue',
            headline: 'Overdue notice for INV-303',
            body: 'Dear Team, Invoice INV-303 is 15 days past due.',
            suggestedTone: 'firm',
            overdueDays: 15,
            amount: 2400,
            currency: 'USD',
            callToAction: 'Submit Payment',
          }) +
          '\n```',
      ),
    } as unknown as VibeAIClient

    const result = await draftPaymentReminder(
      {
        invoiceNumber: 'INV-303',
        amount: 2400,
        overdueDays: 15,
        clientName: 'Big Co',
      },
      mockClient,
    )

    expect(result.fallbackUsed).toBe(false)
    expect(result.subject).toBe('Important: Invoice INV-303 Overdue')
    expect(result.suggestedTone).toBe('firm')
  })

  it('gracefully falls back if VibeAIClient throws', async () => {
    const mockClient = {
      generateText: vi.fn().mockRejectedValue(new Error('Gateway timeout')),
    } as unknown as VibeAIClient

    const result = await draftPaymentReminder(
      {
        invoiceNumber: 'INV-404',
        amount: 800,
        currency: 'EUR',
        overdueDays: 12,
        clientName: 'European Partners',
      },
      mockClient,
    )

    expect(result.fallbackUsed).toBe(true)
    expect(result.subject).toContain('INV-404')
    expect(result.suggestedTone).toBe('firm')
    expect(result.amount).toBe(800)
    expect(result.currency).toBe('EUR')
  })
})
