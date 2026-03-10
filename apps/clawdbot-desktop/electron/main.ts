import cors from 'cors';
import {
  BrowserWindow,
  Menu,
  Tray,
  app,
  ipcMain,
  nativeImage,
  shell,
} from 'electron';
import express, { Request, Response } from 'express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { WebSocket, WebSocketServer } from 'ws';

import {
  AgentState,
  ClawdBotConfig,
  ConfigUpdate,
  HealthPayload,
  TelegramChannelStatus,
} from './core/types';
import {
  DEFAULT_CONFIG,
  getGatewayUrls,
  mergeConfig,
  normalizeConfig,
  redactConfig,
} from './core/config';
import { buildDiagnostics } from './core/diagnostics';
import { ManusAgent } from './capabilities/ai-integration';
import { SessionManager } from './sessions/session-manager';
import { TelegramChannel, TelegramInboundMessage } from './channels/telegram';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let manusAgent: ManusAgent | null = null;
let wsServer: WebSocketServer | null = null;
let lastAgentError: string | null = null;
let currentAgentState: AgentState = 'not_configured';
let currentConfig = normalizeConfig(DEFAULT_CONFIG);
let telegramChannel: TelegramChannel | null = null;

const sessionManager = new SessionManager();

const CONFIG_DIR = path.join(os.homedir(), '.clawdbot');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const USER_DATA_DIR = path.join(CONFIG_DIR, 'browser-profile');

type ActivityLevel = 'info' | 'warn' | 'error';

interface ActivityEnvelope {
  type: 'activity';
  event: string;
  level: ActivityLevel;
  message: string;
  data?: unknown;
  timestamp: string;
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }
}

function loadConfig(): ClawdBotConfig {
  ensureConfigDir();

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      currentConfig = normalizeConfig(JSON.parse(data) as Partial<ClawdBotConfig>);
      return currentConfig;
    } catch (error) {
      console.error('[Config] Failed to load config:', error);
    }
  }

  currentConfig = normalizeConfig(DEFAULT_CONFIG);
  return currentConfig;
}

function saveConfig(config: ClawdBotConfig): void {
  ensureConfigDir();
  currentConfig = normalizeConfig(config);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2));
  console.log('[Config] Configuration saved');
}

function getCurrentConfig(): ClawdBotConfig {
  return loadConfig();
}

function createActivityEnvelope(
  event: string,
  message: string,
  level: ActivityLevel = 'info',
  data?: unknown
): ActivityEnvelope {
  return {
    type: 'activity',
    event,
    level,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

function broadcastActivity(
  event: string,
  message: string,
  level: ActivityLevel = 'info',
  data?: unknown
): void {
  if (!wsServer) {
    return;
  }

  const payload = JSON.stringify(createActivityEnvelope(event, message, level, data));
  for (const client of wsServer.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function getTelegramStatus(config: ClawdBotConfig): TelegramChannelStatus {
  if (telegramChannel) {
    return telegramChannel.getStatus();
  }

  const telegram = config.channels.telegram;
  if (!telegram.enabled) {
    return {
      enabled: false,
      state: 'disabled',
      summary: 'Telegram disabled',
      detail: 'Enable Telegram and save a bot token to start polling.',
      botUsername: null,
      botId: null,
      accessMode: telegram.accessMode,
      allowedChatIds: [...telegram.allowedChatIds],
      lastInboundAt: null,
      lastOutboundAt: null,
      lastChatId: null,
      lastError: null,
    };
  }

  if (!telegram.botToken) {
    return {
      enabled: true,
      state: 'error',
      summary: 'Telegram token missing',
      detail: 'Save a Telegram bot token before enabling the channel.',
      botUsername: null,
      botId: null,
      accessMode: telegram.accessMode,
      allowedChatIds: [...telegram.allowedChatIds],
      lastInboundAt: null,
      lastOutboundAt: null,
      lastChatId: null,
      lastError: 'Bot token missing',
    };
  }

  return {
    enabled: true,
    state: 'connecting',
    summary: 'Telegram pending initialization',
    detail: 'Telegram will connect when the runtime finishes starting.',
    botUsername: null,
    botId: null,
    accessMode: telegram.accessMode,
    allowedChatIds: [...telegram.allowedChatIds],
    lastInboundAt: null,
    lastOutboundAt: null,
    lastChatId: null,
    lastError: null,
  };
}

async function getHealthPayload(config = getCurrentConfig()): Promise<HealthPayload> {
  const gateway = getGatewayUrls(config);
  const agentState = manusAgent ? 'initialized' : currentAgentState;
  const agentMessage = manusAgent
    ? 'AI agent initialized'
    : lastAgentError ?? (config.ai.apiKey ? 'AI agent unavailable' : 'No API key configured');
  const telegramStatus = getTelegramStatus(config);

  return {
    status: 'ok',
    agent: manusAgent ? 'initialized' : 'not initialized',
    agentState,
    agentMessage,
    provider: config.ai.provider,
    apiKeyConfigured: Boolean(config.ai.apiKey),
    model: config.ai.model,
    baseUrl: config.ai.baseUrl,
    gateway,
    features: config.features,
    channels: {
      telegram: telegramStatus,
    },
    diagnostics: await buildDiagnostics(config, {
      hasWebSocketServer: Boolean(wsServer),
      agentState,
      agentMessage,
      telegramStatus,
    }),
  };
}

async function disposeManusAgent(): Promise<void> {
  if (!manusAgent) {
    return;
  }

  try {
    await manusAgent.cleanup();
  } catch (error) {
    console.error('[ManusAgent] Cleanup failed:', error);
  } finally {
    manusAgent = null;
  }
}

async function initializeManusAgent(
  config = getCurrentConfig()
): Promise<{ initialized: boolean; message: string }> {
  let nextAgent: ManusAgent | null = null;

  sessionManager.clear();
  await disposeManusAgent();
  lastAgentError = null;
  currentAgentState = 'not_configured';

  broadcastActivity('agent_initializing', 'Initializing AI agent', 'info', {
    provider: config.ai.provider,
    model: config.ai.model,
    baseUrl: config.ai.baseUrl,
    browserAutomation: config.features.browserAutomation,
    desktopAutomation: config.features.desktopAutomation,
  });

  if (!config.ai.apiKey) {
    currentAgentState = 'not_configured';
    const message = 'No API key configured';
    console.warn('[ManusAgent] No API key configured. AI features disabled.');
    broadcastActivity('agent_disabled', 'AI features disabled because no API key is configured', 'warn');
    return { initialized: false, message };
  }

  try {
    nextAgent = new ManusAgent(
      config.ai.apiKey,
      config.ai.provider,
      config.ai.model,
      config.ai.baseUrl,
      USER_DATA_DIR,
      broadcastActivity
    );
    if (config.features.browserAutomation) {
      await nextAgent.initBrowser();
    }

    manusAgent = nextAgent;
    currentAgentState = 'initialized';

    console.log('[ManusAgent] Initialized successfully');
    console.log(`[ManusAgent] Provider: ${config.ai.provider}`);
    broadcastActivity('agent_initialized', 'AI agent initialized', 'info', {
      provider: config.ai.provider,
      model: config.ai.model,
      baseUrl: config.ai.baseUrl,
    });

    return { initialized: true, message: 'AI agent initialized' };
  } catch (error) {
    lastAgentError = error instanceof Error ? error.message : String(error);
    currentAgentState = 'error';
    console.error('[ManusAgent] Initialization failed:', error);

    if (nextAgent) {
      await nextAgent.cleanup().catch(() => undefined);
    }

    broadcastActivity('agent_init_failed', 'AI agent initialization failed', 'error', {
      provider: config.ai.provider,
      model: config.ai.model,
      baseUrl: config.ai.baseUrl,
      error: lastAgentError,
    });

    return { initialized: false, message: lastAgentError };
  }
}

function formatHealthSummary(health: HealthPayload): string {
  return [
    `Gateway: ${health.status}`,
    `Agent: ${health.agentState} (${health.agentMessage})`,
    `Provider: ${health.provider} (${health.model})`,
    `WebSocket: ${health.diagnostics.websocket.summary}`,
    `Telegram: ${health.channels.telegram.summary}`,
  ].join('\n');
}

function summarizeTaskResult(result: { plan: string[]; results: string[] }): string {
  const planSummary = result.plan.map((step, index) => `${index + 1}. ${step}`).join('\n');
  const outputSummary = result.results
    .slice(0, 3)
    .map((entry, index) => `Result ${index + 1}: ${entry}`)
    .join('\n\n');

  return [
    `Completed ${result.plan.length} plan step(s).`,
    planSummary || 'No plan steps returned.',
    outputSummary || 'No execution output returned.',
  ].join('\n\n');
}

async function handleSessionChat(sessionId: string, message: string): Promise<string> {
  if (!manusAgent) {
    throw new Error(lastAgentError ?? 'ManusAgent not initialized');
  }

  return sessionManager.withSession(sessionId, manusAgent, async () => manusAgent!.chat(message));
}

async function handleSessionTask(
  sessionId: string,
  task: string
): Promise<{ plan: string[]; results: string[] }> {
  if (!manusAgent) {
    throw new Error(lastAgentError ?? 'ManusAgent not initialized');
  }

  return sessionManager.withSession(sessionId, manusAgent, async () => manusAgent!.execute(task));
}

async function routeTelegramMessage(message: TelegramInboundMessage): Promise<string | null> {
  const input = message.text.trim();
  const sessionId = `telegram:${message.chatId}`;

  if (input === '/start') {
    return [
      'ClawdBot Desktop is connected.',
      'Send any message to chat with the local agent.',
      'Use /task <instruction> for autonomous execution.',
      'Use /status for a runtime summary.',
    ].join('\n');
  }

  if (input === '/status') {
    return formatHealthSummary(await getHealthPayload());
  }

  if (input === '/task' || input === '/task@ClawdBot') {
    return 'Usage: /task <instruction>';
  }

  if (input.startsWith('/task ')) {
    if (!manusAgent) {
      return `AI agent unavailable: ${lastAgentError ?? 'No API key configured.'}`;
    }

    const task = input.slice('/task '.length).trim();
    if (!task) {
      return 'Usage: /task <instruction>';
    }

    try {
      const result = await handleSessionTask(sessionId, task);
      return summarizeTaskResult(result);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      return `Task failed: ${messageText}`;
    }
  }

  const prompt = input.startsWith('/chat ') ? input.slice('/chat '.length).trim() : input;
  if (!prompt) {
    return 'Send a message or use /task <instruction>.';
  }

  if (!manusAgent) {
    return `AI agent unavailable: ${lastAgentError ?? 'No API key configured.'}`;
  }

  try {
    return await handleSessionChat(sessionId, prompt);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    return `Chat failed: ${messageText}`;
  }
}

async function ensureTelegramChannel(config = getCurrentConfig()): Promise<void> {
  if (!telegramChannel) {
    telegramChannel = new TelegramChannel(config.channels.telegram, routeTelegramMessage, broadcastActivity);
  }

  await telegramChannel.reconfigure(config.channels.telegram);
  const status = telegramChannel.getStatus();
  broadcastActivity('telegram_status', status.summary, status.state === 'error' ? 'error' : 'info', status);
}

async function stopTelegramChannel(): Promise<void> {
  if (!telegramChannel) {
    return;
  }

  await telegramChannel.stop();
}

async function testTelegramConnectivity(configUpdate?: ConfigUpdate): Promise<TelegramChannelStatus> {
  const candidateConfig = configUpdate
    ? mergeConfig(getCurrentConfig(), configUpdate)
    : getCurrentConfig();
  const telegram = candidateConfig.channels.telegram;

  if (!telegram.botToken) {
    throw new Error('Telegram bot token is required for connectivity testing');
  }

  const probe = new TelegramChannel(telegram, async () => null, () => undefined);
  try {
    return await probe.testConnectivity();
  } finally {
    await probe.stop();
  }
}

function sendJson(res: Response, statusCode: number, body: unknown): void {
  res.status(statusCode).json(body);
}

function startApiServer(): void {
  const config = getCurrentConfig();
  const gateway = getGatewayUrls(config);
  const api = express();

  api.use(cors());
  api.use(express.json());
  api.use(express.static(path.join(__dirname, '../renderer')));

  api.get('/health', async (_req: Request, res: Response) => {
    sendJson(res, 200, await getHealthPayload());
  });

  api.get('/api/diagnostics', async (_req: Request, res: Response) => {
    const health = await getHealthPayload();
    sendJson(res, 200, health.diagnostics);
  });

  api.get('/api/config', (_req: Request, res: Response) => {
    sendJson(res, 200, redactConfig(getCurrentConfig()));
  });

  api.get('/api/telegram/status', (_req: Request, res: Response) => {
    sendJson(res, 200, getTelegramStatus(getCurrentConfig()));
  });

  api.post('/api/telegram/test', async (req: Request, res: Response) => {
    try {
      const status = await testTelegramConnectivity(req.body ?? {});
      sendJson(res, 200, status);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, 500, { error: message });
    }
  });

  api.post('/api/config', async (req: Request, res: Response) => {
    const updated = mergeConfig(getCurrentConfig(), req.body ?? {});
    saveConfig(updated);

    broadcastActivity('config_saved', 'Configuration saved', 'info', {
      provider: updated.ai.provider,
      model: updated.ai.model,
      baseUrl: updated.ai.baseUrl,
      apiKeyConfigured: Boolean(updated.ai.apiKey),
      features: updated.features,
      telegramEnabled: updated.channels.telegram.enabled,
    });

    if (!updated.ai.apiKey) {
      broadcastActivity('api_key_cleared', 'Stored API key cleared', 'warn');
    }

    if (!updated.channels.telegram.botToken && updated.channels.telegram.enabled) {
      broadcastActivity('telegram_token_missing', 'Telegram is enabled without a bot token', 'warn');
    }

    const result = await initializeManusAgent(updated);
    await ensureTelegramChannel(updated);

    sendJson(res, 200, {
      success: result.initialized || !updated.ai.apiKey,
      initialized: result.initialized,
      message: result.message,
      config: redactConfig(updated),
      health: await getHealthPayload(updated),
    });
  });

  api.post('/api/chat', async (req: Request, res: Response) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      return sendJson(res, 400, { error: 'Message is required' });
    }

    try {
      broadcastActivity('chat_started', `Chat requested: ${message}`, 'info');
      const response = await handleSessionChat('http:default', message);
      broadcastActivity('chat_completed', 'Chat response generated', 'info', {
        characters: response.length,
      });
      sendJson(res, 200, { response });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      broadcastActivity('chat_failed', 'Chat request failed', 'error', {
        error: messageText,
      });
      sendJson(res, 503, { error: messageText });
    }
  });

  api.post('/api/execute', async (req: Request, res: Response) => {
    const task = typeof req.body?.task === 'string' ? req.body.task.trim() : '';
    if (!task) {
      return sendJson(res, 400, { error: 'Task is required' });
    }

    try {
      broadcastActivity('task_started', `Task requested: ${task}`, 'info');
      const result = await handleSessionTask('http:default', task);
      broadcastActivity('task_completed', 'Task execution completed', 'info', {
        steps: result.plan.length,
      });
      sendJson(res, 200, result);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      broadcastActivity('task_failed', 'Task execution failed', 'error', {
        error: messageText,
      });
      sendJson(res, 503, { error: messageText });
    }
  });

  api.listen(config.gateway.port, () => {
    console.log(`[HTTP Server] Running on ${gateway.baseUrl}`);
  });

  wsServer = new WebSocketServer({ port: config.gateway.wsPort });

  wsServer.on('connection', (ws) => {
    console.log('[WebSocket] Client connected');
    broadcastActivity('ws_client_connected', 'WebSocket client connected', 'info');
    ws.send(
      JSON.stringify({
        ...createActivityEnvelope('session_ready', 'Live event stream connected', 'info', {
          gateway,
        }),
      })
    );

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as {
          type?: string;
          content?: string;
          task?: string;
          sessionId?: string;
        };

        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (message.type === 'chat') {
          const response = await handleSessionChat(message.sessionId ?? 'ws:default', message.content ?? '');
          ws.send(JSON.stringify({ type: 'chat_response', content: response }));
          return;
        }

        if (message.type === 'execute') {
          const result = await handleSessionTask(message.sessionId ?? 'ws:default', message.task ?? '');
          ws.send(JSON.stringify({ type: 'execution_result', result }));
        }
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        broadcastActivity('ws_error', 'WebSocket request failed', 'error', {
          error: messageText,
        });
        ws.send(JSON.stringify({ type: 'error', error: messageText }));
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
      broadcastActivity('ws_client_disconnected', 'WebSocket client disconnected', 'info');
    });
  });

  console.log(`[WebSocket Server] Running on ${gateway.wsUrl}`);
}

function registerIpcHandlers(): void {
  ipcMain.handle('manus:execute', async (_event, task: string) => {
    return handleSessionTask('ipc:default', task);
  });

  ipcMain.handle('manus:chat', async (_event, message: string) => {
    return handleSessionChat('ipc:default', message);
  });

  ipcMain.handle('config:get', async () => {
    return redactConfig(getCurrentConfig());
  });

  ipcMain.handle('config:set', async (_event, newConfig: ConfigUpdate) => {
    const updated = mergeConfig(getCurrentConfig(), newConfig);
    saveConfig(updated);
    const result = await initializeManusAgent(updated);
    await ensureTelegramChannel(updated);
    return {
      success: result.initialized || !updated.ai.apiKey,
      initialized: result.initialized,
      message: result.message,
      config: redactConfig(updated),
      health: await getHealthPayload(updated),
    };
  });

  ipcMain.handle('config:set-api-key', async () => {
    mainWindow?.show();
    mainWindow?.focus();
    mainWindow?.webContents.send('show-config');
  });

  ipcMain.handle('diagnostics:get', async () => {
    return (await getHealthPayload()).diagnostics;
  });

  ipcMain.handle('telegram:status', async () => {
    return getTelegramStatus(getCurrentConfig());
  });

  ipcMain.handle('telegram:test', async (_event, update?: ConfigUpdate) => {
    return testTelegramConnectivity(update);
  });

  console.log('[IPC] Handlers registered');
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 640,
    title: 'ClawdBot Desktop',
    backgroundColor: '#08111F',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  const url = getGatewayUrls(getCurrentConfig()).baseUrl;
  console.log('[Window] Loading UI:', url);

  mainWindow.loadURL(url).catch(() => {
    mainWindow?.loadFile(path.join(__dirname, '../renderer/index.html'));
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (!(app as Electron.App & { isQuitting?: boolean }).isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray(): void {
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKklEQVQ4T2NkYGD4z0ABYBw1gGE0DAYFMAx4M1CMB6MgGBXAYAgDSvMAACzFBBHKGLQYAAAAAElFTkSuQmCC',
      'base64'
    )
  );

  tray = new Tray(icon);
  tray.setToolTip('ClawdBot Desktop');

  const config = getCurrentConfig();
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show ClawdBot', click: () => mainWindow?.show() },
    { label: 'Configure API Key', click: () => mainWindow?.webContents.send('show-config') },
    { type: 'separator' },
    {
      label: 'Features',
      submenu: [
        { label: 'Browser Automation', type: 'checkbox', checked: config.features.browserAutomation, enabled: false },
        { label: 'Desktop Control', type: 'checkbox', checked: config.features.desktopAutomation, enabled: false },
        { label: 'AI Chat', type: 'checkbox', checked: config.features.aiChat, enabled: false },
        { label: 'Telegram', type: 'checkbox', checked: config.channels.telegram.enabled, enabled: false },
      ],
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        (app as Electron.App & { isQuitting?: boolean }).isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow?.show());
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    console.log('='.repeat(60));
    console.log('ClawdBot Desktop');
    console.log('Local gateway, native desktop control, and Telegram-ready runtime');
    console.log('='.repeat(60));

    ensureConfigDir();
    currentConfig = loadConfig();
    registerIpcHandlers();
    startApiServer();
    await initializeManusAgent(currentConfig);
    await ensureTelegramChannel(currentConfig);
    createWindow();
    createTray();

    console.log('[App] Initialization complete');
    console.log('='.repeat(60));
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  console.log('[App] Shutting down...');
  await stopTelegramChannel();
  await disposeManusAgent();
  wsServer?.close();
});
