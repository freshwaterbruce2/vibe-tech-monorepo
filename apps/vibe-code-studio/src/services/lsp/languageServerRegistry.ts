/**
 * Client-side language-server registry: which Monaco `languageId`s have an LSP
 * server behind the backend relay, and the WebSocket URL to reach each one.
 * The relay itself lives in the port-5004 backend (`scripts/routes/lsp-relay.js`).
 */

/** Backend relay port (the bundled/dev port-5004 Node backend). */
export const LSP_BACKEND_PORT = 5004;

const SUPPORTED = new Set([
  'typescript',
  'javascript',
  'typescriptreact',
  'javascriptreact',
  'python',
  'rust',
]);

/** True when a Monaco languageId has a language server behind the relay. */
export function isSupportedLanguage(languageId: string): boolean {
  return SUPPORTED.has(languageId);
}

/** WebSocket URL for a language's relay endpoint. */
export function wsUrl(languageId: string, port: number = LSP_BACKEND_PORT): string {
  return `ws://localhost:${port}/lsp/${encodeURIComponent(languageId)}`;
}
