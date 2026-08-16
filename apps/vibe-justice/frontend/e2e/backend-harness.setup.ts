import { startBackend } from './backend-harness'

export default async function setup(): Promise<void> {
  const runRoot = process.env.VIBE_JUSTICE_E2E_RUN_ROOT
  if (!runRoot) throw new Error('VIBE_JUSTICE_E2E_RUN_ROOT is not configured')
  await startBackend()
}
