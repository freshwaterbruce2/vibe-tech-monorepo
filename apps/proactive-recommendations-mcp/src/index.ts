#!/usr/bin/env node
/**
 * proactive-recommendations-mcp - MCP server for proactive recommendations.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const DB_PATH = process.env.LEARNING_DB_PATH ?? 'D:/databases/agent_learning.db';
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? 'V:/monorepo';

const server = new McpServer({
  name: 'proactive-recommendations-mcp',
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

interface ProactiveRecommendationRow {
  id: number;
  timestamp: number;
  category: string;
  priority: string;
  title: string;
  description: string;
  action_label: string;
  action_command: string;
  confidence: number;
  estimated_impact: string;
  metadata: string;
  executed: number;
  dismissed: number;
}

// --- Tool: get_proactive_recommendations ---------------------------
server.tool(
  'get_proactive_recommendations',
  'Fetch active or historical proactive recommendations from agent_learning database.',
  {
    includeDismissed: z.boolean().optional().describe('Include recommendations that have been dismissed'),
    includeExecuted: z.boolean().optional().describe('Include recommendations that have already been executed')
  },
  async ({ includeDismissed, includeExecuted }) => {
    let db;
    try {
      db = getDb();
      let query = `
        SELECT id, timestamp, category, priority, title, description,
               action_label, action_command, confidence, estimated_impact,
               metadata, executed, dismissed
        FROM proactive_recommendations
        WHERE 1=1
      `;
      const params: string[] = [];

      const resolvedIncludeDismissed = includeDismissed ?? false;
      const resolvedIncludeExecuted = includeExecuted ?? false;

      if (!resolvedIncludeDismissed) {
        query += ' AND dismissed = 0';
      }
      if (!resolvedIncludeExecuted) {
        query += ' AND executed = 0';
      }

      query += ' ORDER BY priority = "HIGH" DESC, priority = "MEDIUM" DESC, timestamp DESC';

      const rows = db.prepare(query).all(...params) as ProactiveRecommendationRow[];
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
          text: `Error getting proactive recommendations: ${err.message}`
        }],
        isError: true
      };
    } finally {
      if (db) db.close();
    }
  }
);

// --- Tool: dismiss_recommendation ----------------------------------
server.tool(
  'dismiss_recommendation',
  'Dismiss a proactive recommendation so it does not appear in active task lists.',
  {
    id: z.number().describe('The ID of the recommendation to dismiss')
  },
  async ({ id }) => {
    let db;
    try {
      db = getDb();
      
      const result = db.prepare(`
        UPDATE proactive_recommendations
        SET dismissed = 1,
            metadata = json_patch(coalesce(metadata, '{}'), ?)
        WHERE id = ?
      `).run(JSON.stringify({ dismissed_at: new Date().toISOString() }), id);

      if (result.changes === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No recommendation found with ID: ${id}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: `Dismissed recommendation ID: ${id}`
          }, null, 2)
        }]
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{
          type: 'text' as const,
          text: `Error dismissing recommendation: ${err.message}`
        }],
        isError: true
      };
    } finally {
      if (db) db.close();
    }
  }
);

// --- Tool: create_recommendation_task ------------------------------
server.tool(
  'create_recommendation_task',
  'Convert a proactive recommendation into a structured task file (markdown) in the workspace to initiate execution.',
  {
    id: z.number().describe('The ID of the recommendation to execute'),
    taskFilePath: z.string().optional().describe('Optional custom path for the task file in the workspace')
  },
  async ({ id, taskFilePath }) => {
    let db;
    try {
      db = getDb();
      
      const rec = db.prepare(`
        SELECT * FROM proactive_recommendations WHERE id = ?
      `).get(id) as ProactiveRecommendationRow | undefined;

      if (!rec) {
        return {
          content: [{
            type: 'text' as const,
            text: `No recommendation found with ID: ${id}`
          }],
          isError: true
        };
      }

      // Generate task path
      const defaultPath = join(WORKSPACE_ROOT, 'tasks', `proactive-task-${id}.md`);
      const targetPath = taskFilePath ?? defaultPath;

      // Ensure tasks directory exists
      const targetDir = dirname(targetPath);
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      // Create markdown task template
      const formattedDate = new Date(rec.timestamp * 1000).toISOString();
      const markdownContent = `# Task: Proactive Recommendation (ID: ${rec.id})

> **Priority**: ${rec.priority}
> **Category**: ${rec.category}
> **Generated At**: ${formattedDate}
> **Estimated Impact**: ${rec.estimated_impact ?? 'N/A'}

## Issue Description
${rec.title}

## Recommended Actions
${rec.description}

## Status Tracking
- [ ] Implement recommended action
- [ ] Run verification test
- [ ] Log results to learning system
- [ ] Close this task

---
*Created automatically by proactive-recommendations-mcp.*
`;

      writeFileSync(targetPath, markdownContent, 'utf-8');

      // Update recommendation status to executed
      db.prepare(`
        UPDATE proactive_recommendations
        SET executed = 1,
            metadata = json_patch(coalesce(metadata, '{}'), ?)
        WHERE id = ?
      `).run(JSON.stringify({ 
        executed_at: new Date().toISOString(),
        task_file: targetPath
      }), id);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: `Created task file at ${targetPath} and marked recommendation ID ${id} as executed.`,
            task_file: targetPath
          }, null, 2)
        }]
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{
          type: 'text' as const,
          text: `Error executing recommendation: ${err.message}`
        }],
        isError: true
      };
    } finally {
      if (db) db.close();
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Proactive Recommendations MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
