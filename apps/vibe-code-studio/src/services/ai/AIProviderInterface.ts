/**
 * AI Provider Interface - Abstraction for multiple AI model providers
 * Supports OpenAI, Anthropic, Google, DeepSeek, and others
 */

import type { ChatMessage as ChatMessageType } from '../../types/ai';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export enum AIProvider {
  OPENROUTER = 'openrouter',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  DEEPSEEK = 'deepseek',
  GROQ = 'groq',
  PERPLEXITY = 'perplexity',
  TOGETHER = 'together',
  OLLAMA = 'ollama',
  LOCAL = 'local',
  MOONSHOT = 'moonshot',
}

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  contextWindow: number;
  maxOutput: number;
  costPerMillionInput: number;
  costPerMillionOutput: number;
  capabilities: ModelCapability[];
  recommended?: boolean;
}

export enum ModelCapability {
  CHAT = 'chat',
  CODE_COMPLETION = 'code_completion',
  CODE_GENERATION = 'code_generation',
  FUNCTION_CALLING = 'function_calling',
  VISION = 'vision',
  WEB_SEARCH = 'web_search',
  EXTENDED_THINKING = 'extended_thinking',
  MULTI_FILE_EDIT = 'multi_file_edit',
}

// Model Registry with January 2026 OpenRouter tiers (Updated 2026-02-01)
export const MODELS_ARRAY: AIModel[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // BEST FOR CODING TIER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'openai/gpt-5.3-codex',
    name: 'GPT-5.3 Codex',
    provider: AIProvider.OPENROUTER,
    contextWindow: 200000,
    maxOutput: 32768,
    costPerMillionInput: 2.00,
    costPerMillionOutput: 8.00,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.CODE_COMPLETION, ModelCapability.MULTI_FILE_EDIT],
    recommended: true,
  },
  {
    id: 'anthropic/claude-sonnet-4.6',
    name: 'Claude 4.6 Sonnet (Best for Coding)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 250000,
    maxOutput: 16384,
    costPerMillionInput: 3.00,
    costPerMillionOutput: 15.00,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.CODE_COMPLETION, ModelCapability.MULTI_FILE_EDIT],
    recommended: true,
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct',
    name: 'Qwen 2.5 Coder 32B',
    provider: AIProvider.OPENROUTER,
    contextWindow: 32768,
    maxOutput: 8192,
    costPerMillionInput: 0.35,
    costPerMillionOutput: 0.40,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.CODE_COMPLETION],
    recommended: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FREE TIER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (Free)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 1048576,
    maxOutput: 8192,
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.VISION],
    recommended: true,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B (Free)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 131072,
    maxOutput: 8192,
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION],
    recommended: true,
  },
  {
    id: 'deepseek/deepseek-r1', // Alias mapped to free or standard depending on usage
    name: 'DeepSeek R1',
    provider: AIProvider.OPENROUTER,
    contextWindow: 163840,
    maxOutput: 8192,
    costPerMillionInput: 0.55,
    costPerMillionOutput: 2.19,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.EXTENDED_THINKING],
    recommended: true,
  },
  {
    id: 'liquid/lfm-2.5-1.2b-thinking:free',
    name: 'LFM 2.5 1.2B Thinking (Free)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 32768,
    maxOutput: 8192,
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.EXTENDED_THINKING],
    recommended: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOW COST TIER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: AIProvider.OPENROUTER,
    contextWindow: 1048576,
    maxOutput: 8192,
    costPerMillionInput: 0.10,
    costPerMillionOutput: 0.40,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.VISION],
    recommended: true,
  },
  {
    id: 'deepseek/deepseek-v3.2',
    name: 'DeepSeek V3.2',
    provider: AIProvider.OPENROUTER,
    contextWindow: 65536,
    maxOutput: 8192,
    costPerMillionInput: 0.14,
    costPerMillionOutput: 0.28,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.CODE_COMPLETION],
    recommended: true,
  },
  {
    id: 'x-ai/grok-4.1-fast',
    name: 'Grok 4.1 Fast',
    provider: AIProvider.OPENROUTER,
    contextWindow: 128000,
    maxOutput: 16384,
    costPerMillionInput: 0.15,
    costPerMillionOutput: 0.60,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION],
    recommended: true,
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: AIProvider.OPENROUTER,
    contextWindow: 128000,
    maxOutput: 16384,
    costPerMillionInput: 0.15,
    costPerMillionOutput: 0.60,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.VISION],
    recommended: true,
  },
  {
    id: 'moonshot/kimi-2.5-pro',
    name: 'Kimi 2.5 Pro (Coding)',
    provider: AIProvider.MOONSHOT,
    contextWindow: 200000,
    maxOutput: 8192,
    costPerMillionInput: 0.20,
    costPerMillionOutput: 0.80,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION],
    recommended: true,
  },
  {
    id: 'z-ai/glm-5',
    name: 'GLM 5',
    provider: AIProvider.OPENROUTER,
    contextWindow: 128000,
    maxOutput: 8192,
    costPerMillionInput: 0.15,
    costPerMillionOutput: 0.50,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.EXTENDED_THINKING],
    recommended: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM COST TIER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'google/gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    provider: AIProvider.OPENROUTER,
    contextWindow: 2000000,
    maxOutput: 8192,
    costPerMillionInput: 1.25,
    costPerMillionOutput: 5.00,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.VISION, ModelCapability.EXTENDED_THINKING],
    recommended: true,
  },
  {
    id: 'openai/gpt-5.2',
    name: 'GPT-5.2',
    provider: AIProvider.OPENROUTER,
    contextWindow: 128000,
    maxOutput: 16384,
    costPerMillionInput: 2.50,
    costPerMillionOutput: 10.00,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.VISION],
    recommended: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH COST TIER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'openai/gpt-5.2-pro',
    name: 'GPT-5.2 Pro',
    provider: AIProvider.OPENROUTER,
    contextWindow: 128000,
    maxOutput: 16384,
    costPerMillionInput: 10.00,
    costPerMillionOutput: 40.00,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING],
    recommended: true,
  },
  {
    id: 'anthropic/claude-opus-4.6',
    name: 'Claude 4.6 Opus',
    provider: AIProvider.OPENROUTER,
    contextWindow: 250000,
    maxOutput: 8192,
    costPerMillionInput: 15.00,
    costPerMillionOutput: 75.00,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.VISION],
    recommended: true,
  },
  {
    id: 'openai/o1-preview',
    name: 'OpenAI o1 Preview',
    provider: AIProvider.OPENROUTER,
    contextWindow: 200000,
    maxOutput: 100000,
    costPerMillionInput: 15.00,
    costPerMillionOutput: 60.00,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.EXTENDED_THINKING],
    recommended: false,
  }
];

// Convert to Record for easy lookup
export const MODEL_REGISTRY: Record<string, AIModel> = Object.fromEntries(
  MODELS_ARRAY.map(model => [model.id, model])
);

// Provider interface types - re-export from types/ai.ts for compatibility
export type ChatMessage = ChatMessageType;

export interface CompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface CompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finishReason: string;
    index: number;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  created: number;
  content: string;
}

export interface StreamCompletionResponse {
  id: string;
  choices: Array<{
    delta: { content: string };
    index: number;
  }>;
  model: string;
  created: number;
  content: string;
}

export interface IAIProvider {
  initialize(config: AIProviderConfig): Promise<void>;
  complete(model: string, options: CompletionOptions): Promise<CompletionResponse>;
  streamComplete(model: string, options: CompletionOptions): AsyncGenerator<StreamCompletionResponse>;
  getAvailableModels(): Promise<AIModel[]>;
  validateConnection(): Promise<boolean>;
  getUsageStats(): Promise<{ tokensUsed: number; estimatedCost: number; requestCount: number }>;
  cancelStream(): void;
}
