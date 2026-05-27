import path from 'node:path'

export interface AppEnv {
  port: number
  host: string
  databasePath: string
  uiDistPath?: string
}

function assertDatabasePathOnDDrive(databasePath: string): void {
  const normalized = path.win32.normalize(databasePath)
  const drive = normalized.slice(0, 2).toUpperCase()

  if (drive !== 'D:') {
    throw new Error(
      `DATABASE_PATH must be on D:\\ per repo storage rules. Got: ${databasePath}`,
    )
  }
}

export function readEnv(): AppEnv {
  const databasePath =
    process.env.DATABASE_PATH ?? 'D:\\data\\symptom-tracker\\symptom-tracker.db'

  assertDatabasePathOnDDrive(databasePath)

  const host = process.env.HOST ?? '127.0.0.1'

  const portRaw = process.env.PORT ?? '5055'
  const port = Number(portRaw)
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT: ${portRaw}`)
  }

  const uiDistPath = process.env.UI_DIST_PATH?.trim() ?? undefined

  return { port, host, databasePath, uiDistPath }
}
