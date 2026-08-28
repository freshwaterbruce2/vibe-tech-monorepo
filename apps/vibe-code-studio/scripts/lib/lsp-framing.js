/**
 * LSP Content-Length message framing (pure, no I/O).
 *
 * The Language Server Protocol frames each JSON-RPC message as
 * `Content-Length: <bytes>\r\n\r\n<utf8-json>`. This module encodes outgoing
 * messages and reassembles incoming byte streams into complete message bodies.
 *
 * Ported from backend/lsp-proxy/src/index.js, fixed to be byte-correct: the
 * original mixed a byte-count header with string-index slicing, which corrupts
 * messages containing multi-byte UTF-8 characters. Here all buffering is done on
 * Buffers and only sliced back to strings on complete-message boundaries.
 */

/**
 * Frame a JSON-RPC message (object or pre-serialized string) for stdin.
 * @param {unknown} message
 * @returns {string} the `Content-Length`-headed wire string
 */
export function encodeMessage(message) {
  const json = typeof message === 'string' ? message : JSON.stringify(message);
  const contentLength = Buffer.byteLength(json, 'utf8');
  return `Content-Length: ${contentLength}\r\n\r\n${json}`;
}

/**
 * Create a streaming framer that accumulates raw chunks (Buffer or string) and
 * invokes `onMessage(body)` once per complete Content-Length-framed message,
 * where `body` is the decoded UTF-8 JSON string.
 * @param {(body: string) => void} onMessage
 * @returns {{ push: (chunk: Buffer | string) => void }}
 */
export function createFramer(onMessage) {
  let buffer = Buffer.alloc(0);

  const push = chunk => {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf8');
    buffer = Buffer.concat([buffer, bytes]);

    for (;;) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const header = buffer.subarray(0, headerEnd).toString('utf8');
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        // Unframed/garbage header — drop it and resync past the separator.
        buffer = buffer.subarray(headerEnd + 4);
        continue;
      }

      const contentLength = Number.parseInt(match[1], 10);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;
      if (buffer.length < messageEnd) break; // wait for more bytes

      const body = buffer.subarray(messageStart, messageEnd).toString('utf8');
      buffer = buffer.subarray(messageEnd);
      onMessage(body);
    }
  };

  return { push };
}
