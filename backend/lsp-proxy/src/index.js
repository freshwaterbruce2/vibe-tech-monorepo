/**
 * LSP Proxy - WebSocket to Language Server Bridge
 * Port: 5002 (as per documentation)
 */

// @ts-check

const WebSocket = require('ws');
const { spawn } = require('child_process');

/** @typedef {'typescript' | 'javascript' | 'python' | 'rust'} LanguageKey */
/** @typedef {{ command: string; args: string[] }} LanguageServerCommand */

/**
 * @param {string | number | undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function parsePort(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

const PORT = parsePort(process.env.PORT, 5002);
const wss = new WebSocket.Server({ port: PORT });

// eslint-disable-next-line no-console -- server startup logging
console.log(`LSP Proxy listening on port ${PORT}`);

/**
 * @type {Record<LanguageKey, LanguageServerCommand>}
 */
const servers = {
  typescript: { command: 'typescript-language-server', args: ['--stdio'] },
  javascript: { command: 'typescript-language-server', args: ['--stdio'] },
  python: { command: 'pyright-langserver', args: ['--stdio'] },
  rust: { command: 'rust-analyzer', args: [] },
};

/**
 * @param {unknown} languageId
 * @returns {LanguageServerCommand}
 */
function getLanguageServerCommand(languageId) {
  if (typeof languageId === 'string' && languageId in servers) {
    return servers[/** @type {LanguageKey} */ (languageId)];
  }
  return servers.typescript;
}

wss.on('connection', (ws) => {
  // eslint-disable-next-line no-console -- connection event logging
  console.log('Client connected');

  /** @type {import('child_process').ChildProcess | null} */
  let lspProcess = null;
  let buffer = '';

  ws.on('message', (data) => {
    const message = data.toString();

    // Parse JSON-RPC message
    try {
      const jsonRpc = JSON.parse(message);

      // Initialize request - spawn language server
      if (jsonRpc.method === 'initialize') {
        const languageId = jsonRpc.params?.capabilities?.textDocument?.languageId || 'typescript';

        // Spawn appropriate language server
        const lsCommand = getLanguageServerCommand(languageId);
        lspProcess = spawn(lsCommand.command, lsCommand.args);

        lspProcess.stdout?.on('data', (data) => {
            buffer += data.toString();
            processBuffer();
        });

        lspProcess.stderr?.on('data', (data) => {
            console.error('LSP stderr:', data.toString());
        });

        lspProcess.on('close', (code) => {
            console.warn(`LSP process exited with code ${code}`);
        });
      }

      // Forward message to language server
      if (lspProcess?.stdin?.writable) {
        const content = JSON.stringify(jsonRpc);
        const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
        lspProcess.stdin.write(header + content);
      }

    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  });

  function processBuffer() {
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const header = buffer.substring(0, headerEnd);
      const contentLengthMatch = header.match(/Content-Length: (\d+)/);

      if (!contentLengthMatch) break;

      const rawLength = contentLengthMatch[1];
      if (!rawLength) break;
      const contentLength = Number.parseInt(rawLength, 10);
      if (!Number.isFinite(contentLength)) break;
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;

      if (buffer.length < messageEnd) break;

      const content = buffer.substring(messageStart, messageEnd);
      buffer = buffer.substring(messageEnd);

      // Send to WebSocket client
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(content);
      }
    }
  }

  ws.on('close', () => {
    // eslint-disable-next-line no-console -- disconnection event logging
    console.log('Client disconnected');
    if (lspProcess?.kill) {
      lspProcess.kill();
    }
  });
});

// eslint-disable-next-line no-console -- server startup logging
console.log('LSP Proxy ready. Waiting for connections...');
