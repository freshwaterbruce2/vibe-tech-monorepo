import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local', override: true })

import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import fs from 'fs'
import path from 'path'
import { getSessionCookieName, parseSessionToken } from './auth.js'
import { openDb } from './db.js'
import { events } from './events.js'
import './dunning/cronRegistration.js'
import './fx/cronRegistration.js'
import { startCronSchedules, stopCronSchedules } from './jobs/cron.js'
import './jobs/handlers/dunningSweep.js'
import './jobs/handlers/emailInvoice.js'
import './jobs/handlers/emailOverdue.js'
import './jobs/handlers/emailReceipt.js'
import './jobs/handlers/fxRefresh.js'
import './jobs/handlers/generateRecurring.js'
import { startJobRunner } from './jobs/runner.js'
import './recurring/cronRegistration.js'
import { migrate } from './migrate.js'
import { registerAuthRoutes } from './routes/authRoutes.js'
import { registerClientRoutes } from './routes/clientRoutes.js'
import { registerDunningRoutes } from './routes/dunningRoutes.js'
import { registerExpenseRoutes } from './routes/expenseRoutes.js'
import { registerInvoiceRoutes } from './routes/invoiceRoutes.js'
import { registerLogoRoutes } from './routes/logoRoutes.js'
import { registerPaymentRoutes } from './routes/paymentRoutes.js'
import { registerProjectRoutes } from './routes/projectRoutes.js'
import { registerPublicRoutes } from './routes/publicRoutes.js'
import { registerRecurringRoutes } from './routes/recurringRoutes.js'
import { registerTaxRoutes } from './routes/taxRoutes.js'
import { registerTemplateRoutes } from './routes/templateRoutes.js'
import { registerTimeRoutes } from './routes/timeRoutes.js'
import { registerWebhookRoutes } from './routes/webhookRoutes.js'
import { registerRateLimits } from './security/rateLimit.js'

const PORT = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '127.0.0.1'

const start = async () => {
  const db = openDb()
  migrate(db)

  const app = Fastify({
    logger: true,
    trustProxy: process.env.TRUST_PROXY === '1',
  })

  await app.register(cors, {
    origin: true,
    credentials: true,
  })
  await app.register(cookie, {})
  await registerRateLimits(app)

  const jobRunner = startJobRunner(db, {
    logger: (msg, meta) => app.log.error({ meta }, msg),
  })
  startCronSchedules()

  const shutdown = async (signal: string) => {
    app.log.info(`received ${signal}, shutting down`)
    stopCronSchedules()
    await jobRunner.stop()
    await app.close()
    db.close()
    process.exit(0)
  }
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
  process.once('SIGINT', () => void shutdown('SIGINT'))

  app.get('/api/health', async () => ({ ok: true, ts: Date.now() }))

  app.addHook('preHandler', async (req) => {
    const token =
      req.cookies?.[getSessionCookieName()] ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice('Bearer '.length)
        : null)
    if (!token) return
    const parsed = parseSessionToken(token)
    if (parsed?.sub) {
      ;(req as any).authUserId = parsed.sub
    }
  })

  // Events (SSE) - authenticated
  app.get('/api/events', async (req, reply) => {
    const userId = (req as any).authUserId as string | undefined
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    const send = (payload: any) => {
      reply.raw.write(`event: message\n`)
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`)
    }

    send({ type: 'connected', ts: Date.now() })

    const onUserEvent = (event: any) => send(event)
    events.on(`user:${userId}`, onUserEvent)

    req.raw.on('close', () => {
      events.off(`user:${userId}`, onUserEvent)
    })
  })

  registerAuthRoutes(app, db)
  registerClientRoutes(app, db)
  registerInvoiceRoutes(app, db)
  registerPublicRoutes(app, db)
  registerPaymentRoutes(app, db)
  registerRecurringRoutes(app, db)
  registerDunningRoutes(app, db)
  registerTaxRoutes(app, db)
  registerTemplateRoutes(app, db)
  registerProjectRoutes(app, db)
  registerTimeRoutes(app, db)
  await registerExpenseRoutes(app, db)
  await registerLogoRoutes(app, db)
  await registerWebhookRoutes(app, db)

  if (process.env.SERVE_WEB === '1') {
    const distDir = process.env.WEB_DIST_DIR
      ? path.resolve(process.env.WEB_DIST_DIR)
      : path.resolve(process.cwd(), 'dist')

    const indexPath = path.join(distDir, 'index.html')
    if (!fs.existsSync(indexPath)) {
      app.log.warn(
        { distDir },
        'SERVE_WEB=1 but dist/index.html not found; web UI will not be served'
      )
    } else {
      await app.register(fastifyStatic, {
        root: distDir,
        prefix: '/',
      })

      app.setNotFoundHandler((req, reply) => {
        if (req.method === 'GET' && !req.url.startsWith('/api')) {
          return reply.sendFile('index.html')
        }
        return reply.code(404).send({ error: 'Not found' })
      })
    }
  }

  await app.listen({ port: PORT, host: HOST })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
