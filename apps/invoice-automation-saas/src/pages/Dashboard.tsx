import { format } from 'date-fns'
import { AlertCircle, Download, MoreHorizontal, Plus, RefreshCw } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Navigation from '../components/common/Navigation'
import RecurringInvoices from '../components/dashboard/RecurringInvoices'
import RevenueChart from '../components/dashboard/RevenueChart'
import { useAuth } from '../contexts/AuthContext'
import { useRealtimeInvoices } from '../hooks/useRealtimeInvoices'
import { invoiceService } from '../services/invoiceService'
import type { Invoice } from '../types/invoice'
import { formatCurrency } from '../lib/currency'
import { generateInvoicePdf } from '../utils/generateInvoicePdf'

const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const formatInvoiceTotal = (invoice: Invoice): { value: string; tooltip?: string } => {
  const value = formatCurrency(invoice.total, invoice.currency)
  if (
    invoice.userCurrencyAtIssue &&
    invoice.userCurrencyAtIssue.toUpperCase() !== invoice.currency.toUpperCase() &&
    invoice.exchangeRateToUserCurrency &&
    invoice.exchangeRateToUserCurrency > 0
  ) {
    const equiv = formatCurrency(
      invoice.total * invoice.exchangeRateToUserCurrency,
      invoice.userCurrencyAtIssue,
    )
    return {
      value,
      tooltip: `${value} @ ${invoice.exchangeRateToUserCurrency.toFixed(4)} = ${equiv}`,
    }
  }
  return { value }
}

type InvoiceStatus = Invoice['status']

const STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent'],
  sent: ['paid', 'overdue'],
  overdue: ['paid'],
  paid: [],
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
}

const InvoiceActions = ({ invoice }: { invoice: Invoice }) => {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const transitions = STATUS_TRANSITIONS[invoice.status]

  const handleStatusChange = useCallback(
    async (status: InvoiceStatus) => {
      setBusy(true)
      setOpen(false)
      try {
        await invoiceService.updateInvoiceStatus(invoice.id, status)
        toast.success(`Invoice marked as ${STATUS_LABELS[status]}`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update status')
      } finally {
        setBusy(false)
      }
    },
    [invoice.id]
  )

  const handlePdf = useCallback(() => {
    try {
      generateInvoicePdf(invoice)
      toast.success('PDF downloaded')
    } catch {
      toast.error('Failed to generate PDF')
    }
  }, [invoice])

  return (
    <div className="ui-actions">
      <button type="button" className="ui-actions__btn" onClick={handlePdf} title="Download PDF">
        <Download size={14} />
      </button>

      {transitions.length > 0 && (
        <div className="ui-actions__menu">
          <button
            type="button"
            className="ui-actions__btn"
            onClick={() => setOpen((prev) => !prev)}
            disabled={busy}
            title="Change status"
          >
            <MoreHorizontal size={14} />
          </button>
          {open && (
            <div className="ui-actions__dropdown">
              {transitions.map((status) => (
                <button
                  key={status}
                  type="button"
                  className="ui-actions__option"
                  onClick={() => void handleStatusChange(status)}
                >
                  Mark as {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const Dashboard = () => {
  const { user } = useAuth()

  const { invoices, loading, error, retry, totals } = useRealtimeInvoices()
  const [retrying, setRetrying] = useState(false)

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    try {
      await retry()
    } finally {
      setRetrying(false)
    }
  }, [retry])

  const revenueSeries = useMemo(
    () => [
      { month: 'May', revenue: 4200 },
      { month: 'Jun', revenue: 5100 },
      { month: 'Jul', revenue: 3900 },
      { month: 'Aug', revenue: 6400 },
      { month: 'Sep', revenue: 7200 },
      { month: 'Oct', revenue: totals.totalRevenue || 5600 },
    ],
    [totals.totalRevenue]
  )

  return (
    <div className="ui-page">
      <Navigation variant="app" />
      <main className="ui-container ui-dashboard">
        <div className="ui-row ui-dashboard__header">
          <div className="ui-stack ui-stack--md">
            <h1 className="ui-h1">Dashboard</h1>
            <div className="ui-muted">Signed in as {user?.email ?? 'unknown user'}</div>
          </div>
          <Link to="/invoice/new">
            <Button>
              <Plus size={16} aria-hidden="true" /> New invoice
            </Button>
          </Link>
        </div>

        <div className="ui-grid ui-grid--3">
          <Card className="ui-stack ui-stack--md">
            <div className="ui-muted">Total revenue</div>
            <div className="ui-metric">{formatUsd(totals.totalRevenue)}</div>
          </Card>
          <Card className="ui-stack ui-stack--md">
            <div className="ui-muted">Outstanding</div>
            <div className="ui-metric">{formatUsd(totals.outstanding)}</div>
          </Card>
          <Card className="ui-stack ui-stack--md">
            <div className="ui-muted">Invoices</div>
            <div className="ui-metric">{invoices.length}</div>
          </Card>
        </div>

        <div className="ui-grid ui-grid--2 ui-dashboard__grid">
          <RevenueChart data={revenueSeries} />
          <RecurringInvoices invoices={invoices} />
        </div>

        <Card className="ui-stack ui-stack--md">
          <div className="ui-row ui-dashboard__subheader">
            <h2 className="ui-h2">Recent invoices</h2>
            <span className="ui-muted">
              {error ? 'Could not load invoices' : loading ? 'Loading…' : 'Live (session) data'}
            </span>
          </div>

          {error ? (
            <div
              role="alert"
              aria-live="polite"
              className="ui-stack ui-stack--md ui-dashboard__error"
            >
              <div className="ui-row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={18} aria-hidden="true" />
                <strong>Could not load invoices</strong>
              </div>
              <div className="ui-muted">
                Check your connection and try again. ({error.message})
              </div>
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleRetry()}
                  loading={retrying}
                  aria-label="Retry loading invoices"
                >
                  <RefreshCw size={14} aria-hidden="true" /> Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="ui-table">
              <div className="ui-table__head">
                <span>Invoice</span>
                <span>Client</span>
                <span>Due</span>
                <span>Status</span>
                <span className="ui-text-right">Total</span>
                <span className="ui-text-right">Actions</span>
              </div>
              {invoices.map((invoice) => {
                const { value, tooltip } = formatInvoiceTotal(invoice)
                return (
                  <div key={invoice.id} className="ui-table__row">
                    <span className="ui-mono">{invoice.invoiceNumber}</span>
                    <span>{invoice.client.name}</span>
                    <span className="ui-muted">{format(invoice.dueDate, 'MMM d, yyyy')}</span>
                    <span className={`ui-chip ui-chip--${invoice.status}`}>{invoice.status}</span>
                    <span className="ui-text-right" title={tooltip}>
                      {value}
                      {tooltip ? (
                        <span aria-hidden="true" className="ui-muted" style={{ marginLeft: 4 }}>
                          *
                        </span>
                      ) : null}
                    </span>
                    <span className="ui-text-right">
                      <InvoiceActions invoice={invoice} />
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}

export default Dashboard
