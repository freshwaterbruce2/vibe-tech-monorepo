/**
 * Custom error types for the memory package.
 *
 * These are exported from the package root so callers can use `instanceof`
 * to distinguish recoverable conditions (e.g. dimension drift) from generic
 * I/O failures.
 */

/**
 * Thrown when an embedding vector dimension does not match what the
 * SemanticStore expects (either the embedder switched models at runtime
 * or a stored row was produced by a different embedding pipeline).
 *
 * For writes (`add`) this is fatal — the row would be unsearchable, so
 * silently inserting it would corrupt the index. For reads (`search`)
 * the store returns an empty result set and increments a counter exposed
 * via `getEmbeddingHealth()` so the caller can observe the drift.
 */
export class DimensionMismatchError extends Error {
  public readonly expected: number;
  public readonly actual: number;
  public readonly provider: string;
  public readonly modelVersion: string;

  constructor(params: {
    expected: number;
    actual: number;
    provider: string;
    modelVersion: string;
    message?: string;
  }) {
    const msg =
      params.message ??
      `Embedding dimension mismatch: expected ${params.expected}d, got ${params.actual}d ` +
        `(provider=${params.provider}, model=${params.modelVersion}). ` +
        `Existing vectors are incompatible. Restore the original provider or run a re-embedding migration.`;
    super(msg);
    this.name = 'DimensionMismatchError';
    this.expected = params.expected;
    this.actual = params.actual;
    this.provider = params.provider;
    this.modelVersion = params.modelVersion;
    // Preserve prototype chain across compile targets.
    Object.setPrototypeOf(this, DimensionMismatchError.prototype);
  }
}
