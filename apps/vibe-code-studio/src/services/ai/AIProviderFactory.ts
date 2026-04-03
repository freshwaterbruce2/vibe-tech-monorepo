/**
 * AI Provider Factory - Centralized management for all AI providers
 * Handles provider initialization, switching, and lifecycle management
 * December 2025
 */

import { logger } from '../../services/Logger';
import type {
    AIModel,
    AIProviderConfig,
    IAIProvider
} from './AIProviderInterface';
import {
    AIProvider,
    MODEL_REGISTRY,
} from './AIProviderInterface';
import { ServiceAdapter } from './ProviderAdapter';
import { DeepSeekService } from './providers/DeepSeekService';
import { GoogleGenerativeAIService } from './providers/GoogleGenerativeAIService';
import { MoonshotService } from './providers/MoonshotService';
import { OpenRouterService } from './providers/OpenRouterService';
// Hybrid architecture: Direct APIs for Moonshot, DeepSeek, & Google, OpenRouter for everything else

export interface ProviderStatus {
  provider: AIProvider;
  initialized: boolean;
  available: boolean;
  error?: string;
  models?: AIModel[];
}

export class AIProviderFactory {
  private static instance: AIProviderFactory;
  private providers: Map<AIProvider, IAIProvider> = new Map();
  private currentProvider: AIProvider | null = null;
  private providerStatus: Map<AIProvider, ProviderStatus> = new Map();

  private constructor() {
    // Initialize provider status
    Object.values(AIProvider).forEach(provider => {
      this.providerStatus.set(provider, {
        provider,
        initialized: false,
        available: false,
      });
    });
  }

  static getInstance(): AIProviderFactory {
    if (!AIProviderFactory.instance) {
      AIProviderFactory.instance = new AIProviderFactory();
    }
    return AIProviderFactory.instance;
  }

  /**
   * Create a provider instance based on type
   * Direct APIs: Moonshot (Kimi), DeepSeek
   * OpenRouter Proxy: Everything else (Claude, GPT, Llama, Gemini, etc.)
   */
  private createProvider(provider: AIProvider): IAIProvider {
    // Moonshot: Direct API for Kimi K2.5 (262K context, vision, thinking mode)
    if (provider === AIProvider.MOONSHOT) {
      logger.info(`[AIProviderFactory] Creating Moonshot provider (direct API)`);
      return new ServiceAdapter(new MoonshotService(), provider);
    }

    // DeepSeek: Direct API for chat, coder, reasoner
    if (provider === AIProvider.DEEPSEEK) {
      logger.info(`[AIProviderFactory] Creating DeepSeek provider (direct API)`);
      return new ServiceAdapter(new DeepSeekService(), provider);
    }

    // Google: Direct API for Gemini
    if (provider === AIProvider.GOOGLE) {
      logger.info(`[AIProviderFactory] Creating Google provider (direct API)`);
      return new ServiceAdapter(new GoogleGenerativeAIService(), provider);
    }

    // OpenRouter: Everything else (massive model selection)
    logger.info(`[AIProviderFactory] Creating provider ${provider} via OpenRouter`);
    return new ServiceAdapter(new OpenRouterService(), provider);
  }

  /**
   * Initialize a specific provider
   */
  async initializeProvider(config: AIProviderConfig): Promise<IAIProvider> {
    const { provider } = config;

    try {
      logger.debug(`[AIProviderFactory] Initializing provider: ${provider}`);

      // Create provider instance if not exists
      if (!this.providers.has(provider)) {
        const providerInstance = this.createProvider(provider);
        this.providers.set(provider, providerInstance);
      }

      const providerInstance = this.providers.get(provider)!;

      // Initialize the provider
      if (providerInstance.initialize) {
        await providerInstance.initialize(config);
      }

      // Validate connection
      const isValid = await providerInstance.validateConnection();

      // Get available models
      const models = await providerInstance.getAvailableModels();

      // Update status
      this.providerStatus.set(provider, {
        provider,
        initialized: true,
        available: isValid,
        models,
      });

      logger.debug(`[AIProviderFactory] Provider ${provider} initialized successfully`);

      // Set as current provider if none is set
      if (!this.currentProvider) {
        this.currentProvider = provider;
      }

      return providerInstance;
    } catch (error: any) {
      logger.error(`[AIProviderFactory] Failed to initialize ${provider}:`, error.message);

      // Update status with error
      this.providerStatus.set(provider, {
        provider,
        initialized: false,
        available: false,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Get a provider instance (initialize if needed)
   */
  async getProvider(provider: AIProvider, config?: AIProviderConfig): Promise<IAIProvider> {
    // Check if provider is already initialized
    const status = this.providerStatus.get(provider);
    if (status?.initialized && status.available) {
      return this.providers.get(provider)!;
    }

    // Initialize provider if config provided
    if (config) {
      return this.initializeProvider(config);
    }

    throw new Error(`Provider ${provider} is not initialized. Please provide configuration.`);
  }

  /**
   * Get the current active provider
   */
  getCurrentProvider(): IAIProvider | null {
    if (!this.currentProvider) {
      return null;
    }
    return this.providers.get(this.currentProvider) ?? null;
  }

  /**
   * Set the current active provider
   */
  setCurrentProvider(provider: AIProvider): void {
    const status = this.providerStatus.get(provider);
    if (!status?.initialized || !status.available) {
      throw new Error(`Provider ${provider} is not available`);
    }

    this.currentProvider = provider;
    logger.debug(`[AIProviderFactory] Current provider set to: ${provider}`);
  }

  /**
   * Get all initialized providers
   */
  getInitializedProviders(): AIProvider[] {
    return Array.from(this.providerStatus.values())
      .filter(status => status.initialized && status.available)
      .map(status => status.provider);
  }

  /**
   * Get provider status
   */
  getProviderStatus(provider: AIProvider): ProviderStatus | undefined {
    return this.providerStatus.get(provider);
  }

  /**
   * Get all provider statuses
   */
  getAllProviderStatuses(): ProviderStatus[] {
    return Array.from(this.providerStatus.values());
  }

  /**
   * Get available models for a provider
   */
  async getModelsForProvider(provider: AIProvider): Promise<AIModel[]> {
    try {
      const providerInstance = await this.getProvider(provider);
      return providerInstance.getAvailableModels();
    } catch (error) {
      logger.error(`[AIProviderFactory] Failed to get models for ${provider}:`, error);
      return [];
    }
  }

  /**
   * Get all available models across all initialized providers
   */
  getAllAvailableModels(): AIModel[] {
    const models: AIModel[] = [];

    this.providerStatus.forEach(status => {
      if (status.initialized && status.available && status.models) {
        models.push(...status.models);
      }
    });

    return models;
  }

  /**
   * Get recommended models across all providers
   */
  getRecommendedModels(): AIModel[] {
    return this.getAllAvailableModels().filter(model => model.recommended);
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): AIModel | undefined {
    return MODEL_REGISTRY[modelId];
  }

  /**
   * Get provider for a specific model
   */
  getProviderForModel(modelId: string): AIProvider | undefined {
    const model = MODEL_REGISTRY[modelId];
    return model?.provider;
  }

  /**
   * Initialize all providers with stored API keys
   */
  async initializeAllProviders(configs: Map<AIProvider, AIProviderConfig>): Promise<void> {
    const initPromises: Promise<void>[] = [];

    configs.forEach((config, provider) => {
      initPromises.push(
        this.initializeProvider(config)
          .then(() => {
            logger.debug(`[AIProviderFactory] ${provider} initialized`);
          })
          .catch(error => {
            logger.warn(`[AIProviderFactory] Failed to initialize ${provider}:`, error.message);
          })
      );
    });

    await Promise.all(initPromises);

    // Set default provider (prefer OpenRouter → Moonshot → Google)
    const preferredOrder = [
      AIProvider.OPENROUTER,
      AIProvider.MOONSHOT,
      AIProvider.GOOGLE,
      AIProvider.DEEPSEEK,
      AIProvider.OPENAI,
      AIProvider.ANTHROPIC,
      AIProvider.GROQ,
    ];

    for (const provider of preferredOrder) {
      const status = this.providerStatus.get(provider);
      if (status?.initialized && status.available) {
        this.currentProvider = provider;
        logger.debug(`[AIProviderFactory] Default provider set to: ${provider}`);
        break;
      }
    }
  }

  /**
   * Clean up and reset all providers
   */
  async cleanup(): Promise<void> {
    // Cancel any ongoing streams
    this.providers.forEach(provider => {
      if (provider.cancelStream) {
        provider.cancelStream();
      }
    });

    // Clear all providers
    this.providers.clear();
    this.currentProvider = null;

    // Reset status
    this.providerStatus.forEach((_status, provider) => {
      this.providerStatus.set(provider, {
        provider,
        initialized: false,
        available: false,
      });
    });

    logger.debug('[AIProviderFactory] All providers cleaned up');
  }

  /**
   * Get usage statistics for a provider
   */
  async getProviderUsageStats(provider: AIProvider): Promise<{
    tokensUsed: number;
    estimatedCost: number;
    requestCount: number;
  } | null> {
    try {
      const providerInstance = this.providers.get(provider);
      if (!providerInstance) {
        return null;
      }
      return providerInstance.getUsageStats();
    } catch (error) {
      logger.error(`[AIProviderFactory] Failed to get usage stats for ${provider}:`, error);
      return null;
    }
  }

  /**
   * Get total usage statistics across all providers
   */
  async getTotalUsageStats(): Promise<{
    tokensUsed: number;
    estimatedCost: number;
    requestCount: number;
    byProvider: Map<AIProvider, { tokensUsed: number; estimatedCost: number; requestCount: number }>;
  }> {
    let totalTokens = 0;
    let totalCost = 0;
    let totalRequests = 0;
    const byProvider = new Map();

    for (const [provider, instance] of this.providers) {
      try {
        const stats = await instance.getUsageStats();
        totalTokens += stats.tokensUsed;
        totalCost += stats.estimatedCost;
        totalRequests += stats.requestCount;
        byProvider.set(provider, stats);
      } catch (_error) {
        logger.debug(`[AIProviderFactory] Could not get stats for ${provider}`);
      }
    }

    return {
      tokensUsed: totalTokens,
      estimatedCost: totalCost,
      requestCount: totalRequests,
      byProvider,
    };
  }
}
