import { describe, it, expect, vi } from 'vitest';

import { createJsonRpc } from '../../../services/lsp/jsonRpc';

function setup() {
  const sent: string[] = [];
  const notifications: Array<{ method: string; params: unknown }> = [];
  const rpc = createJsonRpc({ send: d => sent.push(d) }, (method, params) =>
    notifications.push({ method, params })
  );
  return { sent, notifications, rpc };
}

describe('createJsonRpc', () => {
  it('sends a request and resolves on the matching response', async () => {
    const { sent, rpc } = setup();
    const promise = rpc.sendRequest('initialize', { a: 1 });
    const req = JSON.parse(sent[0]!);
    expect(req).toMatchObject({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { a: 1 } });
    rpc.handleMessage(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { ok: true } }));
    await expect(promise).resolves.toEqual({ ok: true });
  });

  it('rejects on an error response', async () => {
    const { rpc } = setup();
    const promise = rpc.sendRequest('boom');
    rpc.handleMessage(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -1 } }));
    await expect(promise).rejects.toEqual({ code: -1 });
  });

  it('sends a notification without an id', () => {
    const { sent, rpc } = setup();
    rpc.sendNotification('initialized', {});
    expect(JSON.parse(sent[0]!)).toEqual({ jsonrpc: '2.0', method: 'initialized', params: {} });
  });

  it('dispatches server notifications', () => {
    const { notifications, rpc } = setup();
    rpc.handleMessage(
      JSON.stringify({ jsonrpc: '2.0', method: 'window/logMessage', params: { m: 1 } })
    );
    expect(notifications).toEqual([{ method: 'window/logMessage', params: { m: 1 } }]);
  });

  it('ignores malformed frames', () => {
    const { notifications, rpc } = setup();
    expect(() => rpc.handleMessage('not json')).not.toThrow();
    expect(notifications).toEqual([]);
  });

  it('ignores a response for an unknown id', () => {
    const { rpc } = setup();
    expect(() =>
      rpc.handleMessage(JSON.stringify({ jsonrpc: '2.0', id: 999, result: {} }))
    ).not.toThrow();
  });
});
