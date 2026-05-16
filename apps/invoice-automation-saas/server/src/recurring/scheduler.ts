import type Database from 'better-sqlite3'
import { addMonths, addWeeks, addYears } from 'date-fns'

export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface RecurringScheduleRow {
  id: string
  user_id: string
  template_invoice_id: string
  frequency: Frequency
  interval_count: number
  next_run_at: string
  end_type: 'never' | 'date' | 'occurrences'
  end_date: string | null
  occurrences_remaining: number | null
  status: 'active' | 'paused' | 'ended'
}

export const advanceDate = (
  from: Date,
  frequency: Frequency,
  interval: number,
): Date => {
  switch (frequency) {
    case 'weekly':
      return addWeeks(from, interval)
    case 'monthly':
      return addMonths(from, interval)
    case 'quarterly':
      return addMonths(from, interval * 3)
    case 'yearly':
      return addYears(from, interval)
    default: {
      const exhaustive: never = frequency
      throw new Error(`Unknown frequency: ${exhaustive as string}`)
    }
  }
}

export const findDueSchedules = (
  db: Database.Database,
): RecurringScheduleRow[] => {
  const now = new Date().toISOString()
  return db
    .prepare(
      `SELECT id, user_id, template_invoice_id, frequency, interval_count,
              next_run_at, end_type, end_date, occurrences_remaining, status
         FROM recurring_schedules
        WHERE status = 'active'
          AND next_run_at <= ?
        ORDER BY next_run_at ASC`,
    )
    .all(now) as RecurringScheduleRow[]
}

export interface AdvanceResult {
  newNextRunAt: string | null
  newOccurrencesRemaining: number | null
  newStatus: 'active' | 'ended'
}

export const computeAdvancement = (
  schedule: RecurringScheduleRow,
  generatedAt: Date,
): AdvanceResult => {
  const newNextRunAt = advanceDate(
    generatedAt,
    schedule.frequency,
    schedule.interval_count,
  )

  let occurrencesRemaining = schedule.occurrences_remaining
  let status: 'active' | 'ended' = 'active'

  if (
    schedule.end_type === 'occurrences' &&
    occurrencesRemaining !== null
  ) {
    occurrencesRemaining = Math.max(0, occurrencesRemaining - 1)
    if (occurrencesRemaining === 0) {
      status = 'ended'
    }
  }

  if (
    schedule.end_type === 'date' &&
    schedule.end_date &&
    newNextRunAt > new Date(schedule.end_date)
  ) {
    status = 'ended'
  }

  return {
    newNextRunAt:
      status === 'ended' ? null : newNextRunAt.toISOString(),
    newOccurrencesRemaining: occurrencesRemaining,
    newStatus: status,
  }
}

export const updateScheduleAfterRun = (
  db: Database.Database,
  scheduleId: string,
  result: AdvanceResult,
): void => {
  const now = new Date().toISOString()
  if (result.newStatus === 'ended') {
    db.prepare(
      `UPDATE recurring_schedules
          SET status = 'ended', updated_at = ?
        WHERE id = ?`,
    ).run(now, scheduleId)
    return
  }
  db.prepare(
    `UPDATE recurring_schedules
        SET next_run_at = ?, occurrences_remaining = ?, updated_at = ?
      WHERE id = ?`,
  ).run(
    result.newNextRunAt,
    result.newOccurrencesRemaining,
    now,
    scheduleId,
  )
}
