import { Telegraf } from 'telegraf';
import fs from 'fs';
import { BaseAdapter } from './adapter.interface.js';
import { commandRouter } from '../core/command-router.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export class TelegramAdapter implements BaseAdapter {
  public name = 'telegram';
  private bot: Telegraf | null = null;
  private isPolling = false;

  public getBotInstance(): Telegraf | null {
    return this.bot;
  }

  public async start(): Promise<void> {
    if (!env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN === 'mock-tg-token') {
      logger.warn('TELEGRAM_BOT_TOKEN is not configured or is mock. Telegram bot will not start.');
      return;
    }

    try {
      this.bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

      // Handle all text messages and slash commands
      this.bot.on('text', async (ctx) => {
        const platformUserId = String(ctx.from.id);
        const channelId = String(ctx.chat.id);
        const text = ctx.message.text;

        try {
          // Display typing state in Telegram
          await ctx.sendChatAction('typing');

          const response = await commandRouter.routeMessage(
            'telegram',
            platformUserId,
            channelId,
            text
          );

          // Convert **bold** to *bold* for Telegram Markdown V1 compatibility
          const formattedText = response.text.replace(/\*\*(.*?)\*\*/g, '*$1*');

          if (response.imagePath && fs.existsSync(response.imagePath)) {
            // Send as photo if file is accessible locally
            await ctx.replyWithPhoto(
              { source: response.imagePath },
              { caption: formattedText.length > 1024 ? formattedText.slice(0, 1021) + '...' : formattedText, parse_mode: 'Markdown' }
            );
          } else {
            await ctx.reply(formattedText, { parse_mode: 'Markdown' });
          }
        } catch (err) {
          logger.error('Error handling Telegram message:', { text, userId: platformUserId }, err as Error);
          await ctx.reply('❌ An internal error occurred while processing your message.');
        }
      });

      // Launch mechanism
      if (env.WEBHOOK_DOMAIN) {
        logger.info('Telegram Bot starting in Webhook mode...');
        // Webhook is configured, so we do not call launch()
        // Fastify will handle incoming webhooks and call bot.handleUpdate()
      } else {
        logger.info('Telegram Bot starting in Long-Polling mode...');
        this.bot.launch().catch(err => {
          logger.error('Telegraf launch error:', {}, err);
        });
        this.isPolling = true;
      }

      logger.info('Telegram Bot Adapter started successfully.');
    } catch (err) {
      logger.error('Failed to start Telegram Bot Adapter:', {}, err as Error);
      throw err;
    }
  }

  public async stop(): Promise<void> {
    if (this.bot) {
      if (this.isPolling) {
        logger.info('Stopping Telegram Bot polling...');
        this.bot.stop();
        this.isPolling = false;
      }
      this.bot = null;
    }
  }
}
