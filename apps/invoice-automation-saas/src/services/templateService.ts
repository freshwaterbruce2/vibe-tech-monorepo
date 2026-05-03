export type TemplateBase = 'classic' | 'modern' | 'minimal'

export interface TemplateConfig {
  primaryColor?: string
  accentColor?: string
  fontFamily?: 'Helvetica' | 'Times-Roman' | 'Courier'
  footerText?: string
  logoPath?: string
}

export interface InvoiceTemplate {
  id: string
  userId: string | null
  name: string
  baseTemplate: TemplateBase
  config: TemplateConfig
  isDefault: boolean
  builtIn: boolean
  createdAt: string
  updatedAt: string
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
      (body?.error as string | undefined) || (body?.message as string | undefined) || res.statusText
    throw new Error(message)
  }
  return (await res.json().catch(() => ({}))) as Record<string, unknown>
}

class TemplateService {
  async listTemplates(): Promise<InvoiceTemplate[]> {
    const data = await apiFetch('/api/templates')
    return (data.templates as InvoiceTemplate[]) ?? []
  }

  async createTemplate(input: {
    name: string
    baseTemplate: TemplateBase
    config: TemplateConfig
    isDefault?: boolean
  }): Promise<InvoiceTemplate> {
    const data = await apiFetch('/api/templates', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return data.template as InvoiceTemplate
  }

  async updateTemplate(
    id: string,
    updates: {
      name?: string
      baseTemplate?: TemplateBase
      config?: TemplateConfig
      isDefault?: boolean
    },
  ): Promise<InvoiceTemplate> {
    const data = await apiFetch(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    return data.template as InvoiceTemplate
  }

  async deleteTemplate(id: string): Promise<void> {
    await apiFetch(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }

  async previewBlobUrl(input: {
    baseTemplate: TemplateBase
    config: TemplateConfig
  }): Promise<string> {
    const res = await fetch('/api/templates/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error ?? res.statusText)
    }
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  }

  async uploadLogo(file: File): Promise<{ logoPath: string }> {
    const form = new FormData()
    form.append('logo', file)
    const res = await fetch('/api/users/me/logo', {
      method: 'POST',
      body: form,
      credentials: 'include',
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error ?? res.statusText)
    }
    return (await res.json()) as { logoPath: string }
  }

  async deleteLogo(): Promise<void> {
    const res = await fetch('/api/users/me/logo', {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok && res.status !== 204) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error ?? res.statusText)
    }
  }
}

export const templateService = new TemplateService()
