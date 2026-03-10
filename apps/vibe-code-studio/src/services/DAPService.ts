import { logger } from './Logger';

export interface DAPMessage {
  seq: number;
  type: 'request' | 'response' | 'event';
  command?: string;
  event?: string;
  arguments?: any;
  body?: any;
  success?: boolean;
  message?: string;
}

export interface Breakpoint {
  id?: number;
  verified: boolean;
  line: number;
  column?: number;
  source?: { name?: string; path?: string };
}

export class DAPService {
  private socket: WebSocket | null = null;
  private seq = 1;
  private pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private eventListeners = new Map<string, Array<(body: any) => void>>();

  /**
   * Connect to a Debug Adapter running over WebSockets
   */
  public connect(url: string = 'ws://localhost:8080'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(url);
        
        this.socket.onopen = () => {
          logger.info(`[DAPService] Connected to debug adapter at ${url}`);
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.socket.onerror = (error) => {
          logger.error('[DAPService] WebSocket error:', error);
          reject(error);
        };

        this.socket.onclose = () => {
          logger.info('[DAPService] Disconnected from debug adapter');
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public async initialize(adapterID: string): Promise<any> {
    return this.sendRequest('initialize', {
      clientID: 'vibe-code-studio',
      clientName: 'Vibe Code Studio',
      adapterID,
      pathFormat: 'path',
      linesStartAt1: true,
      columnsStartAt1: true,
      supportsVariableType: true,
      supportsVariablePaging: true,
      supportsRunInTerminalRequest: true
    });
  }

  public async launch(program: string, args: string[] = []): Promise<any> {
    return this.sendRequest('launch', {
      program,
      args,
      request: 'launch',
      type: 'node'
    });
  }

  public async setBreakpoints(source: { path: string }, breakpoints: { line: number }[]): Promise<{ breakpoints: Breakpoint[] }> {
    return this.sendRequest('setBreakpoints', {
      source,
      breakpoints
    });
  }

  public async configurationDone(): Promise<any> {
    return this.sendRequest('configurationDone', {});
  }

  public on(event: string, callback: (body: any) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private handleMessage(data: string) {
    try {
      // DAP messages are sent with Content-Length header, but over WebSocket we can usually expect pure JSON
      // If there are headers, we need to strip them
      const jsonStr = data.includes('\r\n\r\n') ? data.split('\r\n\r\n')[1] : data;
      if (!jsonStr) return;
      const message: DAPMessage = JSON.parse(jsonStr);

      logger.debug('[DAPService] Received:', message);

      if (message.type === 'response') {
        const req = this.pendingRequests.get(message.seq);
        if (req) {
          if (message.success) {
            req.resolve(message.body);
          } else {
            req.reject(new Error(message.message || 'DAP request failed'));
          }
          this.pendingRequests.delete(message.seq);
        }
      } else if (message.type === 'event' && message.event) {
        const listeners = this.eventListeners.get(message.event);
        if (listeners) {
          listeners.forEach(cb => cb(message.body));
        }
      }
    } catch (e) {
      logger.error('[DAPService] Failed to parse message', e);
    }
  }

  private sendRequest(command: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        return reject(new Error('Not connected to debug adapter'));
      }

      const requestSeq = this.seq++;
      const message: DAPMessage = {
        seq: requestSeq,
        type: 'request',
        command,
        arguments: args
      };

      this.pendingRequests.set(requestSeq, { resolve, reject });
      
      const payload = JSON.stringify(message);
      logger.debug('[DAPService] Sending:', payload);
      
      // Standard DAP format requires Content-Length header
      const formattedMessage = `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`;
      this.socket.send(formattedMessage);
    });
  }
}

export const dapService = new DAPService();
