import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clientService } from '../../services/clientService'

const mockClient = {
  id: 'c-1',
  name: 'Acme Corp',
  email: 'billing@acme.com',
  phone: '555-0100',
  company: 'Acme',
  address: '123 Main St',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as unknown as typeof fetch

beforeEach(() => {
  vi.clearAllMocks()
})

describe('clientService', () => {
  it('listClients returns array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ clients: [mockClient] }),
    })

    const clients = await clientService.listClients()
    expect(clients).toHaveLength(1)
    expect(clients[0]!.name).toBe('Acme Corp')
    expect(mockFetch).toHaveBeenCalledWith('/api/clients', expect.any(Object))
  })

  it('createClient sends POST', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ client: mockClient }),
    })

    const result = await clientService.createClient({
      name: 'Acme Corp',
      email: 'billing@acme.com',
    })
    expect(result.name).toBe('Acme Corp')
    const callArgs = mockFetch.mock.calls[0]!
    expect(callArgs[0]).toBe('/api/clients')
    expect(callArgs[1].method).toBe('POST')
  })

  it('updateClient sends PATCH', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ client: { ...mockClient, name: 'Acme Inc' } }),
    })

    const result = await clientService.updateClient('c-1', { name: 'Acme Inc' })
    expect(result.name).toBe('Acme Inc')
    const callArgs = mockFetch.mock.calls[0]!
    expect(callArgs[0]).toBe('/api/clients/c-1')
    expect(callArgs[1].method).toBe('PATCH')
  })

  it('deleteClient sends DELETE', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    })

    await clientService.deleteClient('c-1')
    const callArgs = mockFetch.mock.calls[0]!
    expect(callArgs[0]).toBe('/api/clients/c-1')
    expect(callArgs[1].method).toBe('DELETE')
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Conflict',
      json: async () => ({ error: 'Client with this email already exists' }),
    })

    await expect(
      clientService.createClient({ name: 'Test', email: 'dup@test.com' })
    ).rejects.toThrow('Client with this email already exists')
  })
})
