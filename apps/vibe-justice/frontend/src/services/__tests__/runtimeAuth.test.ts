import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { isTauri } from '../tauri'
import { getRuntimeApiKey, initializeRuntimeAuth, resetRuntimeAuthForTests } from '../runtimeAuth'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('../tauri', () => ({ isTauri: vi.fn() }))

describe('runtimeAuth', () => {
  beforeEach(() => {
    resetRuntimeAuthForTests()
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('retrieves the production key only through Tauri IPC', async () => {
    vi.mocked(isTauri).mockReturnValue(true)
    vi.mocked(invoke).mockResolvedValueOnce('Backend started').mockResolvedValueOnce('runtime-secret')
    await initializeRuntimeAuth()
    expect(invoke).toHaveBeenNthCalledWith(1, 'start_backend')
    expect(invoke).toHaveBeenNthCalledWith(2, 'get_internal_api_key')
    expect(getRuntimeApiKey()).toBe('runtime-secret')
  })

  it('does not invoke IPC in browser mode', async () => {
    vi.mocked(isTauri).mockReturnValue(false)
    vi.stubEnv('VITE_VIBE_JUSTICE_API_KEY', 'browser-dev-key')
    await initializeRuntimeAuth()
    expect(invoke).not.toHaveBeenCalled()
    expect(getRuntimeApiKey()).toBe('browser-dev-key')
  })

  it('reads the env key before initialize in browser mode', () => {
    vi.mocked(isTauri).mockReturnValue(false)
    vi.stubEnv('VITE_VIBE_JUSTICE_API_KEY', 'pre-init-key')
    expect(getRuntimeApiKey()).toBe('pre-init-key')
  })
})
