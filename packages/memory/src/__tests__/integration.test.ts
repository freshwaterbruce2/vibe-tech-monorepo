import { describe, it, expect, afterEach } from 'vitest';
import { MemoryManager } from '../core/MemoryManager.js';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const TEST_DB_PATH = path.join(os.tmpdir(), 'vibetech-memory-integration-test.db');

describe('MemoryManager integration', () => {
  let manager: MemoryManager;

  afterEach(() => {
    if (manager) manager.close();
    for (const suffix of ['', '-wal', '-shm']) {
      const p = TEST_DB_PATH + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  });

  it('should initialize with Ollama and report healthy', async () => {
    manager = new MemoryManager({
      dbPath: TEST_DB_PATH,
      embeddingModel: 'nomic-embed-text',
      fallbackToTransformers: true,
    });

    await manager.init();

    const health = await manager.healthCheck();
    expect(health.healthy).toBe(true);
    expect(health.database).toBe(true);
    expect(health.embedding).toBe(true);
  });

  it('should store and search semantic memories with real embeddings', async () => {
    manager = new MemoryManager({
      dbPath: TEST_DB_PATH,
      embeddingModel: 'nomic-embed-text',
      fallbackToTransformers: true,
    });

    await manager.init();

    // Store some knowledge
    await manager.semantic.add({
      text: 'The VibeTech monorepo uses pnpm with Nx for build orchestration and caching',
      category: 'architecture',
      importance: 8,
    });

    await manager.semantic.add({
      text: 'All databases must be stored on D:\\ drive, never in C:\\dev source tree',
      category: 'rules',
      importance: 10,
    });

    await manager.semantic.add({
      text: 'React components should use named imports, never import React default',
      category: 'typescript',
      importance: 7,
    });

    // Search for related knowledge
    const results = await manager.semantic.search('where should I put database files?');

    expect(results.length).toBeGreaterThan(0);
    // The D:\ drive rule should rank highest since it's about database storage
    expect(results[0].item.text).toContain('databases');
    expect(results[0].score).toBeGreaterThan(0.3);
  }, 30000); // Allow 30s for embedding generation

  it('should store and retrieve episodic + procedural memories', async () => {
    manager = new MemoryManager({
      dbPath: TEST_DB_PATH,
      embeddingModel: 'nomic-embed-text',
      fallbackToTransformers: true,
    });

    await manager.init();

    // Episodic
    manager.episodic.add({
      sourceId: 'claude-code',
      timestamp: Date.now(),
      query: 'How do I build the memory system?',
      response: 'Run pnpm --filter @vibetech/memory build',
      sessionId: 'test-session',
    });

    // Procedural
    manager.procedural.upsert({
      pattern: 'pnpm --filter <project> build',
      context: 'Building individual Nx projects',
      successRate: 1.0,
    });

    // Verify stats
    const stats = manager.getStats();
    expect(stats.database.episodicCount).toBe(1);
    expect(stats.database.proceduralCount).toBe(1);
    expect(stats.embedding.provider).toBe('ollama');
    expect(stats.embedding.dimension).toBe(768);
  });
});
