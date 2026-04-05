/**
 * RAG Indexer
 * Walks the workspace, detects changed files via SHA-256 hashing,
 * chunks and embeds only changed files, writes to LanceDB.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { connect, type Connection, type Table } from '@lancedb/lancedb';
import { RAGChunker } from './chunker.js';
import { RAGEmbedder } from './embedder.js';
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

const INDEXABLE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.md', '.mdx', '.json', '.jsonc',
]);

const MAX_FILE_SIZE = 500_000; // 500KB — skip larger files

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

  /**
   * Initialize LanceDB connection and load file hashes
   */
  async init(): Promise<void> {
    // Ensure directories exist
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

    // Connect to LanceDB
    this.db = await connect(this.config.lanceDbPath);

    // Load existing file hashes
    this.loadFileHashes();

    // Try to open existing table
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

  /**
   * Run a full or incremental index
   */
  async index(options: { full?: boolean } = {}): Promise<IndexResult> {
    if (this.isRunning) {
      return {
        filesProcessed: 0,
        chunksCreated: 0,
        chunksRemoved: 0,
        durationMs: 0,
        errors: [{ filePath: '', error: 'Index already running' }],
      };
    }

    this.isRunning = true;
    const start = Date.now();
    const result: IndexResult = {
      filesProcessed: 0,
      chunksCreated: 0,
      chunksRemoved: 0,
      durationMs: 0,
      errors: [],
    };

    try {
      // Discover all indexable files
      const allFiles = this.discoverFiles();
      this.log(`Discovered ${allFiles.length} indexable files`);

      // Determine which files changed
      const changedFiles = options.full
        ? allFiles
        : allFiles.filter((f) => this.isFileChanged(f));

      this.log(`${changedFiles.length} files need (re)indexing`);

      if (changedFiles.length === 0) {
        result.durationMs = Date.now() - start;
        this.isRunning = false;
        return result;
      }

      // Chunk changed files
      const allChunks: Chunk[] = [];
      for (const filePath of changedFiles) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          const relPath = relative(this.config.workspaceRoot, filePath).replace(/\\/g, '/');
          const chunks = this.chunker.chunkFile(relPath, content);
          allChunks.push(...chunks);

          // Update file hash
          const hash = createHash('sha256').update(content).digest('hex');
          this.fileHashes.set(relPath, {
            filePath: relPath,
            hash,
            lastIndexed: Date.now(),
            chunkCount: chunks.length,
          });

          result.filesProcessed++;
        } catch (error) {
          result.errors.push({
            filePath,
            error: (error as Error).message,
          });
        }
      }

      this.log(`Created ${allChunks.length} chunks from ${result.filesProcessed} files`);

      if (allChunks.length === 0) {
        result.durationMs = Date.now() - start;
        this.isRunning = false;
        return result;
      }

      // Embed all chunks
      const texts = allChunks.map((c) => c.content);
      const embeddings = await this.embedder.embedBatch(texts);

      this.log(`Embedded ${texts.length} chunks (${embeddings.failedIndices.length} failures)`);

      // Build LanceDB rows (skip failed embeddings)
      const rows: LanceRow[] = [];
      for (let i = 0; i < allChunks.length; i++) {
        if (embeddings.failedIndices.includes(i)) continue;

        const chunk = allChunks[i]!;
        const vector = embeddings.results[i]!.vector;
        if (vector.length === 0) continue;

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

      // Remove old chunks for changed files
      const changedRelPaths = new Set(
        changedFiles.map((f) => relative(this.config.workspaceRoot, f).replace(/\\/g, '/')),
      );

      if (this.table) {
        try {
          // Delete old entries for changed files
          for (const path of changedRelPaths) {
            await this.table.delete(`filePath = '${path.replace(/'/g, "''")}'`);
          }
          // Add new rows
          if (rows.length > 0) {
            await this.table.add(rows);
          }
        } catch (error) {
          this.log(`Error updating table: ${(error as Error).message}`);
          // If table is corrupted, recreate it
          await this.recreateTable(rows);
        }
      } else {
        // Create table from scratch
        if (rows.length > 0 && this.db) {
          this.table = await this.db.createTable('codebase', rows, {
            mode: 'overwrite',
          });
        }
      }

      result.chunksCreated = rows.length;

      // Save file hashes — but ONLY for files that had at least one chunk
      // successfully embedded. Files whose chunks all failed embedding are
      // removed from the map so the next run will re-attempt them.
      const successfulFiles = new Set(rows.map((r) => r.filePath));
      for (const changedFile of changedFiles) {
        const relPath = relative(this.config.workspaceRoot, changedFile).replace(/\\/g, '/');
        if (!successfulFiles.has(relPath)) {
          this.fileHashes.delete(relPath);
        }
      }
      this.saveFileHashes();

      // Detect deleted files and clean up
      const existingPaths = new Set(allFiles.map((f) => relative(this.config.workspaceRoot, f).replace(/\\/g, '/')));
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

      // Track index timestamps
      const now = Date.now();
      if (options.full) {
        this.lastFullIndexTime = now;
      } else {
        this.lastIncrementalIndexTime = now;
      }
    } catch (error) {
      result.errors.push({
        filePath: '',
        error: `Index failed: ${(error as Error).message}`,
      });
      this.log(`Index failed: ${(error as Error).message}`);
    } finally {
      result.durationMs = Date.now() - start;
      this.isRunning = false;
    }

    return result;
  }

  /**
   * Start automatic periodic indexing
   */
  startAutoIndex(): void {
    if (this.config.autoIndexIntervalMs <= 0) return;
    if (this.intervalHandle) return;

    this.intervalHandle = setInterval(async () => {
      try {
        const result = await this.index();
        if (result.filesProcessed > 0) {
          this.log(`Auto-index: ${result.filesProcessed} files, ${result.chunksCreated} chunks`);
        }
      } catch (error) {
        this.log(`Auto-index error: ${(error as Error).message}`);
      }
    }, this.config.autoIndexIntervalMs);

    this.log(`Auto-index started (every ${this.config.autoIndexIntervalMs / 1000}s)`);
  }

  /**
   * Stop automatic indexing
   */
  stopAutoIndex(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      this.log('Auto-index stopped');
    }
  }

  /**
   * Get the LanceDB table for search queries
   */
  getTable(): Table | null {
    return this.table;
  }

  /**
   * Get current index state
   */
  getState(): IndexState {
    const allFiles = this.discoverFiles();
    const changedFiles = allFiles.filter((f) => this.isFileChanged(f));

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

  /**
   * Force re-index specific paths
   */
  async invalidate(paths: string[]): Promise<void> {
    for (const p of paths) {
      const rel = p.replace(/\\/g, '/');
      this.fileHashes.delete(rel);
    }
    this.saveFileHashes();
  }

  // ─── Private ────────────────────────────────────────────────────────────

  private discoverFiles(): string[] {
    const files: string[] = [];
    // Use a simple recursive walk since we need to respect exclusions
    for (const indexPath of this.config.indexPaths) {
      const fullPath = join(this.config.workspaceRoot, indexPath);
      if (!existsSync(fullPath)) continue;
      this.walkDirectory(fullPath, files);
    }

    return files;
  }

  private walkDirectory(dir: string, results: string[]): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const relPath = relative(this.config.workspaceRoot, fullPath).replace(/\\/g, '/');

      // Check exclusion patterns
      if (this.isExcluded(relPath)) continue;

      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        this.walkDirectory(fullPath, results);
      } else if (stat.isFile()) {
        const ext = extname(entry).toLowerCase();
        if (INDEXABLE_EXTENSIONS.has(ext) && stat.size <= MAX_FILE_SIZE) {
          results.push(fullPath);
        }
      }
    }
  }

  private isExcluded(relPath: string): boolean {
    for (const pattern of this.config.excludePatterns) {
      // Simple glob matching for common patterns
      const regex = pattern
        .replace(/\*\*/g, '{{DOUBLESTAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/\{\{DOUBLESTAR\}\}/g, '.*');

      if (new RegExp(`^${regex}$`).test(relPath)) return true;
      if (new RegExp(`(^|/)${regex}`).test(relPath)) return true;
    }
    return false;
  }

  private isFileChanged(filePath: string): boolean {
    const relPath = relative(this.config.workspaceRoot, filePath).replace(/\\/g, '/');
    const existing = this.fileHashes.get(relPath);
    if (!existing) return true;

    try {
      const content = readFileSync(filePath, 'utf-8');
      const hash = createHash('sha256').update(content).digest('hex');
      return hash !== existing.hash;
    } catch {
      return true;
    }
  }

  private loadFileHashes(): void {
    try {
      if (existsSync(this.config.hashIndexPath)) {
        const data = JSON.parse(readFileSync(this.config.hashIndexPath, 'utf-8'));
        this.fileHashes = new Map(Object.entries(data));
      }
    } catch {
      this.fileHashes = new Map();
    }
  }

  private saveFileHashes(): void {
    const data = Object.fromEntries(this.fileHashes);
    writeFileSync(this.config.hashIndexPath, JSON.stringify(data, null, 2));
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
