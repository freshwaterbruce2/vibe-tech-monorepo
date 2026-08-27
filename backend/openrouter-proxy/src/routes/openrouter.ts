import axios from 'axios';
import express from 'express';
import { logger } from '../utils/logger';
import { getUsageStats, trackUsage } from '../utils/usage';

const router = express.Router();

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

interface UsagePayload {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

// Chat completion endpoint (supports streaming)
router.post('/chat', async (req, res, next) => {
  try {
    const { model, models, messages, stream = false, ...options } = req.body;

    if ((!model && !models) || !messages) {
      return res.status(400).json({
        error: 'Missing required fields: model or models, and messages',
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    logger.info('OpenRouter chat request', {
      model: model || (Array.isArray(models) ? models.join(', ') : models),
      messageCount: messages.length,
      streaming: stream,
      ip: req.ip,
    });

    // Handle streaming responses (2026 Best Practice)
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const response = await axios.post(
        `${OPENROUTER_API_BASE}/chat/completions`,
        {
          ...(model ? { model } : { models }),
          messages,
          stream: true,
          ...options,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://vibetech.local',
            'X-Title': 'VibeTech OpenRouter Proxy',
          },
          responseType: 'stream',
        },
      );

      let totalTokens = 0;
      let selectedModel = (Array.isArray(models) ? models[0] : model) || 'unknown';
      let streamEnded = false;
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk
          .toString()
          .split('\n')
          .filter((line) => line.trim());
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              res.write('data: [DONE]\n\n');
              // Track usage for streaming
              void trackUsage({
                model: selectedModel,
                tokens: totalTokens,
                cost: calculateCost(selectedModel, { total_tokens: totalTokens }),
                timestamp: new Date().toISOString(),
              }).catch((usageError: unknown) => {
                logger.error('Failed to track streaming usage', {
                  error: getErrorMessage(usageError),
                });
              });
              streamEnded = true;
              res.end();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.model) {
                selectedModel = parsed.model;
              }
              if (parsed.usage) {
                totalTokens = parsed.usage.total_tokens;
              }
              res.write(`data: ${data}\n\n`);
            } catch {
              // Skip malformed JSON
            }
          }
        }
      });

      response.data.on('error', (error: Error) => {
        if (streamEnded || res.writableEnded) return;
        logger.error('Streaming error', { error: error.message });
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      });

      return;
    }

    // Non-streaming response (original behavior)
    const response = await axios.post(
      `${OPENROUTER_API_BASE}/chat/completions`,
      {
        ...(model ? { model } : { models }),
        messages,
        ...options,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vibetech.local',
          'X-Title': 'VibeTech OpenRouter Proxy',
        },
      },
    );

    const selectedModel = response.data.model || (Array.isArray(models) ? models[0] : model) || 'unknown';
    // Track usage
    await trackUsage({
      model: selectedModel,
      tokens: response.data.usage?.total_tokens ?? 0,
      cost: calculateCost(selectedModel, response.data.usage),
      timestamp: new Date().toISOString(),
    });

    res.json(response.data);
  } catch (error: unknown) {
    const responseData = axios.isAxiosError(error) ? error.response?.data : undefined;

    logger.error('OpenRouter API error', {
      error: getErrorMessage(error),
      response: responseData,
    });
    next(error);
  }
});

// Get available models
router.get('/models', async (req, res, next) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const response = await axios.get(`${OPENROUTER_API_BASE}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

// Embeddings endpoint — used by EmbeddingService and RAGEmbedder
router.post('/embeddings', async (req, res, next) => {
  try {
    const { model, input } = req.body;

    if (!model || !input) {
      return res.status(400).json({ error: 'Missing required fields: model and input' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const response = await axios.post(
      `${OPENROUTER_API_BASE}/embeddings`,
      { model, input },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vibetech.local',
          'X-Title': 'VibeTech OpenRouter Proxy',
        },
      },
    );

    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

// Get usage statistics (2026 Enhanced)
router.get('/usage', async (req, res) => {
  const { period = '24' } = req.query;
  const periodHours = parseInt(period as string, 10);

  const stats = await getUsageStats(periodHours);

  res.json({
    period: `${periodHours}h`,
    ...stats,
    timestamp: new Date().toISOString(),
  });
});

interface ModelPricing {
  input: number;
  output: number;
}

// Fallback pricing (per 1M tokens) used only when live pricing from the
// OpenRouter API is unavailable. These are estimates in USD per 1M tokens,
// aligned with the scaling used in livePricing (dollars per 1M tokens).
const FALLBACK_PRICING: Record<string, ModelPricing> = {
  // 2026 Models (recommended)
  'anthropic/claude-sonnet-4.6': { input: 3.0, output: 15.0 },
  'anthropic/claude-sonnet-4.5': { input: 3.0, output: 15.0 },
  'anthropic/claude-opus-4.5': { input: 15.0, output: 75.0 },
  'openai/gpt-5.1': { input: 5.0, output: 15.0 },
  'openai/gpt-5.2': { input: 10.0, output: 30.0 },
  'google/gemini-3-pro-preview': { input: 1.25, output: 5.0 },
  'deepseek/deepseek-v4-flash': { input: 0.09, output: 0.18 },
  'deepseek/deepseek-v3.2': { input: 0.27, output: 1.1 },
  'deepseek/deepseek-v3': { input: 0.20, output: 0.77 },
  'moonshotai/kimi-k2.7-code': { input: 0.61, output: 3.06 },
  'z-ai/glm-5.2': { input: 0.30, output: 1.00 },
  'openrouter/fusion': { input: 1.00, output: 3.00 },

  // FREE MODELS (2026) - Zero cost!
  'mimo/mimo-v2-flash:free': { input: 0, output: 0 },
  'mistralai/devstral-2:free': { input: 0, output: 0 },
  'deepseek/deepseek-tng-r1t2-chimera:free': { input: 0, output: 0 },
  'kwaipilot/kat-coder-pro:free': { input: 0, output: 0 },
  'nvidia/nemotron-nano-2-vl:free': { input: 0, output: 0 },
  'cohere/north-mini-code:free': { input: 0, output: 0 },

  // Legacy models (deprecated but still available)
  'anthropic/claude-3.5-sonnet': { input: 3.0, output: 15.0 },
  'anthropic/claude-3-opus': { input: 15.0, output: 75.0 },
  'openai/gpt-4-turbo': { input: 10.0, output: 30.0 },
};

// Live pricing cache, populated from GET /models. OpenRouter reports pricing
// per token as USD strings; we normalize to per-1M-tokens to match the
// fallback table and the cost math below.
const PRICING_CACHE_TTL_MS = 60 * 60 * 1000; // refresh a healthy cache hourly
const PRICING_RETRY_COOLDOWN_MS = 60 * 1000; // back off at least 1 min after a failed attempt

let livePricing: Record<string, ModelPricing> | null = null;
let livePricingFetchedAt = 0;
let lastPricingAttemptAt = 0;
let pricingRefreshInFlight: Promise<void> | null = null;

// Coerce an untyped JSON value (OpenRouter reports pricing as USD strings such
// as "0.000003", occasionally as numbers) into a number, or NaN if unusable.
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseFloat(value);
  return NaN;
}

// Fetch and cache real-time pricing from the OpenRouter models endpoint.
// Exported for testing and for explicit warm-ups; routine callers should use
// the fire-and-forget ensureFreshPricing() instead.
async function refreshLivePricing(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const response = await axios.get(`${OPENROUTER_API_BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const models: unknown = response.data?.data;
  if (!Array.isArray(models)) {
    throw new Error('Unexpected /models response shape: missing data array');
  }

  const next: Record<string, ModelPricing> = {};
  for (const entry of models as unknown[]) {
    if (typeof entry !== 'object' || entry === null) continue;
    const record = entry as Record<string, unknown>;

    const id = record.id;
    const pricing = record.pricing;
    if (typeof id !== 'string' || typeof pricing !== 'object' || pricing === null) {
      continue;
    }

    const pricingRecord = pricing as Record<string, unknown>;
    const promptPerToken = toNumber(pricingRecord.prompt);
    const completionPerToken = toNumber(pricingRecord.completion);
    if (!Number.isFinite(promptPerToken) || !Number.isFinite(completionPerToken)) {
      continue;
    }

    next[id] = {
      input: promptPerToken * 1_000_000,
      output: completionPerToken * 1_000_000,
    };
  }

  livePricing = next;
  livePricingFetchedAt = Date.now();
}

// Trigger a non-blocking pricing refresh when the cache is stale, without
// holding up the cost calculation. Concurrent calls and rapid retries after a
// failure are throttled so a flaky upstream never causes a request storm.
function ensureFreshPricing(): void {
  if (pricingRefreshInFlight) return;

  const now = Date.now();
  const cacheValid = livePricing !== null && now - livePricingFetchedAt < PRICING_CACHE_TTL_MS;
  if (cacheValid) return;
  if (now - lastPricingAttemptAt < PRICING_RETRY_COOLDOWN_MS) return;

  lastPricingAttemptAt = now;
  pricingRefreshInFlight = refreshLivePricing()
    .catch((error: unknown) => {
      logger.warn('Failed to refresh OpenRouter pricing; using fallback table', {
        error: getErrorMessage(error),
      });
    })
    .finally(() => {
      pricingRefreshInFlight = null;
    });
}

// Helper: Calculate cost based on model and usage
function calculateCost(model: string, usage?: UsagePayload): number {
  if (!usage) return 0;

  // Kick off a background refresh so future calls use live numbers; this call
  // uses whatever is currently cached, falling back to the static table.
  ensureFreshPricing();

  const modelPricing = livePricing?.[model] ?? FALLBACK_PRICING[model] ?? { input: 0, output: 0 };
  // Pricing is per 1M tokens, so divide by 1,000,000 (not 1,000!)
  const inputCost = ((usage.prompt_tokens ?? 0) / 1_000_000) * modelPricing.input;
  const outputCost = ((usage.completion_tokens ?? 0) / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

export { router as openRouterRouter, calculateCost, refreshLivePricing };
