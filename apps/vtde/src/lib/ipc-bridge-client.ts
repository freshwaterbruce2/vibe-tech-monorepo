export type IpcBridgeStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface IpcBridgeState {
  status: IpcBridgeStatus;
  clientId: string | null;
  lastMessageAt: number | null;
  lastError: string | null;
}

export interface IpcBridgeMessage {
  type: string;
  payload: unknown;
  timestamp: number;
  source: 'vibe' | 'bridge';
  target?: string;
  messageId: string;
  correlationId?: string;
  timeoutMs?: number;
}

type Listener = (message: IpcBridgeMessage | Record<string, unknown>) => void;
type StateListener = (state: IpcBridgeState) => void;

const IPC_BRIDGE_URL = 'ws://127.0.0.1:5004';

function createMessageId(prefix = 'vtde'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class VtdeIpcBridgeClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<Listener>();
  private stateListeners = new Set<StateListener>();
  private state: IpcBridgeState = {
    status: 'disconnected',
    clientId: null,
    lastMessageAt: null,
    lastError: null,
  };

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;
    this.setState({ status: 'connecting', lastError: null });
    const ws = new WebSocket(IPC_BRIDGE_URL);
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.setState({ status: 'connected', lastError: null });
      this.send({ type: 'identify', payload: { app: 'vtde' } });
    });

    ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(String(event.data)) as IpcBridgeMessage | Record<string, unknown>;
        const clientId = typeof (message as { clientId?: unknown }).clientId === 'string' ? (message as { clientId: string }).clientId : this.state.clientId;
        this.setState({ lastMessageAt: Date.now(), clientId });
        for (const listener of this.listeners) listener(message);
      } catch (error) {
        this.setState({ lastError: error instanceof Error ? error.message : String(error) });
      }
    });

    ws.addEventListener('close', () => {
      if (this.ws === ws) this.ws = null;
      this.setState({ status: 'disconnected' });
      this.scheduleReconnect();
    });

    ws.addEventListener('error', () => {
      this.setState({ status: 'error', lastError: `Unable to reach ${IPC_BRIDGE_URL}` });
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close(1000, 'VTDE shutdown');
    this.ws = null;
    this.setState({ status: 'disconnected' });
  }

  send(partial: Pick<IpcBridgeMessage, 'type' | 'payload'> & Partial<IpcBridgeMessage>): string {
    const messageId = partial.messageId ?? createMessageId();
    const message: IpcBridgeMessage = {
      type: partial.type,
      payload: partial.payload,
      timestamp: partial.timestamp ?? Date.now(),
      source: partial.source ?? 'vibe',
      target: partial.target,
      messageId,
      correlationId: partial.correlationId,
      timeoutMs: partial.timeoutMs,
    };

    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error('IPC bridge is not connected');
    }

    this.ws.send(JSON.stringify(message));
    return messageId;
  }

  requestDiagnostic(): string {
    return this.send({
      type: 'command_request',
      payload: {
        text: '@nova diagnostic vtde ipc-bridge',
        target: 'nova',
        context: { app: 'vtde', bridgeUrl: IPC_BRIDGE_URL },
      },
      timeoutMs: 10000,
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  getState(): IpcBridgeState {
    return this.state;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  private setState(next: Partial<IpcBridgeState>): void {
    this.state = { ...this.state, ...next };
    for (const listener of this.stateListeners) listener(this.state);
  }
}

export const vtdeIpcBridgeClient = new VtdeIpcBridgeClient();
