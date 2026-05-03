import { openDb } from '../db.js'
import { enqueueJob } from '../jobs/enqueue.js'
import { registerCronSchedule } from '../jobs/cron.js'

registerCronSchedule({
  name: 'fx-refresh-daily',
  expression: '0 6 * * *',
  task: () => {
    const db = openDb()
    try {
      enqueueJob(db, { type: 'fx.refresh', payload: {} })
    } finally {
      db.close()
    }
  },
})
