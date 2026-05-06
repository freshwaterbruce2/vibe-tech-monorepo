/**
 * Constants for workspace-mcp-server.
 * Paths, categories, and masks for the VibeTech monorepo.
 */

import { loadDatabaseInventory } from '@vibetech/shared-config/database-inventory';

// Workspace root (C:\dev on Windows, mapped mount in sandbox)
export const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || 'C:\\dev';

// Key files this server reads
export const ENV_FILE = '.env';
export const MCP_CONFIG_FILE = '.mcp.json';
export const PORT_REGISTRY_FILE = 'tools\\port-manager\\port-registry.json';

// Database locations (D:\ drive)
export const DATA_PATHS = {
  databases: 'D:\\databases',
  logs: 'D:\\logs',
  learningSystem: 'D:\\learning-system',
  data: 'D:\\data',
  tradingData: 'D:\\trading_data',
  tradingLogs: 'D:\\trading_logs',
  pnpmStore: 'D:\\pnpm-store-v2',
} as const;

// Known database files
export const KNOWN_DATABASES = loadDatabaseInventory();

// Port ranges from port-registry.json
export const PORT_RANGES = {
  backends: { start: 3000, end: 3099, description: 'Backend API servers' },
  mcp: { start: 3100, end: 3199, description: 'MCP servers' },
  vite: { start: 5173, end: 5199, description: 'Vite dev servers' },
  specialized: { start: 8000, end: 8999, description: 'Specialized services' },
} as const;

// Env var categories for grouping
export const ENV_CATEGORIES: Record<string, string[]> = {
  'api-keys': ['API_KEY', 'API_SECRET', 'TOKEN', 'SECRET'],
  'databases': ['DB_PATH', 'DATABASE', 'SQLITE'],
  'ports': ['PORT', 'HOST', 'URL'],
  'ai-models': ['MODEL', 'EMBEDDING', 'TEMPERATURE', 'MAX_TOKENS'],
  'security': ['JWT', 'BCRYPT', 'CORS', 'RATE_LIMIT'],
  'paths': ['PATH', 'DIR', 'ROOT', 'WORKSPACE'],
  'features': ['ENABLE_', 'ENABLED'],
  'logging': ['LOG_', 'RUST_LOG'],
};

// Sensitive key patterns — these get masked
export const SENSITIVE_PATTERNS = [
  /API_KEY/i,
  /API_SECRET/i,
  /SECRET/i,
  /TOKEN/i,
  /PASSWORD/i,
  /CREDENTIAL/i,
];

// Mask a secret value: show first 7 and last 4 chars
export function maskSecret(value: string): string {
  if (value.length <= 12) return '***masked***';
  return `${value.slice(0, 7)}...${value.slice(-4)}`;
}

// Check if an env var name is sensitive
export function isSensitive(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}
