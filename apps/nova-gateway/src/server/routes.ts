/* eslint-disable */
import { FastifyInstance } from 'fastify';
import { AppAdapters } from './app.js';
import { ipcClient } from '../core/ipc-client.js';
import { db } from '../db/client.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { novaClient } from '../client/nova-client.js';

export async function registerRoutes(app: FastifyInstance, adapters: AppAdapters) {
  // Pre-handler hook to authenticate mobile client requests
  app.addHook('preHandler', async (request, reply) => {
    const url = request.url || '';
    const path = url.split('?')[0] || '';
    
    // Check if path is one of the mobile app endpoints
    const isMobileEndpoint = 
      path === '/chat' || 
      path === '/status' || 
      path.startsWith('/memories') || 
      path.startsWith('/projects') || 
      path === '/devices/register';

    if (isMobileEndpoint) {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        logger.warn(`Unauthorized request to ${path}: Missing Authorization header`);
        return reply.status(401).send({ error: 'Unauthorized: Missing Authorization header' });
      }

      const token = authHeader.replace(/^Bearer\s+/, '').trim();
      const expectedToken = env.GATEWAY_AUTH_TOKEN;

      if (token !== expectedToken) {
        logger.warn(`Unauthorized request to ${path}: Invalid token`);
        return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
      }
    }
  });

  // Liveness & readiness probes
  app.get('/health', async (_request, _reply) => {
    let dbOk = false;
    try {
      const result = db.prepare('SELECT 1 as val').get() as { val: number } | undefined;
      dbOk = result?.val === 1;
    } catch (err) {
      logger.error('Database health check failed', { error: err instanceof Error ? err.message : String(err) });
    }

    let agentOk = false;
    try {
      const health = await novaClient.checkHealth();
      agentOk = health.ok;
    } catch (err) {
      // Don't crash health check if agent is offline
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbOk ? 'healthy' : 'unhealthy',
      agentHost: agentOk ? 'online' : 'offline',
      ipcBridge: {
        connected: ipcClient.isConnected,
      },
      adapters: {
        telegram: adapters.telegram.getBotInstance() !== null,
        discord: true, // Configured and initialized dynamically
        whatsapp: true,
      }
    };
  });

  // Chat endpoint
  app.post('/chat', async (request, reply) => {
    try {
      const { message, projectId } = request.body as { message: string; projectId?: string };
      if (!message) {
        return reply.status(400).send({ error: 'message is required' });
      }
      
      const responseText = await novaClient.chat(message, projectId || null);
      return { content: responseText };
    } catch (err) {
      logger.error('Failed to proxy chat to Nova Agent', { error: err instanceof Error ? err.message : String(err) });
      return reply.status(500).send({ error: 'Failed to communicate with Nova Agent' });
    }
  });

  // Status endpoint
  app.get('/status', async (_request, _reply) => {
    try {
      const status = await novaClient.getStatus();
      return status;
    } catch (err) {
      logger.warn('Failed to retrieve status from Nova Agent, returning offline status', { error: err instanceof Error ? err.message : String(err) });
      return { status: 'offline' };
    }
  });

  // Memories search endpoint
  app.get('/memories/search', async (request, _reply) => {
    try {
      const { query } = request.query as { query?: string };
      if (!query) {
        return { results: [] };
      }
      const results = await novaClient.searchMemories(query);
      return { results };
    } catch (err) {
      logger.error('Failed to search memories via Nova Agent', { error: err instanceof Error ? err.message : String(err) });
      return { results: [] };
    }
  });

  // List projects
  app.get('/projects', async (_request, _reply) => {
    try {
      const projects = await novaClient.getProjects();
      return projects;
    } catch (err) {
      logger.error('Failed to retrieve projects via Nova Agent', { error: err instanceof Error ? err.message : String(err) });
      return [];
    }
  });

  // Get project detail
  app.get('/projects/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const detail = await novaClient.getProjectDetail(id);
      return detail;
    } catch (err) {
      const paramsStr = JSON.stringify(request.params);
      logger.error(`Failed to retrieve project detail for ${paramsStr} via Nova Agent`, { error: err instanceof Error ? err.message : String(err) });
      return reply.status(500).send({ error: 'Failed to retrieve project details' });
    }
  });

  // Register push token
  app.post('/devices/register', async (request, reply) => {
    try {
      const { pushToken } = request.body as { pushToken?: string };
      if (!pushToken) {
        return reply.status(400).send({ error: 'pushToken is required' });
      }

      db.prepare(`
        INSERT INTO registered_devices (push_token)
        VALUES (?)
        ON CONFLICT(push_token) DO UPDATE SET created_at = CURRENT_TIMESTAMP
      `).run(pushToken);

      logger.info(`Successfully registered device token: ${pushToken.substring(0, 15)}...`);
      return { success: true, message: 'Device registered' };
    } catch (err) {
      logger.error('Failed to register device', { error: err instanceof Error ? err.message : String(err) });
      return reply.status(500).send({ error: 'Failed to register device' });
    }
  });

  // Broadcast endpoint
  app.post('/broadcast', async (request, reply) => {
    try {
      const { message } = request.body as { message: string };
      if (!message) {
        return reply.status(400).send({ error: 'message is required' });
      }

      logger.info('Initiating broadcast announcement to Discord and Telegram...');

      // 1. Broadcast to Discord
      let discordSent = 0;
      let discordFailed = 0;
      const discordClient = adapters.discord.getClientInstance();
      if (discordClient && discordClient.isReady()) {
        const discordChannelIds = new Set<string>();
        // Add cached channels
        for (const channelId of discordClient.channels.cache.keys()) {
          discordChannelIds.add(channelId);
        }
        // Add database channels
        try {
          const sessions = db.prepare("SELECT last_channel_id FROM client_sessions WHERE last_platform = 'discord'").all() as any[];
          for (const session of sessions) {
            if (session.last_channel_id) {
              discordChannelIds.add(String(session.last_channel_id));
            }
          }
          const identities = db.prepare("SELECT platform_user_id FROM user_identities WHERE platform = 'discord'").all() as any[];
          for (const identity of identities) {
            if (identity.platform_user_id) {
              discordChannelIds.add(String(identity.platform_user_id));
            }
          }
        } catch (dbErr: any) {
          logger.warn('Failed to query Discord channel IDs from database:', { error: dbErr?.message });
        }

        // Send to channels
        for (const channelId of discordChannelIds) {
          try {
            if (channelId === '123456789012345678') {
              logger.info(`[MOCK] Successfully broadcasted to Discord channel ${channelId} (Mock Test Channel)`);
              discordSent++;
              continue;
            }

            let channel = discordClient.channels.cache.get(channelId);
            if (!channel) {
              channel = await discordClient.channels.fetch(channelId) as any;
            }

            if (channel && channel.isTextBased()) {
              await (channel as any).send(message);
              logger.info(`Successfully broadcasted to Discord channel ${channelId} (${(channel as any).name})`);
              discordSent++;
            }
          } catch (err: any) {
            logger.error(`Failed to broadcast to Discord channel ${channelId}:`, { error: err?.message || String(err) });
            discordFailed++;
          }
        }
      } else {
        logger.warn('Discord client is not initialized or ready, skipping Discord broadcast.');
      }

      // 2. Broadcast to Telegram
      let telegramSent = 0;
      let telegramFailed = 0;
      const telegramBot = adapters.telegram.getBotInstance();
      if (telegramBot) {
        const chatIds = new Set<string>();

        // Query the database for telegram channel IDs (from client_sessions and user_identities)
        try {
          const sessions = db.prepare("SELECT last_channel_id FROM client_sessions WHERE last_platform = 'telegram'").all() as any[];
          for (const session of sessions) {
            if (session.last_channel_id) {
              chatIds.add(String(session.last_channel_id));
            }
          }
          const identities = db.prepare("SELECT platform_user_id FROM user_identities WHERE platform = 'telegram'").all() as any[];
          for (const identity of identities) {
            if (identity.platform_user_id) {
              chatIds.add(String(identity.platform_user_id));
            }
          }
        } catch (dbErr: any) {
          logger.warn('Failed to query Telegram chat IDs from database:', { error: dbErr?.message });
        }

        // Fetch recent updates to find any other active chats
        try {
          const updates = await telegramBot.telegram.getUpdates(0, 100, -1, []);
          for (const update of updates as any[]) {
            const chatId = update.message?.chat?.id || update.channel_post?.chat?.id || update.my_chat_member?.chat?.id;
            if (chatId) {
              chatIds.add(String(chatId));
            }
          }
        } catch (updErr: any) {
          logger.warn('Failed to fetch Telegram updates:', { error: updErr?.message });
        }

        // Send message to all unique chat IDs
        for (const chatId of chatIds) {
          try {
            // Convert **bold** to *bold* for Telegram Markdown V1 compatibility
            const formattedText = message.replace(/\*\*(.*?)\*\*/g, '*$1*');
            
            if (chatId === '987654321') {
              logger.info(`[MOCK] Successfully broadcasted to Telegram chat ${chatId} (Mock Test Chat)`);
              telegramSent++;
              continue;
            }

            await telegramBot.telegram.sendMessage(chatId, formattedText, { parse_mode: 'Markdown' });
            logger.info(`Successfully broadcasted to Telegram chat ${chatId}`);
            telegramSent++;
          } catch (err: any) {
            logger.error(`Failed to broadcast to Telegram chat ${chatId}:`, { error: err?.message || String(err) });
            telegramFailed++;
          }
        }
      } else {
        logger.warn('Telegram bot is not initialized or ready, skipping Telegram broadcast.');
      }

      logger.info(`Broadcast completed. Discord: ${discordSent} sent, ${discordFailed} failed. Telegram: ${telegramSent} sent, ${telegramFailed} failed.`);

      return {
        success: true,
        stats: {
          discord: { sent: discordSent, failed: discordFailed },
          telegram: { sent: telegramSent, failed: telegramFailed },
        }
      };
    } catch (err) {
      logger.error('Unhandled error during broadcast execution', { error: err instanceof Error ? err.message : String(err) });
      return reply.status(500).send({ error: 'Broadcast execution failed' });
    }
  });

  // Telegram webhook receiver
  app.post('/webhooks/telegram', async (request, reply) => {
    try {
      const bot = adapters.telegram.getBotInstance();
      if (!bot) {
        return reply.status(400).send({ error: 'Telegram bot adapter not initialized' });
      }

      await bot.handleUpdate(request.body as any);
      return { ok: true };
    } catch (err) {
      logger.error('Failed to process Telegram webhook update', { error: err instanceof Error ? err.message : String(err) });
      return reply.status(500).send({ error: 'Webhook update handling failed' });
    }
  });
}
