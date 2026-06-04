import { readFileSync } from 'node:fs';
import { z } from 'zod';

const schema = z.object({
  BOT_TOKEN: z.string().min(1),
  ADMIN_TELEGRAM_IDS: z.string().min(1),
});

export interface BotConfig {
  readonly botToken: string;
  readonly adminIds: ReadonlySet<number>;
  readonly adminUsernames: ReadonlySet<string>;
}

export function loadLocalEnv(envPath: URL): void {
  try {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['\"]|['\"]$/g, '');
      process.env[key] ??= value;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BotConfig {
  const parsed = schema.parse(env);
  const entries = parsed.ADMIN_TELEGRAM_IDS.split(',').map((entry) => entry.trim()).filter(Boolean);
  const adminIds = new Set(entries.map((entry) => Number(entry)).filter(Number.isFinite));
  const adminUsernames = new Set(
    entries
      .filter((entry) => entry.startsWith('@'))
      .map((entry) => entry.slice(1).toLowerCase())
      .filter((entry) => /^[a-z0-9_]{5,32}$/.test(entry)),
  );
  if (adminIds.size === 0 && adminUsernames.size === 0) {
    throw new Error('ADMIN_TELEGRAM_IDS must contain at least one numeric Telegram user ID or @username');
  }
  return { botToken: parsed.BOT_TOKEN, adminIds, adminUsernames };
}

export function isUserAllowed(
  config: BotConfig,
  from?: { id: number; username?: string },
): boolean {
  if (!from) return false;
  const id = from.id;
  const username = from.username?.toLowerCase();
  const isAllowedById = config.adminIds.has(id);
  const isAllowedByUsername = Boolean(username && config.adminUsernames.has(username));
  return isAllowedById || isAllowedByUsername;
}

