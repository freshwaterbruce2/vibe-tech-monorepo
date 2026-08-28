/**
 * Minimal LSP JSON-RPC 2.0 codec over an injected socket-like transport.
 * Correlates responses to requests by id, dispatches server notifications, and
 * tolerates malformed frames. Pure given the injected `send` — unit-testable.
 */

export interface RpcSocket {
  send: (data: string) => void;
}

export type NotificationHandler = (method: string, params: unknown) => void;

interface JsonRpcMessage {
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
}

export interface JsonRpc {
  sendRequest: (method: string, params?: unknown) => Promise<unknown>;
  sendNotification: (method: string, params?: unknown) => void;
  handleMessage: (raw: string) => void;
}

export function createJsonRpc(socket: RpcSocket, onNotification: NotificationHandler): JsonRpc {
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: unknown) => void }
  >();

  const sendRequest = (method: string, params?: unknown): Promise<unknown> => {
    const id = nextId++;
    socket.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  };

  const sendNotification = (method: string, params?: unknown): void => {
    socket.send(JSON.stringify({ jsonrpc: '2.0', method, params }));
  };

  const handleMessage = (raw: string): void => {
    let message: JsonRpcMessage;
    try {
      message = JSON.parse(raw) as JsonRpcMessage;
    } catch {
      return; // ignore malformed frames
    }
    const isResponse =
      message.id !== undefined && (message.result !== undefined || message.error !== undefined);
    if (isResponse) {
      const entry = pending.get(message.id as number);
      if (!entry) return;
      pending.delete(message.id as number);
      if (message.error !== undefined) entry.reject(message.error);
      else entry.resolve(message.result);
      return;
    }
    if (message.method) onNotification(message.method, message.params);
  };

  return { sendRequest, sendNotification, handleMessage };
}
