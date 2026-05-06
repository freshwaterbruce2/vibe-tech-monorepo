import { existsSync, readFileSync } from 'node:fs';
import { normalize } from 'node:path';

export interface DatabaseTarget {
  name: string;
  path: string;
}

const DATABASE_INVENTORY_PATH = 'D:\\databases\\DB_INVENTORY.md';

const FALLBACK_DATABASE_TARGETS: readonly DatabaseTarget[] = [
  { name: 'memory.db', path: 'D:\\databases\\memory.db' },
  { name: 'agent_learning.db', path: 'D:\\databases\\agent_learning.db' },
  { name: 'nova_activity.db', path: 'D:\\databases\\nova_activity.db' },
  { name: 'vibe_studio.db', path: 'D:\\databases\\vibe_studio.db' },
  { name: 'database.db', path: 'D:\\databases\\database.db' },
  { name: 'vibe_justice.db', path: 'D:\\databases\\vibe_justice.db' },
  { name: 'agent_tasks.db', path: 'D:\\databases\\agent_tasks.db' },
  { name: 'feature_flags.db', path: 'D:\\databases\\feature_flags.db' },
  { name: 'trading.db', path: 'D:\\databases\\trading.db' },
  { name: 'trading.db (crypto-enhanced)', path: 'D:\\databases\\crypto-enhanced\\trading.db' },
];

function normalizeWindowsPath(path: string): string {
  return normalize(path.replace(/\//g, '\\'));
}

function parseTableColumns(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1)
    .map((column) => column.trim());
}

function isMarkdownSeparator(columns: string[]): boolean {
  return columns.every((column) => /^:?-{3,}:?$/.test(column.replace(/\s+/g, '')));
}

function dedupeByPath(entries: readonly DatabaseTarget[]): DatabaseTarget[] {
  const seen = new Set<string>();
  const deduped: DatabaseTarget[] = [];

  for (const entry of entries) {
    const normalizedPath = normalizeWindowsPath(entry.path).toLowerCase();
    if (seen.has(normalizedPath)) {
      continue;
    }

    seen.add(normalizedPath);
    deduped.push({
      name: entry.name,
      path: normalizeWindowsPath(entry.path),
    });
  }

  return deduped;
}

export function loadDatabaseTargets(inventoryPath = DATABASE_INVENTORY_PATH): DatabaseTarget[] {
  if (!existsSync(inventoryPath)) {
    return [...FALLBACK_DATABASE_TARGETS];
  }

  try {
    const markdown = readFileSync(inventoryPath, 'utf-8');
    const lines = markdown.split(/\r?\n/);
    const entries: DatabaseTarget[] = [];
    let inLiveTable = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('## Live Databases')) {
        inLiveTable = true;
        continue;
      }

      if (!inLiveTable) {
        continue;
      }

      if (!trimmed) {
        if (entries.length > 0) {
          break;
        }
        continue;
      }

      if (!trimmed.startsWith('|')) {
        if (entries.length > 0) {
          break;
        }
        continue;
      }

      const columns = parseTableColumns(trimmed);
      const [fileColumn] = columns;
      if (columns.length < 4 || !fileColumn || fileColumn === 'File' || isMarkdownSeparator(columns)) {
        continue;
      }

      const fileMatch = fileColumn.match(/`([^`]+)`/);
      const fileName = fileMatch?.[1]?.trim();
      if (!fileName || !/\.(db|sqlite|sqlite3)$/i.test(fileName)) {
        continue;
      }

      entries.push({
        name: fileName,
        path: `D:\\databases\\${fileName}`,
      });
    }

    const hasTradingDb = entries.some((entry) => entry.path.toLowerCase() === 'd:\\databases\\trading.db');
    const hasCryptoTradingReference = /D:\\databases\\crypto-enhanced\\trading\.db/i.test(markdown);
    if (hasTradingDb || hasCryptoTradingReference) {
      entries.push({
        name: 'trading.db (crypto-enhanced)',
        path: 'D:\\databases\\crypto-enhanced\\trading.db',
      });
    }

    return entries.length > 0 ? dedupeByPath(entries) : [...FALLBACK_DATABASE_TARGETS];
  } catch {
    return [...FALLBACK_DATABASE_TARGETS];
  }
}
