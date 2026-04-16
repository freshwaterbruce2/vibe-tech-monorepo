/**
 * DeepSeek R1 Reasoning Parser
 *
 * Extracts and separates reasoning process (<think> tags) from final answer
 * for DeepSeek R1 model responses via OpenRouter.
 *
 * @see apps/nova-agent/OPENROUTER_SETUP_GUIDE.md for configuration
 */

export interface ParsedResponse {
  /** The reasoning/thinking process (from <think> tags) */
  reasoning: string | null;
  /** The final answer content (without thinking tags) */
  content: string;
  /** Whether the response is still in thinking phase */
  isThinking: boolean;
}

/**
 * Parse DeepSeek R1 response to extract reasoning and content
 *
 * @param fullText - The complete response text from the model
 * @returns Parsed response with separated reasoning and content
 *
 * @example
 * ```ts
 * const response = "<think>Let me count: s-t-r-a-w-b-e-r-r-y</think>There are 3 'r's";
 * const parsed = parseDeepSeekStream(response);
 * // { reasoning: "Let me count...", content: "There are 3 'r's", isThinking: false }
 * ```
 */
export function parseDeepSeekStream(fullText: string): ParsedResponse {
  if (!fullText) {
    return { reasoning: null, content: '', isThinking: false };
  }

  // 1. Check for complete <think>...</think> tags
  const thinkMatch = fullText.match(/<think>([\s\S]*?)<\/think>/);

  if (thinkMatch?.[1]) {
    return {
      reasoning: thinkMatch[1].trim(),
      // Remove the thinking tags and content from the main display text
      content: fullText.replace(/<think>[\s\S]*?<\/think>/, '').trim(),
      isThinking: false
    };
  }

  // 2. Handle incomplete stream (model is still "thinking")
  if (fullText.includes('<think>')) {
    // Extract partial thinking content (no closing tag yet)
    const partialThinking = fullText.replace('<think>', '').trim();

    return {
      reasoning: partialThinking,
      content: '', // No final content yet
      isThinking: true
    };
  }

  // 3. No thinking tags found - regular response
  return {
    reasoning: null,
    content: fullText,
    isThinking: false
  };
}

/**
 * Parse OpenRouter-specific reasoning field (if available)
 *
 * Some models may provide reasoning in a separate field instead of tags.
 *
 * @param chunk - The streaming chunk from OpenRouter
 * @returns Parsed reasoning and content
 */
interface OpenRouterChunk {
  choices?: Array<{
    reasoning_details?: string | unknown;
    delta?: { content?: string };
  }>;
}

export function parseOpenRouterChunk(chunk: OpenRouterChunk): ParsedResponse {
  // 1. Check for OpenRouter's reasoning_details field
  const reasoningField = chunk.choices?.[0]?.reasoning_details ?? null;

  // 2. Get main content
  const content = chunk.choices?.[0]?.delta?.content ?? "";

  // 3. If OpenRouter provides structured reasoning, use it
  if (reasoningField) {
    return {
      reasoning: typeof reasoningField === 'string' ? reasoningField : JSON.stringify(reasoningField),
      content: content,
      isThinking: !content // Still thinking if no content yet
    };
  }

  // 4. Fallback to tag-based parsing
  return parseDeepSeekStream(content);
}

/**
 * Combine multiple streaming chunks and parse reasoning
 *
 * Useful for accumulating streamed responses before parsing.
 *
 * @param chunks - Array of streamed text chunks
 * @returns Combined and parsed response
 */
export function parseStreamedChunks(chunks: string[]): ParsedResponse {
  const fullText = chunks.join('');
  return parseDeepSeekStream(fullText);
}

/**
 * Check if a model ID is a reasoning model (DeepSeek R1 or similar)
 *
 * @param modelId - The OpenRouter model ID
 * @returns true if the model supports reasoning mode
 */
export function isReasoningModel(modelId: string): boolean {
  const reasoningModels = [
    'deepseek/deepseek-r1',
    'deepseek-r1',
    'deepseek-reasoner',
    'o1-preview', // OpenAI o1 also uses reasoning
    'o1-mini',
    'qwq-32b-preview', // Qwen reasoning model
  ];

  return reasoningModels.some(model =>
    modelId.toLowerCase().includes(model.toLowerCase())
  );
}
