/**
 * RAG Indexer
 * Walks the workspace, detects changed files via SHA-256 hashing,
 * chunks and embeds only changed files, writes to LanceDB.
 *
 * Opt-in: Anthropic-style contextual chunking (config.contextualChunkingEnabled).
 * When enabled, each chunk is passed to {@link Contextualizer} which produces a
 * 50-100 token explanatory prefix; that prefix is then prepended to the
 * embedding input only (chunk.content stays raw for display/snippet use).
 *
 * Operational impact when enabled:
 *   - Re-index cost (full): ~264K chunks * ~75 tokens prefix output +
 *     per-chunk prompt = ~$3-8 with claude-3-haiku via OpenRouter, depending
 *     on prompt cache hit rate. See contextualizer.ts header for the math.
 *   - Existing indexed data is NOT affected. Only files (re)indexed after
 *     enabling will store a contextPrefix. Mixing is supported.
 *   - To enable: set RAGConfig.contextualChunkingEnabled = true (or override
 *     via env in your bootstrap), then trigger a full re-index when ready.
 *   - The prefix goes into the embedding ONLY. Anthropic's full pattern also
 *     prepends it to the BM25/FTS index; LanceDB's FTS indexes the `content`
 *     column which we keep raw, so FTS contextualization is a deliberate gap
 *     (would require a new column + FTS rebuild).
 */

import { createHash } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { connect, type Connection, type Table } from '@lancedb/lancedb';
import { RAGChunker } from './chunker.js';
import { RAGEmbedder } from './embedder.js';
import { Contextualizer } from './contextualizer.js';
import { discoverFiles } from './fileDiscovery.js';
import { loadFileHashes, saveFileHashes, isFileChanged } from './hashManager.js';
import type {
  Chunk,
  FileHash,
  IndexResult,
  IndexState,
  RAGConfig,
} from './types.js';

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
  /** Anthropic-style contextual prefix (empty string if contextual chunking off). */
  contextPrefix: string;
  /** 1 if this row was generated with contextual chunking, 0 otherwise. */
  contextual: number;
  vector: number[];
}

export class RAGIndexer {
  private config: RAGConfig;
  private chunker: RAGChunker;
  private embedder: RAGEmbedder;
  private contextualizer: Contextualizer | null;
  private db: Connection | null = null;
  private table: Table | null = null;
  private fileHashes: Map<string, FileHash> = new Map();
  private isRunning = false;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private lastFullIndexTime: number | null = null;
  private lastIncrementalIndexTime: number | null = null;

  constructor(config: RAGConfig) {
    this.config = config;
    this.chunker = new RAGChunker(config);
    this.embedder = new RAGEmbedder(config);
    this.contextualizer = config.contextualChunkingEnabled
      ? new Contextualizer(config)
      : null;
  }

  async init(): Promise<void> {
    for (const dir of [
      this.config.lanceDbPath,
      join(this.config.cachePath, '..'),
      join(this.config.hashIndexPath, '..'),
      join(this.config.logPath, '..'),
    ]) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    this.db = await connect(this.config.lanceDbPath);
    this.fileHashes = loadFileHashes(this.config.hashIndexPath);

    try {
      const tables = await this.db.tableNames();
      if (tables.includes('codebase')) {
        this.table = await this.db.openTable('codebase');
      }
    } catch {
      // Table doesn't exist yet, will create on first index
    }

    this.log('Indexer initialized');
  }

  async index(options: { full?: boolean } = {}): Promise<IndexResult> {
    if (this.isRunning) {
      return {
        filesProcessed: 0, chunksCreated: 0, chunksRemoved: 0, durationMs: 0,
        errors: [{ filePath: '', error: 'Index already running' }],
      };
    }

    this.isRunning = true;
    const start = Date.now();
    const result: IndexResult = {
      filesProcessed: 0, chunksCreated: 0, chunksRemoved: 0, durationMs: 0, errors: [],
    };

    try {
      const allFiles = discoverFiles(this.config);
      this.log(`Discovered ${allFiles.length} indexable files`);

      const changedFiles = options.full
        ? allFiles
        : allFiles.filter((f) => isFileChanged(f, this.config.workspaceRoot, this.fileHashes));

      this.log(`${changedFiles.length} files need (re)indexing`);

      if (changedFiles.length === 0) {
        result.durationMs = Date.now() - start;
        this.isRunning = false;
        return result;
      }

      const allChunks: Chunk[] = [];
      for (const filePath of changedFiles) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          const relPath = relative(this.config.workspaceRoot, filePath).replace(/\\/g, '/');
          let chunks = this.chunker.chunkFile(relPath, content);

          // Opt-in: Anthropic contextual chunking. The full document is sent
          // once per chunk in the prompt body but marked as ephemeral so the
          // prompt cache returns it for chunks 2..N within the 5-minute TTL.
          if (this.contextualizer && chunks.length > 0) {
            chunks = await this.contextualizer.contextualizeFile(relPath, content, chunks);
          }

          allChunks.push(...chunks);

          const hash = createHash('sha256').update(content).digest('hex');
          this.fileHashes.set(relPath, {
            filePath: relPath, hash, lastIndexed: Date.now(), chunkCount: chunks.length,
          });
          result.filesProcessed++;
        } catch (error) {
          result.errors.push({ filePath, error: (error as Error).message });
        }
      }

      this.log(`Created ${allChunks.length} chunks from ${result.filesProcessed} files`);

      if (allChunks.length === 0) {
        result.durationMs = Date.now() - start;
        this.isRunning = false;
        return result;
      }

      // Build embedding inputs: when a chunk has a contextPrefix it is
      // prepended (separated by a blank line). chunk.content stays raw so
      // search results render the actual source.
      const texts = allChunks.map((c) => Contextualizer.buildEmbeddingText(c));
      const embeddings = await this.embedder.embedBatch(texts);
      this.log(`Embedded ${texts.length} chunks (${embeddings.failedIndices.length} failures)`);

      const rows: LanceRow[] = [];
      for (let i = 0; i < allChunks.length; i++) {
        if (embeddings.failedIndices.includes(i)) continue;
        const chunk = allChunks[i];
        const vector = embeddings.results[i]?.vector;
        if (!chunk || !vector || vector.length === 0) continue;

        rows.push({
          id: chunk.id, filePath: chunk.filePath, content: chunk.content,
          type: chunk.type, startLine: chunk.startLine, endLine: chunk.endLine,
          symbolName: chunk.symbolName ?? '', language: chunk.language,
          tokenCount: chunk.tokenCount, createdAt: chunk.createdAt,
          contextPrefix: chunk.contextPrefix ?? '',
          contextual: chunk.contextual ? 1 : 0,
          vector,
        });
      }

      const changedRelPaths = new Set(
        changedFiles.map((f) => relative(this.config.workspaceRoot, f).replace(/\\/g, '/')),
      );

      if (this.table) {
        try {
          for (const path of changedRelPaths) {
            await this.table.delete(`filePath = '${path.replace(/'/g, "''")}'`);
          }
          if (rows.length > 0) await this.table.add(rows);
        } catch (error) {
          this.log(`Error updating table: ${(error as Error).message}`);
          await this.recreateTable(rows);
        }
      } else if (rows.length > 0 && this.db) {
        this.table = await this.db.createTable('codebase', rows, { mode: 'overwrite' });
      }

      result.chunksCreated = rows.length;

      const successfulFiles = new Set(rows.map((r) => r.filePath));
      for (const changedFile of changedFiles) {
        const relPath = relative(this.config.workspaceRoot, changedFile).replace(/\\/g, '/');
        if (!successfulFiles.has(relPath)) this.fileHashes.delete(relPath);
      }
      saveFileHashes(this.config.hashIndexPath, this.fileHashes);

      const existingPaths = new Set(
        allFiles.map((f) => relative(this.config.workspaceRoot, f).replace(/\\/g, '/')),
      );
      for (const [path] of this.fileHashes) {
        if (!existingPaths.has(path)) {
          this.fileHashes.delete(path);
          if (this.table) {
            try {
              await this.table.delete(`filePath = '${path.replace(/'/g, "''")}'`);
              result.chunksRemoved++;
            } catch { /* ignore */ }
          }
        }
      }

      this.log(`Index complete: ${result.filesProcessed} files, ${result.chunksCreated} chunks`);

      const now = Date.now();
      if (options.full) { this.lastFullIndexTime = now; }
      else { this.lastIncrementalIndexTime = now; }
    } catch (error) {
      result.errors.push({ filePath: '', error: `Index failed: ${(error as Error).message}` });
      this.log(`Index failed: ${(error as Error).message}`);
    } finally {
      result.durationMs = Date.now() - start;
      this.isRunning = false;
    }

    return result;
  }

  startAutoIndex(): void {
    if (this.config.autoIndexIntervalMs <= 0) return;
    if (this.intervalHandle) return;

    this.intervalHandle = setInterval(() => { void (async () => {
      try {
        const result = await this.index();
        if (result.filesProcessed > 0) {
          this.log(`Auto-index: ${result.filesProcessed} files, ${result.chunksCreated} chunks`);
        }
      } catch (error) {
        this.log(`Auto-index error: ${(error as Error).message}`);
      }
    })(); }, this.config.autoIndexIntervalMs);

    this.log(`Auto-index started (every ${this.config.autoIndexIntervalMs / 1000}s)`);
  }

  stopAutoIndex(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      this.log('Auto-index stopped');
    }
  }

  getTable(): Table | null {
    return this.table;
  }

  getState(): IndexState {
    const allFiles = discoverFiles(this.config);
    const changedFiles = allFiles.filter((f) =>
      isFileChanged(f, this.config.workspaceRoot, this.fileHashes),
    );

    let totalChunks = 0;
    for (const hash of this.fileHashes.values()) {
      totalChunks += hash.chunkCount;
    }

    return {
      totalFiles: this.fileHashes.size,
      totalChunks,
      lastFullIndex: this.lastFullIndexTime,
      lastIncrementalIndex: this.lastIncrementalIndexTime,
      pendingFiles: changedFiles.length,
      isRunning: this.isRunning,
    };
  }

  async invalidate(paths: string[]): Promise<void> {
    for (const p of paths) {
      this.fileHashes.delete(p.replace(/\\/g, '/'));
    }
    saveFileHashes(this.config.hashIndexPath, this.fileHashes);
  }

  private async recreateTable(rows: LanceRow[]): Promise<void> {
    if (!this.db || rows.length === 0) return;
    this.table = await this.db.createTable('codebase', rows, { mode: 'overwrite' });
    this.log('Table recreated from scratch');
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}\n`;
    console.error(`[RAGIndexer] ${message}`);
    try {
      appendFileSync(this.config.logPath, line);
    } catch { /* ignore log write failures */ }
  }
}
