import { GATEWAY_LIMITS, buildChatCompletionResponse } from './core.mjs';

/**
 * Creates an OpenRouter provider with strict timeout and fallback mechanism.
 */
export function createOpenRouterProvider({
  apiKey,
  fetchImpl = fetch,
  openRouterBaseUrl = 'https://openrouter.ai/api/v1/chat/completions',
}) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('OPENROUTER_API_KEY is required to initialize OpenRouterProvider');
  }

  const callModel = async (model, messages, options, timeoutMs) => {
    const payload = {
      model,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.max_tokens ?? 1024,
      provider: {
        zdr: true,
        data_collection: 'deny',
      },
    };

    const response = await fetchImpl(openRouterBaseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vibe-tech.org',
        'X-Title': 'Vibe AI Gateway',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`upstream-error-${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('empty-upstream-response');
    }

    return {
      content,
      model: data?.model || model,
      promptTokens: data?.usage?.prompt_tokens ?? 0,
      completionTokens: data?.usage?.completion_tokens ?? 0,
    };
  };

  return async function executeCompletion({
    profile,
    messages,
    options = {},
  }) {
    const { primary, fallback } = profile;
    const startTime = Date.now();

    // 1. Attempt Primary with strict 10s timeout
    try {
      const result = await callModel(
        primary,
        messages,
        options,
        GATEWAY_LIMITS.defaultTimeoutMs,
      );

      return buildChatCompletionResponse({
        content: result.content,
        model: result.model,
        fallbackUsed: false,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      });
    } catch (primaryError) {
      console.warn(`[Gateway Router] Primary model ${primary} failed after ${Date.now() - startTime}ms:`, primaryError.message);

      // If fallback model is not configured or identical to primary, throw
      if (!fallback || fallback === primary) {
        throw primaryError;
      }

      // 2. Attempt Fallback with fallback timeout
      console.info(`[Gateway Router] Routing to fallback model ${fallback}...`);
      const fallbackStart = Date.now();
      const fallbackResult = await callModel(
        fallback,
        messages,
        options,
        GATEWAY_LIMITS.fallbackTimeoutMs,
      );
      console.info(`[Gateway Router] Fallback model ${fallback} succeeded in ${Date.now() - fallbackStart}ms`);

      return buildChatCompletionResponse({
        content: fallbackResult.content,
        model: fallbackResult.model,
        fallbackUsed: true,
        promptTokens: fallbackResult.promptTokens,
        completionTokens: fallbackResult.completionTokens,
      });
    }
  };
}
