/**
 * Performance Benchmarks for @vibetech/memory
 *
 * Run with: pnpm exec tsx src/__tests__/benchmark.ts
 *
 * Measures:
 *  1. Episodic write throughput (single + batch)
 *  2. Episodic read/search performance
 *  3. Semantic memory search (vector similarity)
 *  4. Memory decay scoring
 *  5. Hierarchical summarization
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HierarchicalSummarizer } from '../consolidation/HierarchicalSummarizer.js';
import { MemoryDecay } from '../consolidation/MemoryDecay.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { EpisodicStore } from '../stores/EpisodicStore.js';

const BENCH_DB = path.join(os.tmpdir(), 'vibetech-benchmark.db');

interface BenchResult {
  name: string;
  ops: number;
  totalMs: number;
  opsPerSec: number;
  avgMs: number;
}

function bench(name: string, fn: () => void, iterations = 1000): BenchResult {
  // Warmup
  for (let i = 0; i < Math.min(10, iterations); i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const totalMs = performance.now() - start;

  return {
    name,
    ops: iterations,
    totalMs: Math.round(totalMs * 100) / 100,
    opsPerSec: Math.round((iterations / totalMs) * 1000),
    avgMs: Math.round((totalMs / iterations) * 1000) / 1000,
  };
}

function cleanup() {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = BENCH_DB + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

async function runBenchmarks() {
  console.log('═══════════════════════════════════════════════');
  console.log('  @vibetech/memory — Performance Benchmarks');
  console.log('═══════════════════════════════════════════════\n');

  cleanup();
  const dbManager = new DatabaseManager({ dbPath: BENCH_DB });
  await dbManager.init();
  const db = dbManager.getDb();
  const store = new EpisodicStore(db);
  const results: BenchResult[] = [];

  // ── 1. Episodic: Single Write ───────────────────────────

  let writeId = 0;
  results.push(
    bench(
      'Episodic: single write',
      () => {
        store.add({
          sourceId: 'benchmark',
          timestamp: Date.now(),
          query: `Question ${writeId++}`,
          response: `Answer to question about topic ${writeId % 50}`,
        });
      },
      5000,
    ),
  );

  // ── 2. Episodic: Batch Write ────────────────────────────

  results.push(
    bench(
      'Episodic: batch write (100)',
      () => {
        const batch = Array.from({ length: 100 }, (_, i) => ({
          sourceId: 'benchmark',
          timestamp: Date.now(),
          query: `Batch Q${i}`,
          response: `Batch A${i} with some content about various topics`,
        }));
        store.addMany(batch);
      },
      50,
    ),
  );

  // ── 3. Episodic: Read Recent ────────────────────────────

  results.push(bench('Episodic: getRecent(50)', () => store.getRecent(50), 1000));

  // ── 4. Episodic: Text Search ────────────────────────────

  results.push(bench('Episodic: search("topic")', () => store.search('topic'), 500));

  // ── 5. Episodic: Count ──────────────────────────────────

  results.push(bench('Episodic: count()', () => store.count(), 5000));

  // ── 6. Decay: Score Calculation ─────────────────────────

  const decay = new MemoryDecay();
  results.push(
    bench(
      'Decay: calculateScore',
      () => {
        decay.calculateScore(
          Math.random() * 30 * 24 * 60 * 60 * 1000,
          Math.floor(Math.random() * 20),
          Math.floor(Math.random() * 10),
        );
      },
      50000,
    ),
  );

  // ── 7. Decay: Score All (requires semantic data) ────────

  // Seed some semantic memories for decay scoring
  const embedding = Buffer.from(new Float32Array([0.1, 0.2, 0.3, 0.4]).buffer);
  const seedStmt = db.prepare(
    'INSERT INTO semantic_memory (text, embedding, importance, created, access_count) VALUES (?, ?, ?, ?, ?)',
  );
  for (let i = 0; i < 500; i++) {
    seedStmt.run(
      `Semantic knowledge #${i} about software engineering`,
      embedding,
      Math.floor(Math.random() * 10) + 1,
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      Math.floor(Math.random() * 20),
    );
  }

  results.push(bench('Decay: scoreAll (500 memories)', () => decay.scoreAll(db), 100));

  // ── 8. Hierarchical Summarizer ──────────────────────────

  const summarizer = new HierarchicalSummarizer({ minSessionSize: 2, minTopicSessions: 2 });
  {
    const start = performance.now();
    for (let i = 0; i < 10; i++) await summarizer.run(db);
    const totalMs = performance.now() - start;
    results.push({
      name: 'Summarizer: run()',
      ops: 10,
      totalMs: Math.round(totalMs * 100) / 100,
      opsPerSec: Math.round((10 / totalMs) * 1000),
      avgMs: Math.round((totalMs / 10) * 1000) / 1000,
    });
  }

  // ── 9. Raw SQLite: Count Query ──────────────────────────

  results.push(
    bench(
      'SQLite: raw COUNT(*)',
      () => {
        db.prepare('SELECT COUNT(*) FROM episodic_memory').get();
      },
      10000,
    ),
  );

  // ── Print Results ───────────────────────────────────────

  console.log(
    '┌─────────────────────────────────────────────┬──────────┬───────────┬──────────────┬──────────┐',
  );
  console.log(
    '│ Benchmark                                   │ Ops      │ Total ms  │ Ops/sec      │ Avg ms   │',
  );
  console.log(
    '├─────────────────────────────────────────────┼──────────┼───────────┼──────────────┼──────────┤',
  );

  for (const r of results) {
    console.log(
      `│ ${r.name.padEnd(43)} │ ${String(r.ops).padStart(8)} │ ${String(r.totalMs).padStart(9)} │ ${String(r.opsPerSec).padStart(12)} │ ${String(r.avgMs).padStart(8)} │`,
    );
  }

  console.log(
    '└─────────────────────────────────────────────┴──────────┴───────────┴──────────────┴──────────┘',
  );

  const episodicCount = store.count();
  console.log(`\nDatabase: ${episodicCount.toLocaleString()} episodic + 500 semantic memories`);

  dbManager.close();
  cleanup();
  console.log('Benchmark complete. Temp DB cleaned up.');
}

runBenchmarks().catch(console.error);
