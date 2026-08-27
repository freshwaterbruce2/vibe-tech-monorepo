import { session } from 'electron';

/**
 * Build a Content-Security-Policy for the Command Center renderer.
 * Dev allows Vite HMR (`unsafe-eval` / `unsafe-inline` + localhost WS).
 * Production keeps scripts locked to `'self'`.
 */
export function buildCommandCenterCsp(isDev: boolean): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self'";

  // Local WS hub + Vite dev server; IPC is preload (not network).
  const connectSrc =
    "connect-src 'self' ws://127.0.0.1:* ws://localhost:* " +
    'http://127.0.0.1:* http://localhost:*';

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    connectSrc,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/**
 * Inject CSP on all renderer responses via the default session.
 * Call once before creating BrowserWindows.
 */
export function applyRendererCsp(isDev: boolean): void {
  const policy = buildCommandCenterCsp(isDev);

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    responseHeaders['Content-Security-Policy'] = [policy];
    callback({ responseHeaders });
  });
}
