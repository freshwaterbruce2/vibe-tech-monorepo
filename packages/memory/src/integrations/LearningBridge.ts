/**
 * Learning System Bridge
 * Bridges @vibetech/memory with the canonical learning DB (D:\databases\agent_learning.db)
 * Reads agent executions, patterns, and mistakes to provide memory-backed context.
 * Writes discovered patterns back for bidirectional sync.
 */

import Database from 'better-sqlite3';
import type { MemoryManager } from '../core/MemoryManager.js';

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

const DEFAULT_LEARNING_DB = 'D:\\databases\\agent_learning.db';

export class LearningBridge {
  private learningDb: Database.Database | null = null;
  private writableDb: Database.Database | null = null;

  constructor(
    private memory: MemoryManager,
    private learningDbPath: string = DEFAULT_LEARNING_DB,
  ) {}

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
      console.error('[LearningBridge] writeBackPattern failed:', err);
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
      console.error('[LearningBridge] recordExecution failed:', err);
      return false;
    }
  }
}
