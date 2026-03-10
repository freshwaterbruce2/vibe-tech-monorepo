/**
 * ModelRegistry - Central registry for AI model management
 * Manages model capabilities, pricing, and performance metrics
 */

export interface ModelPricing {
  inputCostPer1k: number;  // Cost per 1000 input tokens in USD
  outputCostPer1k: number; // Cost per 1000 output tokens in USD
}

export interface ModelPerformance {
  speed: number;   // 1-10 scale (10 = fastest)
  quality: number; // 1-10 scale (10 = highest quality)
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  pricing: ModelPricing;
  capabilities: string[];
  performance: ModelPerformance;
  maxTokens?: number;
  contextWindow?: number;
  description?: string; // Added Oct 20, 2025 for model details
}

export interface ModelConfig {
  models?: Partial<AIModel>[];
}

export interface CostComparison {
  cheapest: string;
  costs: Record<string, number>;
}

export class ModelRegistry {
  private models: Map<string, AIModel> = new Map();

  constructor(config?: ModelConfig) {
    this.initializeDefaultModels();

    if (config?.models) {
      config.models.forEach(model => {
        if (model.id) {
          this.registerModel(model as AIModel);
        }
      });
    }
  }

  /**
   * Initialize default models
   */
  private initializeDefaultModels(): void {
    const defaultModels: AIModel[] = [
      // Free (OpenRouter)
      {
        id: 'liquid/lfm-2.5-1.2b-thinking:free',
        name: 'LFM 2.5 1.2B Thinking (Free)',
        provider: 'openrouter',
        pricing: { inputCostPer1k: 0, outputCostPer1k: 0 },
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'code-review'],
        performance: { speed: 8, quality: 6 },
        maxTokens: 4096,
        contextWindow: 32000,
        description: 'Free lightweight reasoning model for drafts and quick tasks'
      },
      {
        id: 'liquid/lfm-2.5-1.2b-instruct:free',
        name: 'LFM 2.5 1.2B Instruct (Free)',
        provider: 'openrouter',
        pricing: { inputCostPer1k: 0, outputCostPer1k: 0 },
        capabilities: ['text-generation', 'code-generation', 'fast-inference'],
        performance: { speed: 9, quality: 6 },
        maxTokens: 4096,
        contextWindow: 32000,
        description: 'Free fast chat model for lightweight tasks'
      },

      // Low Cost (OpenRouter)
      {
        id: 'z-ai/glm-4.7-flash',
        name: 'GLM 4.7 Flash',
        provider: 'openrouter',
        pricing: { inputCostPer1k: 0.00007, outputCostPer1k: 0.0004 },
        capabilities: ['text-generation', 'code-generation', 'fast-inference'],
        performance: { speed: 10, quality: 7 },
        maxTokens: 8192,
        contextWindow: 200000,
        description: 'Ultra low-cost fast model for quick responses'
      },
      {
        id: 'deepseek/deepseek-v3.2',
        name: 'DeepSeek V3.2',
        provider: 'openrouter',
        pricing: { inputCostPer1k: 0.00025, outputCostPer1k: 0.00038 },
        capabilities: ['text-generation', 'code-generation', 'code-review', 'debugging', 'reasoning'],
        performance: { speed: 9, quality: 9 },
        maxTokens: 8192,
        contextWindow: 163800,
        description: 'Best low-cost coding model with strong quality'
      },

      // Mid Cost (OpenRouter)
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'openrouter',
        pricing: { inputCostPer1k: 0.0003, outputCostPer1k: 0.0012 },
        capabilities: ['text-generation', 'code-generation', 'code-review', 'debugging'],
        performance: { speed: 8, quality: 8 },
        maxTokens: 8192,
        contextWindow: 163800,
        description: 'General-purpose chat model with higher output cost'
      },
      {
        id: 'anthropic/claude-sonnet-4.5',
        name: 'Claude Sonnet 4.5',
        provider: 'openrouter',
        pricing: { inputCostPer1k: 0.003, outputCostPer1k: 0.015 },
        capabilities: ['text-generation', 'code-generation', 'code-review', 'reasoning', 'long-context'],
        performance: { speed: 8, quality: 10 },
        maxTokens: 16000,
        contextWindow: 200000,
        description: 'Best mid-tier balance for complex coding tasks'
      },

      // High Cost (OpenRouter)
      {
        id: 'openai/gpt-5.2-codex',
        name: 'GPT-5.2 Codex',
        provider: 'openrouter',
        pricing: { inputCostPer1k: 0.00175, outputCostPer1k: 0.014 },
        capabilities: ['text-generation', 'code-generation', 'code-review', 'reasoning', 'tool-calling', 'long-context'],
        performance: { speed: 7, quality: 10 },
        maxTokens: 16384,
        contextWindow: 400000,
        description: 'Best-in-class coding model for complex reviews and migrations'
      },
      {
        id: 'openai/gpt-5.2',
        name: 'GPT-5.2',
        provider: 'openrouter',
        pricing: { inputCostPer1k: 0.00175, outputCostPer1k: 0.014 },
        capabilities: ['text-generation', 'code-generation', 'code-review', 'reasoning', 'tool-calling', 'long-context'],
        performance: { speed: 7, quality: 9 },
        maxTokens: 16384,
        contextWindow: 400000,
        description: 'General-purpose GPT-5.2 with strong reasoning'
      },
      {
        id: 'anthropic/claude-opus-4.5',
        name: 'Claude Opus 4.5',
        provider: 'openrouter',
        pricing: { inputCostPer1k: 0.005, outputCostPer1k: 0.025 },
        capabilities: ['text-generation', 'code-generation', 'code-review', 'reasoning', 'long-context'],
        performance: { speed: 6, quality: 10 },
        maxTokens: 16000,
        contextWindow: 200000,
        description: 'Premium quality reasoning at higher cost'
      }
    ];

    defaultModels.forEach(model => this.models.set(model.id, model));
  }

  /**
   * Get model by ID
   */
  getModel(id: string): AIModel | null {
    return this.models.get(id) ?? null;
  }

  /**
   * List all models
   */
  listModels(): AIModel[] {
    return Array.from(this.models.values());
  }

  /**
   * List models by provider
   */
  listModelsByProvider(provider: string): AIModel[] {
    return this.listModels().filter(m => m.provider === provider);
  }

  /**
   * List models by capability
   */
  listModelsByCapability(capability: string): AIModel[] {
    return this.listModels().filter(m => m.capabilities.includes(capability));
  }

  /**
   * Calculate request cost
   */
  calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = this.getModel(modelId);
    if (!model) {return 0;}

    const inputCost = (inputTokens / 1000) * model.pricing.inputCostPer1k;
    const outputCost = (outputTokens / 1000) * model.pricing.outputCostPer1k;

    return inputCost + outputCost;
  }

  /**
   * Compare costs across models
   */
  compareCosts(modelIds: string[], inputTokens: number, outputTokens: number): CostComparison {
    const costs: Record<string, number> = {};
    let cheapest = '';
    let lowestCost = Infinity;

    for (const id of modelIds) {
      const cost = this.calculateCost(id, inputTokens, outputTokens);
      costs[id] = cost;

      if (cost < lowestCost) {
        lowestCost = cost;
        cheapest = id;
      }
    }

    return { cheapest, costs };
  }

  /**
   * Check if model supports capability
   */
  supportsCapability(modelId: string, capability: string): boolean {
    const model = this.getModel(modelId);
    return model ? model.capabilities.includes(capability) : false;
  }

  /**
   * Get recommended model for task
   */
  getRecommendedModel(taskType: string): AIModel {
    const models = this.listModelsByCapability(taskType);

    if (models.length === 0) {
      // Fallback to general-purpose model
      const fallback = this.getModel('deepseek/deepseek-v3.2');
      if (fallback) return fallback;
      throw new Error(`No models available for task type: ${taskType}`);
    }

    // Rank by cost efficiency (quality / cost)
    const ranked = models.sort((a, b) => {
      const aEfficiency = a.performance.quality / (a.pricing.inputCostPer1k + a.pricing.outputCostPer1k);
      const bEfficiency = b.performance.quality / (b.pricing.inputCostPer1k + b.pricing.outputCostPer1k);
      return bEfficiency - aEfficiency;
    });

    return ranked[0]!;
  }

  /**
   * Rank models by speed
   */
  rankBySpeed(): AIModel[] {
    return this.listModels().sort((a, b) => b.performance.speed - a.performance.speed);
  }

  /**
   * Rank models by quality
   */
  rankByQuality(): AIModel[] {
    return this.listModels().sort((a, b) => b.performance.quality - a.performance.quality);
  }

  /**
   * Rank models by cost efficiency
   */
  rankByCostEfficiency(): AIModel[] {
    return this.listModels().sort((a, b) => {
      const aEfficiency = a.performance.quality / (a.pricing.inputCostPer1k + a.pricing.outputCostPer1k);
      const bEfficiency = b.performance.quality / (b.pricing.inputCostPer1k + b.pricing.outputCostPer1k);
      return bEfficiency - aEfficiency;
    });
  }

  /**
   * Register new model
   */
  registerModel(model: AIModel): void {
    this.models.set(model.id, model);
  }

  /**
   * Update existing model
   */
  updateModel(id: string, updates: Partial<AIModel>): void {
    const existing = this.models.get(id);
    if (existing) {
      this.models.set(id, { ...existing, ...updates });
    }
  }

  /**
   * Remove model
   */
  removeModel(id: string): void {
    this.models.delete(id);
  }

  /**
   * Select best model for budget
   */
  selectForBudget(maxCost: number, capability: string): AIModel | null {
    const models = this.listModelsByCapability(capability);

    // Filter by estimated cost (1000 input + 500 output tokens)
    const affordable = models.filter(m => {
      const cost = this.calculateCost(m.id, 1000, 500);
      return cost <= maxCost;
    });

    if (affordable.length === 0) {return null;}

    // Return highest quality within budget
    return affordable.sort((a, b) => b.performance.quality - a.performance.quality)[0] ?? null;
  }

  /**
   * Select fastest model for capability
   */
  selectFastest(capability: string): AIModel | null {
    const models = this.listModelsByCapability(capability);
    if (models.length === 0) {return null;}

    return models.sort((a, b) => b.performance.speed - a.performance.speed)[0] ?? null;
  }

  /**
   * Select highest quality model
   */
  selectHighestQuality(capability: string): AIModel | null {
    const models = this.listModelsByCapability(capability);
    if (models.length === 0) {return null;}

    return models.sort((a, b) => b.performance.quality - a.performance.quality)[0] ?? null;
  }
}
