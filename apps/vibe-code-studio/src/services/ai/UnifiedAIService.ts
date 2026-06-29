import type {
  AIChatOptions,
  AICompletionRequest,
  AICompletionResponse,
  ChatMessage,
} from '../../types/ai';
import { SecureApiKeyManager } from '@vibetech/core';
import { logger } from '../Logger';
import { AIProviderFactory } from './AIProviderFactory';
import { AIProvider, MODEL_REGISTRY } from './AIProviderInterface';
import type { IAIProvider } from './AIProviderInterface';
import { BackendProxyService } from './providers/BackendProxyService';

// Proxy mode (default ON): client-side keys never exist, so provider readiness is
// the proxy's reachability + server key config, not a local key. Mirrors AIProviderFactory.
const USE_AI_PROXY = import.meta.env['VITE_USE_AI_PROXY'] !== 'false';

export interface GenerationSession {
  id: string;
  signal: AbortSignal;
}

// Maps a provider to its SecureApiKeyManager storage key. OpenRouter backs
// several providers under one key.
const PROVIDER_STORAGE_KEY: Record<string, string> = {
  [AIProvider.OPENROUTER]: 'openrouter',
  [AIProvider.OPENAI]: 'openrouter',
  [AIProvider.ANTHROPIC]: 'openrouter',
  [AIProvider.GROQ]: 'openrouter',
  [AIProvider.PERPLEXITY]: 'openrouter',
  [AIProvider.TOGETHER]: 'openrouter',
  [AIProvider.OLLAMA]: 'openrouter',
  [AIProvider.DEEPSEEK]: 'deepseek',
  [AIProvider.GOOGLE]: 'google',
  [AIProvider.MOONSHOT]: 'moonshot',
};

/**
 * Resolve a provider key for direct (BYOK) mode from the encrypted
 * SecureApiKeyManager store. Provider keys are NEVER read from the client bundle
 * (import.meta.env) — that would ship secrets to the browser. In proxy mode
 * (default) the backend injects keys, so this path is unused.
 */
async function getLazyKey(providerType: AIProvider): Promise<string> {
  const storageKey = PROVIDER_STORAGE_KEY[providerType];
  if (!storageKey) return '';

  try {
    const keyManager = SecureApiKeyManager.getInstance(logger);
    return (await keyManager.getApiKey(storageKey)) || '';
  } catch {
    return '';
  }
}

export class UnifiedAIService {
  private static instance: UnifiedAIService;
  private readonly factory: AIProviderFactory;
  private currentModel: string = 'moonshot/kimi-2.5-pro'; // Kimi 2.5 Pro - direct Moonshot API
  private _isDemo: boolean = false;
  private activeControllers: Set<AbortController> = new Set();
  private generationControllers: Map<string, AbortController> = new Map();

  private constructor() {
    this.factory = AIProviderFactory.getInstance();
  }

  public static getInstance(): UnifiedAIService {
    if (!UnifiedAIService.instance) {
      UnifiedAIService.instance = new UnifiedAIService();
    }
    return UnifiedAIService.instance;
  }

  private static isAbortError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return error.name === 'AbortError' || /abort(ed|ing)?/i.test(error.message);
  }

  private createSessionId(): string {
    const randomUUID = globalThis.crypto?.randomUUID;
    if (typeof randomUUID === 'function') {
      return randomUUID.call(globalThis.crypto);
    }

    return `generation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  createGenerationSession(sessionId?: string): GenerationSession {
    const id = sessionId ?? this.createSessionId();

    const existing = this.generationControllers.get(id);
    if (existing) {
      existing.abort();
      this.generationControllers.delete(id);
    }

    const controller = new AbortController();
    this.generationControllers.set(id, controller);
    return { id, signal: controller.signal };
  }

  cancelGenerationSession(sessionId: string): boolean {
    const controller = this.generationControllers.get(sessionId);
    if (!controller) {
      return false;
    }

    controller.abort();
    this.generationControllers.delete(sessionId);
    return true;
  }

  completeGenerationSession(sessionId: string): void {
    this.generationControllers.delete(sessionId);
  }

  cancelActiveGenerations(): void {
    logger.info(`[UnifiedAI] Cancelling ${this.activeControllers.size} active generations`);
    for (const controller of this.activeControllers) {
      controller.abort();
    }
    this.activeControllers.clear();

    for (const controller of this.generationControllers.values()) {
      controller.abort();
    }
    this.generationControllers.clear();
  }

  async initialize(): Promise<void> {
    // Factory initialization happens in useAppEffects
    logger.info('[UnifiedAI] Service initialized');
  }

  /**
   * Lazily initialize a provider from env vars / SecureApiKeyManager.
   * Returns the initialized provider, or undefined if no key or init failed.
   */
  private async lazyInitForCompletion(
    providerType: AIProvider,
    model: string
  ): Promise<IAIProvider | undefined> {
    // Proxy mode injects keys server-side — never lazily init from a client key.
    if (USE_AI_PROXY) return undefined;
    const lazyKey = await getLazyKey(providerType);
    if (!lazyKey) return undefined;
    logger.info(`[UnifiedAI] Lazily initializing ${providerType} prior to completion...`);
    try {
      return await this.factory.initializeProvider({
        provider: providerType,
        apiKey: lazyKey,
        model,
      });
    } catch (initErr) {
      const msg = initErr instanceof Error ? initErr.message : String(initErr);
      logger.warn(`[UnifiedAI] Lazy initialization failed: ${msg}`);
      return undefined;
    }
  }

  /**
   * Pick a default model id for a fallback provider.
   */
  private fallbackModelFor(fallbackProvider: AIProvider): string {
    return fallbackProvider === AIProvider.DEEPSEEK
      ? 'deepseek/deepseek-v3.2'
      : fallbackProvider === AIProvider.GOOGLE
        ? 'google/gemini-3.1-pro'
        : fallbackProvider === AIProvider.MOONSHOT
          ? 'moonshot/kimi-2.5-pro'
          : fallbackProvider === AIProvider.LOCAL
            ? 'local/vibe-completion'
            : 'openai/gpt-5.2';
  }

  /**
   * Fallback completion path: complete via the first initialized provider.
   * Throws if no fallback provider is available.
   */
  private async completeViaFallback(
    modelInfo: { provider: AIProvider },
    providerError: unknown,
    request: AICompletionRequest
  ): Promise<AICompletionResponse & { provider: string }> {
    const errorMsg = providerError instanceof Error ? providerError.message : String(providerError);
    logger.warn(`[UnifiedAI] Provider ${modelInfo.provider} not available: ${errorMsg}`);

    const availableProviders = this.factory.getInitializedProviders();
    if (availableProviders.length === 0) {
      throw new Error(
        `Provider ${modelInfo.provider} is not configured and no fallback providers ` +
          'are available. Please add an API key in Settings.'
      );
    }

    const fallbackProvider = availableProviders[0];
    if (!fallbackProvider) {
      throw new Error('No valid fallback provider available');
    }
    logger.info(`[UnifiedAI] Falling back to ${fallbackProvider}`);

    let fallbackProviderInstance;
    try {
      fallbackProviderInstance = await this.factory.getProvider(fallbackProvider);
    } catch (fallbackErr) {
      const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw new Error(`Failed to get fallback provider ${fallbackProvider}: ${msg}`);
    }

    if (!fallbackProviderInstance) {
      throw new Error(`Fallback provider ${fallbackProvider} returned null`);
    }

    const fallbackModel = this.fallbackModelFor(fallbackProvider);
    const response = await fallbackProviderInstance.complete(fallbackModel, {
      messages: request.messages,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
    });

    return { ...response, provider: String(fallbackProvider) } as AICompletionResponse & {
      provider: string;
    };
  }

  /**
   * Execute a completion on a resolved provider with abort wiring.
   */
  private async executeComplete(
    provider: IAIProvider,
    request: AICompletionRequest,
    providerName: AIProvider,
    model: string
  ): Promise<AICompletionResponse & { provider: string }> {
    const controller = new AbortController();
    if (request.signal) {
      request.signal.addEventListener('abort', () => controller.abort());
    }
    this.activeControllers.add(controller);

    try {
      const response = await provider.complete(model, {
        messages: request.messages,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        signal: controller.signal,
      });

      return { ...response, provider: String(providerName) } as AICompletionResponse & {
        provider: string;
      };
    } finally {
      this.activeControllers.delete(controller);
    }
  }

  /**
   * Orchestrates the completion request with automatic fallback
   */
  async complete(
    request: AICompletionRequest
  ): Promise<AICompletionResponse & { provider: string }> {
    try {
      const requestedModel = request.model ?? this.currentModel;
      // Get the provider for the current model
      const modelInfo = MODEL_REGISTRY[requestedModel];
      if (!modelInfo) {
        logger.warn(`[UnifiedAI] Unknown model: ${requestedModel}, using demo mode`);
        return {
          content: `Demo mode: Model "${requestedModel}" not found. Please select a valid model from Settings.`,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          provider: 'demo',
        };
      }

      // Try to get the appropriate provider
      let provider;
      try {
        provider = await this.factory.getProvider(modelInfo.provider);
      } catch (providerError) {
        // [FIX for ERR: Provider not initialized]
        // If the provider wasn't initialized yet (e.g. useAppEffects mount delayed),
        // try to lazily initialize from env vars or SecureApiKeyManager before giving up.
        provider = await this.lazyInitForCompletion(modelInfo.provider, requestedModel);

        if (!provider) {
          // No key found or lazy init failed, proceed with fallback logic
          return await this.completeViaFallback(modelInfo, providerError, request);
        }
      }

      return await this.executeComplete(provider, request, modelInfo.provider, requestedModel);
    } catch (primaryError) {
      if (UnifiedAIService.isAbortError(primaryError)) {
        throw primaryError;
      }
      logger.error('[UnifiedAI] AI service failed:', primaryError);
      const errorMsg = primaryError instanceof Error ? primaryError.message : 'Unknown error';
      throw new Error(`AI service unavailable: ${errorMsg}`);
    }
  }

  /**
   * Send a contextual message and get a response
   */
  async sendContextualMessage(context: {
    userQuery?: string;
    messages?: ChatMessage[];
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    // Extended context (optional, for compatibility)
    workspaceContext?: object;
    currentFile?: object;
    relatedFiles?: object[];
    conversationHistory?: object[];
  }): Promise<AICompletionResponse> {
    const messages: ChatMessage[] = [];

    if (context.systemPrompt) {
      messages.push({ role: 'system', content: context.systemPrompt });
    }

    if (context.messages) {
      messages.push(...context.messages);
    } else if (context.userQuery) {
      messages.push({ role: 'user', content: context.userQuery });
    }

    const request: AICompletionRequest = {
      messages,
      model: this.currentModel,
      maxTokens: context.maxTokens ?? 2000,
      temperature: context.temperature ?? 0.3,
    };

    return this.complete(request);
  }

  /**
   * Lazily initialize a provider for streaming.
   * Returns the initialized provider, or undefined if no key or init failed.
   */
  private async lazyInitForStream(providerType: AIProvider): Promise<IAIProvider | undefined> {
    // Proxy mode injects keys server-side — never lazily init from a client key.
    if (USE_AI_PROXY) return undefined;
    const lazyKey = await getLazyKey(providerType);
    if (!lazyKey) return undefined;
    logger.info(`[UnifiedAI] Lazily initializing ${providerType} prior to stream...`);
    try {
      return await this.factory.initializeProvider({
        provider: providerType,
        apiKey: lazyKey,
        model: this.currentModel,
      });
    } catch (initErr) {
      const msg = initErr instanceof Error ? initErr.message : String(initErr);
      logger.warn(`[UnifiedAI] Lazy initialization failed for stream: ${msg}`);
      return undefined;
    }
  }

  /**
   * Fallback provider resolution for streaming. Throws if none available.
   */
  private async streamFallbackProvider(
    providerType: AIProvider,
    providerError: unknown
  ): Promise<IAIProvider> {
    const errorMsg = providerError instanceof Error ? providerError.message : String(providerError);
    logger.warn(`[UnifiedAI] Provider ${providerType} not available for streaming: ${errorMsg}`);

    const availableProviders = this.factory.getInitializedProviders();
    if (availableProviders.length === 0) {
      throw new Error(
        `Provider ${providerType} is not configured and no fallback providers ` +
          'are available. Please add an API key in Settings.'
      );
    }

    const fallbackProvider = availableProviders[0];
    if (!fallbackProvider) throw new Error('No valid fallback provider available');
    logger.info(`[UnifiedAI] Falling back to ${fallbackProvider} for stream`);
    try {
      return await this.factory.getProvider(fallbackProvider);
    } catch (fallbackErr) {
      const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw new Error(`Failed to get fallback provider ${fallbackProvider}: ${msg}`);
    }
  }

  /**
   * Stream chunks from a provider that supports streamComplete, with abort wiring.
   */
  private async *streamFromProvider(
    provider: IAIProvider,
    context: { maxTokens?: number; temperature?: number },
    messages: ChatMessage[],
    signal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    const forwardAbort = () => controller.abort();

    if (signal) {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener('abort', forwardAbort, { once: true });
      }
    }

    this.activeControllers.add(controller);

    try {
      for await (const chunk of provider.streamComplete(this.currentModel, {
        messages,
        maxTokens: context.maxTokens ?? 2000,
        temperature: context.temperature ?? 0.3,
        signal: controller.signal,
      })) {
        if (controller.signal.aborted) {
          break;
        }
        if (chunk.content) {
          yield chunk.content;
        }
      }
    } finally {
      if (signal) {
        signal.removeEventListener('abort', forwardAbort);
      }
      this.activeControllers.delete(controller);
    }
  }

  /**
   * Resolve a provider for streaming, with lazy init and fallback.
   */
  private async resolveStreamProvider(providerType: AIProvider): Promise<IAIProvider> {
    try {
      return await this.factory.getProvider(providerType);
    } catch (providerError) {
      // [FIX for ERR: Provider not initialized]
      // Try to lazily initialize from env vars or SecureApiKeyManager before giving up.
      const provider = await this.lazyInitForStream(providerType);
      if (provider) return provider;
      // No key found or lazy init failed, try to fall back to an available provider
      return this.streamFallbackProvider(providerType, providerError);
    }
  }

  /**
   * Send a contextual message with streaming response
   */
  async *sendContextualMessageStream(context: {
    userQuery?: string;
    messages?: ChatMessage[];
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
    // Extended context (optional, for compatibility)
    workspaceContext?: object;
    currentFile?: object;
    relatedFiles?: object[];
    conversationHistory?: object[];
  }): AsyncGenerator<string, void, unknown> {
    const messages: ChatMessage[] = [];

    if (context.systemPrompt) {
      messages.push({ role: 'system', content: context.systemPrompt });
    }

    if (context.messages) {
      messages.push(...context.messages);
    } else if (context.userQuery) {
      messages.push({ role: 'user', content: context.userQuery });
    }

    const request: AICompletionRequest = {
      messages,
      model: this.currentModel,
      maxTokens: context.maxTokens ?? 2000,
      temperature: context.temperature ?? 0.3,
      stream: true,
      signal: context.signal,
    };

    try {
      // Get the provider for the current model
      const modelInfo = MODEL_REGISTRY[this.currentModel];
      const providerType = modelInfo?.provider ?? AIProvider.OPENROUTER;

      const provider = await this.resolveStreamProvider(providerType);

      // Try streaming if supported
      if (typeof provider.streamComplete === 'function') {
        yield* this.streamFromProvider(provider, context, messages, context.signal);
      } else {
        // Fallback to non-streaming
        const response = await this.complete(request);
        yield response.content;
      }
    } catch (error) {
      if (UnifiedAIService.isAbortError(error)) {
        logger.info('[UnifiedAI] Streaming cancelled by caller');
        return;
      }
      logger.error('[UnifiedAI] Streaming failed:', error);
      // Fallback to non-streaming
      const response = await this.complete(request);
      yield response.content;
    }
  }

  /**
   * Simple chat interface
   */
  async chat(messages: ChatMessage[], options?: AIChatOptions): Promise<string> {
    const request: AICompletionRequest = {
      messages,
      model: options?.model ?? this.currentModel,
      maxTokens: options?.maxTokens ?? 2000,
      temperature: options?.temperature ?? 0.3,
    };

    const response = await this.complete(request);
    return response.content;
  }

  /**
   * Generate text from a prompt
   */
  async generateText(prompt: string, options?: AIChatOptions): Promise<string> {
    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

    if (options?.systemPrompt) {
      messages.unshift({ role: 'system', content: options.systemPrompt });
    }

    return this.chat(messages, options);
  }

  /**
   * Set the current model
   */
  setModel(model: string): void {
    this.currentModel = model;
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.currentModel;
  }

  /**
   * Check if running in demo mode
   */
  get isDemo(): boolean {
    return this._isDemo;
  }

  /**
   * Set demo mode
   */
  setDemoMode(isDemo: boolean): void {
    this._isDemo = isDemo;
  }

  /**
   * Helper to determine if we are running on fallback
   */
  get activeProvider(): string {
    const modelInfo = MODEL_REGISTRY[this.currentModel];
    return modelInfo?.provider ?? 'deepseek';
  }

  /**
   * Get the AIProviderFactory instance for advanced usage
   */
  getFactory(): AIProviderFactory {
    return this.factory;
  }

  /**
   * Get list of available (initialized) providers
   */
  getAvailableProviders(): AIProvider[] {
    return this.factory.getInitializedProviders();
  }

  /**
   * True if at least one provider can actually run a request — either already
   * initialized, or a key is resolvable from env vars / SecureApiKeyManager.
   * Lets callers fail fast with a clear message instead of silently returning
   * canned fallback text.
   */
  async isAnyProviderConfigured(): Promise<boolean> {
    if (USE_AI_PROXY) {
      // Proxy mode: client keys never exist here. Readiness == the proxy is
      // reachable AND has at least one server-side key. Probe fresh so a backend
      // that started (or died) after boot is reflected, not the one-shot init flag.
      try {
        return await new BackendProxyService().validateConnection();
      } catch {
        return false;
      }
    }
    if (this.factory.getInitializedProviders().length > 0) {
      return true;
    }
    const candidates = [
      AIProvider.MOONSHOT,
      AIProvider.GOOGLE,
      AIProvider.OPENROUTER,
      AIProvider.DEEPSEEK,
    ];
    for (const provider of candidates) {
      if (await getLazyKey(provider)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a specific provider is available
   */
  isProviderAvailable(provider: AIProvider): boolean {
    const status = this.factory.getProviderStatus(provider);
    return (status?.initialized && status?.available) ?? false;
  }
}

export const unifiedAI = UnifiedAIService.getInstance();
