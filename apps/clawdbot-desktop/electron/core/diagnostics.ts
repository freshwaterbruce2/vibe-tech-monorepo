import * as fs from 'fs';
import * as si from 'systeminformation';
import { chromium } from 'playwright';
import {
  ActivityLevel,
  AgentState,
  ClawdBotConfig,
  DiagnosticResult,
  HealthPayload,
  TelegramChannelStatus,
} from './types';
import { getGatewayUrls } from './config';

interface DiagnosticContext {
  hasWebSocketServer: boolean;
  agentState: AgentState;
  agentMessage: string;
  telegramStatus: TelegramChannelStatus;
}

function createResult(
  ready: boolean,
  level: ActivityLevel,
  summary: string,
  detail: string
): DiagnosticResult {
  return { ready, level, summary, detail };
}

async function diagnoseBrowser(config: ClawdBotConfig): Promise<DiagnosticResult> {
  if (!config.features.browserAutomation) {
    return createResult(false, 'warn', 'Browser automation disabled', 'Enable browser automation in configuration.');
  }

  try {
    const executablePath = chromium.executablePath();
    const exists = executablePath ? fs.existsSync(executablePath) : false;
    return createResult(
      exists,
      exists ? 'info' : 'error',
      exists ? 'Playwright browser available' : 'Playwright browser missing',
      exists ? executablePath : 'Run `npx playwright install chromium` to install the browser runtime.'
    );
  } catch (error) {
    return createResult(
      false,
      'error',
      'Playwright diagnostic failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function diagnoseDesktop(config: ClawdBotConfig): Promise<DiagnosticResult> {
  if (!config.features.desktopAutomation) {
    return createResult(false, 'warn', 'Desktop automation disabled', 'Enable desktop automation in configuration.');
  }

  try {
    const graphics = await si.graphics();
    const displayCount = graphics.displays.length;
    return createResult(
      displayCount > 0,
      displayCount > 0 ? 'info' : 'error',
      displayCount > 0 ? 'Desktop automation available' : 'No displays detected',
      displayCount > 0 ? `${displayCount} display(s) detected.` : 'Desktop automation requires at least one active display.'
    );
  } catch (error) {
    return createResult(
      false,
      'error',
      'Desktop diagnostic failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

function diagnoseGateway(config: ClawdBotConfig): DiagnosticResult {
  const gateway = getGatewayUrls(config);
  return createResult(true, 'info', 'Gateway online', `HTTP server target ${gateway.baseUrl}`);
}

function diagnoseWebSocket(config: ClawdBotConfig, hasWebSocketServer: boolean): DiagnosticResult {
  const gateway = getGatewayUrls(config);
  return hasWebSocketServer
    ? createResult(true, 'info', 'WebSocket bridge online', `WebSocket endpoint ${gateway.wsUrl}`)
    : createResult(false, 'error', 'WebSocket bridge offline', `WebSocket server is not active for ${gateway.wsUrl}`);
}

function diagnoseAi(config: ClawdBotConfig, agentState: AgentState, agentMessage: string): DiagnosticResult {
  if (!config.ai.apiKey) {
    return createResult(false, 'warn', 'AI provider not configured', 'Save an API key to initialize the agent.');
  }

  const providerLabel = `${config.ai.provider} / ${config.ai.model}`;
  const providerDetail = config.ai.baseUrl ? `${providerLabel} via ${config.ai.baseUrl}` : providerLabel;

  if (agentState === 'initialized') {
    return createResult(true, 'info', 'AI agent initialized', `${agentMessage} (${providerDetail})`);
  }

  return createResult(false, 'error', 'AI agent unavailable', `${agentMessage} (${providerDetail})`);
}

function diagnoseTelegram(telegramStatus: TelegramChannelStatus): DiagnosticResult {
  if (!telegramStatus.enabled) {
    return createResult(false, 'warn', 'Telegram disabled', 'Enable Telegram to start polling for inbound messages.');
  }

  if (telegramStatus.state === 'connected') {
    return createResult(true, 'info', 'Telegram connected', telegramStatus.detail);
  }

  if (telegramStatus.state === 'connecting') {
    return createResult(false, 'warn', 'Telegram connecting', telegramStatus.detail);
  }

  return createResult(false, 'error', 'Telegram unavailable', telegramStatus.detail);
}

export async function buildDiagnostics(
  config: ClawdBotConfig,
  context: DiagnosticContext
): Promise<HealthPayload['diagnostics']> {
  const [browser, desktop] = await Promise.all([diagnoseBrowser(config), diagnoseDesktop(config)]);

  return {
    gateway: diagnoseGateway(config),
    websocket: diagnoseWebSocket(config, context.hasWebSocketServer),
    ai: diagnoseAi(config, context.agentState, context.agentMessage),
    browser,
    desktop,
    telegram: diagnoseTelegram(context.telegramStatus),
  };
}
