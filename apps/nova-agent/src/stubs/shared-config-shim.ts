// Browser-safe shim for @vibetech/shared-config.
// Mirrors the real packages public API and database-inventory exports.

export const env = {
  APP_DB_PATH: 'D:\\databases\\database.db',
  LEARNING_DB_PATH: 'D:\\databases\\agent_learning.db',
  LEARNING_SYSTEM_DIR: 'D:\\learning-system',
  IPC_WS_URL: 'ws://localhost:5004',
  NODE_ENV: 'development',
  APP_ENV: 'development',
  LOG_LEVEL: 'info',
};

export const normalizePath = (path: string): string => {
  return String(path).replace(/\//g, '\\');
};

export const getDatabasePath = (type: 'app' | 'learning'): string => {
  return normalizePath(type === 'app' ? env.APP_DB_PATH : env.LEARNING_DB_PATH);
};

export const getLearningSystemDir = (): string => {
  return normalizePath(env.LEARNING_SYSTEM_DIR);
};

export const validatePath = (): boolean => {
  return false;
};

export const getIPCConfig = () => ({
  url: env.IPC_WS_URL,
  reconnectDelay: 1000,
  maxReconnectAttempts: 5,
});

export const DATABASE_INVENTORY_PATH = 'D:\\databases\\DB_INVENTORY.md';

export const FALLBACK_DATABASE_INVENTORY = [
  {
    name: 'memory.db',
    path: 'D:\\databases\\memory.db',
    purpose: 'memory-mcp (@vibetech/memory) - episodic, semantic, and procedural memory',
  },
  {
    name: 'agent_learning.db',
    path: 'D:\\databases\\agent_learning.db',
    purpose: 'learning system - agent execution history, mistakes, and recommendations',
  },
  {
    name: 'nova_activity.db',
    path: 'D:\\databases\\nova_activity.db',
    purpose: 'Nova Agent activity events and deep-work sessions',
  },
  {
    name: 'vibe_studio.db',
    path: 'D:\\databases\\vibe_studio.db',
    purpose: 'Vibe Code Studio editor activity, projects, and context',
  },
  {
    name: 'database.db',
    path: 'D:\\databases\\database.db',
    purpose: 'Hub DB shared cross-app data store',
  },
  {
    name: 'vibe_justice.db',
    path: 'D:\\databases\\vibe_justice.db',
    purpose: 'Vibe Justice backend legal case data',
  },
  {
    name: 'agent_tasks.db',
    path: 'D:\\databases\\agent_tasks.db',
    purpose: 'Nova Agent task tracking and task registry',
  },
  {
    name: 'feature_flags.db',
    path: 'D:\\databases\\feature_flags.db',
    purpose: '@vibetech/feature-flags/server feature flag store',
  },
  {
    name: 'trading.db',
    path: 'D:\\databases\\trading.db',
    purpose: 'apps/crypto-enhanced trading config or scratch database',
  },
];

export function parseDatabaseInventoryMarkdown() {
  return [...FALLBACK_DATABASE_INVENTORY];
}

export function loadDatabaseInventory() {
  return [...FALLBACK_DATABASE_INVENTORY];
}

export default env;
