import { describe, it, expect, afterEach } from 'vitest';
import { DatabaseManager } from '../database/DatabaseManager.js';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const TEST_DB_PATH = path.join(os.tmpdir(), 'vibetech-memory-test.db');

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;

  afterEach(() => {
    if (dbManager) {
      dbManager.close();
    }
    // Cleanup test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    // Also clean up WAL/SHM files
    const walPath = TEST_DB_PATH + '-wal';
    const shmPath = TEST_DB_PATH + '-shm';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  it('should initialize database and create tables', async () => {
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    await dbManager.init();

    const db = dbManager.getDb();
    expect(db).toBeDefined();

    // Verify tables exist
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('episodic_memory');
    expect(tableNames).toContain('semantic_memory');
    expect(tableNames).toContain('procedural_memory');
    expect(tableNames).toContain('health_metrics');
  });

  it('should return correct stats for empty database', async () => {
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    await dbManager.init();

    const stats = dbManager.getStats();

    expect(stats.episodicCount).toBe(0);
    expect(stats.semanticCount).toBe(0);
    expect(stats.proceduralCount).toBe(0);
    expect(stats.dbSizeBytes).toBeGreaterThan(0);
  });

  it('should throw if getDb called before init', () => {
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });

    expect(() => dbManager.getDb()).toThrow('Database not initialized');
  });

  it('should close database connection', async () => {
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    await dbManager.init();

    dbManager.close();

    expect(() => dbManager.getDb()).toThrow('Database not initialized');
  });
});
