import { IncomingMessage, ServerResponse } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

export const createHealthHandler = (wss: WebSocketServer) => {
  return (_req: IncomingMessage, res: ServerResponse) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ipc-bridge',
      version: '1.0.0',
      uptime: process.uptime(),
      connections: {
        total: wss.clients.size,
        active: Array.from(wss.clients).filter(client => client.readyState === WebSocket.OPEN).length,
      },
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health, null, 2));
  };
};

export const createReadinessHandler = (wss: WebSocketServer) => {
  return (_req: IncomingMessage, res: ServerResponse) => {
    // Accessing private/internal properties like _server is risky in TS,
    // but wss.address() returns null if not listening.
    const isListening = !!wss.address();

    const status = {
      ready: isListening,
      timestamp: new Date().toISOString(),
      details: {
        serverExists: !!wss,
        listening: isListening,
      },
    };

    const statusCode = isListening ? 200 : 503;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
  };
};

interface BridgeStatsInput {
  totalMessages: number;
  messagesByType: Record<string, number>;
  clientConnections: number;
  clientDisconnections: number;
}

export const createMetricsHandler = (wss: WebSocketServer, messageStats: BridgeStatsInput) => {
  return (_req: IncomingMessage, res: ServerResponse) => {
    const metrics = {
      timestamp: new Date().toISOString(),
      connections: {
        current: wss.clients.size,
        total: messageStats.clientConnections,
      },
      messages: {
        total: messageStats.totalMessages,
        byType: messageStats.messagesByType,
      },
      uptime: process.uptime(),
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics, null, 2));
  };
};
