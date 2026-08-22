import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analyzeLegalDocument, checkOpenRouterHealth, getAvailableModels, getUsageStats, openRouterClient } from '../openrouter'

describe('OpenRouter quarantine', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('never makes a direct outbound request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await expect(openRouterClient.chat({ model: 'test', messages: [] })).rejects.toThrow(
      'External provider access is disabled pending explicit per-action consent',
    )
    await expect(analyzeLegalDocument('synthetic text')).rejects.toThrow(
      'External provider access is disabled pending explicit per-action consent',
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reports provider discovery and usage as unavailable', async () => {
    expect(await checkOpenRouterHealth()).toBe(false)
    expect(await getAvailableModels()).toEqual([])
    expect(await getUsageStats()).toBeNull()
  })
})
