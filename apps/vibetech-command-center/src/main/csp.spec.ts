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

describe('command-center CSP', () => {
  beforeEach(() => {
    vi.resetModules();
    onHeadersReceived.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('builds a production policy without unsafe-eval', async () => {
    const { buildCommandCenterCsp } = await import('./csp');
    const policy = buildCommandCenterCsp(false);

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self'");
    expect(policy).not.toContain('unsafe-eval');
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it('allows Vite HMR directives in development', async () => {
    const { buildCommandCenterCsp } = await import('./csp');
    const policy = buildCommandCenterCsp(true);

    expect(policy).toContain("'unsafe-inline'");
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain('ws://localhost:*');
  });

  it('registers a session header interceptor', async () => {
    const { applyRendererCsp, buildCommandCenterCsp } = await import('./csp');
    applyRendererCsp(false);

    expect(onHeadersReceived).toHaveBeenCalledOnce();
    const handler = onHeadersReceived.mock.calls[0]?.[0] as (
      details: { responseHeaders?: Record<string, string[]> },
      callback: (response: { responseHeaders: Record<string, string[]> }) => void,
    ) => void;

    const callback = vi.fn();
    handler({ responseHeaders: { 'X-Existing': ['1'] } }, callback);

    expect(callback).toHaveBeenCalledWith({
      responseHeaders: {
        'X-Existing': ['1'],
        'Content-Security-Policy': [buildCommandCenterCsp(false)],
      },
    });
  });
});
