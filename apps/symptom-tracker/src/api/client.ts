export interface Person {
  id: string
  name: string
  createdAt?: string
}

export interface SymptomEntry {
  id: string
  personId: string
  date: string // YYYY-MM-DD
  time?: string | null // HH:MM
  symptom: string
  severity: number // 0..10
  duration?: number | null // Duration in minutes (2026 enhancement)
  location?: string | null // Body location (2026 enhancement)
  notes?: string | null
  tags?: unknown
  createdAt?: string
  updatedAt?: string
}

export interface SymptomSummaryRow {
  symptom: string
  count: number
  avgSeverity: number
}

async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const text = await res.text()
  const json = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) {
    const message =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error: unknown }).error)
        : `Request failed: ${res.status}`
    throw new Error(message)
  }

  return json as T
}

export async function healthCheck(): Promise<boolean> {
  try {
    await requestJson('/api/health')
    return true
  } catch {
    return false
  }
}

export async function getPeople(): Promise<Person[]> {
  const data = await requestJson<{ people: Person[] }>('/api/people')
  return data.people
}

export async function createPerson(name: string): Promise<Person> {
  const data = await requestJson<{ person: Person }>('/api/people', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return data.person
}

export interface ListEntriesParams {
  personId: string
  from?: string
  to?: string
  q?: string
}

export async function listEntries(params: ListEntriesParams): Promise<SymptomEntry[]> {
  const url = new URL('/api/symptoms', window.location.origin)
  url.searchParams.set('personId', params.personId)
  if (params.from) url.searchParams.set('from', params.from)
  if (params.to) url.searchParams.set('to', params.to)
  if (params.q) url.searchParams.set('q', params.q)

  const data = await requestJson<{ entries: SymptomEntry[] }>(url.toString())
  return data.entries
}

export interface CreateEntryInput {
  personId: string
  date: string
  time?: string
  symptom: string
  severity: number
  notes?: string
  tags?: string[]
}

export async function createEntry(input: CreateEntryInput): Promise<{ id: string }> {
  const data = await requestJson<{ entry: { id: string } }>('/api/symptoms', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.entry
}

export type UpdateEntryInput = Partial<Omit<CreateEntryInput, 'personId'>> & {
  time?: string | null
}

export async function updateEntry(
  id: string,
  patch: UpdateEntryInput,
): Promise<{ ok: true }> {
  const data = await requestJson<{ ok: true }>(`/api/symptoms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
  return data
}

export async function deleteEntry(id: string): Promise<{ ok: true }> {
  const data = await requestJson<{ ok: true }>(`/api/symptoms/${id}`, {
    method: 'DELETE',
  })
  return data
}

export async function getSummary(params: ListEntriesParams): Promise<SymptomSummaryRow[]> {
  const url = new URL('/api/summary', window.location.origin)
  url.searchParams.set('personId', params.personId)
  if (params.from) url.searchParams.set('from', params.from)
  if (params.to) url.searchParams.set('to', params.to)
  const data = await requestJson<{ summary: SymptomSummaryRow[] }>(url.toString())
  return data.summary
}

