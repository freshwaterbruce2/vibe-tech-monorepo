/**
 * RAG Indexer
 * Walks the workspace, detects changed files via SHA-256 hashing,
 * chunks and embeds only changed files, writes to LanceDB.
 */

import { createHash } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { connect, type Connection, type Table } from '@lancedb/lancedb';
import { RAGChunker } from './chunker.js';
import { RAGEmbedder } from './embedder.js';
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
  vector: number[];
}

export class RAGIndexer {
  private config: RAGConfig;
  private chunker: RAGChunker;
  private embedder: RAGEmbedder;
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
          const chunks = this.chunker.chunkFile(relPath, content);
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

      const texts = allChunks.map((c) => c.content);
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
          tokenCount: chunk.tokenCount, createdAt: chunk.createdAt, vector,
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
