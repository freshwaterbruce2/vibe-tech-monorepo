import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import Navigation from '../components/common/Navigation'
import {
  templateService,
  type InvoiceTemplate,
  type TemplateBase,
  type TemplateConfig,
} from '../services/templateService'

type FormMode = 'closed' | 'create' | 'edit'

interface TemplateFormState {
  name: string
  baseTemplate: TemplateBase
  primaryColor: string
  accentColor: string
  footerText: string
  isDefault: boolean
}

const emptyForm: TemplateFormState = {
  name: '',
  baseTemplate: 'classic',
  primaryColor: '#111827',
  accentColor: '#2563eb',
  footerText: '',
  isDefault: false,
}

const buildConfig = (form: TemplateFormState): TemplateConfig => ({
  primaryColor: form.primaryColor || undefined,
  accentColor: form.accentColor || undefined,
  footerText: form.footerText || undefined,
})

const Templates = () => {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<TemplateFormState>(emptyForm)
  const [formMode, setFormMode] = useState<FormMode>('closed')
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await templateService.listTemplates()
      setTemplates(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const openCreate = () => {
    setForm(emptyForm)
    setEditId(null)
    setFormMode('create')
  }

  const openEdit = (t: InvoiceTemplate) => {
    setForm({
      name: t.name,
      baseTemplate: t.baseTemplate,
      primaryColor: t.config.primaryColor ?? '#111827',
      accentColor: t.config.accentColor ?? '#2563eb',
      footerText: t.config.footerText ?? '',
      isDefault: t.isDefault,
    })
    setEditId(t.id)
    setFormMode('edit')
  }

  const closeForm = () => {
    setFormMode('closed')
    setEditId(null)
  }

  const onSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      if (formMode === 'create') {
        await templateService.createTemplate({
          name: form.name.trim(),
          baseTemplate: form.baseTemplate,
          config: buildConfig(form),
          isDefault: form.isDefault,
        })
        toast.success('Template created')
      } else if (editId) {
        await templateService.updateTemplate(editId, {
          name: form.name.trim(),
          baseTemplate: form.baseTemplate,
          config: buildConfig(form),
          isDefault: form.isDefault,
        })
        toast.success('Template updated')
      }
      closeForm()
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (t: InvoiceTemplate) => {
    if (t.builtIn) return
    if (!confirm(`Delete template "${t.name}"?`)) return
    try {
      await templateService.deleteTemplate(t.id)
      toast.success('Deleted')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const onPreview = async () => {
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      const url = await templateService.previewBlobUrl({
        baseTemplate: form.baseTemplate,
        config: buildConfig(form),
      })
      setPreviewUrl(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Preview failed')
    }
  }

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      await templateService.uploadLogo(file)
      toast.success('Logo uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLogoUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="ui-page">
      <Navigation variant="app" />
      <main className="ui-container">
        <div className="ui-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="ui-h1">Invoice templates</h1>
          <div className="ui-row" style={{ gap: 8 }}>
            <label className="ui-button ui-button--ghost">
              {logoUploading ? 'Uploading…' : 'Upload logo'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={onLogoChange}
                style={{ display: 'none' }}
              />
            </label>
            <button type="button" className="ui-button" onClick={openCreate}>
              <Plus size={16} /> New template
            </button>
          </div>
        </div>

        {loading ? (
          <div className="ui-muted">Loading…</div>
        ) : (
          <table className="ui-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Base</th>
                <th>Default</th>
                <th>Source</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.baseTemplate}</td>
                  <td>{t.isDefault ? 'yes' : ''}</td>
                  <td>{t.builtIn ? 'built-in' : 'custom'}</td>
                  <td className="ui-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      className="ui-button ui-button--ghost"
                      onClick={() => openEdit(t)}
                      disabled={t.builtIn}
                      aria-label="Edit template"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="ui-button ui-button--ghost"
                      onClick={() => void onDelete(t)}
                      disabled={t.builtIn}
                      aria-label="Delete template"
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
          <div
            className="ui-card"
            style={{ marginTop: 24, padding: 16, position: 'relative' }}
          >
            <button
              type="button"
              className="ui-button ui-button--ghost"
              onClick={closeForm}
              aria-label="Close form"
              style={{ position: 'absolute', top: 8, right: 8 }}
            >
              <X size={16} />
            </button>
            <h2 className="ui-h2">
              {formMode === 'create' ? 'New template' : 'Edit template'}
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
                Base template
                <select
                  className="ui-input"
                  value={form.baseTemplate}
                  onChange={(e) =>
                    setForm({ ...form, baseTemplate: e.target.value as TemplateBase })
                  }
                >
                  <option value="classic">Classic</option>
                  <option value="modern">Modern</option>
                  <option value="minimal">Minimal</option>
                </select>
              </label>
              <label>
                Primary color
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                />
              </label>
              <label>
                Accent color
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                />
              </label>
              <label>
                Footer text
                <input
                  className="ui-input"
                  value={form.footerText}
                  onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                />
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
                <button
                  type="button"
                  className="ui-button ui-button--ghost"
                  onClick={() => void onPreview()}
                >
                  Preview
                </button>
              </div>

              {previewUrl ? (
                <iframe
                  title="Template preview"
                  src={previewUrl}
                  style={{
                    width: '100%',
                    height: 600,
                    border: '1px solid var(--ui-border, #e5e7eb)',
                    borderRadius: 8,
                  }}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default Templates
