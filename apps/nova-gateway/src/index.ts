import { buildApp } from './server/app.js';
import { initializeSchema } from './db/schema.js';
import { TelegramAdapter } from './adapters/telegram.js';
import { DiscordAdapter } from './adapters/discord.js';
import { WhatsappAdapter } from './adapters/whatsapp.js';
import { ipcClient } from './core/ipc-client.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { sendPushNotificationToAll } from './utils/push.js';

async function bootstrap() {
  logger.info('Starting Nova Agent Gateway...');

  try {
    // 1. Initialize SQLite Database Schema
    initializeSchema();

    // 2. Initialize Platform Adapters
    const telegramAdapter = new TelegramAdapter();
    const discordAdapter = new DiscordAdapter();
    const whatsappAdapter = new WhatsappAdapter();

    const adapters = {
      telegram: telegramAdapter,
      discord: discordAdapter,
      whatsapp: whatsappAdapter,
    };

    // 3. Connect to IPC Bridge (WebSocket) and listen for push notifications
    // Register error handler to prevent Node EventEmitter from throwing unhandled exception
    ipcClient.on('error', (err: any) => {
      logger.warn('IPC client connection error (auto-reconnect is active):', { error: err?.message || String(err) });
    });

    // Catch connection errors to prevent the entire process from crashing on startup
    // if the bridge is temporarily offline (since IPC Client reconnects automatically).
    ipcClient.connect()
      .then(() => {
        ipcClient.on('message', (msg: any) => {
          const type = msg?.type;
          const payload = msg?.payload || {};

          let title = '';
          let body = '';

          switch (type) {
            case 'notification':
              title = payload.title || 'NOVA Notification';
              body = payload.body || payload.message || 'New update from Nova Agent';
              break;
            case 'task_started':
              title = 'Task Started';
              body = payload.description || `Task ${payload.taskId || ''} started.`;
              break;
            case 'task_stopped':
              title = 'Task Completed';
              body = payload.description || `Task ${payload.taskId || ''} finished.`;
              break;
            case 'task_progress':
              title = 'Task Progress';
              body = payload.progress || `Task ${payload.taskId || ''} is in progress.`;
              break;
          }

          if (title && body) {
            sendPushNotificationToAll({
              title,
              body,
              data: { msgType: type, ...payload },
            }).catch((err) => {
              logger.error('Failed to send push notification from IPC event:', {}, err);
            });
          }
        });
      })
      .catch((err) => {
        logger.error('Failed to establish initial connection to IPC Bridge, auto-reconnection active.', {}, err);
      });

    // 4. Start Platform Adapters
    await telegramAdapter.start();
    await discordAdapter.start();
    await whatsappAdapter.start();

    // 5. Build and Start Fastify Server
    const app = await buildApp(adapters);

    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`Nova Agent Gateway server listening on port ${env.PORT}`);

    // 6. Graceful Shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      try {
        // Disconnect WebSocket bridge
        ipcClient.disconnect();
        // Close Fastify server (which triggers onClose hook and stops adapters)
        await app.close();
        logger.info('Graceful shutdown completed. Exiting.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during graceful shutdown:', {}, err as Error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    logger.error('Bootstrap failed, terminating process:', {}, err as Error);
    process.exit(1);
  }
}

bootstrap();
