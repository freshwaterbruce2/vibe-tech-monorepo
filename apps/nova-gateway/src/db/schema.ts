import { db } from './client.js';
import { logger } from '../utils/logger.js';

export function initializeSchema(): void {
  try {
    logger.info('Initializing SQLite schema migrations...');

    // Create unified_clients table
    db.exec(`
      CREATE TABLE IF NOT EXISTS unified_clients (
        id TEXT PRIMARY KEY,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_identities table
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_identities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unified_client_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        platform_user_id TEXT NOT NULL,
        platform_username TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (unified_client_id) REFERENCES unified_clients(id) ON DELETE CASCADE,
        UNIQUE(platform, platform_user_id)
      )
    `);

    // Create client_sessions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS client_sessions (
        unified_client_id TEXT PRIMARY KEY,
        last_platform TEXT NOT NULL,
        last_channel_id TEXT NOT NULL,
        conversation_state TEXT NOT NULL,
        last_active TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (unified_client_id) REFERENCES unified_clients(id) ON DELETE CASCADE
      )
    `);

    // Create pairing_codes table for cross-platform link pairing
    db.exec(`
      CREATE TABLE IF NOT EXISTS pairing_codes (
        code TEXT PRIMARY KEY,
        unified_client_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (unified_client_id) REFERENCES unified_clients(id) ON DELETE CASCADE
      )
    `);

    // Create index on platform / user_id for faster lookups
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_identities_platform_user_id 
      ON user_identities(platform, platform_user_id)
    `);

    // Create registered_devices table
    db.exec(`
      CREATE TABLE IF NOT EXISTS registered_devices (
        push_token TEXT PRIMARY KEY,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed mock channels for development testing/broadcasting if empty
    const checkClients = db.prepare('SELECT COUNT(*) as count FROM unified_clients').get() as { count: number };
    if (checkClients.count === 0) {
      logger.info('Seeding mock client sessions for Discord and Telegram...');
      const runSeed = db.transaction(() => {
        db.prepare("INSERT OR IGNORE INTO unified_clients (id) VALUES ('client_mock_discord')").run();
        db.prepare("INSERT OR IGNORE INTO unified_clients (id) VALUES ('client_mock_telegram')").run();
        
        db.prepare(`
          INSERT OR IGNORE INTO user_identities (unified_client_id, platform, platform_user_id, platform_username)
          VALUES ('client_mock_discord', 'discord', '123456789012345678', 'MockDiscordUser')
        `).run();
        db.prepare(`
          INSERT OR IGNORE INTO user_identities (unified_client_id, platform, platform_user_id, platform_username)
          VALUES ('client_mock_telegram', 'telegram', '987654321', 'MockTelegramUser')
        `).run();

        db.prepare(`
          INSERT OR IGNORE INTO client_sessions (unified_client_id, last_platform, last_channel_id, conversation_state)
          VALUES ('client_mock_discord', 'discord', '123456789012345678', '{"history":[],"variables":{},"activeProjectId":null}')
        `).run();
        db.prepare(`
          INSERT OR IGNORE INTO client_sessions (unified_client_id, last_platform, last_channel_id, conversation_state)
          VALUES ('client_mock_telegram', 'telegram', '987654321', '{"history":[],"variables":{},"activeProjectId":null}')
        `).run();
      });
      runSeed();
    }

    logger.info('Database schema initialized successfully.');
  } catch (err) {
    logger.error('Failed to run database migrations:', {}, err as Error);
    throw err;
  }
}
