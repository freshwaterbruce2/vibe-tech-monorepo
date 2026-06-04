import { describe, expect, it } from 'vitest';
import { loadConfig, isUserAllowed } from '../src/config.js';

describe('loadConfig and isUserAllowed', () => {
  it('accepts numeric admin IDs and lowercase usernames', () => {
    const config = loadConfig({
      BOT_TOKEN: 'token',
      ADMIN_TELEGRAM_IDS: '123,@Bruce2347',
    });

    expect(config.adminIds.has(123)).toBe(true);
    expect(config.adminUsernames.has('bruce2347')).toBe(true);
  });

  it('throws error if no valid admin entries found', () => {
    expect(() => loadConfig({
      BOT_TOKEN: 'token',
      ADMIN_TELEGRAM_IDS: 'invalid_entry',
    })).toThrow(/ADMIN_TELEGRAM_IDS must contain at least one numeric/);
  });

  it('correctly validates user authorization', () => {
    const config = loadConfig({
      BOT_TOKEN: 'token',
      ADMIN_TELEGRAM_IDS: '123,@bruce2347',
    });

    // Allowed by ID
    expect(isUserAllowed(config, { id: 123, username: 'unknown' })).toBe(true);
    
    // Allowed by Username
    expect(isUserAllowed(config, { id: 999, username: 'Bruce2347' })).toBe(true);
    
    // Unauthorized
    expect(isUserAllowed(config, { id: 999, username: 'intruder' })).toBe(false);
    expect(isUserAllowed(config, undefined)).toBe(false);
  });
});
