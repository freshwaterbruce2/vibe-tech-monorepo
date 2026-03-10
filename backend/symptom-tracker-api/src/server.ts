import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readEnv } from './env.js'
import { openDb } from './db.js'
import { buildApiRouter } from './routes.js'

const env = readEnv()
const db = openDb(env.databasePath)

const app = express()
app.use(express.json({ limit: '256kb' }))

app.use('/api', buildApiRouter(db))

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultUiDistPath = path.resolve(__dirname, '../../../apps/symptom-tracker/dist')
const uiDistPath = env.uiDistPath ?? defaultUiDistPath

// If the UI has been built, serve it from this API so phones/desktops can use a single URL.
if (fs.existsSync(path.join(uiDistPath, 'index.html'))) {
  app.use(express.static(uiDistPath))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(uiDistPath, 'index.html'))
  })
}

app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.status(200).send('Symptom Tracker API running. See /api/health')
})

app.listen(env.port, env.host, () => {
   
  console.log(`symptom-tracker-api listening on http://${env.host}:${env.port}`)
})
