import type { Invoice } from '../types/invoice'

export interface InvoiceListenerState {
  invoices: Invoice[]
  error: Error | null
}

type Listener = (state: InvoiceListenerState) => void

type ApiInvoice = Omit<Invoice, 'issueDate' | 'dueDate' | 'createdAt' | 'updatedAt'> & {
  issueDate: string
  dueDate: string
  createdAt: string
  updatedAt: string
  publicToken?: string
}

const reviveDate = (value: string) => {
  const asDate = new Date(value)
  return Number.isNaN(asDate.getTime()) ? new Date() : asDate
}

const deserializeInvoice = (raw: ApiInvoice): Invoice =>
  ({
    ...raw,
    issueDate: reviveDate(raw.issueDate),
    dueDate: reviveDate(raw.dueDate),
    createdAt: reviveDate(raw.createdAt),
    updatedAt: reviveDate(raw.updatedAt),
  }) as Invoice

const toError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(typeof cause === 'string' ? cause : 'Unknown error')

const apiFetch = async (path: string, init?: RequestInit) => {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
    const message = (body?.error as string | undefined) || (body?.message as string | undefined) || res.statusText
    throw new Error(message)
  }
  return (await res.json().catch(() => ({}))) as Record<string, unknown>
}

class InvoiceService {
  private hydrated = false
  private invoices = new Map<string, Invoice>()
  private listeners = new Set<Listener>()
  private lastError: Error | null = null

  private setCache(invoices: Invoice[]) {
    this.invoices = new Map(invoices.map((invoice) => [invoice.id, invoice]))
  }

  private hydrate() {
    if (this.hydrated) return
    this.hydrated = true
  }

  private snapshot(): InvoiceListenerState {
    return { invoices: this.listInvoicesSync(), error: this.lastError }
  }

  private notify() {
    const state = this.snapshot()
    this.listeners.forEach((listener) => listener(state))
  }

  private notifyError(cause: unknown) {
    this.lastError = toError(cause)
    this.notify()
  }

  private listInvoicesSync() {
    this.hydrate()
    return Array.from(this.invoices.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    )
  }

  subscribe(listener: Listener) {
    this.hydrate()
    this.listeners.add(listener)
    listener(this.snapshot())

    let es: EventSource | null = null
    try {
      es = new EventSource('/api/events', { withCredentials: true } as any)
      es.onmessage = () => {
        void this.listInvoices().catch((err) => this.notifyError(err))
      }
    } catch {
      // EventSource is best-effort; failure here doesn't surface as a load error.
    }

    // Initial fetch
    void this.listInvoices().catch((err) => this.notifyError(err))

    return () => {
      this.listeners.delete(listener)
      if (es) es.close()
    }
  }

  async listInvoices() {
    const data = await apiFetch('/api/invoices')
    const invoices = ((data.invoices ?? []) as ApiInvoice[]).map(deserializeInvoice)
    this.setCache(invoices)
    this.lastError = null
    this.notify()
    return invoices
  }

  async getInvoiceById(id: string, options?: { publicToken?: string }) {
    this.hydrate()

    try {
      const data = await apiFetch(`/api/invoices/${encodeURIComponent(id)}`)
      const invoice = data.invoice ? deserializeInvoice(data.invoice as ApiInvoice) : null
      if (invoice) {
        this.invoices.set(invoice.id, invoice)
        this.notify()
      }
      return invoice
    } catch {
      // If not logged in, try public fetch if token provided
      if (options?.publicToken) {
        const data = await apiFetch(
          `/api/public/invoices/${encodeURIComponent(id)}?token=${encodeURIComponent(options.publicToken)}`,
          { method: 'GET' }
        )
        const invoice = data.invoice ? deserializeInvoice(data.invoice as ApiInvoice) : null
        if (invoice) {
          this.invoices.set(invoice.id, invoice)
          this.notify()
        }
        return invoice
      }

      return this.invoices.get(id) ?? null
    }
  }

  async createInvoice(invoice: Invoice) {
    this.hydrate()

    const payload = {
      ...invoice,
      issueDate: invoice.issueDate.toISOString().slice(0, 10),
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    }

    const data = await apiFetch('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    const created = deserializeInvoice(data.invoice as ApiInvoice)
    this.invoices.set(created.id, created)
    this.notify()
    return created
  }

  async updateInvoiceStatus(id: string, status: 'draft' | 'sent' | 'paid' | 'overdue') {
    this.hydrate()

    const data = await apiFetch(`/api/invoices/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    const updated = deserializeInvoice(data.invoice as ApiInvoice)
    this.invoices.set(updated.id, updated)
    this.notify()
    return updated
  }

  async markInvoicePaid(id: string, options?: { publicToken?: string }) {
    this.hydrate()

    if (options?.publicToken) {
      await apiFetch(
        `/api/public/invoices/${encodeURIComponent(id)}/pay?token=${encodeURIComponent(options.publicToken)}`,
        { method: 'POST' }
      )
      // Re-fetch public invoice
      const invoice = await this.getInvoiceById(id, {
        publicToken: options.publicToken,
      })
      return invoice
    }

    const data = await apiFetch(`/api/invoices/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'paid' }),
    })
    const updated = deserializeInvoice(data.invoice as ApiInvoice)
    this.invoices.set(updated.id, updated)
    this.notify()
    return updated
  }
}

export const invoiceService = new InvoiceService()
