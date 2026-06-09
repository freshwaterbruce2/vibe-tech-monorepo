import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { normalizePath } from '@vibetech/shared-config';
import type { Model } from './types.js';

const DEFAULT_DB_PATH = 'D:\\databases\\models_pricing.db';

export const getDbPath = (): string => {
  const envPath = process.env.MODELS_PRICING_DB_PATH?.trim();
  return envPath && envPath.length > 0 ? normalizePath(envPath) : normalizePath(DEFAULT_DB_PATH);
};

export const openDb = (dbPath: string = getDbPath()): Database.Database => {
  const dir = dirname(dbPath);
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      inputCost REAL NOT NULL,
      outputCost REAL NOT NULL,
      cachedInputCost REAL DEFAULT 0,
      contextWindow TEXT NOT NULL,
      speed TEXT CHECK(speed IN ('fast', 'medium', 'slow')) NOT NULL,
      quality INTEGER CHECK(quality BETWEEN 1 AND 5) NOT NULL,
      bestFor TEXT NOT NULL,
      tier TEXT CHECK(tier IN ('free', 'low', 'medium', 'high')) NOT NULL,
      recommended INTEGER CHECK(recommended IN (0, 1)) DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      modelId TEXT NOT NULL,
      inputCost REAL NOT NULL,
      outputCost REAL NOT NULL,
      cachedInputCost REAL DEFAULT 0,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (modelId) REFERENCES models(id) ON DELETE CASCADE
    );
  `);

  // Column migration for cachedInputCost
  try {
    const tableInfo = db.pragma('table_info(models)') as Array<{ name: string }>;
    const hasCachedInputCost = tableInfo.some(col => col.name === 'cachedInputCost');
    if (!hasCachedInputCost) {
      db.exec('ALTER TABLE models ADD COLUMN cachedInputCost REAL DEFAULT 0;');
    }
  } catch (err) {
    console.error('Failed migrating models table:', err);
  }

  try {
    const historyInfo = db.pragma('table_info(price_history)') as Array<{ name: string }>;
    const historyHasCached = historyInfo.some(col => col.name === 'cachedInputCost');
    if (!historyHasCached) {
      db.exec('ALTER TABLE price_history ADD COLUMN cachedInputCost REAL DEFAULT 0;');
    }
  } catch (err) {
    console.error('Failed migrating price_history table:', err);
  }

  return db;
};

export const seedBaselineData = (db: Database.Database): void => {
  const baselineModels: Model[] = [
    {
      id: 'google/gemini-3.5-flash',
      name: 'Gemini 3.5 Flash',
      provider: 'Google',
      inputCost: 1.50,
      outputCost: 9.00,
      cachedInputCost: 0.15,
      contextWindow: '1M',
      speed: 'fast',
      quality: 4,
      bestFor: 'Latest Gemini 3.5 - High-tier agentic & coding speed',
      tier: 'low',
      recommended: true,
    },
    {
      id: 'kimi/kimi-k2.6',
      name: 'Kimi K2.6',
      provider: 'Moonshot',
      inputCost: 0.95,
      outputCost: 4.00,
      cachedInputCost: 0.16,
      contextWindow: '128K',
      speed: 'medium',
      quality: 5,
      bestFor: 'Advanced Kimi model with excellent Chinese reasoning',
      tier: 'medium',
      recommended: false,
    },
    {
      id: 'anthropic/claude-sonnet-4.6',
      name: 'Claude Sonnet 4.6',
      provider: 'Anthropic',
      inputCost: 3.00,
      outputCost: 15.00,
      cachedInputCost: 0.75,
      contextWindow: '200K',
      speed: 'medium',
      quality: 5,
      bestFor: 'Best for coding - Superior quality',
      tier: 'medium',
      recommended: false,
    },
    {
      id: 'anthropic/claude-haiku-3.5',
      name: 'Claude Haiku 3.5',
      provider: 'Anthropic',
      inputCost: 0.8,
      outputCost: 4.0,
      cachedInputCost: 0.2,
      contextWindow: '200K',
      speed: 'fast',
      quality: 4,
      bestFor: 'Fastest Claude - Low latency',
      tier: 'low',
      recommended: false,
    },
    {
      id: 'anthropic/claude-opus-4.7',
      name: 'Claude Opus 4.7',
      provider: 'Anthropic',
      inputCost: 5.00,
      outputCost: 25.00,
      cachedInputCost: 1.25,
      contextWindow: '200K',
      speed: 'slow',
      quality: 5,
      bestFor: 'Highest quality - Creative writing',
      tier: 'high',
      recommended: false,
    },
    {
      id: 'openai/gpt-5.5',
      name: 'GPT-5.5',
      provider: 'OpenAI',
      inputCost: 5.00,
      outputCost: 30.00,
      cachedInputCost: 1.25,
      contextWindow: '272K',
      speed: 'medium',
      quality: 5,
      bestFor: 'Latest GPT flagship - Excellent reasoning',
      tier: 'medium',
      recommended: true,
    },
    {
      id: 'openai/gpt-5.4-mini',
      name: 'GPT-5.4 Mini',
      provider: 'OpenAI',
      inputCost: 0.75,
      outputCost: 4.50,
      cachedInputCost: 0.18,
      contextWindow: '272K',
      speed: 'fast',
      quality: 4,
      bestFor: 'Fast & affordable GPT-5 variant',
      tier: 'low',
      recommended: false,
    },
    {
      id: 'openai/gpt-5.2-pro',
      name: 'GPT-5.2 Pro',
      provider: 'OpenAI',
      inputCost: 10.0,
      outputCost: 30.0,
      cachedInputCost: 2.5,
      contextWindow: '272K',
      speed: 'slow',
      quality: 5,
      bestFor: 'Maximum intelligence - Complex reasoning',
      tier: 'high',
      recommended: true,
    },
    {
      id: 'deepseek/deepseek-v4-flash',
      name: 'DeepSeek V4 Flash',
      provider: 'DeepSeek',
      inputCost: 0.14,
      outputCost: 0.28,
      cachedInputCost: 0.07,
      contextWindow: '128K',
      speed: 'fast',
      quality: 5,
      bestFor: 'DeepSeek June 2026 Flash model',
      tier: 'low',
      recommended: true,
    },
    {
      id: 'deepseek/deepseek-chat',
      name: 'DeepSeek V3',
      provider: 'DeepSeek',
      inputCost: 0.27,
      outputCost: 1.1,
      cachedInputCost: 0.07,
      contextWindow: '128K',
      speed: 'fast',
      quality: 5,
      bestFor: 'Legacy - Use V4 instead',
      tier: 'low',
      recommended: false,
    },
  ];

  const insertModel = db.prepare(`
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
  `);

  const insertHistory = db.prepare(`
    INSERT INTO price_history (modelId, inputCost, outputCost, cachedInputCost)
    VALUES (?, ?, ?, ?)
  `);

  const tx = db.transaction((models: Model[]) => {
    for (const m of models) {
      insertModel.run(
        m.id,
        m.name,
        m.provider,
        m.inputCost,
        m.outputCost,
        m.cachedInputCost ?? 0,
        m.contextWindow,
        m.speed,
        m.quality,
        m.bestFor,
        m.tier,
        m.recommended ? 1 : 0
      );
      insertHistory.run(m.id, m.inputCost, m.outputCost, m.cachedInputCost ?? 0);
    }
  });

  tx(baselineModels);
};
