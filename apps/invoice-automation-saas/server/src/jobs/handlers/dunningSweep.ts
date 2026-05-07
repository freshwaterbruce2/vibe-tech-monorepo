import { runDunningSweep } from '../../dunning/sweep.js'
import { registerHandler } from './index.js'

registerHandler('dunning.sweep', async (_payload, ctx) => {
  runDunningSweep(ctx.db)
})
