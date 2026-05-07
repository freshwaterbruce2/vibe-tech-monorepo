import type Database from 'better-sqlite3'

export type AuditEntityType =
  | 'invoice'
  | 'client'
  | 'user'
  | 'payment'
  | 'recurring_schedule'
  | 'dunning_policy'
  | 'email'
  | 'auth'
  | 'webhook'

export interface AuditEntry {
  actorUserId?: string | null
  action: string
  entityType: AuditEntityType | string
  entityId?: string | null
  metadata?: Record<string, unknown> | null
  ip?: string | null
  userAgent?: string | null
}

export interface AuditRecord extends AuditEntry {
  id: string
  createdAt: string
}

export const recordAudit = (
  db: Database.Database,
  entry: AuditEntry,
): AuditRecord => {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const metadataJson = entry.metadata ? JSON.stringify(entry.metadata) : null

  db.prepare(
    `INSERT INTO audit_log
      (id, actor_user_id, action, entity_type, entity_id, metadata_json, ip, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    entry.actorUserId ?? null,
    entry.action,
    entry.entityType,
    entry.entityId ?? null,
    metadataJson,
    entry.ip ?? null,
    entry.userAgent ?? null,
    createdAt,
  )

  return {
    id,
    createdAt,
    ...entry,
  }
}

export interface AuditQuery {
  entityType?: string
  entityId?: string
  actorUserId?: string
  action?: string
  limit?: number
}

export const queryAudit = (
  db: Database.Database,
  query: AuditQuery = {},
): AuditRecord[] => {
  const where: string[] = []
  const params: unknown[] = []
  if (query.entityType) {
    where.push('entity_type = ?')
    params.push(query.entityType)
  }
  if (query.entityId) {
    where.push('entity_id = ?')
    params.push(query.entityId)
  }
  if (query.actorUserId) {
    where.push('actor_user_id = ?')
    params.push(query.actorUserId)
  }
  if (query.action) {
    where.push('action = ?')
    params.push(query.action)
  }
  const limit = Math.max(1, Math.min(query.limit ?? 100, 1000))
  const sql =
    `SELECT id, actor_user_id, action, entity_type, entity_id, metadata_json, ip, user_agent, created_at
     FROM audit_log
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY created_at DESC
     LIMIT ?`
  params.push(limit)

  type Row = {
    id: string
    actor_user_id: string | null
    action: string
    entity_type: string
    entity_id: string | null
    metadata_json: string | null
    ip: string | null
    user_agent: string | null
    created_at: string
  }

  const rows = db.prepare(sql).all(...params) as Row[]
  return rows.map((r) => ({
    id: r.id,
    actorUserId: r.actor_user_id,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    metadata: r.metadata_json ? JSON.parse(r.metadata_json) : null,
    ip: r.ip,
    userAgent: r.user_agent,
    createdAt: r.created_at,
  }))
}
