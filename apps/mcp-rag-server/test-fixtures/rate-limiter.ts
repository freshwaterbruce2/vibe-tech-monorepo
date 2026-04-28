/**
 * Token-bucket rate limiter used by the public API gateway. Each client IP
 * gets a bucket of 60 tokens that refills at 1 token/second. When the bucket
 * is empty, requests are rejected with HTTP 429.
 */

interface Bucket {
  tokens: number;
  lastRefillMs: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly capacity = 60,
    private readonly refillPerSec = 1,
  ) {}

  allow(clientId: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(clientId) ?? { tokens: this.capacity, lastRefillMs: now };

    const elapsedSec = (now - bucket.lastRefillMs) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSec * this.refillPerSec);
    bucket.lastRefillMs = now;

    if (bucket.tokens < 1) {
      this.buckets.set(clientId, bucket);
      return false;
    }
    bucket.tokens -= 1;
    this.buckets.set(clientId, bucket);
    return true;
  }

  reset(clientId: string): void {
    this.buckets.delete(clientId);
  }
}
