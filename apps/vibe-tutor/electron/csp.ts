import { session } from 'electron';

const PRODUCTION_API = 'https://vibe-tutor-api-734857480460.us-east4.run.app';

/**
 * Build a Content-Security-Policy for the Vibe Tutor Electron renderer.
 * Mirrors web CSP_DIRECTIVES (render-backend) with Electron/Vite adjustments.
 */
export function buildVibeTutorElectronCsp(isDev: boolean): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' http://localhost:*"
    : "script-src 'self' 'wasm-unsafe-eval'";

  const connectSrc = [
    "'self'",
    PRODUCTION_API,
    'https:',
    'http:',
    'ws:',
    'wss:',
    'http://localhost:*',
    'ws://localhost:*',
    'http://127.0.0.1:*',
    'ws://127.0.0.1:*',
  ].join(' ');

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.cdnfonts.com",
    "font-src 'self' https://fonts.gstatic.com https://fonts.cdnfonts.com data:",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' blob: data: https: http:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
  ].join('; ');
}

/**
 * Inject CSP on all renderer responses via the default session.
 * Call once before creating BrowserWindows.
 */
export function applyRendererCsp(isDev: boolean): void {
  const policy = buildVibeTutorElectronCsp(isDev);

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    responseHeaders['Content-Security-Policy'] = [policy];
    callback({ responseHeaders });
  });
}
