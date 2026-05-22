// @vitest-environment node
/**
 * Production Diagnostic Test Suite
 *
 * These tests are designed to find real bugs, not just pass.
 * They exercise edge cases, security boundaries, race conditions,
 * and data integrity constraints that unit tests often miss.
 */
import Database from 'better-sqlite3'
import cookie from '@fastify/cookie'
import Fastify from 'fastify'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  hashPassword,
  parseSessionToken,
  createSessionToken,
  getSessionTtlSeconds,
} from './auth.js'
import { openDb } from './db.js'
import { tick } from './jobs/runner.js'
import { runMigrations } from './migrations/index.js'
import { registerAuthRoutes } from './routes/authRoutes.js'
import { registerClientRoutes } from './routes/clientRoutes.js'
import { registerInvoiceRoutes } from './routes/invoiceRoutes.js'
import { registerHandler, clearHandlers } from './jobs/handlers/index.js'

const repoRoot = path.resolve(__dirname, '..', '..')
const migrationsDir = path.join(repoRoot, 'server', 'src', 'migrations')
const serverDistDir = path.join(repoRoot, 'server', 'dist')

// Ensure auth secret is available for all tests
beforeAll(() => {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    process.env.AUTH_SECRET = 'test-secret-thirty-two-characters-long-minimum'
  }
})

// ─────────────────────────────────────────────────────────────
// Helper: build a minimal Fastify app with routes for testing
// ─────────────────────────────────────────────────────────────
const buildTestApp = async (db: Database.Database) => {
  const app = Fastify({ logger: false })
  await app.register(cookie, {})
  app.addHook('preHandler', async (req) => {
    const token = req.cookies?.invoiceflow_session
    if (!token) return
    const parsed = parseSessionToken(token)
    if (parsed?.sub) {
      ;(req as any).authUserId = parsed.sub
    }
  })
  registerAuthRoutes(app, db)
  registerClientRoutes(app, db)
  registerInvoiceRoutes(app, db)
  await app.ready()
  return app
}

const seedUser = async (
  db: Database.Database,
  email: string,
  password: string,
): Promise<string> => {
  const id = crypto.randomUUID()
  const { salt, hash } = await hashPassword(password)
  db.prepare(
    `INSERT INTO users (id, email, password_salt, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, email, salt, hash, new Date().toISOString(), new Date().toISOString())
  return id
}

// ═════════════════════════════════════════════════════════════
// 1. BUILD INTEGRITY
// ═════════════════════════════════════════════════════════════
describe('BUILD INTEGRITY', () => {
  const requiredFiles = [
    'index.js',
    'auth.js',
    'db.js',
    'events.js',
    'migrate.js',
    'jobs/runner.js',
    'jobs/enqueue.js',
    'routes/invoiceRoutes.js',
    'routes/authRoutes.js',
    'routes/webhookRoutes.js',
  ]

  it('must have all required compiled files in server/dist', () => {
    const missing = requiredFiles.filter((f) => !fs.existsSync(path.join(serverDistDir, f)))
    expect(missing).toEqual([])
  })

  it('compiled index.js must have valid ESM imports', () => {
    const indexPath = path.join(serverDistDir, 'index.js')
    const content = fs.readFileSync(indexPath, 'utf-8')
    // All local imports must use .js extension for NodeNext ESM
    const localImports = content.match(/from ['"]\.\/[^'"]+['"]/g) ?? []
    const badImports = localImports.filter((imp) => {
      const clean = imp.replace(/from ['"]|['"]$/g, '')
      return !clean.endsWith('.js')
    })
    expect(badImports).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════
// 2. AUTH SECURITY
// ═════════════════════════════════════════════════════════════
describe('AUTH SECURITY', () => {
  let db: Database.Database
  let tmpDir: string
  let app: Awaited<ReturnType<typeof buildTestApp>>

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-diag-'))
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)
    app = await buildTestApp(db)
  })

  afterEach(async () => {
    await app.close()
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('parameterized queries prevent SQL injection in signup', async () => {
    const maliciousEmail = "test' OR '1'='1@test.com"
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { email: maliciousEmail, password: 'password123' },
    })
    // Should not crash; parameterized queries make this safe
    expect(res.statusCode).not.toBe(500)
    if (res.statusCode === 200) {
      const normalized = maliciousEmail.trim().toLowerCase()
      const row = db.prepare('SELECT id FROM users WHERE email = ?').get(normalized)
      expect(row).toBeDefined()
    }
  })

  it('rejects SQL injection in login email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: "admin'--", password: 'anything' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('does not leak whether email exists via timing (login)', async () => {
    const existingEmail = 'exists@example.com'
    await seedUser(db, existingEmail, 'password123')

    const t0 = Date.now()
    await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: existingEmail, password: 'wrongpassword' },
    })
    const tExisting = Date.now() - t0

    const t1 = Date.now()
    await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nonexistent@example.com', password: 'wrongpassword' },
    })
    const tMissing = Date.now() - t1

    // Timing difference should be small since both paths do scrypt
    expect(Math.abs(tExisting - tMissing)).toBeLessThan(500)
  })

  it('rejects extremely long passwords (DoS vector)', async () => {
    const longPassword = 'a'.repeat(100_000)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { email: 'long@example.com', password: longPassword },
    })
    // Should reject passwords over 256 chars to prevent scrypt DoS
    expect(res.statusCode).toBe(400)
  })

  it('rejects invalid JWT without crashing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { Cookie: 'invoiceflow_session=invalid.token.here' },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload).user).toBeNull()
  })

  it('rejects JWT with manipulated payload', async () => {
    const userId = await seedUser(db, 'jwt@test.com', 'password123')
    const token = createSessionToken({ id: userId, email: 'jwt@test.com' })
    const parts = token.split('.')
    parts[1] = Buffer.from('{"sub":"hacker","email":"x","iat":1,"exp":9999999999}')
      .toString('base64url')
    const tampered = parts.join('.')

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { Cookie: `invoiceflow_session=${tampered}` },
    })
    expect(JSON.parse(res.payload).user).toBeNull()
  })

  it('respects SESSION_TTL_SECONDS for short sessions', () => {
    const original = process.env.SESSION_TTL_SECONDS
    process.env.SESSION_TTL_SECONDS = '30'
    const ttl = getSessionTtlSeconds()
    expect(ttl).toBe(30)
    process.env.SESSION_TTL_SECONDS = original
  })
})

// ═════════════════════════════════════════════════════════════
// 3. DATA INTEGRITY & CONSTRAINTS
// ═════════════════════════════════════════════════════════════
describe('DATA INTEGRITY', () => {
  let db: Database.Database
  let tmpDir: string
  let app: Awaited<ReturnType<typeof buildTestApp>>

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-diag-'))
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)
    app = await buildTestApp(db)
  })

  afterEach(async () => {
    await app.close()
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('cascades client deletion to invoices (ON DELETE CASCADE)', async () => {
    const userId = await seedUser(db, 'fk@test.com', 'password123')
    const token = createSessionToken({ id: userId, email: 'fk@test.com' })

    const clientRes = await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: { Cookie: `invoiceflow_session=${token}` },
      payload: { name: 'Acme', email: 'acme@example.com' },
    })
    expect(clientRes.statusCode).toBe(200)
    const clientId = JSON.parse(clientRes.payload).client.id

    await app.inject({
      method: 'POST',
      url: '/api/invoices',
      headers: { Cookie: `invoiceflow_session=${token}` },
      payload: {
        invoiceNumber: 'INV-001',
        issueDate: '2026-05-01',
        dueDate: '2026-05-31',
        currency: 'USD',
        status: 'draft',
        client: { id: clientId, name: 'Acme', email: 'acme@example.com' },
        subtotal: 100,
        tax: 0,
        total: 100,
        items: [{ description: 'Item', quantity: 1, price: 100, total: 100 }],
      },
    })

    // Schema uses ON DELETE CASCADE, so deleting client removes invoices
    db.prepare('DELETE FROM clients WHERE id = ?').run(clientId)
    const invoiceCount = db.prepare('SELECT COUNT(*) as c FROM invoices').get() as { c: number }
    expect(invoiceCount.c).toBe(0)
  })

  it('prevents duplicate client emails per user', async () => {
    const userId = await seedUser(db, 'dup@test.com', 'password123')
    const token = createSessionToken({ id: userId, email: 'dup@test.com' })

    const r1 = await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: { Cookie: `invoiceflow_session=${token}` },
      payload: { name: 'Acme', email: 'acme@example.com' },
    })
    expect(r1.statusCode).toBe(200)

    const r2 = await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: { Cookie: `invoiceflow_session=${token}` },
      payload: { name: 'Acme 2', email: 'acme@example.com' },
    })
    expect(r2.statusCode).toBe(409)
  })

  it('recomputes invoice totals server-side ignoring client tampering', async () => {
    const userId = await seedUser(db, 'math@test.com', 'password123')
    const token = createSessionToken({ id: userId, email: 'math@test.com' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/invoices',
      headers: { Cookie: `invoiceflow_session=${token}` },
      payload: {
        invoiceNumber: 'INV-BAD',
        issueDate: '2026-05-01',
        dueDate: '2026-05-31',
        currency: 'USD',
        status: 'draft',
        client: { name: 'Acme', email: 'acme@example.com' },
        subtotal: 100,
        tax: 10,
        total: 500, // Client tries to tamper
        items: [{ description: 'Item', quantity: 1, price: 100, total: 100 }],
      },
    })
    expect(res.statusCode).toBe(200)
    const invoice = JSON.parse(res.payload).invoice
    // Server recomputed from line items: subtotal=100, tax=10 (client-provided), total=110
    expect(invoice.total).toBe(110)
    expect(invoice.subtotal).toBe(100)
  })
})

// ═════════════════════════════════════════════════════════════
// 4. JOB RUNNER EDGE CASES
// ═════════════════════════════════════════════════════════════
describe('JOB RUNNER', () => {
  let db: Database.Database
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-diag-'))
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)
    clearHandlers()
    registerHandler('test.ping', async () => {
      /* no-op */
    })
  })

  afterEach(() => {
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('handles JSON parse error in payload gracefully', async () => {
    db.prepare(
      `INSERT INTO jobs (id, type, payload_json, next_run_at, max_attempts, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
    ).run(
      crypto.randomUUID(),
      'test.ping',
      'not-valid-json',
      new Date().toISOString(),
      3,
      new Date().toISOString(),
      new Date().toISOString(),
    )

    const result = await tick(db, { pollIntervalMs: 1000, batchSize: 5 })
    expect(result.retried).toBe(1)

    const row = db.prepare("SELECT status, last_error FROM jobs WHERE payload_json = 'not-valid-json'").get() as any
    expect(row.status).toBe('pending')
    expect(row.last_error).toMatch(/parse error/)
  })

  it('does not double-execute a locked job', async () => {
    const jobId = crypto.randomUUID()
    const future = new Date(Date.now() + 60_000).toISOString()
    db.prepare(
      `INSERT INTO jobs (id, type, payload_json, next_run_at, max_attempts, status, locked_until, locked_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
    ).run(
      jobId,
      'email.invoice',
      '{}',
      new Date().toISOString(),
      3,
      future,
      'other-runner',
      new Date().toISOString(),
      new Date().toISOString(),
    )

    const result = await tick(db, { pollIntervalMs: 1000, batchSize: 5 })
    expect(result.processed).toBe(0)
  })

  it('fails job when attempts exceed maxAttempts', async () => {
    clearHandlers()
    registerHandler('test.alwaysFail', async () => {
      throw new Error('intentional failure')
    })

    const jobId = crypto.randomUUID()
    const past = new Date(Date.now() - 1000).toISOString()
    db.prepare(
      `INSERT INTO jobs (id, type, payload_json, next_run_at, max_attempts, attempts, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    ).run(
      jobId,
      'test.alwaysFail',
      '{}',
      past,
      2,
      2, // already at max
      past,
      past,
    )

    const result = await tick(db, { pollIntervalMs: 1000, batchSize: 5 })
    // Runner increments attempts to 3, which is >= max_attempts, so it fails immediately.
    expect(result.processed).toBe(1)
    expect(result.failed).toBe(1)
    const row = db.prepare('SELECT status, last_error FROM jobs WHERE id = ?').get(jobId) as any
    expect(row.status).toBe('failed')
    expect(row.last_error).toMatch(/intentional failure/)
  })
})

// ═════════════════════════════════════════════════════════════
// 5. DATABASE PATH SECURITY
// ═════════════════════════════════════════════════════════════
describe('DATABASE PATH SECURITY', () => {
  it('rejects non-D Windows drive database paths', () => {
    const original = process.env.DATABASE_PATH
    const disallowedDrive = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      .split('')
      .find((drive) => drive !== 'D')

    try {
      process.env.DATABASE_PATH = `${disallowedDrive}:\\temp\\evil.db`
      expect(() => openDb()).toThrow(/must be on D:\\ or \/data\//)
    } finally {
      process.env.DATABASE_PATH = original
    }
  })

  it('applies database path policy after resolving relative paths', () => {
    const original = process.env.DATABASE_PATH
    const relativeDbPath = '..\\..\\evil.db'
    const resolvedDbPath = path.resolve(relativeDbPath)
    const isAllowedResolvedPath =
      /^[dD]:\\/.test(resolvedDbPath) || resolvedDbPath.startsWith('/data/')

    try {
      process.env.DATABASE_PATH = relativeDbPath
      if (isAllowedResolvedPath) {
        const db = openDb()
        db.close()
        fs.rmSync(resolvedDbPath, { force: true })
        fs.rmSync(`${resolvedDbPath}-shm`, { force: true })
        fs.rmSync(`${resolvedDbPath}-wal`, { force: true })
      } else {
        expect(() => openDb()).toThrow(/must be on D:\\ or \/data\//)
      }
    } finally {
      process.env.DATABASE_PATH = original
    }
  })

  it('accepts Docker /data/ paths', () => {
    const original = process.env.DATABASE_PATH
    process.env.DATABASE_PATH = '/data/invoiceflow.db'
    // Should not throw; openDb will try to create the directory
    expect(() => openDb()).not.toThrow()
    process.env.DATABASE_PATH = original
  })
})

// ═════════════════════════════════════════════════════════════
// 6. ENVIRONMENT VALIDATION
// ═════════════════════════════════════════════════════════════
describe('ENVIRONMENT VALIDATION', () => {
  it('requires AUTH_SECRET to be at least 32 chars', () => {
    const original = process.env.AUTH_SECRET
    process.env.AUTH_SECRET = 'short'
    expect(() => createSessionToken({ id: 'x', email: 'x@x.com' })).toThrow(/>= 32/)
    process.env.AUTH_SECRET = original
  })

  it('requires AUTH_SECRET to be non-empty', () => {
    const original = process.env.AUTH_SECRET
    process.env.AUTH_SECRET = ''
    expect(() => createSessionToken({ id: 'x', email: 'x@x.com' })).toThrow(/must be set/)
    process.env.AUTH_SECRET = original
  })
})
