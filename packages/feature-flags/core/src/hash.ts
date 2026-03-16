import murmur from 'murmurhash';

/**
 * Consistent hashing for percentage rollouts and variant assignment.
 * Uses MurmurHash3 for fast, well-distributed hashing.
 * 
 * The same userId + flagKey will always get the same bucket,
 * ensuring consistent user experience.
 */

/**
 * Get a bucket value (0-99) for a given identifier and flag key.
 * Used for percentage rollouts.
 */
export function getBucket(identifier: string, flagKey: string): number {
  const hashInput = `${flagKey}:${identifier}`;
  const hash = murmur.v3(hashInput);
  return Math.abs(hash) % 100;
}

/**
 * Check if an identifier is within a percentage rollout.
 * 
 * @param identifier - User ID or session ID
 * @param flagKey - The flag key (ensures different flags have different distributions)
 * @param percentage - Target percentage (0-100)
 * @returns true if the identifier is within the rollout percentage
 */
export function isInPercentageRollout(
  identifier: string,
  flagKey: string,
  percentage: number
): boolean {
  if (percentage <= 0) return false;
  if (percentage >= 100) return true;
  
  const bucket = getBucket(identifier, flagKey);
  return bucket < percentage;
}

/**
 * Assign a variant based on weights.
 * 
 * @param identifier - User ID or session ID
 * @param flagKey - The flag key
 * @param variants - Array of variants with weights (weights should sum to 100)
 * @returns The assigned variant key
 */
export function assignVariant(
  identifier: string,
  flagKey: string,
  variants: Array<{ key: string; weight: number }>
): string {
  if (variants.length === 0) {
    throw new Error('No variants provided');
  }
  
  if (variants.length === 1) {
    const first = variants[0];
    if (first) {
      return first.key;
    }
  }
  
  const bucket = getBucket(identifier, flagKey);
  
  let cumulativeWeight = 0;
  for (const variant of variants) {
    cumulativeWeight += variant.weight;
    if (bucket < cumulativeWeight) {
      return variant.key;
    }
  }
  
  // Fallback to last variant (handles rounding errors)
  const last = variants[variants.length - 1];
  return last?.key ?? variants[0]?.key ?? '';
}

/**
 * Generate a deterministic session ID from available context.
 * Used when no explicit identifier is provided.
 */
export function generateSessionId(context: {
  appName?: string;
  timestamp?: number;
  random?: string;
}): string {
  const parts = [
    context.appName ?? 'unknown',
    context.timestamp ?? Date.now(),
    context.random ?? Math.random().toString(36).substring(2, 15)
  ];
  
  return murmur.v3(parts.join(':')).toString(36);
}
