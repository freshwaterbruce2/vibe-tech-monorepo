/**
 * Canonical OpenRouter model aliases.
 *
 * Maps human-friendly / legacy / shorthand ids to verified-live `author/slug`
 * OpenRouter model ids. Verified 2026-06-22 against the live OpenRouter
 * /api/v1/models catalog. Re-run scripts/verify-model-ids if editing.
 */
export const MODEL_ALIASES: Record<string, string> = {
  // ========================================
  // OpenAI - GPT-5 Series (January 2026)
  // ========================================
  'gpt-5.3-codex': 'openai/gpt-5.3-codex',
  'gpt-5.2-codex': 'openai/gpt-5.2-codex',
  'gpt-5.2-pro': 'openai/gpt-5.2-pro',
  'gpt-5.2': 'openai/gpt-5.2',
  'gpt-5.1-codex-max': 'openai/gpt-5.1-codex-max',
  'gpt-5-mini': 'openai/gpt-5-mini',

  // OpenAI Common Aliases
  'gpt-5': 'openai/gpt-5.2',
  'gpt-5-codex': 'openai/gpt-5.2-codex',
  'gpt-latest': 'openai/gpt-5.2-pro',
  'gpt-fast': 'openai/gpt-5-mini',
  'gpt-code': 'openai/gpt-5.2-codex',

  // OpenAI Legacy (GPT-4 era)
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'o1-preview': 'openai/o1',
  'o1-mini': 'openai/o4-mini',

  // ========================================
  // Anthropic - Claude 4.5 Series (January 2026)
  // ========================================
  'claude-4.6-opus': 'anthropic/claude-opus-4.6',
  'claude-4.6-sonnet': 'anthropic/claude-sonnet-4.6',
  'claude-4.5-opus': 'anthropic/claude-opus-4.5',
  'claude-opus-4.5': 'anthropic/claude-opus-4.5',
  'claude-4.5-sonnet': 'anthropic/claude-sonnet-4.5',
  'claude-sonnet-4.5': 'anthropic/claude-sonnet-4.5',

  // Claude Common Aliases
  'claude-opus': 'anthropic/claude-opus-4.5',
  'claude-sonnet': 'anthropic/claude-sonnet-4.5',
  'claude-latest': 'anthropic/claude-opus-4.5',
  'claude': 'anthropic/claude-sonnet-4.5',

  // Claude Legacy (3.5 series - still widely used)
  'claude-3.5-sonnet': 'anthropic/claude-sonnet-4.5',
  'claude-3-5-sonnet': 'anthropic/claude-sonnet-4.5',
  'claude-3-opus': 'anthropic/claude-opus-4.5',
  'claude-3-haiku': 'anthropic/claude-3-haiku',

  // ========================================
  // Google - Gemini 2.5/3 Series (January 2026)
  // ========================================
  'gemini-3.1-pro': 'google/gemini-3.1-pro-preview',
  'gemini-3-flash': 'google/gemini-3-flash-preview',
  'gemini-3-flash-preview': 'google/gemini-3-flash-preview',
  'gemini-2.5-pro': 'google/gemini-2.5-pro',
  'gemini-2.5-flash': 'google/gemini-2.5-flash',

  // Gemini Common Aliases
  'gemini-flash': 'google/gemini-3-flash-preview',
  'gemini-pro': 'google/gemini-2.5-pro',
  'gemini-latest': 'google/gemini-2.5-pro',

  // Gemini Legacy
  'gemini-2.0-flash-exp': 'google/gemma-4-31b-it:free',
  'gemini-1.5-pro': 'google/gemini-2.5-pro',
  'gemini-1.5-flash': 'google/gemini-2.5-flash',

  // ========================================
  // DeepSeek V3/V4 & R1 (Updated June 2026)
  // ========================================
  'deepseek-v4-flash': 'deepseek/deepseek-v4-flash',
  'deepseek-v3.2': 'deepseek/deepseek-v3.2',
  'deepseek-v3': 'deepseek/deepseek-v3.2',
  'deepseek-r1': 'deepseek/deepseek-r1',

  // DeepSeek Aliases
  'deepseek-reasoner': 'deepseek/deepseek-r1',
  'deepseek-chat': 'deepseek/deepseek-v3.2',
  'deepseek': 'deepseek/deepseek-v3.2',
  'deepseek-latest': 'deepseek/deepseek-v3.2',

  // ========================================
  // Low/Free Models (Updated June 2026)
  // ========================================
  'lfm-2.5-thinking': 'liquid/lfm-2.5-1.2b-thinking:free',
  'lfm-2.5-instruct': 'liquid/lfm-2.5-1.2b-instruct:free',
  'kimi-k2.7-code': 'moonshotai/kimi-k2.7-code',
  'kimi-2.5-pro': 'moonshotai/kimi-k2.5',
  'glm-5.2': 'z-ai/glm-5.2',
  'glm-5': 'z-ai/glm-5',
  'cohere-north-mini-code': 'cohere/north-mini-code:free',
  'or-fusion': 'openrouter/fusion',
  'glm-4.7-flash': 'z-ai/glm-4.7-flash',

  // ========================================
  // xAI - Grok 4 Series (January 2026)
  // ========================================
  'grok-4': 'x-ai/grok-4.3',
  'grok-4.1-fast': 'x-ai/grok-4.20',
  'grok-code-fast': 'x-ai/grok-4.3',

  // Grok Aliases
  'grok': 'x-ai/grok-4.3',
  'grok-fast': 'x-ai/grok-4.20',
  'grok-code': 'x-ai/grok-4.3',
  'grok-latest': 'x-ai/grok-4.3',

  // Grok Legacy
  'grok-beta': 'x-ai/grok-4.3',

  // ========================================
  // FREE MODELS - Cost-Effective for Simple Tasks (January 2026)
  // ========================================

  // Meta - Llama 3.x Series (FREE)
  'llama-3.3-70b': 'meta-llama/llama-3.3-70b-instruct:free',
  'llama-3.2-90b': 'meta-llama/llama-3.2-11b-vision-instruct',
  'llama-3.2-11b': 'meta-llama/llama-3.2-11b-vision-instruct',
  'llama-3.2-3b': 'meta-llama/llama-3.2-3b-instruct:free',
  'llama-3.2-1b': 'meta-llama/llama-3.2-3b-instruct:free',
  'llama-3.1-405b': 'meta-llama/llama-3.3-70b-instruct:free',
  'llama-3.1-70b': 'meta-llama/llama-3.3-70b-instruct:free',
  'llama-3.1-8b': 'meta-llama/llama-3.2-3b-instruct:free',

  // Llama Aliases
  'llama-free': 'meta-llama/llama-3.3-70b-instruct:free',
  'llama-fast': 'meta-llama/llama-3.2-3b-instruct:free',
  'llama-vision': 'meta-llama/llama-3.2-11b-vision-instruct',
  'free-llama': 'meta-llama/llama-3.3-70b-instruct:free',

  // Alibaba - Qwen 2.5 Series (FREE)
  'qwen-2.5-72b': 'qwen/qwen3-next-80b-a3b-instruct:free',
  'qwen-2.5-coder-32b': 'qwen/qwen3-coder:free',
  'qwen-2.5-7b': 'qwen/qwen3-next-80b-a3b-instruct:free',
  'qwq-32b': 'qwen/qwen3-next-80b-a3b-instruct:free',

  // Qwen Aliases
  'qwen-free': 'qwen/qwen3-next-80b-a3b-instruct:free',
  'qwen-code': 'qwen/qwen3-coder:free',
  'qwen-fast': 'qwen/qwen3-next-80b-a3b-instruct:free',
  'free-qwen': 'qwen/qwen3-next-80b-a3b-instruct:free',

  // Qwen model name fixes (HuggingFace naming → OpenRouter naming)
  'qwen/qwen3-coder': 'qwen/qwen3-coder:free',
  'Qwen/Qwen2.5-Coder-7B-Instruct': 'qwen/qwen3-coder:free',
  'Qwen/Qwen2.5-Coder-32B-Instruct': 'qwen/qwen3-coder:free',

  // Microsoft - Phi-3.5 Series (FREE)
  'phi-3.5-mini': 'microsoft/phi-4-mini-instruct',
  'phi-3-mini': 'microsoft/phi-4-mini-instruct',
  'phi-3-medium': 'microsoft/phi-4',

  // Phi Aliases
  'phi-free': 'microsoft/phi-4-mini-instruct',
  'free-phi': 'microsoft/phi-4-mini-instruct',

  // Mistral - Free Tier
  'mistral-7b': 'mistralai/ministral-8b-2512',
  'mixtral-8x7b': 'mistralai/mixtral-8x22b-instruct',

  // Mistral Aliases
  'mistral-free': 'mistralai/ministral-8b-2512',
  'free-mistral': 'mistralai/ministral-8b-2512',

  // Google - Gemini Free Tier
  'gemini-free': 'google/gemma-4-31b-it:free',
  'free-gemini': 'google/gemma-4-31b-it:free',
  'gemini-flash-free': 'google/gemma-4-31b-it:free',

  // ========================================
  // SMART ALIASES - Auto-select best free model for task type
  // ========================================
  'free': 'meta-llama/llama-3.3-70b-instruct:free',
  'free-fast': 'meta-llama/llama-3.2-3b-instruct:free',
  'free-code': 'qwen/qwen3-coder:free',
  'free-reasoning': 'qwen/qwen3-next-80b-a3b-instruct:free',
  'free-vision': 'meta-llama/llama-3.2-11b-vision-instruct',
};

/**
 * Map a model id or alias to a canonical OpenRouter `author/slug` id.
 *
 * - Registered aliases resolve to their canonical id.
 * - If the value already contains a slash, assume it's a valid OpenRouter id.
 * - Unknown slugs without a slash fall back to `openai/<model>`.
 */
export function resolveModelId(model: string): string {
  const mapped = MODEL_ALIASES[model];
  if (mapped) return mapped;
  if (model.includes('/')) return model;
  return `openai/${model}`;
}
