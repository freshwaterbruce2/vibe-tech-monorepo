/**
 * KnowledgeStore — CRUD + persistence for spec 04 Knowledge Items.
 * Clone of the ScheduleStore storage contract: durable SQLite
 * (`knowledge_items` in D:\databases\vibe_studio.db) via the Tauri bridge
 * when available, falling back to electron-store / localStorage. Rows keep
 * the full item as a JSON blob; `category` is a real column for filtering.
 * Single-statement DML only — db_execute_query rejects DDL.
 * Spec: FEATURE_SPECS/competitive-gaps/04-AGENT-MEMORY-KNOWLEDGE.md
 */
import { logger } from '../Logger';
import { KNOWLEDGE_CATEGORY_DEFAULT, type KnowledgeDraft, type KnowledgeItem } from './types';

const STORAGE_KEY = 'vcs_knowledge_items';
const MAX_ITEMS = 500;

const SQLITE_UPSERT = `INSERT INTO knowledge_items (id, category, item_data)
VALUES (?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  category = excluded.category,
  item_data = excluded.item_data,
  updated_at = CURRENT_TIMESTAMP`;

interface SqliteRows {
  success?: boolean;
  data?: Array<{ id?: string; item_data?: string }>;
}

export class KnowledgeStore {
  private items = new Map<string, KnowledgeItem>();
  private loaded = false;
  /** Shared in-flight load so concurrent callers await the SAME read. */
  private loadPromise: Promise<void> | null = null;

  /**
   * Load persisted items. Idempotent and concurrency-safe: parallel callers
   * share one read, and `loaded` is only latched once a read SUCCEEDS — a
   * degraded read (DB bridge not ready) does not latch an empty store, so a
   * later call retries instead of returning empty for the whole session.
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    this.loadPromise ??= this.doLoad();
    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  private async doLoad(): Promise<void> {
    const { entries, degraded } = await this.readPersisted();
    for (const entry of entries) {
      const parsed = this.deserialize(entry);
      if (parsed) this.items.set(parsed.id, parsed);
    }
    // Only latch when the read was trustworthy; a degraded+empty read leaves
    // loaded=false so the next load() re-attempts once the DB is ready.
    if (!degraded || this.items.size > 0) {
      this.loaded = true;
    }
    logger.debug(`[KnowledgeStore] Loaded ${this.items.size} knowledge items`);
  }

  list(): KnowledgeItem[] {
    return Array.from(this.items.values());
  }

  get(id: string): KnowledgeItem | undefined {
    return this.items.get(id);
  }

  async create(draft: KnowledgeDraft, now: () => Date = () => new Date()): Promise<KnowledgeItem> {
    const createdAt = now().toISOString();
    const item: KnowledgeItem = {
      id: `knowledge-${crypto.randomUUID()}`,
      title: draft.title.trim(),
      content: draft.content,
      category: draft.category?.trim() || KNOWLEDGE_CATEGORY_DEFAULT,
      scopeGlobs: draft.scopeGlobs ?? [],
      sourceSessionId: draft.sourceSessionId ?? 'manual',
      createdAt,
      updatedAt: createdAt,
    };
    this.items.set(item.id, item);
    await this.persist(item);
    await this.pruneOldest();
    return item;
  }

  async update(
    id: string,
    changes: Partial<Omit<KnowledgeItem, 'id' | 'createdAt'>>,
    now: () => Date = () => new Date()
  ): Promise<KnowledgeItem | undefined> {
    const existing = this.items.get(id);
    if (!existing) return undefined;
    const updated: KnowledgeItem = {
      ...existing,
      ...changes,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now().toISOString(),
    };
    this.items.set(id, updated);
    await this.persist(updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const removed = this.items.delete(id);
    if (!removed) return false;
    if (this.hasSqliteDb()) {
      try {
        await window.electron!.db!.execute('DELETE FROM knowledge_items WHERE id = ?', [id]);
      } catch (error) {
        logger.error('[KnowledgeStore] Failed to delete knowledge row', error);
      }
    }
    await this.saveFallback();
    return true;
  }

  // -- persistence ----------------------------------------------------------

  private async pruneOldest(): Promise<void> {
    if (this.items.size <= MAX_ITEMS) return;
    const sorted = this.list().sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    const excess = sorted.slice(0, this.items.size - MAX_ITEMS);
    for (const item of excess) {
      this.items.delete(item.id);
    }
    // Eviction must reach durable storage too, or pruned rows resurrect on the
    // next load() and the cap never actually bounds the corpus.
    if (this.hasSqliteDb()) {
      for (const item of excess) {
        try {
          await window.electron!.db!.execute('DELETE FROM knowledge_items WHERE id = ?', [item.id]);
        } catch (error) {
          logger.error('[KnowledgeStore] Failed to delete pruned knowledge row', error);
        }
      }
    }
    await this.saveFallback();
  }

  private async persist(item: KnowledgeItem): Promise<void> {
    if (this.hasSqliteDb()) {
      try {
        await window.electron!.db!.execute(SQLITE_UPSERT, [
          item.id,
          item.category,
          JSON.stringify(item),
        ]);
      } catch (error) {
        logger.error('[KnowledgeStore] Failed to persist knowledge item to SQLite', error);
      }
    }
    await this.saveFallback();
  }

  private async readPersisted(): Promise<{ entries: string[]; degraded: boolean }> {
    if (this.hasSqliteDb()) {
      try {
        const result = (await window.electron!.db!.execute(
          'SELECT id, item_data FROM knowledge_items',
          []
        )) as SqliteRows;
        const rows = result?.data ?? [];
        if (rows.length > 0) {
          return { entries: rows.map(row => row.item_data ?? '').filter(Boolean), degraded: false };
        }
        // Reachable SQLite that returned zero rows is a trustworthy empty.
        return { entries: [], degraded: false };
      } catch (error) {
        // DB present but unusable (bridge/table not ready): degraded — fall
        // through to the local snapshot but let the caller retry later.
        logger.error('[KnowledgeStore] Failed to load knowledge items from SQLite', error);
        return { entries: await this.readFallback(), degraded: true };
      }
    }
    return { entries: await this.readFallback(), degraded: false };
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
      logger.error('[KnowledgeStore] Fallback read failed', error);
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
      logger.error('[KnowledgeStore] Fallback save failed', error);
    }
  }

  private deserialize(raw: string): KnowledgeItem | null {
    try {
      const parsed = JSON.parse(raw) as KnowledgeItem;
      if (!parsed.id || !parsed.title) return null;
      parsed.scopeGlobs = Array.isArray(parsed.scopeGlobs) ? parsed.scopeGlobs : [];
      parsed.category = parsed.category || KNOWLEDGE_CATEGORY_DEFAULT;
      parsed.sourceSessionId = parsed.sourceSessionId || 'manual';
      return parsed;
    } catch (error) {
      logger.error('[KnowledgeStore] Failed to parse stored knowledge item', error);
      return null;
    }
  }

  private hasSqliteDb(): boolean {
    return typeof window !== 'undefined' && typeof window.electron?.db?.execute === 'function';
  }
}
