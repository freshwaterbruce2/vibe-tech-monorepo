#!/usr/bin/env node
/**
 * workspace-mcp-server — VibeTech monorepo config registry.
 * Exposes API keys (masked), ports, MCP servers, databases, and env vars
 * as MCP tools for any AI agent.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  KNOWN_DATABASES,
  PORT_RANGES,
  DATA_PATHS,
  isSensitive,
  maskSecret,
} from './constants.js';
import {
  loadEnvFile,
  loadPortRegistry,
  loadMcpConfig,
  listAppEnvFiles,
  checkDatabases,
} from './loaders.js';

const server = new McpServer({
  name: 'workspace-mcp-server',
  version: '1.0.0',
});

// ─── Tool: ws_list_env ─────────────────────────────────────────────
server.tool(
  'ws_list_env',
  `List all environment variables from the workspace .env file.
Sensitive values (API keys, secrets, tokens) are automatically masked.
Optionally filter by category: api-keys, databases, ports, ai-models, security, paths, features, logging, general.

Returns: Array of { key, masked, sensitive, category } objects.`,
  {
    category: z
      .string()
      .optional()
      .describe('Filter by category (api-keys, databases, ports, ai-models, security, paths, features, logging)'),
    app: z
      .string()
      .optional()
      .describe('App name to read app-specific .env (e.g., "crypto-enhanced")'),
  },
  async ({ category, app }) => {
    try {
      let envPath: string | undefined;
      if (app) {
        const appEnvs = listAppEnvFiles();
        const match = appEnvs.find((e) => e.app === app);
        if (!match) {
          return { content: [{ type: 'text', text: `No .env found for app "${app}". Available: ${appEnvs.map((e) => e.app).join(', ')}` }] };
        }
        envPath = match.path;
      }

      let entries = loadEnvFile(envPath);
      if (category) {
        entries = entries.filter((e) => e.category === category);
      }

      const result = entries.map(({ key, masked, sensitive, category: cat }) => ({
        key, value: masked, sensitive, category: cat,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error: unknown) {
      return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
    }
  },
);

// ─── Tool: ws_get_env ──────────────────────────────────────────────
server.tool(
  'ws_get_env',
  `Get a specific environment variable by name. Sensitive values are masked.
Use ws_validate_secret to check if a key is set without seeing its value.

Returns: { key, value (masked if sensitive), sensitive, category }`,
  {
    key: z.string().min(1).describe('Environment variable name (e.g., "GROQ_API_KEY")'),
    app: z.string().optional().describe('App name for app-specific .env'),
  },
  async ({ key, app }) => {
    try {
      let envPath: string | undefined;
      if (app) {
        const match = listAppEnvFiles().find((e) => e.app === app);
        envPath = match?.path;
      }

      const entries = loadEnvFile(envPath);
      const entry = entries.find((e) => e.key === key);

      if (!entry) {
        return { content: [{ type: 'text', text: `Environment variable "${key}" not found.` }] };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ key: entry.key, value: entry.masked, sensitive: entry.sensitive, category: entry.category }, null, 2),
        }],
      };
    } catch (error: unknown) {
      return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
    }
  },
);

// ─── Tool: ws_validate_secret ──────────────────────────────────────
server.tool(
  'ws_validate_secret',
  `Check if a secret/API key is set and non-empty WITHOUT exposing its value.
Returns: { key, isSet, length, preview } where preview shows first 4 chars only.

Use this to verify API keys are configured before running services.`,
  {
    key: z.string().min(1).describe('Secret name (e.g., "KRAKEN_API_KEY")'),
    app: z.string().optional().describe('App name for app-specific .env'),
  },
  async ({ key, app }) => {
    try {
      let envPath: string | undefined;
      if (app) {
        const match = listAppEnvFiles().find((e) => e.app === app);
        envPath = match?.path;
      }

      // Load raw entries (we need the actual value for length check)
      const filePath = envPath || `${process.env.WORKSPACE_ROOT || 'C:\\dev'}\\.env`;
      const { readFileSync, existsSync } = await import('fs');
      if (!existsSync(filePath)) {
        return { content: [{ type: 'text', text: `File not found: ${filePath}` }] };
      }

      const content = readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const k = trimmed.slice(0, eqIndex).trim();
        if (k !== key) continue;
        const v = trimmed.slice(eqIndex + 1).trim();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              key: k,
              isSet: v.length > 0,
              length: v.length,
              preview: v.length > 4 ? `${v.slice(0, 4)}...` : '(empty or short)',
            }, null, 2),
          }],
        };
      }

      return { content: [{ type: 'text', text: JSON.stringify({ key, isSet: false, length: 0, preview: '(not found)' }, null, 2) }] };
    } catch (error: unknown) {
      return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
    }
  },
);

// ─── Tool: ws_list_ports ───────────────────────────────────────────
server.tool(
  'ws_list_ports',
  `List all registered port assignments from the port registry.
Shows which app owns each port, its type, and description.
Optionally filter by type: backend, vite, mcp, python, specialized.

Returns: { ranges, ports[], lastUpdated }`,
  {
    type: z.string().optional().describe('Filter by type (backend, vite, mcp, python)'),
  },
  async ({ type }) => {
    try {
      const registry = loadPortRegistry();
      let ports = registry.ports;
      if (type) {
        ports = ports.filter((p) => p.type === type);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ ranges: registry.ranges, ports, lastUpdated: registry.lastUpdated }, null, 2),
        }],
      };
    } catch (error: unknown) {
      return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
    }
  },
);

// ─── Tool: ws_find_port ────────────────────────────────────────────
server.tool(
  'ws_find_port',
  `Look up which app is assigned to a specific port, or find which port an app uses.

Returns: Port assignment details or "unassigned" status.`,
  {
    port: z.number().optional().describe('Port number to look up'),
    app: z.string().optional().describe('App name to find its port'),
  },
  async ({ port, app }) => {
    try {
      const registry = loadPortRegistry();

      if (port) {
        const entry = registry.ports.find((p) => p.port === port);
        if (entry) {
          return { content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }] };
        }
        // Check which range it falls in
        for (const [name, range] of Object.entries(registry.ranges)) {
          if (port >= range.start && port <= range.end) {
            return { content: [{ type: 'text', text: `Port ${port} is unassigned but falls in range "${name}" (${range.start}-${range.end}: ${range.description})` }] };
          }
        }
        return { content: [{ type: 'text', text: `Port ${port} is unassigned and outside defined ranges.` }] };
      }

      if (app) {
        const matches = registry.ports.filter((p) => p.app.toLowerCase().includes(app.toLowerCase()));
        if (matches.length === 0) {
          return { content: [{ type: 'text', text: `No port registered for app "${app}".` }] };
        }
        return { content: [{ type: 'text', text: JSON.stringify(matches, null, 2) }] };
      }

      return { content: [{ type: 'text', text: 'Provide either "port" (number) or "app" (string) to search.' }] };
    } catch (error: unknown) {
      return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
    }
  },
);

// ─── Tool: ws_list_mcp_servers ─────────────────────────────────────
server.tool(
  'ws_list_mcp_servers',
  `List all configured MCP servers from .mcp.json.
Shows name, command, whether it's a custom (local) or npx-based server,
and any environment variables (secrets masked).

Returns: Array of MCP server configurations.`,
  {},
  async () => {
    try {
      const servers = loadMcpConfig();
      return { content: [{ type: 'text', text: JSON.stringify(servers, null, 2) }] };
    } catch (error: unknown) {
      return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
    }
  },
);

// ─── Tool: ws_list_databases ───────────────────────────────────────
server.tool(
  'ws_list_databases',
  `List all known SQLite databases on D:\\databases with existence check and file size.
All databases live on D:\\ per workspace policy — never on C:\\dev.

Returns: Array of { name, path, purpose, exists, sizeMB }`,
  {},
  async () => {
    try {
      const statuses = checkDatabases(KNOWN_DATABASES);
      return { content: [{ type: 'text', text: JSON.stringify(statuses, null, 2) }] };
    } catch (error: unknown) {
      return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
    }
  },
);

// ─── Tool: ws_workspace_summary ────────────────────────────────────
server.tool(
  'ws_workspace_summary',
  `Get a complete workspace overview in one call: env var count by category,
port assignments, MCP server count, database status, and data paths.

Use this for a quick health check or to orient a new agent session.`,
  {},
  async () => {
    try {
      const envEntries = loadEnvFile();
      const registry = loadPortRegistry();
      const mcpServers = loadMcpConfig();
      const databases = checkDatabases(KNOWN_DATABASES);
      const appEnvFiles = listAppEnvFiles();

      // Count env vars by category
      const envByCategory: Record<string, number> = {};
      for (const e of envEntries) {
        envByCategory[e.category] = (envByCategory[e.category] || 0) + 1;
      }

      const summary = {
        workspace: process.env.WORKSPACE_ROOT || 'C:\\dev',
        envVars: { total: envEntries.length, byCategory: envByCategory },
        ports: {
          assigned: registry.ports.length,
          ranges: registry.ranges,
          lastUpdated: registry.lastUpdated,
        },
        mcpServers: {
          total: mcpServers.length,
          custom: mcpServers.filter((s) => s.isCustom).length,
          external: mcpServers.filter((s) => !s.isCustom).length,
          names: mcpServers.map((s) => s.name),
        },
        databases: {
          total: databases.length,
          online: databases.filter((d) => d.exists).length,
          offline: databases.filter((d) => !d.exists).map((d) => d.name),
        },
        dataPaths: DATA_PATHS,
        appEnvFiles: appEnvFiles.map((e) => e.app),
      };

      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
    } catch (error: unknown) {
      return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
    }
  },
);

// ─── Tool: ws_search_config ────────────────────────────────────────
server.tool(
  'ws_search_config',
  `Search across all config sources (env vars, ports, MCP servers, databases) for a keyword.
Useful when you know part of a name but not where it's configured.

Returns: Matches grouped by source.`,
  {
    query: z.string().min(1).describe('Search keyword (case-insensitive)'),
  },
  async ({ query }) => {
    try {
      const q = query.toLowerCase();
      const envEntries = loadEnvFile();
      const registry = loadPortRegistry();
      const mcpServers = loadMcpConfig();
      const databases = checkDatabases(KNOWN_DATABASES);

      const results = {
        env: envEntries
          .filter((e) => e.key.toLowerCase().includes(q) || e.masked.toLowerCase().includes(q))
          .map(({ key, masked, category }) => ({ key, value: masked, category })),
        ports: registry.ports.filter(
          (p) => p.app.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
        ),
        mcpServers: mcpServers.filter(
          (s) => s.name.toLowerCase().includes(q) || s.args.some((a) => a.toLowerCase().includes(q)),
        ),
        databases: databases.filter(
          (d) => d.name.toLowerCase().includes(q) || d.purpose.toLowerCase().includes(q),
        ),
      };

      const totalHits = results.env.length + results.ports.length + results.mcpServers.length + results.databases.length;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ query, totalHits, ...results }, null, 2),
        }],
      };
    } catch (error: unknown) {
      return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
    }
  },
);

// ─── Start Server ──────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('workspace-mcp-server running on stdio\n');
}

main().catch((error) => {
  process.stderr.write(`Fatal error: ${error}\n`);
  process.exit(1);
});
