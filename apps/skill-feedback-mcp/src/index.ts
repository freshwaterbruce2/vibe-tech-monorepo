#!/usr/bin/env node
/**
 * skill-feedback-mcp - MCP server for tracking skill performance and feedback.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import Database from 'better-sqlite3';
import type { Database as SqliteDatabase } from 'better-sqlite3';
import { existsSync } from 'fs';
import crypto from 'crypto';

const DB_PATH = process.env.LEARNING_DB_PATH ?? 'D:/databases/agent_learning.db';

const server = new McpServer({
  name: 'skill-feedback-mcp',
  version: '1.0.0',
});

// Helper to open DB in WAL mode with timeout
function getDb() {
  if (!existsSync(DB_PATH)) {
    throw new Error(`Database file not found at: ${DB_PATH}`);
  }
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  return db;
}

interface GeneratedSkillRow {
  usage_count: number;
  success_rate: number;
  user_rating: number | null;
}

interface FailureRow {
  error_message: string | null;
  execution_time_ms: number;
  completed_at: string;
}

// --- Tool: log_skill_usage -----------------------------------------

function updateSkillMetrics(
  db: SqliteDatabase,
  name: string,
  success: boolean,
  userRating: number | undefined,
  notes: string | undefined,
): { newUsageCount: number; newSuccessRate: number } {
  const skill = db.prepare(
    'SELECT usage_count, success_rate, user_rating FROM generated_skills WHERE name = ?',
  ).get(name) as GeneratedSkillRow | undefined;

  const newUsageCount = (skill?.usage_count ?? 0) + 1;
  const successValue = success ? 1.0 : 0.0;
  const newSuccessRate = skill?.usage_count
    ? ((skill.success_rate * skill.usage_count) + successValue) / newUsageCount
    : successValue;
  const ratingToUpdate = userRating ?? skill?.user_rating ?? null;

  db.prepare(`
    UPDATE generated_skills
    SET usage_count = ?,
        success_rate = ?,
        user_rating = ?,
        last_used = datetime('now'),
        notes = coalesce(?, notes)
    WHERE name = ?
  `).run(newUsageCount, newSuccessRate, ratingToUpdate, notes ?? null, name);

  return { newUsageCount, newSuccessRate };
}

function recordExecution(
  db: SqliteDatabase,
  name: string,
  success: boolean,
  executionTimeMs: number | undefined,
  errorMessage: string | undefined,
): string {
  const executionId = crypto.randomUUID();
  const nowEpoch = Math.floor(Date.now() / 1000);
  const executionTimeSec = executionTimeMs ? executionTimeMs / 1000 : 0;

  db.prepare(`
    INSERT INTO agent_executions (
      execution_id, agent_name, task_type, tools_used,
      started_at, completed_at, success, execution_time_ms,
      execution_time, error_message, created_at, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    executionId,
    'antigravity',
    name,
    JSON.stringify([name]),
    new Date().toISOString(),
    new Date().toISOString(),
    success ? 1 : 0,
    executionTimeMs ?? 0,
    executionTimeSec,
    errorMessage ?? null,
    nowEpoch,
    JSON.stringify({ triggered_by: 'skill-feedback-mcp' }),
  );

  return executionId;
}

function logSkillUsage(
  name: string,
  success: boolean,
  executionTimeMs: number | undefined,
  errorMessage: string | undefined,
  userRating: number | undefined,
  notes: string | undefined,
): { content: Array<{ type: 'text'; text: string }>; isError?: boolean } {
  const db = getDb();
  try {
    db.prepare(`
      INSERT OR IGNORE INTO generated_skills (name, type, generated_at)
      VALUES (?, 'skill', datetime('now'))
    `).run(name);

    const executionId = recordExecution(db, name, success, executionTimeMs, errorMessage);

    const { newUsageCount, newSuccessRate } = updateSkillMetrics(
      db,
      name,
      success,
      userRating,
      notes,
    );

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: true,
          message: `Logged usage for skill "${name}". New usage count: ${newUsageCount}, success rate: ${(newSuccessRate * 100).toFixed(1)}%.`,
          execution_id: executionId,
        }, null, 2),
      }],
    };
  } finally {
    db.close();
  }
}

server.tool(
  'log_skill_usage',
  'Log the execution of an auto-generated skill, update its metrics (uses/success rate), and store execution history.',
  {
    name: z.string().min(1).describe('The name of the skill/agent (e.g. "component-creation")'),
    success: z.boolean().describe('Whether the skill execution was successful'),
    executionTimeMs: z.number().optional().describe('Optional execution duration in milliseconds'),
    errorMessage: z.string().optional().describe('Optional error message if failed'),
    userRating: z.number().min(1).max(5).optional().describe('Optional user rating (1 to 5 stars)'),
    notes: z.string().optional().describe('Optional notes about the execution'),
  },
  async ({ name, success, executionTimeMs, errorMessage, userRating, notes }) => {
    try {
      return logSkillUsage(name, success, executionTimeMs, errorMessage, userRating, notes);
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{ type: 'text' as const, text: `Error logging skill usage: ${err.message}` }],
        isError: true,
      };
    }
  },
);

// --- Tool: get_skill_benchmarks ------------------------------------
server.tool(
  'get_skill_benchmarks',
  'Retrieve performance benchmarks and statistics for all auto-generated skills.',
  {
    name: z.string().optional().describe('Filter by specific skill name')
  },
  async ({ name }) => {
    let db;
    try {
      db = getDb();
      let query = `
        SELECT name, type, generated_at, success_rate, usage_count, user_rating, deprecation_candidate, last_used, notes
        FROM generated_skills
      `;
      const params: string[] = [];
      if (name) {
        query += ' WHERE name = ?';
        params.push(name);
      }
      query += ' ORDER BY usage_count DESC, success_rate DESC';

      const rows = db.prepare(query).all(...params);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(rows, null, 2)
        }]
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{
          type: 'text' as const,
          text: `Error getting benchmarks: ${err.message}`
        }],
        isError: true
      };
    } finally {
      if (db) db.close();
    }
  }
);

// --- Tool: recommend_skill_variants --------------------------------

function adaptionForError(err: string): string {
  const lower = err.toLowerCase();
  if (lower.includes('timeout')) {
    return 'Increase timeout threshold, partition datasets, or run asynchronously.';
  }
  if (lower.includes('permission') || lower.includes('access')) {
    return 'Verify OS permissions and workspace path configuration using paths:check.';
  }
  if (lower.includes('not found') || lower.includes('exist')) {
    return 'Add safety checks (existsSync / Test-Path) before attempting file operations.';
  }
  if (lower.includes('duplicate')) {
    return 'Verify skill is not attempting to recreate existing files; implement overwrite flags.';
  }
  return 'Analyze error logs to resolve syntax or logical issues.';
}

function recommendSkillVariants(
  name: string,
): { content: Array<{ type: 'text'; text: string }>; isError?: boolean } {
  const db = getDb();
  try {
    const failures = db.prepare(`
      SELECT error_message, execution_time_ms, completed_at
      FROM agent_executions
      WHERE (tools_used LIKE ? OR task_type = ?) AND success = 0
      ORDER BY completed_at DESC
      LIMIT 10
    `).all(`%${name}%`, name) as FailureRow[];

    if (failures.length === 0) {
      return {
        content: [{ type: 'text' as const, text: `No failures logged for skill "${name}". No variants needed.` }],
      };
    }

    const errorCounts: Record<string, number> = {};
    failures.forEach((f) => {
      const errMsg = f.error_message ?? 'Unknown error';
      errorCounts[errMsg] = (errorCounts[errMsg] ?? 0) + 1;
    });

    const recommendations = Object.entries(errorCounts).map(([err, count]) => ({
      error: err,
      occurrences: count,
      suggested_adaptation: adaptionForError(err),
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          skill: name,
          total_failed_analyzed: failures.length,
          recommendations,
        }, null, 2),
      }],
    };
  } finally {
    db.close();
  }
}

server.tool(
  'recommend_skill_variants',
  'Analyze execution errors for a specific skill and suggest prompt or code adaptations to resolve them.',
  {
    name: z.string().min(1).describe('The name of the skill/agent to analyze'),
  },
  async ({ name }) => {
    try {
      return recommendSkillVariants(name);
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{ type: 'text' as const, text: `Error analyzing skill variants: ${err.message}` }],
        isError: true,
      };
    }
  },
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Skill Feedback MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
