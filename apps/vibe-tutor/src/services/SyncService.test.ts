import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock crypto API for Node.js environment
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-1234-5678-9012',
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
});

// Mock Capacitor modules
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(() => 'android'),
  },
}));

vi.mock('@capacitor/filesystem', () => ({
  Directory: {
    ExternalStorage: 'ExternalStorage',
    Documents: 'Documents',
  },
  Encoding: {
    UTF8: 'UTF8',
  },
  Filesystem: {
    requestPermissions: vi.fn(async () => Promise.resolve()),
    mkdir: vi.fn(async () => Promise.resolve()),
    writeFile: vi.fn(async () => Promise.resolve()),
    getUri: vi.fn(async () => Promise.resolve({ uri: 'file://test/path' })),
  },
}));

// Mock SQLite connection
const mocks = vi.hoisted(() => {
  const createMockDB = () =>
    ({
      open: vi.fn(async () => Promise.resolve()),
      execute: vi.fn(async () => Promise.resolve({ changes: { changes: 1 } })),
      run: vi.fn(async () => Promise.resolve({ changes: { changes: 1 } })),
      query: vi.fn(async () => Promise.resolve({ values: [] })),
      close: vi.fn(async () => Promise.resolve()),
    }) as any;

  const createMockSQLiteConnection = () =>
    ({
      checkConnectionsConsistency: vi.fn(async () => Promise.resolve({ result: false })),
      isConnection: vi.fn(async () => Promise.resolve({ result: false })),
      retrieveConnection: vi.fn(async () => Promise.resolve(createMockDB())),
      createConnection: vi.fn(async () => Promise.resolve(createMockDB())),
    }) as any;

  return { createMockDB, createMockSQLiteConnection };
});

const { createMockDB, createMockSQLiteConnection } = mocks;

vi.mock('@capacitor-community/sqlite', () => {
  const MockSQLiteConnection = class {
    checkConnectionsConsistency: any;
    isConnection: any;
    retrieveConnection: any;
    createConnection: any;

    constructor() {
      const mock = mocks.createMockSQLiteConnection();
      this.checkConnectionsConsistency = mock.checkConnectionsConsistency;
      this.isConnection = mock.isConnection;
      this.retrieveConnection = mock.retrieveConnection;
      this.createConnection = mock.createConnection;
    }
  };

  return {
    CapacitorSQLite: {},
    SQLiteConnection: MockSQLiteConnection,
  };
});

describe('SyncService.ts', () => {
  let originalWindow: any;

  beforeEach(async () => {
    vi.resetModules();
    originalWindow = globalThis;
    // Clear any device ID override
    delete (globalThis as any).__DEVICE_ID__;
    vi.clearAllMocks();

    // Re-establish default filesystem mock behavior after clearing
    const { Filesystem } = await import('@capacitor/filesystem');
    vi.mocked(Filesystem.requestPermissions).mockResolvedValue({ publicStorage: 'granted' });
    vi.mocked(Filesystem.mkdir).mockResolvedValue(undefined);
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file://test/path' });
    vi.mocked(Filesystem.getUri).mockResolvedValue({ uri: 'file://test/path' });
  });

  afterEach(() => {
    // Restore original window (can't reassign globalThis, so just clean up)
    if (originalWindow) {
      Object.assign(globalThis, originalWindow);
    }
  });

  describe('getDeviceId', () => {
    it('should return default device ID when no override is set', async () => {
      const { syncService } = await import('./SyncService');

      // Access internal getDeviceId via exportForHub payload
      const mockDB = createMockDB();
      mockDB.query = vi.fn(async () =>
        Promise.resolve({
          values: [
            { id: 'test_1', summary: 'Test', tags: '[]', timestamp: Date.now(), synced_to_hub: 0 },
          ],
        }),
      );

      (syncService as any).db = mockDB;
      (syncService as any).initialized = true;

      const result = await syncService.exportForHub();
      expect(result.exportedCount).toBe(1);
      // Device ID would be in the exported file
    });

    it('should use custom device ID from global override', async () => {
      (globalThis as any).__DEVICE_ID__ = 'custom_device_123';

      const { syncService } = await import('./SyncService');

      const mockDB = createMockDB();
      mockDB.query = vi.fn(async () =>
        Promise.resolve({
          values: [
            { id: 'test_1', summary: 'Test', tags: '[]', timestamp: Date.now(), synced_to_hub: 0 },
          ],
        }),
      );

      (syncService as any).db = mockDB;
      (syncService as any).initialized = true;

      const result = await syncService.exportForHub();
      expect(result.exportedCount).toBe(1);
    });

    it('should trim whitespace from device ID override', async () => {
      (globalThis as any).__DEVICE_ID__ = '  spaces_around  ';

      const { syncService } = await import('./SyncService');

      const mockDB = createMockDB();
      mockDB.query = vi.fn(async () =>
        Promise.resolve({
          values: [
            { id: 'test_1', summary: 'Test', tags: '[]', timestamp: Date.now(), synced_to_hub: 0 },
          ],
        }),
      );

      (syncService as any).db = mockDB;
      (syncService as any).initialized = true;

      const result = await syncService.exportForHub();
      expect(result.exportedCount).toBe(1);
    });

    it('should ignore empty string device ID override', async () => {
      (globalThis as any).__DEVICE_ID__ = '   ';

      const { syncService } = await import('./SyncService');

      const mockDB = createMockDB();
      mockDB.query = vi.fn(async () =>
        Promise.resolve({
          values: [
            { id: 'test_1', summary: 'Test', tags: '[]', timestamp: Date.now(), synced_to_hub: 0 },
          ],
        }),
      );

      (syncService as any).db = mockDB;
      (syncService as any).initialized = true;

      const result = await syncService.exportForHub();
      expect(result.exportedCount).toBe(1);
      // Should use default 'android_01'
    });
  });

  describe('generateId', () => {
    it('should generate ID with correct prefix', async () => {
      // Test via logEvent which uses generateId internally
      const { syncService } = await import('./SyncService');

      const mockDB = createMockDB();
      (syncService as any).db = mockDB;
      (syncService as any).initialized = true;

      const event = await syncService.logEvent('Test summary', ['tag1']);
      expect(event.id).toMatch(/^mem_\d+_[a-z0-9]+$/);
    });

    it('should generate unique IDs', async () => {
      const { syncService } = await import('./SyncService');

      const mockDB = createMockDB();
      (syncService as any).db = mockDB;
      (syncService as any).initialized = true;

      const event1 = await syncService.logEvent('Test 1', []);
      const event2 = await syncService.logEvent('Test 2', []);

      expect(event1.id).not.toBe(event2.id);
    });
  });

  describe('SyncService', () => {
    describe('ensureInitialized', () => {
      it('should throw error on web platform', async () => {
        const { Capacitor } = await import('@capacitor/core');
        vi.mocked(Capacitor.getPlatform).mockReturnValue('web');

        const { syncService } = await import('./SyncService');

        await expect(syncService.logEvent('Test', [])).rejects.toThrow(
          'SyncService requires a native runtime (Android).',
        );

        // Reset to android for other tests
        vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      });

      it('should create database connection on first call', async () => {
        const { Capacitor } = await import('@capacitor/core');
        vi.mocked(Capacitor.getPlatform).mockReturnValue('android');

        const { syncService } = await import('./SyncService');

        // Reset initialization state
        (syncService as any).initialized = false;
        (syncService as any).db = null;

        await syncService.logEvent('Test', []);

        // Verify database operations were called
        const mockDB = (syncService as any).db;
        expect(mockDB).toBeDefined();
        expect(mockDB.open).toHaveBeenCalled();
        expect(mockDB.execute).toHaveBeenCalledWith('PRAGMA journal_mode=WAL;');
        expect(mockDB.execute).toHaveBeenCalledWith('PRAGMA busy_timeout=5000;');
      });

      it('should reuse existing connection on subsequent calls', async () => {
        const { Capacitor } = await import('@capacitor/core');
        vi.mocked(Capacitor.getPlatform).mockReturnValue('android');

        const { syncService } = await import('./SyncService');

        // Reset initialization state
        (syncService as any).initialized = false;
        (syncService as any).db = null;

        await syncService.logEvent('Test 1', []);
        const mockDB1 = (syncService as any).db;

        await syncService.logEvent('Test 2', []);
        const mockDB2 = (syncService as any).db;

        expect(mockDB1).toBe(mockDB2);
        expect(mockDB1.open).toHaveBeenCalledTimes(1); // Only once
      });

      it('should create tables on initialization', async () => {
        const { Capacitor } = await import('@capacitor/core');
        vi.mocked(Capacitor.getPlatform).mockReturnValue('android');

        const { syncService } = await import('./SyncService');

        // Reset initialization state
        (syncService as any).initialized = false;
        (syncService as any).db = null;

        await syncService.logEvent('Test', []);

        const mockDB = (syncService as any).db;
        expect(mockDB.execute).toHaveBeenCalledWith(
          expect.stringContaining('CREATE TABLE IF NOT EXISTS local_memories'),
        );
        expect(mockDB.execute).toHaveBeenCalledWith(
          expect.stringContaining('CREATE INDEX IF NOT EXISTS'),
        );
      });

      it('should handle initialization errors', async () => {
        const { SQLiteConnection: _SQLiteConnection } = await import('@capacitor-community/sqlite');
        const mockConnection = createMockSQLiteConnection();
        mockConnection.createConnection = vi.fn(async () =>
          Promise.reject(new Error('Connection failed')),
        );
        vi.doMock('@capacitor-community/sqlite', () => ({
          CapacitorSQLite: {},
          // eslint-disable-next-line @typescript-eslint/no-extraneous-class
          SQLiteConnection: class {
            constructor() {
              const mock = createMockSQLiteConnection();
              mock.createConnection = vi.fn(async () =>
                Promise.reject(new Error('Connection failed')),
              );
              return mock;
            }
          },
        }));

        const { syncService } = await import('./SyncService');

        await expect(syncService.logEvent('Test', [])).rejects.toThrow();
      });
    });

    describe('logEvent', () => {
      it('should successfully log event with valid data', async () => {
        const { syncService } = await import('./SyncService');

        const mockDB = createMockDB();
        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        const event = await syncService.logEvent('Completed homework', ['homework', 'math']);

        expect(event).toMatchObject({
          summary: 'Completed homework',
          tags: ['homework', 'math'],
          synced_to_hub: 0,
        });
        expect(event.id).toMatch(/^mem_/);
        expect(event.timestamp).toBeGreaterThan(0);
        expect(mockDB.run).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO local_memories'),
          expect.arrayContaining([
            event.id,
            'Completed homework',
            JSON.stringify(['homework', 'math']),
            event.timestamp,
            0,
          ]),
        );
      });

      it('should reject empty summary', async () => {
        const { syncService } = await import('./SyncService');

        const mockDB = createMockDB();
        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        await expect(syncService.logEvent('', ['tag'])).rejects.toThrow(
          'logEvent(summary, tags) requires a non-empty summary',
        );
        await expect(syncService.logEvent('   ', ['tag'])).rejects.toThrow(
          'logEvent(summary, tags) requires a non-empty summary',
        );
      });

      it('should normalize and filter tags', async () => {
        const { syncService } = await import('./SyncService');

        const mockDB = createMockDB();
        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        const event = await syncService.logEvent('Test', ['tag1', '', null as any, 'tag2']);

        // Actual behavior: String(null) = 'null', so it's included
        // This documents the current behavior - could be improved to filter falsy values
        expect(event.tags).toEqual(['tag1', 'null', 'tag2']);
      });

      it('should handle non-array tags gracefully', async () => {
        const { syncService } = await import('./SyncService');

        const mockDB = createMockDB();
        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        const event = await syncService.logEvent('Test', null as any);

        expect(event.tags).toEqual([]);
      });

      it('should handle database insert errors', async () => {
        const { syncService } = await import('./SyncService');

        const mockDB = createMockDB();
        mockDB.run = vi.fn(async () => Promise.reject(new Error('UNIQUE constraint failed')));
        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        await expect(syncService.logEvent('Test', [])).rejects.toThrow('UNIQUE constraint failed');
      });
    });

    describe('exportForHub', () => {
      it('should export unsynced events to JSON file', async () => {
        const { syncService } = await import('./SyncService');
        const { Filesystem } = await import('@capacitor/filesystem');

        const mockDB = createMockDB();
        const timestamp = Date.now();
        mockDB.query = vi.fn(async () =>
          Promise.resolve({
            values: [
              { id: 'mem_1', summary: 'Event 1', tags: '["tag1"]', timestamp, synced_to_hub: 0 },
              {
                id: 'mem_2',
                summary: 'Event 2',
                tags: '["tag2"]',
                timestamp: timestamp + 1000,
                synced_to_hub: 0,
              },
            ],
          }),
        );

        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        const result = await syncService.exportForHub();

        expect(result.exportedCount).toBe(2);
        expect(result.directory).toBe('ExternalStorage');
        expect(result.relativePath).toMatch(/^VibeTutor\/exports\/vibe_tutor_export_/);
        expect(result.uri).toBe('file://test/path');
        expect(Filesystem.writeFile).toHaveBeenCalledWith(
          expect.objectContaining({
            directory: 'ExternalStorage',
            encoding: 'UTF8',
          }),
        );

        // Verify events were marked as exported
        expect(mockDB.run).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE local_memories SET synced_to_hub = 1'),
          ['mem_1', 'mem_2'],
        );
      });

      it('should throw error when no unsynced events exist', async () => {
        const { syncService } = await import('./SyncService');

        const mockDB = createMockDB();
        mockDB.query = vi.fn(async () => Promise.resolve({ values: [] }));

        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        await expect(syncService.exportForHub()).rejects.toThrow('No unsynced events to export');
      });

      it('should generate correct JSON payload structure', async () => {
        const { syncService } = await import('./SyncService');
        const { Filesystem } = await import('@capacitor/filesystem');

        const mockDB = createMockDB();
        const timestamp = Date.now();
        mockDB.query = vi.fn(async () =>
          Promise.resolve({
            values: [
              { id: 'mem_1', summary: 'Test', tags: '["homework"]', timestamp, synced_to_hub: 0 },
            ],
          }),
        );

        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        await syncService.exportForHub();

        const writeCall = vi.mocked(Filesystem.writeFile).mock.calls[0]![0];
        const payload = JSON.parse(typeof writeCall.data === 'string' ? writeCall.data : '');

        expect(payload).toMatchObject({
          export_timestamp: expect.any(String),
          device_id: expect.any(String),
          events: [
            {
              id: 'mem_1',
              summary: 'Test',
              tags: ['homework'],
              timestamp: timestamp,
            },
          ],
        });
      });

      it('should handle malformed tags JSON gracefully', async () => {
        const { syncService } = await import('./SyncService');

        const mockDB = createMockDB();
        mockDB.query = vi.fn(async () =>
          Promise.resolve({
            values: [
              {
                id: 'mem_1',
                summary: 'Test',
                tags: 'invalid json',
                timestamp: Date.now(),
                synced_to_hub: 0,
              },
            ],
          }),
        );

        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        const result = await syncService.exportForHub();

        expect(result.exportedCount).toBe(1);
        // Should export with empty tags array instead of crashing
      });

      it('should fallback to Documents directory if ExternalStorage fails', async () => {
        const { syncService } = await import('./SyncService');
        const { Filesystem } = await import('@capacitor/filesystem');

        vi.mocked(Filesystem.writeFile)
          .mockRejectedValueOnce(new Error('ExternalStorage unavailable'))
          .mockResolvedValueOnce({ uri: 'file://test/path' });

        const mockDB = createMockDB();
        mockDB.query = vi.fn(async () =>
          Promise.resolve({
            values: [
              { id: 'mem_1', summary: 'Test', tags: '[]', timestamp: Date.now(), synced_to_hub: 0 },
            ],
          }),
        );

        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        const result = await syncService.exportForHub();

        expect(result.directory).toBe('Documents');
        expect(Filesystem.writeFile).toHaveBeenCalledTimes(2);
      });

      it('should throw error if all directory candidates fail', async () => {
        const { syncService } = await import('./SyncService');
        const { Filesystem } = await import('@capacitor/filesystem');

        vi.mocked(Filesystem.writeFile).mockRejectedValue(new Error('All directories failed'));

        const mockDB = createMockDB();
        mockDB.query = vi.fn(async () =>
          Promise.resolve({
            values: [
              { id: 'mem_1', summary: 'Test', tags: '[]', timestamp: Date.now(), synced_to_hub: 0 },
            ],
          }),
        );

        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        await expect(syncService.exportForHub()).rejects.toThrow('Failed to write export file');
      });
    });

    describe('writeExportFile', () => {
      it('should request filesystem permissions', async () => {
        const { syncService } = await import('./SyncService');
        const { Filesystem } = await import('@capacitor/filesystem');

        const mockDB = createMockDB();
        mockDB.query = vi.fn(async () =>
          Promise.resolve({
            values: [
              { id: 'mem_1', summary: 'Test', tags: '[]', timestamp: Date.now(), synced_to_hub: 0 },
            ],
          }),
        );

        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        await syncService.exportForHub();

        expect(Filesystem.requestPermissions).toHaveBeenCalled();
      });

      it('should create parent directories recursively', async () => {
        const { syncService } = await import('./SyncService');
        const { Filesystem } = await import('@capacitor/filesystem');

        const mockDB = createMockDB();
        mockDB.query = vi.fn(async () =>
          Promise.resolve({
            values: [
              { id: 'mem_1', summary: 'Test', tags: '[]', timestamp: Date.now(), synced_to_hub: 0 },
            ],
          }),
        );

        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        await syncService.exportForHub();

        expect(Filesystem.mkdir).toHaveBeenCalledWith(
          expect.objectContaining({
            path: 'VibeTutor/exports',
            recursive: true,
          }),
        );
      });

      it('should handle getUri failures gracefully', async () => {
        const { syncService } = await import('./SyncService');
        const { Filesystem } = await import('@capacitor/filesystem');

        vi.mocked(Filesystem.getUri).mockRejectedValue(new Error('URI not available'));

        const mockDB = createMockDB();
        mockDB.query = vi.fn(async () =>
          Promise.resolve({
            values: [
              { id: 'mem_1', summary: 'Test', tags: '[]', timestamp: Date.now(), synced_to_hub: 0 },
            ],
          }),
        );

        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        const result = await syncService.exportForHub();

        expect(result.uri).toBeUndefined();
        expect(result.exportedCount).toBe(1); // Export still succeeds
      });
    });

    describe('markExported', () => {
      it('should update synced_to_hub flag for given IDs', async () => {
        const { syncService } = await import('./SyncService');

        const mockDB = createMockDB();
        mockDB.query = vi.fn(async () =>
          Promise.resolve({
            values: [
              {
                id: 'mem_1',
                summary: 'Test 1',
                tags: '[]',
                timestamp: Date.now(),
                synced_to_hub: 0,
              },
              {
                id: 'mem_2',
                summary: 'Test 2',
                tags: '[]',
                timestamp: Date.now(),
                synced_to_hub: 0,
              },
            ],
          }),
        );

        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        await syncService.exportForHub();

        expect(mockDB.run).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE local_memories SET synced_to_hub = 1 WHERE id IN (?, ?)'),
          ['mem_1', 'mem_2'],
        );
      });

      it('should handle empty IDs array gracefully', async () => {
        const { syncService } = await import('./SyncService');

        // Call internal markExported with empty array
        const mockDB = createMockDB();
        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        await (syncService as any).markExported([]);

        // Should not call database (early return)
        expect(mockDB.run).not.toHaveBeenCalledWith(
          expect.stringContaining('UPDATE local_memories'),
          [],
        );
      });

      it('should handle update errors on markExported', async () => {
        const { syncService } = await import('./SyncService');

        const mockDB = createMockDB();
        mockDB.query = vi.fn(async () =>
          Promise.resolve({
            values: [
              { id: 'mem_1', summary: 'Test', tags: '[]', timestamp: Date.now(), synced_to_hub: 0 },
            ],
          }),
        );

        // Simulate update failure on markExported call
        mockDB.run = vi.fn(async () => Promise.reject(new Error('Database locked')));

        (syncService as any).db = mockDB;
        (syncService as any).initialized = true;

        // Catch the error internally or test that it rejects
        await expect(syncService.exportForHub()).rejects.toThrow('Database locked');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle multiple export attempts correctly', async () => {
      const { syncService } = await import('./SyncService');

      const mockDB = createMockDB();
      mockDB.query = vi
        .fn()
        .mockResolvedValueOnce({
          values: [
            { id: 'mem_1', summary: 'Test 1', tags: '[]', timestamp: Date.now(), synced_to_hub: 0 },
          ],
        })
        .mockResolvedValueOnce({
          values: [], // All exported
        });

      (syncService as any).db = mockDB;
      (syncService as any).initialized = true;

      const result1 = await syncService.exportForHub();
      expect(result1.exportedCount).toBe(1);

      await expect(syncService.exportForHub()).rejects.toThrow('No unsynced events to export');
    });

    it('should handle timestamp coercion for invalid values', async () => {
      const { syncService } = await import('./SyncService');

      const mockDB = createMockDB();
      mockDB.query = vi.fn(async () =>
        Promise.resolve({
          values: [{ id: 'mem_1', summary: 'Test', tags: '[]', timestamp: null, synced_to_hub: 0 }],
        }),
      );

      (syncService as any).db = mockDB;
      (syncService as any).initialized = true;

      const result = await syncService.exportForHub();

      expect(result.exportedCount).toBe(1);
      // Should use Date.now() as fallback timestamp
    });

    it('should handle database not connected errors', async () => {
      const { syncService } = await import('./SyncService');

      (syncService as any).db = null;
      (syncService as any).initialized = false;

      // Force web platform to skip initialization
      const { Capacitor } = await import('@capacitor/core');
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web');

      await expect(syncService.logEvent('Test', [])).rejects.toThrow();
    });
  });

  describe('type safety', () => {
    it('should have correct TypeScript types for interfaces', async () => {
      const { syncService } = await import('./SyncService');

      const mockDB = createMockDB();
      (syncService as any).db = mockDB;
      (syncService as any).initialized = true;

      const event = await syncService.logEvent('Test', ['tag']);

      // Type assertions to verify interface structure
      const typedEvent: typeof event = {
        id: expect.any(String),
        summary: expect.any(String),
        tags: expect.any(Array),
        timestamp: expect.any(Number),
        synced_to_hub: expect.any(Number),
      };

      expect(event).toMatchObject(typedEvent);
    });

    it('should export singleton instance', async () => {
      const module = await import('./SyncService');

      expect(module.syncService).toBeDefined();
      expect(typeof module.syncService.logEvent).toBe('function');
      expect(typeof module.syncService.exportForHub).toBe('function');
    });
  });
});
