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

const Modern = ({ data, config }: TemplateProps) => {
  const cfg = mergeConfig(config)
  const styles = StyleSheet.create({
    page: { padding: 0, fontSize: 11, fontFamily: cfg.fontFamily, color: cfg.primaryColor },
    band: { backgroundColor: cfg.accentColor, padding: 32, color: '#ffffff' },
    bandTitle: { fontSize: 32, fontFamily: `${cfg.fontFamily}-Bold`, letterSpacing: 4 },
    bandSubtitle: { fontSize: 12, marginTop: 4, opacity: 0.85 },
    bandMeta: { marginTop: 16, fontSize: 10, lineHeight: 1.6 },
    body: { padding: 32 },
    twoCol: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    colHeading: { fontSize: 9, fontFamily: `${cfg.fontFamily}-Bold`, textTransform: 'uppercase', color: cfg.accentColor, marginBottom: 6, letterSpacing: 1 },
    clientLine: { fontSize: 11, marginBottom: 2 },
    table: { marginTop: 8, marginBottom: 16 },
    tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: cfg.accentColor },
    tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    cellDescription: { flex: 4, fontSize: 11 },
    cellQty: { flex: 1, fontSize: 11, textAlign: 'right' },
    cellPrice: { flex: 1.5, fontSize: 11, textAlign: 'right' },
    cellTotal: { flex: 1.5, fontSize: 11, textAlign: 'right' },
    cellHeader: { fontFamily: `${cfg.fontFamily}-Bold`, fontSize: 9, textTransform: 'uppercase', color: cfg.accentColor, letterSpacing: 1 },
    totalsBlock: { marginTop: 16, alignItems: 'flex-end' },
    totalsRow: { flexDirection: 'row', width: 240, justifyContent: 'space-between', marginBottom: 4 },
    totalsLabel: { fontSize: 11, color: '#4b5563' },
    totalsValue: { fontSize: 11 },
    totalsRowGrand: {
      flexDirection: 'row',
      width: 240,
      justifyContent: 'space-between',
      marginTop: 8,
      paddingTop: 8,
      paddingBottom: 8,
      paddingHorizontal: 12,
      backgroundColor: cfg.accentColor,
    },
    totalsLabelGrand: { fontSize: 13, fontFamily: `${cfg.fontFamily}-Bold`, color: '#ffffff' },
    totalsValueGrand: { fontSize: 13, fontFamily: `${cfg.fontFamily}-Bold`, color: '#ffffff' },
    footer: { marginTop: 32, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
    footerHeading: { fontSize: 9, fontFamily: `${cfg.fontFamily}-Bold`, textTransform: 'uppercase', color: cfg.accentColor, marginBottom: 4, marginTop: 8, letterSpacing: 1 },
    footerText: { fontSize: 10, color: '#4b5563', lineHeight: 1.4 },
    logo: { width: 60, height: 60, objectFit: 'contain', marginBottom: 12 },
  })

  const { invoiceNumber, issueDate, dueDate, client, lineItems, subtotal, tax, total, currency, notes, terms, companyName } = data

  return (
    <Document title={`Invoice ${invoiceNumber}`} author={companyName ?? 'Invoice Automation SaaS'}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.band}>
          {cfg.logoPath ? <Image src={cfg.logoPath} style={styles.logo} /> : null}
          <Text style={styles.bandTitle}>INVOICE</Text>
          {companyName ? <Text style={styles.bandSubtitle}>{companyName}</Text> : null}
          <View style={styles.bandMeta}>
            <Text>Invoice #{invoiceNumber}</Text>
            <Text>Issued {issueDate} • Due {dueDate}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.twoCol}>
            <View>
              <Text style={styles.colHeading}>Billed To</Text>
              <Text style={styles.clientLine}>{client.name}</Text>
              {client.company ? <Text style={styles.clientLine}>{client.company}</Text> : null}
              {client.email ? <Text style={styles.clientLine}>{client.email}</Text> : null}
              {client.address ? <Text style={styles.clientLine}>{client.address}</Text> : null}
              {client.phone ? <Text style={styles.clientLine}>{client.phone}</Text> : null}
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.cellDescription, styles.cellHeader]}>Description</Text>
              <Text style={[styles.cellQty, styles.cellHeader]}>Qty</Text>
              <Text style={[styles.cellPrice, styles.cellHeader]}>Unit</Text>
              <Text style={[styles.cellTotal, styles.cellHeader]}>Total</Text>
            </View>
            {lineItems.map((item, index) => (
              <View key={`line-${index}`} style={styles.tableRow}>
                <Text style={styles.cellDescription}>{item.description}</Text>
                <Text style={styles.cellQty}>{item.quantity}</Text>
                <Text style={styles.cellPrice}>{formatAmount(item.unitPrice, currency)}</Text>
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
        </View>
      </Page>
    </Document>
  )
}

export default Modern
