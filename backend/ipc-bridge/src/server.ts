import type { IPCMessage } from '@vibetech/shared-ipc';
import { createServer, type IncomingMessage, type Server } from 'http';
import { pathToFileURL } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { CommandRouter, type ConnectedClient } from './commandRouter.js';
import { createHealthHandler, createMetricsHandler, createReadinessHandler } from './health.js';

const DEFAULT_PORT = parseInt(process.env.PORT ?? '5004', 10);

function resolveRequestPath(req: IncomingMessage): string {
  try {
    return new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;
  } catch {
    return '/';
  }
}

function extractBridgeToken(req: IncomingMessage): string | null {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const queryToken = url.searchParams.get('token');
  const authHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  const bridgeHeader = Array.isArray(req.headers['x-bridge-secret'])
    ? req.headers['x-bridge-secret'][0]
    : req.headers['x-bridge-secret'];

  if (queryToken) {
    return queryToken;
  }

  if (typeof bridgeHeader === 'string' && bridgeHeader.trim().length > 0) {
    return bridgeHeader.trim();
  }

  if (typeof authHeader === 'string' && authHeader.trim().length > 0) {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }

  return null;
}

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

export class IPCBridgeServer {
  port: number;
  bridgeSecret: string | undefined;
  wss: WebSocketServer | null = null;
  httpServer: Server | null = null;
  clients = new Map<string, ConnectedClient>();
  messageLog: MessageLogEntry[] = [];
  statsInterval: NodeJS.Timeout | null = null;
  stats: BridgeStats = {
    totalMessages: 0,
    messagesByType: {},
    clientConnections: 0,
    clientDisconnections: 0,
  };
  commandRouter = new CommandRouter();

  constructor(
    port: number,
    bridgeSecret = process.env.BRIDGE_SECRET ?? process.env.IPC_BRIDGE_SECRET,
  ) {
    this.port = port;
    this.bridgeSecret = bridgeSecret;
  }

  async start(): Promise<number> {
    this.httpServer = createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });

    this.wss = new WebSocketServer({ server: this.httpServer });

    console.log(`\n🚧 IPC Bridge Server starting on port ${this.port}...`);
    if (this.bridgeSecret) {
      console.log('🔒 Auth enabled: BRIDGE_SECRET is set.');
    } else {
      console.warn('⚠️  Auth disabled: BRIDGE_SECRET is not set. ANYONE CAN CONNECT.');
    }

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const clientIp = req.socket.remoteAddress;

      if (this.bridgeSecret) {
        const token = extractBridgeToken(req);
        if (token !== this.bridgeSecret) {
          console.warn(`\n🚫 Rejected unauthorized connection from ${clientIp}`);
          ws.close(1008, 'Unauthorized');
          return;
        }
      }

      console.log(`\n✅ New connection: ${clientId} from ${clientIp}`);
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
        console.log(`\n❌ Client disconnected: ${clientId}`);
        this.stats.clientDisconnections++;
        this.clients.delete(clientId);
        this.broadcastStats();
      });

      ws.on('error', (error) => {
        console.error(`\n⚠️  Client error (${clientId}):`, error.message);
      });

      this.sendStats(clientId);
    });

    const httpServer = this.httpServer;
    if (!httpServer) throw new Error('HTTP server not initialized');
    await new Promise<void>((resolve) => {
      httpServer.listen(this.port, resolve);
    });

    const address = this.httpServer.address();
    if (address && typeof address === 'object') {
      this.port = address.port;
    }

    console.log(`\n✅ IPC Bridge Server listening on ws://localhost:${this.port}`);
    console.log('\n📨 Health endpoints:');
    console.log(`   - http://localhost:${this.port}/healthz (liveness)`);
    console.log(`   - http://localhost:${this.port}/health (compat alias)`);
    console.log(`   - http://localhost:${this.port}/readyz (readiness)`);
    console.log(`   - http://localhost:${this.port}/status (compat alias)`);
    console.log(`   - http://localhost:${this.port}/metrics (metrics)`);
    console.log('\nReady to bridge NOVA Agent ↔ Vibe Code Studio\n');

    this.statsInterval = setInterval(() => {
      this.broadcastStats();
    }, 30000);

    return this.port;
  }

  async stop(): Promise<void> {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    const wss = this.wss;
    const httpServer = this.httpServer;
    this.wss = null;
    this.httpServer = null;

    if (wss) {
      for (const client of wss.clients) {
        try {
          client.close(1001, 'Server shutdown');
        } catch {}
      }
    }

    await new Promise<void>((resolve, reject) => {
      const closeHttp = () => {
        if (!httpServer) {
          resolve();
          return;
        }

        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      };

      if (!wss) {
        closeHttp();
        return;
      }

      wss.close(() => {
        closeHttp();
      });
    });
  }

  private handleHttpRequest(req: IncomingMessage, res: import('http').ServerResponse) {
    const wss = this.wss;
    if (!wss) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Service Unavailable: WebSocket server not initialized');
      return;
    }

    const path = resolveRequestPath(req);
    if (path === '/healthz' || path === '/health') {
      createHealthHandler(wss)(req, res);
      return;
    }

    if (path === '/readyz' || path === '/status') {
      createReadinessHandler(wss)(req, res);
      return;
    }

    if (path === '/metrics') {
      createMetricsHandler(wss, this.stats)(req, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(
      `Not Found\n\nAvailable endpoints:\n- /healthz\n- /health\n- /readyz\n- /status\n- /metrics\n- ws://localhost:${this.port} (WebSocket)\n`,
    );
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
      console.error(
        `\n❌ Failed to parse message from ${clientId}:`,
        error instanceof Error ? error.message : error,
      );
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
          console.error(
            `\n⚠️  Failed to send to ${clientId}:`,
            error instanceof Error ? error.message : error,
          );
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
        } catch (error: unknown) {
          console.error(
            `Failed to send stats to client: ${error instanceof Error ? error.message : error}`,
          );
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
    } catch (error: unknown) {
      console.error(
        `Failed to send stats to ${clientId}: ${error instanceof Error ? error.message : error}`,
      );
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
    console.log(`\n💯 Command request from ${clientId}: ${String(payload?.text ?? '')}`);
    try {
      const parsedCommand = this.commandRouter.parseCommand(message);
      if (!parsedCommand) return;
      console.log(`   → Routing to ${parsedCommand.target}: ${parsedCommand.command}`);
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
      console.log('   ✔ Command completed successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`   ✘ Command failed: ${errorMessage}`);
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
    console.log(`\n📦 Command result from ${clientId}`);
    const handled = this.commandRouter.handleCommandResponse(message);
    if (handled) console.log('   ✔ Response delivered to waiting command');
  }
}

const isEntrypoint = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isEntrypoint) {
  const server = new IPCBridgeServer(DEFAULT_PORT);
  void server.start().catch((error) => {
    console.error('\n❌ Failed to start IPC Bridge Server:', error);
    process.exit(1);
  });

  const shutdown = () => {
    console.log('\n\n🚪 Shutting down IPC Bridge Server...');
    void server.stop().finally(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
