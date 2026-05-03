import type Database from 'better-sqlite3'

export type JobHandler<P = unknown> = (
  payload: P,
  ctx: { db: Database.Database; jobId: string },
) => Promise<void>

const handlers = new Map<string, JobHandler>()

export const registerHandler = <P = unknown>(
  type: string,
  handler: JobHandler<P>,
): void => {
  handlers.set(type, handler as JobHandler)
}

export const getHandler = (type: string): JobHandler | undefined =>
  handlers.get(type)

export const clearHandlers = (): void => {
  handlers.clear()
}
