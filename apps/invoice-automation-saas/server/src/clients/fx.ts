/**
 * Frankfurter FX client.
 *
 * Calls https://api.frankfurter.dev to fetch a single from -> to exchange
 * rate. No SDK; uses global fetch. No caching layer — T2.3 will add an
 * exchange_rates table for that.
 *
 * The API responds with shape:
 *   { amount: number, base: string, date: string, rates: { TARGET: number } }
 */

const FRANKFURTER_BASE_URL = 'https://api.frankfurter.dev'

interface FrankfurterResponse {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

/**
 * Fetch a single exchange rate.
 *
 * @param from ISO 4217 source currency code (e.g. "USD")
 * @param to   ISO 4217 target currency code (e.g. "EUR")
 * @param date Optional ISO date "YYYY-MM-DD" for historical rates. Omit for
 *             the most recent published rate.
 * @returns The rate to convert 1 unit of `from` into `to`.
 * @throws  When the HTTP response is not OK, the body cannot be parsed as the
 *          expected shape, or the target currency is missing from `rates`.
 */
export async function fetchExchangeRate(
  from: string,
  to: string,
  date?: string
): Promise<number> {
  const segment = date ?? 'latest'
  const url = `${FRANKFURTER_BASE_URL}/v1/${segment}?base=${encodeURIComponent(
    from
  )}&symbols=${encodeURIComponent(to)}`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(
      `Frankfurter request failed: ${res.status} ${res.statusText} for ${url}`
    )
  }

  const body = (await res.json()) as FrankfurterResponse
  const rate = body.rates?.[to]

  if (typeof rate !== 'number') {
    throw new Error(
      `Frankfurter response missing rate for ${to} (from ${from})`
    )
  }

  return rate
}
