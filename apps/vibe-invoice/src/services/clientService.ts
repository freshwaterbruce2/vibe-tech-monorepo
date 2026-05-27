import type { Client } from '../types/invoice'

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
    const body = (await res.json().catch(() => null)) as any
    const message = body?.error || body?.message || res.statusText
    throw new Error(message)
  }
  return (await res.json().catch(() => ({}))) as any
}

export type ApiClient = Omit<Client, 'id'> & { id?: string; createdAt?: string; updatedAt?: string }

class ClientService {
  async listClients(): Promise<Client[]> {
    const data = await apiFetch('/api/clients')
    return (data.clients ?? []) as Client[]
  }

  async createClient(client: Omit<Client, 'id'>): Promise<Client> {
    const data = await apiFetch('/api/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    })
    return data.client as Client
  }

  async updateClient(id: string, updates: Partial<Omit<Client, 'id'>>): Promise<Client> {
    const data = await apiFetch(`/api/clients/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    return data.client as Client
  }

  async deleteClient(id: string): Promise<void> {
    await apiFetch(`/api/clients/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }
}

export const clientService = new ClientService()
