import Database from 'better-sqlite3';
import type { FeatureFlag } from '@dev/feature-flags-core';

const DEFAULT_DB_PATH = process.env.FF_DB_PATH ?? 'D:/databases/feature_flags.db';

export class SQLiteStorage {
  private db: Database.Database;

  constructor(dbPath: string = DEFAULT_DB_PATH) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS feature_flags (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        type TEXT NOT NULL CHECK(type IN ('boolean', 'percentage', 'variant', 'kill_switch')),
        enabled INTEGER NOT NULL DEFAULT 0,
        environments TEXT NOT NULL DEFAULT '{}',
        rules TEXT NOT NULL DEFAULT '[]',
        kill_switch TEXT,
        variants TEXT DEFAULT '[]',
        tags TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_by TEXT DEFAULT 'system'
      );

      CREATE INDEX IF NOT EXISTS idx_flags_key ON feature_flags(key);
      CREATE INDEX IF NOT EXISTS idx_flags_type ON feature_flags(type);

      CREATE TABLE IF NOT EXISTS flag_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flag_id TEXT NOT NULL,
        flag_key TEXT NOT NULL,
        action TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_by TEXT DEFAULT 'system',
        changed_at TEXT NOT NULL DEFAULT (datetime('now')),
        reason TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_audit_flag ON flag_audit_log(flag_id);
      CREATE INDEX IF NOT EXISTS idx_audit_time ON flag_audit_log(changed_at);
    `);
  }

  getAllFlags(): FeatureFlag[] {
    const rows = this.db.prepare('SELECT * FROM feature_flags ORDER BY key').all();
    return rows.map((row: any) => this.rowToFlag(row));
  }

  getFlagByKey(key: string): FeatureFlag | null {
    const row = this.db.prepare('SELECT * FROM feature_flags WHERE key = ?').get(key);
    return row ? this.rowToFlag(row as any) : null;
  }

  getFlagById(id: string): FeatureFlag | null {
    const row = this.db.prepare('SELECT * FROM feature_flags WHERE id = ?').get(id);
    return row ? this.rowToFlag(row as any) : null;
  }

  getKillSwitches(): FeatureFlag[] {
    const rows = this.db.prepare(
      "SELECT * FROM feature_flags WHERE type = 'kill_switch'"
    ).all();
    return rows.map((row: any) => this.rowToFlag(row));
  }

  getActiveKillSwitches(): FeatureFlag[] {
    const rows = this.db.prepare(
      "SELECT * FROM feature_flags WHERE type = 'kill_switch' AND enabled = 1"
    ).all();
    return rows.map((row: any) => this.rowToFlag(row));
  }

  createFlag(flag: FeatureFlag): FeatureFlag {
    const stmt = this.db.prepare(`
      INSERT INTO feature_flags (
        id, key, name, description, type, enabled,
        environments, rules, kill_switch, variants, tags,
        created_at, updated_at, created_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        datetime('now'), datetime('now'), ?
      )
    `);

    stmt.run(
      flag.id,
      flag.key,
      flag.name,
      flag.description,
      flag.type,
      flag.enabled ? 1 : 0,
      JSON.stringify(flag.environments),
      JSON.stringify(flag.rules),
      flag.killSwitch ? JSON.stringify(flag.killSwitch) : null,
      JSON.stringify(flag.variants ?? []),
      JSON.stringify(flag.tags),
      flag.createdBy
    );

    this.logAudit(flag.id, flag.key, 'created', null, flag, flag.createdBy);
    return this.getFlagById(flag.id)!;
  }

  updateFlag(id: string, updates: Partial<FeatureFlag>, changedBy = 'system'): FeatureFlag | null {
    const existing = this.getFlagById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.environments !== undefined) {
      fields.push('environments = ?');
      values.push(JSON.stringify(updates.environments));
    }
    if (updates.rules !== undefined) {
      fields.push('rules = ?');
      values.push(JSON.stringify(updates.rules));
    }
    if (updates.killSwitch !== undefined) {
      fields.push('kill_switch = ?');
      values.push(JSON.stringify(updates.killSwitch));
    }
    if (updates.variants !== undefined) {
      fields.push('variants = ?');
      values.push(JSON.stringify(updates.variants));
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }

    if (fields.length === 0) return existing;

    fields.push("updated_at = datetime('now')");
    values.push(id);

    const sql = `UPDATE feature_flags SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);

    const updated = this.getFlagById(id)!;
    this.logAudit(id, existing.key, 'updated', existing, updated, changedBy);
    return updated;
  }

  deleteFlag(id: string, deletedBy = 'system'): boolean {
    const existing = this.getFlagById(id);
    if (!existing) return false;

    this.db.prepare('DELETE FROM feature_flags WHERE id = ?').run(id);
    this.logAudit(id, existing.key, 'deleted', existing, null, deletedBy);
    return true;
  }

  setFlagEnabled(id: string, enabled: boolean, changedBy = 'system'): FeatureFlag | null {
    return this.updateFlag(id, { enabled }, changedBy);
  }

  getAuditLog(flagId?: string, limit = 100): any[] {
    if (flagId) {
      return this.db.prepare(
        'SELECT * FROM flag_audit_log WHERE flag_id = ? ORDER BY changed_at DESC LIMIT ?'
      ).all(flagId, limit);
    }
    return this.db.prepare(
      'SELECT * FROM flag_audit_log ORDER BY changed_at DESC LIMIT ?'
    ).all(limit);
  }

  private logAudit(
    flagId: string,
    flagKey: string,
    action: string,
    oldValue: any,
    newValue: any,
    changedBy: string,
    reason?: string
  ): void {
    this.db.prepare(`
      INSERT INTO flag_audit_log (flag_id, flag_key, action, old_value, new_value, changed_by, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      flagId,
      flagKey,
      action,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      changedBy,
      reason ?? null
    );
  }

  private rowToFlag(row: any): FeatureFlag {
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description ?? '',
      type: row.type,
      enabled: row.enabled === 1,
      environments: JSON.parse(row.environments ?? '{}'),
      rules: JSON.parse(row.rules ?? '[]'),
      killSwitch: row.kill_switch ? JSON.parse(row.kill_switch) : undefined,
      variants: JSON.parse(row.variants ?? '[]'),
      tags: JSON.parse(row.tags ?? '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    };
  }

  close(): void {
    this.db.close();
  }
}
