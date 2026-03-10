import { describe, expect, it } from 'vitest';

import {
  applyHealthToElements,
  buildLogMarkup,
  collectConfigPayload,
  parseAllowedChatIds,
} from './controller.js';

function createValueElement() {
  return {
    textContent: '',
    className: '',
    dataset: {},
    value: '',
    checked: false,
  };
}

describe('renderer controller helpers', () => {
  it('parses allowed chat ids from textarea content', () => {
    expect(parseAllowedChatIds('123\n456\n123,789')).toEqual(['123', '456', '789']);
  });

  it('collects nested config payload from form elements', () => {
    const elements = {
      providerSelect: { value: 'moonshot' },
      modelInput: { value: 'kimi-k2-0711-preview' },
      baseUrlInput: { value: 'https://api.moonshot.ai/v1' },
      apiKey: { value: 'new-api-key' },
      featureBrowser: { checked: true },
      featureDesktop: { checked: false },
      featureChat: { checked: true },
      telegramEnabled: { checked: true },
      telegramBotToken: { value: 'telegram-token' },
      telegramPollInterval: { value: '4500' },
      telegramAccessMode: { value: 'allowlist' },
      telegramAllowedChatIds: { value: '100\n200' },
    };

    expect(collectConfigPayload(elements)).toEqual({
      ai: {
        provider: 'moonshot',
        model: 'kimi-k2-0711-preview',
        baseUrl: 'https://api.moonshot.ai/v1',
        apiKey: 'new-api-key',
      },
      features: {
        browserAutomation: true,
        desktopAutomation: false,
        aiChat: true,
      },
      channels: {
        telegram: {
          enabled: true,
          botToken: 'telegram-token',
          pollIntervalMs: 4500,
          accessMode: 'allowlist',
          allowedChatIds: ['100', '200'],
        },
      },
    });
  });

  it('applies health payload data to the control surface elements', () => {
    const elements = {
      gatewayStatus: createValueElement(),
      gatewayDetail: createValueElement(),
      wsStatus: createValueElement(),
      wsDetail: createValueElement(),
      agentStatus: createValueElement(),
      agentDetail: createValueElement(),
      providerStatus: createValueElement(),
      providerDetail: createValueElement(),
      telegramStatus: createValueElement(),
      telegramDetail: createValueElement(),
      telegramMeta: createValueElement(),
      telegramActivity: createValueElement(),
      browserDiagnosticStatus: createValueElement(),
      browserDiagnosticDetail: createValueElement(),
      desktopDiagnosticStatus: createValueElement(),
      desktopDiagnosticDetail: createValueElement(),
      aiDiagnostic: createValueElement(),
      healthEndpoint: createValueElement(),
      wsEndpoint: createValueElement(),
      gatewayEndpoint: createValueElement(),
      healthChip: createValueElement(),
      configChip: createValueElement(),
      telegramChip: createValueElement(),
    };
    const state = {
      gatewayBaseUrl: 'http://127.0.0.1:18789',
      healthUrl: 'http://127.0.0.1:18789/health',
      wsUrl: 'ws://127.0.0.1:18790',
    };

    const nextState = applyHealthToElements(
      elements,
      {
        status: 'ok',
        agentState: 'initialized',
        agentMessage: 'AI agent initialized',
        provider: 'moonshot',
        apiKeyConfigured: true,
        model: 'kimi-k2-0711-preview',
        baseUrl: 'https://api.moonshot.ai/v1',
        gateway: {
          baseUrl: 'http://127.0.0.1:19000',
          healthUrl: 'http://127.0.0.1:19000/health',
          wsUrl: 'ws://127.0.0.1:19001',
        },
        channels: {
          telegram: {
            enabled: true,
            state: 'connected',
            summary: 'Telegram connected',
            detail: 'Polling as @clawdbot_test',
            botUsername: 'clawdbot_test',
            botId: '42',
            accessMode: 'open',
            allowedChatIds: [],
            lastInboundAt: null,
            lastOutboundAt: '2026-03-06T12:00:00.000Z',
            lastChatId: '123',
            lastError: null,
          },
        },
        diagnostics: {
          websocket: {
            ready: true,
            level: 'info',
            summary: 'WebSocket bridge online',
            detail: 'ws://127.0.0.1:19001',
          },
          browser: {
            ready: true,
            level: 'info',
            summary: 'Playwright browser available',
            detail: 'Chromium installed',
          },
          desktop: {
            ready: true,
            level: 'info',
            summary: 'Desktop automation available',
            detail: '1 display detected',
          },
          ai: {
            ready: true,
            level: 'info',
            summary: 'AI agent initialized',
            detail: 'Ready',
          },
        },
      },
      state
    );

    expect(nextState.gatewayBaseUrl).toBe('http://127.0.0.1:19000');
    expect(elements.gatewayStatus.textContent).toBe('Gateway online');
    expect(elements.wsStatus.textContent).toBe('WebSocket bridge online');
    expect(elements.telegramStatus.textContent).toBe('Telegram connected');
    expect(elements.telegramMeta.textContent).toBe('Bot @clawdbot_test');
    expect(elements.telegramChip.textContent).toBe('Telegram: connected');
    expect(elements.providerDetail.textContent).toContain('kimi-k2-0711-preview');
    expect(elements.providerDetail.textContent).toContain('https://api.moonshot.ai/v1');
    expect(elements.browserDiagnosticStatus.textContent).toBe('Playwright browser available');
  });

  it('renders event log markup with escaped content', () => {
    const markup = buildLogMarkup([
      {
        time: '10:00:00',
        level: 'info',
        event: 'task_started',
        message: '<unsafe>',
        data: { task: 'demo' },
      },
    ]);

    expect(markup).toContain('&lt;unsafe&gt;');
    expect(markup).toContain('task_started');
    expect(markup).toContain('demo');
  });
});
