export interface Expense {
  id: string
  clientId: string | null
  projectId: string | null
  categoryId: string | null
  vendor: string | null
  description: string | null
  amount: number
  currency: string
  expenseDate: string
  isBillable: boolean
  invoicedOnInvoiceId: string | null
  receiptPath: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ExpenseCategory {
  id: string
  name: string
  isBillable: boolean
  createdAt: string
}

export interface ExpenseListFilter {
  from?: string
  to?: string
  clientId?: string
  categoryId?: string
  unbilled?: boolean
}

export interface ExpenseInput {
  description?: string
  vendor?: string
  amount: number
  currency?: string
  expenseDate: string
  isBillable?: boolean
  categoryId?: string | null
  clientId?: string | null
  projectId?: string | null
  notes?: string
  receipt?: File
}

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
    const message =
      (body?.error as string | undefined) ||
      (body?.message as string | undefined) ||
      res.statusText
    throw new Error(message)
  }
  return (await res.json().catch(() => ({}))) as Record<string, unknown>
}

class ExpenseService {
  async listExpenses(filter: ExpenseListFilter = {}): Promise<Expense[]> {
    const params = new URLSearchParams()
    if (filter.from) params.set('from', filter.from)
    if (filter.to) params.set('to', filter.to)
    if (filter.clientId) params.set('clientId', filter.clientId)
    if (filter.categoryId) params.set('categoryId', filter.categoryId)
    if (filter.unbilled) params.set('unbilled', '1')
    const qs = params.toString() ? `?${params}` : ''
    const data = await apiFetch(`/api/expenses${qs}`)
    return (data.expenses as Expense[]) ?? []
  }

  async createExpense(input: ExpenseInput): Promise<Expense> {
    const form = new FormData()
    if (input.description) form.append('description', input.description)
    if (input.vendor) form.append('vendor', input.vendor)
    form.append('amount', String(input.amount))
    form.append('currency', input.currency ?? 'USD')
    form.append('expenseDate', input.expenseDate)
    form.append('isBillable', String(input.isBillable === true))
    if (input.categoryId) form.append('categoryId', input.categoryId)
    if (input.clientId) form.append('clientId', input.clientId)
    if (input.projectId) form.append('projectId', input.projectId)
    if (input.notes) form.append('notes', input.notes)
    if (input.receipt) form.append('receipt', input.receipt)

    const res = await fetch('/api/expenses', {
      method: 'POST',
      body: form,
      credentials: 'include',
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error ?? res.statusText)
    }
    const data = (await res.json()) as { expense: Expense }
    return data.expense
  }

  async updateExpense(id: string, updates: Partial<ExpenseInput>): Promise<Expense> {
    const data = await apiFetch(`/api/expenses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    return data.expense as Expense
  }

  async deleteExpense(id: string): Promise<void> {
    await apiFetch(`/api/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  async listCategories(): Promise<ExpenseCategory[]> {
    const data = await apiFetch('/api/expense-categories')
    return (data.categories as ExpenseCategory[]) ?? []
  }

  async createCategory(name: string, isBillable = true): Promise<ExpenseCategory> {
    const data = await apiFetch('/api/expense-categories', {
      method: 'POST',
      body: JSON.stringify({ name, isBillable }),
    })
    return data.category as ExpenseCategory
  }

  async addExpenseToInvoice(invoiceId: string, expenseId: string): Promise<void> {
    await apiFetch(
      `/api/invoices/${encodeURIComponent(invoiceId)}/items/from-expense`,
      {
        method: 'POST',
        body: JSON.stringify({ expenseId }),
      },
    )
  }
}

export const expenseService = new ExpenseService()
