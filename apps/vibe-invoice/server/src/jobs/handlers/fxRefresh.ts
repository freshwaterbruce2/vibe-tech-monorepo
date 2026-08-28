import { DEFAULT_REFRESH_PAIRS, refreshRates } from '../../fx/cache.js'
import { registerHandler } from './index.js'

registerHandler('fx.refresh', async (_payload, ctx) => {
  await refreshRates(ctx.db, DEFAULT_REFRESH_PAIRS)
})
