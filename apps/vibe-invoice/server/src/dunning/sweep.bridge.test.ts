// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const bridgeFns = vi.hoisted(() => ({
  runSharedDunningSweep: vi.fn(() => ({
    invoicesScanned: 3,
    remindersEnqueued: 1,
  })),
  recordAudit: vi.fn(),
  enqueueJob: vi.fn(),
}))

vi.mock('@vibetech/billing', () => ({
  runDunningSweep: bridgeFns.runSharedDunningSweep,
}))
vi.mock('../audit.js', () => ({
  recordAudit: bridgeFns.recordAudit,
}))
vi.mock('../jobs/enqueue.js', () => ({
  enqueueJob: bridgeFns.enqueueJob,
}))

describe('dunning sweep bridge', () => {
  it('calls the shared billing sweep with local enqueue and audit adapters', async () => {
    const { runDunningSweep } = await import('./sweep.js')
    const fakeDb = { kind: 'db' } as never
    const now = new Date('2026-05-15T10:00:00Z')

    const result = runDunningSweep(fakeDb, now)

    expect(result).toEqual({
      invoicesScanned: 3,
      remindersEnqueued: 1,
    })
    expect(bridgeFns.runSharedDunningSweep).toHaveBeenCalledTimes(1)

    const [passedDb, adapters, passedNow] = bridgeFns.runSharedDunningSweep.mock.calls[0] as [
      unknown,
      {
        enqueueJob: (db: unknown, job: unknown) => void
        recordAudit: (db: unknown, entry: unknown) => void
      },
      Date,
    ]

    expect(passedDb).toBe(fakeDb)
    expect(passedNow).toBe(now)

    const fakeJob = { type: 'email.overdue', payload: { invoiceId: 'inv-1' } }
    const fakeAudit = { action: 'dunning.reminder_enqueued', entityId: 'inv-1' }
    adapters.enqueueJob(fakeDb, fakeJob)
    adapters.recordAudit(fakeDb, fakeAudit)

    expect(bridgeFns.enqueueJob).toHaveBeenCalledWith(fakeDb, fakeJob)
    expect(bridgeFns.recordAudit).toHaveBeenCalledWith(fakeDb, fakeAudit)
  })
})
