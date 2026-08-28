// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  advanceDate,
  computeAdvancement,
  type RecurringScheduleRow,
} from './scheduler.js'

describe('recurring/scheduler', () => {
  describe('advanceDate', () => {
    const ymd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    it('weekly + 1 = +7 days', () => {
      const from = new Date(2026, 4, 1)
      expect(ymd(advanceDate(from, 'weekly', 1))).toBe('2026-05-08')
    })

    it('weekly + 2 = +14 days', () => {
      const from = new Date(2026, 4, 1)
      expect(ymd(advanceDate(from, 'weekly', 2))).toBe('2026-05-15')
    })

    it('monthly handles end-of-month edge cases (Jan 31 -> Feb 28)', () => {
      const from = new Date(2026, 0, 31)
      expect(ymd(advanceDate(from, 'monthly', 1))).toBe('2026-02-28')
    })

    it('quarterly = +3 months', () => {
      const from = new Date(2026, 0, 15)
      expect(ymd(advanceDate(from, 'quarterly', 1))).toBe('2026-04-15')
    })

    it('yearly = +1 year', () => {
      const from = new Date(2026, 4, 1)
      expect(ymd(advanceDate(from, 'yearly', 1))).toBe('2027-05-01')
    })
  })

  describe('computeAdvancement', () => {
    const baseSchedule: RecurringScheduleRow = {
      id: 's1',
      user_id: 'u1',
      template_invoice_id: 'i1',
      frequency: 'monthly',
      interval_count: 1,
      next_run_at: '2026-05-01T00:00:00Z',
      end_type: 'never',
      end_date: null,
      occurrences_remaining: null,
      status: 'active',
    }

    it('with end_type=never, status stays active and next_run_at advances', () => {
      const r = computeAdvancement(baseSchedule, new Date('2026-05-01T00:00:00Z'))
      expect(r.newStatus).toBe('active')
      expect(r.newNextRunAt).not.toBeNull()
    })

    it('with occurrences_remaining=1, drops to 0 and ends', () => {
      const sched: RecurringScheduleRow = {
        ...baseSchedule,
        end_type: 'occurrences',
        occurrences_remaining: 1,
      }
      const r = computeAdvancement(sched, new Date('2026-05-01T00:00:00Z'))
      expect(r.newStatus).toBe('ended')
      expect(r.newOccurrencesRemaining).toBe(0)
      expect(r.newNextRunAt).toBeNull()
    })

    it('with occurrences_remaining=3, decrements to 2 and stays active', () => {
      const sched: RecurringScheduleRow = {
        ...baseSchedule,
        end_type: 'occurrences',
        occurrences_remaining: 3,
      }
      const r = computeAdvancement(sched, new Date('2026-05-01T00:00:00Z'))
      expect(r.newStatus).toBe('active')
      expect(r.newOccurrencesRemaining).toBe(2)
    })

    it('with end_date in the past after advancement, ends', () => {
      const sched: RecurringScheduleRow = {
        ...baseSchedule,
        end_type: 'date',
        end_date: '2026-04-01',
      }
      const r = computeAdvancement(sched, new Date('2026-05-01T00:00:00Z'))
      expect(r.newStatus).toBe('ended')
    })

    it('with end_date well in the future, stays active', () => {
      const sched: RecurringScheduleRow = {
        ...baseSchedule,
        end_type: 'date',
        end_date: '2027-01-01',
      }
      const r = computeAdvancement(sched, new Date('2026-05-01T00:00:00Z'))
      expect(r.newStatus).toBe('active')
    })
  })
})
