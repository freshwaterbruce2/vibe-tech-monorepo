import type Database from 'better-sqlite3'

import { fetchExchangeRate } from '../clients/fx.js'

interface ExchangeRateRow {
  base: string
  quote: string
  rate_date: string
  rate: number
  fetched_at: string
}

const toIsoDate = (d: Date): string => d.toISOString().slice(0, 10)

export interface GetRateOptions {
  /** Override the network fetcher; useful for tests. */
  fetcher?: typeof fetchExchangeRate
}

/**
 * Returns the exchange rate from `base` to `quote` for the given date.
 * Reads from the `exchange_rates` table first; on miss, fetches via
 * Frankfurter and persists.
 *
 * Treats base==quote as 1.0 without touching DB or network.
 */
export const getRate = async (
  db: Database.Database,
  base: string,
  quote: string,
  date: Date | string,
  options: GetRateOptions = {},
): Promise<number> => {
  const baseUpper = base.toUpperCase()
  const quoteUpper = quote.toUpperCase()
  if (baseUpper === quoteUpper) return 1

  const isoDate = typeof date === 'string' ? date.slice(0, 10) : toIsoDate(date)

  const cached = db
    .prepare(
      `SELECT * FROM exchange_rates WHERE base = ? AND quote = ? AND rate_date = ?`,
    )
    .get(baseUpper, quoteUpper, isoDate) as ExchangeRateRow | undefined
  if (cached) return cached.rate

  const fetcher = options.fetcher ?? fetchExchangeRate
  const rate = await fetcher(baseUpper, quoteUpper, isoDate)

  db.prepare(
    `INSERT OR REPLACE INTO exchange_rates
       (base, quote, rate_date, rate, fetched_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(baseUpper, quoteUpper, isoDate, rate, new Date().toISOString())

  return rate
}

/**
 * Refresh today's rate for every (base, quote) pair given.
 * Used by the daily cron to keep the cache warm so live invoice POSTs
 * don't have to wait on Frankfurter.
 */
export const refreshRates = async (
  db: Database.Database,
  pairs: Array<{ base: string; quote: string }>,
  options: GetRateOptions = {},
): Promise<{ refreshed: number; failed: number }> => {
  const today = toIsoDate(new Date())
  let refreshed = 0
  let failed = 0
  for (const { base, quote } of pairs) {
    try {
      const fetcher = options.fetcher ?? fetchExchangeRate
      const rate = await fetcher(base.toUpperCase(), quote.toUpperCase(), today)
      db.prepare(
        `INSERT OR REPLACE INTO exchange_rates
           (base, quote, rate_date, rate, fetched_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(base.toUpperCase(), quote.toUpperCase(), today, rate, new Date().toISOString())
      refreshed++
    } catch {
      failed++
    }
  }
  return { refreshed, failed }
}

export const DEFAULT_REFRESH_PAIRS: Array<{ base: string; quote: string }> = [
  { base: 'USD', quote: 'EUR' },
  { base: 'USD', quote: 'GBP' },
  { base: 'USD', quote: 'CAD' },
  { base: 'USD', quote: 'AUD' },
  { base: 'USD', quote: 'JPY' },
  { base: 'EUR', quote: 'USD' },
  { base: 'EUR', quote: 'GBP' },
  { base: 'GBP', quote: 'USD' },
  { base: 'GBP', quote: 'EUR' },
]
