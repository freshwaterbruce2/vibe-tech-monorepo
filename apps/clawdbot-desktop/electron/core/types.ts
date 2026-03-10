export type AiProvider = 'anthropic' | 'openai' | 'moonshot';
export type AgentState = 'initialized' | 'not_configured' | 'error';
export type ActivityLevel = 'info' | 'warn' | 'error';
export type AccessMode = 'open' | 'allowlist';
export type TelegramChannelState = 'disabled' | 'connecting' | 'connected' | 'error';

export interface GatewayUrls {
  baseUrl: string;
  healthUrl: string;
  wsUrl: string;
}

export interface DiagnosticResult {
  ready: boolean;
  level: ActivityLevel;
  summary: string;
  detail: string;
}

export interface TelegramChannelConfig {
  enabled: boolean;
  botToken: string;
  pollIntervalMs: number;
  accessMode: AccessMode;
  allowedChatIds: string[];
}

export interface ChannelConfig {
  telegram: TelegramChannelConfig;
}

export interface ClawdBotConfig {
  ai: {
    provider: AiProvider;
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  gateway: {
    port: number;
    wsPort: number;
  };
  features: {
    browserAutomation: boolean;
    desktopAutomation: boolean;
    aiChat: boolean;
  };
  channels: ChannelConfig;
}

export type ConfigUpdate = Partial<Omit<ClawdBotConfig, 'ai' | 'channels'>> & {
  ai?: Partial<ClawdBotConfig['ai']> & { clearApiKey?: boolean };
  channels?: {
    telegram?: Partial<TelegramChannelConfig> & { clearBotToken?: boolean };
  };
};

export interface TelegramChannelStatus {
  enabled: boolean;
  state: TelegramChannelState;
  summary: string;
  detail: string;
  botUsername: string | null;
  botId: string | null;
  accessMode: AccessMode;
  allowedChatIds: string[];
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  lastChatId: string | null;
  lastError: string | null;
}

export interface HealthPayload {
  status: 'ok';
  agent: string;
  agentState: AgentState;
  agentMessage: string;
  provider: AiProvider;
  apiKeyConfigured: boolean;
  model: string;
  baseUrl: string;
  gateway: GatewayUrls;
  features: ClawdBotConfig['features'];
  channels: {
    telegram: TelegramChannelStatus;
  };
  diagnostics: {
    gateway: DiagnosticResult;
    websocket: DiagnosticResult;
    ai: DiagnosticResult;
    browser: DiagnosticResult;
    desktop: DiagnosticResult;
    telegram: DiagnosticResult;
  };
}
