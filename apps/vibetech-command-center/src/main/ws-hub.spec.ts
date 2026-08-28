import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { WsHub } from './ws-hub';
import type { StreamMessage } from '@shared/types';

describe('WsHub', () => {
  let hub: WsHub;
  let port: number;

  beforeEach(async () => {
    const probe = new (await import('ws')).WebSocketServer({ port: 0, host: '127.0.0.1' });
    await new Promise<void>((r) => probe.once('listening', () => r()));
    port = (probe.address() as { port: number }).port;
    probe.close();
    await new Promise((r) => setTimeout(r, 50));
    hub = new WsHub({ port });
    await hub.start();
  });

  afterEach(async () => { await hub.stop(); });

  it('accepts connections and broadcasts to all clients', async () => {
    const received: StreamMessage[] = [];
    const c1 = new WebSocket(`ws://127.0.0.1:${port}`);
    const c2 = new WebSocket(`ws://127.0.0.1:${port}`);
    await Promise.all([
      new Promise((r) => c1.once('open', r)),
      new Promise((r) => c2.once('open', r))
    ]);
    c1.on('message', (d) => received.push(JSON.parse(d.toString()) as StreamMessage));
    c2.on('message', (d) => received.push(JSON.parse(d.toString()) as StreamMessage));

    await new Promise((r) => setTimeout(r, 50));
    hub.broadcast('cc.watcher.ready', { hello: 'world' });
    await new Promise((r) => setTimeout(r, 100));

    expect(received).toHaveLength(2);
    expect(received[0]?.topic).toBe('cc.watcher.ready');
    c1.close(); c2.close();
  });

  it('does not throw when no clients connected', () => {
    expect(() => hub.broadcast('cc.watcher.ready', null)).not.toThrow();
    expect(hub.clientCount).toBe(0);
  });

  it('tracks clientCount', async () => {
    const c = new WebSocket(`ws://127.0.0.1:${port}`);
    await new Promise((r) => c.once('open', r));
    await new Promise((r) => setTimeout(r, 50));
    expect(hub.clientCount).toBe(1);
    c.close();
    await new Promise((r) => setTimeout(r, 100));
    expect(hub.clientCount).toBe(0);
  });

  it('reports the actual port when started with port 0', async () => {
    const dynamicHub = new WsHub({ port: 0 });
    await dynamicHub.start();
    try {
      expect(dynamicHub.actualPort).toBeGreaterThan(0);
    } finally {
      await dynamicHub.stop();
    }
  });
});
