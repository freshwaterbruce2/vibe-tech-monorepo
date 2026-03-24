import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { IPCBridgeServer } from '../src/server.js';

let server: IPCBridgeServer | null = null;
let port = 0;

async function startServer(secret?: string) {
  server = new IPCBridgeServer(0, secret);
  port = await server.start();
}

async function getJson(path: string) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  return {
    response,
    body: await response.json(),
  };
}

afterEach(async () => {
  if (server) {
    await server.stop();
    server = null;
    port = 0;
  }
});

describe('IPCBridgeServer', () => {
  it('serves both health endpoints', async () => {
    await startServer();

    const [healthz, health] = await Promise.all([getJson('/healthz'), getJson('/health')]);

    expect(healthz.response.status).toBe(200);
    expect(health.response.status).toBe(200);
    expect(healthz.body.status).toBe('healthy');
    expect(health.body.service).toBe('ipc-bridge');
  });

  it('serves readiness on canonical and compatibility endpoints', async () => {
    await startServer();

    const [readyz, status] = await Promise.all([getJson('/readyz'), getJson('/status')]);

    expect(readyz.response.status).toBe(200);
    expect(status.response.status).toBe(200);
    expect(readyz.body.ready).toBe(true);
    expect(status.body.details.listening).toBe(true);
  });

  it('rejects unauthorized websocket connections when BRIDGE_SECRET is set', async () => {
    await startServer('bridge-secret');

    const closeCode = await new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for socket close')), 5000);
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);

      ws.on('message', () => {
        clearTimeout(timeout);
        reject(new Error('Unauthorized client should not receive messages'));
      });

      ws.on('close', (code) => {
        clearTimeout(timeout);
        resolve(code);
      });

      ws.on('error', () => {
        // Close is the assertion point for unauthorized clients.
      });
    });

    expect(closeCode).toBe(1008);
  });

  it('accepts authorized websocket connections with a bearer token', async () => {
    await startServer('bridge-secret');

    const connectedMessage = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for authorized socket')), 5000);
      const ws = new WebSocket(`ws://127.0.0.1:${port}`, {
        headers: {
          Authorization: 'Bearer bridge-secret',
        },
      });

      ws.on('message', (data) => {
        clearTimeout(timeout);
        ws.close();
        resolve(JSON.parse(data.toString()) as Record<string, unknown>);
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    expect(connectedMessage.type).toBe('connected');
    expect(connectedMessage.message).toBe('Connected to IPC Bridge');
  });
});
