export interface TaxRate {
  id: string
  name: string
  ratePct: number
  regionCode: string | null
  isCompound: boolean
  isDefault: boolean
  createdAt: string
}

export interface TaxRateInput {
  name: string
  ratePct: number
  regionCode?: string | null
  isCompound?: boolean
  isDefault?: boolean
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

class TaxRateService {
  async listTaxRates(): Promise<TaxRate[]> {
    const data = await apiFetch('/api/tax-rates')
    return (data.taxRates as TaxRate[]) ?? []
  }

  async createTaxRate(input: TaxRateInput): Promise<TaxRate> {
    const data = await apiFetch('/api/tax-rates', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return data.taxRate as TaxRate
  }

  async updateTaxRate(id: string, updates: Partial<TaxRateInput>): Promise<TaxRate> {
    const data = await apiFetch(`/api/tax-rates/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    return data.taxRate as TaxRate
  }

  async deleteTaxRate(id: string): Promise<void> {
    await apiFetch(`/api/tax-rates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }
}

export const taxRateService = new TaxRateService()
