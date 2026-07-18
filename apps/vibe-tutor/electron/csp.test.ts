import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const onHeadersReceived = vi.fn();

vi.mock('electron', () => ({
  session: {
    defaultSession: {
      webRequest: {
        onHeadersReceived,
      },
    },
  },
}));

describe('vibe-tutor Electron CSP', () => {
  beforeEach(() => {
    vi.resetModules();
    onHeadersReceived.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('builds production policy without unsafe-eval', async () => {
    const { buildVibeTutorElectronCsp } = await import('./csp');
    const policy = buildVibeTutorElectronCsp(false);

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain('vibe-tutor-api-734857480460.us-east4.run.app');
    expect(policy).toContain("object-src 'none'");
  });

  it('allows Vite HMR in development', async () => {
    const { buildVibeTutorElectronCsp } = await import('./csp');
    const policy = buildVibeTutorElectronCsp(true);

    expect(policy).toContain("'unsafe-inline'");
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain('http://localhost:*');
  });

  it('registers a session CSP interceptor', async () => {
    const { applyRendererCsp, buildVibeTutorElectronCsp } = await import('./csp');
    applyRendererCsp(true);

    expect(onHeadersReceived).toHaveBeenCalledOnce();
    const handler = onHeadersReceived.mock.calls[0]?.[0] as (
      details: { responseHeaders?: Record<string, string[]> },
      callback: (response: { responseHeaders: Record<string, string[]> }) => void,
    ) => void;

    const callback = vi.fn();
    handler({ responseHeaders: {} }, callback);

    expect(callback).toHaveBeenCalledWith({
      responseHeaders: {
        'Content-Security-Policy': [buildVibeTutorElectronCsp(true)],
      },
    });
  });
});
