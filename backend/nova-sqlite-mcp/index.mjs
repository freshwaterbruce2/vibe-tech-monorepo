// @ts-nocheck
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import Database from 'better-sqlite3';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';

// Default path for Nova activity database on D:\
const DEFAULT_DB_PATH =
  process.env.NOVA_ACTIVITY_DB_PATH || 'D:/databases/nova_activity.db';

function assertDbPathAllowed(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    throw new Error(
      'NOVA SQLite MCP server requires NOVA_ACTIVITY_DB_PATH to be a non-empty string.'
    );
  }

  const upper = rawPath.toUpperCase();
  const isOnDDrive =
    upper.startsWith('D:\\') || upper.startsWith('D:/');

  if (!isOnDDrive) {
    throw new Error(
      `NOVA SQLite MCP server only allows databases on D:\\. Received path: ${rawPath}`
    );
  }
}

function getDatabase() {
  const dbPathRaw = DEFAULT_DB_PATH;
  assertDbPathAllowed(dbPathRaw);

  const dbPath = resolve(dbPathRaw);

  if (!existsSync(dbPath)) {
    throw new Error(
      `NOVA SQLite MCP server could not find activity database at: ${dbPath}`
    );
  }

  // better-sqlite3 is synchronous and safe for this small MCP server.
  return new Database(dbPath, { fileMustExist: true });
}

const db = getDatabase();

function safeQuery(fn) {
  try {
    return fn();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    return {
      error: true,
      message,
    };
  }
}

const server = new McpServer(
  {
    name: 'nova-sqlite',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {
        listChanged: true,
      },
      logging: {
        // Enable basic logging so the client can request log levels if desired.
        levels: ['debug', 'info', 'warn', 'error'],
      },
    },
    instructions:
      'This server exposes read-only tools for inspecting the Nova activity SQLite database on D:/databases. ' +
      'Use tools like `nova_activity_stats`, `nova_recent_file_events`, `nova_recent_git_events`, and `nova_recent_process_events` ' +
      'to debug activity tracking and inspect recent events. All access is restricted to databases on the D: drive.',
  }
);

// Filtered file events by project and/or minimum timestamp
server.tool(
  'nova_recent_file_events_filtered',
  'Fetch up to 100 recent file_events, optionally filtered by project and minimum timestamp.',
  {
    project: z.string().optional(),
    sinceTimestamp: z.number().optional(),
  },
  async ({ project, sinceTimestamp }) => {
    const result = safeQuery(() => {
      let query = `
        SELECT
          id,
          path,
          event_type AS eventType,
          timestamp,
          project,
          old_path AS oldPath
        FROM file_events
        WHERE 1=1
      `;
      const params = [];

      if (project) {
        query += ' AND project = ?';
        params.push(project);
      }
      if (typeof sinceTimestamp === 'number') {
        query += ' AND timestamp >= ?';
        params.push(sinceTimestamp);
      }

      query += ' ORDER BY timestamp DESC LIMIT 100';

      const stmt = db.prepare(query);
      return stmt.all(...params);
    });

    if (result && result.error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error reading filtered file events: ${result.message}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Activity statistics: counts for each event table
server.tool(
  'nova_activity_stats',
  'Get aggregate counts of file, git, and process events from nova_activity.db.',
  async () => {
    const result = safeQuery(() => {
      const fileRow = db
        .prepare('SELECT COUNT(*) AS count FROM file_events')
        .get();
      const gitRow = db
        .prepare('SELECT COUNT(*) AS count FROM git_events')
        .get();
      const processRow = db
        .prepare('SELECT COUNT(*) AS count FROM process_events')
        .get();

      const fileCount = Number(fileRow?.count ?? 0);
      const gitCount = Number(gitRow?.count ?? 0);
      const processCount = Number(processRow?.count ?? 0);

      return {
        fileEvents: fileCount,
        gitEvents: gitCount,
        processEvents: processCount,
        totalEvents: fileCount + gitCount + processCount,
      };
    });

    if (result && result.error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error reading activity stats: ${result.message}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Latest file events (capped to 100 for prompt-friendliness)
server.tool(
  'nova_recent_file_events',
  'Fetch the 100 most recent file_events rows from nova_activity.db.',
  async () => {
    const result = safeQuery(() => {
      const stmt = db.prepare(`
        SELECT
          id,
          path,
          event_type AS eventType,
          timestamp,
          project,
          old_path AS oldPath
        FROM file_events
        ORDER BY timestamp DESC
        LIMIT 100
      `);
      return stmt.all();
    });

    if (result && result.error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error reading recent file events: ${result.message}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Latest git events (capped to 100)
server.tool(
  'nova_recent_git_events',
  'Fetch the 100 most recent git_events rows from nova_activity.db.',
  async () => {
    const result = safeQuery(() => {
      const stmt = db.prepare(`
        SELECT
          id,
          repo_path AS repoPath,
          event_type AS eventType,
          branch,
          commit_hash AS commitHash,
          message,
          author,
          timestamp
        FROM git_events
        ORDER BY timestamp DESC
        LIMIT 100
      `);
      return stmt.all();
    });

    if (result && result.error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error reading recent git events: ${result.message}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Latest process events (capped to 100)
server.tool(
  'nova_recent_process_events',
  'Fetch the 100 most recent process_events rows from nova_activity.db.',
  async () => {
    const result = safeQuery(() => {
      const stmt = db.prepare(`
        SELECT
          id,
          name,
          pid,
          event_type AS eventType,
          port,
          command_line AS commandLine,
          project,
          timestamp
        FROM process_events
        ORDER BY timestamp DESC
        LIMIT 100
      `);
      return stmt.all();
    });

    if (result && result.error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error reading recent process events: ${result.message}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Start the MCP server over stdio
const transport = new StdioServerTransport();

server
  .connect(transport)
  .catch(error => {
    const message =
      error instanceof Error ? error.message : String(error);
     
    console.error(
      `NOVA SQLite MCP server failed to start: ${message}`
    );
    process.exit(1);
  });
