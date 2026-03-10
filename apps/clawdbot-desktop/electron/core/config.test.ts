import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG, mergeConfig, normalizeConfig, redactConfig } from './config';

describe('config helpers', () => {
  it('normalizes legacy config objects with Telegram defaults', () => {
    const config = normalizeConfig({
      ai: {
        provider: 'openai',
        apiKey: 'key-123',
        model: 'gpt-4-turbo-preview',
        baseUrl: '',
      },
    });

    expect(config.ai.provider).toBe('openai');
    expect(config.ai.model).toBe('gpt-4-turbo-preview');
    expect(config.ai.baseUrl).toBe('');
    expect(config.channels.telegram.enabled).toBe(false);
    expect(config.channels.telegram.pollIntervalMs).toBe(3000);
    expect(config.channels.telegram.allowedChatIds).toEqual([]);
  });

  it('preserves stored secrets when masked fields are omitted', () => {
    const current = normalizeConfig({
      ...DEFAULT_CONFIG,
      ai: {
        provider: 'anthropic',
        apiKey: 'secret-ai',
        model: 'claude-sonnet-4-20250514',
        baseUrl: '',
      },
      channels: {
        telegram: {
          enabled: true,
          botToken: 'secret-bot',
          pollIntervalMs: 6000,
          accessMode: 'allowlist',
          allowedChatIds: ['100', '200'],
        },
      },
    });

    const merged = mergeConfig(current, {
      ai: {
        provider: 'openai',
      },
      channels: {
        telegram: {
          enabled: true,
          accessMode: 'allowlist',
          allowedChatIds: ['200', '300'],
        },
      },
    });

    expect(merged.ai.provider).toBe('openai');
    expect(merged.ai.apiKey).toBe('secret-ai');
    expect(merged.ai.model).toBe('gpt-4-turbo-preview');
    expect(merged.ai.baseUrl).toBe('');
    expect(merged.channels.telegram.botToken).toBe('secret-bot');
    expect(merged.channels.telegram.allowedChatIds).toEqual(['200', '300']);
  });

  it('switches to Moonshot defaults when the provider changes', () => {
    const current = normalizeConfig({
      ...DEFAULT_CONFIG,
      ai: {
        provider: 'anthropic',
        apiKey: 'secret-ai',
        model: 'claude-sonnet-4-20250514',
        baseUrl: '',
      },
    });

    const merged = mergeConfig(current, {
      ai: {
        provider: 'moonshot',
      },
    });

    expect(merged.ai.provider).toBe('moonshot');
    expect(merged.ai.model).toBe('kimi-k2-0711-preview');
    expect(merged.ai.baseUrl).toBe('https://api.moonshot.ai/v1');
    expect(merged.ai.apiKey).toBe('secret-ai');
  });

  it('clears AI and Telegram secrets when requested', () => {
    const current = normalizeConfig({
      ...DEFAULT_CONFIG,
      ai: {
        provider: 'anthropic',
        apiKey: 'secret-ai',
        model: 'claude-sonnet-4-20250514',
        baseUrl: '',
      },
      channels: {
        telegram: {
          enabled: true,
          botToken: 'secret-bot',
          pollIntervalMs: 3000,
          accessMode: 'open',
          allowedChatIds: [],
        },
      },
    });

    const merged = mergeConfig(current, {
      ai: {
        clearApiKey: true,
      },
      channels: {
        telegram: {
          clearBotToken: true,
        },
      },
    });

    expect(merged.ai.apiKey).toBe('');
    expect(merged.channels.telegram.botToken).toBe('');
  });

  it('redacts stored secrets without changing other values', () => {
    const config = normalizeConfig({
      ...DEFAULT_CONFIG,
      ai: {
        provider: 'anthropic',
        apiKey: 'secret-ai',
        model: 'claude-sonnet-4-20250514',
        baseUrl: '',
      },
      channels: {
        telegram: {
          enabled: true,
          botToken: 'secret-bot',
          pollIntervalMs: 4500,
          accessMode: 'allowlist',
          allowedChatIds: ['100'],
        },
      },
    });

    const redacted = redactConfig(config);

    expect(redacted.ai.apiKey).toBe('***');
    expect(redacted.ai.model).toBe('claude-sonnet-4-20250514');
    expect(redacted.channels.telegram.botToken).toBe('***');
    expect(redacted.channels.telegram.allowedChatIds).toEqual(['100']);
    expect(redacted.channels.telegram.pollIntervalMs).toBe(4500);
  });
});
