import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { FeatureFlag, KillSwitchEvent, WSMessage } from '@dev/feature-flags-core';

interface ConnectedClient {
  ws: WebSocket;
  environment?: string;
  appName?: string;
  connectedAt: Date;
  lastPing: Date;
}

export class RealTimeService {
  private wss: WebSocketServer;
  private clients: Map<string, ConnectedClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: Server, path = '/ws/flags') {
    this.wss = new WebSocketServer({ server, path });
    this.setupWebSocket();
    this.startPingLoop();
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const environment = req.headers['x-environment'] as string;
      const appName = req.headers['x-app-name'] as string;

      this.clients.set(clientId, {
        ws,
        environment,
        appName,
        connectedAt: new Date(),
        lastPing: new Date(),
      });

      console.log(`[WS] Client connected: ${clientId} (env: ${environment}, app: ${appName})`);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`[WS] Client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error(`[WS] Client error (${clientId}):`, error);
        this.clients.delete(clientId);
      });

      // Send initial connection confirmation
      this.sendToClient(clientId, {
        type: 'ping',
        payload: { clientId },
        timestamp: new Date().toISOString(),
      });
    });
  }

  private handleMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'pong':
        client.lastPing = new Date();
        break;
      case 'subscribe':
        // Update client environment/app if provided
        if (message.environment) client.environment = message.environment;
        if (message.appName) client.appName = message.appName;
        break;
      default:
        console.log(`[WS] Unknown message type: ${message.type}`);
    }
  }

  broadcastFlagUpdate(flag: FeatureFlag): void {
    const message: WSMessage = {
      type: 'flag_update',
      payload: { flag },
      timestamp: new Date().toISOString(),
    };

    this.broadcast(message);
  }

  broadcastKillSwitch(event: KillSwitchEvent): void {
    const message: WSMessage = {
      type: 'kill_switch',
      payload: { event },
      timestamp: new Date().toISOString(),
    };

    // For critical kill switches, send immediately to all clients
    // For others, respect environment filtering
    if (event.priority === 'critical') {
      this.broadcast(message);
    } else {
      this.broadcast(message);
    }

    console.log(`[WS] Kill switch broadcast: ${event.flagKey} (${event.action})`);
  }

  broadcastBulkUpdate(flags: FeatureFlag[]): void {
    const message: WSMessage = {
      type: 'bulk_update',
      payload: { flags },
      timestamp: new Date().toISOString(),
    };

    this.broadcast(message);
  }

  private broadcast(message: WSMessage, filterFn?: (client: ConnectedClient) => boolean): void {
    const messageStr = JSON.stringify(message);

    for (const [_clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (!filterFn || filterFn(client)) {
          client.ws.send(messageStr);
        }
      }
    }
  }

  private sendToClient(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (client?.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private startPingLoop(): void {
    // Ping clients every 30 seconds
    this.pingInterval = setInterval(() => {
      const now = new Date();
      const pingMessage: WSMessage = {
        type: 'ping',
        payload: {},
        timestamp: now.toISOString(),
      };

      for (const [clientId, client] of this.clients) {
        // Disconnect clients that haven't responded in 60 seconds
        const timeSinceLastPing = now.getTime() - client.lastPing.getTime();
        if (timeSinceLastPing > 60000) {
          console.log(`[WS] Client ${clientId} timed out, disconnecting`);
          client.ws.terminate();
          this.clients.delete(clientId);
          continue;
        }

        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify(pingMessage));
        }
      }
    }, 30000);
  }

  getConnectedClients(): { count: number; clients: any[] } {
    const clients = Array.from(this.clients.entries()).map(([id, client]) => ({
      id,
      environment: client.environment,
      appName: client.appName,
      connectedAt: client.connectedAt.toISOString(),
      lastPing: client.lastPing.toISOString(),
    }));

    return {
      count: clients.length,
      clients,
    };
  }

  private generateClientId(): string {
    return `ws_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }

  close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    for (const [, client] of this.clients) {
      client.ws.close();
    }

    this.wss.close();
  }
}