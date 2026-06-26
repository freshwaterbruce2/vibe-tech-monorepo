import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RAGCache } from './cache.js';
import type { Chunk, SearchResult } from './types.js';

function makeResult(filePath: string, content = 'hello'): SearchResult {
  const chunk: Chunk = {
    id: `${filePath}:${content}`,
    filePath,
    content,
    type: 'text',
    startLine: 1,
    endLine: 1,
    language: 'typescript',
    tokenCount: 1,
    createdAt: 0,
  };
  return { chunk, score: 0.9, vectorScore: 0.9, ftsScore: 0.8, source: 'hybrid' };
}

describe('RAGCache', () => {
  let cache: RAGCache;

  beforeEach(() => {
    // ':memory:' bypasses the D:\ path-segregation guard in @vibetech/db-app.
    cache = new RAGCache({ cachePath: ':memory:', cacheTtlMs: 60_000 });
  });

  afterEach(() => {
    cache.close();
    vi.useRealTimers();
  });

  it('returns null on a cache miss', () => {
    expect(cache.get('never stored')).toBeNull();
  });

  it('round-trips stored results and counts a hit', () => {
    const results = [makeResult('src/a.ts')];
    cache.set('query', results);

    const got = cache.get('query');
    expect(got).toEqual(results);
    expect(cache.getStats().hits).toBe(1);
  });

  it('normalizes query keys (case/whitespace insensitive)', () => {
    cache.set('Hello   World', [makeResult('src/a.ts')]);
    expect(cache.get('hello world')).not.toBeNull();
  });

  it('expires entries past their TTL', () => {
    vi.useFakeTimers();
    cache.set('q', [makeResult('src/a.ts')], 1_000);
    vi.advanceTimersByTime(1_500);
    expect(cache.get('q')).toBeNull();
    expect(cache.getStats().misses).toBe(1);
  });

  it('invalidates only entries referencing changed paths', () => {
    cache.set('q1', [makeResult('src/a.ts')]);
    cache.set('q2', [makeResult('src/b.ts')]);

    const invalidated = cache.invalidateByPaths(['src/a.ts']);
    expect(invalidated).toBe(1);
    expect(cache.get('q1')).toBeNull();
    expect(cache.get('q2')).not.toBeNull();
  });

  it('cleanExpired removes stale rows and reports the count', () => {
    vi.useFakeTimers();
    cache.set('q', [makeResult('src/a.ts')], 1_000);
    vi.advanceTimersByTime(2_000);
    expect(cache.cleanExpired()).toBe(1);
  });

  it('clear empties the cache and resets counters', () => {
    cache.set('q', [makeResult('src/a.ts')]);
    cache.get('q');
    cache.clear();

    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });

  it('reports stats for stored entries', () => {
    cache.set('q', [makeResult('src/a.ts')]);
    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(1);
    expect(stats.totalSizeBytes).toBeGreaterThan(0);
  });
});
