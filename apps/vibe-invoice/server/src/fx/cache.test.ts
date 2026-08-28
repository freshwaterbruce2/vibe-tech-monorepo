// @vitest-environment node
import Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runMigrations } from '../migrations/index.js'
import { DEFAULT_REFRESH_PAIRS, getRate, refreshRates } from './cache.js'

const repoRoot = path.resolve(__dirname, '..', '..', '..')
const migrationsDir = path.join(repoRoot, 'server', 'src', 'migrations')

describe('fx cache', () => {
  let db: Database.Database
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-fx-'))
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)
  })

  afterEach(() => {
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns 1 immediately when base equals quote, without fetcher', async () => {
    const fetcher = vi.fn(async () => 999)
    const rate = await getRate(db, 'USD', 'usd', '2026-05-03', { fetcher })
    expect(rate).toBe(1)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('fetches and persists on cache miss', async () => {
    const fetcher = vi.fn(async () => 0.92)
    const rate = await getRate(db, 'USD', 'EUR', '2026-05-03', { fetcher })
    expect(rate).toBe(0.92)
    expect(fetcher).toHaveBeenCalledTimes(1)

    const row = db
      .prepare(
        `SELECT rate FROM exchange_rates WHERE base = 'USD' AND quote = 'EUR' AND rate_date = '2026-05-03'`,
      )
      .get() as { rate: number } | undefined
    expect(row?.rate).toBe(0.92)
  })

  it('returns cached rate without re-fetching', async () => {
    const fetcher = vi.fn(async () => 0.92)
    await getRate(db, 'USD', 'EUR', '2026-05-03', { fetcher })
    const second = await getRate(db, 'USD', 'EUR', '2026-05-03', { fetcher })
    expect(second).toBe(0.92)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('uppercases base and quote when caching and reading', async () => {
    const fetcher = vi.fn(async () => 0.85)
    await getRate(db, 'usd', 'gbp', '2026-05-03', { fetcher })
    const row = db
      .prepare(`SELECT base, quote FROM exchange_rates`)
      .get() as { base: string; quote: string }
    expect(row.base).toBe('USD')
    expect(row.quote).toBe('GBP')
  })

  it('refreshRates persists rates for every pair', async () => {
    const fetcher = vi.fn(async (base: string, quote: string) => {
      const map: Record<string, number> = {
        'USD->EUR': 0.92,
        'USD->GBP': 0.79,
      }
      return map[`${base}->${quote}`] ?? 1
    })

    const result = await refreshRates(
      db,
      [
        { base: 'USD', quote: 'EUR' },
        { base: 'USD', quote: 'GBP' },
      ],
      { fetcher },
    )
    expect(result.refreshed).toBe(2)
    expect(result.failed).toBe(0)

    const rows = db.prepare(`SELECT base, quote, rate FROM exchange_rates ORDER BY quote`).all()
    expect(rows).toHaveLength(2)
  })

  it('refreshRates counts failures without throwing', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('network down')
    })
    const result = await refreshRates(db, [{ base: 'USD', quote: 'EUR' }], { fetcher })
    expect(result.refreshed).toBe(0)
    expect(result.failed).toBe(1)
  })

  it('exports a sensible default pair list including USD->EUR', () => {
    const has = DEFAULT_REFRESH_PAIRS.some((p) => p.base === 'USD' && p.quote === 'EUR')
    expect(has).toBe(true)
  })
})
