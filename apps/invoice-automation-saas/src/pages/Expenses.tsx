import { Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import Navigation from '../components/common/Navigation'
import { formatCurrency } from '../lib/currency'
import {
  expenseService,
  type Expense,
  type ExpenseCategory,
} from '../services/expenseService'

interface ExpenseFormState {
  description: string
  vendor: string
  amount: string
  currency: string
  expenseDate: string
  categoryId: string
  isBillable: boolean
  notes: string
}

const todayIso = (): string => new Date().toISOString().slice(0, 10)

const emptyForm = (): ExpenseFormState => ({
  description: '',
  vendor: '',
  amount: '0',
  currency: 'USD',
  expenseDate: todayIso(),
  categoryId: '',
  isBillable: false,
  notes: '',
})

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<ExpenseFormState>(emptyForm())
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [exps, cats] = await Promise.all([
        expenseService.listExpenses(),
        expenseService.listCategories(),
      ])
      setExpenses(exps)
      setCategories(cats)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onCreate = async () => {
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Amount must be >= 0')
      return
    }
    if (!form.expenseDate) {
      toast.error('Expense date is required')
      return
    }
    setSaving(true)
    try {
      const file = fileRef.current?.files?.[0]
      await expenseService.createExpense({
        description: form.description || undefined,
        vendor: form.vendor || undefined,
        amount,
        currency: form.currency || 'USD',
        expenseDate: form.expenseDate,
        categoryId: form.categoryId || null,
        isBillable: form.isBillable,
        notes: form.notes || undefined,
        receipt: file,
      })
      toast.success('Expense saved')
      setForm(emptyForm())
      setShowForm(false)
      if (fileRef.current) fileRef.current.value = ''
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (e: Expense) => {
    if (!confirm('Delete expense?')) return
    try {
      await expenseService.deleteExpense(e.id)
      toast.success('Deleted')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const onCreateCategory = async () => {
    const name = prompt('Category name:')
    if (!name) return
    setCreating(true)
    try {
      await expenseService.createCategory(name)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="ui-page">
      <Navigation variant="app" />
      <main className="ui-container">
        <div className="ui-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="ui-h1">Expenses</h1>
          <div className="ui-row" style={{ gap: 8 }}>
            <button
              type="button"
              className="ui-button ui-button--ghost"
              onClick={() => void onCreateCategory()}
              disabled={creating}
            >
              + Category
            </button>
            <button
              type="button"
              className="ui-button"
              onClick={() => setShowForm(true)}
            >
              <Plus size={16} /> New expense
            </button>
          </div>
        </div>

        {loading ? (
          <div className="ui-muted">Loading…</div>
        ) : expenses.length === 0 ? (
          <div className="ui-muted">No expenses yet.</div>
        ) : (
          <table className="ui-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vendor</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Billable</th>
                <th>Invoiced</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>{e.expenseDate}</td>
                  <td>{e.vendor ?? ''}</td>
                  <td>{e.description ?? ''}</td>
                  <td>{formatCurrency(e.amount, e.currency)}</td>
                  <td>{e.isBillable ? 'yes' : ''}</td>
                  <td>{e.invoicedOnInvoiceId ?? ''}</td>
                  <td className="ui-row" style={{ justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="ui-button ui-button--ghost"
                      onClick={() => void onDelete(e)}
                      disabled={Boolean(e.invoicedOnInvoiceId)}
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showForm ? (
          <div className="ui-card" style={{ marginTop: 24, padding: 16, position: 'relative' }}>
            <button
              type="button"
              className="ui-button ui-button--ghost"
              onClick={() => setShowForm(false)}
              aria-label="Close"
              style={{ position: 'absolute', top: 8, right: 8 }}
            >
              <X size={16} />
            </button>
            <h2 className="ui-h2">New expense</h2>

            <div className="ui-stack ui-stack--md">
              <label>
                Date
                <input
                  className="ui-input"
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                />
              </label>
              <label>
                Vendor
                <input
                  className="ui-input"
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                />
              </label>
              <label>
                Description
                <input
                  className="ui-input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <label>
                Amount
                <input
                  className="ui-input"
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </label>
              <label>
                Category
                <select
                  className="ui-input"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">(none)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.isBillable}
                  onChange={(e) => setForm({ ...form, isBillable: e.target.checked })}
                />
                {' '}Billable to client
              </label>
              <label>
                Receipt (optional)
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                />
              </label>
              <label>
                Notes
                <textarea
                  className="ui-input"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>

              <button
                type="button"
                className="ui-button"
                onClick={() => void onCreate()}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save expense'}
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default Expenses
