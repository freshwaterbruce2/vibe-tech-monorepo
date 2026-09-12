import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { store } = vi.hoisted(() => ({ store: {
  getStrict: vi.fn<() => unknown | null>(() => null),
  setStrict: vi.fn(),
} }));

vi.mock('../../utils/electronStore', () => ({ appStore: store }));

import { usageMonitor } from '../usageMonitor';

interface Monitor {
  usage: { dailyRequests: number; dailyScreenTime: number; lastReset: string };
  limits: { maxDailyRequests: number; maxDailyScreenTime: number; maxConsecutiveTime: number; breakDuration: number; quietHoursStart: number; quietHoursEnd: number };
  activeReservations: Set<string>;
  resetToday: () => Promise<void>;
  updateLimits: (limits: Partial<{ maxDailyRequests: number; maxDailyScreenTime: number }>) => Promise<void>;
  reserveRequest: () => { allowed: boolean; reservationId?: string; reason?: string };
  commitRequest: (reservationId: string) => Promise<boolean>;
  releaseRequest: (reservationId: string) => void;
  updateScreenTime: () => void;
  showBreakReminder: () => void;
  sessionStart: number;
  accumulatedMs: number;
  usageStorageAvailable: boolean;
  limitsStorageAvailable: boolean;
  enableDevBypass: (durationMs?: number) => void;
  disableDevBypass: () => void;
  isDevBypassActive: () => boolean;
  getDevBypassRemainingMinutes: () => number;
}

const monitor = usageMonitor as unknown as Monitor;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 1, 15, 0, 0));
  usageMonitor.disableDevBypass();
  store.getStrict.mockReset();
  store.getStrict.mockReturnValue(null);
  store.setStrict.mockReset();
  monitor.usage = { dailyRequests: 0, dailyScreenTime: 0, lastReset: new Date().toDateString() };
  monitor.limits = { maxDailyRequests: 1, maxDailyScreenTime: 120, maxConsecutiveTime: 30, breakDuration: 10, quietHoursStart: 21, quietHoursEnd: 7 };
  monitor.activeReservations.clear();
  monitor.accumulatedMs = 0;
  monitor.sessionStart = Date.now();
  monitor.usageStorageAvailable = true;
  monitor.limitsStorageAvailable = true;
});

afterEach(() => vi.useRealTimers());

describe('usageMonitor strict parent limits', () => {
  it('rejects malformed limits without mutating the confirmed configuration', async () => {
    const before = { ...monitor.limits };
    await expect(monitor.updateLimits({ maxDailyRequests: Number.NaN })).rejects.toThrow(/invalid/i);
    expect(monitor.limits).toEqual(before);
    expect(store.setStrict).not.toHaveBeenCalled();
  });

  it('writes a validated parent update strictly before publishing it', async () => {
    await monitor.updateLimits({ maxDailyRequests: 2 });
    expect(store.setStrict).toHaveBeenCalledWith('usageLimits', expect.objectContaining({ maxDailyRequests: 2 }));
    expect(monitor.limits.maxDailyRequests).toBe(2);
  });

  it('accepts a parent reply cap at 30 but rejects an apparent higher allowance', async () => {
    await expect(monitor.updateLimits({ maxDailyRequests: 30 })).resolves.toBeUndefined();
    await expect(monitor.updateLimits({ maxDailyRequests: 31 })).rejects.toThrow(/invalid/i);
    expect(monitor.limits.maxDailyRequests).toBe(30);
  });

  it('keeps the prior confirmed state when strict persistence fails', async () => {
    store.setStrict.mockImplementationOnce(() => { throw new Error('storage unavailable'); });
    await expect(monitor.updateLimits({ maxDailyRequests: 2 })).rejects.toThrow('storage unavailable');
    expect(monitor.limits.maxDailyRequests).toBe(1);
    expect(monitor.reserveRequest()).toMatchObject({ allowed: false });
  });

  it('rolls over automatically through a strict write before publishing the new day', () => {
    monitor.usage.dailyRequests = 1;
    monitor.usage.lastReset = 'yesterday';
    expect(monitor.reserveRequest()).toMatchObject({ allowed: true });
    expect(store.setStrict).toHaveBeenCalledWith('usageData', expect.objectContaining({ dailyRequests: 0 }));
    expect(monitor.usage.dailyRequests).toBe(0);
  });
});

describe('usageMonitor shared AI reply reservations', () => {
  it('blocks a second reservation at a one-reply cap and reopening follows release', () => {
    const first = monitor.reserveRequest();
    expect(first.allowed).toBe(true);
    expect(monitor.reserveRequest()).toMatchObject({ allowed: false });
    monitor.releaseRequest(first.reservationId!);
    expect(monitor.reserveRequest()).toMatchObject({ allowed: true });
  });

  it('counts a successful commit once', async () => {
    const reservation = monitor.reserveRequest();
    await expect(monitor.commitRequest(reservation.reservationId!)).resolves.toBe(true);
    expect(monitor.usage.dailyRequests).toBe(1);
    await expect(monitor.commitRequest(reservation.reservationId!)).resolves.toBe(false);
  });

  it('holds capacity closed when a real reply cannot be persisted', async () => {
    const reservation = monitor.reserveRequest();
    store.setStrict.mockImplementationOnce(() => { throw new Error('storage unavailable'); });
    await expect(monitor.commitRequest(reservation.reservationId!)).resolves.toBe(false);
    expect(monitor.reserveRequest()).toMatchObject({ allowed: false });
  });

  it('keeps an in-flight reservation across a parent reset and lets it commit once', async () => {
    const first = monitor.reserveRequest();
    await monitor.resetToday();
    expect(monitor.reserveRequest()).toMatchObject({ allowed: false });
    await expect(monitor.commitRequest(first.reservationId!)).resolves.toBe(true);
    expect(monitor.usage.dailyRequests).toBe(1);
  });
});

describe('usageMonitor visible time', () => {
  it('describes the break threshold as visible Vibe Tutor use', () => {
    monitor.showBreakReminder();
    expect(document.querySelector('.break-reminder')).toHaveTextContent(/Vibe Tutor has been visible for 30 minutes/i);
  });

  it('persists completed visible minutes before publishing them', () => {
    vi.setSystemTime(Date.now() + 60_000);
    monitor.updateScreenTime();
    expect(store.setStrict).toHaveBeenCalledWith('usageData', expect.objectContaining({ dailyScreenTime: 1 }));
    expect(monitor.usage.dailyScreenTime).toBe(1);
  });

  it('keeps elapsed whole minutes for retry when strict persistence fails', () => {
    store.setStrict.mockImplementationOnce(() => { throw new Error('storage unavailable'); });
    vi.setSystemTime(Date.now() + 60_000);
    monitor.updateScreenTime();
    expect(monitor.usage.dailyScreenTime).toBe(0);
    expect(monitor.accumulatedMs).toBe(60_000);
  });
});

describe('usageMonitor stored-state validation', () => {
  it('uses defaults for malformed usage and bypass-like limits', async () => {
    store.getStrict.mockImplementation((key: string) => key === 'usageData'
      ? { dailyRequests: 1, dailyScreenTime: 2, lastReset: 'x'.repeat(10_000) }
      : { maxDailyRequests: 999999, maxDailyScreenTime: 120, maxConsecutiveTime: 30, breakDuration: 10, quietHoursStart: 21, quietHoursEnd: 7 });
    vi.resetModules();
    const fresh = await import('../usageMonitor');
    expect(fresh.usageMonitor.getUsageStats().dailyRequests).toBe(0);
    expect(fresh.usageMonitor.getLimits().maxDailyRequests).toBe(30);
  });

  it('fails closed for a malformed stored usage value while absent first-run state remains allowed', async () => {
    store.getStrict.mockImplementation((key: string) => key === 'usageData'
      ? { dailyRequests: 1, dailyScreenTime: 2, lastReset: 'not-a-date' }
      : null);
    vi.resetModules();
    const malformed = await import('../usageMonitor');
    expect(malformed.usageMonitor.reserveRequest()).toMatchObject({ allowed: false });

    store.getStrict.mockReturnValue(null);
    vi.resetModules();
    const firstRun = await import('../usageMonitor');
    expect(firstRun.usageMonitor.reserveRequest()).toMatchObject({ allowed: true });
  });

  it('does not auto-repair malformed usage through visible-time monitoring', async () => {
    store.getStrict.mockImplementation((key: string) => key === 'usageData'
      ? { dailyRequests: 1, dailyScreenTime: 2, lastReset: 'not-a-date' }
      : null);
    vi.resetModules();
    const fresh = await import('../usageMonitor');
    const malformed = fresh.usageMonitor as unknown as Monitor;
    malformed.sessionStart = Date.now();
    vi.setSystemTime(Date.now() + 60_000);
    malformed.updateScreenTime();
    expect(store.setStrict).not.toHaveBeenCalled();
    expect(malformed.reserveRequest()).toMatchObject({ allowed: false });
    await malformed.resetToday();
    expect(malformed.reserveRequest()).toMatchObject({ allowed: true });
  });

  it('fails closed for malformed stored limits until a strict parent update repairs that path', async () => {
    store.getStrict.mockImplementation((key: string) => key === 'usageLimits'
      ? { maxDailyRequests: 999999, maxDailyScreenTime: 120, maxConsecutiveTime: 30, breakDuration: 10, quietHoursStart: 21, quietHoursEnd: 7 }
      : null);
    vi.resetModules();
    const fresh = await import('../usageMonitor');
    expect(fresh.usageMonitor.reserveRequest()).toMatchObject({ allowed: false });
    await fresh.usageMonitor.updateLimits(fresh.usageMonitor.getLimits());
    expect(fresh.usageMonitor.reserveRequest()).toMatchObject({ allowed: true });
  });

  it('strictly clamps an exact legacy 31..200 parent limit to 30 before publishing it', async () => {
    store.getStrict.mockImplementation((key: string) => key === 'usageLimits'
      ? { maxDailyRequests: 50, maxDailyScreenTime: 120, maxConsecutiveTime: 30, breakDuration: 10, quietHoursStart: 21, quietHoursEnd: 7 }
      : null);
    vi.resetModules();
    const fresh = await import('../usageMonitor');
    expect(fresh.usageMonitor.getLimits().maxDailyRequests).toBe(30);
    expect(store.setStrict).toHaveBeenCalledWith('usageLimits', expect.objectContaining({ maxDailyRequests: 30 }));
  });

  it('fails closed when strict legacy-limit migration cannot persist', async () => {
    store.getStrict.mockImplementation((key: string) => key === 'usageLimits'
      ? { maxDailyRequests: 50, maxDailyScreenTime: 120, maxConsecutiveTime: 30, breakDuration: 10, quietHoursStart: 21, quietHoursEnd: 7 }
      : null);
    store.setStrict.mockImplementation(() => { throw new Error('storage unavailable'); });
    vi.resetModules();
    const fresh = await import('../usageMonitor');
    expect(fresh.usageMonitor.reserveRequest()).toMatchObject({ allowed: false });
  });
});

describe('usageMonitor visibility transitions', () => {
  it('carries visible fractional time across a hidden transition without counting time hidden', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    monitor.sessionStart = Date.now();
    vi.setSystemTime(Date.now() + 30_000);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(monitor.accumulatedMs).toBe(30_000);

    vi.setSystemTime(Date.now() + 10 * 60_000);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    vi.setSystemTime(Date.now() + 30_000);
    monitor.updateScreenTime();
    expect(monitor.usage.dailyScreenTime).toBe(1);
    expect(store.setStrict).toHaveBeenCalledWith('usageData', expect.objectContaining({ dailyScreenTime: 1 }));
  });
});

describe('usageMonitor reset and rollover measurement boundaries', () => {
  it('does not resurrect a pre-reset visible-time fraction after a successful reset', async () => {
    vi.setSystemTime(Date.now() + 30_000);
    await monitor.resetToday();
    store.setStrict.mockClear();
    vi.setSystemTime(Date.now() + 30_000);
    monitor.updateScreenTime();
    expect(monitor.accumulatedMs).toBe(30_000);
    expect(store.setStrict).not.toHaveBeenCalled();
  });

  it('clears a prior-day visible fraction only after a successful automatic rollover', () => {
    monitor.usage.lastReset = 'yesterday';
    monitor.accumulatedMs = 30_000;
    monitor.getUsageStats();
    expect(monitor.accumulatedMs).toBe(0);
    store.setStrict.mockClear();

    vi.setSystemTime(Date.now() + 30_000);
    monitor.updateScreenTime();
    expect(monitor.accumulatedMs).toBe(30_000);
    expect(store.setStrict).not.toHaveBeenCalled();
  });
});

describe('usageMonitor developer bypass', () => {
  it('overrides quiet hours and daily caps when active', () => {
    // 1:33 AM is within quiet hours (21:00 - 07:00)
    vi.setSystemTime(new Date(2026, 6, 2, 1, 33, 0));
    expect(usageMonitor.checkQuietHours()).toBe(true);

    const blocked = monitor.reserveRequest();
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toMatch(/quiet hours/i);

    // Enable 1-hour developer bypass
    usageMonitor.enableDevBypass(3600000);
    expect(usageMonitor.isDevBypassActive()).toBe(true);
    expect(usageMonitor.checkQuietHours()).toBe(false);

    // Now request is allowed even at 1:33 AM
    const allowed = monitor.reserveRequest();
    expect(allowed.allowed).toBe(true);
    expect(allowed.reservationId).toBeDefined();

    // Disabling bypass resumes quiet hours
    usageMonitor.disableDevBypass();
    expect(usageMonitor.isDevBypassActive()).toBe(false);
    expect(usageMonitor.checkQuietHours()).toBe(true);
  });

  it('tracks remaining bypass minutes accurately', () => {
    vi.setSystemTime(new Date(2026, 6, 1, 12, 0, 0));
    usageMonitor.enableDevBypass(3600000); // 60 minutes
    expect(usageMonitor.getDevBypassRemainingMinutes()).toBe(60);

    vi.advanceTimersByTime(15 * 60 * 1000); // 15 min later
    expect(usageMonitor.getDevBypassRemainingMinutes()).toBe(45);

    vi.advanceTimersByTime(46 * 60 * 1000); // 61 min total -> expired
    expect(usageMonitor.isDevBypassActive()).toBe(false);
    expect(usageMonitor.getDevBypassRemainingMinutes()).toBe(0);
  });
});
