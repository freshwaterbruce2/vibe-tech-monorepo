/**
 * Two-tier read-through cache. L1 is an in-process LRU (500 entries, 60s TTL).
 * L2 is Redis. Reads check L1, fall through to L2, then to the loader. Writes
 * fan out to both tiers. Used for hot product catalog lookups in the storefront.
 */

type Loader<T> = (key: string) => Promise<T>;

interface Entry<T> {
  value: T;
  expiresAtMs: number;
}

export class TwoTierCache<T> {
  private readonly l1 = new Map<string, Entry<T>>();

  constructor(
    private readonly loader: Loader<T>,
    private readonly l2Get: (k: string) => Promise<T | null>,
    private readonly l2Set: (k: string, v: T, ttlSec: number) => Promise<void>,
    private readonly ttlSec = 60,
    private readonly maxL1 = 500,
  ) {}

  async get(key: string): Promise<T> {
    const now = Date.now();
    const cached = this.l1.get(key);
    if (cached && cached.expiresAtMs > now) return cached.value;

    const fromL2 = await this.l2Get(key);
    if (fromL2 !== null) {
      this.setL1(key, fromL2, now);
      return fromL2;
    }

    const fresh = await this.loader(key);
    this.setL1(key, fresh, now);
    await this.l2Set(key, fresh, this.ttlSec);
    return fresh;
  }

  private setL1(key: string, value: T, nowMs: number): void {
    if (this.l1.size >= this.maxL1) {
      const oldest = this.l1.keys().next().value;
      if (oldest !== undefined) this.l1.delete(oldest);
    }
    this.l1.set(key, { value, expiresAtMs: nowMs + this.ttlSec * 1000 });
  }
}
