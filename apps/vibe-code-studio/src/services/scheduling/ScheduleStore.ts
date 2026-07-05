/**
 * ScheduleStore — CRUD + persistence for agent schedules.
 *
 * Storage follows the StrategyMemory precedent: durable SQLite
 * (`agent_schedules` in D:\databases\vibe_studio.db) via the Tauri bridge when
 * available, falling back to electron-store / localStorage on web/dev. Rows
 * store the full definition as a JSON blob (single-statement DML only —
 * db_execute_query rejects DDL/multi-statement SQL).
 * Spec: FEATURE_SPECS/competitive-gaps/16-AGENT-SCHEDULING.md
 */
import { logger } from '../Logger';
import { computeNextRunAt } from './cadence';
import type { ScheduleDefinition, ScheduleDraft, ScheduleRunRecord } from './types';
import { MAX_RUN_HISTORY } from './types';

const STORAGE_KEY = 'vcs_agent_schedules';

const SQLITE_UPSERT = `INSERT INTO agent_schedules (id, definition_data)
VALUES (?, ?)
ON CONFLICT(id) DO UPDATE SET
  definition_data = excluded.definition_data,
  updated_at = CURRENT_TIMESTAMP`;

interface SqliteRows {
  success?: boolean;
  data?: Array<{ id?: string; definition_data?: string }>;
}

export class ScheduleStore {
  private schedules = new Map<string, ScheduleDefinition>();
  private loaded = false;

  /** Load persisted schedules. Idempotent; safe to call before every read. */
  async load(nowMs: number): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    const raw = await this.readPersisted();
    for (const entry of raw) {
      const parsed = this.deserialize(entry);
      if (parsed) this.schedules.set(parsed.id, parsed);
    }
    logger.debug(`[ScheduleStore] Loaded ${this.schedules.size} schedules (now=${nowMs})`);
  }

  list(): ScheduleDefinition[] {
    return Array.from(this.schedules.values());
  }

  get(id: string): ScheduleDefinition | undefined {
    return this.schedules.get(id);
  }

  async create(draft: ScheduleDraft, nowMs: number): Promise<ScheduleDefinition> {
    const nextRunAtMs = computeNextRunAt(draft.cadence, nowMs);
    const definition: ScheduleDefinition = {
      id: `schedule-${nowMs}-${Math.random().toString(36).slice(2, 9)}`,
      agentId: draft.agentId,
      userRequest: draft.userRequest,
      workspaceRoot: draft.workspaceRoot,
      parameters: draft.parameters ?? {},
      options: draft.options ?? {},
      cadence: draft.cadence,
      status: 'active',
      missedRunPolicy: draft.missedRunPolicy ?? 'run-on-launch',
      createdAt: new Date(nowMs).toISOString(),
      runs: [],
      nextRunAtMs,
    };
    this.schedules.set(definition.id, definition);
    await this.persist(definition);
    return definition;
  }

  /** Apply a partial update (pause/resume/edit) and persist the result. */
  async update(
    id: string,
    changes: Partial<ScheduleDefinition>
  ): Promise<ScheduleDefinition | undefined> {
    const existing = this.schedules.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...changes, id: existing.id };
    this.schedules.set(id, updated);
    await this.persist(updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const removed = this.schedules.delete(id);
    if (!removed) return false;
    if (this.hasSqliteDb()) {
      try {
        await window.electron!.db!.execute('DELETE FROM agent_schedules WHERE id = ?', [id]);
      } catch (error) {
        logger.error('[ScheduleStore] Failed to delete schedule row', error);
      }
    }
    await this.saveFallback();
    return true;
  }

  /** Prepend a run record, capping history at MAX_RUN_HISTORY. */
  async recordRun(id: string, run: ScheduleRunRecord): Promise<ScheduleDefinition | undefined> {
    const existing = this.schedules.get(id);
    if (!existing) return undefined;
    const withoutSelf = existing.runs.filter(r => r.id !== run.id);
    const runs = [run, ...withoutSelf].slice(0, MAX_RUN_HISTORY);
    return this.update(id, { runs });
  }

  // -- persistence ----------------------------------------------------------

  private async persist(definition: ScheduleDefinition): Promise<void> {
    if (this.hasSqliteDb()) {
      try {
        await window.electron!.db!.execute(SQLITE_UPSERT, [
          definition.id,
          JSON.stringify(definition),
        ]);
      } catch (error) {
        logger.error('[ScheduleStore] Failed to persist schedule to SQLite', error);
      }
    }
    await this.saveFallback();
  }

  private async readPersisted(): Promise<string[]> {
    if (this.hasSqliteDb()) {
      try {
        const result = (await window.electron!.db!.execute(
          'SELECT id, definition_data FROM agent_schedules',
          []
        )) as SqliteRows;
        const rows = result?.data ?? [];
        if (rows.length > 0) {
          return rows.map(row => row.definition_data ?? '').filter(Boolean);
        }
      } catch (error) {
        logger.error('[ScheduleStore] Failed to load schedules from SQLite', error);
      }
    }
    return this.readFallback();
  }

  private async readFallback(): Promise<string[]> {
    try {
      let stored: string | null = null;
      if (typeof window !== 'undefined' && window.electron?.store) {
        stored = (await window.electron.store.get(STORAGE_KEY)) ?? null;
      } else if (typeof localStorage !== 'undefined') {
        stored = localStorage.getItem(STORAGE_KEY);
      }
      if (!stored) return [];
      const parsed = JSON.parse(stored) as unknown[];
      return parsed.map(entry => JSON.stringify(entry));
    } catch (error) {
      logger.error('[ScheduleStore] Fallback read failed', error);
      return [];
    }
  }

  private async saveFallback(): Promise<void> {
    try {
      const serialized = JSON.stringify(this.list());
      if (typeof window !== 'undefined' && window.electron?.store) {
        await window.electron.store.set(STORAGE_KEY, serialized);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, serialized);
      }
    } catch (error) {
      logger.error('[ScheduleStore] Fallback save failed', error);
    }
  }

  private deserialize(raw: string): ScheduleDefinition | null {
    try {
      const parsed = JSON.parse(raw) as ScheduleDefinition;
      if (!parsed.id || !parsed.cadence) return null;
      parsed.runs = Array.isArray(parsed.runs) ? parsed.runs : [];
      parsed.parameters = parsed.parameters ?? {};
      parsed.options = parsed.options ?? {};
      parsed.nextRunAtMs = parsed.nextRunAtMs ?? null;
      return parsed;
    } catch (error) {
      logger.error('[ScheduleStore] Failed to parse stored schedule', error);
      return null;
    }
  }

  private hasSqliteDb(): boolean {
    return typeof window !== 'undefined' && typeof window.electron?.db?.execute === 'function';
  }
}
