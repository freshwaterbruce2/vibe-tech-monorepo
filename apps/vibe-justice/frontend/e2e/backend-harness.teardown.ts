import cleanupE2eData from '../../scripts/cleanup-e2e-data'
import { rmSync } from 'node:fs'
import { stopBackend } from './backend-harness'

export default async function teardown(): Promise<void> {
  await stopBackend()
  cleanupE2eData()
  if (process.env.VIBE_JUSTICE_E2E_RUN_ROOT) {
    rmSync(`${process.env.VIBE_JUSTICE_E2E_RUN_ROOT}.backend.log`, { force: true })
    rmSync(`${process.env.VIBE_JUSTICE_E2E_RUN_ROOT}.backend.pid`, { force: true })
  }
}
