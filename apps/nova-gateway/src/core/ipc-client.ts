import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { IPCMessageType } from '@vibetech/shared-ipc';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export class IpcClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private connected = false;
  private reconnecting = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  // Maps correlationId -> Promise callbacks
  private pending = new Map<string, {
    resolve: (value: any) => void;
    reject: (reason: Error) => void;
    timer: NodeJS.Timeout;
  }>();

  // Offline queue to buffer messages sent when offline
  private offlineQueue: Array<{
    type: IPCMessageType;
    payload: Record<string, any>;
    correlationId: string;
  }> = [];

  /**
   * Connects to the IPC Bridge WebSocket server
   */
  public async connect(): Promise<void> {
    if (this.connected || this.ws) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = new URL(env.IPC_BRIDGE_URL);
        wsUrl.searchParams.set('token', env.IPC_BRIDGE_SECRET);

        logger.info(`Connecting to IPC Bridge WebSocket at: ${env.IPC_BRIDGE_URL}`);
        this.ws = new WebSocket(wsUrl.toString());

        this.ws.on('open', () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.reconnecting = false;
          
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }

          logger.info('WebSocket connected. Sending identify frame to bridge...');

          // Send identify payload to register as 'openclaw'
          this.sendDirect(IPCMessageType.IDENTIFY, {
            clientType: 'openclaw',
            capabilities: ['task_dispatch', 'tool_call', 'streaming'],
            openclawVersion: 'gateway-current',
          }, makeId('id'));

          this.emit('connected');
          
          // Drain offline queue
          this.drainOfflineQueue();
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleIncomingMessage(message);
          } catch (err) {
            logger.error('Failed to parse incoming WebSocket message:', {}, err as Error);
          }
        });

        this.ws.on('close', (code, reason) => {
          this.handleDisconnect(code, reason.toString());
        });

        this.ws.on('error', (err) => {
          logger.error('WebSocket connection error:', {}, err);
          if (!this.connected) {
            reject(err);
          }
          this.emit('error', err);
        });

      } catch (err) {
        logger.error('Failed to initialize WebSocket client connection:', {}, err as Error);
        reject(err);
      }
    });
  }

  /**
   * Cleans up connection and pending promises.
   */
  public disconnect(): void {
    logger.info('Initiating deliberate WebSocket disconnect...');
    this.connected = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Cancel all pending calls
    for (const [correlationId, pending] of this.pending.entries()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('IPC client disconnected deliberately.'));
      this.pending.delete(correlationId);
    }

    if (this.ws) {
      this.ws.close(1000, 'Client initiated shutdown');
      this.ws = null;
    }
    
    this.emit('disconnected', { code: 1000, reason: 'Deliberate shutdown' });
  }

  public get isConnected(): boolean {
    return this.connected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Calls a single MCP tool via the WebSocket bridge.
   */
  public async callTool(
    server: string,
    tool: string,
    args: Record<string, any> = {},
    timeoutMs = 60000
  ): Promise<any> {
    const correlationId = makeId('corr');
    const payload = {
      callId: makeId('call'),
      server,
      tool,
      args,
      timeout: timeoutMs,
    };

    logger.info(`Sending MCP_TOOL_CALL: ${server}.${tool} (correlationId: ${correlationId})`);
    
    this.send(IPCMessageType.MCP_TOOL_CALL, payload, correlationId);
    return this.waitForResponse(correlationId, timeoutMs);
  }

  /**
   * Dispatches a multi-step task to the agent.
   */
  public async dispatchTask(
    description: string,
    steps: Array<{ server: string; tool: string; args: Record<string, any> }>,
    timeoutMs = 120000
  ): Promise<any> {
    const correlationId = makeId('corr');
    const payload = {
      taskId: makeId('task'),
      type: 'mcp_tool_call',
      priority: 'normal',
      description,
      steps,
      timeout: timeoutMs,
    };

    logger.info(`Sending AGENT_TASK_DISPATCH: "${description}" (correlationId: ${correlationId})`);
    
    this.send(IPCMessageType.AGENT_TASK_DISPATCH, payload, correlationId);
    return this.waitForResponse(correlationId, timeoutMs);
  }

  private send(type: IPCMessageType, payload: Record<string, any>, correlationId: string): void {
    if (!this.isConnected) {
      logger.warn(`IPC Client offline. Queueing message: ${type} (correlationId: ${correlationId})`);
      this.offlineQueue.push({ type, payload, correlationId });
      return;
    }
    this.sendDirect(type, payload, correlationId);
  }

  private sendDirect(type: IPCMessageType, payload: Record<string, any>, correlationId: string): void {
    if (!this.ws) return;

    const msg = {
      messageId: makeId('msg'),
      type,
      timestamp: Date.now(),
      source: 'openclaw',
      target: 'gateway',
      version: '2.0.0',
      correlationId,
      payload,
    };

    this.ws.send(JSON.stringify(msg));
  }

  private async waitForResponse(correlationId: string, timeoutMs: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(correlationId);
        reject(new Error(`Timeout waiting for response after ${timeoutMs}ms (correlationId: ${correlationId})`));
      }, timeoutMs);

      this.pending.set(correlationId, { resolve, reject, timer });
    });
  }

  private handleIncomingMessage(msg: any): void {
    const type = msg.type;
    const correlationId = msg.correlationId;

    // Route response to pending correlation promises
    if (correlationId) {
      const pending = this.pending.get(correlationId);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(correlationId);
        
        // If the reply is an error, reject it
        if (type === 'error' || (msg.payload && msg.payload.success === false)) {
          pending.reject(new Error(msg.payload?.error || 'Operation failed on remote agent'));
        } else {
          pending.resolve(msg.payload);
        }
        return;
      }
    }

    // Emit other messages as events
    this.emit('message', msg);
  }

  private handleDisconnect(code: number, reason: string): void {
    this.connected = false;
    this.ws = null;
    logger.warn(`IPC Bridge connection closed. Code: ${code}, Reason: ${reason}`);
    this.emit('disconnected', { code, reason });

    // Initiate reconnection
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnecting || this.reconnectTimer) return;

    this.reconnecting = true;
    this.reconnectAttempts++;
    
    // Exponential backoff delay capped at 30 seconds
    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    logger.info(`Scheduling reconnection attempt #${this.reconnectAttempts} in ${delay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((err) => {
        logger.error(`Reconnection attempt #${this.reconnectAttempts} failed:`, {}, err);
        this.reconnecting = false;
        this.scheduleReconnect();
      });
    }, delay);
  }

  private drainOfflineQueue(): void {
    if (this.offlineQueue.length === 0) return;
    logger.info(`Draining ${this.offlineQueue.length} offline queued messages...`);
    
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    for (const msg of queue) {
      this.sendDirect(msg.type, msg.payload, msg.correlationId);
    }
  }
}

export const ipcClient = new IpcClient();
