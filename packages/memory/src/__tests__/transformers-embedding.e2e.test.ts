/**
 * Transformers.js v3 embedding regression test (REAL model, no mocks).
 *
 * Guards against the @huggingface/transformers v3 "blank output" regression, where
 * some feature-extraction pipelines return empty/all-zero vectors despite a clean build.
 * Exercises the exact v3 call the production fallback uses (EmbeddingService.embedWithTransformers):
 *   pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')(text, { pooling: 'mean', normalize: true })
 *
 * The production method loads the package via an indirect Function() import to dodge the tsup
 * bundler; that indirection is not loadable under Vitest's module runner, so this test imports
 * the package directly — the regression surface (the v3 library's output) is identical.
 *
 * Opt-in: requires the local model (~90MB, downloaded on first run) and is skipped in CI.
 * Run locally with:
 *   RUN_TRANSFORMERS_E2E=1 pnpm --filter @vibetech/memory test
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { EmbeddingService } from '../embeddings/EmbeddingService.js';

const RUN = process.env.RUN_TRANSFORMERS_E2E === '1';

type Extractor = (
  text: string,
  opts: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: ArrayLike<number> }>;

describe.skipIf(!RUN)('Transformers.js v3 embedding (real model)', () => {
  let extractor: Extractor;
  // cosineSimilarity is a pure helper — no init() needed to use it.
  const sim = new EmbeddingService({ dbPath: ':memory:', embeddingProvider: 'transformers' });

  beforeAll(async () => {
    const { pipeline } = await import('@huggingface/transformers');
    const featureExtraction = pipeline as unknown as (
      task: 'feature-extraction',
      model: string,
    ) => Promise<Extractor>;
    extractor = await featureExtraction('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }, 180_000);

  const embed = async (text: string): Promise<number[]> => {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  };

  it('produces a valid 384-dim normalized vector (not blank)', async () => {
    const vec = await embed('The quick brown fox jumps over the lazy dog.');

    // Shape: all-MiniLM-L6-v2 emits 384 dimensions.
    expect(vec).toHaveLength(384);

    // Every element must be a finite number (no NaN/Infinity from a broken pipeline).
    expect(vec.every((v) => Number.isFinite(v))).toBe(true);

    // Blank-output regression guard: the vector must not be all zeros.
    const nonZero = vec.filter((v) => v !== 0).length;
    expect(nonZero).toBeGreaterThan(300);

    // normalize: true means the L2 norm is ~1.0.
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    expect(norm).toBeGreaterThan(0.99);
    expect(norm).toBeLessThan(1.01);
  });

  it('is deterministic and semantically meaningful (same text → cosine ~1, different < 1)', async () => {
    const a = await embed('cats are wonderful pets');
    const b = await embed('cats are wonderful pets');
    const c = await embed('quarterly financial earnings report');

    // Identical input → identical (normalized) vector → cosine 1.
    expect(sim.cosineSimilarity(a, b)).toBeGreaterThan(0.999);
    // Unrelated input → strictly lower similarity (model encodes meaning).
    expect(sim.cosineSimilarity(a, c)).toBeLessThan(sim.cosineSimilarity(a, b));
  });
});
