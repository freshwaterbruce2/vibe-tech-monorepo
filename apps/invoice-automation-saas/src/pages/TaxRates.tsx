import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import Navigation from '../components/common/Navigation'
import { taxRateService, type TaxRate } from '../services/taxRateService'

type FormMode = 'closed' | 'create' | 'edit'

interface TaxRateFormState {
  name: string
  ratePct: string
  regionCode: string
  isCompound: boolean
  isDefault: boolean
}

const emptyForm: TaxRateFormState = {
  name: '',
  ratePct: '0',
  regionCode: '',
  isCompound: false,
  isDefault: false,
}

const TaxRates = () => {
  const [rates, setRates] = useState<TaxRate[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<TaxRateFormState>(emptyForm)
  const [formMode, setFormMode] = useState<FormMode>('closed')
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await taxRateService.listTaxRates()
      setRates(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tax rates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setForm(emptyForm)
    setEditId(null)
    setFormMode('create')
  }

  const openEdit = (r: TaxRate) => {
    setForm({
      name: r.name,
      ratePct: String(r.ratePct),
      regionCode: r.regionCode ?? '',
      isCompound: r.isCompound,
      isDefault: r.isDefault,
    })
    setEditId(r.id)
    setFormMode('edit')
  }

  const closeForm = () => {
    setFormMode('closed')
    setEditId(null)
  }

  const onSave = async () => {
    const name = form.name.trim()
    if (!name) {
      toast.error('Name is required')
      return
    }
    const ratePct = Number(form.ratePct)
    if (!Number.isFinite(ratePct) || ratePct < 0 || ratePct > 100) {
      toast.error('Rate must be between 0 and 100')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name,
        ratePct,
        regionCode: form.regionCode.trim() || null,
        isCompound: form.isCompound,
        isDefault: form.isDefault,
      }
      if (formMode === 'create') {
        await taxRateService.createTaxRate(payload)
        toast.success('Tax rate created')
      } else if (editId) {
        await taxRateService.updateTaxRate(editId, payload)
        toast.success('Tax rate updated')
      }
      closeForm()
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (r: TaxRate) => {
    if (!confirm(`Delete tax rate "${r.name}"?`)) return
    try {
      await taxRateService.deleteTaxRate(r.id)
      toast.success('Deleted')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="ui-page">
      <Navigation variant="app" />
      <main className="ui-container">
        <div className="ui-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="ui-h1">Tax rates</h1>
          <button type="button" className="ui-button" onClick={openCreate}>
            <Plus size={16} /> New tax rate
          </button>
        </div>

        {loading ? (
          <div className="ui-muted">Loading…</div>
        ) : rates.length === 0 ? (
          <div className="ui-muted">No tax rates yet. Create one to apply taxes to invoices.</div>
        ) : (
          <table className="ui-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Rate</th>
                <th>Region</th>
                <th>Compound</th>
                <th>Default</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.ratePct.toFixed(2)}%</td>
                  <td>{r.regionCode ?? ''}</td>
                  <td>{r.isCompound ? 'yes' : ''}</td>
                  <td>{r.isDefault ? 'yes' : ''}</td>
                  <td className="ui-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      className="ui-button ui-button--ghost"
                      onClick={() => openEdit(r)}
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="ui-button ui-button--ghost"
                      onClick={() => void onDelete(r)}
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

        {formMode !== 'closed' ? (
          <div className="ui-card" style={{ marginTop: 24, padding: 16, position: 'relative' }}>
            <button
              type="button"
              className="ui-button ui-button--ghost"
              onClick={closeForm}
              aria-label="Close"
              style={{ position: 'absolute', top: 8, right: 8 }}
            >
              <X size={16} />
            </button>
            <h2 className="ui-h2">
              {formMode === 'create' ? 'New tax rate' : 'Edit tax rate'}
            </h2>

            <div className="ui-stack ui-stack--md">
              <label>
                Name
                <input
                  className="ui-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Rate (%)
                <input
                  className="ui-input"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={form.ratePct}
                  onChange={(e) => setForm({ ...form, ratePct: e.target.value })}
                />
              </label>
              <label>
                Region (ISO 3166-2, optional)
                <input
                  className="ui-input"
                  value={form.regionCode}
                  onChange={(e) => setForm({ ...form, regionCode: e.target.value })}
                  placeholder="GB, US-CA"
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.isCompound}
                  onChange={(e) => setForm({ ...form, isCompound: e.target.checked })}
                />
                {' '}Compound (applied on subtotal + previous taxes)
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                />
                {' '}Make default
              </label>

              <div className="ui-row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="ui-button"
                  onClick={() => void onSave()}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : formMode === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default TaxRates
