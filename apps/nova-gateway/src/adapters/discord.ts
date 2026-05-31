/* eslint-disable */
import { Client, GatewayIntentBits, Partials, AttachmentBuilder } from 'discord.js';
import fs from 'fs';
import { BaseAdapter } from './adapter.interface.js';
import { commandRouter } from '../core/command-router.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export class DiscordAdapter implements BaseAdapter {
  public name = 'discord';
  private client: Client | null = null;

  public async start(): Promise<void> {
    if (!env.DISCORD_BOT_TOKEN || env.DISCORD_BOT_TOKEN === 'mock-discord-token') {
      logger.warn('DISCORD_BOT_TOKEN is not configured or is mock. Discord bot will not start.');
      return;
    }

    try {
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.MessageContent,
        ],
        partials: [Partials.Channel],
      });

      this.client.on('ready', () => {
        logger.info(`Discord Bot logged in as ${this.client?.user?.tag}`);
      });

      this.client.on('messageCreate', async (message) => {
        // Ignore bot messages to prevent feedback loops
        if (message.author.bot) return;

        const isDM = !message.guild;
        const isMentioned = message.mentions.has(this.client?.user?.id || '');

        // Respond only to DMs or Mentions in guild channels
        if (!isDM && !isMentioned) return;

        // Clean up the text by stripping the bot mention
        let cleanText = message.content;
        if (this.client?.user) {
          const mentionRegex = new RegExp(`<@!?${this.client.user.id}>`, 'g');
          cleanText = cleanText.replace(mentionRegex, '').trim();
        }

        const platformUserId = message.author.id;
        const channelId = message.channel.id;

        try {
          // Trigger typing state to show bot is working
          await message.channel.sendTyping();

          const response = await commandRouter.routeMessage(
            'discord',
            platformUserId,
            channelId,
            cleanText
          );

          if (response.imagePath && fs.existsSync(response.imagePath)) {
            const attachment = new AttachmentBuilder(response.imagePath);
            await message.reply({
              content: response.text,
              files: [attachment],
            });
          } else {
            await message.reply(response.text);
          }
        } catch (err) {
          logger.error('Error handling Discord message:', { content: message.content, author: platformUserId }, err as Error);
          await message.reply('❌ An error occurred while processing your message.');
        }
      });

      await this.client.login(env.DISCORD_BOT_TOKEN);
      logger.info('Discord Bot Adapter started successfully.');
    } catch (err) {
      logger.error('Failed to start Discord Bot Adapter:', {}, err as Error);
      throw err;
    }
  }

  public getClientInstance(): Client | null {
    return this.client;
  }

  public async stop(): Promise<void> {
    if (this.client) {
      logger.info('Stopping Discord Bot Client...');
      this.client.destroy();
      this.client = null;
    }
  }
}
