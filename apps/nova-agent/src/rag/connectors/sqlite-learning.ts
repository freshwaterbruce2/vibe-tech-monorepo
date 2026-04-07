/**
 * Learning System Connector
 * Read-only wrapper around the learning database (D:\databases\agent_learning.db).
 * Provides access to 59k+ execution patterns, success/failure tracking.
 */

import { existsSync } from 'node:fs';
import Database from 'better-sqlite3';
import type { ConnectorQuery, DatabaseSchema } from '../types.js';

const DEFAULT_DB_PATH = 'D:\\databases\\agent_learning.db';

export interface SuccessPattern {
  id: number;
  patternType: string;
  description: string;
  frequency: number;
  confidenceScore: number;
  lastUsed: string | null;
}

export interface FailurePattern {
  id: number;
  agentName: string;
  mistakeType: string;
  description: string;
  severity: string;
  remediation: string | null;
}

export interface ExecutionSummary {
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  topTaskTypes: Array<{ taskType: string; count: number }>;
}

export class LearningConnector {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath ?? process.env.LEARNING_DB_PATH ?? DEFAULT_DB_PATH;
  }

  /**
   * Open read-only connection to learning database
   */
  connect(): boolean {
    if (!existsSync(this.dbPath)) {
      console.error(`[LearningConnector] Database not found: ${this.dbPath}`);
      return false;
    }

    try {
      this.db = new Database(this.dbPath, { readonly: true });
      this.db.pragma('busy_timeout = 5000');
      return true;
    } catch (error) {
      console.error(`[LearningConnector] Connection failed:`, (error as Error).message);
      return false;
    }
  }

  /**
   * Get schema information
   */
  getSchema(): DatabaseSchema[] {
    if (!this.db) return [];

    const tables = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    ).all() as Array<{ name: string }>;

    return tables.map((t) => {
      const columns = this.db!.prepare(`PRAGMA table_info('${t.name}')`).all() as Array<{
        name: string;
        type: string;
        notnull: number;
        pk: number;
      }>;

      let rowCount = 0;
      try {
        const row = this.db!.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get() as { count: number };
        rowCount = row.count;
      } catch { /* table might be empty or locked */ }

      return {
        tableName: t.name,
        columns: columns.map((c) => ({
          name: c.name,
          type: c.type,
          nullable: c.notnull === 0,
          primaryKey: c.pk > 0,
        })),
        rowCount,
      };
    });
  }

  /**
   * Get proven success patterns for a task type
   */
  getSuccessPatterns(taskType?: string, minConfidence = 0.8): SuccessPattern[] {
    if (!this.db) return [];

    try {
      const sql = taskType
        ? `SELECT id, pattern_type, description, frequency, confidence_score, last_used
           FROM success_patterns
           WHERE pattern_type LIKE ? AND confidence_score >= ?
           ORDER BY frequency DESC, confidence_score DESC
           LIMIT 10`
        : `SELECT id, pattern_type, description, frequency, confidence_score, last_used
           FROM success_patterns
           WHERE confidence_score >= ?
           ORDER BY frequency DESC, confidence_score DESC
           LIMIT 20`;

      const params = taskType ? [`%${taskType}%`, minConfidence] : [minConfidence];
      const rows = this.db.prepare(sql).all(...params) as Array<{
        id: number;
        pattern_type: string;
        description: string;
        frequency: number;
        confidence_score: number;
        last_used: string | null;
      }>;

      return rows.map((r) => ({
        id: r.id,
        patternType: r.pattern_type,
        description: r.description,
        frequency: r.frequency,
        confidenceScore: r.confidence_score,
        lastUsed: r.last_used,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get known failure patterns / mistakes
   */
  getFailurePatterns(agentName?: string): FailurePattern[] {
    if (!this.db) return [];

    try {
      const sql = agentName
        ? `SELECT id, agent_name, mistake_type, description, severity, remediation_steps
           FROM agent_mistakes
           WHERE agent_name = ?
           ORDER BY identified_at DESC
           LIMIT 20`
        : `SELECT id, agent_name, mistake_type, description, severity, remediation_steps
           FROM agent_mistakes
           ORDER BY identified_at DESC
           LIMIT 20`;

      const params = agentName ? [agentName] : [];
      const rows = this.db.prepare(sql).all(...params) as Array<{
        id: number;
        agent_name: string;
        mistake_type: string;
        description: string;
        severity: string;
        remediation_steps: string | null;
      }>;

      return rows.map((r) => ({
        id: r.id,
        agentName: r.agent_name,
        mistakeType: r.mistake_type,
        description: r.description,
        severity: r.severity,
        remediation: r.remediation_steps,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get execution summary statistics
   */
  getExecutionSummary(): ExecutionSummary {
    if (!this.db) {
      return { totalExecutions: 0, successRate: 0, avgExecutionTime: 0, topTaskTypes: [] };
    }

    try {
      const stats = this.db.prepare(`
        SELECT
          COUNT(*) as total,
          AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate,
          AVG(execution_time_seconds) as avg_time
        FROM agent_executions
      `).get() as { total: number; success_rate: number; avg_time: number };

      const topTypes = this.db.prepare(`
        SELECT task_type, COUNT(*) as count
        FROM agent_executions
        GROUP BY task_type
        ORDER BY count DESC
        LIMIT 10
      `).all() as Array<{ task_type: string; count: number }>;

      return {
        totalExecutions: stats.total,
        successRate: stats.success_rate,
        avgExecutionTime: stats.avg_time,
        topTaskTypes: topTypes.map((t) => ({
          taskType: t.task_type,
          count: t.count,
        })),
      };
    } catch {
      return { totalExecutions: 0, successRate: 0, avgExecutionTime: 0, topTaskTypes: [] };
    }
  }

  /**
   * Execute a read-only SQL query
   */
  query(sql: string, params?: unknown[]): ConnectorQuery {
    if (!this.db) {
      return { question: '', sql, error: 'Not connected' };
    }

    const trimmed = sql.trim().toUpperCase();
    if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH') && !trimmed.startsWith('PRAGMA')) {
      return { question: '', sql, error: 'Only SELECT/WITH/PRAGMA queries are allowed (read-only)' };
    }

    try {
      const results = this.db.prepare(sql).all(...(params ?? [])) as Record<string, unknown>[];
      return { question: '', sql, results };
    } catch (error) {
      return { question: '', sql, error: (error as Error).message };
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db?.close();
    this.db = null;
  }
}
