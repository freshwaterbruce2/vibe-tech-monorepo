import type Database from 'better-sqlite3'

export interface DunningReminder {
  daysAfterDue: number
}

export interface DunningPolicy {
  userId: string
  enabled: boolean
  reminders: DunningReminder[]
}

export const DEFAULT_REMINDERS: DunningReminder[] = [
  { daysAfterDue: 7 },
  { daysAfterDue: 14 },
  { daysAfterDue: 30 },
]

interface PolicyRow {
  user_id: string
  enabled: number
  reminders_json: string
}

const rowToPolicy = (row: PolicyRow): DunningPolicy => ({
  userId: row.user_id,
  enabled: row.enabled === 1,
  reminders: JSON.parse(row.reminders_json) as DunningReminder[],
})

export const getPolicy = (
  db: Database.Database,
  userId: string,
): DunningPolicy => {
  const row = db
    .prepare(
      'SELECT user_id, enabled, reminders_json FROM dunning_policies WHERE user_id = ?',
    )
    .get(userId) as PolicyRow | undefined
  if (row) return rowToPolicy(row)
  return {
    userId,
    enabled: true,
    reminders: DEFAULT_REMINDERS,
  }
}

const validateReminders = (reminders: unknown): DunningReminder[] => {
  if (!Array.isArray(reminders)) {
    throw new Error('reminders must be an array')
  }
  if (reminders.length === 0 || reminders.length > 5) {
    throw new Error('reminders must have between 1 and 5 entries')
  }
  const result: DunningReminder[] = []
  let prevDays = -1
  for (const r of reminders) {
    if (
      !r ||
      typeof r !== 'object' ||
      typeof (r as { daysAfterDue?: unknown }).daysAfterDue !== 'number'
    ) {
      throw new Error('each reminder must have a numeric daysAfterDue')
    }
    const days = (r as { daysAfterDue: number }).daysAfterDue
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new Error('daysAfterDue must be an integer between 1 and 365')
    }
    if (days <= prevDays) {
      throw new Error('reminders must be ordered by ascending daysAfterDue')
    }
    prevDays = days
    result.push({ daysAfterDue: days })
  }
  return result
}

export const upsertPolicy = (
  db: Database.Database,
  userId: string,
  input: { enabled: boolean; reminders: DunningReminder[] },
): DunningPolicy => {
  const reminders = validateReminders(input.reminders)
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO dunning_policies
       (user_id, enabled, reminders_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       enabled = excluded.enabled,
       reminders_json = excluded.reminders_json,
       updated_at = excluded.updated_at`,
  ).run(
    userId,
    input.enabled ? 1 : 0,
    JSON.stringify(reminders),
    now,
    now,
  )
  return getPolicy(db, userId)
}
