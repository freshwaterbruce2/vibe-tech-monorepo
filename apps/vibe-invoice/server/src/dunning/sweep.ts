import type Database from 'better-sqlite3'
import { runDunningSweep as runSharedDunningSweep } from '../shared/billing/index.js'

import { recordAudit } from '../audit.js'
import { enqueueJob } from '../jobs/enqueue.js'

export interface SweepResult {
  invoicesScanned: number
  remindersEnqueued: number
}

export const runDunningSweep = (
  db: Database.Database,
  now: Date = new Date(),
): SweepResult =>
  runSharedDunningSweep(
    db,
    {
      enqueueJob,
      recordAudit,
    },
    now,
  )
