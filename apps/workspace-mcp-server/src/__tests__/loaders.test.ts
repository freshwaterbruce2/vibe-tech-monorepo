import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the fs module before importing loaders
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

import { existsSync, readFileSync } from 'fs';
import { loadEnvFile, loadPortRegistry, checkDatabases } from '../loaders.js';

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('loadEnvFile', () => {
  it('returns empty array when file does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    expect(loadEnvFile('/nonexistent/.env')).toEqual([]);
  });

  it('parses key=value pairs', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('PORT=3000\nNODE_ENV=development\n');

    const entries = loadEnvFile('/fake/.env');
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ key: 'PORT', value: '3000', sensitive: false });
    expect(entries[1]).toMatchObject({ key: 'NODE_ENV', value: 'development', sensitive: false });
  });

  it('skips blank lines and comments', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('# comment\n\nPORT=3000\n');

    const entries = loadEnvFile('/fake/.env');
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe('PORT');
  });

  it('masks sensitive values', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('OPENROUTER_API_KEY=sk-abcdefghijklmnop\n');

    const entries = loadEnvFile('/fake/.env');
    expect(entries[0].sensitive).toBe(true);
    expect(entries[0].value).toBe('');
    expect(entries[0].masked).toContain('...');
  });

  it('handles values containing = signs', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('DATABASE_URL=postgresql://user:pass@host/db\n');

    const entries = loadEnvFile('/fake/.env');
    expect(entries[0].key).toBe('DATABASE_URL');
    expect(entries[0].value).toBe('postgresql://user:pass@host/db');
  });

  it('assigns categories correctly', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      'OPENROUTER_API_KEY=key1\nDATABASE_URL=url\nPORT=3000\nLOG_LEVEL=info\n',
    );

    const entries = loadEnvFile('/fake/.env');
    const byKey = Object.fromEntries(entries.map(e => [e.key, e]));
    expect(byKey['OPENROUTER_API_KEY'].category).toBe('api-keys');
    expect(byKey['PORT'].category).toBe('ports');
    expect(byKey['LOG_LEVEL'].category).toBe('logging');
  });
});

describe('loadPortRegistry', () => {
  it('returns empty registry when file does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    const result = loadPortRegistry();
    expect(result.ranges).toEqual({});
    expect(result.ports).toEqual([]);
    expect(result.lastUpdated).toBe('unknown');
  });

  it('parses port registry JSON', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({
      lastUpdated: '2024-01-01',
      ranges: { backends: { start: 3000, end: 3099, description: 'Backend API' } },
      ports: {
        3000: { app: 'api-server', type: 'backend', description: 'Main API' },
        3001: { app: 'openrouter-proxy', type: 'backend', description: 'OpenRouter proxy' },
      },
    }));

    const result = loadPortRegistry();
    expect(result.lastUpdated).toBe('2024-01-01');
    expect(result.ports).toHaveLength(2);
    expect(result.ports.find(p => p.port === 3000)?.app).toBe('api-server');
  });
});

describe('checkDatabases', () => {
  it('marks databases that exist', () => {
    mockExistsSync.mockReturnValue(true);

    const dbs = [{ name: 'test.db', path: 'D:\\databases\\test.db', purpose: 'Test DB' }];
    const result = checkDatabases(dbs);
    expect(result[0].exists).toBe(true);
    expect(result[0].name).toBe('test.db');
  });

  it('marks databases that do not exist', () => {
    mockExistsSync.mockReturnValue(false);

    const dbs = [{ name: 'missing.db', path: 'D:\\databases\\missing.db', purpose: 'Missing' }];
    const result = checkDatabases(dbs);
    expect(result[0].exists).toBe(false);
    expect(result[0].sizeMB).toBeNull();
  });

  it('returns all databases when given multiple entries', () => {
    mockExistsSync.mockReturnValue(false);

    const dbs = [
      { name: 'a.db', path: 'D:\\databases\\a.db', purpose: 'A' },
      { name: 'b.db', path: 'D:\\databases\\b.db', purpose: 'B' },
    ];
    expect(checkDatabases(dbs)).toHaveLength(2);
  });
});
