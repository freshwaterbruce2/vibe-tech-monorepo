/**
 * AgentLearningRAG - Retrieval-Augmented Generation for Agent Learning
 *
 * Purpose: Query D:\databases\nova_shared.db for proven patterns and anti-patterns
 * Database: 59,014+ executions with success_patterns, failure_patterns, code_patterns
 *
 * Query Strategy:
 * 1. Find proven patterns (confidence ≥0.8, top 5 by success count)
 * 2. Find common failures to avoid (top 10 by occurrence count)
 * 3. Find reusable code snippets (top 10 by usage count)
 *
 * Created: 2026-01-15
 */

import Database from 'better-sqlite3';
import { existsSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createLogger } from '@vibetech/logger';

const logger = createLogger('AgentLearningRAG');

interface QueryPatternsOptions {
  agentName?: string;
  projectName?: string;
  taskType?: string;
  limit?: number;
  minConfidence?: number;
}

interface SuccessPattern {
  pattern_hash: string;
  task_type: string;
  project_name: string | null;
  tools_used: string;
  approach: string;
  success_count: number;
  confidence_score: number;
  avg_execution_time: number;
  last_used: string;
}

interface FailurePattern {
  pattern_hash: string;
  mistake_type: string;
  description: string;
  root_cause: string;
  prevention_strategy: string;
  occurrence_count: number;
  last_occurred: string;
}

interface CodePattern {
  name: string;
  code_snippet: string;
  language: string;
  pattern_type: string;
  file_path: string;
  usage_count: number;
}

interface QueryResult {
  successPatterns: SuccessPattern[];
  failurePatterns: FailurePattern[];
  codePatterns: CodePattern[];
  executionStats: {
    totalExecutions: number;
    avgExecutionTime: number;
    successRate: number;
  };
}

interface ExecutionStatsRow {
  total_executions: number | null;
  avg_time: number | null;
  success_rate: number | null;
}

interface CountRow {
  count: number;
}

export class AgentLearningRAG {
  private db: Database.Database;
  private readonly DB_PATH = process.env.NOVA_SHARED_DB_PATH ?? 'D:\\databases\\nova_shared.db';

  constructor(dbPath?: string) {
    const path = dbPath ?? this.DB_PATH;

    if (!existsSync(path)) {
      throw new Error(
        `Learning database not found: ${path}\nExpected nova_shared.db with 59k+ executions`
      );
    }

    this.db = new Database(path, { readonly: true });
    this.db.pragma('journal_mode = WAL');
  }

  /**
   * Query proven patterns for agent/project/task
   *
   * Returns top patterns by success count with confidence ≥ threshold
   */
  async queryPatterns(options: QueryPatternsOptions): Promise<SuccessPattern[]> {
    const {
      projectName,
      taskType,
      limit = 5,
      minConfidence = 0.8,
    } = options;

    const conditions: string[] = ['confidence_score >= ?'];
    const params: Array<string | number> = [minConfidence];

    if (taskType) {
      conditions.push('task_type = ?');
      params.push(taskType);
    }

    if (projectName) {
      conditions.push('(project_name = ? OR project_name IS NULL)');
      params.push(projectName);
    }

    // Note: agentName not in schema yet, filter by task_type as proxy
    // Future: Add agent_name column to success_patterns table

    params.push(limit);

    const query = `
      SELECT
        pattern_hash,
        task_type,
        project_name,
        tools_used,
        approach,
        success_count,
        confidence_score,
        avg_execution_time,
        last_used
      FROM success_patterns
      WHERE ${conditions.join(' AND ')}
      ORDER BY success_count DESC, confidence_score DESC
      LIMIT ?
    `;

    return this.db.prepare(query).all(...params) as SuccessPattern[];
  }

  /**
   * Query failure patterns to avoid
   *
   * Returns top mistakes by occurrence count
   */
  async queryFailures(options: {
    taskType?: string;
    limit?: number;
  }): Promise<FailurePattern[]> {
    const { taskType, limit = 10 } = options;

    let query = `
      SELECT
        pattern_hash,
        mistake_type,
        description,
        root_cause,
        prevention_strategy,
        occurrence_count,
        last_occurred
      FROM failure_patterns
    `;

    const params: Array<string | number> = [];

    if (taskType) {
      query += ' WHERE mistake_type LIKE ?';
      params.push(`${taskType}%`);
    }

    query += ' ORDER BY occurrence_count DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(query).all(...params) as FailurePattern[];
  }

  /**
   * Query reusable code patterns
   *
   * Returns top code snippets by usage count
   */
  async queryCodePatterns(options: {
    projectPath?: string;
    language?: string;
    patternType?: string;
    limit?: number;
  }): Promise<CodePattern[]> {
    const { projectPath, language, patternType, limit = 10 } = options;

    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (projectPath) {
      conditions.push('file_path LIKE ?');
      params.push(`${projectPath}%`);
    }

    if (language) {
      conditions.push('language = ?');
      params.push(language);
    }

    if (patternType) {
      conditions.push('pattern_type = ?');
      params.push(patternType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);

    const query = `
      SELECT
        name,
        code_snippet,
        language,
        pattern_type,
        file_path,
        usage_count
      FROM code_patterns
      ${whereClause}
      ORDER BY usage_count DESC
      LIMIT ?
    `;

    return this.db.prepare(query).all(...params) as CodePattern[];
  }

  /**
   * Get execution statistics for agent/project
   */
  async getExecutionStats(options: {
    agentName?: string;
    projectName?: string;
    taskType?: string;
    days?: number;
  }): Promise<{
    totalExecutions: number;
    avgExecutionTime: number;
    successRate: number;
  }> {
    const { taskType, days = 30 } = options;

    const conditions: string[] = [
      "executed_at > datetime('now', ? || ' days')",
    ];
    const params: Array<string | number> = [-days];

    if (taskType) {
      conditions.push('task_type = ?');
      params.push(taskType);
    }

    const query = `
      SELECT
        COUNT(*) as total_executions,
        AVG(execution_time_seconds) as avg_time,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as success_rate
      FROM agent_executions
      WHERE ${conditions.join(' AND ')}
    `;

    const result = this.db.prepare(query).get(...params) as ExecutionStatsRow | undefined;

    return {
      totalExecutions: result?.total_executions ?? 0,
      avgExecutionTime: result?.avg_time ?? 0,
      successRate: result?.success_rate ?? 0,
    };
  }

  /**
   * Comprehensive RAG query for agent context
   *
   * Returns success patterns, failures, code snippets, and stats
   */
  async queryForAgent(options: QueryPatternsOptions): Promise<QueryResult> {
    const [successPatterns, failurePatterns, codePatterns, executionStats] =
      await Promise.all([
        this.queryPatterns(options),
        this.queryFailures({ taskType: options.taskType }),
        this.queryCodePatterns({
          projectPath: options.projectName ? `apps/${options.projectName}` : undefined,
          limit: 5,
        }),
        this.getExecutionStats(options),
      ]);

    return {
      successPatterns,
      failurePatterns,
      codePatterns,
      executionStats,
    };
  }

  /**
   * Get database health metrics
   */
  async getHealthMetrics() {
    const tables = ['agent_executions', 'success_patterns', 'failure_patterns', 'code_patterns'];
    const metrics: Record<string, number> = {};

    for (const table of tables) {
      const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as CountRow;
      metrics[table] = result.count;
    }

    // Check for recent activity (last 24 hours)
    const recentActivity = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM agent_executions WHERE executed_at > datetime('now', '-1 day')`
      )
      .get() as CountRow;

    return {
      tables: metrics,
      recentActivity: recentActivity.count,
      totalExecutions: metrics.agent_executions ?? 0,
      dbSizeMB: this.getDbSizeMB(),
    };
  }

  /**
   * Get database file size in MB
   */
  private getDbSizeMB(): number {
    try {
      const stats = statSync(this.DB_PATH);
      return Number((stats.size / (1024 * 1024)).toFixed(2));
    } catch {
      return 0;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

const isMainModule = (): boolean => {
  const entryFile = process.argv[1];
  if (!entryFile) return false;
  return import.meta.url === pathToFileURL(entryFile).href;
};

// Example usage
if (isMainModule()) {
  void (async () => {
    const rag = new AgentLearningRAG();

    logger.info('=== Database Health ===');
    const health = await rag.getHealthMetrics();
    logger.info(JSON.stringify(health, null, 2));

    logger.info('\n=== Success Patterns (webapp-expert) ===');
    const patterns = await rag.queryPatterns({
      taskType: 'auto_fix_cycle',
      limit: 5,
      minConfidence: 0.8,
    });
    logger.info(JSON.stringify(patterns, null, 2));

    logger.info('\n=== Failure Patterns ===');
    const failures = await rag.queryFailures({ limit: 5 });
    logger.info(JSON.stringify(failures, null, 2));

    logger.info('\n=== Code Patterns (TypeScript) ===');
    const code = await rag.queryCodePatterns({
      language: 'typescript',
      limit: 3,
    });
    logger.info(JSON.stringify(code, null, 2));

    logger.info('\n=== Execution Stats (Last 30 days) ===');
    const stats = await rag.getExecutionStats({
      days: 30,
    });
    logger.info(JSON.stringify(stats, null, 2));

    rag.close();
  })();
}
