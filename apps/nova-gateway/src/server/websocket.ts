import { FastifyInstance } from 'fastify';
import { logEmitter } from '../utils/logger.js';

export async function registerWebSocketRoutes(app: FastifyInstance) {
  // Expose a WebSocket path for administrators to stream application logs live
  app.get('/ws/logs', { websocket: true }, (connection: any, _req) => {
    const socket = connection.socket || connection;
    const onLog = (logLine: string) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(logLine);
      }
    };

    logEmitter.on('log', onLog);

    socket.on('close', () => {
      logEmitter.off('log', onLog);
    });

    socket.on('error', () => {
      logEmitter.off('log', onLog);
    });
  });
}
