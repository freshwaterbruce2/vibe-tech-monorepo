const PROVIDER_DEFAULTS = {
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

export function parseAllowedChatIds(value) {
  return Array.from(
    new Set(
      String(value ?? '')
        .split(/[,\n]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function buildLogMarkup(entries) {
  if (!entries.length) {
    return 'No activity yet.';
  }

  return entries
    .map((entry) => {
      const meta = `[${entry.time}] ${entry.level.toUpperCase()} ${entry.event}`;
      const dataBlock = entry.data
        ? `<div class="log-data">${escapeHtml(JSON.stringify(entry.data, null, 2))}</div>`
        : '';

      return `
        <div class="log-entry">
          <div class="log-meta">${escapeHtml(meta)}</div>
          <div class="log-message">${escapeHtml(entry.message)}</div>
          ${dataBlock}
        </div>
      `;
    })
    .join('');
}

export function collectConfigPayload(elements) {
  const provider = elements.providerSelect?.value ?? 'anthropic';
  const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.anthropic;
  const ai = {
    provider,
    model: elements.modelInput?.value?.trim() || defaults.model,
    baseUrl: elements.baseUrlInput?.value?.trim() ?? defaults.baseUrl,
  };
  const apiKey = elements.apiKey?.value?.trim();
  if (apiKey) {
    ai.apiKey = apiKey;
  }

  const telegram = {
    enabled: Boolean(elements.telegramEnabled?.checked),
    pollIntervalMs: Number(elements.telegramPollInterval?.value || 3000),
    accessMode: elements.telegramAccessMode?.value ?? 'open',
    allowedChatIds: parseAllowedChatIds(elements.telegramAllowedChatIds?.value),
  };
  const botToken = elements.telegramBotToken?.value?.trim();
  if (botToken) {
    telegram.botToken = botToken;
  }

  return {
    ai,
    features: {
      browserAutomation: Boolean(elements.featureBrowser?.checked),
      desktopAutomation: Boolean(elements.featureDesktop?.checked),
      aiChat: Boolean(elements.featureChat?.checked),
    },
    channels: {
      telegram,
    },
  };
}

function setTone(element, text, tone = 'muted') {
  const target = element;
  if (!target) {
    return;
  }

  target.textContent = text;
  target.className = `value tone-${tone}`;
}

function setText(element, text) {
  const target = element;
  if (target) {
    target.textContent = text;
  }
}

function setBadge(element, text) {
  const target = element;
  if (target) {
    target.textContent = text;
  }
}

function setBanner(element, text, tone = 'warn') {
  const target = element;
  if (!target) {
    return;
  }

  target.textContent = text;
  target.dataset.tone = tone;
}

function summarizeDiagnostics(diagnostic) {
  if (!diagnostic) {
    return { tone: 'muted', summary: 'Unknown', detail: 'No diagnostic data available.' };
  }

  const tone = diagnostic.level === 'error' ? 'error' : diagnostic.level === 'warn' ? 'warn' : 'ok';
  return {
    tone,
    summary: diagnostic.summary,
    detail: diagnostic.detail,
  };
}

export function applyHealthToElements(elements, payload, state) {
  const gateway = payload?.gateway ?? {};
  const nextState = {
    ...state,
    gatewayBaseUrl: gateway.baseUrl ?? state.gatewayBaseUrl,
    healthUrl: gateway.healthUrl ?? `${gateway.baseUrl ?? state.gatewayBaseUrl}/health`,
    wsUrl: gateway.wsUrl ?? state.wsUrl,
  };

  setText(elements.gatewayEndpoint, nextState.gatewayBaseUrl);
  setText(elements.healthEndpoint, nextState.healthUrl);
  setText(elements.wsEndpoint, nextState.wsUrl);

  setTone(
    elements.gatewayStatus,
    payload?.status === 'ok' ? 'Gateway online' : `Unexpected: ${payload?.status ?? 'unknown'}`,
    payload?.status === 'ok' ? 'ok' : 'warn'
  );
  setText(elements.gatewayDetail, `Health endpoint responded from ${nextState.healthUrl}`);

  const agentState = payload?.agentState ?? 'not_configured';
  const agentTone = agentState === 'initialized' ? 'ok' : agentState === 'error' ? 'error' : 'warn';
  const agentLabel =
    agentState === 'initialized'
      ? 'AI agent initialized'
      : agentState === 'error'
        ? 'Agent initialization failed'
        : 'AI features disabled';
  setTone(elements.agentStatus, agentLabel, agentTone);
  setText(elements.agentDetail, payload?.agentMessage ?? 'No agent details available.');

  setTone(elements.providerStatus, payload?.provider ? payload.provider.toUpperCase() : 'Unknown', 'muted');
  const providerParts = [payload?.model || 'No model configured'];
  if (payload?.baseUrl) {
    providerParts.push(payload.baseUrl);
  }
  providerParts.push(payload?.apiKeyConfigured ? 'API key stored locally.' : 'No API key stored yet.');
  setText(elements.providerDetail, providerParts.join(' | '));

  const telegramStatus = payload?.channels?.telegram;
  const telegramTone =
    telegramStatus?.state === 'connected'
      ? 'ok'
      : telegramStatus?.state === 'error'
        ? 'error'
        : telegramStatus?.enabled
          ? 'warn'
          : 'muted';
  setTone(elements.telegramStatus, telegramStatus?.summary ?? 'Telegram unavailable', telegramTone);
  setText(elements.telegramDetail, telegramStatus?.detail ?? 'No Telegram status available.');
  setText(
    elements.telegramMeta,
    telegramStatus?.botUsername
      ? `Bot @${telegramStatus.botUsername}`
      : telegramStatus?.enabled
        ? 'Bot token configured'
        : 'Telegram disabled'
  );
  setText(
    elements.telegramActivity,
    telegramStatus?.lastInboundAt || telegramStatus?.lastOutboundAt
      ? `Last activity ${telegramStatus.lastOutboundAt || telegramStatus.lastInboundAt}`
      : 'No Telegram traffic recorded yet.'
  );

  const diagnostics = payload?.diagnostics ?? {};
  const browserDiagnostic = summarizeDiagnostics(diagnostics.browser);
  setTone(elements.browserDiagnosticStatus, browserDiagnostic.summary, browserDiagnostic.tone);
  setText(elements.browserDiagnosticDetail, browserDiagnostic.detail);

  const desktopDiagnostic = summarizeDiagnostics(diagnostics.desktop);
  setTone(elements.desktopDiagnosticStatus, desktopDiagnostic.summary, desktopDiagnostic.tone);
  setText(elements.desktopDiagnosticDetail, desktopDiagnostic.detail);

  const websocketDiagnostic = summarizeDiagnostics(diagnostics.websocket);
  setTone(elements.wsStatus, websocketDiagnostic.summary, websocketDiagnostic.tone);
  setText(elements.wsDetail, websocketDiagnostic.detail);

  const aiDiagnostic = summarizeDiagnostics(diagnostics.ai);
  setBadge(elements.healthChip, `Health: ${payload?.status === 'ok' ? 'online' : 'degraded'}`);
  setBadge(elements.configChip, payload?.apiKeyConfigured ? 'Config: key present' : 'Config: no key');
  setBadge(elements.telegramChip, telegramStatus?.enabled ? `Telegram: ${telegramStatus.state}` : 'Telegram: disabled');
  setText(elements.aiDiagnostic, `${aiDiagnostic.summary} - ${aiDiagnostic.detail}`);

  return nextState;
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function createElements(documentRef) {
  return {
    appMeta: documentRef.getElementById('app-meta'),
    healthChip: documentRef.getElementById('health-chip'),
    configChip: documentRef.getElementById('config-chip'),
    telegramChip: documentRef.getElementById('telegram-chip'),
    gatewayStatus: documentRef.getElementById('gateway-status'),
    gatewayDetail: documentRef.getElementById('gateway-detail'),
    wsStatus: documentRef.getElementById('ws-status'),
    wsDetail: documentRef.getElementById('ws-detail'),
    agentStatus: documentRef.getElementById('agent-status'),
    agentDetail: documentRef.getElementById('agent-detail'),
    providerStatus: documentRef.getElementById('provider-status'),
    providerDetail: documentRef.getElementById('provider-detail'),
    telegramStatus: documentRef.getElementById('telegram-status'),
    telegramDetail: documentRef.getElementById('telegram-detail'),
    telegramMeta: documentRef.getElementById('telegram-meta'),
    telegramActivity: documentRef.getElementById('telegram-activity'),
    browserDiagnosticStatus: documentRef.getElementById('browser-diagnostic-status'),
    browserDiagnosticDetail: documentRef.getElementById('browser-diagnostic-detail'),
    desktopDiagnosticStatus: documentRef.getElementById('desktop-diagnostic-status'),
    desktopDiagnosticDetail: documentRef.getElementById('desktop-diagnostic-detail'),
    aiDiagnostic: documentRef.getElementById('ai-diagnostic'),
    healthEndpoint: documentRef.getElementById('health-endpoint'),
    wsEndpoint: documentRef.getElementById('ws-endpoint'),
    gatewayEndpoint: documentRef.getElementById('gateway-endpoint'),
    configBanner: documentRef.getElementById('config-banner'),
    telegramBanner: documentRef.getElementById('telegram-banner'),
    configHint: documentRef.getElementById('config-hint'),
    telegramHint: documentRef.getElementById('telegram-hint'),
    providerSelect: documentRef.getElementById('provider-select'),
    modelInput: documentRef.getElementById('model-input'),
    baseUrlInput: documentRef.getElementById('base-url-input'),
    apiKey: documentRef.getElementById('api-key'),
    featureBrowser: documentRef.getElementById('feature-browser'),
    featureDesktop: documentRef.getElementById('feature-desktop'),
    featureChat: documentRef.getElementById('feature-chat'),
    telegramEnabled: documentRef.getElementById('telegram-enabled'),
    telegramBotToken: documentRef.getElementById('telegram-bot-token'),
    telegramPollInterval: documentRef.getElementById('telegram-poll-interval'),
    telegramAccessMode: documentRef.getElementById('telegram-access-mode'),
    telegramAllowedChatIds: documentRef.getElementById('telegram-allowed-chat-ids'),
    chatInput: documentRef.getElementById('chat-input'),
    taskInput: documentRef.getElementById('task-input'),
    chatOutput: documentRef.getElementById('chat-output'),
    taskOutput: documentRef.getElementById('task-output'),
    eventLog: documentRef.getElementById('event-log'),
  };
}

export function createAppController({
  windowRef = window,
  documentRef = document,
  bridge = window.clawdbotDesktop,
  fetchImpl = window.fetch.bind(window),
  WebSocketCtor = window.WebSocket,
} = {}) {
  const state = {
    gatewayBaseUrl:
      windowRef.location.protocol.startsWith('http') && windowRef.location.hostname
        ? windowRef.location.origin
        : 'http://127.0.0.1:18789',
    healthUrl: 'http://127.0.0.1:18789/health',
    wsUrl: 'ws://127.0.0.1:18790',
    eventSocket: null,
    logEntries: [],
    maxLogEntries: 150,
  };

  state.healthUrl = `${state.gatewayBaseUrl}/health`;
  const elements = createElements(documentRef);

  if (elements.appMeta) {
    const version = bridge?.version ?? 'web';
    const platform = bridge?.platform ?? windowRef.navigator.platform;
    elements.appMeta.textContent = `Host ${platform} - v${version}`;
  }

  function renderLog() {
    if (!elements.eventLog) {
      return;
    }

    const markup = buildLogMarkup(state.logEntries);
    if (markup === 'No activity yet.') {
      elements.eventLog.textContent = markup;
      return;
    }

    elements.eventLog.innerHTML = markup;
    elements.eventLog.scrollTop = elements.eventLog.scrollHeight;
  }

  function appendLog(event, message, level = 'info', data) {
    state.logEntries.push({
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      event,
      message,
      level,
      data,
    });

    if (state.logEntries.length > state.maxLogEntries) {
      state.logEntries.splice(0, state.logEntries.length - state.maxLogEntries);
    }

    renderLog();
  }

  function clearLog() {
    state.logEntries.length = 0;
    renderLog();
  }

  async function requestJson(path, options = {}) {
    const response = await fetchImpl(new URL(path, state.gatewayBaseUrl).toString(), {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...options,
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      throw new Error(body?.error || body?.message || `HTTP ${response.status}`);
    }

    return body;
  }

  function connectEventStream() {
    if (state.eventSocket) {
      state.eventSocket.close();
    }

    appendLog('event_stream_connecting', `Connecting to ${state.wsUrl}`, 'info');
    const socket = new WebSocketCtor(state.wsUrl);
    state.eventSocket = socket;

    socket.addEventListener('open', () => {
      appendLog('event_stream_connected', 'Live event stream connected', 'info');
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === 'activity') {
          appendLog(
            payload.event ?? 'activity',
            payload.message ?? 'Activity received',
            payload.level ?? 'info',
            payload.data
          );
        } else if (payload?.type === 'pong') {
          appendLog('ws_pong', 'Received pong from WebSocket bridge', 'info');
        }
      } catch (error) {
        appendLog('event_stream_parse_failed', formatError(error), 'error');
      }
    });

    socket.addEventListener('close', () => {
      appendLog('event_stream_closed', 'Live event stream closed', 'warn');
    });

    socket.addEventListener('error', () => {
      appendLog('event_stream_error', `Could not maintain event stream to ${state.wsUrl}`, 'error');
    });
  }

  async function probeWebSocket() {
    return await new Promise((resolve, reject) => {
      let finished = false;
      const socket = new WebSocketCtor(state.wsUrl);
      const timer = windowRef.setTimeout(() => {
        if (finished) {
          return;
        }

        finished = true;
        socket.close();
        reject(new Error('Timed out waiting for WebSocket pong'));
      }, 3500);

      function finalize(callback) {
        if (finished) {
          return;
        }

        finished = true;
        windowRef.clearTimeout(timer);
        callback();
      }

      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'ping' }));
      });

      socket.addEventListener('message', (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === 'pong') {
            finalize(() => {
              socket.close();
              resolve(payload);
            });
          }
        } catch (error) {
          finalize(() => {
            socket.close();
            reject(error);
          });
        }
      });

      socket.addEventListener('error', () => {
        finalize(() => {
          reject(new Error(`Could not connect to ${state.wsUrl}`));
        });
      });
    });
  }

  async function refreshHealth() {
    const payload = await requestJson('/health');
    Object.assign(state, applyHealthToElements(elements, payload, state));
    return payload;
  }

  function syncProviderDefaults(force = false) {
    const provider = elements.providerSelect?.value ?? 'anthropic';
    const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.anthropic;

    if (elements.modelInput && (force || !elements.modelInput.value.trim())) {
      elements.modelInput.value = defaults.model;
    }
    if (elements.baseUrlInput && (force || !elements.baseUrlInput.value.trim())) {
      elements.baseUrlInput.value = defaults.baseUrl;
    }
  }

  async function loadConfig() {
    const config = await requestJson('/api/config');

    if (elements.providerSelect) {
      elements.providerSelect.value = config?.ai?.provider ?? 'anthropic';
    }
    if (elements.modelInput) {
      elements.modelInput.value = config?.ai?.model ?? '';
    }
    if (elements.baseUrlInput) {
      elements.baseUrlInput.value = config?.ai?.baseUrl ?? '';
    }
    if (elements.featureBrowser) {
      elements.featureBrowser.checked = Boolean(config?.features?.browserAutomation);
    }
    if (elements.featureDesktop) {
      elements.featureDesktop.checked = Boolean(config?.features?.desktopAutomation);
    }
    if (elements.featureChat) {
      elements.featureChat.checked = Boolean(config?.features?.aiChat);
    }
    if (elements.telegramEnabled) {
      elements.telegramEnabled.checked = Boolean(config?.channels?.telegram?.enabled);
    }
    if (elements.telegramPollInterval) {
      elements.telegramPollInterval.value = String(config?.channels?.telegram?.pollIntervalMs ?? 3000);
    }
    if (elements.telegramAccessMode) {
      elements.telegramAccessMode.value = config?.channels?.telegram?.accessMode ?? 'open';
    }
    if (elements.telegramAllowedChatIds) {
      elements.telegramAllowedChatIds.value = (config?.channels?.telegram?.allowedChatIds ?? []).join('\n');
    }

    const apiKeyStored = Boolean(config?.ai?.apiKey);
    const botTokenStored = Boolean(config?.channels?.telegram?.botToken);

    if (elements.apiKey) {
      elements.apiKey.value = '';
      elements.apiKey.placeholder = apiKeyStored ? 'Leave blank to keep the stored key' : 'Paste API key';
    }
    if (elements.telegramBotToken) {
      elements.telegramBotToken.value = '';
      elements.telegramBotToken.placeholder = botTokenStored
        ? 'Leave blank to keep the stored Telegram token'
        : 'Paste Telegram bot token';
    }
    syncProviderDefaults();
    if (elements.configHint) {
      elements.configHint.textContent = apiKeyStored
        ? 'A key is already stored. Leave the field blank if you are not replacing it. Model and base URL are editable per provider.'
        : 'No key is stored yet. Enter one to initialize the agent. Model and base URL are editable per provider.';
    }
    if (elements.telegramHint) {
      elements.telegramHint.textContent = botTokenStored
        ? 'A bot token is already stored. Leave the field blank if you are not replacing it.'
        : 'No Telegram token is stored yet. Save one before enabling the channel.';
    }
  }

  async function saveConfig() {
    const payload = collectConfigPayload(elements);
    appendLog('config_submit', 'Submitting configuration update', 'info', payload);
    setBanner(elements.configBanner, 'Applying configuration...', 'warn');
    setBanner(elements.telegramBanner, 'Applying Telegram configuration...', 'warn');

    const result = await requestJson('/api/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (elements.apiKey) {
      elements.apiKey.value = '';
    }
    if (elements.telegramBotToken) {
      elements.telegramBotToken.value = '';
    }

    Object.assign(state, applyHealthToElements(elements, result.health, state));
    await loadConfig();
    await probeWebSocket();
    connectEventStream();

    if (result.initialized) {
      setBanner(elements.configBanner, result.message || 'AI agent initialized.', 'ok');
    } else if (result.success) {
      setBanner(elements.configBanner, result.message || 'Configuration saved. Agent remains disabled.', 'warn');
    } else {
      setBanner(elements.configBanner, result.message || 'Configuration saved, but initialization failed.', 'error');
    }

    setBanner(
      elements.telegramBanner,
      result.health?.channels?.telegram?.detail || 'Telegram configuration applied.',
      result.health?.channels?.telegram?.state === 'connected'
        ? 'ok'
        : result.health?.channels?.telegram?.state === 'error'
          ? 'error'
          : 'warn'
    );
  }

  async function clearStoredApiKey() {
    appendLog('config_clear_api_key', 'Clearing stored API key', 'warn');
    setBanner(elements.configBanner, 'Clearing stored API key...', 'warn');

    const payload = collectConfigPayload(elements);
    payload.ai.clearApiKey = true;

    const result = await requestJson('/api/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (elements.apiKey) {
      elements.apiKey.value = '';
    }

    Object.assign(state, applyHealthToElements(elements, result.health, state));
    await loadConfig();
    connectEventStream();
    setBanner(elements.configBanner, 'Stored API key cleared. Agent is disabled until a new key is saved.', 'warn');
  }

  async function clearStoredTelegramToken() {
    appendLog('telegram_clear_token', 'Clearing stored Telegram token', 'warn');
    setBanner(elements.telegramBanner, 'Clearing stored Telegram token...', 'warn');

    const payload = collectConfigPayload(elements);
    payload.channels.telegram.clearBotToken = true;
    payload.channels.telegram.enabled = false;

    const result = await requestJson('/api/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (elements.telegramBotToken) {
      elements.telegramBotToken.value = '';
    }

    Object.assign(state, applyHealthToElements(elements, result.health, state));
    await loadConfig();
    setBanner(elements.telegramBanner, 'Stored Telegram token cleared. Telegram is disabled.', 'warn');
  }

  async function testTelegramConnectivity() {
    const payload = collectConfigPayload(elements);
    appendLog('telegram_test_requested', 'Testing Telegram connectivity', 'info', payload.channels.telegram);
    setBanner(elements.telegramBanner, 'Testing Telegram connectivity...', 'warn');

    const status = await requestJson('/api/telegram/test', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    setTone(
      elements.telegramStatus,
      status.summary,
      status.state === 'connected' ? 'ok' : status.state === 'error' ? 'error' : 'warn'
    );
    setText(elements.telegramDetail, status.detail);
    setText(elements.telegramMeta, status.botUsername ? `Bot @${status.botUsername}` : 'Telegram token verified');
    setBanner(elements.telegramBanner, status.detail, status.state === 'connected' ? 'ok' : 'warn');
  }

  async function handleChatSubmit(event) {
    event.preventDefault();
    const message = elements.chatInput?.value?.trim();
    if (!message) {
      elements.chatOutput.textContent = 'Enter a message first.';
      return;
    }

    elements.chatOutput.textContent = 'Waiting for response...';
    appendLog('chat_submit', `Submitting chat: ${message}`, 'info');
    try {
      const result = await requestJson('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      elements.chatOutput.textContent = result?.response || '(empty response)';
      appendLog('chat_response', 'Chat response received', 'info', {
        characters: (result?.response || '').length,
      });
    } catch (error) {
      elements.chatOutput.textContent = formatError(error);
      appendLog('chat_error', formatError(error), 'error');
    }
  }

  async function handleTaskSubmit(event) {
    event.preventDefault();
    const task = elements.taskInput?.value?.trim();
    if (!task) {
      elements.taskOutput.textContent = 'Enter a task first.';
      return;
    }

    elements.taskOutput.textContent = 'Planning and executing...';
    appendLog('task_submit', `Submitting task: ${task}`, 'info');
    try {
      const result = await requestJson('/api/execute', {
        method: 'POST',
        body: JSON.stringify({ task }),
      });
      elements.taskOutput.textContent = JSON.stringify(result, null, 2);
      appendLog('task_result', 'Task response received', 'info', {
        steps: Array.isArray(result?.plan) ? result.plan.length : 0,
      });
    } catch (error) {
      elements.taskOutput.textContent = formatError(error);
      appendLog('task_error', formatError(error), 'error');
    }
  }

  async function refreshAll() {
    try {
      await refreshHealth();
      await loadConfig();
      await probeWebSocket();
      connectEventStream();
      setBanner(elements.configBanner, 'Runtime refreshed.', 'ok');
      setBanner(elements.telegramBanner, 'Telegram status refreshed.', 'ok');
    } catch (error) {
      setTone(elements.gatewayStatus, 'Gateway offline', 'error');
      setText(elements.gatewayDetail, formatError(error));
      setBanner(elements.configBanner, formatError(error), 'error');
      throw error;
    }
  }

  function focusConfigPanel() {
    documentRef.getElementById('config-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    windowRef.setTimeout(() => elements.apiKey?.focus(), 120);
  }

  function bindEvents() {
    documentRef.getElementById('refresh-status')?.addEventListener('click', () => {
      void refreshAll();
    });
    documentRef.getElementById('open-health')?.addEventListener('click', () => {
      windowRef.open(state.healthUrl, '_blank', 'noopener,noreferrer');
    });
    documentRef.getElementById('open-health-inline')?.addEventListener('click', () => {
      windowRef.open(state.healthUrl, '_blank', 'noopener,noreferrer');
    });
    documentRef.getElementById('config-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      void saveConfig();
    });
    elements.providerSelect?.addEventListener('change', () => {
      syncProviderDefaults(true);
    });
    documentRef.getElementById('clear-api-key')?.addEventListener('click', () => {
      void clearStoredApiKey();
    });
    documentRef.getElementById('focus-api-key')?.addEventListener('click', () => {
      focusConfigPanel();
    });
    documentRef.getElementById('telegram-test')?.addEventListener('click', () => {
      void testTelegramConnectivity();
    });
    documentRef.getElementById('telegram-clear-token')?.addEventListener('click', () => {
      void clearStoredTelegramToken();
    });
    documentRef.getElementById('reconnect-events')?.addEventListener('click', () => {
      connectEventStream();
    });
    documentRef.getElementById('clear-events')?.addEventListener('click', () => {
      clearLog();
    });
    documentRef.getElementById('chat-form')?.addEventListener('submit', (event) => {
      void handleChatSubmit(event);
    });
    documentRef.getElementById('task-form')?.addEventListener('submit', (event) => {
      void handleTaskSubmit(event);
    });

    bridge?.onShowConfig?.(() => {
      focusConfigPanel();
    });
  }

  async function init() {
    renderLog();
    bindEvents();
    await refreshAll();
  }

  return {
    state,
    elements,
    appendLog,
    clearLog,
    collectConfigPayload: () => collectConfigPayload(elements),
    refreshAll,
    loadConfig,
    saveConfig,
    clearStoredApiKey,
    clearStoredTelegramToken,
    testTelegramConnectivity,
    init,
  };
}
