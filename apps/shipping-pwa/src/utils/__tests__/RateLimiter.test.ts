import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '../RateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', () => {
    const limiter = new RateLimiter(60000, 5);
    for (let i = 0; i < 5; i++) {
      expect(limiter.isAllowed('client-1')).toBe(true);
    }
  });

  it('blocks requests over the limit', () => {
    const limiter = new RateLimiter(60000, 3);
    expect(limiter.isAllowed('client-1')).toBe(true);
    expect(limiter.isAllowed('client-1')).toBe(true);
    expect(limiter.isAllowed('client-1')).toBe(true);
    expect(limiter.isAllowed('client-1')).toBe(false);
  });

  it('tracks clients independently', () => {
    const limiter = new RateLimiter(60000, 1);
    expect(limiter.isAllowed('client-a')).toBe(true);
    expect(limiter.isAllowed('client-b')).toBe(true);
    expect(limiter.isAllowed('client-a')).toBe(false);
    expect(limiter.isAllowed('client-b')).toBe(false);
  });

  it('resets after the window expires', () => {
    const limiter = new RateLimiter(1000, 2); // 1 second window
    expect(limiter.isAllowed('client-1')).toBe(true);
    expect(limiter.isAllowed('client-1')).toBe(true);
    expect(limiter.isAllowed('client-1')).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(1100);

    expect(limiter.isAllowed('client-1')).toBe(true);
  });

  it('reports remaining requests correctly', () => {
    const limiter = new RateLimiter(60000, 5);
    expect(limiter.getRemainingRequests('client-1')).toBe(5);

    limiter.isAllowed('client-1');
    limiter.isAllowed('client-1');
    expect(limiter.getRemainingRequests('client-1')).toBe(3);
  });

  it('returns 0 remaining when limit is reached', () => {
    const limiter = new RateLimiter(60000, 2);
    limiter.isAllowed('client-1');
    limiter.isAllowed('client-1');
    expect(limiter.getRemainingRequests('client-1')).toBe(0);
  });

  it('returns max remaining for unknown clients', () => {
    const limiter = new RateLimiter(60000, 10);
    expect(limiter.getRemainingRequests('never-seen')).toBe(10);
  });
});
