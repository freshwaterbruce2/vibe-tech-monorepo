import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

import {
  bridgeServer,
  handleLspUpgrade,
  parseLanguageId,
} from '../../../scripts/routes/lsp-relay.js';
import { encodeMessage } from '../../../scripts/lib/lsp-framing.js';

function makeChild() {
  const child = new EventEmitter() as EventEmitter & Record<string, unknown>;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = { writable: true, write: vi.fn() };
  child.kill = vi.fn();
  return child;
}

function makeWs() {
  const ws = new EventEmitter() as EventEmitter & Record<string, unknown>;
  ws.OPEN = 1;
  ws.readyState = 1;
  ws.send = vi.fn();
  ws.close = vi.fn(() => {
    ws.readyState = 3;
  });
  return ws;
}

const silentLogger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as Console;

describe('parseLanguageId', () => {
  it('extracts the languageId from a /lsp/<id> path', () => {
    expect(parseLanguageId('/lsp/typescript')).toBe('typescript');
    expect(parseLanguageId('/lsp/rust?foo=1')).toBe('rust');
  });

  it('returns null for non-lsp or malformed urls', () => {
    expect(parseLanguageId('/other')).toBeNull();
    expect(parseLanguageId('/lsp/')).toBeNull();
    expect(parseLanguageId(undefined)).toBeNull();
  });
});

describe('bridgeServer', () => {
  let ws: ReturnType<typeof makeWs>;
  let child: ReturnType<typeof makeChild>;
  const spec = { command: 'typescript-language-server', args: ['--stdio'] };

  beforeEach(() => {
    ws = makeWs();
    child = makeChild();
  });

  it('frames client messages onto the server stdin', () => {
    const spawn = vi.fn(() => child);
    bridgeServer(ws, spec, { spawn, logger: silentLogger });
    ws.emit('message', '{"jsonrpc":"2.0","id":1}');
    expect((child.stdin as { write: ReturnType<typeof vi.fn> }).write).toHaveBeenCalledWith(
      encodeMessage('{"jsonrpc":"2.0","id":1}')
    );
  });

  it('unframes server stdout and sends bodies to the socket', () => {
    const spawn = vi.fn(() => child);
    bridgeServer(ws, spec, { spawn, logger: silentLogger });
    (child.stdout as EventEmitter).emit('data', Buffer.from(encodeMessage({ ok: true }), 'utf8'));
    expect(ws.send).toHaveBeenCalledWith('{"ok":true}');
  });

  it('kills the child when the socket closes', () => {
    const spawn = vi.fn(() => child);
    bridgeServer(ws, spec, { spawn, logger: silentLogger });
    ws.emit('close');
    expect(child.kill).toHaveBeenCalled();
  });

  it('closes the socket when the server exits', () => {
    const spawn = vi.fn(() => child);
    bridgeServer(ws, spec, { spawn, logger: silentLogger });
    (child as EventEmitter).emit('exit', 0);
    expect(ws.close).toHaveBeenCalled();
  });

  it('closes the socket when spawn throws (fallback path)', () => {
    const spawn = vi.fn(() => {
      throw new Error('ENOENT');
    });
    bridgeServer(ws, spec, { spawn, logger: silentLogger });
    expect(ws.close).toHaveBeenCalled();
  });

  it('closes the socket on a child error event', () => {
    const spawn = vi.fn(() => child);
    bridgeServer(ws, spec, { spawn, logger: silentLogger });
    (child as EventEmitter).emit('error', new Error('spawn ENOENT'));
    expect(ws.close).toHaveBeenCalled();
  });
});

describe('handleLspUpgrade', () => {
  let ws: ReturnType<typeof makeWs>;
  let child: ReturnType<typeof makeChild>;
  let socket: { destroy: ReturnType<typeof vi.fn> };
  let wss: { handleUpgrade: ReturnType<typeof vi.fn> };
  let spawn: ReturnType<typeof vi.fn>;
  const resolveServer = (id: string) =>
    id === 'typescript' ? { command: 'typescript-language-server', args: ['--stdio'] } : null;

  beforeEach(() => {
    ws = makeWs();
    child = makeChild();
    socket = { destroy: vi.fn() };
    wss = { handleUpgrade: vi.fn((_req, _sock, _head, cb) => cb(ws)) };
    spawn = vi.fn(() => child);
  });

  it('bridges a valid /lsp/typescript upgrade', () => {
    const request = { url: '/lsp/typescript', headers: { origin: 'tauri://localhost' } };
    handleLspUpgrade(request as never, socket as never, Buffer.alloc(0), {
      wss,
      spawn,
      resolveServer,
      isAllowedOrigin: () => true,
      logger: silentLogger,
    });
    expect(wss.handleUpgrade).toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledWith('typescript-language-server', ['--stdio']);
    expect(socket.destroy).not.toHaveBeenCalled();
  });

  it('destroys the socket on a disallowed origin', () => {
    const request = { url: '/lsp/typescript', headers: { origin: 'https://evil.example' } };
    handleLspUpgrade(request as never, socket as never, Buffer.alloc(0), {
      wss,
      spawn,
      resolveServer,
      isAllowedOrigin: () => false,
      logger: silentLogger,
    });
    expect(socket.destroy).toHaveBeenCalled();
    expect(wss.handleUpgrade).not.toHaveBeenCalled();
  });

  it('destroys the socket for an unsupported language', () => {
    const request = { url: '/lsp/cobol', headers: { origin: 'tauri://localhost' } };
    handleLspUpgrade(request as never, socket as never, Buffer.alloc(0), {
      wss,
      spawn,
      resolveServer,
      isAllowedOrigin: () => true,
      logger: silentLogger,
    });
    expect(socket.destroy).toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });
});
