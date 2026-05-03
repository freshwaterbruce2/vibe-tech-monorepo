import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'

export interface InvoicePdfLineItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface InvoicePdfClient {
  name: string
  email?: string
  address?: string
  phone?: string
  company?: string
}

export interface InvoicePdfData {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  client: InvoicePdfClient
  lineItems: InvoicePdfLineItem[]
  subtotal: number
  tax: number
  total: number
  currency: string
  notes?: string | null
  terms?: string | null
  companyName?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  invoiceMeta: {
    fontSize: 10,
    color: '#6b7280',
  },
  sectionHeading: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: '#374151',
  },
  clientBlock: {
    marginBottom: 20,
  },
  clientLine: {
    fontSize: 11,
    marginBottom: 2,
  },
  table: {
    width: '100%',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cellDescription: {
    flex: 4,
    fontSize: 10,
  },
  cellQty: {
    flex: 1,
    fontSize: 10,
    textAlign: 'right',
  },
  cellPrice: {
    flex: 1.5,
    fontSize: 10,
    textAlign: 'right',
  },
  cellTotal: {
    flex: 1.5,
    fontSize: 10,
    textAlign: 'right',
  },
  cellHeader: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#374151',
  },
  totalsBlock: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  totalsRow: {
    flexDirection: 'row',
    width: 220,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalsLabel: {
    fontSize: 11,
    color: '#374151',
  },
  totalsValue: {
    fontSize: 11,
  },
  totalsRowGrand: {
    flexDirection: 'row',
    width: 220,
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#111827',
  },
  totalsLabelGrand: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  totalsValueGrand: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  footerHeading: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginBottom: 4,
    marginTop: 8,
  },
  footerText: {
    fontSize: 10,
    color: '#4b5563',
    lineHeight: 1.4,
  },
})

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

const InvoicePdfDocument = (props: { data: InvoicePdfData }) => {
  const {
    invoiceNumber,
    issueDate,
    dueDate,
    client,
    lineItems,
    subtotal,
    tax,
    total,
    currency,
    notes,
    terms,
    companyName,
  } = props.data

  return (
    <Document
      title={`Invoice ${invoiceNumber}`}
      author={companyName ?? 'Invoice Automation SaaS'}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>INVOICE</Text>
            {companyName ? (
              <Text style={styles.invoiceMeta}>{companyName}</Text>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceMeta}>Invoice #: {invoiceNumber}</Text>
            <Text style={styles.invoiceMeta}>Issued: {issueDate}</Text>
            <Text style={styles.invoiceMeta}>Due: {dueDate}</Text>
          </View>
        </View>

        <View style={styles.clientBlock}>
          <Text style={styles.sectionHeading}>Bill To</Text>
          <Text style={styles.clientLine}>{client.name}</Text>
          {client.company ? (
            <Text style={styles.clientLine}>{client.company}</Text>
          ) : null}
          {client.email ? (
            <Text style={styles.clientLine}>{client.email}</Text>
          ) : null}
          {client.address ? (
            <Text style={styles.clientLine}>{client.address}</Text>
          ) : null}
          {client.phone ? (
            <Text style={styles.clientLine}>{client.phone}</Text>
          ) : null}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cellDescription, styles.cellHeader]}>
              Description
            </Text>
            <Text style={[styles.cellQty, styles.cellHeader]}>Qty</Text>
            <Text style={[styles.cellPrice, styles.cellHeader]}>Unit price</Text>
            <Text style={[styles.cellTotal, styles.cellHeader]}>Total</Text>
          </View>
          {lineItems.map((item, index) => (
            <View key={`line-${index}`} style={styles.tableRow}>
              <Text style={styles.cellDescription}>{item.description}</Text>
              <Text style={styles.cellQty}>{item.quantity}</Text>
              <Text style={styles.cellPrice}>
                {formatAmount(item.unitPrice, currency)}
              </Text>
              <Text style={styles.cellTotal}>
                {formatAmount(item.total, currency)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>
              {formatAmount(subtotal, currency)}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax</Text>
            <Text style={styles.totalsValue}>{formatAmount(tax, currency)}</Text>
          </View>
          <View style={styles.totalsRowGrand}>
            <Text style={styles.totalsLabelGrand}>Total</Text>
            <Text style={styles.totalsValueGrand}>
              {formatAmount(total, currency)}
            </Text>
          </View>
        </View>

        {notes || terms ? (
          <View style={styles.footer}>
            {notes ? (
              <View>
                <Text style={styles.footerHeading}>Notes</Text>
                <Text style={styles.footerText}>{notes}</Text>
              </View>
            ) : null}
            {terms ? (
              <View>
                <Text style={styles.footerHeading}>Terms</Text>
                <Text style={styles.footerText}>{terms}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Page>
    </Document>
  )
}

export default InvoicePdfDocument