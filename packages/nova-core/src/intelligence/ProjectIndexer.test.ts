import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseManager } from '../persistence/DatabaseManager.js';
import { ProjectIndexer } from './ProjectIndexer.js';

describe('ProjectIndexer', () => {
  let testDir: string;

  beforeEach(async () => {
    DatabaseManager.resetInstance();
    // Create temp directory for test files
    testDir = path.join(os.tmpdir(), `nova-indexer-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    DatabaseManager.resetInstance();
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should create instance without error', () => {
      const indexer = new ProjectIndexer();
      expect(indexer).toBeDefined();
    });
  });

  describe('updateSingleFile', () => {
    it('should index a new file', async () => {
      // Setup: create a test file
      const testFile = path.join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'const x = 1;');

      // Initialize database
      const dm = DatabaseManager.getInstance({ inMemory: true });
      dm.initialize();

      const indexer = new ProjectIndexer();
      await indexer.updateSingleFile(testFile);

      // Verify file was indexed
      const conn = dm.getConnection();
      const result = conn
        .prepare('SELECT * FROM project_files WHERE file_path = ?')
        .get(testFile) as { file_path: string; language: string } | undefined;

      expect(result).toBeDefined();
      expect(result?.file_path).toBe(testFile);
      expect(result?.language).toBe('ts');
    });

    it('should update existing file when content changes', async () => {
      const testFile = path.join(testDir, 'update.ts');
      await fs.writeFile(testFile, 'const x = 1;');

      const dm = DatabaseManager.getInstance({ inMemory: true });
      dm.initialize();

      const indexer = new ProjectIndexer();

      // First index
      await indexer.updateSingleFile(testFile);

      const conn = dm.getConnection();
      const firstResult = conn
        .prepare('SELECT file_hash FROM project_files WHERE file_path = ?')
        .get(testFile) as { file_hash: string };
      const firstHash = firstResult.file_hash;

      // Modify file
      await fs.writeFile(testFile, 'const x = 2; const y = 3;');

      // Re-index
      await indexer.updateSingleFile(testFile);

      const secondResult = conn
        .prepare('SELECT file_hash FROM project_files WHERE file_path = ?')
        .get(testFile) as { file_hash: string };

      expect(secondResult.file_hash).not.toBe(firstHash);
    });

    it('should remove file from index when file is deleted', async () => {
      const testFile = path.join(testDir, 'delete-me.ts');
      await fs.writeFile(testFile, 'const x = 1;');

      const dm = DatabaseManager.getInstance({ inMemory: true });
      dm.initialize();

      const indexer = new ProjectIndexer();
      await indexer.updateSingleFile(testFile);

      // Verify it was added
      const conn = dm.getConnection();
      let result = conn.prepare('SELECT * FROM project_files WHERE file_path = ?').get(testFile);
      expect(result).toBeDefined();

      // Delete the file
      await fs.unlink(testFile);

      // Re-index (should remove)
      await indexer.updateSingleFile(testFile);

      result = conn.prepare('SELECT * FROM project_files WHERE file_path = ?').get(testFile);
      expect(result).toBeUndefined();
    });

    it('should skip files larger than 1MB', async () => {
      const testFile = path.join(testDir, 'large-file.ts');
      // Create a file larger than 1MB
      const largeContent = 'x'.repeat(1024 * 1024 + 100);
      await fs.writeFile(testFile, largeContent);

      const dm = DatabaseManager.getInstance({ inMemory: true });
      dm.initialize();

      const indexer = new ProjectIndexer();
      await indexer.updateSingleFile(testFile);

      // Should not be indexed
      const conn = dm.getConnection();
      const result = conn.prepare('SELECT * FROM project_files WHERE file_path = ?').get(testFile);
      expect(result).toBeUndefined();
    });
  });

  describe('indexWorkspace', () => {
    it('should index all files in directory', async () => {
      // Create test structure
      await fs.writeFile(path.join(testDir, 'file1.ts'), 'export const a = 1;');
      await fs.writeFile(path.join(testDir, 'file2.js'), 'const b = 2;');

      const subDir = path.join(testDir, 'subdir');
      await fs.mkdir(subDir);
      await fs.writeFile(path.join(subDir, 'file3.ts'), 'export const c = 3;');

      const dm = DatabaseManager.getInstance({ inMemory: true });

      const indexer = new ProjectIndexer();
      await indexer.indexWorkspace(testDir);

      const conn = dm.getConnection();
      const files = conn.prepare('SELECT * FROM project_files').all() as { file_path: string }[];

      expect(files.length).toBe(3);
      const paths = files.map((f) => f.file_path);
      expect(paths).toContain(path.join(testDir, 'file1.ts'));
      expect(paths).toContain(path.join(testDir, 'file2.js'));
      expect(paths).toContain(path.join(subDir, 'file3.ts'));
    });

    it('should ignore node_modules directory', async () => {
      await fs.writeFile(path.join(testDir, 'keep.ts'), 'export const x = 1;');

      const nodeModules = path.join(testDir, 'node_modules');
      await fs.mkdir(nodeModules);
      await fs.writeFile(path.join(nodeModules, 'ignore.js'), 'module.exports = {}');

      const dm = DatabaseManager.getInstance({ inMemory: true });

      const indexer = new ProjectIndexer();
      await indexer.indexWorkspace(testDir);

      const conn = dm.getConnection();
      const files = conn.prepare('SELECT * FROM project_files').all() as { file_path: string }[];

      expect(files.length).toBe(1);
      expect(files[0]?.file_path).toContain('keep.ts');
    });

    it('should ignore .git directory', async () => {
      await fs.writeFile(path.join(testDir, 'keep.ts'), 'const x = 1;');

      const gitDir = path.join(testDir, '.git');
      await fs.mkdir(gitDir);
      await fs.writeFile(path.join(gitDir, 'config'), 'git config');

      const dm = DatabaseManager.getInstance({ inMemory: true });

      const indexer = new ProjectIndexer();
      await indexer.indexWorkspace(testDir);

      const conn = dm.getConnection();
      const files = conn.prepare('SELECT * FROM project_files').all() as { file_path: string }[];

      expect(files.length).toBe(1);
    });
  });
});
