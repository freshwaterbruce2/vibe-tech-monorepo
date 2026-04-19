import { describe, it, expect } from 'vitest';
import { RagClient } from './rag-client';

describe('RagClient', () => {
  it('returns source=unavailable when server is not reachable', async () => {
    const client = new RagClient({
      command: process.execPath,
      args: ['-e', 'process.exit(1);'],
      connectTimeoutMs: 2_000
    });
    const result = await client.search({ query: 'test' });
    expect(result.source).toBe('unavailable');
    expect(result.hits).toEqual([]);
    expect(result.error).toBeDefined();
    await client.disconnect();
  });

  it('times out connection attempts within budget', async () => {
    const client = new RagClient({
      command: process.execPath,
      args: ['-e', 'setInterval(()=>{},1000);'],
      connectTimeoutMs: 500
    });
    const start = Date.now();
    const result = await client.search({ query: 'test' });
    const elapsed = Date.now() - start;
    expect(result.source).toBe('unavailable');
    expect(elapsed).toBeLessThan(3_000);
    await client.disconnect();
  });

  it('parseHits handles missing content gracefully', () => {
    class Exposed extends RagClient {
      public parsePublic(r: unknown) {
        // @ts-expect-error access private
        return this.parseHits(r);
      }
    }
    const ex = new Exposed();
    expect(ex.parsePublic({})).toEqual([]);
    expect(ex.parsePublic({ content: [] })).toEqual([]);
    expect(ex.parsePublic({ content: [{ type: 'text', text: 'not json' }] })).toEqual([]);
  });

  it('parseHits extracts valid hit entries from JSON text block', () => {
    class Exposed extends RagClient {
      public parsePublic(r: unknown) {
        // @ts-expect-error access private
        return this.parseHits(r);
      }
    }
    const ex = new Exposed();
    const response = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            hits: [
              { score: 0.91, path: 'C:\\dev\\apps\\nova-agent\\src\\index.ts', language: 'typescript', snippet: 'export const x', startLine: 1, endLine: 3 },
              { score: 0.77, path: 'C:\\dev\\packages\\shared\\src\\util.ts', language: 'typescript', snippet: 'function y()', startLine: 10, endLine: 15 }
            ]
          })
        }
      ]
    };
    const hits = ex.parsePublic(response);
    expect(hits).toHaveLength(2);
    expect(hits[0]?.score).toBe(0.91);
    expect(hits[0]?.path).toContain('nova-agent');
  });
});
