import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  mockFetch,
  mockLocalStorage,
  mockConsole,
  restoreConsole,
} from '../mocks/api-mocks.js';

describe('mockFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns matching response for known URL', async () => {
    mockFetch({ '/api/users': [{ id: 1 }] });
    const res = await fetch('/api/users');
    expect(res.ok).toBe(true);
    expect(await res.json()).toEqual([{ id: 1 }]);
  });

  it('throws for unregistered URL', async () => {
    mockFetch({ '/api/users': [] });
    await expect(fetch('/api/other')).rejects.toThrow('Unmocked fetch call');
  });

  it('matches via substring (full URL with query params)', async () => {
    mockFetch({ '/api/users': { total: 0 } });
    const res = await fetch('http://localhost:3000/api/users?page=1');
    expect(await res.json()).toEqual({ total: 0 });
  });

  it('returns text response via .text()', async () => {
    mockFetch({ '/api/ping': 'pong' });
    const res = await fetch('/api/ping');
    const text = await res.text();
    expect(text).toBe('"pong"');
  });
});

describe('mockLocalStorage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = mockLocalStorage();
  });

  it('returns null for missing keys', () => {
    expect(storage.getItem('missing')).toBeNull();
  });

  it('stores and retrieves values', () => {
    storage.setItem('key', 'value');
    expect(storage.getItem('key')).toBe('value');
  });

  it('removes items', () => {
    storage.setItem('key', 'value');
    storage.removeItem('key');
    expect(storage.getItem('key')).toBeNull();
  });

  it('clears all items', () => {
    storage.setItem('a', '1');
    storage.setItem('b', '2');
    storage.clear();
    expect(storage.length).toBe(0);
  });

  it('tracks length correctly', () => {
    expect(storage.length).toBe(0);
    storage.setItem('x', '1');
    expect(storage.length).toBe(1);
    storage.setItem('y', '2');
    expect(storage.length).toBe(2);
    storage.removeItem('x');
    expect(storage.length).toBe(1);
  });

  it('returns the key at a given index', () => {
    storage.setItem('alpha', '1');
    expect(storage.key(0)).toBe('alpha');
    expect(storage.key(99)).toBeNull();
  });
});

describe('mockConsole / restoreConsole', () => {
  it('captures console.error calls', () => {
    const mocks = mockConsole(['error']);
    console.error('test error');
    expect(mocks.error).toHaveBeenCalledWith('test error');
    restoreConsole(mocks);
  });

  it('captures console.warn calls', () => {
    const mocks = mockConsole(['warn']);
    console.warn('test warning');
    expect(mocks.warn).toHaveBeenCalledWith('test warning');
    restoreConsole(mocks);
  });

  it('mocks multiple methods at once', () => {
    const mocks = mockConsole(['warn', 'log', 'error']);
    expect(Object.keys(mocks)).toEqual(expect.arrayContaining(['warn', 'log', 'error']));
    restoreConsole(mocks);
  });

  it('defaults to mocking error and warn', () => {
    const mocks = mockConsole();
    expect(mocks.error).toBeDefined();
    expect(mocks.warn).toBeDefined();
    restoreConsole(mocks);
  });
});
