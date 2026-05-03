// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchExchangeRate } from './fx.js'

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchExchangeRate', () => {
  it('parses a successful Frankfurter response and returns the rate', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          amount: 1,
          base: 'USD',
          date: '2026-05-02',
          rates: { EUR: 0.92 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const rate = await fetchExchangeRate('USD', 'EUR')
    expect(rate).toBe(0.92)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const calledWith = fetchMock.mock.calls[0]?.[0] as string
    expect(calledWith).toContain('/v1/latest')
    expect(calledWith).toContain('base=USD')
    expect(calledWith).toContain('symbols=EUR')
  })

  it('uses the supplied date in the URL when provided', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          amount: 1,
          base: 'USD',
          date: '2024-12-31',
          rates: { EUR: 0.95 },
        }),
        { status: 200 }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const rate = await fetchExchangeRate('USD', 'EUR', '2024-12-31')
    expect(rate).toBe(0.95)
    const calledWith = fetchMock.mock.calls[0]?.[0] as string
    expect(calledWith).toContain('/v1/2024-12-31')
  })

  it('throws on non-OK HTTP response', async () => {
    const fetchMock = vi.fn(
      async () => new Response('boom', { status: 500, statusText: 'Server Error' })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchExchangeRate('USD', 'EUR')).rejects.toThrow(
      /Frankfurter request failed: 500/
    )
  })

  it('throws when the target currency is missing from rates', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            amount: 1,
            base: 'USD',
            date: '2026-05-02',
            rates: { GBP: 0.79 },
          }),
          { status: 200 }
        )
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchExchangeRate('USD', 'EUR')).rejects.toThrow(
      /missing rate for EUR/
    )
  })
})
