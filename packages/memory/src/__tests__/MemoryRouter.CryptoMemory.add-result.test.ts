import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from '../core/MemoryRouter.js';
import type { MemoryManager } from '../core/MemoryManager.js';
import { CryptoMemory } from '../integrations/CryptoMemory.js';

describe('add-result callers', () => {
  it('does not return an id from MemoryRouter when semantic add is rejected', async () => {
    const router = new MemoryRouter();
    const manager = {
      semantic: {
        add: vi.fn(async () => ({
          status: 'rejected_duplicate' as const,
          existingId: 42,
          similarity: 0.88,
          conflicts: [],
        })),
      },
    } as unknown as MemoryManager;

    const result = await router.route('important architecture insight', manager, undefined, {
      forceType: 'semantic',
    });

    expect(result.type).toBe('semantic');
    expect(result.semanticStatus).toBe('rejected_duplicate');
    expect(result.id).toBeUndefined();
  });

  it('returns zero from CryptoMemory.trackAnalysis when semantic add is rejected', async () => {
    const semanticAdd = vi.fn(async () => ({
      status: 'rejected_duplicate' as const,
      existingId: 7,
      similarity: 0.89,
      conflicts: [],
    }));
    const crypto = new CryptoMemory({
      semantic: { add: semanticAdd },
    } as unknown as MemoryManager);

    const id = await crypto.trackAnalysis({
      pair: 'BTC/USD',
      timeframe: '1h',
      indicators: { rsi: 51 },
      sentiment: 'neutral',
      confidence: 0.8,
      timestamp: Date.now(),
    });

    expect(id).toBe(0);
    expect(semanticAdd).toHaveBeenCalledOnce();
  });
});
