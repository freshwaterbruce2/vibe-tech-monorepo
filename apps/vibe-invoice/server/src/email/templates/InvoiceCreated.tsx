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

export interface InvoiceCreatedProps {
  invoiceNumber: string
  clientName: string
  total: number
  currency: string
  dueDate: string
  payUrl: string
  companyName?: string
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

const InvoiceCreated = ({
  invoiceNumber,
  clientName,
  total,
  currency,
  dueDate,
  payUrl,
  companyName,
}: InvoiceCreatedProps) => {
  const sender = companyName ?? 'your service provider'
  const formattedTotal = formatAmount(total, currency)

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
            style={{ fontSize: '24px', color: '#111827', marginBottom: '16px' }}
          >
            Invoice {invoiceNumber} from {sender}
          </Heading>
          <Text style={{ fontSize: '16px', color: '#374151' }}>
            Hi {clientName},
          </Text>
          <Text style={{ fontSize: '16px', color: '#374151' }}>
            A new invoice has been issued to you.
          </Text>
          <Section
            style={{
              backgroundColor: '#f9fafb',
              padding: '16px',
              marginTop: '16px',
            }}
          >
            <Text style={{ margin: '4px 0', color: '#111827' }}>
              <strong>Invoice number:</strong> {invoiceNumber}
            </Text>
            <Text style={{ margin: '4px 0', color: '#111827' }}>
              <strong>Amount due:</strong> {formattedTotal}
            </Text>
            <Text style={{ margin: '4px 0', color: '#111827' }}>
              <strong>Due date:</strong> {dueDate}
            </Text>
          </Section>
          <Section style={{ marginTop: '24px', textAlign: 'center' }}>
            <Button
              href={payUrl}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              View and pay invoice
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
            Thanks,
            <br />
            {sender}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InvoiceCreated