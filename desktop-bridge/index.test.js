import { describe, it, expect, afterEach } from 'vitest';
import { buildServer } from './index.js';

// Collect ws messages into a queue so awaiting a message never misses a frame
// that arrived before we started waiting. Attached via injectWS `onInit` so it
// is listening before the server's synchronous first frame is delivered.
function makeReceiver(socket) {
  const queue = [];
  const waiters = [];
  socket.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      msg = data.toString();
    }
    if (waiters.length) waiters.shift()(msg);
    else queue.push(msg);
  });
  return function next(timeoutMs = 2000) {
    if (queue.length) return Promise.resolve(queue.shift());
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('timeout waiting for ws message')),
        timeoutMs,
      );
      waiters.push((msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
    });
  };
}

async function connect(app, path) {
  let next;
  const socket = await app.injectWS(path, undefined, {
    onInit: (ws) => {
      next = makeReceiver(ws);
    },
  });
  return { socket, next };
}

describe('desktop-bridge server', () => {
  let app;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('GET /health returns ok', async () => {
    app = await buildServer({ token: 'secret' });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('GET /ws over plain HTTP returns 400', async () => {
    app = await buildServer({ token: 'secret' });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/ws' });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'WebSocket connection expected' });
  });

  it('rejects a WS connection with a wrong token', async () => {
    app = await buildServer({ token: 'secret' });
    await app.ready();

    const { socket, next } = await connect(app, '/ws?token=bad');
    const first = await next();

    expect(first).toEqual({ type: 'error', message: 'Unauthorized' });

    // Server closes the socket after rejecting; wait for it to settle.
    await new Promise((resolve) => {
      if (socket.readyState === socket.CLOSED) resolve();
      else socket.on('close', resolve);
    });
  });

  it('accepts a WS connection with the correct token and answers ping', async () => {
    app = await buildServer({ token: 'secret' });
    await app.ready();

    const { socket, next } = await connect(app, '/ws?token=secret');

    const info = await next();
    expect(info).toEqual({
      type: 'info',
      message: 'Connected and authenticated to Desktop Bridge',
    });

    socket.send(JSON.stringify({ type: 'ping' }));
    const pong = await next();
    expect(pong).toEqual({ type: 'pong' });

    socket.close();
  });

  it('rejects an exec message with no command', async () => {
    app = await buildServer({ token: 'secret' });
    await app.ready();

    const { socket, next } = await connect(app, '/ws?token=secret');

    // Drain the initial info message first.
    await next();

    socket.send(JSON.stringify({ type: 'exec' }));
    const err = await next();
    expect(err).toEqual({ type: 'error', message: 'No command provided' });

    socket.close();
  });
});
