import { beforeEach, describe, expect, it, vi } from 'vitest'

const initializeRuntimeAuth = vi.fn()

vi.mock('./services/runtimeAuth', () => ({
  initializeRuntimeAuth: (...args: unknown[]) => initializeRuntimeAuth(...args),
}))

vi.mock('./App', () => ({
  default: () => <div>app-root</div>,
}))

vi.mock('./index.css', () => ({}))

describe('main boot', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    initializeRuntimeAuth.mockReset()
    vi.resetModules()
  })

  it('renders the app after private backend auth initializes', async () => {
    initializeRuntimeAuth.mockResolvedValue(undefined)
    await import('./main')
    await vi.waitFor(() => {
      expect(document.getElementById('root')?.textContent).toContain('app-root')
    })
  })

  it('fails closed when runtime auth cannot initialize', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    initializeRuntimeAuth.mockRejectedValue(new Error('no runtime key'))
    await import('./main')
    await vi.waitFor(() => {
      expect(document.getElementById('root')?.textContent).toContain(
        'Vibe Justice could not initialize its private backend connection.',
      )
    })
    errorSpy.mockRestore()
  })

  it('fails closed when the root element is missing after auth initializes', async () => {
    document.body.innerHTML = ''
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    initializeRuntimeAuth.mockResolvedValue(undefined)
    await import('./main')
    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalled()
    })
    errorSpy.mockRestore()
  })
})
