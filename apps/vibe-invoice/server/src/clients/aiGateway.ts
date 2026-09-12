import { VibeAIClient } from '../shared/ai-client/index.js'

export type ReminderTone = 'friendly' | 'firm' | 'urgent' | 'final_notice'

export interface SmartDraftInput {
  invoiceNumber: string
  amount: number
  currency?: string
  overdueDays: number
  clientName: string
  companyName?: string
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

let gatewayClient: VibeAIClient | null = null

export function getGatewayClient(): VibeAIClient {
  gatewayClient ??= new VibeAIClient({
    apiKey: process.env.VIBE_AI_GATEWAY_KEY || 'vibe_sk_invoiceflow_prod',
    baseURL: process.env.VIBE_AI_GATEWAY_URL || 'https://vibe-ai-gateway-734857480460.us-east4.run.app',
    timeoutMs: 15000,
  })
  return gatewayClient
}

export function resetGatewayClient(): void {
  gatewayClient = null
}

export function determineTone(days: number, explicitTone?: ReminderTone): ReminderTone {
  if (explicitTone) return explicitTone
  if (days <= 7) return 'friendly'
  if (days <= 21) return 'firm'
  if (days <= 45) return 'urgent'
  return 'final_notice'
}

export function buildFallbackDraft(input: SmartDraftInput, tone: ReminderTone): SmartDraftResult {
  const currency = input.currency || 'USD'
  const formattedAmount = `${currency} ${input.amount.toFixed(2)}`
  const company = input.companyName || 'our team'

  if (tone === 'friendly') {
    return {
      subject: `Friendly reminder: Invoice ${input.invoiceNumber} is due`,
      headline: `Payment reminder for Invoice ${input.invoiceNumber}`,
      body: `Hi ${input.clientName},\n\nWe hope this email finds you well. This is a friendly reminder that invoice ${input.invoiceNumber} for ${formattedAmount} was due on ${input.dueDate || 'recently'}.\n\nPlease let us know if you need another copy of the invoice or have any questions.\n\nBest regards,\n${company}`,
      suggestedTone: tone,
      overdueDays: input.overdueDays,
      amount: input.amount,
      currency,
      callToAction: 'View & Pay Invoice',
      fallbackUsed: true,
    }
  }

  if (tone === 'firm') {
    return {
      subject: `Past Due: Invoice ${input.invoiceNumber} (${input.overdueDays} days overdue)`,
      headline: `Invoice ${input.invoiceNumber} is ${input.overdueDays} days past due`,
      body: `Dear ${input.clientName},\n\nOur records show that invoice ${input.invoiceNumber} for ${formattedAmount} is now ${input.overdueDays} days overdue.\n\nPlease process this payment at your earliest convenience to keep your account in good standing. If payment has already been sent, please disregard this notice.\n\nThank you,\n${company}`,
      suggestedTone: tone,
      overdueDays: input.overdueDays,
      amount: input.amount,
      currency,
      callToAction: 'Pay Now',
      fallbackUsed: true,
    }
  }

  if (tone === 'urgent') {
    return {
      subject: `Urgent: Overdue Notice for Invoice ${input.invoiceNumber}`,
      headline: `Immediate attention required: Invoice ${input.invoiceNumber}`,
      body: `Dear ${input.clientName},\n\nInvoice ${input.invoiceNumber} in the amount of ${formattedAmount} is now ${input.overdueDays} days overdue despite previous reminders.\n\nPlease remit payment immediately to avoid potential service interruption or late fees.\n\nSincerely,\n${company}`,
      suggestedTone: tone,
      overdueDays: input.overdueDays,
      amount: input.amount,
      currency,
      callToAction: 'Remit Payment Immediately',
      fallbackUsed: true,
    }
  }

  return {
    subject: `FINAL NOTICE: Outstanding Balance for Invoice ${input.invoiceNumber}`,
    headline: `Final Notice regarding unpaid invoice ${input.invoiceNumber}`,
    body: `Dear ${input.clientName},\n\nThis is a final notice regarding invoice ${input.invoiceNumber} (${formattedAmount}), which is now ${input.overdueDays} days past due.\n\nPrompt settlement is required immediately to prevent escalation or collection procedures. Please contact us immediately if you have any questions.\n\nSincerely,\n${company}`,
    suggestedTone: tone,
    overdueDays: input.overdueDays,
    amount: input.amount,
    currency,
    callToAction: 'Settle Balance Immediately',
    fallbackUsed: true,
  }
}

export async function draftPaymentReminder(
  input: SmartDraftInput,
  clientOverride?: VibeAIClient,
): Promise<SmartDraftResult> {
  const tone = determineTone(input.overdueDays, input.tone)
  const currency = input.currency || 'USD'

  try {
    const client = clientOverride ?? getGatewayClient()

    const systemPrompt = [
      'You are an expert accounts receivable and dunning communication specialist.',
      'Generate a tailored, professional payment reminder email draft based on the overdue invoice details.',
      'You must respond with ONLY valid JSON matching this schema:',
      JSON.stringify({
        subject: 'Email Subject Line',
        headline: 'Clear short headline for the email or notice',
        body: 'Full email body with greeting, specific amount and overdue details, clear next steps, and sign-off',
        suggestedTone: tone,
        overdueDays: input.overdueDays,
        amount: input.amount,
        currency,
        callToAction: 'Action button text (e.g. View & Pay Invoice, Settle Now)',
      }),
      'Do NOT include markdown formatting or code backticks around the JSON. Output only raw JSON.',
    ].join('\n\n')

    const userPrompt = [
      `Invoice Number: ${input.invoiceNumber}`,
      `Client Name: ${input.clientName}`,
      `Company/Sender: ${input.companyName || 'InvoiceFlow User'}`,
      `Amount Due: ${currency} ${input.amount.toFixed(2)}`,
      `Days Overdue: ${input.overdueDays}`,
      input.dueDate ? `Original Due Date: ${input.dueDate}` : null,
      `Requested Tone: ${tone}`,
      input.customInstructions ? `Custom Instructions: ${input.customInstructions}` : null,
      'Draft a high-converting, professional payment reminder.',
    ].filter(Boolean).join('\n')

    const raw = await client.generateText(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: 'auto',
        temperature: 0.3,
      },
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(clean) as Partial<SmartDraftResult>

    if (parsed.subject && parsed.body) {
      return {
        subject: String(parsed.subject).trim(),
        headline: String(parsed.headline || parsed.subject).trim(),
        body: String(parsed.body).trim(),
        suggestedTone: (parsed.suggestedTone as ReminderTone) || tone,
        overdueDays: Number(parsed.overdueDays) || input.overdueDays,
        amount: Number(parsed.amount) || input.amount,
        currency: String(parsed.currency || currency).trim(),
        callToAction: String(parsed.callToAction || 'Pay Invoice Now').trim(),
        fallbackUsed: false,
      }
    }
  } catch (err) {
    console.warn('[VibeAI] Gateway smart-draft failed or unavailable, using deterministic fallback:', (err as Error)?.message || err)
  }

  return buildFallbackDraft(input, tone)
}
