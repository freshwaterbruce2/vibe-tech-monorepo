/**
 * Token Counter Utility
 * Provides accurate token estimation for LLM API calls
 */

// Note: Install gpt-tokenizer for production use: pnpm add gpt-tokenizer --filter @vibetech/shared-utils
// For now, we'll use a fallback estimation method

export interface TokenEstimate {
  tokens: number;
  method: 'accurate' | 'estimated';
}

/**
 * Estimate tokens in a text string
 * Falls back to rough estimation if tokenizer unavailable
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  try {
    // Try to use gpt-tokenizer if available
    // const { encode } = await import('gpt-tokenizer');
    // return encode(text).length;

    // Fallback: Use rough estimation (1 token ≈ 4 characters)
    // This is conservative and works well for English text
    return Math.ceil(text.length / 4);
  } catch {
    // Ultra-safe fallback
    return Math.ceil(text.length / 4);
  }
}

/**
 * Estimate tokens with metadata about estimation method
 */
export function estimateTokensWithMetadata(text: string): TokenEstimate {
  const tokens = estimateTokens(text);
  return {
    tokens,
    method: 'estimated', // Will be 'accurate' when using real tokenizer
  };
}

/**
 * Calculate total tokens for an array of messages
 */
export function estimateMessageTokens(
  messages: Array<{ role: string; content: string }>
): number {
  return messages.reduce((total, msg) => {
    // Add tokens for role (usually 1-2 tokens)
    const roleTokens = 2;
    const contentTokens = estimateTokens(msg.content);
    return total + roleTokens + contentTokens;
  }, 0);
}

/**
 * Truncate messages to fit within token limit
 * Keeps system message and newest messages
 */
export function truncateToTokenLimit<T extends { role: string; content: string }>(
  messages: T[],
  maxTokens: number,
  options: {
    keepSystemMessage?: boolean;
    reserveTokens?: number; // Tokens to reserve for completion
  } = {}
): T[] {
  const { keepSystemMessage = true, reserveTokens = 1000 } = options;
  const availableTokens = maxTokens - reserveTokens;

  let totalTokens = 0;
  const result: T[] = [];

  // Always keep system message if requested
  if (keepSystemMessage && messages[0]?.role === 'system') {
    const systemMsg = messages[0];
    result.push(systemMsg);
    totalTokens += estimateTokens(systemMsg.content) + 2; // +2 for role
  }

  // Add messages from newest to oldest until limit
  const startIndex = keepSystemMessage && messages[0]?.role === 'system' ? 1 : 0;
  for (let i = messages.length - 1; i >= startIndex; i--) {
    const msg = messages[i]!;
    const msgTokens = estimateTokens(msg.content) + 2; // +2 for role

    if (totalTokens + msgTokens > availableTokens) {
      break;
    }

    result.unshift(msg);
    totalTokens += msgTokens;
  }

  // Re-add system message at the beginning if it was kept
  if (keepSystemMessage && messages[0]?.role === 'system' && result[0]?.role !== 'system') {
    result.unshift(messages[0]);
  }

  return result;
}

/**
 * Check if messages fit within token limit
 */
export function fitsWithinTokenLimit(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number
): { fits: boolean; totalTokens: number; overage: number } {
  const totalTokens = estimateMessageTokens(messages);
  const fits = totalTokens <= maxTokens;
  const overage = Math.max(0, totalTokens - maxTokens);

  return { fits, totalTokens, overage };
}

/**
 * Truncate a single text to token limit
 */
export function truncateTextToTokens(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);

  if (estimatedTokens <= maxTokens) {
    return text;
  }

  // Calculate approximate character limit
  const ratio = maxTokens / estimatedTokens;
  const charLimit = Math.floor(text.length * ratio);

  // Truncate and add ellipsis
  return text.substring(0, charLimit) + '...';
}

/**
 * Model-specific context window limits
 */
export const MODEL_CONTEXT_LIMITS = {
  'deepseek-chat': 64000,
  'deepseek-coder': 64000,
  'gpt-4-turbo': 128000,
  'gpt-4': 8192,
  'gpt-3.5-turbo': 16385,
  'claude-3-opus': 200000,
  'claude-3-sonnet': 200000,
  'claude-3-haiku': 200000,
  'claude-sonnet-4-6': 200000,
  'claude-opus-4-1': 200000,
  'gemini-1.5-pro': 2000000,
  'gemini-1.5-flash': 1000000,
  'gemini-2.0-flash': 1000000,
  'gemini-2.5-pro': 1000000,
  'gemini-2.5-flash': 1000000,
  'gemini-3.1-pro-preview': 1000000,
} as const;

/**
 * Get context window limit for a model
 */
export function getModelContextLimit(model: string): number {
  const normalizedModel = model.trim().toLowerCase();

  // Check exact match
  if (normalizedModel in MODEL_CONTEXT_LIMITS) {
    return MODEL_CONTEXT_LIMITS[normalizedModel as keyof typeof MODEL_CONTEXT_LIMITS];
  }

  // Check partial matches (e.g., "openai/gpt-4-turbo" matches "gpt-4-turbo")
  for (const [key, limit] of Object.entries(MODEL_CONTEXT_LIMITS)) {
    if (normalizedModel.includes(key)) {
      return limit;
    }
  }

  // Gemini family defaults to high context windows; avoid over-truncating prompts.
  if (normalizedModel.includes('gemini')) {
    return 1000000;
  }

  // Conservative default
  return 4096;
}
