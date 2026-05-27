import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

interface BridgeMessage {
  type?: string;
  message?: string;
  data?: string;
  code?: number;
}

interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

interface LocationPayload {
  ok: true;
  command: 'location.get';
  transport: string;
  nodePackage: string;
  device: string;
  provider: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const commandCenterRoot = resolve(__dirname, '..');
const workspaceRoot = resolve(commandCenterRoot, '..', '..');
const bridgeEnvPath = resolve(workspaceRoot, 'desktop-bridge', '.env');
const payloadMarker = '__ANDROID_NODE_PAYLOAD__';
const timeoutMs = Number.parseInt(process.env.ANDROID_NODE_TIMEOUT_MS ?? '30000', 10);

function readBridgeEnv(): Record<string, string> {
  if (!existsSync(bridgeEnvPath)) {
    return {};
  }

  return readFileSync(bridgeEnvPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .reduce<Record<string, string>>((acc, line) => {
      const separator = line.indexOf('=');
      if (separator === -1) return acc;
      acc[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
      return acc;
    }, {});
}

function getBridgeUrl(): string {
  if (process.env.CC_BRIDGE_WS_URL) {
    return process.env.CC_BRIDGE_WS_URL;
  }

  const env = readBridgeEnv();
  const port = process.env.CC_BRIDGE_PORT ?? env.CC_BRIDGE_PORT ?? '8743';
  const token = process.env.CC_BRIDGE_TOKEN ?? env.CC_BRIDGE_TOKEN;
  const url = new URL(`ws://127.0.0.1:${port}/ws`);
  if (token) {
    url.searchParams.set('token', token);
  }
  return url.toString();
}

function redactedBridgeUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.searchParams.has('token')) {
    parsed.searchParams.set('token', '<redacted>');
  }
  return parsed.toString();
}

function buildLocationCommand(): string {
  return String.raw`
$ErrorActionPreference = 'Stop'
$device = (adb devices -l | Select-String -Pattern 'model:SM_A546U1' | Select-Object -First 1).ToString().Trim()
if (-not $device) { throw 'Galaxy A54 Android node not found via adb devices -l' }

$nodePackage = (adb shell pm list packages com.vibetech.commandcenter | Out-String).Trim()
if ($nodePackage -notmatch 'com\.vibetech\.commandcenter') {
  throw 'Android node package com.vibetech.commandcenter is not installed'
}

$dump = adb shell dumpsys location
$pattern = 'last location=Location\[(?<provider>[^\s]+)\s+(?<lat>-?\d+(?:\.\d+)?),(?<lon>-?\d+(?:\.\d+)?).*?hAcc=(?<accuracy>\d+(?:\.\d+)?)'
$match = [regex]::Match($dump, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
if (-not $match.Success) {
  throw 'location.get payload missing last location fields in dumpsys location'
}

$payload = [ordered]@{
  ok = $true
  command = 'location.get'
  transport = 'desktop-bridge.ws.exec.adb'
  nodePackage = $nodePackage
  device = $device
  provider = $match.Groups['provider'].Value
  latitude = [double]$match.Groups['lat'].Value
  longitude = [double]$match.Groups['lon'].Value
  accuracyMeters = [double]$match.Groups['accuracy'].Value
  capturedAt = (Get-Date).ToUniversalTime().ToString('o')
}

'${payloadMarker}' + ($payload | ConvertTo-Json -Compress)
`.trim();
}

function parseBridgeMessage(raw: WebSocket.RawData): BridgeMessage {
  const text = raw.toString();
  try {
    return JSON.parse(text) as BridgeMessage;
  } catch {
    return { type: 'raw', data: text };
  }
}

function createInbox(socket: WebSocket) {
  const queue: BridgeMessage[] = [];
  let waiter: ((message: BridgeMessage) => void) | undefined;

  socket.on('message', (raw) => {
    const message = parseBridgeMessage(raw);
    if (waiter) {
      const resolveWaiter = waiter;
      waiter = undefined;
      resolveWaiter(message);
      return;
    }
    queue.push(message);
  });

  return {
    next(deadlineMs: number): Promise<BridgeMessage> {
      const queued = queue.shift();
      if (queued) return Promise.resolve(queued);

      return new Promise((resolveNext, reject) => {
        const timeout = setTimeout(() => {
          waiter = undefined;
          reject(new Error(`Timed out waiting for Desktop Bridge message after ${deadlineMs}ms`));
        }, deadlineMs);

        waiter = (message) => {
          clearTimeout(timeout);
          resolveNext(message);
        };
      });
    },
  };
}

async function connectBridge(url: string): Promise<WebSocket> {
  return new Promise((resolveSocket, reject) => {
    const socket = new WebSocket(url);
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error(`Timed out connecting to Desktop Bridge after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.once('open', () => {
      clearTimeout(timeout);
      resolveSocket(socket);
    });

    socket.once('error', (error: Error & { code?: string }) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function waitForPong(socket: WebSocket, inbox: ReturnType<typeof createInbox>): Promise<void> {
  socket.send(JSON.stringify({ type: 'ping' }));

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const message = await inbox.next(timeoutMs);
    if (message.type === 'info') {
      console.log(`[android-node] bridge: ${message.message}`);
      continue;
    }
    if (message.type === 'pong') {
      console.log('[android-node] bridge ping/pong ok');
      return;
    }
    if (message.type === 'error') {
      throw new Error(`Desktop Bridge rejected request: ${message.message ?? 'unknown error'}`);
    }
  }

  throw new Error('Desktop Bridge ping timed out');
}

async function runLocationGet(
  socket: WebSocket,
  inbox: ReturnType<typeof createInbox>,
): Promise<ExecResult> {
  socket.send(
    JSON.stringify({
      type: 'exec',
      contract: 'location.get',
      target: 'android-node',
      command: buildLocationCommand(),
    }),
  );

  const result: ExecResult = { stdout: '', stderr: '', code: -1 };
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const message = await inbox.next(timeoutMs);
    if (message.type === 'stdout') {
      result.stdout += message.data ?? '';
      continue;
    }
    if (message.type === 'stderr') {
      result.stderr += message.data ?? '';
      continue;
    }
    if (message.type === 'error') {
      throw new Error(`Desktop Bridge error while dispatching location.get: ${message.message}`);
    }
    if (message.type === 'exit') {
      result.code = typeof message.code === 'number' ? message.code : -1;
      return result;
    }
  }

  throw new Error('location.get timed out before Desktop Bridge returned an exit frame');
}

function parseLocationPayload(result: ExecResult): LocationPayload {
  if (result.code !== 0) {
    throw new Error(
      [
        `location.get exited with code ${result.code}`,
        result.stderr.trim() ? `stderr: ${result.stderr.trim()}` : undefined,
        result.stdout.trim() ? `stdout: ${result.stdout.trim()}` : undefined,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  const payloadLine = result.stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith(payloadMarker));

  if (!payloadLine) {
    throw new Error(`location.get payload marker missing. stdout:\n${result.stdout}`);
  }

  const payload = JSON.parse(payloadLine.slice(payloadMarker.length)) as Partial<LocationPayload>;
  const requiredNumberFields = ['latitude', 'longitude', 'accuracyMeters'] as const;
  const missingNumberField = requiredNumberFields.find((field) => typeof payload[field] !== 'number');

  if (
    payload.ok !== true ||
    payload.command !== 'location.get' ||
    typeof payload.device !== 'string' ||
    typeof payload.nodePackage !== 'string' ||
    typeof payload.provider !== 'string' ||
    typeof payload.capturedAt !== 'string' ||
    missingNumberField
  ) {
    throw new Error(`location.get returned an invalid payload: ${JSON.stringify(payload, null, 2)}`);
  }

  return payload as LocationPayload;
}

async function main(): Promise<void> {
  const bridgeUrl = getBridgeUrl();
  console.log(`[android-node] connecting to ${redactedBridgeUrl(bridgeUrl)}`);

  const socket = await connectBridge(bridgeUrl);
  const inbox = createInbox(socket);

  try {
    await waitForPong(socket, inbox);
    console.log('[android-node] dispatching location.get to Galaxy A54 node');

    const result = await runLocationGet(socket, inbox);
    if (result.stderr.trim()) {
      console.warn(`[android-node] stderr:\n${result.stderr.trim()}`);
    }

    const payload = parseLocationPayload(result);
    console.log('[android-node] SUCCESS location.get payload:');
    console.log(JSON.stringify(payload, null, 2));
  } finally {
    socket.close();
  }
}

main().catch((error: Error & { code?: string }) => {
  const refused = error.code === 'ECONNREFUSED' || /ECONNREFUSED/i.test(error.message);
  const prefix = refused ? 'WebSocket connection refused' : 'Smoke test failed';
  console.error(`[android-node] ${prefix}: ${error.message}`);
  process.exitCode = refused ? 2 : 1;
});
