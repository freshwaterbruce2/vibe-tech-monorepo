import { format } from 'date-fns'
import jsPDF from 'jspdf'
import type { Invoice } from '../types/invoice'

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

export function generateInvoicePdf(invoice: Invoice): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // ── Header ──
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', margin, y)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text(invoice.invoiceNumber, margin, y + 8)

  // Status badge (right-aligned)
  const statusLabel = invoice.status.toUpperCase()
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  const statusWidth = doc.getTextWidth(statusLabel) + 8
  const statusX = pageWidth - margin - statusWidth
  doc.setFillColor(
    invoice.status === 'paid'
      ? '#10b981'
      : invoice.status === 'overdue'
        ? '#f59e0b'
        : invoice.status === 'sent'
          ? '#667eea'
          : '#6b7280'
  )
  doc.roundedRect(statusX, y - 4, statusWidth, 7, 2, 2, 'F')
  doc.setTextColor(255)
  doc.text(statusLabel, statusX + 4, y)
  doc.setTextColor(0)

  y += 20

  // ── Dates ──
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text('Issue Date', margin, y)
  doc.text('Due Date', margin + 60, y)
  y += 5
  doc.setTextColor(40)
  doc.setFontSize(10)
  doc.text(format(invoice.issueDate, 'MMM d, yyyy'), margin, y)
  doc.text(format(invoice.dueDate, 'MMM d, yyyy'), margin + 60, y)

  y += 12

  // ── Bill To ──
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text('Bill To', margin, y)
  y += 5
  doc.setTextColor(40)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.client.name, margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.client.email, margin, y)
  y += 5
  if (invoice.client.company) {
    doc.text(invoice.client.company, margin, y)
    y += 5
  }
  if (invoice.client.address) {
    doc.text(invoice.client.address, margin, y)
    y += 5
  }

  y += 8

  // ── Line Items Table ──
  const colDescription = margin
  const colQty = margin + contentWidth * 0.5
  const colPrice = margin + contentWidth * 0.65
  const colTotal = margin + contentWidth * 0.82

  // Table header
  doc.setFillColor(245, 247, 250)
  doc.rect(margin, y - 4, contentWidth, 8, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100)
  doc.text('Description', colDescription, y)
  doc.text('Qty', colQty, y)
  doc.text('Price', colPrice, y)
  doc.text('Total', colTotal, y)

  y += 8

  // Table rows
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(40)

  for (const item of invoice.items) {
    if (y > 260) {
      doc.addPage()
      y = margin
    }

    doc.text(item.description, colDescription, y, {
      maxWidth: contentWidth * 0.45,
    })
    doc.text(String(item.quantity), colQty, y)
    doc.text(formatCurrency(item.price, invoice.currency), colPrice, y)
    doc.text(formatCurrency(item.total, invoice.currency), colTotal, y)

    y += 7
    doc.setDrawColor(230)
    doc.line(margin, y - 2, margin + contentWidth, y - 2)
  }

  y += 6

  // ── Totals ──
  const totalsX = margin + contentWidth * 0.6
  const valuesX = margin + contentWidth * 0.82

  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text('Subtotal', totalsX, y)
  doc.setTextColor(40)
  doc.text(formatCurrency(invoice.subtotal, invoice.currency), valuesX, y)

  y += 6
  doc.setTextColor(100)
  doc.text('Tax', totalsX, y)
  doc.setTextColor(40)
  doc.text(formatCurrency(invoice.tax, invoice.currency), valuesX, y)

  y += 8
  doc.setDrawColor(40)
  doc.line(totalsX, y - 3, margin + contentWidth, y - 3)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20)
  doc.text('Total', totalsX, y)
  doc.text(formatCurrency(invoice.total, invoice.currency), valuesX, y)

  y += 12

  // ── Notes ──
  if (invoice.notes) {
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.setFont('helvetica', 'normal')
    doc.text('Notes', margin, y)
    y += 5
    doc.setTextColor(60)
    const noteLines = doc.splitTextToSize(invoice.notes, contentWidth)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 4 + 4
  }

  // ── Terms ──
  if (invoice.terms) {
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text('Terms', margin, y)
    y += 5
    doc.setTextColor(60)
    const termLines = doc.splitTextToSize(invoice.terms, contentWidth)
    doc.text(termLines, margin, y)
  }

  // Save
  doc.save(`${invoice.invoiceNumber}.pdf`)
}
