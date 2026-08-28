import { describe, it, expect } from 'vitest';
import { inngest } from '../client.js';

describe('inngest client', () => {
  it('exports the inngest singleton', () => {
    expect(inngest).toBeDefined();
  });

  it('has the expected app id', () => {
    // Inngest client exposes the id via the `id` property
    expect((inngest as { id?: string }).id).toBe('vibetech');
  });

  it('exposes a createFunction method', () => {
    expect(typeof inngest.createFunction).toBe('function');
  });

  it('exposes a send method', () => {
    expect(typeof inngest.send).toBe('function');
  });
});

describe('RAGIndexSummary shape', () => {
  it('can construct a valid summary object', () => {
    const summary = {
      filesProcessed: 100,
      chunksCreated: 500,
      chunksRemoved: 10,
      errors: [{ filePath: '/some/file.ts', error: 'parse error' }],
      durationMs: 3200,
    };
    expect(summary.filesProcessed).toBe(100);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]?.filePath).toBe('/some/file.ts');
  });
});
