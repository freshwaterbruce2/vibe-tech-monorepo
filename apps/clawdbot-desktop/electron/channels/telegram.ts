import { ActivityLevel, TelegramChannelConfig, TelegramChannelStatus } from '../core/types';

export interface TelegramInboundMessage {
  chatId: string;
  userId: string;
  displayName: string;
  text: string;
}

interface TelegramBotIdentity {
  id: string;
  username: string | null;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat?: { id?: number | string };
    from?: { id?: number | string; first_name?: string; username?: string };
    text?: string;
  };
}

interface TelegramApiResponse<T> {
  ok: boolean;
  description?: string;
  result: T;
}

type ActivityReporter = (
  event: string,
  message: string,
  level?: ActivityLevel,
  data?: unknown
) => void;

type MessageHandler = (message: TelegramInboundMessage) => Promise<string | null | undefined>;

function nowIso(): string {
  return new Date().toISOString();
}

function cloneAllowedChatIds(allowedChatIds: string[]): string[] {
  return Array.from(new Set(allowedChatIds.map((value) => value.trim()).filter(Boolean)));
}

function buildStatus(overrides: Partial<TelegramChannelStatus>): TelegramChannelStatus {
  return {
    enabled: false,
    state: 'disabled',
    summary: 'Telegram disabled',
    detail: 'Save a Telegram bot token and enable the channel to start polling.',
    botUsername: null,
    botId: null,
    accessMode: 'open',
    allowedChatIds: [],
    lastInboundAt: null,
    lastOutboundAt: null,
    lastChatId: null,
    lastError: null,
    ...overrides,
  };
}

export class TelegramChannel {
  private config: TelegramChannelConfig;
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private updateOffset = 0;
  private status: TelegramChannelStatus;
  private botIdentity: TelegramBotIdentity | null = null;

  constructor(
    config: TelegramChannelConfig,
    private readonly handleMessage: MessageHandler,
    private readonly reportActivity: ActivityReporter
  ) {
    this.config = {
      ...config,
      allowedChatIds: cloneAllowedChatIds(config.allowedChatIds),
    };
    this.status = buildStatus({
      enabled: config.enabled,
      accessMode: config.accessMode,
      allowedChatIds: cloneAllowedChatIds(config.allowedChatIds),
    });
  }

  getStatus(): TelegramChannelStatus {
    return {
      ...this.status,
      allowedChatIds: [...this.status.allowedChatIds],
    };
  }

  async reconfigure(config: TelegramChannelConfig): Promise<void> {
    await this.stop();
    this.config = {
      ...config,
      allowedChatIds: cloneAllowedChatIds(config.allowedChatIds),
    };
    this.status = buildStatus({
      enabled: this.config.enabled,
      accessMode: this.config.accessMode,
      allowedChatIds: [...this.config.allowedChatIds],
    });

    if (this.config.enabled) {
      await this.start();
    }
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    if (!this.config.enabled) {
      this.status = buildStatus({
        enabled: false,
        accessMode: this.config.accessMode,
        allowedChatIds: [...this.config.allowedChatIds],
      });
      return;
    }

    if (!this.config.botToken) {
      this.status = buildStatus({
        enabled: true,
        state: 'error',
        summary: 'Telegram token missing',
        detail: 'Save a Telegram bot token before enabling the channel.',
        accessMode: this.config.accessMode,
        allowedChatIds: [...this.config.allowedChatIds],
        lastError: 'Bot token missing',
      });
      return;
    }

    this.running = true;
    this.status = buildStatus({
      enabled: true,
      state: 'connecting',
      summary: 'Telegram connecting',
      detail: 'Testing bot credentials and starting polling.',
      accessMode: this.config.accessMode,
      allowedChatIds: [...this.config.allowedChatIds],
    });
    this.reportActivity('telegram_connecting', 'Connecting Telegram bot', 'info');

    try {
      await this.ensureIdentity();
      this.status = buildStatus({
        enabled: true,
        state: 'connected',
        summary: 'Telegram connected',
        detail: this.botIdentity?.username
          ? `Polling as @${this.botIdentity.username}`
          : 'Polling Telegram for inbound messages.',
        accessMode: this.config.accessMode,
        allowedChatIds: [...this.config.allowedChatIds],
        botId: this.botIdentity?.id ?? null,
        botUsername: this.botIdentity?.username ?? null,
      });
      this.schedulePoll(0);
    } catch (error) {
      this.running = false;
      this.setError(error, 'Telegram connection failed');
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (!this.config.enabled) {
      this.status = buildStatus({
        enabled: false,
        accessMode: this.config.accessMode,
        allowedChatIds: [...this.config.allowedChatIds],
      });
      return;
    }

    this.status = buildStatus({
      enabled: true,
      state: 'disabled',
      summary: 'Telegram stopped',
      detail: 'Telegram polling is stopped.',
      accessMode: this.config.accessMode,
      allowedChatIds: [...this.config.allowedChatIds],
      botId: this.botIdentity?.id ?? null,
      botUsername: this.botIdentity?.username ?? null,
    });
  }

  async testConnectivity(): Promise<TelegramChannelStatus> {
    await this.ensureIdentity();
    return buildStatus({
      ...this.status,
      enabled: this.config.enabled,
      state: 'connected',
      summary: 'Telegram credentials verified',
      detail: this.botIdentity?.username
        ? `Bot token valid for @${this.botIdentity.username}`
        : 'Bot token valid.',
      botId: this.botIdentity?.id ?? null,
      botUsername: this.botIdentity?.username ?? null,
      accessMode: this.config.accessMode,
      allowedChatIds: [...this.config.allowedChatIds],
      lastError: null,
    });
  }

  private async ensureIdentity(): Promise<void> {
    const response = await this.callTelegram<{ id: number | string; username?: string }>('getMe', {});
    this.botIdentity = {
      id: String(response.id),
      username: response.username ?? null,
    };
  }

  private schedulePoll(delayMs: number): void {
    if (!this.running) {
      return;
    }

    this.timer = setTimeout(() => {
      void this.pollOnce();
    }, delayMs);
  }

  private async pollOnce(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      const updates = await this.callTelegram<TelegramUpdate[]>('getUpdates', {
        offset: this.updateOffset,
        timeout: 0,
      });

      for (const update of updates) {
        this.updateOffset = Math.max(this.updateOffset, update.update_id + 1);
        await this.handleUpdate(update);
      }

      if (this.status.state !== 'connected') {
        this.status = buildStatus({
          ...this.status,
          enabled: true,
          state: 'connected',
          summary: 'Telegram connected',
          detail: this.botIdentity?.username
            ? `Polling as @${this.botIdentity.username}`
            : 'Polling Telegram for inbound messages.',
          botId: this.botIdentity?.id ?? null,
          botUsername: this.botIdentity?.username ?? null,
          accessMode: this.config.accessMode,
          allowedChatIds: [...this.config.allowedChatIds],
          lastInboundAt: this.status.lastInboundAt,
          lastOutboundAt: this.status.lastOutboundAt,
          lastChatId: this.status.lastChatId,
        });
      }
    } catch (error) {
      this.setError(error, 'Telegram polling failed');
    } finally {
      this.schedulePoll(this.config.pollIntervalMs);
    }
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    const chatId = update.message?.chat?.id;
    const fromId = update.message?.from?.id;
    const text = update.message?.text?.trim();

    if (!chatId || !fromId || !text) {
      return;
    }

    const normalizedChatId = String(chatId);
    if (!this.isChatAllowed(normalizedChatId)) {
      this.reportActivity('telegram_message_blocked', 'Blocked Telegram message from non-allowed chat', 'warn', {
        chatId: normalizedChatId,
        accessMode: this.config.accessMode,
      });
      return;
    }

    const inbound: TelegramInboundMessage = {
      chatId: normalizedChatId,
      userId: String(fromId),
      displayName:
        update.message?.from?.username ??
        update.message?.from?.first_name ??
        `telegram:${String(fromId)}`,
      text,
    };

    this.status = buildStatus({
      ...this.status,
      enabled: true,
      state: 'connected',
      summary: 'Telegram connected',
      detail: this.botIdentity?.username
        ? `Polling as @${this.botIdentity.username}`
        : 'Polling Telegram for inbound messages.',
      botId: this.botIdentity?.id ?? null,
      botUsername: this.botIdentity?.username ?? null,
      accessMode: this.config.accessMode,
      allowedChatIds: [...this.config.allowedChatIds],
      lastInboundAt: nowIso(),
      lastChatId: inbound.chatId,
      lastOutboundAt: this.status.lastOutboundAt,
    });
    this.reportActivity('telegram_message_received', 'Telegram message received', 'info', {
      chatId: inbound.chatId,
      userId: inbound.userId,
      text: inbound.text,
    });

    const response = await this.handleMessage(inbound);
    if (response) {
      await this.sendMessage(inbound.chatId, response);
    }
  }

  private isChatAllowed(chatId: string): boolean {
    if (this.config.accessMode === 'open') {
      return true;
    }

    return this.config.allowedChatIds.includes(chatId);
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    await this.callTelegram('sendMessage', {
      chat_id: chatId,
      text,
    });
    this.status = buildStatus({
      ...this.status,
      enabled: true,
      state: 'connected',
      summary: 'Telegram connected',
      detail: this.botIdentity?.username
        ? `Polling as @${this.botIdentity.username}`
        : 'Polling Telegram for inbound messages.',
      botId: this.botIdentity?.id ?? null,
      botUsername: this.botIdentity?.username ?? null,
      accessMode: this.config.accessMode,
      allowedChatIds: [...this.config.allowedChatIds],
      lastInboundAt: this.status.lastInboundAt,
      lastOutboundAt: nowIso(),
      lastChatId: chatId,
    });
    this.reportActivity('telegram_message_sent', 'Telegram reply sent', 'info', {
      chatId,
      characters: text.length,
    });
  }

  private async callTelegram<T>(method: string, payload: Record<string, unknown>): Promise<T> {
    const response = await fetch(`https://api.telegram.org/bot${this.config.botToken}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as TelegramApiResponse<T>;
    if (!response.ok || !body.ok) {
      throw new Error(body.description || `Telegram API request failed: ${response.status}`);
    }

    return body.result;
  }

  private setError(error: unknown, summary: string): void {
    const message = error instanceof Error ? error.message : String(error);
    this.status = buildStatus({
      enabled: this.config.enabled,
      state: 'error',
      summary,
      detail: message,
      botId: this.botIdentity?.id ?? null,
      botUsername: this.botIdentity?.username ?? null,
      accessMode: this.config.accessMode,
      allowedChatIds: [...this.config.allowedChatIds],
      lastInboundAt: this.status.lastInboundAt,
      lastOutboundAt: this.status.lastOutboundAt,
      lastChatId: this.status.lastChatId,
      lastError: message,
    });
    this.reportActivity('telegram_error', summary, 'error', { error: message });
  }
}
