import type { IPCMessage } from '@vibetech/shared-ipc';
import { createServer, type Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { CommandRouter, type ConnectedClient } from './commandRouter.js';
import { createHealthHandler, createMetricsHandler, createReadinessHandler } from './health.js';

const PORT = parseInt(process.env.PORT ?? '5004', 10);
const BRIDGE_SECRET = process.env.BRIDGE_SECRET ?? process.env.IPC_BRIDGE_SECRET;

interface MessageLogEntry {
  timestamp: number;
  clientId: string;
  source: string;
  type: string;
  messageId: string;
}

interface BridgeStats {
  totalMessages: number;
  messagesByType: Record<string, number>;
  clientConnections: number;
  clientDisconnections: number;
}

class IPCBridgeServer {
  port: number;
  wss: WebSocketServer | null = null;
  httpServer: Server | null = null;
  clients = new Map<string, ConnectedClient>();
  messageLog: MessageLogEntry[] = [];
  stats: BridgeStats = {
    totalMessages: 0,
    messagesByType: {},
    clientConnections: 0,
    clientDisconnections: 0,
  };
  commandRouter = new CommandRouter();

  constructor(port: number) {
    this.port = port;
  }

  start() {
    this.httpServer = createServer((req, res) => {
      const wss = this.wss;
      if (!wss) {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('Service Unavailable: WebSocket server not initialized');
        return;
      }

      if (req.url === '/healthz') {
        createHealthHandler(wss)(req, res);
      } else if (req.url === '/readyz') {
        createReadinessHandler(wss)(req, res);
      } else if (req.url === '/metrics') {
        createMetricsHandler(wss, this.stats)(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(
          'Not Found\n\nAvailable endpoints:\n- /healthz\n- /readyz\n- /metrics\n- ws://localhost:5004 (WebSocket)\n',
        );
      }
    });

    this.wss = new WebSocketServer({ server: this.httpServer });

    console.log(`\n\uD83D\uDEA7 IPC Bridge Server starting on port ${this.port}...`);
    if (BRIDGE_SECRET) {
      console.log('🔒 Auth enabled: BRIDGE_SECRET is set.');
    } else {
      console.warn('⚠️  Auth disabled: BRIDGE_SECRET is not set. ANYONE CAN CONNECT.');
    }

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const clientIp = req.socket.remoteAddress;

      // AUTHENTICATION CHECK
      if (BRIDGE_SECRET) {
        const url = new URL(req.url ?? '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token') ?? req.headers['authorization'];

        // Simple check: support "Bearer <token>" or just "<token>"
        const cleanToken = token?.replace('Bearer ', '');

        if (cleanToken !== BRIDGE_SECRET) {
          console.warn(`\n\u{1F6AB} Rejected unauthorized connection from ${clientIp}`);
          ws.close(1008, 'Unauthorized');
          return;
        }
      }

      console.log(`\n\u2705 New connection: ${clientId} from ${clientIp}`);
      this.stats.clientConnections++;

      this.clients.set(clientId, {
        ws,
        source: null,
        lastSeen: Date.now(),
        messageCount: 0,
      });

      ws.send(
        JSON.stringify({
          type: 'connected',
          clientId,
          timestamp: Date.now(),
          message: 'Connected to IPC Bridge',
        }),
      );

      ws.on('message', (data) => {
        this.handleMessage(clientId, data.toString());
      });

      ws.on('close', () => {
        console.log(`\n\u274C Client disconnected: ${clientId}`);
        this.stats.clientDisconnections++;
        this.clients.delete(clientId);
        this.broadcastStats();
      });

      ws.on('error', (error) => {
        console.error(`\n⚠️  Client error (${clientId}):`, error.message);
      });

      this.sendStats(clientId);
    });

    this.httpServer.listen(this.port, () => {
      console.log(`\n✅ IPC Bridge Server listening on ws://localhost:${this.port}`);
      console.log(`\n\uD83D\uCCA8 Health endpoints:`);
      console.log(`   - http://localhost:${this.port}/healthz (liveness)`);
      console.log(`   - http://localhost:${this.port}/readyz (readiness)`);
      console.log(`   - http://localhost:${this.port}/metrics (metrics)`);
      console.log(`\nReady to bridge NOVA Agent ↔ Vibe Code Studio\n`);
    });

    setInterval(() => {
      this.broadcastStats();
    }, 30000);
  }

  handleMessage(clientId: string, data: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastSeen = Date.now();
    client.messageCount++;

    try {
      const message = JSON.parse(data) as IPCMessage;

      if (!this.isValidMessage(message)) {
        console.warn(`\n⚠️  Invalid message from ${clientId}:`, message);
        return;
      }

      if (!client.source && message.source) {
        client.source = message.source;
        console.log(`\n📱 ${clientId} identified as: ${message.source.toUpperCase()}`);
      }

      const logEntry = {
        timestamp: Date.now(),
        clientId,
        source: message.source,
        type: message.type,
        messageId: message.messageId,
      };

      this.messageLog.push(logEntry);
      if (this.messageLog.length > 100) this.messageLog.shift();

      this.stats.totalMessages++;
      const type = message.type as string;
      this.stats.messagesByType[type] = (this.stats.messagesByType[type] ?? 0) + 1;

      if (this.commandRouter.isCommand(message)) {
        void this.handleCommandRequest(clientId, message);
        return;
      }

      if (message.type === 'command_result') {
        this.handleCommandResult(clientId, message);
        return;
      }

      console.log(`\n📨 [${message.source}] ${message.type} → broadcasting to other clients`);
      this.broadcast(message, clientId);
    } catch (error: unknown) {
      console.error(`\n❌ Failed to parse message from ${clientId}:`, error instanceof Error ? error.message : error);
    }
  }

  isValidMessage(message: unknown): boolean {
    const validSources = [
      'nova',
      'vibe',
      'bridge',
      'deepcode',
      'desktop-commander-v3',
      'learning_system',
      'openclaw',
      'antigravity',
    ];
    if (typeof message !== 'object' || message === null) return false;
    const msg = message as Record<string, unknown>;
    return (
      typeof msg.type === 'string' &&
      msg.payload !== undefined &&
      typeof msg.timestamp === 'number' &&
      typeof msg.source === 'string' &&
      validSources.includes(msg.source) &&
      typeof msg.messageId === 'string'
    );
  }

  broadcast(message: IPCMessage, senderClientId: string) {
    let sentCount = 0;
    for (const [clientId, client] of this.clients.entries()) {
      if (clientId === senderClientId) continue;
      if (client.source === message.source) continue;

      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(message));
          sentCount++;
        } catch (error: unknown) {
          console.error(`\n⚠️  Failed to send to ${clientId}:`, error instanceof Error ? error.message : error);
        }
      }
    }
    if (sentCount > 0) {
      console.log(`   ✓ Broadcasted to ${sentCount} client(s)`);
    }
  }

  broadcastStats() {
    const stats = this.getStats();
    const statsMessage = {
      type: 'bridge_stats',
      payload: stats,
      timestamp: Date.now(),
      source: 'bridge',
      messageId: `bridge-${Date.now()}`,
    };
    for (const [_clientId, client] of this.clients.entries()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(statsMessage));
        } catch (e) {
          console.error(`Failed to send stats to client: ${e instanceof Error ? e.message : e}`);
        }
      }
    }
  }

  sendStats(clientId: string) {
    const client = this.clients.get(clientId);
    if (client?.ws.readyState !== WebSocket.OPEN) return;
    const stats = this.getStats();
    const statsMessage = {
      type: 'bridge_stats',
      payload: stats,
      timestamp: Date.now(),
      source: 'bridge',
      messageId: `bridge-${Date.now()}`,
    };
    try {
      client.ws.send(JSON.stringify(statsMessage));
    } catch (e) {
      console.error(`Failed to send stats to ${clientId}: ${e instanceof Error ? e.message : e}`);
    }
  }

  getStats() {
    const activeClients = [];
    for (const [clientId, client] of this.clients.entries()) {
      activeClients.push({
        id: clientId,
        source: client.source ?? 'unknown',
        messageCount: client.messageCount,
        connected: Date.now() - (client.lastSeen - client.messageCount * 100),
      });
    }
    return {
      server: { uptime: process.uptime(), port: this.port },
      connections: {
        active: this.clients.size,
        total: this.stats.clientConnections,
        disconnections: this.stats.clientDisconnections,
      },
      messages: {
        total: this.stats.totalMessages,
        byType: this.stats.messagesByType,
        recentCount: this.messageLog.length,
      },
      clients: activeClients,
    };
  }

  async handleCommandRequest(clientId: string, message: IPCMessage) {
    const payload = message.payload as Record<string, unknown>;
    console.log(
      `\n\ud83d\udcaf Command request from ${clientId}: ${String(payload?.text ?? '')}`,
    );
    try {
      const parsedCommand = this.commandRouter.parseCommand(message);
      if (!parsedCommand) return;
      console.log(`   \u2192 Routing to ${parsedCommand.target}: ${parsedCommand.command}`);
      const routeResult = await this.commandRouter.routeCommand(
        parsedCommand,
        this.clients,
        clientId,
      );
      this.commandRouter.sendCommandResponse(
        this.clients,
        clientId,
        parsedCommand.originalMessage.messageId,
        true,
        routeResult.result,
        null,
      );
      console.log(`   \u2714 Command completed successfully`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`   \u2718 Command failed: ${errorMessage}`);
      this.commandRouter.sendCommandResponse(
        this.clients,
        clientId,
        message.messageId,
        false,
        null,
        errorMessage,
      );
    }
  }

  handleCommandResult(clientId: string, message: IPCMessage) {
    console.log(`\n\ud83d\udce6 Command result from ${clientId}`);
    const handled = this.commandRouter.handleCommandResponse(message);
    if (handled) console.log(`   \u2714 Response delivered to waiting command`);
  }
}

const server = new IPCBridgeServer(PORT);
server.start();

const shutdown = () => {
  console.log('\n\n\uD83D\uDEAA Shutting down IPC Bridge Server...');
  if (server.wss) {
    server.wss.close(() => {
      if (server.httpServer) server.httpServer.close(() => process.exit(0));
      else process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
