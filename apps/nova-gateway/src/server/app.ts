import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { logger } from '../utils/logger.js';
import { registerRoutes } from './routes.js';
import { registerWebSocketRoutes } from './websocket.js';
import { TelegramAdapter } from '../adapters/telegram.js';
import { DiscordAdapter } from '../adapters/discord.js';
import { WhatsappAdapter } from '../adapters/whatsapp.js';

export interface AppAdapters {
  telegram: TelegramAdapter;
  discord: DiscordAdapter;
  whatsapp: WhatsappAdapter;
}

export async function buildApp(adapters: AppAdapters): Promise<FastifyInstance> {
  const app = fastify({
    logger: false, // Using custom structured JSON logger
  });

  // Enable CORS
  await app.register(cors, {
    origin: '*',
  });

  // Enable WebSockets
  await app.register(websocket);

  // Register HTTP Routes
  await registerRoutes(app, adapters);

  // Register WebSocket routes
  await registerWebSocketRoutes(app);

  app.addHook('onClose', async () => {
    logger.info('Fastify hook: Server shutting down, stopping adapters...');
    await Promise.all([
      adapters.telegram.stop(),
      adapters.discord.stop(),
      adapters.whatsapp.stop(),
    ]);
  });

  return app;
}
