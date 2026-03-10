/**
 * DAP Proxy - WebSocket to Debug Adapter Bridge
 * Port: 5003 (as per documentation - FIXED from incorrect 5002)
 *
 * BUG FIX: Changed from port 5002 to 5003 to avoid conflict with LSP proxy
 */

// @ts-check

const WebSocket = require('ws');
const { spawn } = require('child_process');

/** @typedef {'node' | 'python'} AdapterKey */
/** @typedef {{ command: string; args: string[] }} AdapterCommand */

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

// FIXED: Changed default port from 5002 to 5003
const PORT = parsePort(process.env.PORT, 5003);
const wss = new WebSocket.Server({ port: PORT });

console.warn(`DAP Proxy listening on port ${PORT}`);

/**
 * @type {Record<AdapterKey, AdapterCommand>}
 */
const adapters = {
  node: { command: 'node', args: ['--inspect-brk'] },
  python: { command: 'python', args: ['-m', 'debugpy', '--listen', '5678'] },
};

/**
 * @param {unknown} adapterType
 * @returns {AdapterCommand}
 */
function getDebugAdapter(adapterType) {
  if (typeof adapterType === 'string' && adapterType in adapters) {
    return adapters[/** @type {AdapterKey} */ (adapterType)];
  }
  return adapters.node;
}

wss.on('connection', (ws) => {
  console.warn('Debug client connected');

  /** @type {import('child_process').ChildProcess | null} */
  let dapProcess = null;
  let buffer = '';

  ws.on('message', (data) => {
    const message = data.toString();

    try {
      const dapMessage = JSON.parse(message);

      // Initialize request - spawn debug adapter
      if (dapMessage.command === 'initialize') {
        const adapterType = dapMessage.arguments?.adapterID || 'node';

        const adapter = getDebugAdapter(adapterType);
        dapProcess = spawn(adapter.command, adapter.args);

        dapProcess.stdout?.on('data', (data) => {
          buffer += data.toString();
          processBuffer();
        });

        dapProcess.stderr?.on('data', (data) => {
          console.error('DAP stderr:', data.toString());
        });

        dapProcess.on('close', (code) => {
          console.warn(`DAP process exited with code ${code}`);
        });
      }

      // Forward message to debug adapter
      if (dapProcess?.stdin?.writable) {
        const content = JSON.stringify(dapMessage);
        const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
        dapProcess.stdin.write(header + content);
      }
    } catch (error) {
      console.error('Failed to parse DAP message:', error);
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
    console.warn('Debug client disconnected');
    if (dapProcess?.kill) {
      dapProcess.kill();
    }
  });
});

console.warn('DAP Proxy ready. Waiting for debug connections...');
