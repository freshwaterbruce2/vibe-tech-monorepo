import * as React from 'react'

import {
  Body,
  Container,
  Heading,
  Html,
  Link,
  Section,
  Text,
} from '@react-email/components'

void React

export interface PaymentReceiptProps {
  invoiceNumber: string
  amount: number
  currency: string
  paidAt: string
  viewUrl: string
  companyName?: string
  clientName?: string
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

const PaymentReceipt = ({
  invoiceNumber,
  amount,
  currency,
  paidAt,
  viewUrl,
  companyName,
  clientName,
}: PaymentReceiptProps) => {
  const sender = companyName ?? 'your service provider'
  const formattedAmount = formatAmount(amount, currency)

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
            style={{ fontSize: '24px', color: '#047857', marginBottom: '16px' }}
          >
            Payment received for invoice {invoiceNumber}
          </Heading>
          <Text style={{ fontSize: '16px', color: '#374151' }}>
            {clientName ? `Hi ${clientName},` : 'Hi,'}
          </Text>
          <Text style={{ fontSize: '16px', color: '#374151' }}>
            Thank you for your payment. We have received it and your invoice is
            now marked as paid.
          </Text>
          <Section
            style={{
              backgroundColor: '#ecfdf5',
              padding: '16px',
              marginTop: '16px',
            }}
          >
            <Text style={{ margin: '4px 0', color: '#065f46' }}>
              <strong>Invoice number:</strong> {invoiceNumber}
            </Text>
            <Text style={{ margin: '4px 0', color: '#065f46' }}>
              <strong>Amount paid:</strong> {formattedAmount}
            </Text>
            <Text style={{ margin: '4px 0', color: '#065f46' }}>
              <strong>Paid on:</strong> {paidAt}
            </Text>
          </Section>
          <Text
            style={{
              fontSize: '14px',
              color: '#6b7280',
              marginTop: '24px',
            }}
          >
            View this invoice at{' '}
            <Link href={viewUrl} style={{ color: '#2563eb' }}>
              {viewUrl}
            </Link>
          </Text>
          <Text
            style={{
              fontSize: '14px',
              color: '#6b7280',
              marginTop: '16px',
            }}
          >
            Thanks for your business,
            <br />
            {sender}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default PaymentReceipt