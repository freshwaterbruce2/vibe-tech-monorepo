export interface Project {
  id: string
  clientId: string | null
  name: string
  hourlyRate: number | null
  currency: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface TimeEntry {
  id: string
  projectId: string | null
  clientId: string | null
  description: string | null
  startedAt: string
  endedAt: string | null
  durationSeconds: number | null
  isBillable: boolean
  hourlyRate: number | null
  invoicedOnInvoiceId: string | null
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
      (body?.error as string | undefined) ||
      (body?.message as string | undefined) ||
      res.statusText
    throw new Error(message)
  }
  return (await res.json().catch(() => ({}))) as Record<string, unknown>
}

class TimeService {
  async listProjects(): Promise<Project[]> {
    const data = await apiFetch('/api/projects')
    return (data.projects as Project[]) ?? []
  }

  async createProject(input: {
    name: string
    clientId?: string | null
    hourlyRate?: number | null
    currency?: string
  }): Promise<Project> {
    const data = await apiFetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return data.project as Project
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const data = await apiFetch(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    return data.project as Project
  }

  async deleteProject(id: string): Promise<void> {
    await apiFetch(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  async listEntries(filter: {
    from?: string
    to?: string
    projectId?: string
    unbilled?: boolean
  } = {}): Promise<TimeEntry[]> {
    const params = new URLSearchParams()
    if (filter.from) params.set('from', filter.from)
    if (filter.to) params.set('to', filter.to)
    if (filter.projectId) params.set('projectId', filter.projectId)
    if (filter.unbilled) params.set('unbilled', '1')
    const qs = params.toString() ? `?${params}` : ''
    const data = await apiFetch(`/api/time-entries${qs}`)
    return (data.timeEntries as TimeEntry[]) ?? []
  }

  async getRunning(): Promise<TimeEntry | null> {
    const data = await apiFetch('/api/time-entries/running')
    return (data.running as TimeEntry | null) ?? null
  }

  async start(input: {
    projectId?: string
    description?: string
  } = {}): Promise<TimeEntry> {
    const data = await apiFetch('/api/time-entries/start', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return data.timeEntry as TimeEntry
  }

  async stop(id: string): Promise<TimeEntry> {
    const data = await apiFetch(`/api/time-entries/${encodeURIComponent(id)}/stop`, {
      method: 'POST',
    })
    return data.timeEntry as TimeEntry
  }

  async addManual(input: {
    projectId?: string
    startedAt: string
    endedAt: string
    description?: string
    isBillable?: boolean
  }): Promise<TimeEntry> {
    const data = await apiFetch('/api/time-entries', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return data.timeEntry as TimeEntry
  }

  async deleteEntry(id: string): Promise<void> {
    await apiFetch(`/api/time-entries/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  async addEntriesToInvoice(invoiceId: string, entryIds: string[]): Promise<void> {
    await apiFetch(
      `/api/invoices/${encodeURIComponent(invoiceId)}/items/from-time`,
      {
        method: 'POST',
        body: JSON.stringify({ entryIds }),
      },
    )
  }
}

export const timeService = new TimeService()
