/**
 * AI Provider Interface - Abstraction for multiple AI model providers
 * Supports OpenAI, Anthropic, Google, DeepSeek, and others
 */

import type { AICompletionRequest, ChatMessage as ChatMessageType } from '../../types/ai';

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

// Model Registry with July 2026 OpenRouter tiers (Updated 2026-07-02, verified
// against the live openrouter.ai/api/v1/models catalog)
export const MODELS_ARRAY: AIModel[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // BEST FOR CODING TIER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'anthropic/claude-opus-4.8',
    name: 'Claude Opus 4.8 (Frontier Coding)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 1000000,
    maxOutput: 32768,
    costPerMillionInput: 5.0,
    costPerMillionOutput: 25.0,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.CODE_COMPLETION,
      ModelCapability.MULTI_FILE_EDIT,
      ModelCapability.VISION,
      ModelCapability.EXTENDED_THINKING,
    ],
    recommended: true,
  },
  {
    id: 'deepseek/deepseek-v4-pro',
    name: 'DeepSeek V4 Pro (Best Value Coding)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 1048576,
    maxOutput: 16384,
    costPerMillionInput: 0.43,
    costPerMillionOutput: 0.87,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.CODE_COMPLETION,
      ModelCapability.MULTI_FILE_EDIT,
      ModelCapability.EXTENDED_THINKING,
    ],
    recommended: true,
  },
  {
    id: 'openai/gpt-5.3-codex',
    name: 'GPT-5.3 Codex',
    provider: AIProvider.OPENROUTER,
    contextWindow: 200000,
    maxOutput: 32768,
    costPerMillionInput: 2.0,
    costPerMillionOutput: 8.0,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.CODE_COMPLETION,
      ModelCapability.MULTI_FILE_EDIT,
    ],
    recommended: true,
  },
  {
    id: 'openai/gpt-5.2-codex',
    name: 'GPT-5.2 Codex',
    provider: AIProvider.OPENROUTER,
    contextWindow: 400000,
    // OpenRouter's published max_completion_tokens for openai/gpt-5.2-codex is 128000.
    maxOutput: 128000,
    costPerMillionInput: 1.75,
    costPerMillionOutput: 14.0,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.CODE_COMPLETION,
      ModelCapability.MULTI_FILE_EDIT,
    ],
    recommended: true,
  },
  {
    id: 'anthropic/claude-sonnet-4.6',
    name: 'Claude 4.6 Sonnet (Best for Coding)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 1000000,
    maxOutput: 16384,
    costPerMillionInput: 3.0,
    costPerMillionOutput: 15.0,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.CODE_COMPLETION,
      ModelCapability.MULTI_FILE_EDIT,
    ],
    recommended: true,
  },
  {
    id: 'qwen/qwen3.7-plus',
    name: 'Qwen 3.7 Plus',
    provider: AIProvider.OPENROUTER,
    contextWindow: 1000000,
    maxOutput: 16384,
    costPerMillionInput: 0.32,
    costPerMillionOutput: 1.28,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.CODE_COMPLETION,
    ],
    recommended: true,
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct',
    name: 'Qwen 2.5 Coder 32B (Legacy)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 32768,
    maxOutput: 8192,
    costPerMillionInput: 0.35,
    costPerMillionOutput: 0.4,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.CODE_COMPLETION,
    ],
    recommended: false,
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
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.EXTENDED_THINKING,
    ],
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
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.EXTENDED_THINKING,
    ],
    recommended: true,
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'Nemotron 3 Ultra 550B (Free)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 1000000,
    maxOutput: 8192,
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.EXTENDED_THINKING,
    ],
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
    costPerMillionInput: 0.1,
    costPerMillionOutput: 0.4,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.VISION],
    recommended: true,
  },
  {
    id: 'deepseek/deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    provider: AIProvider.OPENROUTER,
    contextWindow: 1048576,
    maxOutput: 8192,
    costPerMillionInput: 0.09,
    costPerMillionOutput: 0.18,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.CODE_COMPLETION,
    ],
    recommended: true,
  },
  {
    id: 'deepseek/deepseek-v3',
    name: 'DeepSeek V3 (Legacy)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 65536,
    maxOutput: 8192,
    costPerMillionInput: 0.2,
    costPerMillionOutput: 0.77,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.CODE_COMPLETION,
    ],
    recommended: false,
  },
  {
    id: 'deepseek/deepseek-v3.2',
    name: 'DeepSeek V3.2',
    provider: AIProvider.OPENROUTER,
    contextWindow: 65536,
    maxOutput: 8192,
    costPerMillionInput: 0.14,
    costPerMillionOutput: 0.28,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.CODE_COMPLETION,
    ],
    recommended: true,
  },
  {
    id: 'x-ai/grok-4.1-fast',
    name: 'Grok 4.1 Fast',
    provider: AIProvider.OPENROUTER,
    contextWindow: 128000,
    maxOutput: 16384,
    costPerMillionInput: 0.15,
    costPerMillionOutput: 0.6,
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
    costPerMillionOutput: 0.6,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.VISION],
    recommended: true,
  },
  {
    id: 'moonshotai/kimi-k2.7-code',
    name: 'Kimi K2.7 Code (Best for Coding)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 262144,
    maxOutput: 8192,
    costPerMillionInput: 0.61,
    costPerMillionOutput: 3.07,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.CODE_COMPLETION,
      ModelCapability.MULTI_FILE_EDIT,
    ],
    recommended: true,
  },
  {
    id: 'moonshot/kimi-2.5-pro',
    name: 'Kimi 2.5 Pro (Coding)',
    provider: AIProvider.MOONSHOT,
    contextWindow: 200000,
    maxOutput: 8192,
    costPerMillionInput: 0.2,
    costPerMillionOutput: 0.8,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION],
    recommended: true,
  },
  {
    id: 'cohere/north-mini-code:free',
    name: 'Cohere North Mini Code (Free)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 256000,
    maxOutput: 8192,
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.CODE_COMPLETION,
    ],
    recommended: true,
  },
  {
    id: 'z-ai/glm-5.2',
    name: 'GLM 5.2 (Reasoning)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 1048576,
    maxOutput: 8192,
    costPerMillionInput: 1.0,
    costPerMillionOutput: 4.0,
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
    costPerMillionOutput: 0.5,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.EXTENDED_THINKING,
    ],
    recommended: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM COST TIER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'google/gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    provider: AIProvider.OPENROUTER,
    contextWindow: 1048576,
    maxOutput: 16384,
    costPerMillionInput: 1.5,
    costPerMillionOutput: 9.0,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.VISION],
    recommended: true,
  },
  {
    id: 'x-ai/grok-4.3',
    name: 'Grok 4.3',
    provider: AIProvider.OPENROUTER,
    contextWindow: 1000000,
    maxOutput: 16384,
    costPerMillionInput: 1.25,
    costPerMillionOutput: 2.5,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION],
    recommended: true,
  },
  {
    id: 'google/gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    provider: AIProvider.OPENROUTER,
    contextWindow: 2000000,
    maxOutput: 8192,
    costPerMillionInput: 1.25,
    costPerMillionOutput: 5.0,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.VISION,
      ModelCapability.EXTENDED_THINKING,
    ],
    recommended: true,
  },
  {
    id: 'openai/gpt-5.2',
    name: 'GPT-5.2',
    provider: AIProvider.OPENROUTER,
    contextWindow: 128000,
    maxOutput: 16384,
    costPerMillionInput: 2.5,
    costPerMillionOutput: 10.0,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.VISION],
    recommended: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH COST TIER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'openai/gpt-5.5',
    name: 'GPT-5.5',
    provider: AIProvider.OPENROUTER,
    contextWindow: 1050000,
    maxOutput: 32768,
    costPerMillionInput: 5.0,
    costPerMillionOutput: 30.0,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.VISION,
      ModelCapability.FUNCTION_CALLING,
      ModelCapability.EXTENDED_THINKING,
    ],
    recommended: true,
  },
  {
    id: 'anthropic/claude-fable-5',
    name: 'Claude Fable 5 (Frontier)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 1000000,
    maxOutput: 32768,
    costPerMillionInput: 10.0,
    costPerMillionOutput: 50.0,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.VISION,
      ModelCapability.EXTENDED_THINKING,
    ],
    recommended: true,
  },
  {
    id: 'openai/gpt-5.2-pro',
    name: 'GPT-5.2 Pro (Legacy)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 128000,
    maxOutput: 16384,
    costPerMillionInput: 10.0,
    costPerMillionOutput: 40.0,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.VISION,
      ModelCapability.FUNCTION_CALLING,
    ],
    recommended: false,
  },
  {
    id: 'anthropic/claude-opus-4.6',
    name: 'Claude 4.6 Opus (Legacy)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 250000,
    maxOutput: 8192,
    costPerMillionInput: 15.0,
    costPerMillionOutput: 75.0,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.VISION],
    recommended: false,
  },
  {
    id: 'openai/o1-preview',
    name: 'OpenAI o1 Preview',
    provider: AIProvider.OPENROUTER,
    contextWindow: 200000,
    maxOutput: 100000,
    costPerMillionInput: 15.0,
    costPerMillionOutput: 60.0,
    capabilities: [
      ModelCapability.CHAT,
      ModelCapability.CODE_GENERATION,
      ModelCapability.EXTENDED_THINKING,
    ],
    recommended: false,
  },
];

// Convert to Record for easy lookup
export const MODEL_REGISTRY: Record<string, AIModel> = Object.fromEntries(
  MODELS_ARRAY.map(model => [model.id, model])
);

/**
 * Single source of truth for the app's default model.
 *
 * Best-value OpenRouter coding model: works with a single OpenRouter key and
 * needs no separate Moonshot key. Every provider default that falls back to an
 * app-level model should reference this constant rather than hardcoding an id —
 * a bare 'moonshot/kimi-2.5-pro' default routes to Moonshot's direct API and
 * 503s unless a Moonshot key is configured server-side.
 */
export const DEFAULT_MODEL = 'deepseek/deepseek-v4-pro';

/** Default latency-sensitive model for inline completion and quick fixes. */
export const DEFAULT_FAST_MODEL = 'deepseek/deepseek-v4-flash';

// Provider interface types - re-export from types/ai.ts for compatibility
export type ChatMessage = ChatMessageType;

export interface CompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
  reasoningEffort?: 'low' | 'medium' | 'high';
  responseFormat?: {
    type: 'json_schema';
    jsonSchema: { name: string; strict: true; schema: Record<string, unknown> };
  };
  providerPreferences?: { requireParameters: boolean };
  tools?: AICompletionRequest['tools'];
  toolChoice?: AICompletionRequest['toolChoice'];
}

export interface CompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
      toolCalls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
      }>;
    };
    finishReason?: string;
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
  streamComplete(
    model: string,
    options: CompletionOptions
  ): AsyncGenerator<StreamCompletionResponse>;
  getAvailableModels(): Promise<AIModel[]>;
  validateConnection(): Promise<boolean>;
  getUsageStats(): Promise<{ tokensUsed: number; estimatedCost: number; requestCount: number }>;
  cancelStream(): void;
}
