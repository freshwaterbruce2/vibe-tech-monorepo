import type { AIChatOptions, AICompletionRequest, AICompletionResponse, ChatMessage } from '../../types/ai';
import { SecureApiKeyManager } from '@vibetech/shared-utils';
import { logger } from '../Logger';
import { AIProviderFactory } from './AIProviderFactory';
import { AIProvider, MODEL_REGISTRY } from './AIProviderInterface';

/**
 * Get API key from env vars first, then SecureApiKeyManager
 */
async function getLazyKey(providerType: AIProvider): Promise<string> {
  // Map provider to env var name and storage key
  const envMap: Record<string, { envVar: string; storageKey: string }> = {
    [AIProvider.OPENROUTER]: { envVar: 'VITE_OPENROUTER_API_KEY', storageKey: 'openrouter' },
    [AIProvider.OPENAI]: { envVar: 'VITE_OPENROUTER_API_KEY', storageKey: 'openrouter' },
    [AIProvider.ANTHROPIC]: { envVar: 'VITE_OPENROUTER_API_KEY', storageKey: 'openrouter' },
    [AIProvider.GROQ]: { envVar: 'VITE_OPENROUTER_API_KEY', storageKey: 'openrouter' },
    [AIProvider.PERPLEXITY]: { envVar: 'VITE_OPENROUTER_API_KEY', storageKey: 'openrouter' },
    [AIProvider.TOGETHER]: { envVar: 'VITE_OPENROUTER_API_KEY', storageKey: 'openrouter' },
    [AIProvider.OLLAMA]: { envVar: 'VITE_OPENROUTER_API_KEY', storageKey: 'openrouter' },
    [AIProvider.DEEPSEEK]: { envVar: 'VITE_DEEPSEEK_API_KEY', storageKey: 'deepseek' },
    [AIProvider.GOOGLE]: { envVar: 'VITE_GOOGLE_API_KEY', storageKey: 'google' },
    [AIProvider.MOONSHOT]: { envVar: 'VITE_MOONSHOT_API_KEY', storageKey: 'moonshot' },
  };

  const mapping = envMap[providerType];
  if (!mapping) return '';

  // For Moonshot, also check KIMI_API_KEY (system env var exposed via envPrefix)
  if (providerType === AIProvider.MOONSHOT) {
    const kimiKey = import.meta.env['KIMI_API_KEY'] || '';
    if (kimiKey) return kimiKey;
  }

  // Try env var first
  const envKey = import.meta.env[mapping.envVar] || '';
  if (envKey) return envKey;

  // Fall back to SecureApiKeyManager
  try {
    const keyManager = SecureApiKeyManager.getInstance(logger);
    return (await keyManager.getApiKey(mapping.storageKey)) || '';
  } catch {
    return '';
  }
}

export class UnifiedAIService {
  private static instance: UnifiedAIService;
  private readonly factory: AIProviderFactory;
  private currentModel: string = 'moonshot/kimi-2.5-pro'; // Kimi 2.5 Pro - direct Moonshot API
  private _isDemo: boolean = false;

  private constructor() {
    this.factory = AIProviderFactory.getInstance();
  }

  public static getInstance(): UnifiedAIService {
    if (!UnifiedAIService.instance) {
      UnifiedAIService.instance = new UnifiedAIService();
    }
    return UnifiedAIService.instance;
  }

  async initialize(): Promise<void> {
    // Factory initialization happens in useAppEffects
    logger.info('[UnifiedAI] Service initialized');
  }

  /**
   * Orchestrates the completion request with automatic fallback
   */
  async complete(request: AICompletionRequest): Promise<AICompletionResponse & { provider: string }> {
    try {
      // Get the provider for the current model
      const modelInfo = MODEL_REGISTRY[this.currentModel];
      if (!modelInfo) {
        logger.warn(`[UnifiedAI] Unknown model: ${this.currentModel}, using demo mode`);
        return {
          content: `Demo mode: Model "${this.currentModel}" not found. Please select a valid model from Settings.`,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          provider: 'demo'
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
        let lazyKey = await getLazyKey(modelInfo.provider);

        if (lazyKey) {
            logger.info(`[UnifiedAI] Lazily initializing ${modelInfo.provider} prior to completion...`);
            try {
                provider = await this.factory.initializeProvider({
                    provider: modelInfo.provider,
                    apiKey: lazyKey,
                    model: this.currentModel
                });
            } catch (initErr) {
                logger.warn(`[UnifiedAI] Lazy initialization failed: ${initErr instanceof Error ? initErr.message : String(initErr)}`);
                lazyKey = ''; // Force fallback
            }
        }

        if (!lazyKey || !provider) {
            // No key found or lazy init failed, proceed with fallback logic
            const errorMsg = providerError instanceof Error ? providerError.message : String(providerError);
            logger.warn(`[UnifiedAI] Provider ${modelInfo.provider} not available: ${errorMsg}`);

            // Try to fall back to an available provider
            const availableProviders = this.factory.getInitializedProviders();
            if (availableProviders.length > 0) {
              const fallbackProvider = availableProviders[0];
              if (!fallbackProvider) {
                throw new Error('No valid fallback provider available');
              }
              logger.info(`[UnifiedAI] Falling back to ${fallbackProvider}`);
              let fallbackProviderInstance;
              try {
                fallbackProviderInstance = await this.factory.getProvider(fallbackProvider);
              } catch (fallbackErr) {
                throw new Error(`Failed to get fallback provider ${fallbackProvider}: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`);
              }

              if (!fallbackProviderInstance) {
                throw new Error(`Fallback provider ${fallbackProvider} returned null`);
              }
              provider = fallbackProviderInstance;

              // Use a default model for the fallback provider
              const fallbackModel = fallbackProvider === AIProvider.DEEPSEEK ? 'deepseek/deepseek-v3.2' :
                                   fallbackProvider === AIProvider.GOOGLE ? 'google/gemini-3.1-pro' :
                                   fallbackProvider === AIProvider.MOONSHOT ? 'moonshot/kimi-2.5-pro' :
                                   fallbackProvider === AIProvider.LOCAL ? 'local/vibe-completion' :
                                   'openai/gpt-5.2';

              const response = await provider.complete(fallbackModel, {
                messages: request.messages,
                maxTokens: request.maxTokens,
                temperature: request.temperature,
              });

              return { ...response, provider: String(fallbackProvider) } as AICompletionResponse & { provider: string };
            } else {
              // No providers available at all
              throw new Error(`Provider ${modelInfo.provider} is not configured and no fallback providers are available. Please add an API key in Settings.`);
            }
        }
      }

      const response = await provider.complete(this.currentModel, {
        messages: request.messages,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      });

      return { ...response, provider: String(modelInfo.provider) } as AICompletionResponse & { provider: string };
    } catch (primaryError) {
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
   * Send a contextual message with streaming response
   */
  async *sendContextualMessageStream(context: {
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
    };

    try {
      // Get the provider for the current model
      const modelInfo = MODEL_REGISTRY[this.currentModel];
      const providerType = modelInfo?.provider ?? AIProvider.OPENROUTER;

      let provider;
      try {
        provider = await this.factory.getProvider(providerType);
      } catch (providerError) {
        // [FIX for ERR: Provider not initialized]
        // Try to lazily initialize from env vars or SecureApiKeyManager before giving up.
        let lazyKey = await getLazyKey(providerType);

        if (lazyKey) {
            logger.info(`[UnifiedAI] Lazily initializing ${providerType} prior to stream...`);
            try {
                provider = await this.factory.initializeProvider({
                    provider: providerType,
                    apiKey: lazyKey,
                    model: this.currentModel
                });
            } catch (initErr) {
                logger.warn(`[UnifiedAI] Lazy initialization failed for stream: ${initErr instanceof Error ? initErr.message : String(initErr)}`);
                lazyKey = ''; // Force fallback
            }
        }

        if (!lazyKey || !provider) {
            // No key found or lazy init failed, try to fall back to an available provider
            const errorMsg = providerError instanceof Error ? providerError.message : String(providerError);
            logger.warn(`[UnifiedAI] Provider ${providerType} not available for streaming: ${errorMsg}`);

            const availableProviders = this.factory.getInitializedProviders();
            if (availableProviders.length > 0) {
              const fallbackProvider = availableProviders[0];
              if (!fallbackProvider) throw new Error('No valid fallback provider available');
              logger.info(`[UnifiedAI] Falling back to ${fallbackProvider} for stream`);
              try {
                provider = await this.factory.getProvider(fallbackProvider);
              } catch (fallbackErr) {
                 throw new Error(`Failed to get fallback provider ${fallbackProvider}: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`);
              }
            } else {
              throw new Error(`Provider ${providerType} is not configured and no fallback providers are available. Please add an API key in Settings.`);
            }
        }
      }

      // Try streaming if supported
      if (provider.streamComplete) {
        for await (const chunk of provider.streamComplete(this.currentModel, {
          messages,
          maxTokens: context.maxTokens ?? 2000,
          temperature: context.temperature ?? 0.3,
        })) {
          if (chunk.content) {
            yield chunk.content;
          }
        }
      } else {
        // Fallback to non-streaming
        const response = await this.complete(request);
        yield response.content;
      }
    } catch (error) {
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
   * Check if a specific provider is available
   */
  isProviderAvailable(provider: AIProvider): boolean {
    const status = this.factory.getProviderStatus(provider);
    return (status?.initialized && status?.available) ?? false;
  }
}

export const unifiedAI = UnifiedAIService.getInstance();
