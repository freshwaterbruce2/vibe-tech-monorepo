/**
 * Memory Decay System
 * Ebbinghaus-inspired exponential decay with access frequency boost.
 * Memories lose relevance over time unless reinforced through access.
 */

import type Database from 'better-sqlite3';

export interface DecayConfig {
  /** Half-life in milliseconds — kept for backward compat; overridden by episodic/semantic specific values */
  halfLifeMs?: number;
  /** Episodic memory half-life (default: 5 days — faster decay for transient events) */
  episodicHalfLifeMs?: number;
  /** Semantic memory half-life (default: 11 days — slower decay for long-term knowledge) */
  semanticHalfLifeMs?: number;
  /** Minimum score before archival (default: 0.1) */
  archiveThreshold?: number;
  /** Boost factor per access (default: 0.1, linear with cap 0.5) */
  accessBoost?: number;
  /** Importance weight multiplier (default: 0.2) */
  importanceWeight?: number;
  /** Interval for scheduled decay runs in ms (default: 6 hours, 0 = disabled) */
  scheduledIntervalMs?: number;
  /** SM-2 inspired: easiness factor base (default: 2.5) */
  easinessFactor?: number;
}

export interface DecayScore {
  id: number;
  text: string;
  score: number;
  ageMs: number;
  accessCount: number;
  importance: number;
  category: string | null;
}

export interface DecayResult {
  archived: number;
  remaining: number;
  scores: DecayScore[];
}

const DEFAULT_EPISODIC_HALF_LIFE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days (FadeMem dual-layer)
const DEFAULT_SEMANTIC_HALF_LIFE_MS = 11 * 24 * 60 * 60 * 1000; // 11 days (FadeMem dual-layer)

export class MemoryDecay {
  readonly episodicHalfLifeMs: number;
  readonly semanticHalfLifeMs: number;
  private archiveThreshold: number;
  private accessBoost: number;
  private importanceWeight: number;
  private easinessFactor: number;
  private scheduledIntervalMs: number;
  private scheduledTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: DecayConfig = {}) {
    // Support legacy halfLifeMs as override for both; otherwise use dual-layer defaults
    this.episodicHalfLifeMs =
      config.episodicHalfLifeMs ?? config.halfLifeMs ?? DEFAULT_EPISODIC_HALF_LIFE_MS;
    this.semanticHalfLifeMs =
      config.semanticHalfLifeMs ?? config.halfLifeMs ?? DEFAULT_SEMANTIC_HALF_LIFE_MS;
    this.archiveThreshold = config.archiveThreshold ?? 0.1;
    this.accessBoost = config.accessBoost ?? 0.1; // linear, not sqrt
    this.importanceWeight = config.importanceWeight ?? 0.2;
    this.easinessFactor = config.easinessFactor ?? 2.5;
    this.scheduledIntervalMs = config.scheduledIntervalMs ?? 6 * 60 * 60 * 1000; // 6 hours
  }

  /**
   * Calculate decay score for a single memory.
   * Score range: 0.0 (completely decayed) to 1.0+ (very active/important)
   *
   * Formula (Phase 4 — FadeMem dual-layer):
   *   base  = 2^(-ageMs / effectiveHalfLife)
   *   boost = min(accessCount * 0.1, 0.5)   // linear with cap (replaces sqrt)
   *   importanceBonus = (importance / 10) * importanceWeight
   *   score = base + boost + importanceBonus
   *
   * @param effectiveHalfLifeMs - caller-computed half-life (may include context multiplier)
   */
  calculateScore(
    ageMs: number,
    accessCount: number,
    importance: number,
    effectiveHalfLifeMs = this.semanticHalfLifeMs,
  ): number {
    // Exponential decay: halves every effectiveHalfLifeMs
    const base = Math.pow(2, -(ageMs / effectiveHalfLifeMs));

    // Linear access boost with cap (replaces sqrt — avoids runaway scores on heavily accessed memories)
    const boost = Math.min(accessCount * this.accessBoost, 0.5);

    // Importance bonus (normalized 0-10 → 0-1, then weighted)
    const importanceBonus = (Math.min(importance, 10) / 10) * this.importanceWeight;

    return Math.max(0, base + boost + importanceBonus);
  }

  /**
   * Phase 4: Context-aware decay multiplier.
   * Memories matching the active project decay slower (half-life extended).
   */
  getContextMultiplier(
    category: string | null,
    metadataJson: string | null,
    activeProjectName?: string,
  ): number {
    if (!activeProjectName) return 1.0;
    if (category === activeProjectName) return 1.5;
    try {
      const meta: Record<string, unknown> = metadataJson ? JSON.parse(metadataJson) : {};
      if (meta['project'] === activeProjectName) return 1.3;
    } catch {
      /* non-critical */
    }
    return 1.0;
  }

  /**
   * Score all semantic memories and return sorted by decay score.
   * Phase 4: applies dual-layer half-lives and context-aware multiplier.
   */
  scoreAll(db: Database.Database, activeProjectName?: string): DecayScore[] {
    const now = Date.now();

    const rows = db
      .prepare(
        `
      SELECT id, text, category, importance, created, metadata,
             COALESCE(last_accessed, created) as last_accessed,
             COALESCE(access_count, 0) as access_count
      FROM semantic_memory
      ORDER BY created ASC
    `,
      )
      .all() as Array<{
      id: number;
      text: string;
      category: string | null;
      importance: number;
      created: number;
      last_accessed: number;
      access_count: number;
      metadata: string | null;
    }>;

    const scores: DecayScore[] = rows.map((row) => {
      const ageMs = now - row.last_accessed;
      const contextMultiplier = this.getContextMultiplier(
        row.category,
        row.metadata,
        activeProjectName,
      );
      const effectiveHalfLife = this.semanticHalfLifeMs * contextMultiplier;
      const score = this.calculateScore(ageMs, row.access_count, row.importance, effectiveHalfLife);

      return {
        id: row.id,
        text: row.text,
        score: Math.round(score * 1000) / 1000,
        ageMs,
        accessCount: row.access_count,
        importance: row.importance,
        category: row.category,
      };
    });

    // Sort by score ascending (lowest = most decayed)
    scores.sort((a, b) => a.score - b.score);
    return scores;
  }

  /**
   * Archive (soft-delete) memories below the decay threshold.
   * Moves to an archive table instead of hard delete for safety.
   */
  archiveDecayed(db: Database.Database, dryRun = false): DecayResult {
    // Ensure archive table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS semantic_memory_archive (
        id INTEGER PRIMARY KEY,
        text TEXT NOT NULL,
        embedding BLOB,
        category TEXT,
        importance INTEGER DEFAULT 5,
        created INTEGER,
        access_count INTEGER DEFAULT 0,
        last_accessed INTEGER,
        metadata TEXT,
        archived_at INTEGER NOT NULL,
        decay_score REAL NOT NULL
      )
    `);

    const allScores = this.scoreAll(db, undefined);
    const belowThreshold = allScores.filter((s) => s.score < this.archiveThreshold);

    if (!dryRun && belowThreshold.length > 0) {
      const archiveStmt = db.prepare(`
        INSERT INTO semantic_memory_archive
          (id, text, embedding, category, importance, created, access_count, last_accessed, metadata, archived_at, decay_score)
        SELECT id, text, embedding, category, importance, created, access_count, last_accessed, metadata, ?, ?
        FROM semantic_memory WHERE id = ?
      `);

      const deleteStmt = db.prepare('DELETE FROM semantic_memory WHERE id = ?');

      const archiveAll = db.transaction((items: DecayScore[]) => {
        const now = Date.now();
        for (const item of items) {
          archiveStmt.run(now, item.score, item.id);
          deleteStmt.run(item.id);
        }
      });

      archiveAll(belowThreshold);
    }

    return {
      archived: belowThreshold.length,
      remaining: allScores.length - belowThreshold.length,
      scores: allScores,
    };
  }

  /**
   * Preview archival without applying (dry run)
   */
  previewArchival(db: Database.Database): DecayResult {
    return this.archiveDecayed(db, true);
  }

  /**
   * Restore a previously archived memory back to active
   */
  restoreFromArchive(db: Database.Database, id: number): boolean {
    const archived = db.prepare('SELECT * FROM semantic_memory_archive WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!archived) return false;

    const restore = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO semantic_memory (id, text, embedding, category, importance, created, access_count, last_accessed, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        archived.id,
        archived.text,
        archived.embedding,
        archived.category,
        archived.importance,
        archived.created,
        archived.access_count,
        Date.now(), // Reset last_accessed to now
        archived.metadata,
      );
      db.prepare('DELETE FROM semantic_memory_archive WHERE id = ?').run(id);
    });

    restore();
    return true;
  }

  /**
   * SM-2 inspired retention score.
   * Combines spaced repetition easiness factor with access intervals.
   * Higher score = better retained, should decay slower.
   */
  calculateRetention(
    accessCount: number,
    lastIntervalMs: number,
    importance: number,
  ): number {
    // SM-2: EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
    // We map importance (1-10) to quality (0-5)
    const quality = Math.min(importance / 2, 5);
    const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    const ef = Math.max(1.3, this.easinessFactor + efDelta);

    // Interval scaling: more accesses = longer effective half-life
    const intervalFactor = Math.min(accessCount, 10) / 10;
    const adjustedHalfLife = this.semanticHalfLifeMs * ef * (1 + intervalFactor);

    // Decay from last interval
    const base = Math.pow(2, -(lastIntervalMs / adjustedHalfLife));
    return Math.max(0, Math.min(1, base));
  }

  /**
   * Start scheduled decay runs.
   * Automatically archives decayed memories at the configured interval.
   */
  startScheduled(db: Database.Database, onRun?: (result: DecayResult) => void): void {
    if (this.scheduledTimer) return; // Already running
    if (this.scheduledIntervalMs <= 0) return; // Disabled

    this.scheduledTimer = setInterval(() => {
      const result = this.archiveDecayed(db);
      onRun?.(result);
    }, this.scheduledIntervalMs);

    // Don't prevent process exit
    if (this.scheduledTimer && typeof this.scheduledTimer === 'object' && 'unref' in this.scheduledTimer) {
      this.scheduledTimer.unref();
    }
  }

  /**
   * Stop scheduled decay runs
   */
  stopScheduled(): void {
    if (this.scheduledTimer) {
      clearInterval(this.scheduledTimer);
      this.scheduledTimer = null;
    }
  }

  /**
   * Compact archived memories: group by category and keep summaries.
   * Reduces archive table size by merging old archived entries.
   */
  compactArchive(db: Database.Database, olderThanMs: number = 30 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - olderThanMs;

    try {
      const oldArchived = db.prepare(
        'SELECT id FROM semantic_memory_archive WHERE archived_at < ?',
      ).all(cutoff) as Array<{ id: number }>;

      if (oldArchived.length === 0) return 0;

      const deleteStmt = db.prepare('DELETE FROM semantic_memory_archive WHERE id = ?');
      const deleteAll = db.transaction((ids: number[]) => {
        for (const id of ids) {
          deleteStmt.run(id);
        }
      });

      deleteAll(oldArchived.map((r) => r.id));
      return oldArchived.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get decay statistics.
   * Phase 4: accepts activeProjectName to apply context multiplier in scoring;
   * reports episodic and semantic archive counts separately.
   */
  getStats(
    db: Database.Database,
    activeProjectName?: string,
  ): {
    total: number;
    belowThreshold: number;
    averageScore: number;
    archivedCount: number;
    semanticArchivedCount: number;
    episodicCount: number;
    scheduledRunning: boolean;
    episodicHalfLifeDays: number;
    semanticHalfLifeDays: number;
  } {
    const scores = this.scoreAll(db, activeProjectName);
    const belowThreshold = scores.filter((s) => s.score < this.archiveThreshold);
    const avgScore =
      scores.length > 0 ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : 0;

    let semanticArchivedCount = 0;
    try {
      const row = db.prepare('SELECT COUNT(*) as count FROM semantic_memory_archive').get() as
        | { count: number }
        | undefined;
      semanticArchivedCount = row?.count ?? 0;
    } catch {
      // Archive table might not exist yet
    }

    let episodicCount = 0;
    try {
      const row = db.prepare('SELECT COUNT(*) as count FROM episodic_memory').get() as
        | { count: number }
        | undefined;
      episodicCount = row?.count ?? 0;
    } catch {
      /* non-critical */
    }

    return {
      total: scores.length,
      belowThreshold: belowThreshold.length,
      averageScore: Math.round(avgScore * 1000) / 1000,
      archivedCount: semanticArchivedCount,
      semanticArchivedCount,
      episodicCount,
      scheduledRunning: this.scheduledTimer !== null,
      episodicHalfLifeDays: Math.round(this.episodicHalfLifeMs / (24 * 3600 * 1000) * 10) / 10,
      semanticHalfLifeDays: Math.round(this.semanticHalfLifeMs / (24 * 3600 * 1000) * 10) / 10,
    };
  }
}
