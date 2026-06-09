import Database from 'better-sqlite3';
import { openDb, seedBaselineData } from './db.js';
import type { Model, PricingTiers } from './types.js';

export * from './types.js';
export { getDbPath, openDb, seedBaselineData } from './db.js';

let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = openDb();
    const countRow = dbInstance.prepare('SELECT COUNT(*) as count FROM models').get() as { count: number } | undefined;
    if (!countRow || countRow.count === 0) {
      seedBaselineData(dbInstance);
    }
  }
  return dbInstance;
}

interface ModelRow {
  id: string;
  name: string;
  provider: string;
  inputCost: number;
  outputCost: number;
  cachedInputCost?: number;
  contextWindow: string;
  speed: string;
  quality: number;
  bestFor: string;
  tier: string;
  recommended: number;
}

function mapRowToModel(row: ModelRow): Model {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    inputCost: row.inputCost,
    outputCost: row.outputCost,
    cachedInputCost: row.cachedInputCost ?? 0,
    contextWindow: row.contextWindow,
    speed: row.speed as 'fast' | 'medium' | 'slow',
    quality: row.quality as 1 | 2 | 3 | 4 | 5,
    bestFor: row.bestFor,
    tier: row.tier as 'free' | 'low' | 'medium' | 'high',
    recommended: row.recommended === 1,
  };
}

export function getModels(): Model[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM models').all() as ModelRow[];
  return rows.map(mapRowToModel);
}

export function getModel(id: string): Model | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM models WHERE id = ?').get(id) as ModelRow | undefined;
  if (!row) return null;
  return mapRowToModel(row);
}

export function updateModelPrice(id: string, pricing: PricingTiers): boolean {
  const db = getDb();
  const tx = db.transaction(() => {
    const hasCached = pricing.cachedInputCost !== undefined;
    let query = 'UPDATE models SET inputCost = ?, outputCost = ?';
    const params: unknown[] = [pricing.inputCost, pricing.outputCost];
    if (hasCached) {
      query += ', cachedInputCost = ?';
      params.push(pricing.cachedInputCost);
    }
    query += ' WHERE id = ?';
    params.push(id);

    const info = db.prepare(query).run(...params);
    if (info.changes === 0) {
      return false;
    }
    db.prepare('INSERT INTO price_history (modelId, inputCost, outputCost, cachedInputCost) VALUES (?, ?, ?, ?)').run(
      id,
      pricing.inputCost,
      pricing.outputCost,
      pricing.cachedInputCost ?? 0
    );
    return true;
  });
  return tx();
}

export function addModel(model: Model): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO models (id, name, provider, inputCost, outputCost, cachedInputCost, contextWindow, speed, quality, bestFor, tier, recommended)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        provider=excluded.provider,
        inputCost=excluded.inputCost,
        outputCost=excluded.outputCost,
        cachedInputCost=excluded.cachedInputCost,
        contextWindow=excluded.contextWindow,
        speed=excluded.speed,
        quality=excluded.quality,
        bestFor=excluded.bestFor,
        tier=excluded.tier,
        recommended=excluded.recommended
    `).run(
      model.id,
      model.name,
      model.provider,
      model.inputCost,
      model.outputCost,
      model.cachedInputCost ?? 0,
      model.contextWindow,
      model.speed,
      model.quality,
      model.bestFor,
      model.tier,
      model.recommended ? 1 : 0
    );
    db.prepare('INSERT INTO price_history (modelId, inputCost, outputCost, cachedInputCost) VALUES (?, ?, ?, ?)').run(
      model.id,
      model.inputCost,
      model.outputCost,
      model.cachedInputCost ?? 0
    );
  });
  tx();
}
