#!/usr/bin/env npx tsx
/**
 * One-time migration: Re-embed all semantic memories from old dimensions (768d/384d) to 1536d.
 *
 * Usage:
 *   npx tsx scripts/migrate-embeddings.ts [--dry-run]
 *
 * What it does:
 *   1. Opens D:\databases\memory.db
 *   2. Reads all rows from semantic_memory where embedding dimension != 1536
 *   3. Re-embeds text via OpenRouter (text-embedding-3-small, 1536d)
 *   4. Updates the embedding BLOB in-place
 *   5. Clears the embedding_cache table (stale dimensions)
 *
 * Prerequisites:
 *   - OpenRouter proxy running at http://localhost:3001
 *   - OPENROUTER_API_KEY set in environment (proxy reads it)
 */

import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';

const DB_PATH = process.env.MEMORY_DB_PATH ?? 'D:\\databases\\memory.db';
const ENDPOINT = process.env.EMBEDDING_ENDPOINT ?? 'http://localhost:3001';
const MODEL = 'text-embedding-3-small';
const TARGET_DIM = 1536;
const BATCH_SIZE = 20;
const DRY_RUN = process.argv.includes('--dry-run');

async function embedBatch(texts: string[]): Promise<number[][]> {
  const url = `${ENDPOINT}/api/v1/embeddings`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: texts, model: MODEL }),
  });

  if (!resp.ok) {
    throw new Error(`Embedding API error: ${resp.status} ${await resp.text()}`);
  }

  const json = (await resp.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return json.data.map((d) => d.embedding);
}

function floatsToBlob(floats: number[]): Buffer {
  const buf = Buffer.alloc(floats.length * 4);
  for (let i = 0; i < floats.length; i++) {
    buf.writeFloatLE(floats[i]!, i * 4);
  }
  return buf;
}

function blobDimension(blob: Buffer | null): number {
  if (!blob || blob.length === 0) return 0;
  return blob.length / 4; // float32 = 4 bytes
}

async function main() {
  if (!existsSync(DB_PATH)) {
    console.error(`Database not found: ${DB_PATH}`);
    process.exit(1);
  }

  console.log(`Opening database: ${DB_PATH}`);
  console.log(`Target dimension: ${TARGET_DIM}d`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Check table exists
  const tableCheck = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='semantic_memory'")
    .get() as { name: string } | undefined;

  if (!tableCheck) {
    console.error('Table semantic_memory not found');
    db.close();
    process.exit(1);
  }

  // Get rows needing migration (filter in SQL to avoid loading all BLOBs into memory)
  const totalCount = (
    db.prepare('SELECT COUNT(*) as count FROM semantic_memory WHERE embedding IS NOT NULL').get() as { count: number }
  ).count;
  const toMigrate = db
    .prepare('SELECT id, text, embedding FROM semantic_memory WHERE embedding IS NOT NULL AND length(embedding) / 4 != ?')
    .all(TARGET_DIM) as Array<{ id: number; text: string; embedding: Buffer }>;
  const alreadyCorrect = totalCount - toMigrate.length;

  console.log(`Total rows with embeddings: ${totalCount}`);

  console.log(`Already ${TARGET_DIM}d: ${alreadyCorrect}`);
  console.log(`Need migration: ${toMigrate.length}`);

  if (toMigrate.length === 0) {
    console.log('\nNothing to migrate!');
    db.close();
    return;
  }

  // Dimension breakdown
  const dimCounts = new Map<number, number>();
  for (const r of toMigrate) {
    const dim = blobDimension(r.embedding);
    dimCounts.set(dim, (dimCounts.get(dim) ?? 0) + 1);
  }
  console.log('\nDimension breakdown:');
  for (const [dim, count] of dimCounts) {
    console.log(`  ${dim}d: ${count} rows`);
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes made.');
    db.close();
    return;
  }

  // Test connectivity
  console.log('\nTesting embedding endpoint...');
  try {
    const test = await embedBatch(['test']);
    if (test[0]?.length !== TARGET_DIM) {
      console.error(`Expected ${TARGET_DIM}d, got ${test[0]?.length}d. Check model config.`);
      db.close();
      process.exit(1);
    }
    console.log(`Endpoint OK (${TARGET_DIM}d confirmed)`);
  } catch (err) {
    console.error('Embedding endpoint unreachable:', err);
    db.close();
    process.exit(1);
  }

  // Migrate in batches
  const updateStmt = db.prepare('UPDATE semantic_memory SET embedding = ? WHERE id = ?');
  let migrated = 0;
  let failed = 0;

  for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
    const batch = toMigrate.slice(i, i + BATCH_SIZE);
    const texts = batch.map((r) => r.text);

    try {
      const embeddings = await embedBatch(texts);

      const tx = db.transaction(() => {
        for (let j = 0; j < batch.length; j++) {
          const blob = floatsToBlob(embeddings[j]!);
          updateStmt.run(blob, batch[j]!.id);
        }
      });
      tx();

      migrated += batch.length;
      process.stdout.write(`\rMigrated: ${migrated}/${toMigrate.length}`);
    } catch (err) {
      console.error(`\nBatch ${i}-${i + batch.length} failed:`, err);
      failed += batch.length;
    }

    // Brief pause between batches to avoid rate limits
    if (i + BATCH_SIZE < toMigrate.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`\n\nMigration complete: ${migrated} migrated, ${failed} failed`);

  // Clear embedding cache (stale dimensions)
  const cacheCheck = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='embedding_cache'")
    .get() as { name: string } | undefined;

  if (cacheCheck) {
    const cacheCount = (
      db.prepare('SELECT COUNT(*) as count FROM embedding_cache').get() as { count: number }
    ).count;
    db.exec('DELETE FROM embedding_cache');
    console.log(`Cleared embedding_cache: ${cacheCount} entries removed`);
  }

  // Verify
  const remaining = db
    .prepare('SELECT COUNT(*) as count FROM semantic_memory WHERE embedding IS NOT NULL')
    .get() as { count: number };
  console.log(`\nVerification: ${remaining.count} rows with embeddings (unchanged)`);

  db.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
