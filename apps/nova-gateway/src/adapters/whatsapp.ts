import { BaseAdapter } from './adapter.interface.js';
import { logger } from '../utils/logger.js';

/**
 * Architectural placeholder stub for WhatsApp integration.
 * In a future phase, this can be wired up to an SDK like Baileys or Puppeteer-Web
 * to listen for incoming chats and pass them to the CommandRouter, without
 * modifying any core session logic or routing engines.
 */
export class WhatsappAdapter implements BaseAdapter {
  public name = 'whatsapp';

  public async start(): Promise<void> {
    logger.info('WhatsApp Adapter: Initializing placeholder stub. Ready for future integration with Baileys / Puppeteer.');
  }

  public async stop(): Promise<void> {
    logger.info('WhatsApp Adapter: Placeholder stub stopped.');
  }
}
