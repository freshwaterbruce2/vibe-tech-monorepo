import {
  ClawdBotConfig,
  ConfigUpdate,
  GatewayUrls,
  AiProvider,
  TelegramChannelConfig,
} from './types';

export const PROVIDER_DEFAULTS: Record<AiProvider, { model: string; baseUrl: string }> = {
  anthropic: {
    model: 'claude-sonnet-4-20250514',
    baseUrl: '',
  },
  openai: {
    model: 'gpt-4-turbo-preview',
    baseUrl: '',
  },
  moonshot: {
    model: 'kimi-k2-0711-preview',
    baseUrl: 'https://api.moonshot.ai/v1',
  },
};

export const DEFAULT_TELEGRAM_CHANNEL_CONFIG: TelegramChannelConfig = {
  enabled: false,
  botToken: '',
  pollIntervalMs: 3000,
  accessMode: 'open',
  allowedChatIds: [],
};

export const DEFAULT_CONFIG: ClawdBotConfig = {
  ai: {
    provider: 'anthropic',
    apiKey: '',
    model: PROVIDER_DEFAULTS.anthropic.model,
    baseUrl: PROVIDER_DEFAULTS.anthropic.baseUrl,
  },
  gateway: {
    port: 18789,
    wsPort: 18790,
  },
  features: {
    browserAutomation: true,
    desktopAutomation: true,
    aiChat: true,
  },
  channels: {
    telegram: DEFAULT_TELEGRAM_CHANNEL_CONFIG,
  },
};

function dedupeStrings(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

export function normalizeConfig(raw: Partial<ClawdBotConfig> | null | undefined): ClawdBotConfig {
  const provider = raw?.ai?.provider ?? DEFAULT_CONFIG.ai.provider;
  const providerDefaults = PROVIDER_DEFAULTS[provider];
  const merged: ClawdBotConfig = {
    ai: {
      provider,
      apiKey: raw?.ai?.apiKey ?? DEFAULT_CONFIG.ai.apiKey,
      model: raw?.ai?.model?.trim() || providerDefaults.model,
      baseUrl: raw?.ai?.baseUrl?.trim() || providerDefaults.baseUrl,
    },
    gateway: {
      port: raw?.gateway?.port ?? DEFAULT_CONFIG.gateway.port,
      wsPort: raw?.gateway?.wsPort ?? DEFAULT_CONFIG.gateway.wsPort,
    },
    features: {
      browserAutomation: raw?.features?.browserAutomation ?? DEFAULT_CONFIG.features.browserAutomation,
      desktopAutomation: raw?.features?.desktopAutomation ?? DEFAULT_CONFIG.features.desktopAutomation,
      aiChat: raw?.features?.aiChat ?? DEFAULT_CONFIG.features.aiChat,
    },
    channels: {
      telegram: {
        enabled: raw?.channels?.telegram?.enabled ?? DEFAULT_TELEGRAM_CHANNEL_CONFIG.enabled,
        botToken: raw?.channels?.telegram?.botToken ?? DEFAULT_TELEGRAM_CHANNEL_CONFIG.botToken,
        pollIntervalMs:
          raw?.channels?.telegram?.pollIntervalMs ?? DEFAULT_TELEGRAM_CHANNEL_CONFIG.pollIntervalMs,
        accessMode: raw?.channels?.telegram?.accessMode ?? DEFAULT_TELEGRAM_CHANNEL_CONFIG.accessMode,
        allowedChatIds: dedupeStrings(
          raw?.channels?.telegram?.allowedChatIds ?? DEFAULT_TELEGRAM_CHANNEL_CONFIG.allowedChatIds
        ),
      },
    },
  };

  if (!Number.isFinite(merged.channels.telegram.pollIntervalMs) || merged.channels.telegram.pollIntervalMs < 1000) {
    merged.channels.telegram.pollIntervalMs = DEFAULT_TELEGRAM_CHANNEL_CONFIG.pollIntervalMs;
  }

  return merged;
}

export function mergeConfig(current: ClawdBotConfig, incoming: ConfigUpdate): ClawdBotConfig {
  const currentConfig = normalizeConfig(current);
  const nextTelegram = incoming.channels?.telegram;
  const clearApiKey = incoming.ai?.clearApiKey === true;
  const clearBotToken = nextTelegram?.clearBotToken === true;
  const nextProvider = incoming.ai?.provider ?? currentConfig.ai.provider;
  const providerChanged = nextProvider !== currentConfig.ai.provider;
  const providerDefaults = PROVIDER_DEFAULTS[nextProvider];

  return normalizeConfig({
    ai: {
      provider: nextProvider,
      apiKey:
        clearApiKey
          ? ''
          : incoming.ai?.apiKey && incoming.ai.apiKey !== '***'
            ? incoming.ai.apiKey
            : currentConfig.ai.apiKey,
      model:
        incoming.ai?.model ??
        (providerChanged ? providerDefaults.model : currentConfig.ai.model),
      baseUrl:
        incoming.ai?.baseUrl ??
        (providerChanged ? providerDefaults.baseUrl : currentConfig.ai.baseUrl),
    },
    gateway: {
      port: incoming.gateway?.port ?? currentConfig.gateway.port,
      wsPort: incoming.gateway?.wsPort ?? currentConfig.gateway.wsPort,
    },
    features: {
      browserAutomation: incoming.features?.browserAutomation ?? currentConfig.features.browserAutomation,
      desktopAutomation: incoming.features?.desktopAutomation ?? currentConfig.features.desktopAutomation,
      aiChat: incoming.features?.aiChat ?? currentConfig.features.aiChat,
    },
    channels: {
      telegram: {
        enabled: nextTelegram?.enabled ?? currentConfig.channels.telegram.enabled,
        botToken:
          clearBotToken
            ? ''
            : nextTelegram?.botToken && nextTelegram.botToken !== '***'
              ? nextTelegram.botToken
              : currentConfig.channels.telegram.botToken,
        pollIntervalMs: nextTelegram?.pollIntervalMs ?? currentConfig.channels.telegram.pollIntervalMs,
        accessMode: nextTelegram?.accessMode ?? currentConfig.channels.telegram.accessMode,
        allowedChatIds: nextTelegram?.allowedChatIds ?? currentConfig.channels.telegram.allowedChatIds,
      },
    },
  });
}

export function redactConfig(config: ClawdBotConfig): ClawdBotConfig {
  const normalized = normalizeConfig(config);
  return {
    ...normalized,
    ai: {
      ...normalized.ai,
      apiKey: normalized.ai.apiKey ? '***' : '',
    },
    channels: {
      telegram: {
        ...normalized.channels.telegram,
        botToken: normalized.channels.telegram.botToken ? '***' : '',
      },
    },
  };
}

export function getGatewayUrls(config: ClawdBotConfig): GatewayUrls {
  const normalized = normalizeConfig(config);
  const baseUrl = `http://127.0.0.1:${normalized.gateway.port}`;
  return {
    baseUrl,
    healthUrl: `${baseUrl}/health`,
    wsUrl: `ws://127.0.0.1:${normalized.gateway.wsPort}`,
  };
}
