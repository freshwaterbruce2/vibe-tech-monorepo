import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { clientService } from '../services/clientService'
import type { Client } from '../types/invoice'

type FormMode = 'closed' | 'create' | 'edit'

interface ClientForm {
  name: string
  email: string
  phone: string
  company: string
  address: string
}

const emptyForm: ClientForm = { name: '', email: '', phone: '', company: '', address: '' }

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<ClientForm>(emptyForm)
  const [formMode, setFormMode] = useState<FormMode>('closed')
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await clientService.listClients()
      setClients(data)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm(emptyForm)
    setEditId(null)
    setFormMode('create')
  }

  const openEdit = (c: Client) => {
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone ?? '',
      company: c.company ?? '',
      address: c.address ?? '',
    })
    setEditId(c.id)
    setFormMode('edit')
  }

  const closeForm = () => {
    setFormMode('closed')
    setEditId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    setSaving(true)
    try {
      if (formMode === 'create') {
        await clientService.createClient({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          company: form.company.trim() || undefined,
          address: form.address.trim() || undefined,
        } as any)
        toast.success('Client created')
      } else if (formMode === 'edit' && editId) {
        await clientService.updateClient(editId, {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          company: form.company.trim() || undefined,
          address: form.address.trim() || undefined,
        })
        toast.success('Client updated')
      }
      closeForm()
      await load()
    } catch (err: any) {
      toast.error(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete client "${name}"? This cannot be undone.`)) return
    try {
      await clientService.deleteClient(id)
      toast.success('Client deleted')
      await load()
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed')
    }
  }

  return (
    <div className="ui-stack" style={{ gap: '2rem' }}>
      <div className="ui-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="ui-h1">Clients</h1>
        <button className="ui-btn ui-btn--primary" onClick={openCreate}>
          <Plus size={16} /> Add Client
        </button>
      </div>

      {formMode !== 'closed' && (
        <div className="ui-card">
          <div
            className="ui-row"
            style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}
          >
            <h2 className="ui-h2">{formMode === 'create' ? 'New Client' : 'Edit Client'}</h2>
            <button className="ui-btn ui-btn--ghost" onClick={closeForm} aria-label="Close form">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="ui-stack" style={{ gap: '1rem' }}>
            <div className="ui-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="ui-field">
                <label className="ui-label">Name *</label>
                <input
                  className="ui-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="ui-field">
                <label className="ui-label">Email *</label>
                <input
                  className="ui-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="ui-field">
                <label className="ui-label">Phone</label>
                <input
                  className="ui-input"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="ui-field">
                <label className="ui-label">Company</label>
                <input
                  className="ui-input"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>
            </div>
            <div className="ui-field">
              <label className="ui-label">Address</label>
              <input
                className="ui-input"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="ui-row" style={{ gap: '0.75rem' }}>
              <button className="ui-btn ui-btn--primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : formMode === 'create' ? 'Create Client' : 'Save Changes'}
              </button>
              <button className="ui-btn ui-btn--secondary" type="button" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="ui-stack" style={{ alignItems: 'center', padding: '3rem' }}>
          <div className="ui-spinner" />
        </div>
      ) : clients.length === 0 ? (
        <div className="ui-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="ui-muted">No clients yet. Click "Add Client" to create your first one.</p>
        </div>
      ) : (
        <div className="ui-table" role="table">
          <div className="ui-table__head client-grid" role="row">
            <span role="columnheader">Name</span>
            <span role="columnheader">Email</span>
            <span role="columnheader">Company</span>
            <span role="columnheader">Phone</span>
            <span role="columnheader">Actions</span>
          </div>
          {clients.map((c) => (
            <div className="ui-table__row client-grid" role="row" key={c.id}>
              <span className="ui-mono">{c.name}</span>
              <span>{c.email}</span>
              <span>{c.company ?? '—'}</span>
              <span>{c.phone ?? '—'}</span>
              <span className="ui-row" style={{ gap: '0.5rem' }}>
                <button
                  className="ui-btn ui-btn--ghost ui-btn--sm"
                  onClick={() => openEdit(c)}
                  title="Edit"
                  aria-label="Edit client"
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="ui-btn ui-btn--ghost ui-btn--sm"
                  onClick={async () => handleDelete(c.id, c.name)}
                  title="Delete"
                  aria-label="Delete client"
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
