import { openDb } from '../db.js'
import { enqueueJob } from '../jobs/enqueue.js'
import { registerCronSchedule } from '../jobs/cron.js'
import { findDueSchedules } from './scheduler.js'

registerCronSchedule({
  name: 'recurring-sweep',
  expression: '0 * * * *',
  task: () => {
    const db = openDb()
    try {
      const due = findDueSchedules(db)
      for (const schedule of due) {
        enqueueJob(db, {
          type: 'recurring.generate',
          payload: { scheduleId: schedule.id },
        })
      }
    } finally {
      db.close()
    }
  },
})
