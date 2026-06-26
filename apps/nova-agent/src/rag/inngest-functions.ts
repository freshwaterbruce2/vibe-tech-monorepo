/**
 * RAG Indexing Pipeline — Inngest Step Functions
 *
 * Converts the monolithic RAGIndexer.index() into checkpointed steps:
 *
 *   1. discover-files     — walk workspace, hash-compare, return changed file list
 *   2. chunk-files        — run chunker on each changed file (batched)
 *   3. embed-batches      — call embedding API in batches of 20 (most failure-prone)
 *   4. upsert-to-lancedb  — delete old rows, insert new rows
 *   5. save-hashes        — persist file hash index
 *   6. cleanup-deleted    — remove chunks for files that no longer exist
 *
 * Each step is independently retried on failure. If embed batch 40/100 fails,
 * only that batch retries — the other 99 are already memoised.
 */

import { createHash } from 'node:crypto';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  appendFileSync,
} from 'node:fs';
import { join, relative, extname } from 'node:path';
import { connect } from '@lancedb/lancedb';
import { inngest } from '@vibetech/inngest-client';
import { RAGChunker } from './chunker.js';
import { RAGEmbedder } from './embedder.js';
import { buildPathFilter } from './filterUtils.js';
import { DEFAULT_RAG_CONFIG } from './types.js';
import type { Chunk, FileHash, RAGConfig } from './types.js';
import type { RAGIndexSummary } from '@vibetech/inngest-client';

// ─── Constants ───────────────────────────────────────────────────────────────

const INDEXABLE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.md',
  '.mdx',
  '.json',
  '.jsonc',
]);
const MAX_FILE_SIZE = 500_000;
const EMBED_BATCH_SIZE = 20;

// ─── Helpers (extracted from RAGIndexer private methods) ─────────────────────

function loadConfig(): RAGConfig {
  return DEFAULT_RAG_CONFIG;
}

function ensureDirs(config: RAGConfig): void {
  for (const dir of [
    config.lanceDbPath,
    join(config.cachePath, '..'),
    join(config.hashIndexPath, '..'),
    join(config.logPath, '..'),
  ]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

function log(config: RAGConfig, message: string): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [inngest] ${message}\n`;
  console.error(`[RAGInngest] ${message}`);
  try {
    appendFileSync(config.logPath, line);
  } catch {
    /* ignore */
  }
}

function loadFileHashes(config: RAGConfig): Map<string, FileHash> {
  try {
    if (existsSync(config.hashIndexPath)) {
      const data = JSON.parse(readFileSync(config.hashIndexPath, 'utf-8'));
      return new Map(Object.entries(data));
    }
  } catch {
    /* ignore */
  }
  return new Map();
}

function saveFileHashes(config: RAGConfig, hashes: Map<string, FileHash>): void {
  writeFileSync(config.hashIndexPath, JSON.stringify(Object.fromEntries(hashes), null, 2));
}

export function isExcluded(relPath: string, config: RAGConfig): boolean {
  for (const pattern of config.excludePatterns) {
    const regex = pattern
      .replace(/\*\*/g, '{{DOUBLESTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\{\{DOUBLESTAR\}\}/g, '.*');
    if (new RegExp(`^${regex}$`).test(relPath)) return true;
    if (new RegExp(`(^|/)${regex}`).test(relPath)) return true;
  }
  return false;
}

function walkDirectory(dir: string, config: RAGConfig, results: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = relative(config.workspaceRoot, fullPath).replace(/\\/g, '/');
    if (isExcluded(relPath, config)) continue;

    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      walkDirectory(fullPath, config, results);
    } else if (stat.isFile()) {
      const ext = extname(entry).toLowerCase();
      if (INDEXABLE_EXTENSIONS.has(ext) && stat.size <= MAX_FILE_SIZE) {
        results.push(fullPath);
      }
    }
  }
}

function discoverFiles(config: RAGConfig): string[] {
  const files: string[] = [];
  for (const indexPath of config.indexPaths) {
    const fullPath = join(config.workspaceRoot, indexPath);
    if (!existsSync(fullPath)) continue;
    walkDirectory(fullPath, config, files);
  }
  return files;
}

function isFileChanged(
  filePath: string,
  config: RAGConfig,
  hashes: Map<string, FileHash>,
): boolean {
  const relPath = relative(config.workspaceRoot, filePath).replace(/\\/g, '/');
  const existing = hashes.get(relPath);
  if (!existing) return true;
  try {
    const content = readFileSync(filePath, 'utf-8');
    const hash = createHash('sha256').update(content).digest('hex');
    return hash !== existing.hash;
  } catch {
    return true;
  }
}

/** Row stored in LanceDB */
interface LanceRow {
  [key: string]: unknown;
  id: string;
  filePath: string;
  content: string;
  type: string;
  startLine: number;
  endLine: number;
  symbolName: string;
  language: string;
  tokenCount: number;
  createdAt: number;
  vector: number[];
}

interface EmbeddingBatch {
  vectors: number[][];
  failedIndices: number[];
}

/** Walk the workspace and split files into changed vs all (relative paths). */
function discoverChangedFiles(
  config: RAGConfig,
  full: boolean,
): { changedFiles: string[]; allFiles: string[] } {
  ensureDirs(config);
  const all = discoverFiles(config);
  const hashes = loadFileHashes(config);

  const changed = full ? all : all.filter((f) => isFileChanged(f, config, hashes));

  log(config, `Discovered ${all.length} files, ${changed.length} changed`);

  const toRel = (f: string) => relative(config.workspaceRoot, f).replace(/\\/g, '/');
  return {
    changedFiles: changed.map(toRel),
    allFiles: all.map(toRel),
  };
}

/** Chunk every changed file, collecting chunks, updated hashes, and errors. */
function chunkChangedFiles(
  config: RAGConfig,
  changedFiles: string[],
): {
  chunksJson: string;
  chunkCount: number;
  hashesJson: string;
  errors: Array<{ filePath: string; error: string }>;
} {
  const chunker = new RAGChunker(config);
  const allChunks: Chunk[] = [];
  const errors: Array<{ filePath: string; error: string }> = [];
  const updatedHashes: Array<[string, FileHash]> = [];

  for (const relPath of changedFiles) {
    const absPath = join(config.workspaceRoot, relPath);
    try {
      const content = readFileSync(absPath, 'utf-8');
      const chunks = chunker.chunkFile(relPath, content);
      allChunks.push(...chunks);

      const hash = createHash('sha256').update(content).digest('hex');
      updatedHashes.push([
        relPath,
        {
          filePath: relPath,
          hash,
          lastIndexed: Date.now(),
          chunkCount: chunks.length,
        },
      ]);
    } catch (error) {
      errors.push({ filePath: relPath, error: (error as Error).message });
    }
  }

  log(config, `Chunked ${updatedHashes.length} files into ${allChunks.length} chunks`);

  return {
    // Serialise chunks — step results must be JSON-serialisable
    chunksJson: JSON.stringify(allChunks),
    chunkCount: allChunks.length,
    hashesJson: JSON.stringify(updatedHashes),
    errors,
  };
}

/** Reassemble embedding batches into LanceDB rows, skipping failed vectors. */
function buildLanceRows(embeddingResults: EmbeddingBatch[], chunks: Chunk[]): LanceRow[] {
  const rows: LanceRow[] = [];

  for (let batchIdx = 0; batchIdx < embeddingResults.length; batchIdx++) {
    const batch = embeddingResults[batchIdx];
    if (!batch) continue;
    const batchStart = batchIdx * EMBED_BATCH_SIZE;

    for (let localIdx = 0; localIdx < batch.vectors.length; localIdx++) {
      const vector = batch.vectors[localIdx];
      if (!vector || batch.failedIndices.includes(localIdx) || vector.length === 0) {
        continue;
      }

      const chunk = chunks[batchStart + localIdx];
      if (!chunk) {
        continue;
      }
      rows.push({
        id: chunk.id,
        filePath: chunk.filePath,
        content: chunk.content,
        type: chunk.type,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        symbolName: chunk.symbolName ?? '',
        language: chunk.language,
        tokenCount: chunk.tokenCount,
        createdAt: chunk.createdAt,
        vector,
      });
    }
  }

  return rows;
}

/** Delete stale rows for changed files, then add the freshly built rows.
 *  Returns the number of rows upserted and the set of file paths that produced
 *  at least one successful row.
 */
async function upsertRowsToLance(
  config: RAGConfig,
  rows: LanceRow[],
  changedFiles: string[],
): Promise<{ rowsUpserted: number; successfulPaths: string[] }> {
  const db = await connect(config.lanceDbPath);
  const tables = await db.tableNames();
  const changedSet = new Set(changedFiles);

  if (tables.includes('codebase')) {
    const table = await db.openTable('codebase');
    // Delete old entries for changed files
    for (const path of changedSet) {
      try {
        await table.delete(buildPathFilter(path));
      } catch {
        /* ignore */
      }
    }
    if (rows.length > 0) {
      await table.add(rows);
    }
  } else if (rows.length > 0) {
    await db.createTable('codebase', rows, { mode: 'overwrite' });
  }

  const successfulPaths = [...new Set(rows.map((r) => r.filePath))];
  log(config, `Upserted ${rows.length} rows to LanceDB`);
  return { rowsUpserted: rows.length, successfulPaths };
}

/** Merge freshly computed file hashes back into the persisted hash index.
 *  Only persists hashes for files that produced at least one successful LanceDB
 *  row; files whose embedding/chunking failed are left unchanged so they will
 *  be retried on the next run.
 */
function applyUpdatedHashes(
  config: RAGConfig,
  hashesJson: string,
  successfulPaths: string[],
): number {
  const hashes = loadFileHashes(config);
  const updatedHashes: Array<[string, FileHash]> = JSON.parse(hashesJson);
  const successSet = new Set(successfulPaths);
  let saved = 0;
  for (const [key, value] of updatedHashes) {
    if (successSet.has(key)) {
      hashes.set(key, value);
      saved++;
    }
  }
  saveFileHashes(config, hashes);
  log(config, `Saved ${saved} updated file hashes`);
  return saved;
}

/**
 * Minimal shape of the Inngest `step` object used by the embed loop. The
 * batch result is plain JSON, so the runner's serialised return is assignable
 * to {@link EmbeddingBatch}.
 */
interface EmbedStepRunner {
  run(id: string, fn: () => Promise<EmbeddingBatch>): Promise<EmbeddingBatch>;
}

/** Embed all chunk texts in independent, retryable batches. */
async function embedAllBatches(
  step: EmbedStepRunner,
  config: RAGConfig,
  texts: string[],
): Promise<EmbeddingBatch[]> {
  const batchCount = Math.ceil(texts.length / EMBED_BATCH_SIZE);
  const embeddingResults: EmbeddingBatch[] = [];

  for (let batchIdx = 0; batchIdx < batchCount; batchIdx++) {
    const start = batchIdx * EMBED_BATCH_SIZE;
    const end = Math.min(start + EMBED_BATCH_SIZE, texts.length);

    const batchResult = await step.run(`embed-batch-${batchIdx}`, async () => {
      const embedder = new RAGEmbedder(config);
      const batchTexts = texts.slice(start, end);
      const result = await embedder.embedBatch(batchTexts);

      return {
        vectors: result.results.map((r) => r.vector),
        failedIndices: result.failedIndices,
      };
    });

    embeddingResults.push(batchResult);
  }

  return embeddingResults;
}

/** Empty-run result used when no files changed. */
function emptySummaryResult(runId: string): {
  runId: string;
  summary: RAGIndexSummary;
} {
  return {
    runId,
    summary: {
      filesProcessed: 0,
      chunksCreated: 0,
      chunksRemoved: 0,
      errors: [],
      durationMs: 0,
    },
  };
}

/** Remove LanceDB rows + hash entries for files that no longer exist. */
async function cleanupDeletedFiles(config: RAGConfig, allFiles: string[]): Promise<number> {
  const hashes = loadFileHashes(config);
  const existingPaths = new Set(allFiles);
  let removed = 0;

  const db = await connect(config.lanceDbPath);
  const tables = await db.tableNames();
  const hasTable = tables.includes('codebase');

  for (const [path] of hashes) {
    if (!existingPaths.has(path)) {
      hashes.delete(path);
      if (hasTable) {
        try {
          const table = await db.openTable('codebase');
          await table.delete(buildPathFilter(path));
          removed++;
        } catch {
          /* ignore */
        }
      }
    }
  }

  if (removed > 0) {
    saveFileHashes(config, hashes);
    log(config, `Cleaned up ${removed} deleted files`);
  }

  return removed;
}

// ─── Inngest Function ────────────────────────────────────────────────────────

export const ragIndexPipeline = inngest.createFunction(
  {
    id: 'rag-index-pipeline',
    retries: 2,
    concurrency: [{ limit: 1 }], // only one index run at a time
  },
  { event: 'rag/index.requested' },
  async ({ event, step }) => {
    const config = loadConfig();
    const runId = crypto.randomUUID();

    // ── Step 1: Discover changed files ────────────────────────────────────
    const { changedFiles, allFiles } = await step.run('discover-files', () =>
      discoverChangedFiles(config, event.data.full),
    );

    if (changedFiles.length === 0) {
      return emptySummaryResult(runId);
    }

    // ── Step 2: Chunk all changed files ───────────────────────────────────
    const chunkResult = await step.run('chunk-files', () =>
      chunkChangedFiles(config, changedFiles),
    );

    // ── Step 3: Embed in batches (each batch is its own retryable step) ───
    const chunks: Chunk[] = JSON.parse(chunkResult.chunksJson);
    const texts = chunks.map((c) => c.content);
    const embeddingResults = await embedAllBatches(step, config, texts);

    // ── Step 4: Upsert to LanceDB ────────────────────────────────────────
    const upsertResult = await step.run('upsert-to-lancedb', async () => {
      const rows = buildLanceRows(embeddingResults, chunks);
      return upsertRowsToLance(config, rows, changedFiles);
    });

    // ── Step 5: Save file hashes ──────────────────────────────────────────
    await step.run('save-hashes', () =>
      applyUpdatedHashes(config, chunkResult.hashesJson, upsertResult.successfulPaths),
    );

    // ── Step 6: Cleanup deleted files ─────────────────────────────────────
    const cleanupResult = await step.run('cleanup-deleted', async () => {
      const chunksRemoved = await cleanupDeletedFiles(config, allFiles);
      return { chunksRemoved };
    });

    // ── Build summary ─────────────────────────────────────────────────────
    const summary: RAGIndexSummary = {
      filesProcessed: changedFiles.length,
      chunksCreated: upsertResult.rowsUpserted,
      chunksRemoved: cleanupResult.chunksRemoved,
      errors: chunkResult.errors,
      durationMs: 0, // Inngest tracks this externally
    };

    // Emit completion event
    await step.sendEvent('notify-completion', {
      name: 'rag/index.completed' as const,
      data: { runId, summary },
    });

    log(
      config,
      `Pipeline complete: ${summary.filesProcessed} files, ${summary.chunksCreated} chunks`,
    );
    return { runId, summary };
  },
);
