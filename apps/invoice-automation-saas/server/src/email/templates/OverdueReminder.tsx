import {
  Body,
  Button,
  Container,
  Heading,
  Html,
  Link,
  Section,
  Text,
} from '@react-email/components'

export type ReminderStep = 1 | 2 | 3

export interface OverdueReminderProps {
  invoiceNumber: string
  total: number
  currency: string
  dueDate: string
  daysOverdue: number
  payUrl: string
  reminderStep: ReminderStep
  companyName?: string
  clientName?: string
}

interface ToneCopy {
  heading: string
  greeting: string
  body: string
  closing: string
  bannerColor: string
  bannerBg: string
}

const TONE_BY_STEP: Record<ReminderStep, ToneCopy> = {
  1: {
    heading: 'Friendly reminder: invoice {invoiceNumber} is overdue',
    greeting: 'Hi {clientName},',
    body: 'This is a friendly reminder that invoice {invoiceNumber} for {amount} was due on {dueDate} and is now {daysOverdue} day(s) overdue. If you have already sent payment, please disregard this notice.',
    closing: 'Thanks for your prompt attention,',
    bannerColor: '#92400e',
    bannerBg: '#fef3c7',
  },
  2: {
    heading: 'Second notice: invoice {invoiceNumber} requires payment',
    greeting: 'Hi {clientName},',
    body: 'This is our second notice. Invoice {invoiceNumber} for {amount} was due on {dueDate} and is now {daysOverdue} day(s) overdue. Please arrange payment as soon as possible to avoid further action.',
    closing: 'We appreciate your prompt response,',
    bannerColor: '#9a3412',
    bannerBg: '#fed7aa',
  },
  3: {
    heading: 'Final notice: immediate payment required for invoice {invoiceNumber}',
    greeting: 'Hi {clientName},',
    body: 'This is our final notice. Invoice {invoiceNumber} for {amount} remains unpaid {daysOverdue} day(s) past its due date of {dueDate}. Please remit payment immediately. Failure to pay may result in escalation, including referral to collections and additional fees.',
    closing: 'Regards,',
    bannerColor: '#991b1b',
    bannerBg: '#fee2e2',
  },
}

const formatAmount = (amount: number, currency: string): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

const fillTemplate = (
  template: string,
  vars: Record<string, string>,
): string => {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
}

const OverdueReminder = ({
  invoiceNumber,
  total,
  currency,
  dueDate,
  daysOverdue,
  payUrl,
  reminderStep,
  companyName,
  clientName,
}: OverdueReminderProps) => {
  const tone = TONE_BY_STEP[reminderStep]
  const sender = companyName ?? 'your service provider'
  const formattedAmount = formatAmount(total, currency)
  const recipient = clientName ?? 'there'

  const vars: Record<string, string> = {
    invoiceNumber,
    amount: formattedAmount,
    dueDate,
    daysOverdue: String(daysOverdue),
    clientName: recipient,
  }

  return (
    <Html>
      <Body
        style={{
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f5f5f5',
          padding: '24px',
        }}
      >
        <Container
          style={{
            backgroundColor: '#ffffff',
            padding: '32px',
            maxWidth: '600px',
          }}
        >
          <Heading
            style={{
              fontSize: '24px',
              color: tone.bannerColor,
              marginBottom: '16px',
            }}
          >
            {fillTemplate(tone.heading, vars)}
          </Heading>
          <Text style={{ fontSize: '16px', color: '#374151' }}>
            {fillTemplate(tone.greeting, vars)}
          </Text>
          <Section
            style={{
              backgroundColor: tone.bannerBg,
              padding: '16px',
              marginTop: '16px',
              border: `1px solid ${tone.bannerColor}`,
            }}
          >
            <Text style={{ margin: '0', color: tone.bannerColor }}>
              {fillTemplate(tone.body, vars)}
            </Text>
          </Section>
          <Section style={{ marginTop: '24px', textAlign: 'center' }}>
            <Button
              href={payUrl}
              style={{
                backgroundColor: tone.bannerColor,
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              Pay invoice {invoiceNumber}
            </Button>
          </Section>
          <Text
            style={{
              fontSize: '14px',
              color: '#6b7280',
              marginTop: '24px',
            }}
          >
            If the button does not work, copy and paste this link into your
            browser:{' '}
            <Link href={payUrl} style={{ color: '#2563eb' }}>
              {payUrl}
            </Link>
          </Text>
          <Text
            style={{
              fontSize: '14px',
              color: '#6b7280',
              marginTop: '16px',
            }}
          >
            {tone.closing}
            <br />
            {sender}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default OverdueReminder