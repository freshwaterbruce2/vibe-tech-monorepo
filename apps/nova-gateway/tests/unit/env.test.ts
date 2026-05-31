import { describe, it, expect } from 'vitest';
import { envSchema } from '../../src/config/env.js';

describe('Environment Configuration Validation', () => {
  const baseValidEnv = {
    PORT: '5005',
    NODE_ENV: 'development',
    DATABASE_URL: 'D:\\databases\\nova-gateway.db',
    LOG_DIR: 'D:\\logs\\nova-gateway',
    IPC_BRIDGE_URL: 'ws://localhost:5004',
    IPC_BRIDGE_SECRET: 'test-secret',
    TELEGRAM_BOT_TOKEN: 'test-tg-token',
    DISCORD_BOT_TOKEN: 'test-discord-token',
    DISCORD_CLIENT_ID: 'test-discord-id',
  };

  it('should validate a conforming environment configuration', () => {
    const result = envSchema.safeParse(baseValidEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(5005);
      expect(result.data.DATABASE_URL).toBe('D:\\databases\\nova-gateway.db');
      expect(result.data.LOG_DIR).toBe('D:\\logs\\nova-gateway');
    }
  });

  it('should accept forward slashes on the D:\\ drive', () => {
    const result = envSchema.safeParse({
      ...baseValidEnv,
      DATABASE_URL: 'D:/databases/nova-gateway.db',
      LOG_DIR: 'D:/logs/nova-gateway',
    });
    expect(result.success).toBe(true);
  });

  it('should reject a DATABASE_URL pointing to the C:\\ drive in non-test mode', () => {
    // Temporarily disable the test bypass to assert development/production validation
    const originalVitest = process.env.VITEST;
    const originalNodeEnv = process.env.NODE_ENV;
    delete process.env.VITEST;
    process.env.NODE_ENV = 'development';

    try {
      const result = envSchema.safeParse({
        ...baseValidEnv,
        DATABASE_URL: 'C:\\dev\\nova-gateway.db',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(e => e.path.includes('DATABASE_URL'));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain('DATABASE_URL must reside on the D:\\ drive');
      }
    } finally {
      // Always restore original env values
      if (originalVitest !== undefined) process.env.VITEST = originalVitest;
      if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('should reject a LOG_DIR pointing to the C:\\ drive in non-test mode', () => {
    // Temporarily disable the test bypass to assert development/production validation
    const originalVitest = process.env.VITEST;
    const originalNodeEnv = process.env.NODE_ENV;
    delete process.env.VITEST;
    process.env.NODE_ENV = 'development';

    try {
      const result = envSchema.safeParse({
        ...baseValidEnv,
        LOG_DIR: 'C:\\logs\\nova-gateway',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(e => e.path.includes('LOG_DIR'));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain('LOG_DIR must reside on the D:\\ drive');
      }
    } finally {
      // Always restore original env values
      if (originalVitest !== undefined) process.env.VITEST = originalVitest;
      if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('should fall back to defaults for PORT, NODE_ENV, DATABASE_URL, and LOG_DIR', () => {
    const result = envSchema.safeParse({
      IPC_BRIDGE_SECRET: 'test-secret',
      TELEGRAM_BOT_TOKEN: 'test-tg-token',
      DISCORD_BOT_TOKEN: 'test-discord-token',
      DISCORD_CLIENT_ID: 'test-discord-id',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(5005);
      expect(result.data.NODE_ENV).toBe('development');
      expect(result.data.DATABASE_URL).toBe('D:\\databases\\nova-gateway.db');
      expect(result.data.LOG_DIR).toBe('D:\\logs\\nova-gateway');
    }
  });

  it('should fail validation if required fields are missing', () => {
    const result = envSchema.safeParse({
      PORT: '5005',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(e => e.path.includes('IPC_BRIDGE_SECRET'))).toBe(true);
      expect(result.error.issues.some(e => e.path.includes('TELEGRAM_BOT_TOKEN'))).toBe(true);
      expect(result.error.issues.some(e => e.path.includes('DISCORD_BOT_TOKEN'))).toBe(true);
      expect(result.error.issues.some(e => e.path.includes('DISCORD_CLIENT_ID'))).toBe(true);
    }
  });
});
