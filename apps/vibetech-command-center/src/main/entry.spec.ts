import { beforeEach, describe, expect, it, vi } from 'vitest';

const whenReady = vi.fn(() => Promise.resolve());
const applyRendererCsp = vi.fn();

vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    whenReady,
  },
}));

vi.mock('./csp', () => ({
  applyRendererCsp,
}));

vi.mock('./index', () => ({}));

describe('command-center main entry', () => {
  beforeEach(() => {
    vi.resetModules();
    whenReady.mockClear();
    applyRendererCsp.mockClear();
    whenReady.mockImplementation(() => Promise.resolve());
  });

  it('schedules CSP apply on app ready then loads index', async () => {
    await import('./entry');

    expect(whenReady).toHaveBeenCalledOnce();
    await vi.waitFor(() => {
      expect(applyRendererCsp).toHaveBeenCalledWith(false);
    });
  });
});
