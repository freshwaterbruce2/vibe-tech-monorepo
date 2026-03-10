import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TelegramChannel } from './telegram';

function createJsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  };
}

describe('TelegramChannel', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('verifies bot identity during connectivity tests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        ok: true,
        result: {
          id: 42,
          username: 'clawdbot_test',
        },
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    const channel = new TelegramChannel(
      {
        enabled: true,
        botToken: 'bot-token',
        pollIntervalMs: 3000,
        accessMode: 'open',
        allowedChatIds: [],
      },
      async () => null,
      () => undefined
    );

    const status = await channel.testConnectivity();

    expect(status.state).toBe('connected');
    expect(status.botUsername).toBe('clawdbot_test');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/botbot-token/getMe',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('blocks messages from chats outside the allowlist', async () => {
    vi.useFakeTimers();
    const handler = vi.fn(async () => 'reply');
    const reporter = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          ok: true,
          result: {
            id: 42,
            username: 'clawdbot_test',
          },
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          ok: true,
          result: [
            {
              update_id: 1,
              message: {
                chat: { id: 999 },
                from: { id: 12, username: 'blocked_user' },
                text: 'hello',
              },
            },
          ],
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const channel = new TelegramChannel(
      {
        enabled: true,
        botToken: 'bot-token',
        pollIntervalMs: 3000,
        accessMode: 'allowlist',
        allowedChatIds: ['123'],
      },
      handler,
      reporter
    );

    await channel.start();
    await vi.runOnlyPendingTimersAsync();
    await channel.stop();

    expect(handler).not.toHaveBeenCalled();
    expect(reporter).toHaveBeenCalledWith(
      'telegram_message_blocked',
      'Blocked Telegram message from non-allowed chat',
      'warn',
      expect.objectContaining({ chatId: '999' })
    );
  });

  it('tracks outbound message timestamps after sending a reply', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        ok: true,
        result: true,
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    const channel = new TelegramChannel(
      {
        enabled: true,
        botToken: 'bot-token',
        pollIntervalMs: 3000,
        accessMode: 'open',
        allowedChatIds: [],
      },
      async () => null,
      () => undefined
    );

    await channel.sendMessage('123', 'reply text');
    const status = channel.getStatus();

    expect(status.lastChatId).toBe('123');
    expect(status.lastOutboundAt).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/botbot-token/sendMessage',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
