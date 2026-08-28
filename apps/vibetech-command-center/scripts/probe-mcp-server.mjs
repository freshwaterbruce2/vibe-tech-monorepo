// Smoke test: boot the MCP server, list tools, call dashboard_overview, exit.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const proc = spawn('node', ['dist/mcp/server.js'], { shell: true, windowsHide: true });

let requestId = 1;
const pending = new Map();

const send = (method, params) => {
  const id = requestId++;
  const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params });
  proc.stdin.write(msg + '\n');
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout on ${method}`)), 30_000);
    pending.set(id, { resolve: (v) => { clearTimeout(t); resolve(v); }, reject });
  });
};

const rl = createInterface({ input: proc.stdout });
rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    if (typeof msg.id === 'number' && pending.has(msg.id)) {
      pending.get(msg.id).resolve(msg);
      pending.delete(msg.id);
    }
  } catch (e) {
    process.stderr.write(`parse failed: ${line}\n`);
  }
});

proc.stderr.on('data', (d) => { process.stderr.write(d); });

(async () => {
  try {
    // 1. Initialize
    const init = await send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'probe', version: '1.0.0' }
    });
    console.log('[probe] init ok:', init.result?.serverInfo?.name);

    // 2. List tools
    const list = await send('tools/list', {});
    const tools = list.result?.tools ?? [];
    console.log(`[probe] ${tools.length} tools:`, tools.map((t) => t.name).join(', '));

    if (tools.length < 10) {
      console.error(`[probe] FAIL: expected at least 10 tools, got ${tools.length}`);
      proc.kill();
      process.exit(1);
    }

    // 3. Call dashboard_overview
    const overview = await send('tools/call', {
      name: 'dashboard_overview',
      arguments: {}
    });
    const text = overview.result?.content?.[0]?.text ?? '';
    console.log('[probe] overview result length:', text.length);
    console.log('[probe] sample:', text.slice(0, 500));

    console.log('[probe] PASS');
    proc.kill();
    process.exit(0);
  } catch (e) {
    console.error('[probe] FAIL:', e.message);
    proc.kill();
    process.exit(1);
  }
})();

setTimeout(() => {
  console.error('[probe] hard timeout, killing');
  proc.kill();
  process.exit(1);
}, 60_000);
