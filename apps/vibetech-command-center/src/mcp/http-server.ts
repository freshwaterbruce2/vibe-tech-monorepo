import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import {
  createServiceContainer,
  disposeServiceContainer,
  type ServiceContainer
} from '../main/service-container';
import { createCommandCenterMcpServer } from './server-core';

const MONOREPO_ROOT = 'C:\\dev';
const DEFAULT_PORT = 3211;

interface SessionState {
  container: ServiceContainer;
  server: ReturnType<typeof createCommandCenterMcpServer>;
  transport: StreamableHTTPServerTransport;
}

const sessions = new Map<string, SessionState>();

const log = (message: string): void => {
  process.stderr.write(`[mcp-command-center-http] ${message}\n`);
};

function applyCors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,mcp-session-id,last-event-id');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : undefined;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent) return;
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function closeSession(sessionId: string): Promise<void> {
  const state = sessions.get(sessionId);
  if (!state) return;

  sessions.delete(sessionId);
  try { await state.server.close(); } catch {}
  try { await state.transport.close(); } catch {}
  try { await disposeServiceContainer(state.container); } catch {}
  log(`closed session ${sessionId}`);
}

async function handlePost(req: IncomingMessage, res: ServerResponse, body: unknown): Promise<void> {
  const headerSessionId = req.headers['mcp-session-id'];
  const sessionId = Array.isArray(headerSessionId) ? headerSessionId[0] : headerSessionId;

  if (sessionId) {
    const state = sessions.get(sessionId);
    if (!state) {
      sendJson(res, 404, { error: 'unknown MCP session' });
      return;
    }

    await state.transport.handleRequest(req, res, body);
    return;
  }

  if (!isInitializeRequest(body)) {
    sendJson(res, 400, { error: 'missing session id or initialize request' });
    return;
  }

  const container = createServiceContainer({ monorepoRoot: MONOREPO_ROOT, wsPort: 0 });
  let createdSessionId = '';
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (newSessionId) => {
      createdSessionId = newSessionId;
      sessions.set(newSessionId, { container, server, transport });
      log(`opened session ${newSessionId}`);
    }
  });
  const server = createCommandCenterMcpServer(container, log);

  transport.onclose = () => {
    if (createdSessionId) void closeSession(createdSessionId);
  };

  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

async function handleSessionRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const headerSessionId = req.headers['mcp-session-id'];
  const sessionId = Array.isArray(headerSessionId) ? headerSessionId[0] : headerSessionId;

  if (!sessionId) {
    sendJson(res, 400, { error: 'missing MCP session id' });
    return;
  }

  const state = sessions.get(sessionId);
  if (!state) {
    sendJson(res, 404, { error: 'unknown MCP session' });
    return;
  }

  await state.transport.handleRequest(req, res);
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/health') {
    sendJson(res, 200, { ok: true, sessions: sessions.size });
    return;
  }

  if (url.pathname !== '/mcp') {
    sendJson(res, 404, { error: 'not found' });
    return;
  }

  try {
    if (req.method === 'POST') {
      await handlePost(req, res, await readJsonBody(req));
      return;
    }

    if (req.method === 'GET' || req.method === 'DELETE') {
      await handleSessionRequest(req, res);
      return;
    }

    sendJson(res, 405, { error: 'method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`request error: ${message}`);
    sendJson(res, 500, { error: message });
  }
}

const port = Number(process.env['COMMAND_CENTER_MCP_HTTP_PORT'] ?? process.env['MCP_PORT'] ?? DEFAULT_PORT);
const httpServer = createServer((req, res) => {
  void handleRequest(req, res);
});

httpServer.listen(port, '127.0.0.1', () => {
  const address = httpServer.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  log(`listening on http://127.0.0.1:${actualPort}/mcp`);
});

async function shutdown(): Promise<void> {
  log('shutting down');
  httpServer.close();
  await Promise.all([...sessions.keys()].map(async (sessionId) => closeSession(sessionId)));
  process.exit(0);
}

process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });
