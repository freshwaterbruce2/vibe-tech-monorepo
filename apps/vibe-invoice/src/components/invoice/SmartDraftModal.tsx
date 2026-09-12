import React, { useCallback, useEffect, useState } from 'react'
import {
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'react-toastify'
import {
  dunningService,
  type ReminderTone,
  type SmartDraftResult,
} from '../../services/dunningService'
import type { Invoice } from '../../types/invoice'
import { formatCurrency } from '../../lib/currency'
import Button from '../common/Button'

interface SmartDraftModalProps {
  invoice: Invoice
  isOpen: boolean
  onClose: () => void
}

const TONE_CONFIG: {
  id: ReminderTone
  label: string
  range: string
  color: string
}[] = [
  { id: 'friendly', label: 'Friendly', range: '≤ 7d', color: '#10b981' },
  { id: 'firm', label: 'Firm', range: '8–21d', color: '#667eea' },
  { id: 'urgent', label: 'Urgent', range: '22–45d', color: '#f59e0b' },
  { id: 'final_notice', label: 'Final Notice', range: '> 45d', color: '#ef4444' },
]

export const SmartDraftModal: React.FC<SmartDraftModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [customInstructions, setCustomInstructions] = useState('')
  const [draft, setDraft] = useState<SmartDraftResult | null>(null)
  const [selectedTone, setSelectedTone] = useState<ReminderTone>('friendly')
  const [editableSubject, setEditableSubject] = useState('')
  const [editableBody, setEditableBody] = useState('')

  // Calculate overdue days
  const dueTime = new Date(invoice.dueDate).getTime()
  const daysOverdue = Math.max(
    0,
    Math.floor((Date.now() - dueTime) / (1000 * 60 * 60 * 24))
  )

  // Default suggested tone based on days
  const defaultTone: ReminderTone =
    daysOverdue <= 7
      ? 'friendly'
      : daysOverdue <= 21
      ? 'firm'
      : daysOverdue <= 45
      ? 'urgent'
      : 'final_notice'

  const fetchDraft = useCallback(
    async (toneToUse?: ReminderTone) => {
      setLoading(true)
      try {
        const res = await dunningService.generateSmartDraft({
          invoiceId: invoice.id,
          tone: toneToUse || selectedTone,
          customInstructions: customInstructions.trim() || undefined,
        })
        setDraft(res)
        setSelectedTone(res.suggestedTone)
        setEditableSubject(res.subject)
        setEditableBody(res.body)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to generate reminder draft'
        )
      } finally {
        setLoading(false)
      }
    },
    [invoice.id, selectedTone, customInstructions]
  )

  // Load draft automatically when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedTone(defaultTone)
      setCustomInstructions('')
      setCopied(false)
      void fetchDraft(defaultTone)
    } else {
      setDraft(null)
    }
  }, [isOpen, defaultTone])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleCopy = async () => {
    const fullText = `Subject: ${editableSubject}\n\n${editableBody}`
    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      toast.success('Reminder copied to clipboard')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Failed to copy text to clipboard')
    }
  }

  const handleSendEmail = async () => {
    if (!editableSubject.trim() || !editableBody.trim()) {
      toast.warn('Subject and body cannot be empty')
      return
    }

    setSending(true)
    try {
      await dunningService.sendReminderEmail({
        invoiceId: invoice.id,
        subject: editableSubject,
        body: editableBody,
      })
      toast.success(`Reminder sent to ${invoice.client.email}`)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send email'
      toast.error(
        `${msg} — You can use "Copy Text" or "Open in Email" to send manually.`
      )
    } finally {
      setSending(false)
    }
  }

  const handleOpenMailto = () => {
    const clientEmail = invoice.client.email || ''
    const subject = encodeURIComponent(editableSubject)
    const body = encodeURIComponent(editableBody)
    window.location.href = `mailto:${clientEmail}?subject=${subject}&body=${body}`
  }

  const formattedTotal = formatCurrency(invoice.total, invoice.currency)

  return (
    <div
      className="ui-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-draft-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="ui-modal ui-smart-draft-modal">
        {/* Header */}
        <div className="ui-modal__header">
          <div className="ui-row" style={{ alignItems: 'center', gap: '0.6rem' }}>
            <div className="ui-icon-bubble" style={{ background: 'rgba(102, 126, 234, 0.15)', color: '#667eea' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h2 id="smart-draft-title" className="ui-h2" style={{ fontSize: '1.25rem', margin: 0 }}>
                AI Payment Reminder
              </h2>
              <span className="ui-muted" style={{ fontSize: '0.8125rem' }}>
                Universal AI Gateway • High-converting dunning drafts
              </span>
            </div>
          </div>
          <button
            type="button"
            className="ui-actions__btn"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Invoice Summary Pill */}
        <div className="ui-smart-draft-summary">
          <div className="ui-smart-draft-summary__item">
            <span className="ui-muted">Invoice:</span>
            <strong className="ui-mono">{invoice.invoiceNumber}</strong>
          </div>
          <div className="ui-smart-draft-summary__item">
            <span className="ui-muted">Client:</span>
            <strong>{invoice.client.name}</strong>
          </div>
          <div className="ui-smart-draft-summary__item">
            <span className="ui-muted">Amount:</span>
            <strong>{formattedTotal}</strong>
          </div>
          <div className="ui-smart-draft-summary__item">
            <span className="ui-muted">Status:</span>
            <span className="ui-chip ui-chip--overdue">
              {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
            </span>
          </div>
        </div>

        {/* Tone Selector */}
        <div className="ui-stack ui-stack--sm">
          <label className="ui-label" style={{ fontSize: '0.8125rem', marginBottom: '0.2rem' }}>
            Reminder Tone
          </label>
          <div className="ui-tone-selector">
            {TONE_CONFIG.map((t) => {
              const isActive = selectedTone === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`ui-tone-btn ${isActive ? 'ui-tone-btn--active' : ''}`}
                  onClick={() => {
                    setSelectedTone(t.id)
                    void fetchDraft(t.id)
                  }}
                  disabled={loading}
                >
                  <span
                    className="ui-tone-dot"
                    style={{ background: t.color }}
                  />
                  <span>{t.label}</span>
                  <span className="ui-tone-range">{t.range}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="ui-stack ui-stack--sm" style={{ marginTop: '0.5rem' }}>
          <div className="ui-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="ui-label" style={{ fontSize: '0.8125rem', margin: 0 }}>
              Custom Instructions (Optional)
            </label>
            <button
              type="button"
              className="ui-text-btn"
              onClick={() => void fetchDraft(selectedTone)}
              disabled={loading}
              style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <RefreshCw size={12} className={loading ? 'ui-spin' : ''} />
              Regenerate
            </button>
          </div>
          <input
            type="text"
            className="ui-input"
            style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
            placeholder="e.g. Offer 3-month payment plan, mention 5% late fee, ask for wire confirmation..."
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void fetchDraft(selectedTone)
              }
            }}
          />
        </div>

        {/* Draft Editor */}
        <div className="ui-stack ui-stack--sm" style={{ marginTop: '0.75rem' }}>
          <div className="ui-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="ui-label" style={{ fontSize: '0.8125rem', margin: 0 }}>
              Draft Preview
            </label>
            {draft && (
              <span
                className="ui-chip"
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  background: draft.fallbackUsed
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(16, 185, 129, 0.15)',
                  color: draft.fallbackUsed ? '#f59e0b' : '#10b981',
                }}
              >
                {draft.fallbackUsed ? 'Fallback Template' : 'AI Gateway Live'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="ui-smart-draft-loading">
              <RefreshCw size={24} className="ui-spin" />
              <span>Generating tailored dunning notice via AI Gateway...</span>
            </div>
          ) : (
            <div className="ui-stack ui-stack--sm">
              <input
                type="text"
                className="ui-input ui-smart-draft-subject"
                placeholder="Subject"
                value={editableSubject}
                onChange={(e) => setEditableSubject(e.target.value)}
              />
              <textarea
                className="ui-textarea ui-smart-draft-body"
                rows={9}
                placeholder="Email message..."
                value={editableBody}
                onChange={(e) => setEditableBody(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="ui-modal__footer">
          <div className="ui-row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              disabled={loading || !editableBody}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleOpenMailto}
              disabled={loading || !editableBody}
              title="Open draft in default mail app"
            >
              <ExternalLink size={14} />
              <span>Open in Mail App</span>
            </Button>
          </div>

          <div className="ui-row" style={{ gap: '0.5rem' }}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={sending}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void handleSendEmail()}
              loading={sending}
              disabled={loading || !editableBody}
            >
              <Send size={14} />
              <span>Send Reminder</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SmartDraftModal
