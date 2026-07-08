import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('sw-registration', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker
  })

  it('registers the service worker and dispatches an update event once the new worker installs', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    let loadHandler: ((event: Event) => unknown) | undefined
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (type, listener) => {
        if (type === 'load' && typeof listener === 'function') {
          loadHandler = listener as (event: Event) => unknown
        }
      }
    )

    let updateFoundHandler: (() => void) | undefined
    let stateChangeHandler: (() => void) | undefined
    const installingWorker = {
      state: 'installed',
      addEventListener: vi.fn((type: string, cb: () => void) => {
        if (type === 'statechange') stateChangeHandler = cb
      }),
    }
    const registration = {
      installing: installingWorker,
      addEventListener: vi.fn((type: string, cb: () => void) => {
        if (type === 'updatefound') updateFoundHandler = cb
      }),
    }

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn().mockResolvedValue(registration),
        controller: {},
      },
      configurable: true,
    })

    await import('../sw-registration')
    expect(loadHandler).toBeDefined()

    await loadHandler?.(new Event('load'))

    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', {
      scope: '/',
    })
    expect(warnSpy).toHaveBeenCalledWith('SW registered: ', registration)

    updateFoundHandler?.()
    stateChangeHandler?.()

    expect(warnSpy).toHaveBeenCalledWith(
      'New content is available; please refresh.'
    )
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sw-update-available' })
    )
  })

  it('logs an error when registration fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failure = new Error('registration failed')

    let loadHandler: ((event: Event) => unknown) | undefined
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (type, listener) => {
        if (type === 'load' && typeof listener === 'function') {
          loadHandler = listener as (event: Event) => unknown
        }
      }
    )

    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: vi.fn().mockRejectedValue(failure) },
      configurable: true,
    })

    await import('../sw-registration')
    expect(loadHandler).toBeDefined()

    await loadHandler?.(new Event('load'))

    expect(errorSpy).toHaveBeenCalledWith('SW registration failed: ', failure)
  })

  it('does not register when the browser has no serviceWorker support', async () => {
    delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    await import('../sw-registration')

    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      'load',
      expect.any(Function)
    )
  })
})
