import { afterEach, describe, expect, it, vi } from 'vitest';
import { usageMonitor } from '../usageMonitor';

/**
 * usageMonitor is a singleton constructed at import time. We poke its private
 * state via a narrow cast for the screen-time test and drive the clock with
 * fake timers for quiet-hours enforcement.
 */
type Pokeable = {
  sessionStart: number;
  accumulatedMs: number;
  usage: { dailyScreenTime: number; dailyRequests: number };
  updateScreenTime: () => void;
};

afterEach(() => {
  vi.useRealTimers();
});

describe('usageMonitor — quiet hours enforcement (SVC-10)', () => {
  it('blocks requests during quiet hours (10 PM)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1, 22, 0, 0));

    const result = usageMonitor.canMakeRequest();
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/quiet hours/i);
  });

  it('allows requests outside quiet hours (3 PM)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1, 15, 0, 0));

    const poke = usageMonitor as unknown as Pokeable;
    poke.usage.dailyRequests = 0;
    poke.usage.dailyScreenTime = 0;

    const result = usageMonitor.canMakeRequest();
    expect(result.allowed).toBe(true);
  });
});

describe('usageMonitor — screen time accumulation (SVC-10)', () => {
  it('credits whole minutes and preserves the sub-minute remainder', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1, 15, 0, 0));

    const poke = usageMonitor as unknown as Pokeable;
    poke.usage.dailyScreenTime = 0;
    poke.accumulatedMs = 0;
    poke.sessionStart = Date.now();

    // 90s elapsed -> 1 whole minute credited, 30s carried over.
    vi.setSystemTime(Date.now() + 90_000);
    poke.updateScreenTime();
    expect(poke.usage.dailyScreenTime).toBe(1);
    expect(poke.accumulatedMs).toBe(30_000);

    // +40s (30s carried + 40s = 70s) -> another whole minute, 10s carried.
    poke.sessionStart = Date.now();
    vi.setSystemTime(Date.now() + 40_000);
    poke.updateScreenTime();
    expect(poke.usage.dailyScreenTime).toBe(2);
    expect(poke.accumulatedMs).toBe(10_000);
  });
});
