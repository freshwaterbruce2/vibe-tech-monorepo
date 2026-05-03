import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'

import { mergeConfig, type TemplateProps } from './types.js'

const formatAmount = (amount: number, currency: string): string => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

const Minimal = ({ data, config }: TemplateProps) => {
  const cfg = mergeConfig(config)
  const styles = StyleSheet.create({
    page: { padding: 56, fontSize: 10, fontFamily: cfg.fontFamily, color: cfg.primaryColor },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 },
    title: { fontSize: 14, fontFamily: `${cfg.fontFamily}-Bold`, letterSpacing: 6 },
    invoiceMeta: { fontSize: 10, color: '#6b7280', textAlign: 'right' },
    company: { fontSize: 11, marginTop: 24, color: '#6b7280' },
    section: { marginBottom: 32 },
    sectionLabel: { fontSize: 9, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
    clientLine: { fontSize: 11, marginBottom: 2 },
    table: { marginTop: 16, marginBottom: 24 },
    tableHeaderRow: { flexDirection: 'row', paddingBottom: 8 },
    tableRow: { flexDirection: 'row', paddingVertical: 6 },
    cellDescription: { flex: 4, fontSize: 11 },
    cellQty: { flex: 1, fontSize: 11, textAlign: 'right' },
    cellPrice: { flex: 1.5, fontSize: 11, textAlign: 'right' },
    cellTotal: { flex: 1.5, fontSize: 11, textAlign: 'right' },
    cellHeader: { fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 },
    divider: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 8 },
    totalsBlock: { marginTop: 16, alignItems: 'flex-end' },
    totalsRow: { flexDirection: 'row', width: 200, justifyContent: 'space-between', marginBottom: 6 },
    totalsLabel: { fontSize: 10, color: '#6b7280' },
    totalsValue: { fontSize: 10 },
    totalsRowGrand: {
      flexDirection: 'row',
      width: 200,
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: cfg.primaryColor,
    },
    totalsLabelGrand: { fontSize: 11, fontFamily: `${cfg.fontFamily}-Bold` },
    totalsValueGrand: { fontSize: 11, fontFamily: `${cfg.fontFamily}-Bold` },
    footer: { marginTop: 48 },
    footerHeading: { fontSize: 9, color: '#9ca3af', marginBottom: 4, marginTop: 12, textTransform: 'uppercase', letterSpacing: 1 },
    footerText: { fontSize: 10, color: '#4b5563', lineHeight: 1.4 },
    logo: { width: 50, height: 50, objectFit: 'contain', marginBottom: 16 },
  })

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
    taxStrategy,
    userCurrencyAtIssue,
    exchangeRateToUserCurrency,
    notes,
    terms,
    companyName,
  } = data
  const showItemTaxColumn =
    taxStrategy === 'item' && lineItems.some((it) => (it.taxAmount ?? 0) > 0)
  const showCurrencyConversion =
    !!userCurrencyAtIssue &&
    userCurrencyAtIssue.toUpperCase() !== currency.toUpperCase() &&
    !!exchangeRateToUserCurrency &&
    exchangeRateToUserCurrency > 0

  return (
    <Document title={`Invoice ${invoiceNumber}`} author={companyName ?? 'Invoice Automation SaaS'}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {cfg.logoPath ? <Image src={cfg.logoPath} style={styles.logo} /> : null}
            <Text style={styles.title}>INVOICE</Text>
            {companyName ? <Text style={styles.company}>{companyName}</Text> : null}
          </View>
          <View>
            <Text style={styles.invoiceMeta}>{invoiceNumber}</Text>
            <Text style={styles.invoiceMeta}>{issueDate}</Text>
            <Text style={styles.invoiceMeta}>Due {dueDate}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Billed To</Text>
          <Text style={styles.clientLine}>{client.name}</Text>
          {client.company ? <Text style={styles.clientLine}>{client.company}</Text> : null}
          {client.email ? <Text style={styles.clientLine}>{client.email}</Text> : null}
          {client.address ? <Text style={styles.clientLine}>{client.address}</Text> : null}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.cellDescription, styles.cellHeader]}>Description</Text>
            <Text style={[styles.cellQty, styles.cellHeader]}>Qty</Text>
            <Text style={[styles.cellPrice, styles.cellHeader]}>Unit</Text>
            {showItemTaxColumn ? (
              <Text style={[styles.cellPrice, styles.cellHeader]}>Tax</Text>
            ) : null}
            <Text style={[styles.cellTotal, styles.cellHeader]}>Total</Text>
          </View>
          <View style={styles.divider} />
          {lineItems.map((item, index) => (
            <View key={`line-${index}`} style={styles.tableRow}>
              <Text style={styles.cellDescription}>{item.description}</Text>
              <Text style={styles.cellQty}>{item.quantity}</Text>
              <Text style={styles.cellPrice}>{formatAmount(item.unitPrice, currency)}</Text>
              {showItemTaxColumn ? (
                <Text style={styles.cellPrice}>
                  {formatAmount(item.taxAmount ?? 0, currency)}
                </Text>
              ) : null}
              <Text style={styles.cellTotal}>{formatAmount(item.total, currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatAmount(subtotal, currency)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax</Text>
            <Text style={styles.totalsValue}>{formatAmount(tax, currency)}</Text>
          </View>
          <View style={styles.totalsRowGrand}>
            <Text style={styles.totalsLabelGrand}>Total</Text>
            <Text style={styles.totalsValueGrand}>{formatAmount(total, currency)}</Text>
          </View>
          {showCurrencyConversion ? (
            <View style={[styles.totalsRow, { marginTop: 6 }]}>
              <Text style={[styles.totalsLabel, { fontSize: 9, color: '#9ca3af' }]}>
                {`1 ${currency} = ${exchangeRateToUserCurrency?.toFixed(4)} ${userCurrencyAtIssue}`}
              </Text>
              <Text style={[styles.totalsValue, { fontSize: 9, color: '#9ca3af' }]}>
                {formatAmount(
                  total * (exchangeRateToUserCurrency ?? 1),
                  userCurrencyAtIssue ?? currency,
                )}
              </Text>
            </View>
          ) : null}
        </View>

        {notes || terms || cfg.footerText ? (
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
            {cfg.footerText ? <Text style={styles.footerText}>{cfg.footerText}</Text> : null}
          </View>
        ) : null}
      </Page>
    </Document>
  )
}

export default Minimal
