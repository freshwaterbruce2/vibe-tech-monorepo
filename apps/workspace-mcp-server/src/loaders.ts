/**
 * File loaders for workspace config, .env, port registry, and MCP config.
 * All reads are from the filesystem — no caching, always fresh.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { WORKSPACE_ROOT, ENV_FILE, MCP_CONFIG_FILE, PORT_REGISTRY_FILE } from './constants.js';
import { isSensitive, maskSecret } from './constants.js';

// Resolve a path relative to workspace root
function wsPath(relative: string): string {
  return resolve(WORKSPACE_ROOT, relative);
}

// --- .env loader ---

export interface EnvEntry {
  key: string;
  value: string;
  masked: string;
  sensitive: boolean;
  category: string;
}

function categorizeEnvVar(key: string): string {
  const upper = key.toUpperCase();
  if (/API_KEY|API_SECRET|TOKEN/.test(upper)) return 'api-keys';
  if (/DB_PATH|DATABASE|SQLITE/.test(upper)) return 'databases';
  if (/^PORT$|_PORT|HOST|_URL/.test(upper)) return 'ports';
  if (/MODEL|EMBEDDING|TEMPERATURE|MAX_TOKENS/.test(upper)) return 'ai-models';
  if (/JWT|BCRYPT|CORS|RATE_LIMIT/.test(upper)) return 'security';
  if (/PATH|_DIR|ROOT|WORKSPACE/.test(upper)) return 'paths';
  if (/^ENABLE_|ENABLED/.test(upper)) return 'features';
  if (/^LOG_|RUST_LOG/.test(upper)) return 'logging';
  return 'general';
}

export function loadEnvFile(envPath?: string): EnvEntry[] {
  const filePath = envPath || wsPath(ENV_FILE);
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, 'utf-8');
  const entries: EnvEntry[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    const sensitive = isSensitive(key);

    entries.push({
      key,
      value: sensitive ? '' : value,
      masked: sensitive ? maskSecret(value) : value,
      sensitive,
      category: categorizeEnvVar(key),
    });
  }

  return entries;
}

// --- Port registry loader ---

export interface PortEntry {
  port: number;
  app: string;
  type: string;
  description: string;
}

export interface PortRegistry {
  ranges: Record<string, { start: number; end: number; description: string }>;
  ports: PortEntry[];
  lastUpdated: string;
}

export function loadPortRegistry(): PortRegistry {
  const filePath = wsPath(PORT_REGISTRY_FILE);
  if (!existsSync(filePath)) {
    return { ranges: {}, ports: [], lastUpdated: 'unknown' };
  }

  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  const ports: PortEntry[] = Object.entries(raw.ports || {}).map(
    ([port, info]: [string, unknown]) => {
      const entry = info as { app: string; type: string; description: string };
      return {
        port: parseInt(port, 10),
        app: entry.app,
        type: entry.type,
        description: entry.description,
      };
    },
  );

  return {
    ranges: raw.ranges || {},
    ports,
    lastUpdated: raw.lastUpdated || 'unknown',
  };
}

// --- MCP server config loader ---

export interface McpServerEntry {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  isCustom: boolean;
  distPath: string | null;
}

export function loadMcpConfig(): McpServerEntry[] {
  const filePath = wsPath(MCP_CONFIG_FILE);
  if (!existsSync(filePath)) return [];

  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  const servers = raw.mcpServers || {};

  return Object.entries(servers).map(([name, config]: [string, unknown]) => {
    const cfg = config as {
      command?: string;
      args?: string[];
      env?: Record<string, string>;
    };
    const args = cfg.args || [];
    const command = cfg.command || '';

    // Determine if it's a custom (local) server vs. npx-based
    const isCustom = command === 'node' && args.some((a) => a.includes('C:/dev/apps/'));
    const distPath = isCustom ? (args.find((a) => a.includes('C:/dev/apps/')) || null) : null;

    // Mask any sensitive env vars
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(cfg.env || {})) {
      env[k] = isSensitive(k) ? maskSecret(v) : v;
    }

    return { name, command, args, env, isCustom, distPath };
  });
}

// --- App-specific .env loader ---

export function listAppEnvFiles(): { app: string; path: string }[] {
  const appsDir = wsPath('apps');
  if (!existsSync(appsDir)) return [];

  const results: { app: string; path: string }[] = [];
  try {
    const { readdirSync } = require('fs');
    const dirs = readdirSync(appsDir, { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const envPath = resolve(appsDir, d.name, '.env');
      if (existsSync(envPath)) {
        results.push({ app: d.name, path: envPath });
      }
    }
  } catch {
    // Silently fail if apps dir is unreadable
  }
  return results;
}

// --- Database file checker ---

export interface DatabaseStatus {
  name: string;
  path: string;
  purpose: string;
  exists: boolean;
  sizeMB: number | null;
}

export function checkDatabases(
  knownDbs: readonly { name: string; path: string; purpose: string }[],
): DatabaseStatus[] {
  return knownDbs.map((db) => {
    const exists = existsSync(db.path);
    let sizeMB: number | null = null;
    if (exists) {
      try {
        const { statSync } = require('fs');
        const stat = statSync(db.path);
        sizeMB = Math.round((stat.size / (1024 * 1024)) * 100) / 100;
      } catch {
        sizeMB = null;
      }
    }
    return { ...db, exists, sizeMB };
  });
}
