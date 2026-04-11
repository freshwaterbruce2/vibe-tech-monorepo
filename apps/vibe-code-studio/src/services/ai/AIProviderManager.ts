/**
 * AIProviderManager - Multi-provider AI routing and orchestration
 *
 * Renderer-safe: all network calls are executed in the Electron main process
 * via IPC (see `electron/main.ts`), including DeepSeek→HF Router hedged fallback.
 */
import { logger } from '../../services/Logger';
import type {
  IAIProvider} from './AIProviderInterface';
import {
  AIProvider,
  type AIModel,
  type AIProviderConfig,
  type CompletionOptions,
  type CompletionResponse,
  MODEL_REGISTRY,
  type StreamCompletionResponse,
} from './AIProviderInterface';
import { LocalProvider } from './providers/LocalProvider';

/**
 * A minimal typing for the Web Crypto API surface used in `createRequestId`.
 * `globalThis.crypto` is available in modern browsers and Node 19+, but may
 * not appear in older TypeScript `lib` targets.
 */
interface WebCryptoGlobal {
  randomUUID(): string;
}

/** Subset of `typeof globalThis` that may optionally carry the crypto API. */
type GlobalWithCrypto = typeof globalThis & { crypto?: WebCryptoGlobal };

/**
 * Narrowed view of `window.electron.ipc` used by this module.
 * The global `WindowElectron.ipc` is optional and uses broad signatures;
 * this local alias is used after we have asserted IPC is available to avoid
 * repeated non-null assertions throughout the class.
 *
 * `on` retains an `any[]` rest parameter because the Electron preload bridge
 * is an external boundary where the exact message type cannot be verified at
 * compile time — the real narrowing happens inside the listener via the
 * `FromMainMessage` discriminated union.
 */
interface ElectronIpcBridge {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(channel: string, data?: unknown): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(channel: string, func: (...args: any[]) => void): (() => void) | void;
}

type MainAIChatRole = 'system' | 'user' | 'assistant';
interface MainAIChatMessage { role: MainAIChatRole; content: string }

interface MainAIRequestPayload {
  messages: MainAIChatMessage[];
  deepseek?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  hfRouter?: {
    apiKey?: string;
    model?: string;
  };
  options?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
  hedgeMs?: number;
}

type MainAICompleteResult =
  | {
      success: true;
      provider: 'deepseek' | 'hfRouter' | 'local';
      model: string;
      content: string;
    }
  | { success: false; error: string };

type MainAIStreamDone =
  | { success: true; provider: 'deepseek' | 'hfRouter' | 'local'; model: string }
  | { success: false; error: string };

type FromMainMessage =
  | { type: 'ai:complete:result'; requestId: string } & MainAICompleteResult
  | { type: 'ai:stream:chunk'; requestId: string; chunk: string; provider: 'deepseek' | 'hfRouter' }
  | { type: 'ai:stream:done'; requestId: string } & MainAIStreamDone;

interface PendingCompletion {
  resolve: (result: { requestId: string; provider: 'deepseek' | 'hfRouter' | 'local'; model: string; content: string }) => void;
  reject: (err: Error) => void;
  cleanup: () => void;
}

interface PendingStream {
  push: (chunk: string) => void;
  close: () => void;
  fail: (err: Error) => void;
  setDone: (done: boolean) => void;
  isDone: () => boolean;
}

function createRequestId(): string {
  const cryptoObj = (globalThis as GlobalWithCrypto).crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function isElectronIpcAvailable(): boolean {
  // `window.electron` is declared globally in `src/types/electron.d.ts`.
  return (
    typeof window !== 'undefined' &&
    !!window.electron?.ipc?.send &&
    !!window.electron?.ipc?.on
  );
}

/**
 * Returns `window.electron.ipc` as the narrowed `ElectronIpcBridge` type.
 * Only call this after `assertMainProcessIpcAvailable()` has passed.
 */
function getElectronIpc(): ElectronIpcBridge {
  // Non-null assertion is safe here — guarded by assertMainProcessIpcAvailable.
  return window.electron!.ipc as ElectronIpcBridge;
}

function assertMainProcessIpcAvailable() {
  if (!isElectronIpcAvailable()) {
    throw new Error('Electron IPC not available (AI requests require Electron main process)');
  }
}

/** Sentinel returned by an async iterator when the sequence is exhausted. */
const ITERATOR_DONE: IteratorReturnResult<undefined> = { value: undefined, done: true };

function createAsyncChunkQueue(): PendingStream & { iterable: AsyncIterable<string> } {
  const chunks: string[] = [];
  let done = false;
  let failure: Error | null = null;
  let pending: {
    resolve: (r: IteratorResult<string, undefined>) => void;
    reject: (e: Error) => void;
  } | null = null;

  const iterable: AsyncIterable<string> = {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<string, undefined>> {
          if (failure) return Promise.reject(failure);
          if (chunks.length > 0) return Promise.resolve({ value: chunks.shift()!, done: false });
          if (done) return Promise.resolve(ITERATOR_DONE);
          return new Promise<IteratorResult<string, undefined>>((resolve, reject) => {
            pending = { resolve, reject };
          });
        },
        async return(): Promise<IteratorResult<string, undefined>> {
          done = true;
          if (pending) {
            pending.resolve(ITERATOR_DONE);
            pending = null;
          }
          return Promise.resolve(ITERATOR_DONE);
        },
      };
    },
  };

  return {
    iterable,
    push(chunk: string) {
      if (done || failure) return;
      if (pending) {
        pending.resolve({ value: chunk, done: false });
        pending = null;
        return;
      }
      chunks.push(chunk);
    },
    close() {
      if (done || failure) return;
      done = true;
      if (pending) {
        pending.resolve(ITERATOR_DONE);
        pending = null;
      }
    },
    fail(err: Error) {
      if (done || failure) return;
      failure = err;
      if (pending) {
        pending.reject(err);
        pending = null;
      }
    },
    setDone(nextDone: boolean) {
      done = nextDone;
    },
    isDone() {
      return done;
    },
  };
}

export class AIProviderManager {
  private providerConfigs = new Map<AIProvider, AIProviderConfig>();
  private providers = new Map<AIProvider, IAIProvider>();
  private currentProvider: AIProvider | null = null;

  private static listenerInstalled = false;
  private static pendingCompletions = new Map<string, PendingCompletion>();
  private static pendingStreams = new Map<string, PendingStream>();

  constructor() {
    // Fail-safe: do not throw in constructor (tests expect this behavior).
    try {
      AIProviderManager.ensureMainListener();
    } catch {
      // ignore
    }
  }

  // ---------------------------------------------------------------------------
  // Provider configuration (unit-test oriented)
  // ---------------------------------------------------------------------------
  async setProvider(provider: AIProvider, config: AIProviderConfig): Promise<void> {
    this.providerConfigs.set(provider, config);
    if (!this.currentProvider) {
      this.currentProvider = provider;
    }

    // Initialize the provider instance if it's a direct provider (like Local)
    if (provider === AIProvider.LOCAL) {
      const providerInstance = new LocalProvider();
      await providerInstance.initialize(config);
      this.providers.set(provider, providerInstance);
    }
  }

  isProviderConfigured(provider: AIProvider): boolean {
    return this.providerConfigs.has(provider);
  }

  getCurrentProvider(): AIProvider | null {
    return this.currentProvider;
  }

  setCurrentProvider(provider: AIProvider): void {
    if (!this.providerConfigs.has(provider)) {
      throw new Error(`Provider ${provider} is not configured`);
    }
    this.currentProvider = provider;
  }

  getConfiguredProviders(): AIProvider[] {
    return Array.from(this.providerConfigs.keys());
  }

  // ---------------------------------------------------------------------------
  // Model registry helpers
  // ---------------------------------------------------------------------------
  getAvailableModels(): AIModel[] {
    return Object.values(MODEL_REGISTRY);
  }

  getModelInfo(modelId: string): AIModel | undefined {
    return MODEL_REGISTRY[modelId];
  }

  // ---------------------------------------------------------------------------
  // Completion API
  // ---------------------------------------------------------------------------
  async complete(modelId: string, options: CompletionOptions): Promise<CompletionResponse> {
    const model = MODEL_REGISTRY[modelId];
    if (!model) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    // Handle Local Provider directly (bypass Electron IPC if preferred for local dev)
    if (model.provider === AIProvider.LOCAL) {
      const provider = this.providers.get(AIProvider.LOCAL);
      if (!provider) {
        throw new Error('Local provider not initialized');
      }
      return provider.complete(modelId, options);
    }

    const providerConfig = this.providerConfigs.get(model.provider);
    if (!providerConfig) {
      throw new Error(`Provider ${model.provider} not configured`);
    }

    // Production integration should use IPC-based calls below (DeepSeek/HF Router).
    // This method remains a safe placeholder for unit tests and future expansion.
    throw new Error(`Provider ${providerConfig.provider} completion not implemented via direct call. Use completeViaMain.`);
  }

  async streamComplete(modelId: string, options: CompletionOptions): Promise<AsyncGenerator<StreamCompletionResponse>> {
    const model = MODEL_REGISTRY[modelId];
    if (!model) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    if (model.provider === AIProvider.LOCAL) {
      const provider = this.providers.get(AIProvider.LOCAL);
      if (!provider) {
        throw new Error('Local provider not initialized');
      }
      return provider.streamComplete(modelId, options);
    }

    const providerConfig = this.providerConfigs.get(model.provider);
    if (!providerConfig) {
      throw new Error(`Provider ${model.provider} not configured`);
    }

    throw new Error(`Provider ${providerConfig.provider} streaming not implemented via direct call. Use streamViaMain.`);
  }

  // ---------------------------------------------------------------------------
  // Electron IPC integration (DeepSeek primary, HF Router fallback)
  // ---------------------------------------------------------------------------
  async completeViaMain(
    payload: MainAIRequestPayload,
    signal?: AbortSignal
  ): Promise<{ provider: 'deepseek' | 'hfRouter' | 'local'; model: string; content: string }> {
    assertMainProcessIpcAvailable();
    AIProviderManager.ensureMainListener();

    const requestId = createRequestId();
    const electronIpc = getElectronIpc();

    let abortHandler: (() => void) | undefined;
    try {
      return await new Promise<{ provider: 'deepseek' | 'hfRouter' | 'local'; model: string; content: string }>((resolve, reject) => {
        const cleanup = () => {
          AIProviderManager.pendingCompletions.delete(requestId);
          if (signal && abortHandler) {
            signal.removeEventListener('abort', abortHandler);
          }
        };

        AIProviderManager.pendingCompletions.set(requestId, {
          resolve: (result) => {
            cleanup();
            resolve(result);
          },
          reject: (err) => {
            cleanup();
            reject(err);
          },
          cleanup,
        });

        abortHandler = () => {
          try {
            electronIpc.send('toMain', { type: 'ai:abort', requestId });
          } catch {
            // ignore
          }
          cleanup();
          reject(new DOMException('Aborted', 'AbortError'));
        };

        if (signal) {
          if (signal.aborted) {
            abortHandler();
            return;
          }
          signal.addEventListener('abort', abortHandler, { once: true });
        }

        electronIpc.send('toMain', { type: 'ai:complete', requestId, payload });
      });
    } finally {
      // Ensure the abort listener is removed even if the promise rejects early.
      if (signal && abortHandler) {
        signal.removeEventListener('abort', abortHandler);
      }
    }
  }

  async *streamViaMain(payload: MainAIRequestPayload, signal?: AbortSignal): AsyncGenerator<string> {
    assertMainProcessIpcAvailable();
    AIProviderManager.ensureMainListener();

    const requestId = createRequestId();
    const electronIpc = getElectronIpc();
    const queue = createAsyncChunkQueue();

    AIProviderManager.pendingStreams.set(requestId, queue);

    const abortInMain = () => {
      try {
        electronIpc.send('toMain', { type: 'ai:abort', requestId });
      } catch {
        // ignore
      }
    };

    const abortHandler = () => {
      abortInMain();
      queue.fail(new DOMException('Aborted', 'AbortError'));
    };

    if (signal) {
      if (signal.aborted) {
        abortHandler();
      } else {
        signal.addEventListener('abort', abortHandler, { once: true });
      }
    }

    electronIpc.send('toMain', { type: 'ai:stream:start', requestId, payload: { ...payload, stream: true } });

    try {
      for await (const chunk of queue.iterable) {
        if (signal?.aborted) return;
        yield chunk;
      }
    } finally {
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
      // If the consumer stops early, abort the main-process request to avoid leaks.
      if (!queue.isDone()) {
        abortInMain();
      }
      AIProviderManager.pendingStreams.delete(requestId);
    }
  }

  private static ensureMainListener() {
    if (AIProviderManager.listenerInstalled) return;
    if (!isElectronIpcAvailable()) return;

    const electronIpc = getElectronIpc();
    electronIpc.on('fromMain', (msg: FromMainMessage) => {
      try {
        // `msg` is already typed as `FromMainMessage` (a discriminated union); no
        // further runtime narrowing on `.type` / `.requestId` is necessary here.
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'ai:complete:result') {
          const pending = AIProviderManager.pendingCompletions.get(msg.requestId);
          if (!pending) return;
          pending.cleanup();

          if (msg.success) {
            pending.resolve({
              requestId: msg.requestId,
              provider: msg.provider,
              model: msg.model,
              content: msg.content,
            });
          } else {
            // Narrowed to `{ success: false; error: string }` by the discriminant.
            pending.reject(new Error(msg.error));
          }
          return;
        }

        if (msg.type === 'ai:stream:chunk') {
          const stream = AIProviderManager.pendingStreams.get(msg.requestId);
          if (!stream) return;
          stream.push(msg.chunk);
          return;
        }

        if (msg.type === 'ai:stream:done') {
          const stream = AIProviderManager.pendingStreams.get(msg.requestId);
          if (!stream) return;
          if (msg.success) {
            stream.setDone(true);
            stream.close();
          } else {
            // Narrowed to `{ success: false; error: string }` by the discriminant.
            stream.fail(new Error(msg.error));
          }
        }
      } catch (err) {
        logger.warn('[AIProviderManager] Failed to handle fromMain message', err);
      }
    });

    AIProviderManager.listenerInstalled = true;
    logger.debug('[AIProviderManager] Main-process IPC listener installed');
  }
}
