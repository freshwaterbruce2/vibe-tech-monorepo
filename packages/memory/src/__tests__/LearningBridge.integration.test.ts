/**
 * LearningBridge integration tests
 *
 * Uses real SQLite (tmpdir) to verify:
 *   1. Schema contract — canonical column names are what the bridge actually queries
 *   2. sinceTimestamp watermark — ingestExecutions only ingests rows after the cutoff
 *   3. Full sync dedup — a second syncFromLearningSystem with the previous timestamp
 *      does not re-ingest already-seen executions
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LearningBridge } from '../integrations/LearningBridge.js';
import type { MemoryManager } from '../core/MemoryManager.js';

const LEARNING_DB = path.join(os.tmpdir(), 'vibetech-lb-integration-test.db');

function cleanup(): void {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = LEARNING_DB + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

/** Canonical schema — must match D:\databases\agent_learning.db exactly */
function createCanonicalSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_executions (
      execution_id   TEXT PRIMARY KEY,
      agent_id       TEXT NOT NULL,
      task_type      TEXT NOT NULL,
      success        INTEGER NOT NULL DEFAULT 0,
      execution_time_ms INTEGER,
      project_name   TEXT,
      context        TEXT,
      tools_used     TEXT,
      error_message  TEXT,
      started_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS success_patterns (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_type     TEXT NOT NULL,
      description      TEXT NOT NULL,
      frequency        INTEGER DEFAULT 1,
      confidence_score REAL DEFAULT 0.5,
      created_at       TEXT DEFAULT CURRENT_TIMESTAMP,
      last_used        TEXT,
      metadata         TEXT
    );
    CREATE TABLE IF NOT EXISTS agent_mistakes (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      mistake_type        TEXT NOT NULL,
      description         TEXT NOT NULL,
      impact_severity     TEXT NOT NULL,
      prevention_strategy TEXT,
      identified_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function buildMemoryManager(): {
  manager: MemoryManager;
  addManySpy: ReturnType<typeof vi.fn>;
  semanticAddSpy: ReturnType<typeof vi.fn>;
  proceduralUpsertSpy: ReturnType<typeof vi.fn>;
} {
  const addManySpy = vi.fn();
  const semanticAddSpy = vi.fn(async () => ({ id: Math.random() }));
  const proceduralUpsertSpy = vi.fn();

  const manager = {
    episodic: { addMany: addManySpy },
    semantic: { add: semanticAddSpy },
    procedural: { upsert: proceduralUpsertSpy },
  } as unknown as MemoryManager;

  return { manager, addManySpy, semanticAddSpy, proceduralUpsertSpy };
}

function insertExecution(
  db: Database.Database,
  opts: { executionId: string; agentId: string; startedAt: string; success?: boolean },
): void {
  db.prepare(
    `INSERT INTO agent_executions
     (execution_id, agent_id, task_type, success, execution_time_ms, started_at)
     VALUES (?, ?, 'test-task', ?, 100, ?)`,
  ).run(opts.executionId, opts.agentId, opts.success ? 1 : 0, opts.startedAt);
}

describe('LearningBridge — schema contract', () => {
  let db: Database.Database;

  beforeEach(() => {
    cleanup();
    db = new Database(LEARNING_DB);
    createCanonicalSchema(db);
  });

  afterEach(() => {
    db.close();
    cleanup();
  });

  it('can query agent_executions using canonical column names (agent_id, execution_time_ms, started_at)', () => {
    insertExecution(db, { executionId: 'e1', agentId: 'nova-agent', startedAt: '2026-01-01T00:00:00' });

    const row = db
      .prepare('SELECT execution_id, agent_id, execution_time_ms, started_at FROM agent_executions WHERE agent_id = ?')
      .get('nova-agent') as { execution_id: string; agent_id: string; execution_time_ms: number; started_at: string };

    expect(row.execution_id).toBe('e1');
    expect(row.agent_id).toBe('nova-agent');
    expect(row.execution_time_ms).toBe(100);
  });

  it('can query agent_mistakes using canonical column names (impact_severity, prevention_strategy)', () => {
    db.prepare(
      `INSERT INTO agent_mistakes (mistake_type, description, impact_severity, prevention_strategy, identified_at)
       VALUES ('bad-pattern', 'Do not do X', 'high', 'Do Y instead', '2026-01-01T00:00:00')`,
    ).run();

    const row = db
      .prepare('SELECT impact_severity, prevention_strategy FROM agent_mistakes')
      .get() as { impact_severity: string; prevention_strategy: string };

    expect(row.impact_severity).toBe('high');
    expect(row.prevention_strategy).toBe('Do Y instead');
  });

  it('healthCheck reports all canonical tables present', () => {
    const { manager } = buildMemoryManager();
    const bridge = new LearningBridge(manager, LEARNING_DB);

    const health = bridge.healthCheck();

    expect(health.healthy).toBe(true);
    expect(health.tables['agent_executions']).toBe(0);
    expect(health.tables['success_patterns']).toBe(0);
    expect(health.tables['agent_mistakes']).toBe(0);

    bridge.close();
  });
});

describe('LearningBridge — sinceTimestamp watermark', () => {
  let db: Database.Database;

  beforeEach(() => {
    cleanup();
    db = new Database(LEARNING_DB);
    createCanonicalSchema(db);
  });

  afterEach(() => {
    db.close();
    cleanup();
  });

  it('ingestExecutions without sinceTimestamp ingests all rows', async () => {
    insertExecution(db, { executionId: 'e1', agentId: 'nova-agent', startedAt: '2026-01-01T00:00:00' });
    insertExecution(db, { executionId: 'e2', agentId: 'nova-agent', startedAt: '2026-01-02T00:00:00' });
    db.close();

    const { manager, addManySpy } = buildMemoryManager();
    const bridge = new LearningBridge(manager, LEARNING_DB);

    const count = await bridge.ingestExecutions(100);

    expect(count).toBe(2);
    expect(addManySpy).toHaveBeenCalledOnce();
    expect(addManySpy.mock.calls[0][0]).toHaveLength(2);

    bridge.close();
  });

  it('ingestExecutions with sinceTimestamp only ingests newer rows', async () => {
    insertExecution(db, { executionId: 'old', agentId: 'nova-agent', startedAt: '2026-01-01T00:00:00' });
    insertExecution(db, { executionId: 'new', agentId: 'nova-agent', startedAt: '2026-01-03T00:00:00' });
    db.close();

    const { manager, addManySpy } = buildMemoryManager();
    const bridge = new LearningBridge(manager, LEARNING_DB);

    const count = await bridge.ingestExecutions(100, '2026-01-02T00:00:00');

    expect(count).toBe(1);
    const ingested = addManySpy.mock.calls[0][0] as Array<{ metadata: { learningId: string } }>;
    expect(ingested[0].metadata.learningId).toBe('new');

    bridge.close();
  });

  it('second sync with previous timestamp ingests zero new executions', async () => {
    insertExecution(db, { executionId: 'e1', agentId: 'nova-agent', startedAt: '2026-01-01T10:00:00' });
    db.close();

    const { manager, addManySpy } = buildMemoryManager();
    const bridge = new LearningBridge(manager, LEARNING_DB);

    // First sync — no watermark
    await bridge.syncFromLearningSystem();
    const firstCallCount = addManySpy.mock.calls.length;
    expect(firstCallCount).toBeGreaterThan(0);

    // Second sync — watermark is "now" (after all existing rows)
    const watermark = new Date().toISOString();
    addManySpy.mockClear();
    const result = await bridge.syncFromLearningSystem(watermark);

    expect(result.executionsIngested).toBe(0);
    expect(addManySpy).not.toHaveBeenCalled();

    bridge.close();
  });
});

describe('LearningBridge — getAgentContext', () => {
  let db: Database.Database;

  beforeEach(() => {
    cleanup();
    db = new Database(LEARNING_DB);
    createCanonicalSchema(db);
  });

  afterEach(() => {
    db.close();
    cleanup();
  });

  it('returns executions only for the requested agent_id', () => {
    insertExecution(db, { executionId: 'nova1', agentId: 'nova-agent', startedAt: '2026-01-01T00:00:00', success: true });
    insertExecution(db, { executionId: 'other1', agentId: 'crypto-expert', startedAt: '2026-01-01T00:00:00' });
    db.close();

    const { manager } = buildMemoryManager();
    const bridge = new LearningBridge(manager, LEARNING_DB);

    const ctx = bridge.getAgentContext('nova-agent');

    expect(ctx.agent).toBe('nova-agent');
    expect(ctx.stats.totalExecutions).toBe(1);
    expect(ctx.recentExecutions).toHaveLength(1);

    bridge.close();
  });

  it('stats.successRate reflects actual success column values', () => {
    insertExecution(db, { executionId: 'ok', agentId: 'nova-agent', startedAt: '2026-01-01T00:00:00', success: true });
    insertExecution(db, { executionId: 'fail', agentId: 'nova-agent', startedAt: '2026-01-02T00:00:00', success: false });
    db.close();

    const { manager } = buildMemoryManager();
    const bridge = new LearningBridge(manager, LEARNING_DB);

    const ctx = bridge.getAgentContext('nova-agent');

    expect(ctx.stats.totalExecutions).toBe(2);
    expect(ctx.stats.successRate).toBeCloseTo(0.5);

    bridge.close();
  });
});
