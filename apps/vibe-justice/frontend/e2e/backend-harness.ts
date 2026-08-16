import { spawn } from 'node:child_process'
import { closeSync, existsSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const HEALTH_URL = 'http://127.0.0.1:8000/api/health'
const APP_ROOT = resolve(import.meta.dirname, '..', '..')
const SCRIPT = join(APP_ROOT, 'scripts', 'run-e2e-backend.ps1')

function runRoot(): string {
  const configured = process.env.VIBE_JUSTICE_E2E_RUN_ROOT
  if (!configured) throw new Error('VIBE_JUSTICE_E2E_RUN_ROOT is not configured')
  return resolve(configured)
}

function pidFile(): string {
  return `${runRoot()}.backend.pid`
}

async function waitForHealth(expected: 'up' | 'down', timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    let up = false
    try {
      const response = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(1_000) })
      up = response.ok
    } catch {
      up = false
    }
    if ((expected === 'up' && up) || (expected === 'down' && !up)) return
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }
  throw new Error(`Backend did not become ${expected} within ${timeoutMs}ms`)
}

async function discoverListenerPid(): Promise<number> {
  const response = await fetch(HEALTH_URL)
  if (!response.ok) throw new Error(`Backend health failed with ${response.status}`)

  const command = [
    '$connection = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 8000 -State Listen -ErrorAction Stop',
    '$connection.OwningProcess',
  ].join('; ')
  const output = await new Promise<string>((resolveOutput, reject) => {
    const child = spawn('pwsh', ['-NoProfile', '-Command', command], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.once('error', reject)
    child.once('exit', (code) => code === 0 ? resolveOutput(stdout) : reject(new Error(stderr)))
  })
  const pids = output.trim().split(/\s+/).map(Number).filter(Number.isInteger)
  if (pids.length !== 1) throw new Error(`Expected one backend listener, found: ${output.trim() || 'none'}`)
  return pids[0]
}

export async function startBackend(): Promise<number> {
  const logPath = `${runRoot()}.backend.log`
  const log = openSync(logPath, 'a')
  const child = spawn('pwsh', ['-NoProfile', '-File', SCRIPT], {
    env: { ...process.env, VIBE_JUSTICE_E2E_PRESERVE_RUN_ROOT: 'true' },
    stdio: ['ignore', log, log],
    windowsHide: true,
  })
  closeSync(log)
  child.unref()
  try {
    await Promise.race([
      waitForHealth('up'),
      new Promise<never>((_, reject) => {
        child.once('error', reject)
        child.once('exit', (code) => reject(new Error(`Backend launcher exited before health with code ${code}`)))
      }),
    ])
  } catch (error) {
    const details = existsSync(logPath) ? readFileSync(logPath, 'utf8') : 'No backend log was created.'
    throw new Error(`${error instanceof Error ? error.message : error}\n${details}`)
  }
  const pid = await discoverListenerPid()
  writeFileSync(pidFile(), `${pid}\n${logPath}\n`, 'utf8')
  return pid
}

export async function stopBackend(): Promise<void> {
  let pid: number
  if (existsSync(pidFile())) {
    pid = Number(readFileSync(pidFile(), 'utf8').split(/\r?\n/, 1)[0])
  } else {
    try {
      pid = await discoverListenerPid()
    } catch {
      await waitForHealth('down', 2_000)
      return
    }
  }
  if (!Number.isInteger(pid) || pid <= 0) throw new Error(`Refusing invalid backend PID: ${pid}`)
  await new Promise<void>((resolveStop, reject) => {
    const command = `Stop-Process -Id ${pid} -Force -ErrorAction Stop`
    const child = spawn('pwsh', ['-NoProfile', '-Command', command], { stdio: 'ignore' })
    child.once('error', reject)
    child.once('exit', (code) => code === 0 ? resolveStop() : reject(new Error(`Stop-Process exited ${code}`)))
  })
  await waitForHealth('down')
}

export async function restartBackend(): Promise<{ before: number; after: number }> {
  const before = await discoverListenerPid()
  await stopBackend()
  const after = await startBackend()
  if (after === before) throw new Error(`Backend PID did not change after restart (${before})`)
  return { before, after }
}
