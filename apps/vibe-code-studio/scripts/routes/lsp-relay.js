/**
 * LSP WebSocket relay route for the port-5004 backend.
 *
 * Bridges a browser WebSocket (`ws://localhost:5004/lsp/<languageId>`) to a
 * stdio language server: the client speaks RAW JSON-RPC over the socket; this
 * relay adds/strips the LSP Content-Length framing to/from the server's stdio.
 *
 * All external effects (`spawn`, server resolution, origin check, the WS server)
 * are injected so the routing/bridging logic is unit-testable with fakes.
 */

import { createFramer, encodeMessage } from '../lib/lsp-framing.js';

/**
 * Extract the languageId from a `/lsp/<languageId>` upgrade URL.
 * @param {string | undefined} url
 * @returns {string | null}
 */
export function parseLanguageId(url) {
  if (!url) return null;
  const pathname = url.split('?')[0];
  const match = /^\/lsp\/([^/]+)$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Wire a connected WebSocket to a freshly spawned language server. Exported for
 * testing.
 * @param {any} ws
 * @param {{ command: string, args: string[] }} spec
 * @param {{ spawn: Function, logger?: Console }} deps
 */
export function bridgeServer(ws, spec, { spawn, logger = console }) {
  let child;
  try {
    child = spawn(spec.command, spec.args);
  } catch (err) {
    logger.error('[lsp-relay] spawn threw', err);
    ws.close();
    return;
  }

  const isOpen = () => ws.readyState === ws.OPEN;
  const framer = createFramer(body => {
    if (isOpen()) ws.send(body);
  });

  child.on('error', err => {
    logger.error('[lsp-relay] server error', err);
    if (isOpen()) ws.close();
  });
  child.stdout?.on('data', chunk => framer.push(chunk));
  child.stderr?.on('data', chunk => logger.error('[lsp-relay:stderr]', chunk.toString()));
  child.on('exit', () => {
    if (isOpen()) ws.close();
  });

  ws.on('message', data => {
    if (child.stdin?.writable) {
      child.stdin.write(encodeMessage(data.toString()));
    }
  });
  ws.on('close', () => {
    if (typeof child.kill === 'function') child.kill();
  });
}

/**
 * @typedef {object} LspUpgradeDeps
 * @property {any} wss
 * @property {Function} spawn
 * @property {Function} resolveServer
 * @property {Function} isAllowedOrigin
 * @property {Console} [logger]
 */

/**
 * Handle a `/lsp/*` HTTP upgrade: validate origin + language, then complete the
 * WS handshake and bridge to the resolved language server. On any rejection the
 * socket is destroyed/closed so the client falls back to Monaco (spec AC10).
 * @param {import('http').IncomingMessage} request
 * @param {import('stream').Duplex} socket
 * @param {Buffer} head
 * @param {LspUpgradeDeps} deps
 */
export function handleLspUpgrade(request, socket, head, deps) {
  const { wss, spawn, resolveServer, isAllowedOrigin, logger = console } = deps;

  if (!isAllowedOrigin(request.headers?.origin)) {
    logger.warn('[lsp-relay] rejected cross-origin upgrade');
    socket.destroy();
    return;
  }

  const languageId = parseLanguageId(request.url);
  const spec = languageId ? resolveServer(languageId) : null;
  if (!spec) {
    logger.warn(`[lsp-relay] no server for languageId="${languageId}"`);
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, ws => {
    logger.log(`[lsp-relay] bridging ${languageId} → ${spec.command}`);
    bridgeServer(ws, spec, { spawn, logger });
  });
}
