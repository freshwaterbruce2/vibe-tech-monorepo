// Probe: verify `claude -p --output-format stream-json` produces parseable,
// line-buffered JSONL on Windows. Exits 0 on clean parse, 1 otherwise.

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const PROMPT = 'Respond with exactly this text and nothing else: PROBE_OK';
const ALLOWED_TOOLS = 'Read';
const TIMEOUT_MS = 60_000;

console.log('[probe] spawning claude...');
const start = Date.now();

const proc = spawn(
  'cmd',
  [
    '/c', 'claude',
    '-p', PROMPT,
    '--output-format', 'stream-json',
    '--verbose',
    '--allowedTools', ALLOWED_TOOLS,
    '--permission-mode', 'bypassPermissions'
  ],
  { shell: false, windowsHide: true }
);

let sawResult = false;
let sawProbeOk = false;
let messageCount = 0;
let stderrBuf = '';

const rl = createInterface({ input: proc.stdout });

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    messageCount++;
    console.log(`[probe] msg #${messageCount} type=${msg.type} subtype=${msg.subtype ?? '-'}`);
    if (msg.type === 'result') {
      sawResult = true;
      console.log(`[probe] result raw: ${JSON.stringify(msg).slice(0, 500)}`);
      const text = typeof msg.result === 'string'
        ? msg.result
        : (msg.result?.content ?? JSON.stringify(msg.result));
      if (text.includes('PROBE_OK')) {
        sawProbeOk = true;
      }
    }
  } catch (err) {
    console.error(`[probe] FAILED to parse line: ${line.slice(0, 200)}`);
    console.error(`[probe] error: ${err.message}`);
    proc.kill();
    process.exit(1);
  }
});

proc.stderr.on('data', (d) => { stderrBuf += d.toString(); });

const timeout = setTimeout(() => {
  console.error('[probe] TIMEOUT — killing process');
  proc.kill();
  process.exit(1);
}, TIMEOUT_MS);

proc.on('close', (code) => {
  clearTimeout(timeout);
  const elapsed = Date.now() - start;
  console.log(`\n[probe] exit=${code} elapsed=${elapsed}ms messages=${messageCount}`);
  if (stderrBuf) console.log(`[probe] stderr:\n${stderrBuf}`);

  if (code !== 0) {
    console.error('[probe] FAIL: non-zero exit');
    process.exit(1);
  }
  if (!sawResult) {
    console.error('[probe] FAIL: no result message in stream');
    process.exit(1);
  }
  if (!sawProbeOk) {
    console.error('[probe] FAIL: result did not contain PROBE_OK');
    process.exit(1);
  }
  console.log('[probe] PASS — Claude Code stream-json bridge is viable');
  process.exit(0);
});
