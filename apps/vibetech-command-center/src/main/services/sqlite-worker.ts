import { parentPort } from 'node:worker_threads';
import type Database from 'better-sqlite3';
import { existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, normalize, relative, isAbsolute } from 'node:path';
import { loadDatabaseTargets } from './database-inventory';
import { openReadOnlyDatabase as openDatabase } from './sqlite-native';

// Normalize helper
function normalizeWindowsPath(p: string): string {
  return normalize(p.replace(/\//g, '\\'));
}

function isPathAllowed(targetPath: string, allowedRoots: string[]): boolean {
  const resolved = normalizeWindowsPath(resolve(targetPath)).toLowerCase();
  return allowedRoots.some((root) => {
    const allowedRoot = normalizeWindowsPath(resolve(root)).toLowerCase();
    const rel = relative(allowedRoot, resolved);
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
  });
}

const ROW_LIMIT = 1_000;
const FETCH_LIMIT = ROW_LIMIT + 1;

function guardSql(sql: string): void {
  const trimmed = sql.trim();
  if (!/^\s*(SELECT|WITH)\b/i.test(trimmed)) {
    throw new Error('Only SELECT and WITH queries are allowed');
  }
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|ATTACH|DETACH|PRAGMA)\b/i.test(trimmed)) {
    throw new Error('Query contains forbidden keywords');
  }
  const withoutTrailingSemicolon = trimmed.replace(/;+\s*$/, '');
  if (withoutTrailingSemicolon.includes(';')) {
    throw new Error('Only one SELECT or WITH query is allowed');
  }
}

function limitSql(sql: string): string {
  const trimmed = sql.trim().replace(/;+\s*$/, '');
  return `SELECT * FROM (${trimmed}) AS command_center_query_limit LIMIT ${FETCH_LIMIT}`;
}

function statDb(dbPath: string): { sizeBytes: number; walSizeBytes: number; lastModifiedAt: number } {
  if (!existsSync(dbPath)) {
    return { sizeBytes: 0, walSizeBytes: 0, lastModifiedAt: 0 };
  }
  const stat = statSync(dbPath);
  const walPath = `${dbPath}-wal`;
  const walSizeBytes = existsSync(walPath) ? statSync(walPath).size : 0;
  return { sizeBytes: stat.size, walSizeBytes, lastModifiedAt: stat.mtimeMs };
}

// MemoryViz Constants
const SEMANTIC_HALF_LIFE_MS = 11 * 24 * 60 * 60 * 1000;
const RECENT_MEMORY_LIMIT = 100;
const DECAY_PREVIEW_LIMIT = 500;

function runComputeDecay(db: Database.Database): any[] {
  const now = Date.now();
  const rows = db.prepare(`
    SELECT id, text, category, importance, created,
      COALESCE(last_accessed, created) as last_accessed,
      COALESCE(access_count, 0) as access_count
    FROM semantic_memory ORDER BY last_accessed ASC, created ASC LIMIT ?
  `).all(DECAY_PREVIEW_LIMIT) as Array<{ id: number; text: string; category: string | null; importance: number; created: number; last_accessed: number; access_count: number }>;

  const scores = rows.map((row) => {
    const ageMs = now - row.last_accessed;
    const base = Math.pow(2, -(ageMs / SEMANTIC_HALF_LIFE_MS));
    const boost = Math.min(row.access_count * 0.1, 0.5);
    const importanceBonus = (Math.min(row.importance, 10) / 10) * 0.2;
    const score = Math.max(0, base + boost + importanceBonus);
    const action: string = score < 0.2 ? 'prune' : score < 0.5 ? 'summarize' : 'keep';
    return {
      memoryId: row.id,
      textPreview: row.text,
      decayScore: Math.round(score * 1000) / 1000,
      recommendedAction: action,
      ageMs,
      accessCount: row.access_count,
      importance: row.importance,
      category: row.category,
    };
  });

  scores.sort((a, b) => a.decayScore - b.decayScore);
  return scores;
}

export function handleWorkerAction(
  message: { id: string; action: string; payload: any },
  postMessage: (res: any) => void
): void {
  const { id, action, payload } = message;

  try {
    let resultData: any;

    if (action === 'dbExplorer.listDatabases') {
      const { allowedRoots } = payload as { allowedRoots: string[] };
      const inventory = loadDatabaseTargets();
      const normAllowedRoots = allowedRoots.map((r: string) => normalizeWindowsPath(resolve(r)));
      const result: any[] = [];
      const seenPaths = new Set<string>();

      for (const target of inventory) {
        const normalizedPath = normalizeWindowsPath(target.path);
        if (!isPathAllowed(normalizedPath, allowedRoots)) {
          continue;
        }
        seenPaths.add(normalizedPath.toLowerCase());

        const { sizeBytes, walSizeBytes, lastModifiedAt } = statDb(normalizedPath);
        result.push({
          name: target.name,
          path: normalizedPath,
          sizeBytes,
          walSizeBytes,
          lastModifiedAt,
          tables: []
        });
      }

      for (const root of normAllowedRoots) {
        if (!existsSync(root)) continue;
        try {
          const entries = readdirSync(root, { withFileTypes: true });
          for (const entry of entries) {
            if (!entry.isFile()) continue;
            const name = entry.name;
            if (!/\.(db|sqlite|sqlite3)$/i.test(name)) continue;
            const fullPath = normalizeWindowsPath(resolve(root, name));
            if (seenPaths.has(fullPath.toLowerCase())) continue;
            seenPaths.add(fullPath.toLowerCase());

            const { sizeBytes, walSizeBytes, lastModifiedAt } = statDb(fullPath);
            result.push({
              name,
              path: fullPath,
              sizeBytes,
              walSizeBytes,
              lastModifiedAt,
              tables: []
            });
          }
        } catch {
          // ignore
        }
      }

      resultData = result.sort((a, b) => a.name.localeCompare(b.name));

    } else if (action === 'dbExplorer.getSchema') {
      const { dbPath, allowedRoots } = payload as { dbPath: string; allowedRoots: string[] };
      if (!isPathAllowed(dbPath, allowedRoots)) {
        throw new Error('Database path is outside allowed roots');
      }

      const db = openDatabase(dbPath);
      db.pragma('query_only = ON');

      try {
        const tableRows = db
          .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
          .all() as Array<{ name: string }>;

        const schemas: any[] = [];
        for (const t of tableRows) {
          const tableName = t.name;
          const infoRows = db.prepare(`PRAGMA table_info("${tableName.replace(/"/g, '""')}")`).all() as Array<{
            name: string;
            type: string;
            notnull: number;
            dflt_value: string | null;
          }>;

          const columns = infoRows.map((col) => ({
            name: col.name,
            type: col.type,
            notNull: col.notnull !== 0,
            defaultValue: col.dflt_value ?? null
          }));

          let rowCount = 0;
          try {
            const countRow = db.prepare(`SELECT COUNT(*) as c FROM "${tableName.replace(/"/g, '""')}"`).get() as { c: number };
            rowCount = countRow.c;
          } catch {
            rowCount = -1;
          }

          let estimatedSizeBytes: number | null = null;
          try {
            const sizeRow = db.prepare('SELECT SUM(pgsize) as s FROM dbstat WHERE name = ?').get(tableName) as { s: number } | undefined;
            estimatedSizeBytes = sizeRow?.s ?? null;
          } catch {
            estimatedSizeBytes = null;
          }

          schemas.push({ name: tableName, columns, rowCount, estimatedSizeBytes });
        }
        resultData = schemas;
      } finally {
        if (db && typeof db.close === 'function') {
          db.close();
        }
      }

    } else if (action === 'dbExplorer.runQuery') {
      const { dbPath, sql, allowedRoots } = payload as { dbPath: string; sql: string; allowedRoots: string[] };
      if (!isPathAllowed(dbPath, allowedRoots)) {
        throw new Error('Database path is outside allowed roots');
      }
      guardSql(sql);

      const startedAt = Date.now();
      const db = openDatabase(dbPath);
      db.pragma('query_only = ON');

      try {
        const stmt = db.prepare(limitSql(sql));
        const raw = stmt.raw(true);
        const rows = raw.all() as unknown[][];
        const columns = stmt.columns().map((c) => c.name);
        const truncated = rows.length > ROW_LIMIT;
        const limitedRows = truncated ? rows.slice(0, ROW_LIMIT) : rows;

        resultData = {
          columns,
          rows: limitedRows,
          rowCount: limitedRows.length,
          truncated,
          executionMs: Date.now() - startedAt
        };
      } finally {
        if (db && typeof db.close === 'function') {
          db.close();
        }
      }

    } else if (action === 'memory.getSnapshot') {
      const { dbPath } = payload as { dbPath: string };
      let db: Database.Database | null = null;

      try {
        db = openDatabase(dbPath);
        db.pragma('query_only = ON');
      } catch {
        resultData = {
          stats: [
            { store: 'episodic', recordCount: 0 },
            { store: 'semantic', recordCount: 0 },
            { store: 'procedural', recordCount: 0 },
          ],
          recentEpisodic: [],
          recentSemantic: [],
          recentProcedural: [],
          decayItems: [],
          consolidationStatus: { lastRunAt: null, itemsSummarized: 0, itemsPruned: 0 },
          generatedAt: Date.now(),
        };
      }

      if (db) {
        try {
          const episodicCount = (db.prepare('SELECT COUNT(*) as count FROM episodic_memory').get() as { count: number }).count;
          const semanticCount = (db.prepare('SELECT COUNT(*) as count FROM semantic_memory').get() as { count: number }).count;
          const proceduralCount = (db.prepare('SELECT COUNT(*) as count FROM procedural_memory').get() as { count: number }).count;

          let embeddingDim = 0;
          try {
            const row = db.prepare('SELECT embedding FROM semantic_memory WHERE embedding IS NOT NULL LIMIT 1').get() as { embedding: Buffer } | undefined;
            if (row) embeddingDim = row.embedding.byteLength / 4;
          } catch { /* ignore */ }

          let lastRunAt: number | null = null;
          let itemsSummarized = 0;
          let itemsPruned = 0;
          try {
            const logRow = db.prepare('SELECT MAX(created_at) as lastRun FROM consolidation_log').get() as { lastRun: number } | undefined;
            if (logRow?.lastRun) lastRunAt = logRow.lastRun;
            itemsSummarized = (db.prepare("SELECT COUNT(*) as count FROM consolidation_log WHERE action = 'merge'").get() as { count: number }).count;
            itemsPruned = (db.prepare("SELECT COUNT(*) as count FROM consolidation_log WHERE action = 'prune'").get() as { count: number } | { count: 0 }).count;
          } catch { /* ignore */ }

          const recentEpisodic = db.prepare(`
            SELECT id, source_id as sourceId, timestamp, query, response, session_id as sessionId
            FROM episodic_memory ORDER BY timestamp DESC LIMIT ?
          `).all(RECENT_MEMORY_LIMIT) as Array<{ id: number; sourceId: string; timestamp: number; query: string; response: string; sessionId?: string }>;

          const recentSemantic = db.prepare(`
            SELECT id, text, category, importance, created, last_accessed as lastAccessed, access_count as accessCount
            FROM semantic_memory ORDER BY created DESC LIMIT ?
          `).all(RECENT_MEMORY_LIMIT) as Array<{ id: number; text: string; category?: string; importance: number; created: number; lastAccessed?: number; accessCount: number }>;

          const recentProcedural = db.prepare(`
            SELECT id, pattern, context, frequency, success_rate as successRate, last_used as lastUsed
            FROM procedural_memory ORDER BY frequency DESC LIMIT ?
          `).all(RECENT_MEMORY_LIMIT) as Array<{ id: number; pattern: string; context: string; frequency: number; successRate: number; lastUsed?: number }>;

          const decayItems = runComputeDecay(db);

          resultData = {
            stats: [
              { store: 'episodic', recordCount: episodicCount },
              { store: 'semantic', recordCount: semanticCount, avgEmbeddingDim: embeddingDim || undefined },
              { store: 'procedural', recordCount: proceduralCount },
            ],
            recentEpisodic,
            recentSemantic,
            recentProcedural,
            decayItems,
            consolidationStatus: { lastRunAt, itemsSummarized, itemsPruned },
            generatedAt: Date.now(),
          };
        } finally {
          if (db && typeof db.close === 'function') {
            db.close();
          }
        }
      }

    } else if (action === 'memory.search') {
      const { dbPath, query, topK } = payload as { dbPath: string; query: string; topK: number };
      let db: Database.Database | null = null;

      try {
        db = openDatabase(dbPath);
        db.pragma('query_only = ON');
      } catch {
        resultData = [];
      }

      if (db) {
        try {
          const pattern = `%${query}%`;
          const results: Array<{ source: string; score: number; text: string; metadata?: Record<string, unknown> }> = [];

          try {
            const rows = db.prepare(`
              SELECT id, query, response, timestamp, CASE WHEN query LIKE ? THEN 1.0 ELSE 0.8 END as score
              FROM episodic_memory WHERE query LIKE ? OR response LIKE ? ORDER BY score DESC, timestamp DESC LIMIT ?
            `).all(pattern, pattern, pattern, topK) as Array<{ query: string; response: string; score: number }>;
            for (const r of rows) results.push({ source: 'episodic', score: r.score, text: `Q: ${r.query}\nA: ${r.response}` });
          } catch { /* ignore */ }

          try {
            const rows = db.prepare(`
              SELECT id, text, category, importance, CASE WHEN text LIKE ? THEN 1.0 ELSE 0.6 END as score
              FROM semantic_memory WHERE text LIKE ? ORDER BY score DESC, importance DESC LIMIT ?
            `).all(pattern, pattern, topK) as Array<{ text: string; score: number; category: string | null; importance: number }>;
            for (const r of rows) results.push({ source: 'semantic', score: r.score, text: r.text, metadata: { category: r.category, importance: r.importance } });
          } catch { /* ignore */ }

          try {
            const rows = db.prepare(`
              SELECT id, pattern, context, frequency, success_rate as successRate, CASE WHEN pattern LIKE ? THEN 1.0 ELSE 0.7 END as score
              FROM procedural_memory WHERE pattern LIKE ? OR context LIKE ? ORDER BY score DESC, frequency DESC LIMIT ?
            `).all(pattern, pattern, pattern, topK) as Array<{ pattern: string; context: string; score: number }>;
            for (const r of rows) results.push({ source: 'procedural', score: r.score, text: `${r.pattern}: ${r.context}` });
          } catch { /* ignore */ }

          results.sort((a, b) => b.score - a.score);
          resultData = results.slice(0, topK);
        } finally {
          if (db && typeof db.close === 'function') {
            db.close();
          }
        }
      }

    } else if (action === 'memory.computeDecay') {
      const { dbPath } = payload as { dbPath: string };
      let db: Database.Database | null = null;

      try {
        db = openDatabase(dbPath);
        db.pragma('query_only = ON');
      } catch (err) {
        // Propagate ENOENT/missing file errors to let client know DB is unavailable
        throw err;
      }

      if (db) {
        try {
          resultData = runComputeDecay(db);
        } finally {
          if (db && typeof db.close === 'function') {
            db.close();
          }
        }
      }
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    postMessage({ id, success: true, data: resultData });
  } catch (e) {
    postMessage({
      id,
      success: false,
      error: e instanceof Error ? e.message : String(e)
    });
  }
}

// Worker thread listener initialization
if (parentPort) {
  const port = parentPort;
  port.on('message', (msg) => {
    handleWorkerAction(msg, (res) => port.postMessage(res));
  });
}
