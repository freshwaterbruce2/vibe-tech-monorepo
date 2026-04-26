/**
 * Learning System Bridge
 * Bridges @vibetech/memory with the canonical learning DB (D:\databases\agent_learning.db)
 * Reads agent executions, patterns, and mistakes to provide memory-backed context.
 * Writes discovered patterns back for bidirectional sync.
 */

import Database from 'better-sqlite3';
import { createLogger } from '@vibetech/logger';
import type { MemoryManager } from '../core/MemoryManager.js';
import type { EmbeddingService } from '../embeddings/EmbeddingService.js';
import { cosineSimilarity } from '../utils/math.js';

const logger = createLogger('LearningBridge');

/** Raw row from agent_executions table (agent_learning.db schema) */
interface ExecutionRow {
  execution_id: string;
  agent_id: string;
  project_name: string;
  task_type: string;
  context: string | null;
  tools_used: string;
  execution_time_ms: number;
  success: number;
  error_message: string | null;
  started_at: string;
}

/** Raw row from success_patterns table */
interface PatternRow {
  id: number;
  pattern_type: string;
  description: string;
  frequency: number;
  confidence_score: number;
  created_at: string;
  last_used: string | null;
  metadata: string | null;
}

/** Raw row from agent_mistakes table (agent_learning.db schema) */
interface MistakeRow {
  id: number;
  mistake_type: string;
  description: string;
  impact_severity: string;
  prevention_strategy: string | null;
  identified_at: string;
}

/** Agent context combining all learning sources */
export interface AgentContext {
  agent: string;
  recentExecutions: Array<{
    taskType: string;
    description: string;
    success: boolean;
    executionTime: number;
    timestamp: string;
  }>;
  knownPatterns: Array<{
    type: string;
    description: string;
    confidence: number;
    frequency: number;
  }>;
  knownMistakes: Array<{
    type: string;
    description: string;
    severity: string;
    remediation?: string;
  }>;
  stats: {
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
  };
}

/** Sync result for tracking what was ingested */
export interface SyncResult {
  executionsIngested: number;
  patternsIngested: number;
  mistakesIngested: number;
  errors: string[];
}

/** Result from embedding-aware procedural pattern search */
export interface ProceduralSearchResult {
  id: string;
  text: string;
  patternType: string;
  source: 'success_pattern' | 'code_pattern';
  frequency: number;
  successRate: number;
  similarity: number;
  /** Combined ranking score (cosine × success-weight × log-frequency) */
  score: number;
  lastUsed: string | null;
  metadata?: Record<string, unknown>;
}

/** Cached embedding payload stored inside the metadata JSON column */
interface CachedEmbedding {
  embedding_b64: string;
  embedding_model: string;
  embedding_dim: number;
}

const DEFAULT_LEARNING_DB = 'D:\\databases\\agent_learning.db';

/** Decode a Base64 string into a number[] vector */
function decodeEmbedding(b64: string): number[] {
  const buf = Buffer.from(b64, 'base64');
  return Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4));
}

/** Encode a number[] vector as Base64 (Float32) for compact JSON storage */
function encodeEmbedding(vec: number[]): string {
  return Buffer.from(new Float32Array(vec).buffer).toString('base64');
}

/** Extract a cached embedding from metadata JSON, validating model + dimension */
function readCachedEmbedding(
  metadata: Record<string, unknown> | null,
  expectedModel: string,
  expectedDim: number,
): number[] | null {
  if (!metadata) return null;
  const b64 = metadata['embedding_b64'];
  const model = metadata['embedding_model'];
  const dim = metadata['embedding_dim'];
  if (typeof b64 !== 'string' || typeof model !== 'string' || typeof dim !== 'number') {
    return null;
  }
  if (model !== expectedModel || dim !== expectedDim) return null;
  try {
    const vec = decodeEmbedding(b64);
    if (vec.length !== expectedDim) return null;
    return vec;
  } catch {
    return null;
  }
}

export class LearningBridge {
  private learningDb: Database.Database | null = null;
  private writableDb: Database.Database | null = null;

  constructor(
    private memory: MemoryManager,
    private learningDbPath: string = DEFAULT_LEARNING_DB,
    private embedder: EmbeddingService | null = null,
  ) {}

  /** Inject or replace the embedder used for procedural search */
  setEmbedder(embedder: EmbeddingService): void {
    this.embedder = embedder;
  }

  /** Open a read-only connection to the learning system database */
  private getDb(): Database.Database {
    this.learningDb ??= new Database(this.learningDbPath, { readonly: true });
    return this.learningDb;
  }

  /** Open a writable connection (lazy, separate from read path) */
  private getWritableDb(): Database.Database {
    if (!this.writableDb) {
      this.writableDb = new Database(this.learningDbPath);
      this.writableDb.pragma('journal_mode = WAL');
      this.writableDb.pragma('busy_timeout = 5000');
    }
    return this.writableDb;
  }

  /** Close all database connections */
  close(): void {
    this.learningDb?.close();
    this.learningDb = null;
    this.writableDb?.close();
    this.writableDb = null;
  }

  /**
   * Ingest agent executions as episodic memories
   * Each execution becomes a queryable memory of what happened
   */
  async ingestExecutions(limit = 100, sinceTimestamp?: string): Promise<number> {
    const db = this.getDb();

    let query = `
      SELECT execution_id, agent_id, project_name, task_type, context,
             tools_used, execution_time_ms, success, error_message, started_at
      FROM agent_executions
    `;
    const params: (string | number)[] = [];

    if (sinceTimestamp) {
      query += ' WHERE started_at > ?';
      params.push(sinceTimestamp);
    }

    query += ' ORDER BY started_at DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(query).all(...params) as ExecutionRow[];

    const memories = rows.map((row) => ({
      sourceId: `learning-system-${row.agent_id}`,
      query: `[${row.agent_id}] ${row.task_type}: ${row.context ?? ''}`,
      response: [
        `Tools: ${row.tools_used}`,
        `Result: ${row.success ? 'SUCCESS' : 'FAILED'}`,
        row.error_message ? `Error: ${row.error_message}` : '',
        `Time: ${row.execution_time_ms != null ? (row.execution_time_ms / 1000).toFixed(2) : 'N/A'}s`,
      ]
        .filter(Boolean)
        .join('\n'),
      timestamp: new Date(row.started_at).getTime(),
      metadata: {
        source: 'learning-system',
        type: 'agent-execution',
        agentName: row.agent_id,
        projectName: row.project_name,
        success: Boolean(row.success),
        learningId: row.execution_id,
      },
    }));

    if (memories.length > 0) {
      this.memory.episodic.addMany(memories);
    }

    return memories.length;
  }

  /**
   * Ingest success patterns as semantic memories
   * These represent proven approaches that should be remembered
   */
  async ingestPatterns(limit = 50): Promise<number> {
    const db = this.getDb();

    const rows = db
      .prepare(
        `SELECT id, pattern_type, description, frequency, confidence_score,
                created_at, last_used, metadata
         FROM success_patterns
         ORDER BY confidence_score DESC
         LIMIT ?`,
      )
      .all(limit) as PatternRow[];

    let count = 0;
    for (const row of rows) {
      await this.memory.semantic.add({
        text: `[Pattern: ${row.pattern_type}] ${row.description}`,
        category: 'learning-pattern',
        importance: Math.round(row.confidence_score * 10),
        metadata: {
          source: 'learning-system',
          type: 'success-pattern',
          patternType: row.pattern_type,
          frequency: row.frequency,
          confidence: row.confidence_score,
          learningId: row.id,
          ...(row.metadata ? JSON.parse(row.metadata) : {}),
        },
      });
      count++;
    }

    return count;
  }

  /**
   * Ingest agent mistakes as procedural memories
   * These represent anti-patterns to avoid
   */
  async ingestMistakes(limit = 50): Promise<number> {
    const db = this.getDb();

    const rows = db
      .prepare(
        `SELECT id, mistake_type, description, impact_severity,
                prevention_strategy, identified_at
         FROM agent_mistakes
         ORDER BY identified_at DESC
         LIMIT ?`,
      )
      .all(limit) as MistakeRow[];

    let count = 0;
    for (const row of rows) {
      const remediation = row.prevention_strategy
        ? row.prevention_strategy.split('\n').filter(Boolean).join('; ')
        : `Avoid: ${row.description}`;

      this.memory.procedural.upsert({
        pattern: `avoid-${row.mistake_type}-${row.id}`,
        context: remediation,
        successRate: 0,
        metadata: {
          source: 'learning-system',
          type: 'agent-mistake',
          mistakeType: row.mistake_type,
          severity: row.impact_severity,
          learningId: row.id,
        },
      });
      count++;
    }

    return count;
  }

  /**
   * Get full context for a specific agent
   * Combines execution history, patterns, and mistakes
   */
  getAgentContext(agentName: string, limit = 10): AgentContext {
    const db = this.getDb();

    // Recent executions (agent_id is the agent name in agent_learning.db)
    const executions = db
      .prepare(
        `SELECT task_type, context, success, execution_time_ms, started_at
         FROM agent_executions
         WHERE agent_id = ?
         ORDER BY started_at DESC
         LIMIT ?`,
      )
      .all(agentName, limit) as Array<{
      task_type: string;
      context: string | null;
      success: number;
      execution_time_ms: number;
      started_at: string;
    }>;

    // Stats
    const stats = db
      .prepare(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes,
                AVG(execution_time_ms) as avg_time_ms
         FROM agent_executions
         WHERE agent_id = ?`,
      )
      .get(agentName) as { total: number; successes: number; avg_time_ms: number | null };

    // Patterns (global — not agent-specific)
    const patterns = db
      .prepare(
        `SELECT pattern_type, description, confidence_score, frequency
         FROM success_patterns
         ORDER BY confidence_score DESC
         LIMIT ?`,
      )
      .all(limit) as Array<{
      pattern_type: string;
      description: string;
      confidence_score: number;
      frequency: number;
    }>;

    // All mistakes (agent_learning.db mistakes are not agent-scoped)
    const mistakes = db
      .prepare(
        `SELECT mistake_type, description, impact_severity, prevention_strategy
         FROM agent_mistakes
         ORDER BY identified_at DESC
         LIMIT ?`,
      )
      .all(limit) as Array<{
      mistake_type: string;
      description: string;
      impact_severity: string;
      prevention_strategy: string | null;
    }>;

    return {
      agent: agentName,
      recentExecutions: executions.map((e) => ({
        taskType: e.task_type,
        description: e.context ?? '',
        success: Boolean(e.success),
        executionTime: e.execution_time_ms != null ? e.execution_time_ms / 1000 : 0,
        timestamp: e.started_at,
      })),
      knownPatterns: patterns.map((p) => ({
        type: p.pattern_type,
        description: p.description,
        confidence: p.confidence_score,
        frequency: p.frequency,
      })),
      knownMistakes: mistakes.map((m) => ({
        type: m.mistake_type,
        description: m.description,
        severity: m.impact_severity,
        remediation: m.prevention_strategy ?? undefined,
      })),
      stats: {
        totalExecutions: stats.total,
        successRate: stats.total > 0 ? stats.successes / stats.total : 0,
        avgExecutionTime: stats.avg_time_ms != null ? stats.avg_time_ms / 1000 : 0,
      },
    };
  }

  /**
   * One-call sync: ingest all learning data into the memory system
   */
  async syncFromLearningSystem(sinceTimestamp?: string): Promise<SyncResult> {
    const result: SyncResult = {
      executionsIngested: 0,
      patternsIngested: 0,
      mistakesIngested: 0,
      errors: [],
    };

    try {
      result.executionsIngested = await this.ingestExecutions(100, sinceTimestamp);
    } catch (err) {
      result.errors.push(`Executions: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      result.patternsIngested = await this.ingestPatterns();
    } catch (err) {
      result.errors.push(`Patterns: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      result.mistakesIngested = await this.ingestMistakes();
    } catch (err) {
      result.errors.push(`Mistakes: ${err instanceof Error ? err.message : String(err)}`);
    }

    return result;
  }

  /**
   * Ingest a self-healing report into the memory system.
   * Converts loop results into episodic memories (what happened)
   * and procedural memories (patterns for future healing decisions).
   *
   * @param reportPath - Absolute path to a self-healing JSON report
   * @returns Number of memories ingested
   */
  async ingestHealingResult(reportPath: string): Promise<{
    episodicCount: number;
    proceduralCount: number;
    errors: string[];
  }> {
    const fs = await import('node:fs/promises');
    const result = { episodicCount: 0, proceduralCount: 0, errors: [] as string[] };

    let report: {
      timestamp: string;
      summary: {
        overall_status: string;
        total_issues_found: number;
        total_issues_fixed: number;
        total_duration_seconds: number;
        loops_run: number;
      };
      loops: Array<{
        loop_name: string;
        status: string;
        started_at: string;
        duration_seconds: number;
        projects_scanned: number;
        issues_found: number;
        issues_fixed: number;
        errors: string[];
        details: Array<Record<string, unknown>>;
      }>;
    };

    try {
      const raw = await fs.readFile(reportPath, 'utf-8');
      report = JSON.parse(raw);
    } catch (err) {
      result.errors.push(
        `Failed to read report: ${err instanceof Error ? err.message : String(err)}`,
      );
      return result;
    }

    // Episodic: one memory per loop execution (what happened)
    for (const loop of report.loops) {
      try {
        this.memory.episodic.addMany([
          {
            sourceId: `self-healing-${loop.loop_name}`,
            query: `[self-healing] ${loop.loop_name} loop: ${loop.status}`,
            response: [
              `Status: ${loop.status}`,
              `Projects scanned: ${loop.projects_scanned}`,
              `Issues found: ${loop.issues_found}, fixed: ${loop.issues_fixed}`,
              `Duration: ${loop.duration_seconds.toFixed(2)}s`,
              loop.errors.length > 0 ? `Errors: ${loop.errors.join('; ')}` : '',
            ]
              .filter(Boolean)
              .join('\n'),
            timestamp: new Date(loop.started_at).getTime(),
            metadata: {
              source: 'self-healing',
              type: 'healing-loop-result',
              loopName: loop.loop_name,
              status: loop.status,
              issuesFound: loop.issues_found,
              issuesFixed: loop.issues_fixed,
            },
          },
        ]);
        result.episodicCount++;
      } catch (err) {
        result.errors.push(
          `Episodic ${loop.loop_name}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Procedural: extract patterns from loops with issues
    for (const loop of report.loops) {
      if (loop.issues_found === 0) continue;

      try {
        const fixRate = loop.issues_found > 0 ? loop.issues_fixed / loop.issues_found : 0;

        this.memory.procedural.upsert({
          pattern: `healing-${loop.loop_name}-trend`,
          context: [
            `${loop.loop_name} loop found ${loop.issues_found} issues (fixed ${loop.issues_fixed}).`,
            `Fix rate: ${(fixRate * 100).toFixed(0)}%.`,
            `Avg scan: ${loop.duration_seconds.toFixed(1)}s across ${loop.projects_scanned} projects.`,
          ].join(' '),
          successRate: fixRate,
          metadata: {
            source: 'self-healing',
            type: 'healing-pattern',
            loopName: loop.loop_name,
            lastRun: loop.started_at,
          },
        });
        result.proceduralCount++;
      } catch (err) {
        result.errors.push(
          `Procedural ${loop.loop_name}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return result;
  }

  /**
   * Health check: verify learning database is accessible and has data
   */
  healthCheck(): {
    healthy: boolean;
    tables: Record<string, number>;
    errors: string[];
  } {
    const errors: string[] = [];
    const tables: Record<string, number> = {};

    try {
      const db = this.getDb();

      for (const table of ['agent_executions', 'agent_mistakes', 'success_patterns']) {
        try {
          const row = db.prepare(`SELECT COUNT(*) as c FROM [${table}]`).get() as { c: number };
          tables[table] = row.c;
        } catch {
          errors.push(`Table ${table} not found`);
          tables[table] = -1;
        }
      }
    } catch (err) {
      errors.push(`DB connection failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    return {
      healthy: errors.length === 0,
      tables,
      errors,
    };
  }

  /**
   * Write a discovered pattern back to the learning database.
   * Upserts by pattern_type + description to avoid duplicates.
   */
  writeBackPattern(pattern: {
    type: string;
    description: string;
    confidence: number;
    metadata?: Record<string, unknown>;
  }): boolean {
    try {
      const db = this.getWritableDb();
      const existing = db
        .prepare(
          `SELECT id, frequency FROM success_patterns
           WHERE pattern_type = ? AND description = ?`,
        )
        .get(pattern.type, pattern.description) as
        | { id: number; frequency: number }
        | undefined;

      if (existing) {
        db.prepare(
          `UPDATE success_patterns
           SET frequency = ?, confidence_score = ?, last_used = datetime('now'),
               metadata = COALESCE(?, metadata)
           WHERE id = ?`,
        ).run(
          existing.frequency + 1,
          pattern.confidence,
          pattern.metadata ? JSON.stringify(pattern.metadata) : null,
          existing.id,
        );
      } else {
        db.prepare(
          `INSERT INTO success_patterns (pattern_type, description, frequency, confidence_score, last_used, metadata)
           VALUES (?, ?, 1, ?, datetime('now'), ?)`,
        ).run(
          pattern.type,
          pattern.description,
          pattern.confidence,
          pattern.metadata ? JSON.stringify(pattern.metadata) : null,
        );
      }
      return true;
    } catch (err) {
      logger.error('[LearningBridge] writeBackPattern failed:', undefined, err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  /**
   * Record an agent execution in the learning database.
   */
  recordExecution(execution: {
    agentId: string;
    projectName?: string;
    taskType: string;
    toolsUsed?: string;
    success: boolean;
    executionTimeMs?: number;
    errorMessage?: string;
    context?: string;
  }): boolean {
    try {
      const db = this.getWritableDb();
      const executionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      db.prepare(
        `INSERT INTO agent_executions
         (execution_id, agent_id, project_name, task_type, tools_used,
          started_at, success, execution_time_ms, error_message, context)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)`,
      ).run(
        executionId,
        execution.agentId,
        execution.projectName ?? null,
        execution.taskType,
        execution.toolsUsed ?? null,
        execution.success ? 1 : 0,
        execution.executionTimeMs ?? null,
        execution.errorMessage ?? null,
        execution.context ?? null,
      );
      return true;
    } catch (err) {
      logger.error('[LearningBridge] recordExecution failed:', undefined, err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  /**
   * Embedding-aware procedural search across success_patterns and code_patterns.
   *
   * Strategy:
   * 1. Embed the query once.
   * 2. Pull a candidate window (5 × limit, capped) ordered by intrinsic priority
   *    (confidence × frequency for success_patterns, usage_count for code_patterns).
   *    This keeps work bounded — we never embed all 19,976+ patterns in one call.
   * 3. For each candidate, decode a cached embedding from `metadata.embedding_b64`
   *    if present and model+dim match. Otherwise embed the pattern text on the fly
   *    and persist the embedding back into the metadata JSON for future calls.
   * 4. Rank by combined score: cosine × success-weight × log-frequency.
   *
   * @throws if no embedder is configured (set one via constructor or setEmbedder)
   */
  async searchProceduralPatterns(
    query: string,
    limit = 10,
  ): Promise<ProceduralSearchResult[]> {
    if (!this.embedder) {
      throw new Error(
        'LearningBridge.searchProceduralPatterns requires an EmbeddingService. ' +
          'Pass one via the constructor or call setEmbedder().',
      );
    }
    const embedder = this.embedder;
    const expectedModel = embedder.getModel();
    const expectedDim = embedder.getDimension();

    const queryVector = await embedder.embed(query);
    if (queryVector.length !== expectedDim) {
      throw new Error(
        `Query embedding dimension ${queryVector.length} does not match embedder ${expectedDim}`,
      );
    }

    // Cap candidate window — keep work bounded regardless of table size
    const candidateWindow = Math.max(limit * 5, 25);

    const successCandidates = this.fetchSuccessPatternCandidates(candidateWindow);
    const codeCandidates = this.fetchCodePatternCandidates(candidateWindow);

    const scored: ProceduralSearchResult[] = [];

    for (const row of successCandidates) {
      const text = `[${row.pattern_type}] ${row.description}`;
      const meta = parseMetadataJson(row.metadata);
      const embedding = await this.getOrComputeSuccessPatternEmbedding(
        row.id,
        text,
        meta,
        expectedModel,
        expectedDim,
      );
      if (!embedding) continue;
      const similarity = cosineSimilarity(queryVector, embedding);
      // Combined score: cosine × success-weight × log-frequency.
      // Favors patterns that are relevant AND historically successful AND frequently used.
      const score =
        similarity * (0.5 + 0.5 * row.confidence_score) * Math.log(1 + row.frequency);
      scored.push({
        id: `success:${row.id}`,
        text,
        patternType: row.pattern_type,
        source: 'success_pattern',
        frequency: row.frequency,
        successRate: row.confidence_score,
        similarity,
        score,
        lastUsed: row.last_used,
        metadata: meta ?? undefined,
      });
    }

    for (const row of codeCandidates) {
      const text = `[${row.pattern_type}] ${row.name} (${row.language}): ${row.code_snippet}`;
      const embedding = await this.getOrComputeCodePatternEmbedding(
        row.id,
        text,
        row.cached_embedding,
        expectedModel,
        expectedDim,
      );
      if (!embedding) continue;
      const similarity = cosineSimilarity(queryVector, embedding);
      // code_patterns has no confidence column; treat usage_count as an implicit success signal
      const usage = row.usage_count ?? 0;
      const score = similarity * (0.5 + 0.5 * Math.min(1, usage / 10)) * Math.log(1 + usage);
      scored.push({
        id: `code:${row.id}`,
        text,
        patternType: row.pattern_type,
        source: 'code_pattern',
        frequency: usage,
        successRate: Math.min(1, usage / 10),
        similarity,
        score,
        lastUsed: row.last_used != null ? new Date(row.last_used).toISOString() : null,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /** Fetch candidate success patterns ordered by intrinsic priority */
  private fetchSuccessPatternCandidates(window: number): PatternRow[] {
    const db = this.getDb();
    return db
      .prepare(
        `SELECT id, pattern_type, description, frequency, confidence_score,
                created_at, last_used, metadata
         FROM success_patterns
         ORDER BY (confidence_score * (1 + frequency)) DESC
         LIMIT ?`,
      )
      .all(window) as PatternRow[];
  }

  /** Fetch candidate code patterns; cached_embedding lives in the tags JSON column */
  private fetchCodePatternCandidates(window: number): CodePatternRow[] {
    const db = this.getDb();
    // code_patterns has no `metadata` column — embeddings are stashed in `tags` JSON
    return db
      .prepare(
        `SELECT id, pattern_type, name, code_snippet, file_path, language,
                usage_count, last_used, tags
         FROM code_patterns
         ORDER BY usage_count DESC, last_used DESC
         LIMIT ?`,
      )
      .all(window)
      .map((r) => {
        const row = r as Omit<CodePatternRow, 'cached_embedding'> & { tags: string | null };
        return { ...row, cached_embedding: row.tags };
      }) as CodePatternRow[];
  }

  /**
   * Get embedding for a success_pattern row — from cached metadata or by computing now.
   * Computed embeddings are persisted back into the metadata JSON for reuse.
   */
  private async getOrComputeSuccessPatternEmbedding(
    id: number,
    text: string,
    metadata: Record<string, unknown> | null,
    expectedModel: string,
    expectedDim: number,
  ): Promise<number[] | null> {
    if (!this.embedder) return null;
    const cached = readCachedEmbedding(metadata, expectedModel, expectedDim);
    if (cached) return cached;

    let embedding: number[];
    try {
      embedding = await this.embedder.embed(text);
    } catch (err) {
      logger.warn(
        `[LearningBridge] embed failed for success_pattern ${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }

    // Persist back: merge into metadata JSON (best-effort, non-fatal on failure)
    try {
      const merged: CachedEmbedding & Record<string, unknown> = {
        ...(metadata ?? {}),
        embedding_b64: encodeEmbedding(embedding),
        embedding_model: expectedModel,
        embedding_dim: expectedDim,
      };
      const db = this.getWritableDb();
      db.prepare('UPDATE success_patterns SET metadata = ? WHERE id = ?').run(
        JSON.stringify(merged),
        id,
      );
    } catch (err) {
      logger.warn(
        `[LearningBridge] failed to persist embedding for success_pattern ${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return embedding;
  }

  /**
   * Get embedding for a code_pattern row — code_patterns has no metadata column,
   * so cached embeddings are stored inside the `tags` JSON column instead.
   */
  private async getOrComputeCodePatternEmbedding(
    id: number,
    text: string,
    rawTags: string | null,
    expectedModel: string,
    expectedDim: number,
  ): Promise<number[] | null> {
    if (!this.embedder) return null;
    const tagsObj = parseMetadataJson(rawTags);
    const cached = readCachedEmbedding(tagsObj, expectedModel, expectedDim);
    if (cached) return cached;

    let embedding: number[];
    try {
      embedding = await this.embedder.embed(text);
    } catch (err) {
      logger.warn(
        `[LearningBridge] embed failed for code_pattern ${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }

    try {
      const merged = {
        ...(tagsObj ?? {}),
        embedding_b64: encodeEmbedding(embedding),
        embedding_model: expectedModel,
        embedding_dim: expectedDim,
      };
      const db = this.getWritableDb();
      db.prepare('UPDATE code_patterns SET tags = ? WHERE id = ?').run(
        JSON.stringify(merged),
        id,
      );
    } catch (err) {
      logger.warn(
        `[LearningBridge] failed to persist embedding for code_pattern ${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return embedding;
  }
}

/** Internal: code_pattern row shape (cached_embedding aliases the tags column) */
interface CodePatternRow {
  id: number;
  pattern_type: string;
  name: string;
  code_snippet: string;
  file_path: string;
  language: string;
  usage_count: number | null;
  last_used: number | null;
  cached_embedding: string | null;
}

/** Safely parse a JSON metadata column; returns null on any failure */
function parseMetadataJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}
