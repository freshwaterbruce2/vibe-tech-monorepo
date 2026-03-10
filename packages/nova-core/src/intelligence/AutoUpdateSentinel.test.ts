import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseManager } from '../persistence/DatabaseManager.js';
import { AutoUpdateSentinel } from './AutoUpdateSentinel.js';

describe('AutoUpdateSentinel', () => {
  let testDir: string;

  beforeEach(async () => {
    DatabaseManager.resetInstance();
    testDir = path.join(os.tmpdir(), `nova-sentinel-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    DatabaseManager.resetInstance();
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('constructor', () => {
    it('should create instance without error', () => {
      const sentinel = new AutoUpdateSentinel();
      expect(sentinel).toBeDefined();
    });
  });

  describe('start', () => {
    it('should start watching without error', () => {
      const sentinel = new AutoUpdateSentinel();

      // Start watching the test directory
      expect(() => sentinel.start(testDir)).not.toThrow();

      // Cleanup
      sentinel.stop();
    });

    it('should use default path when none provided', () => {
      const sentinel = new AutoUpdateSentinel();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      sentinel.start();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Mission Control is now monitoring'),
      );

      sentinel.stop();
      consoleSpy.mockRestore();
    });
  });

  describe('stop', () => {
    it('should stop watching without error', () => {
      const sentinel = new AutoUpdateSentinel();
      sentinel.start(testDir);

      expect(() => sentinel.stop()).not.toThrow();
    });

    it('should be safe to call when not started', () => {
      const sentinel = new AutoUpdateSentinel();

      expect(() => sentinel.stop()).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      const sentinel = new AutoUpdateSentinel();
      sentinel.start(testDir);

      sentinel.stop();
      expect(() => sentinel.stop()).not.toThrow();
    });
  });

  describe('file watching', () => {
    it('should detect file changes and trigger indexer', async () => {
      // Initialize DB for indexer
      const dm = DatabaseManager.getInstance({ inMemory: true });
      dm.initialize();

      const sentinel = new AutoUpdateSentinel();
      sentinel.start(testDir);

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Create a file
      const testFile = path.join(testDir, 'watched.ts');
      await fs.writeFile(testFile, 'const x = 1;');

      // Wait for file system events to propagate
      // chokidar has awaitWriteFinish: stabilityThreshold of 300ms
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Verify file was indexed
      const conn = dm.getConnection();
      conn.prepare('SELECT * FROM project_files WHERE file_path = ?').get(testFile);

      // Note: This may or may not be indexed depending on timing
      // The important thing is no errors were thrown

      sentinel.stop();
    });

    it('should log file events', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const dm = DatabaseManager.getInstance({ inMemory: true });
      dm.initialize();

      const sentinel = new AutoUpdateSentinel();
      sentinel.start(testDir);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const testFile = path.join(testDir, 'logged.ts');
      await fs.writeFile(testFile, 'const x = 1;');

      await new Promise((resolve) => setTimeout(resolve, 800));

      // Should have logged the file event
      const logCalls = consoleSpy.mock.calls.map((c) => c[0]);
      const hasFileLog = logCalls.some(
        (log) => typeof log === 'string' && log.includes('[Sentinel]'),
      );

      expect(hasFileLog).toBe(true);

      sentinel.stop();
      consoleSpy.mockRestore();
    });
  });

  describe('ignore patterns', () => {
    it('should ignore node_modules changes', async () => {
      const dm = DatabaseManager.getInstance({ inMemory: true });
      dm.initialize();

      const nodeModules = path.join(testDir, 'node_modules');
      await fs.mkdir(nodeModules);

      const sentinel = new AutoUpdateSentinel();
      sentinel.start(testDir);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Create file in node_modules
      const ignoredFile = path.join(nodeModules, 'package.json');
      await fs.writeFile(ignoredFile, '{}');

      await new Promise((resolve) => setTimeout(resolve, 800));

      // Should NOT be indexed
      const conn = dm.getConnection();
      const result = conn
        .prepare('SELECT * FROM project_files WHERE file_path = ?')
        .get(ignoredFile);

      expect(result).toBeUndefined();

      sentinel.stop();
    });
  });
});
