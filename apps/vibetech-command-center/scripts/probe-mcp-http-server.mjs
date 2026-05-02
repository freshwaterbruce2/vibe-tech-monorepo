// Smoke test: boot the HTTP MCP server, list tools, call dashboard_overview, exit.
import { spawn } from 'node:child_process';

const port = 43_000 + Math.floor(Math.random() * 1_000);
const baseUrl = `http://127.0.0.1:${port}/mcp`;
const proc = spawn(process.execPath, ['dist/mcp/http-server.js'], {
  shell: false,
  windowsHide: true,
  env: { ...process.env, COMMAND_CENTER_MCP_HTTP_PORT: String(port) }
});

let stderr = '';
let requestId = 1;

proc.stderr.on('data', (chunk) => {
  const text = String(chunk);
  stderr += text;
  process.stderr.write(text);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`HTTP MCP server did not start. stderr:\n${stderr}`);
}

function parseBody(text) {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (!trimmed.startsWith('event:')) return JSON.parse(trimmed);

  const events = trimmed.split(/\r?\n\r?\n/);
  for (const event of events) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice('data:'.length).trimStart())
      .join('\n');
    if (data) return JSON.parse(data);
  }

  return undefined;
}

async function post(method, params, sessionId) {
  const id = requestId++;
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      ...(sessionId ? { 'mcp-session-id': sessionId } : {})
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`${method} failed ${res.status}: ${text}`);
  return { headers: res.headers, body: parseBody(text) };
}

async function notify(method, sessionId, params = {}) {
  await fetch(baseUrl, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify({ jsonrpc: '2.0', method, params })
  });
}

try {
  await waitForServer();

  const init = await post('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'http-probe', version: '1.0.0' }
  });
  const sessionId = init.headers.get('mcp-session-id');
  if (!sessionId) throw new Error('missing mcp-session-id response header');
  console.log('[probe:http] init ok:', init.body?.result?.serverInfo?.name);
  await notify('notifications/initialized', sessionId);

  const list = await post('tools/list', {}, sessionId);
  const tools = list.body?.result?.tools ?? [];
  console.log(`[probe:http] ${tools.length} tools:`, tools.map((tool) => tool.name).join(', '));
  if (tools.length < 10) throw new Error(`expected at least 10 tools, got ${tools.length}`);

  const overview = await post('tools/call', {
    name: 'dashboard_overview',
    arguments: {}
  }, sessionId);
  const text = overview.body?.result?.content?.[0]?.text ?? '';
  console.log('[probe:http] overview result length:', text.length);
  console.log('[probe:http] sample:', text.slice(0, 500));
  await fetch(baseUrl, { method: 'DELETE', headers: { 'mcp-session-id': sessionId } });
  console.log('[probe:http] PASS');
} catch (error) {
  console.error('[probe:http] FAIL:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  proc.kill();
}
