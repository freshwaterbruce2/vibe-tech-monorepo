/**
 * SemanticSearchService tests
 *
 * Exercises the keyword-fallback search path (no Apex engine in jsdom) with a
 * mocked UnifiedAIService and verifies both AI call sites — semantic ranking
 * and result explanations — request a reasoning-safe token budget: reasoning
 * models spend maxTokens on reasoning first, so tiny budgets returned
 * finish_reason:"length" with empty content.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FileSystemService } from '../../services/FileSystemService';
import { SemanticSearchService } from '../../services/SemanticSearchService';
import type { UnifiedAIService } from '../../services/ai/UnifiedAIService';

const makeAiService = () => {
  const complete = vi.fn();
  return { complete, aiService: { complete } as unknown as UnifiedAIService };
};

// The fs service is only used by workspace indexing, which these tests bypass
// by seeding the cache through addFile().
const fsStub = {} as FileSystemService;

describe('SemanticSearchService', () => {
  let service: SemanticSearchService;
  let complete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mocks = makeAiService();
    complete = mocks.complete;
    complete.mockResolvedValue({ content: 'Relevant because it handles login.' });
    service = new SemanticSearchService(mocks.aiService, fsStub);
    service.addFile(
      'src/auth.ts',
      'export function login(user: string) {\n  return authenticate(user);\n}\n',
      'ts'
    );
  });

  it('finds keyword matches in indexed files and attaches AI explanations', async () => {
    const { results, metadata } = await service.search({ query: 'login handler' });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].filePath).toBe('src/auth.ts');
    expect(results[0].explanation).toBe('Relevant because it handles login.');
    expect(metadata.filesSearched).toBeGreaterThan(0);
  });

  it('gives every AI call (ranking + explanation) a token budget >= 1024', async () => {
    await service.search({ query: 'login handler' });

    expect(complete).toHaveBeenCalled();
    for (const call of complete.mock.calls) {
      expect(call[0].maxTokens).toBeGreaterThanOrEqual(1024);
    }
  });

  it('returns no results when nothing in the index matches', async () => {
    const { results } = await service.search({ query: 'zebra quantum teleport' });
    expect(results).toEqual([]);
  });
});
