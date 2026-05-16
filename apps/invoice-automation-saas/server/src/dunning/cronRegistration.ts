import { openDb } from '../db.js'
import { enqueueJob } from '../jobs/enqueue.js'
import { registerCronSchedule } from '../jobs/cron.js'

registerCronSchedule({
  name: 'dunning-daily',
  expression: '0 9 * * *',
  task: () => {
    const db = openDb()
    try {
      enqueueJob(db, { type: 'dunning.sweep', payload: {} })
    } finally {
      db.close()
    }
  },
})
