/**
 * ArtifactCommentStore — CRUD + persistence for artifact comments (spec 09
 * Phase 2). Mirrors ArtifactStore's storage pattern: durable SQLite
 * (`artifact_comments` in D:\databases\vibe_studio.db) via the Tauri bridge
 * when available, falling back to electron-store / localStorage. Rows carry
 * real artifact_id/task_id columns plus the full comment as a JSON blob.
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */
import { logger } from '../Logger';
import type { ArtifactComment, CommentDelivery } from './types';

const STORAGE_KEY = 'vcs_artifact_comments';
const MAX_COMMENTS = 1000; // retention backstop — oldest drop first

const SQLITE_UPSERT = `INSERT INTO artifact_comments (id, artifact_id, task_id, comment_data)
VALUES (?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  comment_data = excluded.comment_data,
  updated_at = CURRENT_TIMESTAMP`;

interface SqliteRows {
  success?: boolean;
  data?: Array<{ id?: string; comment_data?: string }>;
}

export interface ArtifactCommentDraft {
  artifactId: string;
  taskId: string;
  body: string;
  delivery: CommentDelivery;
}

export class ArtifactCommentStore {
  private comments = new Map<string, ArtifactComment>();
  private loaded = false;

  /** Load persisted comments. Idempotent. */
  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    for (const raw of await this.readPersisted()) {
      const parsed = this.deserialize(raw);
      if (parsed) this.comments.set(parsed.id, parsed);
    }
    logger.debug(`[ArtifactCommentStore] Loaded ${this.comments.size} comments`);
  }

  /** Thread order (oldest first); optionally scoped to one artifact */
  list(filter: { artifactId?: string } = {}): ArtifactComment[] {
    return Array.from(this.comments.values())
      .filter(c => (filter.artifactId ? c.artifactId === filter.artifactId : true))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  get(id: string): ArtifactComment | undefined {
    return this.comments.get(id);
  }

  async add(draft: ArtifactCommentDraft, nowMs = Date.now()): Promise<ArtifactComment> {
    const comment: ArtifactComment = {
      id: `comment-${nowMs}-${crypto.randomUUID()}`,
      artifactId: draft.artifactId,
      taskId: draft.taskId,
      body: draft.body,
      createdAt: new Date(nowMs).toISOString(),
      delivery: draft.delivery,
    };
    this.comments.set(comment.id, comment);
    this.enforceRetention();
    await this.persist(comment);
    return comment;
  }

  /** Flip a comment's delivery state (queued → delivered/feedback) */
  async setDelivery(id: string, delivery: CommentDelivery): Promise<ArtifactComment | undefined> {
    const existing = this.comments.get(id);
    if (!existing) return undefined;
    const updated: ArtifactComment = { ...existing, delivery };
    this.comments.set(id, updated);
    await this.persist(updated);
    return updated;
  }

  /** Cascade delete when an artifact is removed */
  async removeByArtifact(artifactId: string): Promise<number> {
    const doomed = this.list({ artifactId });
    for (const comment of doomed) {
      this.comments.delete(comment.id);
    }
    if (doomed.length === 0) return 0;
    if (this.hasSqliteDb()) {
      try {
        await window.electron!.db!.execute('DELETE FROM artifact_comments WHERE artifact_id = ?', [
          artifactId,
        ]);
      } catch (error) {
        logger.error('[ArtifactCommentStore] Failed to delete comment rows', error);
      }
    }
    await this.saveFallback();
    return doomed.length;
  }

  // -- internals ------------------------------------------------------------

  /** Drop the oldest comments beyond MAX_COMMENTS (in-memory + fallback) */
  private enforceRetention(): void {
    if (this.comments.size <= MAX_COMMENTS) return;
    for (const comment of this.list().slice(0, this.comments.size - MAX_COMMENTS)) {
      this.comments.delete(comment.id);
    }
  }

  private async persist(comment: ArtifactComment): Promise<void> {
    if (this.hasSqliteDb()) {
      try {
        await window.electron!.db!.execute(SQLITE_UPSERT, [
          comment.id,
          comment.artifactId,
          comment.taskId,
          JSON.stringify(comment),
        ]);
      } catch (error) {
        logger.error('[ArtifactCommentStore] Failed to persist comment to SQLite', error);
      }
    }
    await this.saveFallback();
  }

  private async readPersisted(): Promise<string[]> {
    if (this.hasSqliteDb()) {
      try {
        const result = (await window.electron!.db!.execute(
          'SELECT id, comment_data FROM artifact_comments',
          []
        )) as SqliteRows;
        const rows = result?.data ?? [];
        if (rows.length > 0) {
          return rows.map(row => row.comment_data ?? '').filter(Boolean);
        }
      } catch (error) {
        logger.error('[ArtifactCommentStore] Failed to load comments from SQLite', error);
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
      logger.error('[ArtifactCommentStore] Fallback read failed', error);
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
      logger.error('[ArtifactCommentStore] Fallback save failed', error);
    }
  }

  private deserialize(raw: string): ArtifactComment | null {
    try {
      const parsed = JSON.parse(raw) as ArtifactComment;
      if (!parsed.id || !parsed.artifactId || !parsed.body) return null;
      parsed.delivery = parsed.delivery ?? 'feedback';
      return parsed;
    } catch (error) {
      logger.error('[ArtifactCommentStore] Failed to parse stored comment', error);
      return null;
    }
  }

  private hasSqliteDb(): boolean {
    return typeof window !== 'undefined' && typeof window.electron?.db?.execute === 'function';
  }
}
