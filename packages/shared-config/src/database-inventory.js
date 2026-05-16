import { existsSync, readFileSync } from 'fs';
import { normalize } from 'path';
export const DATABASE_INVENTORY_PATH = 'D:\\databases\\DB_INVENTORY.md';
const CRYPTO_ENHANCED_TRADING_ENTRY = {
    name: 'trading.db (crypto-enhanced)',
    path: 'D:\\databases\\crypto-enhanced\\trading.db',
    purpose: 'apps/crypto-enhanced DB_PATH-resolved primary trading dataset',
};
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
    CRYPTO_ENHANCED_TRADING_ENTRY,
];
function normalizeWindowsPath(path) {
    return normalize(path.replace(/\//g, '\\'));
}
function buildPurpose(owner, domain) {
    const parts = [owner.trim(), domain.trim()].filter(Boolean);
    return parts.join(' - ');
}
function parseTableColumns(line) {
    return line
        .split('|')
        .slice(1, -1)
        .map((column) => column.trim());
}
function isMarkdownSeparator(columns) {
    return columns.every((column) => /^:?-{3,}:?$/.test(column.replace(/\s+/g, '')));
}
function dedupeByPath(entries) {
    const seen = new Set();
    const deduped = [];
    for (const entry of entries) {
        const normalizedPath = normalizeWindowsPath(entry.path).toLowerCase();
        if (seen.has(normalizedPath)) {
            continue;
        }
        seen.add(normalizedPath);
        deduped.push({
            ...entry,
            path: normalizeWindowsPath(entry.path),
        });
    }
    return deduped;
}
export function parseDatabaseInventoryMarkdown(markdown) {
    const lines = markdown.split(/\r?\n/);
    const entries = [];
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
        const [fileColumn, , ownerColumn = '', domainColumn = ''] = columns;
        if (columns.length < 4 || !fileColumn || fileColumn === 'File' || isMarkdownSeparator(columns)) {
            continue;
        }
        const fileMatch = fileColumn.match(/`([^`]+)`/);
        if (!fileMatch) {
            continue;
        }
        const [, rawFileName = ''] = fileMatch;
        const fileName = rawFileName.trim();
        if (!/\.(db|sqlite|sqlite3)$/i.test(fileName)) {
            continue;
        }
        entries.push({
            name: fileName,
            path: `D:\\databases\\${fileName}`,
            purpose: buildPurpose(ownerColumn.replace(/`/g, ''), domainColumn.replace(/`/g, '')),
        });
    }
    const hasTradingDb = entries.some((entry) => entry.path.toLowerCase() === 'd:\\databases\\trading.db');
    const hasCryptoTradingReference = /D:\\databases\\crypto-enhanced\\trading\.db/i.test(markdown);
    if (hasTradingDb || hasCryptoTradingReference) {
        entries.push(CRYPTO_ENHANCED_TRADING_ENTRY);
    }
    return dedupeByPath(entries);
}
export function loadDatabaseInventory(inventoryPath = DATABASE_INVENTORY_PATH) {
    if (!existsSync(inventoryPath)) {
        return [...FALLBACK_DATABASE_INVENTORY];
    }
    try {
        const markdown = readFileSync(inventoryPath, 'utf-8');
        const parsed = parseDatabaseInventoryMarkdown(markdown);
        if (parsed.length > 0) {
            return parsed;
        }
    }
    catch {
        // Fall back to the last known canonical set when the inventory cannot be read.
    }
    return [...FALLBACK_DATABASE_INVENTORY];
}
//# sourceMappingURL=database-inventory.js.map