import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const playwrightCli = join(frontendRoot, 'node_modules', '@playwright', 'test', 'cli.js')
const runRoot = join(tmpdir(), `vibe-justice-e2e-${randomUUID().replaceAll('-', '')}`)

const result = spawnSync(process.execPath, [playwrightCli, 'test', ...process.argv.slice(2)], {
  cwd: frontendRoot,
  env: { ...process.env, VIBE_JUSTICE_E2E_RUN_ROOT: runRoot },
  stdio: 'inherit',
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
