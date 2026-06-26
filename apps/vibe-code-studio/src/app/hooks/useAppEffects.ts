/**
 * useAppEffects - App-level side effects
 * Extracts useEffect hooks from App.tsx for cleaner organization
 */

import { SecureApiKeyManager } from '@vibetech/core';
import { useEffect, useRef } from 'react';
import { getDatabase, getDbInitError } from '../../modules/core/services/DatabaseManager';

import { logger } from '../../services/Logger';
import { telemetry } from '../../services/TelemetryService';
import type { DbStatus } from '../types';
import { AIProviderFactory } from '../../services/ai/AIProviderFactory';
import type { AIProviderConfig } from '../../services/ai/AIProviderInterface';
import { AIProvider } from '../../services/ai/AIProviderInterface';

// Proxy mode (default ON): the backend injects provider keys, so providers are
// initialized without a client-side key. Must match AIProviderFactory.
const USE_AI_PROXY = import.meta.env['VITE_USE_AI_PROXY'] !== 'false';

export interface UseAppEffectsProps {
  // Notification handlers
  showWarning: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;

  // State setters
  setDbStatus: (status: DbStatus) => void;
  setOpenrouterApiKey: (key: string) => void;

  // Handlers
  handleOpenFolder: (folderPath: string) => Promise<void>;
  handleOpenFile: (filePath: string) => Promise<void>;
}

/**
 * Initialize a single provider in the factory with a given API key
 */
async function initProviderWithKey(
  factory: AIProviderFactory,
  provider: AIProvider,
  apiKey: string,
  model: string,
) {
  await factory.initializeProvider({
    provider,
    apiKey,
    model,
  });
}

// OpenRouter backs multiple providers under one key.
const OPENROUTER_BACKED_PROVIDERS = [
  AIProvider.OPENROUTER,
  AIProvider.OPENAI,
  AIProvider.ANTHROPIC,
  AIProvider.GROQ,
  AIProvider.PERPLEXITY,
  AIProvider.TOGETHER,
  AIProvider.OLLAMA,
];

/** Get a key from an env var, falling back to SecureApiKeyManager. */
function makeGetKey(keyManager: ReturnType<typeof SecureApiKeyManager.getInstance>) {
  return async (envVar: string, provider: string): Promise<string | null> => {
    const envKey = import.meta.env[envVar];
    if (envKey) return envKey;
    return keyManager.getApiKey(provider);
  };
}

/** Build the proxy-mode config map (providers initialized without a client key). */
function buildProxyConfigs(): Map<AIProvider, AIProviderConfig> {
  const configs = new Map<AIProvider, AIProviderConfig>();
  const proxyProviders = [AIProvider.MOONSHOT, AIProvider.OPENROUTER, AIProvider.GOOGLE];
  proxyProviders.forEach(p => {
    configs.set(p, { provider: p, apiKey: '', model: 'moonshot/kimi-2.5-pro' });
  });
  return configs;
}

/** Build the direct-key config map by reading keys from env vars / key manager. */
async function buildDirectConfigs(
  keyManager: ReturnType<typeof SecureApiKeyManager.getInstance>,
): Promise<Map<AIProvider, AIProviderConfig>> {
  const configs = new Map<AIProvider, AIProviderConfig>();
  const getKey = makeGetKey(keyManager);

  // OpenRouter (primary - covers OpenAI, Anthropic, etc.)
  const openRouterKey = await getKey('VITE_OPENROUTER_API_KEY', 'openrouter');
  if (openRouterKey) {
    OPENROUTER_BACKED_PROVIDERS.forEach(p => {
      configs.set(p, { provider: p, apiKey: openRouterKey, model: 'moonshot/kimi-2.5-pro' });
    });
  }

  // Moonshot (direct API) — check KIMI_API_KEY first, then VITE_ variants
  const moonshotKey = import.meta.env['KIMI_API_KEY']
    || await getKey('VITE_KIMI_API_KEY', 'moonshot')
    || await getKey('VITE_MOONSHOT_API_KEY', 'moonshot');
  if (moonshotKey) {
    configs.set(AIProvider.MOONSHOT, {
      provider: AIProvider.MOONSHOT,
      apiKey: moonshotKey,
      model: 'moonshot/kimi-2.5-pro',
    });
  }

  // Google (direct API)
  const googleKey = await getKey('VITE_GOOGLE_API_KEY', 'google');
  if (googleKey) {
    configs.set(AIProvider.GOOGLE, {
      provider: AIProvider.GOOGLE,
      apiKey: googleKey,
      model: 'gemini-2.0-flash',
    });
  }

  // DeepSeek (direct API)
  const deepseekKey = await getKey('VITE_DEEPSEEK_API_KEY', 'deepseek');
  if (deepseekKey) {
    configs.set(AIProvider.DEEPSEEK, {
      provider: AIProvider.DEEPSEEK,
      apiKey: deepseekKey,
      model: 'deepseek/deepseek-v3.2',
    });
  }

  // Local Provider always available
  configs.set(AIProvider.LOCAL, {
    provider: AIProvider.LOCAL,
    apiKey: '',
    model: 'local/vibe-completion',
  });

  return configs;
}

/** Initialize all AI providers, choosing proxy or direct-key mode. */
async function initAIProviders(): Promise<void> {
  const factory = AIProviderFactory.getInstance();

  // Proxy mode: initialize the proxy-backed providers WITHOUT a client key.
  // The backend injects keys, so getInitializedProviders() is non-empty even
  // when no VITE_* key is present (otherwise the agent pre-flight reports
  // "no provider configured").
  if (USE_AI_PROXY) {
    await factory.initializeAllProviders(buildProxyConfigs());
    return;
  }

  const keyManager = SecureApiKeyManager.getInstance(logger);
  const configs = await buildDirectConfigs(keyManager);
  await factory.initializeAllProviders(configs);
}

/** Re-initialize providers for a single provider after a key update from Settings. */
async function reinitProviderFromEvent(e: Event): Promise<void> {
  const detail = (e as CustomEvent).detail;
  const provider = detail?.provider as string;
  if (!provider) return;

  const factory = AIProviderFactory.getInstance();
  const keyManager = SecureApiKeyManager.getInstance(logger);
  const apiKey = await keyManager.getApiKey(provider);
  if (!apiKey) return;

  logger.info(`[useAIProviderInit] Re-initializing provider after key update: ${provider}`);

  try {
    if (provider === 'openrouter') {
      for (const p of OPENROUTER_BACKED_PROVIDERS) {
        await initProviderWithKey(factory, p, apiKey, 'moonshot/kimi-2.5-pro');
      }
    } else if (provider === 'moonshot') {
      await initProviderWithKey(factory, AIProvider.MOONSHOT, apiKey, 'moonshot/kimi-2.5-pro');
    } else if (provider === 'google') {
      await initProviderWithKey(factory, AIProvider.GOOGLE, apiKey, 'gemini-2.0-flash');
    } else if (provider === 'deepseek') {
      await initProviderWithKey(factory, AIProvider.DEEPSEEK, apiKey, 'deepseek/deepseek-v3.2');
    }
  } catch (error) {
    logger.error(`[useAIProviderInit] Failed to re-init provider ${provider}:`, error);
  }
}

/**
 * Hook for initializing AI Providers
 * Loads keys from env vars AND SecureApiKeyManager, and listens for key updates
 */
export function useAIProviderInit() {
  useEffect(() => {
    initAIProviders();

    // Listen for API key updates from Settings UI
    const handleKeyUpdate = (e: Event) => {
      reinitProviderFromEvent(e);
    };

    window.addEventListener('apiKeyUpdated', handleKeyUpdate);
    return () => window.removeEventListener('apiKeyUpdated', handleKeyUpdate);
  }, []);
}

interface DbInitHandlers {
  setDbStatus: (status: DbStatus) => void;
  showWarning: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
}

/** Log the app_start analytics event; swallow analytics failures. */
async function logAppStart(db: Awaited<ReturnType<typeof getDatabase>>): Promise<void> {
  try {
    await db.logEvent('app_start', {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  } catch (analyticsError) {
    logger.warn('[App] Failed to log analytics event:', analyticsError);
  }
}

/** Migrate strategy patterns into the database; swallow migration failures. */
async function migrateStrategies(db: Awaited<ReturnType<typeof getDatabase>>): Promise<void> {
  try {
    const migrationResult = await db.migrateStrategyMemory();
    if (migrationResult.migrated > 0) {
      logger.info(`[App] Migrated ${migrationResult.migrated} strategy patterns to database`);
    }
  } catch (migrationError) {
    logger.warn('[App] Strategy migration failed:', migrationError);
  }
}

/** Initialize the database, applying fallback/ready status and migrations. */
async function initDatabase(handlers: DbInitHandlers): Promise<void> {
  const { setDbStatus, showWarning, showError } = handlers;
  setDbStatus('initializing');

  try {
    const db = await getDatabase();

    // Check if we're using fallback
    const usingFallback = await db.getSetting('_db_test_key').then(
      () => false,
      () => true
    );

    if (usingFallback || getDbInitError()) {
      setDbStatus('fallback');
      showWarning(
        'Database Service',
        'Unable to access database. Using localStorage for data persistence. Some features may be limited.'
      );
      logger.info('[App] Database using localStorage fallback mode');
    } else {
      setDbStatus('ready');
      logger.info('[App] Database initialized successfully with full features');
      await logAppStart(db);
    }

    // Migrate strategy patterns if not using fallback
    if (!usingFallback) {
      await migrateStrategies(db);
    }
  } catch (error) {
    logger.error('[App] Critical database initialization error:', error);
    setDbStatus('fallback');
    showError(
      'Database Error',
      'Failed to initialize database service. The application will continue with limited functionality.'
    );
  }
}

/**
 * Hook for database initialization effect
 */
export function useDatabaseInit(props: {
  setDbStatus: (status: DbStatus) => void;
  showWarning: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
}) {
  const { setDbStatus, showWarning, showError } = props;

  useEffect(() => {
    const timer = setTimeout(() => {
      initDatabase({ setDbStatus, showWarning, showError }).catch(error => {
        logger.error('[App] Uncaught database initialization error:', error);
        setDbStatus('fallback');
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [showWarning, showError, setDbStatus]);
}

type OpenHandlerRef = {
  handleOpenFolder: (folderPath: string) => Promise<void>;
  handleOpenFile: (filePath: string) => Promise<void>;
};

type ElectronEventHandler = (arg: string) => void;
interface ElectronApi {
  on?: (event: string, handler: ElectronEventHandler) => void;
  removeListener?: (event: string, handler: ElectronEventHandler) => void;
}

/** Track telemetry and load the demo workspace when not running under Electron. */
function runAppInitTasks(handlersRef: { current: OpenHandlerRef }): void {
  telemetry.trackEvent('app_initialized', {
    version: import.meta.env['VITE_APP_VERSION'],
    platform: navigator.platform,
    language: navigator.language,
  });

  // Demo mode: load demo workspace if no Electron
  // Use virtual demo path that FileSystemService handles in-memory
  if (!(globalThis as unknown as Record<string, unknown>).electronAPI) {
    const demoPath = 'demo://workspace';
    handlersRef.current.handleOpenFolder(demoPath);
    setTimeout(() => {
      handlersRef.current.handleOpenFile('demo://workspace/index.js');
    }, 1500);
  }

  logger.debug('App initialization complete');
}

/**
 * Register the auto-open-folder Electron listener once. Returns a cleanup
 * function, or undefined when Electron is unavailable / already registered.
 */
function registerAutoOpenListener(
  handlersRef: { current: OpenHandlerRef },
  listenerRegisteredRef: { current: boolean },
): (() => void) | undefined {
  const electron = (globalThis as unknown as Record<string, unknown>).electron as
    | ElectronApi
    | undefined;
  if (!electron?.on || listenerRegisteredRef.current) {
    if (!electron?.on) {
      logger.warn('[App] electron.on not available - auto-open disabled');
    }
    return undefined;
  }

  logger.info('[App] Registering auto-open-folder listener (once)');
  listenerRegisteredRef.current = true;

  const handleAutoOpen = (folderPath: string) => {
    logger.info('[App] Received auto-open-folder event:', folderPath);
    if (folderPath && typeof folderPath === 'string') {
      handlersRef.current.handleOpenFolder(folderPath).catch((err: Error) => {
        logger.error('[App] Failed to open folder:', err);
      });
    }
  };

  electron.on('auto-open-folder', handleAutoOpen);

  return () => {
    logger.info('[App] Removing auto-open-folder listener');
    listenerRegisteredRef.current = false;
    electron.removeListener?.('auto-open-folder', handleAutoOpen);
  };
}

/**
 * Hook for app initialization effect (telemetry, updates, demo mode)
 */
export function useAppInit(props: {
  showWarning: (title: string, message?: string) => void;
  handleOpenFolder: (folderPath: string) => Promise<void>;
  handleOpenFile: (filePath: string) => Promise<void>;
}) {
  const { showWarning, handleOpenFolder, handleOpenFile } = props;

  // Use refs to avoid re-running effect when handlers change. Update the ref in
  // an effect (not during render) per react-hooks/refs.
  const handlersRef = useRef({ handleOpenFolder, handleOpenFile });
  useEffect(() => {
    handlersRef.current = { handleOpenFolder, handleOpenFile };
  });

  // Track if listener is already registered to prevent duplicates
  const listenerRegisteredRef = useRef(false);

  // One-time initialization effect (telemetry, updates)
  useEffect(() => {
    runAppInitTasks(handlersRef);
  }, [showWarning]); // Only depend on showWarning, not handlers (they're in ref)

  // Separate effect for auto-open-folder listener (only runs once)
  useEffect(() => {
    return registerAutoOpenListener(handlersRef, listenerRegisteredRef);
  }, []); // Empty deps - only run once on mount
}

/**
 * Hook for loading API key on mount
 */
export function useApiKeyLoader(props: {
  setOpenrouterApiKey: (key: string) => void;
}) {
  const { setOpenrouterApiKey } = props;

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const keyManager = SecureApiKeyManager.getInstance(logger);
        const key = await keyManager.getApiKey('openrouter');
        if (key) {
          setOpenrouterApiKey(key);
        }
      } catch (error) {
        logger.error('Failed to load OpenRouter API key:', error);
      }
    };
    loadApiKey();
  }, [setOpenrouterApiKey]);
}

interface KeyboardShortcutHandlers {
  setGlobalSearchOpen: (open: boolean) => void;
  setAiChatOpen: (open: boolean) => void;
  setChatMode: (mode: 'chat' | 'agent') => void;
  setKeyboardShortcutsOpen: (open: boolean) => void;
  setTerminalOpen: (open: boolean) => void;
  terminalOpen: boolean;
}

/** Build the global keydown handler that maps shortcut combos to actions. */
function createKeyDownHandler(handlers: KeyboardShortcutHandlers) {
  const {
    setGlobalSearchOpen,
    setAiChatOpen,
    setChatMode,
    setKeyboardShortcutsOpen,
    setTerminalOpen,
    terminalOpen,
  } = handlers;

  return (e: KeyboardEvent) => {
    // Global search: Ctrl+Shift+F
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      setGlobalSearchOpen(true);
    }

    // Agent Mode: Ctrl+Shift+A
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      setAiChatOpen(true);
      setChatMode('agent');
    }

    // Keyboard shortcuts: Ctrl+K Ctrl+S
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      const handleCtrlS = (nextEvent: KeyboardEvent) => {
        if (nextEvent.ctrlKey && nextEvent.key === 's') {
          nextEvent.preventDefault();
          setKeyboardShortcutsOpen(true);
          globalThis.removeEventListener('keydown', handleCtrlS);
        }
      };
      globalThis.addEventListener('keydown', handleCtrlS);
      setTimeout(() => globalThis.removeEventListener('keydown', handleCtrlS), 2000);
    }

    // Toggle Terminal: Ctrl+`
    if (e.ctrlKey && e.key === '`') {
      e.preventDefault();
      setTerminalOpen(!terminalOpen);
    }
  };
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardShortcuts(props: {
  setGlobalSearchOpen: (open: boolean) => void;
  setAiChatOpen: (open: boolean) => void;
  setChatMode: (mode: 'chat' | 'agent') => void;
  setKeyboardShortcutsOpen: (open: boolean) => void;
  setTerminalOpen: (open: boolean) => void;
  terminalOpen?: boolean;
}) {
  const {
    setGlobalSearchOpen,
    setAiChatOpen,
    setChatMode,
    setKeyboardShortcutsOpen,
    setTerminalOpen,
    terminalOpen = false,
  } = props;

  useEffect(() => {
    const handleKeyDown = createKeyDownHandler({
      setGlobalSearchOpen,
      setAiChatOpen,
      setChatMode,
      setKeyboardShortcutsOpen,
      setTerminalOpen,
      terminalOpen,
    });

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [
    setGlobalSearchOpen,
    setAiChatOpen,
    setChatMode,
    setKeyboardShortcutsOpen,
    setTerminalOpen,
    terminalOpen,
  ]);
}

/**
 * Combined hook for all app effects
 */
export function useAppEffects(props: UseAppEffectsProps) {
  const {
    showWarning,
    showError,
    setDbStatus,
    setOpenrouterApiKey,
    handleOpenFolder,
    handleOpenFile,
  } = props;

  useAIProviderInit();
  useDatabaseInit({ setDbStatus, showWarning, showError });
  useAppInit({ showWarning, handleOpenFolder, handleOpenFile });
  useApiKeyLoader({ setOpenrouterApiKey });
}
