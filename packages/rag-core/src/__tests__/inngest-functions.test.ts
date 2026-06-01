import { describe, it, expect } from 'vitest';
import { ragIndexPipeline, isExcluded } from '../inngest-functions.js';
import { DEFAULT_RAG_CONFIG } from '../types.js';

describe('ragIndexPipeline', () => {
  it('is a valid Inngest function with correct id', () => {
    expect(ragIndexPipeline).toBeDefined();
    expect(typeof ragIndexPipeline).toBe('object');
    // The Inngest function exposes an id via its options
    expect((ragIndexPipeline as any).opts?.id ?? (ragIndexPipeline as any).id).toContain('rag-index');
  });
});

describe('isExcluded', () => {
  const config = DEFAULT_RAG_CONFIG;

  it('excludes node_modules paths under project dirs', () => {
    expect(isExcluded('apps/nova-agent/node_modules/pkg/index.ts', config)).toBe(true);
    expect(isExcluded('packages/shared/node_modules/@types/node/index.d.ts', config)).toBe(true);
  });

  it('excludes dist directories under project dirs', () => {
    expect(isExcluded('packages/core/dist/types.d.ts', config)).toBe(true);
    expect(isExcluded('apps/nova-agent/dist/index.js', config)).toBe(true);
  });

  it('excludes .git paths', () => {
    expect(isExcluded('apps/nova-agent/.git/config', config)).toBe(true);
  });

  it('excludes test files', () => {
    expect(isExcluded('apps/nova-agent/src/foo.test.ts', config)).toBe(true);
    expect(isExcluded('packages/core/src/bar.spec.ts', config)).toBe(true);
  });

  it('allows normal source files', () => {
    expect(isExcluded('apps/nova-agent/src/rag/indexer.ts', config)).toBe(false);
    expect(isExcluded('packages/core/src/types.ts', config)).toBe(false);
  });
});
