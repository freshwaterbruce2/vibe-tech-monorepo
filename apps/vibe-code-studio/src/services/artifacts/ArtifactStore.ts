/**
 * ArtifactStore — CRUD + persistence for verifiable artifacts (spec 09).
 *
 * Storage follows the StrategyMemory/ScheduleStore precedent: durable SQLite
 * (`artifacts` in D:\databases\vibe_studio.db) via the Tauri bridge when
 * available, falling back to electron-store / localStorage on web/dev. Rows
 * carry real task_id/kind columns for filtering plus the full artifact as a
 * JSON blob (db_execute_query allows single-statement DML only).
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */
import { logger } from '../Logger';
import type { Artifact, ArtifactKind, ArtifactStatus } from './types';

const STORAGE_KEY = 'vcs_artifacts';
const MAX_ARTIFACTS = 500; // retention backstop — oldest drop first

const SQLITE_UPSERT = `INSERT INTO artifacts (id, task_id, kind, artifact_data)
VALUES (?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  task_id = excluded.task_id,
  kind = excluded.kind,
  artifact_data = excluded.artifact_data,
  updated_at = CURRENT_TIMESTAMP`;

interface SqliteRows {
  success?: boolean;
  data?: Array<{ id?: string; artifact_data?: string }>;
}

export interface ArtifactDraft {
  taskId: string;
  kind: ArtifactKind;
  title: string;
  content: string;
  status?: ArtifactStatus;
}

export class ArtifactStore {
  private artifacts = new Map<string, Artifact>();
  private loaded = false;

  /** Load persisted artifacts. Idempotent. */
  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    for (const raw of await this.readPersisted()) {
      const parsed = this.deserialize(raw);
      if (parsed) this.artifacts.set(parsed.id, parsed);
    }
    logger.debug(`[ArtifactStore] Loaded ${this.artifacts.size} artifacts`);
  }

  /** Newest first; optionally filtered by task and/or kind (spec AC #2) */
  list(filter: { taskId?: string; kind?: ArtifactKind } = {}): Artifact[] {
    return Array.from(this.artifacts.values())
      .filter(a => (filter.taskId ? a.taskId === filter.taskId : true))
      .filter(a => (filter.kind ? a.kind === filter.kind : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: string): Artifact | undefined {
    return this.artifacts.get(id);
  }

  async record(draft: ArtifactDraft, nowMs = Date.now()): Promise<Artifact> {
    const createdAt = new Date(nowMs).toISOString();
    const artifact: Artifact = {
      id: `artifact-${nowMs}-${Math.random().toString(36).slice(2, 9)}`,
      taskId: draft.taskId,
      kind: draft.kind,
      title: draft.title,
      content: draft.content,
      createdAt,
      updatedAt: createdAt,
      status: draft.status ?? 'draft',
    };
    this.artifacts.set(artifact.id, artifact);
    this.enforceRetention();
    await this.persist(artifact);
    return artifact;
  }

  /** Update content/title/status of an existing artifact and persist */
  async update(
    id: string,
    changes: Partial<Pick<Artifact, 'title' | 'content' | 'status'>>,
    nowMs = Date.now()
  ): Promise<Artifact | undefined> {
    const existing = this.artifacts.get(id);
    if (!existing) return undefined;
    const updated: Artifact = {
      ...existing,
      ...changes,
      updatedAt: new Date(nowMs).toISOString(),
    };
    this.artifacts.set(id, updated);
    await this.persist(updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    if (!this.artifacts.delete(id)) return false;
    if (this.hasSqliteDb()) {
      try {
        await window.electron!.db!.execute('DELETE FROM artifacts WHERE id = ?', [id]);
      } catch (error) {
        logger.error('[ArtifactStore] Failed to delete artifact row', error);
      }
    }
    await this.saveFallback();
    return true;
  }

  // -- internals ------------------------------------------------------------

  /** Drop the oldest artifacts beyond MAX_ARTIFACTS (in-memory + fallback) */
  private enforceRetention(): void {
    if (this.artifacts.size <= MAX_ARTIFACTS) return;
    const oldestFirst = Array.from(this.artifacts.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
    for (const artifact of oldestFirst.slice(0, this.artifacts.size - MAX_ARTIFACTS)) {
      this.artifacts.delete(artifact.id);
    }
  }

  private async persist(artifact: Artifact): Promise<void> {
    if (this.hasSqliteDb()) {
      try {
        await window.electron!.db!.execute(SQLITE_UPSERT, [
          artifact.id,
          artifact.taskId,
          artifact.kind,
          JSON.stringify(artifact),
        ]);
      } catch (error) {
        logger.error('[ArtifactStore] Failed to persist artifact to SQLite', error);
      }
    }
    await this.saveFallback();
  }

  private async readPersisted(): Promise<string[]> {
    if (this.hasSqliteDb()) {
      try {
        const result = (await window.electron!.db!.execute(
          'SELECT id, artifact_data FROM artifacts',
          []
        )) as SqliteRows;
        const rows = result?.data ?? [];
        if (rows.length > 0) {
          return rows.map(row => row.artifact_data ?? '').filter(Boolean);
        }
      } catch (error) {
        logger.error('[ArtifactStore] Failed to load artifacts from SQLite', error);
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
      return (JSON.parse(stored) as unknown[]).map(entry => JSON.stringify(entry));
    } catch (error) {
      logger.error('[ArtifactStore] Fallback read failed', error);
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
      logger.error('[ArtifactStore] Fallback save failed', error);
    }
  }

  private deserialize(raw: string): Artifact | null {
    try {
      const parsed = JSON.parse(raw) as Artifact;
      if (!parsed.id || !parsed.taskId || !parsed.kind) return null;
      parsed.status = parsed.status ?? 'final';
      parsed.updatedAt = parsed.updatedAt ?? parsed.createdAt;
      return parsed;
    } catch (error) {
      logger.error('[ArtifactStore] Failed to parse stored artifact', error);
      return null;
    }
  }

  private hasSqliteDb(): boolean {
    return typeof window !== 'undefined' && typeof window.electron?.db?.execute === 'function';
  }
}
