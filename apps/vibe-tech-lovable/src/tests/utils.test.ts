import { afterEach, describe, expect, it, vi } from 'vitest';

describe('browser utilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('reads browser dimensions and reports a non-touch landscape', async () => {
    vi.stubGlobal('window', {
      innerWidth: 1280,
      innerHeight: 720,
      scrollY: 180,
    });
    vi.stubGlobal('navigator', { maxTouchPoints: 0 });
    vi.resetModules();

    const { getScreenSize, isBrowser, isTouchDevice, safeWindow } = await import(
      '../lib/utils'
    );

    expect(isBrowser).toBe(true);
    expect(getScreenSize()).toEqual({ width: 1280, height: 720, isPortrait: false });
    expect(isTouchDevice()).toBe(false);
    expect(safeWindow.width).toBe(1280);
    expect(safeWindow.height).toBe(720);
    expect(safeWindow.scrollY).toBe(180);
  });

  it('uses safe fallbacks outside a browser', async () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('navigator', undefined);
    vi.resetModules();

    const { getScreenSize, isBrowser, isTouchDevice, safeWindow } = await import(
      '../lib/utils'
    );

    expect(isBrowser).toBe(false);
    expect(getScreenSize()).toEqual({ width: 0, height: 0, isPortrait: true });
    expect(isTouchDevice()).toBe(false);
    expect(safeWindow.width).toBe(0);
    expect(safeWindow.height).toBe(0);
    expect(safeWindow.scrollY).toBe(0);
  });
});
