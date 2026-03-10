import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemoryManager } from '../core/MemoryManager.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { MarkdownExporter } from '../export/MarkdownExporter.js';
import { EpisodicStore } from '../stores/EpisodicStore.js';
import { ProceduralStore } from '../stores/ProceduralStore.js';

const TEST_DB_PATH = path.join(os.tmpdir(), 'vibetech-exporter-test.db');

function cleanupDb() {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = TEST_DB_PATH + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function makeMemoryManager(db: ReturnType<DatabaseManager['getDb']>): MemoryManager {
  const episodic = new EpisodicStore(db);
  const procedural = new ProceduralStore(db);

  return {
    episodic,
    procedural,
    semantic: {
      db,
      search: vi.fn().mockResolvedValue([]),
    },
    getStats: () => ({
      database: {
        episodicCount: 0,
        semanticCount: 0,
        proceduralCount: 0,
        dbSizeBytes: 4096,
      },
      embedding: {
        provider: 'ollama',
        dimension: 768,
        cache: { hits: 0, misses: 0, memCacheSize: 0, hitRate: 0 },
      },
      vectorExtension: true,
    }),
    healthCheck: vi.fn().mockResolvedValue({ healthy: true, database: true, embedding: true }),
  } as unknown as MemoryManager;
}

describe('MarkdownExporter', () => {
  let dbManager: DatabaseManager;
  let memory: MemoryManager;
  let exporter: MarkdownExporter;

  beforeEach(async () => {
    cleanupDb();
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    await dbManager.init();
    memory = makeMemoryManager(dbManager.getDb());
    exporter = new MarkdownExporter(memory);
  });

  afterEach(() => {
    dbManager.close();
    cleanupDb();
  });

  // ── generateReport ─────────────────────────────

  describe('generateReport', () => {
    it('generates report header with timestamp', async () => {
      const report = await exporter.generateReport();
      expect(report).toContain('# Memory System Report');
      expect(report).toContain('Generated:');
    });

    it('includes system status section', async () => {
      const report = await exporter.generateReport();
      expect(report).toContain('## System Status');
      expect(report).toContain('HEALTHY');
    });

    it('includes semantic memories section when enabled', async () => {
      const report = await exporter.generateReport({ includeSemantic: true });
      expect(report).toContain('## Semantic Memories');
    });

    it('excludes semantic memories section when disabled', async () => {
      const report = await exporter.generateReport({ includeSemantic: false });
      expect(report).not.toContain('## Semantic Memories');
    });

    it('includes episodic section with recent memories', async () => {
      // Add some episodic data
      memory.episodic.add({
        sourceId: 'test',
        timestamp: Date.now(),
        query: 'test question',
        response: 'test answer',
      });

      const report = await exporter.generateReport();
      expect(report).toContain('## Recent Activity');
      expect(report).toContain('test question');
    });

    it('includes procedural section with patterns', async () => {
      memory.procedural.upsert({
        pattern: 'pnpm build',
        context: 'build project',
        successRate: 0.95,
      });

      const report = await exporter.generateReport();
      expect(report).toContain('## Procedural Patterns');
      expect(report).toContain('pnpm build');
    });
  });

  // ── generateSessionSummary ─────────────────────

  describe('generateSessionSummary', () => {
    it('returns "no memories" for unknown session', () => {
      const report = exporter.generateSessionSummary('nonexistent');
      expect(report).toContain('No memories found');
    });

    it('generates timeline for session with events', () => {
      const now = Date.now();
      memory.episodic.add({
        sourceId: 'test',
        timestamp: now,
        query: 'first question',
        response: 'first answer',
        sessionId: 'session-1',
      });
      memory.episodic.add({
        sourceId: 'test',
        timestamp: now + 60_000,
        query: 'second question',
        response: 'second answer',
        sessionId: 'session-1',
      });

      const report = exporter.generateSessionSummary('session-1');
      expect(report).toContain('# Session Report: session-1');
      expect(report).toContain('## Timeline');
      expect(report).toContain('first question');
      expect(report).toContain('second question');
      expect(report).toContain('Events:** 2');
    });

    it('calculates session duration in minutes', () => {
      const now = Date.now();
      memory.episodic.add({
        sourceId: 'test',
        timestamp: now,
        query: 'start',
        response: 'r',
        sessionId: 'dur-test',
      });
      memory.episodic.add({
        sourceId: 'test',
        timestamp: now + 10 * 60_000, // 10 minutes later
        query: 'end',
        response: 'r',
        sessionId: 'dur-test',
      });

      const report = exporter.generateSessionSummary('dur-test');
      expect(report).toContain('10 minutes');
    });
  });

  // ── generateKnowledgeBase ─────────────────────

  describe('generateKnowledgeBase', () => {
    it('generates knowledge base header', async () => {
      const report = await exporter.generateKnowledgeBase();
      expect(report).toContain('# Knowledge Base');
    });

    it('groups semantic memories by category', async () => {
      const db = dbManager.getDb();
      // Insert directly since we don't have full EmbeddingService wired
      db.prepare(
        'INSERT INTO semantic_memory (text, embedding, category, importance, created, access_count) VALUES (?, zeroblob(16), ?, ?, ?, 0)',
      ).run('React hooks guide', 'architecture', 8, Date.now());
      db.prepare(
        'INSERT INTO semantic_memory (text, embedding, category, importance, created, access_count) VALUES (?, zeroblob(16), ?, ?, ?, 0)',
      ).run('Git rebase workflow', 'workflow', 6, Date.now());

      const report = await exporter.generateKnowledgeBase();
      expect(report).toContain('## Architecture');
      expect(report).toContain('React hooks guide');
      expect(report).toContain('## Workflow');
      expect(report).toContain('Git rebase workflow');
    });

    it('filters by category when specified', async () => {
      const db = dbManager.getDb();
      db.prepare(
        'INSERT INTO semantic_memory (text, embedding, category, importance, created, access_count) VALUES (?, zeroblob(16), ?, ?, ?, 0)',
      ).run('Include me', 'target', 5, Date.now());
      db.prepare(
        'INSERT INTO semantic_memory (text, embedding, category, importance, created, access_count) VALUES (?, zeroblob(16), ?, ?, ?, 0)',
      ).run('Exclude me', 'other', 5, Date.now());

      const report = await exporter.generateKnowledgeBase('target');
      expect(report).toContain('Include me');
      expect(report).not.toContain('Exclude me');
    });
  });
});
