export const DEFAULT_MODELS = Object.freeze({
  primary: 'deepseek/deepseek-chat',
  fallback: 'google/gemini-3.7-flash',
});

export const MODEL_PROFILES = Object.freeze({
  auto: {
    primary: 'deepseek/deepseek-chat',
    fallback: 'google/gemini-3.7-flash',
  },
  fast: {
    primary: 'google/gemini-2.5-flash',
    fallback: 'google/gemini-3.7-flash',
  },
  reasoning: {
    primary: 'deepseek/deepseek-r1',
    fallback: 'google/gemini-3.7-flash',
  },
  creative: {
    primary: 'deepseek/deepseek-chat',
    fallback: 'google/gemini-3.7-flash',
  },
});

export const GATEWAY_LIMITS = Object.freeze({
  defaultTimeoutMs: 10000, // 10s strict timeout on primary before fallback
  fallbackTimeoutMs: 15000,
  maxMessageCount: 50,
  maxMessageChars: 32000,
  maxOutputTokens: 4096,
});

export function parseModelProfile(requestedModel) {
  if (!requestedModel || requestedModel === 'auto') {
    return MODEL_PROFILES.auto;
  }
  if (MODEL_PROFILES[requestedModel]) {
    return MODEL_PROFILES[requestedModel];
  }
  // If specific OpenRouter model string is provided, use it as primary, default fallback
  return {
    primary: requestedModel,
    fallback: DEFAULT_MODELS.fallback,
  };
}

export function validateChatRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }

  const { messages, max_tokens, temperature } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: 'messages must be a non-empty array.' };
  }

  if (messages.length > GATEWAY_LIMITS.maxMessageCount) {
    return { ok: false, error: `Exceeded maximum message count of ${GATEWAY_LIMITS.maxMessageCount}.` };
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== 'object') {
      return { ok: false, error: `Message at index ${i} is invalid.` };
    }
    if (!['system', 'user', 'assistant'].includes(msg.role)) {
      return { ok: false, error: `Invalid role "${msg.role}" at message ${i}.` };
    }
    if (typeof msg.content !== 'string' || !msg.content.trim()) {
      return { ok: false, error: `Message at index ${i} must have non-empty text content.` };
    }
    if (msg.content.length > GATEWAY_LIMITS.maxMessageChars) {
      return { ok: false, error: `Message at index ${i} exceeds maximum character limit.` };
    }
  }

  if (max_tokens !== undefined && (!Number.isInteger(max_tokens) || max_tokens <= 0 || max_tokens > GATEWAY_LIMITS.maxOutputTokens)) {
    return { ok: false, error: `max_tokens must be an integer between 1 and ${GATEWAY_LIMITS.maxOutputTokens}.` };
  }

  if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 2)) {
    return { ok: false, error: 'temperature must be a number between 0 and 2.' };
  }

  return { ok: true };
}

/**
 * Builds standard OpenAI-compatible ChatCompletionResponse
 */
export function buildChatCompletionResponse({
  id = `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  content,
  model,
  fallbackUsed = false,
  promptTokens = 0,
  completionTokens = 0,
}) {
  return {
    id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
    vibe_gateway: {
      fallback_used: fallbackUsed,
      primary_model: DEFAULT_MODELS.primary,
      resolved_model: model,
    },
  };
}
