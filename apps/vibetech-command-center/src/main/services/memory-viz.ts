import Database from 'better-sqlite3';

export interface MemoryVizOptions {
  dbPath: string;
}

const SEMANTIC_HALF_LIFE_MS = 11 * 24 * 60 * 60 * 1000;
const RECENT_MEMORY_LIMIT = 100;
const DECAY_PREVIEW_LIMIT = 500;

export class MemoryVizService {
  private db: Database.Database | null = null;

  constructor(private opts: MemoryVizOptions) {}

  private getDb(): Database.Database | null {
    if (this.db) return this.db;
    try {
      const db = new Database(this.opts.dbPath, { readonly: true, fileMustExist: true });
      db.pragma('query_only = ON');
      this.db = db;
      return db;
    } catch {
      return null;
    }
  }

  getSnapshot(): unknown {
    const db = this.getDb();
    if (!db) {
      return {
        stats: [
          { store: 'episodic', recordCount: 0 },
          { store: 'semantic', recordCount: 0 },
          { store: 'procedural', recordCount: 0 },
        ],
        recentEpisodic: [],
        recentSemantic: [],
        recentProcedural: [],
        decayItems: [],
        consolidationStatus: { lastRunAt: null, itemsSummarized: 0, itemsPruned: 0 },
        generatedAt: Date.now(),
      };
    }

    const episodicCount = (db.prepare('SELECT COUNT(*) as count FROM episodic_memory').get() as { count: number }).count;
    const semanticCount = (db.prepare('SELECT COUNT(*) as count FROM semantic_memory').get() as { count: number }).count;
    const proceduralCount = (db.prepare('SELECT COUNT(*) as count FROM procedural_memory').get() as { count: number }).count;

    let embeddingDim = 0;
    try {
      const row = db.prepare('SELECT embedding FROM semantic_memory WHERE embedding IS NOT NULL LIMIT 1').get() as { embedding: Buffer } | undefined;
      if (row) embeddingDim = row.embedding.byteLength / 4;
    } catch { /* ignore */ }

    let lastRunAt: number | null = null;
    let itemsSummarized = 0;
    let itemsPruned = 0;
    try {
      const logRow = db.prepare('SELECT MAX(created_at) as lastRun FROM consolidation_log').get() as { lastRun: number } | undefined;
      if (logRow?.lastRun) lastRunAt = logRow.lastRun;
      itemsSummarized = (db.prepare("SELECT COUNT(*) as count FROM consolidation_log WHERE action = 'merge'").get() as { count: number }).count;
      itemsPruned = (db.prepare("SELECT COUNT(*) as count FROM consolidation_log WHERE action = 'prune'").get() as { count: number } | { count: 0 }).count;
    } catch { /* ignore */ }

    const recentEpisodic = db.prepare(`
      SELECT id, source_id as sourceId, timestamp, query, response, session_id as sessionId
      FROM episodic_memory ORDER BY timestamp DESC LIMIT ?
    `).all(RECENT_MEMORY_LIMIT) as Array<{ id: number; sourceId: string; timestamp: number; query: string; response: string; sessionId?: string }>;

    const recentSemantic = db.prepare(`
      SELECT id, text, category, importance, created, last_accessed as lastAccessed, access_count as accessCount
      FROM semantic_memory ORDER BY created DESC LIMIT ?
    `).all(RECENT_MEMORY_LIMIT) as Array<{ id: number; text: string; category?: string; importance: number; created: number; lastAccessed?: number; accessCount: number }>;

    const recentProcedural = db.prepare(`
      SELECT id, pattern, context, frequency, success_rate as successRate, last_used as lastUsed
      FROM procedural_memory ORDER BY frequency DESC LIMIT ?
    `).all(RECENT_MEMORY_LIMIT) as Array<{ id: number; pattern: string; context: string; frequency: number; successRate: number; lastUsed?: number }>;

    const decayItems = this.computeDecay();

    return {
      stats: [
        { store: 'episodic', recordCount: episodicCount },
        { store: 'semantic', recordCount: semanticCount, avgEmbeddingDim: embeddingDim || undefined },
        { store: 'procedural', recordCount: proceduralCount },
      ],
      recentEpisodic,
      recentSemantic,
      recentProcedural,
      decayItems,
      consolidationStatus: { lastRunAt, itemsSummarized, itemsPruned },
      generatedAt: Date.now(),
    };
  }

  search(query: string, topK = 10): unknown[] {
    const db = this.getDb();
    if (!db) return [];

    const pattern = `%${query}%`;
    const results: Array<{ source: string; score: number; text: string; metadata?: Record<string, unknown> }> = [];

    try {
      const rows = db.prepare(`
        SELECT id, query, response, timestamp, CASE WHEN query LIKE ? THEN 1.0 ELSE 0.8 END as score
        FROM episodic_memory WHERE query LIKE ? OR response LIKE ? ORDER BY score DESC, timestamp DESC LIMIT ?
      `).all(pattern, pattern, pattern, topK) as Array<{ query: string; response: string; score: number }>;
      for (const r of rows) results.push({ source: 'episodic', score: r.score, text: `Q: ${r.query}\nA: ${r.response}` });
    } catch { /* ignore */ }

    try {
      const rows = db.prepare(`
        SELECT id, text, category, importance, CASE WHEN text LIKE ? THEN 1.0 ELSE 0.6 END as score
        FROM semantic_memory WHERE text LIKE ? ORDER BY score DESC, importance DESC LIMIT ?
      `).all(pattern, pattern, topK) as Array<{ text: string; score: number; category: string | null; importance: number }>;
      for (const r of rows) results.push({ source: 'semantic', score: r.score, text: r.text, metadata: { category: r.category, importance: r.importance } });
    } catch { /* ignore */ }

    try {
      const rows = db.prepare(`
        SELECT id, pattern, context, frequency, success_rate as successRate, CASE WHEN pattern LIKE ? THEN 1.0 ELSE 0.7 END as score
        FROM procedural_memory WHERE pattern LIKE ? OR context LIKE ? ORDER BY score DESC, frequency DESC LIMIT ?
      `).all(pattern, pattern, pattern, topK) as Array<{ pattern: string; context: string; score: number }>;
      for (const r of rows) results.push({ source: 'procedural', score: r.score, text: `${r.pattern}: ${r.context}` });
    } catch { /* ignore */ }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  computeDecay(): unknown[] {
    const db = this.getDb();
    if (!db) return [];

    const now = Date.now();
    const rows = db.prepare(`
      SELECT id, text, category, importance, created,
        COALESCE(last_accessed, created) as last_accessed,
        COALESCE(access_count, 0) as access_count
      FROM semantic_memory ORDER BY last_accessed ASC, created ASC LIMIT ?
    `).all(DECAY_PREVIEW_LIMIT) as Array<{ id: number; text: string; category: string | null; importance: number; created: number; last_accessed: number; access_count: number }>;

    const scores = rows.map((row) => {
      const ageMs = now - row.last_accessed;
      const base = Math.pow(2, -(ageMs / SEMANTIC_HALF_LIFE_MS));
      const boost = Math.min(row.access_count * 0.1, 0.5);
      const importanceBonus = (Math.min(row.importance, 10) / 10) * 0.2;
      const score = Math.max(0, base + boost + importanceBonus);
      const action: string = score < 0.2 ? 'prune' : score < 0.5 ? 'summarize' : 'keep';
      return {
        memoryId: row.id,
        textPreview: row.text,
        decayScore: Math.round(score * 1000) / 1000,
        recommendedAction: action,
        ageMs,
        accessCount: row.access_count,
        importance: row.importance,
        category: row.category,
      };
    });

    scores.sort((a, b) => a.decayScore - b.decayScore);
    return scores;
  }

  triggerConsolidation(): { success: boolean; message: string } {
    const db = this.getDb();
    if (!db) return { success: false, message: 'Database not available' };

    try {
      const decayItems = this.computeDecay() as Array<{ recommendedAction?: string }>;
      const keep = decayItems.filter((item) => item.recommendedAction === 'keep').length;
      const summarize = decayItems.filter((item) => item.recommendedAction === 'summarize').length;
      const prune = decayItems.filter((item) => item.recommendedAction === 'prune').length;

      return {
        success: true,
        message: `Read-only preview complete: ${keep} keep, ${summarize} summarize, ${prune} prune. No database changes were made.`,
      };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : 'Preview failed' };
    }
  }
}
