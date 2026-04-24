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
    const { model, messages, stream = false, ...options } = req.body;

    if (!model || !messages) {
      return res.status(400).json({
        error: 'Missing required fields: model and messages',
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    logger.info('OpenRouter chat request', {
      model,
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
          model,
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
                model,
                tokens: totalTokens,
                cost: calculateCost(model, { total_tokens: totalTokens }),
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
        model,
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

    // Track usage
    await trackUsage({
      model,
      tokens: response.data.usage?.total_tokens ?? 0,
      cost: calculateCost(model, response.data.usage),
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

// Helper: Calculate cost based on model and usage
function calculateCost(model: string, usage?: UsagePayload): number {
  if (!usage) return 0;

  // NOTE: Pricing estimates for 2026 models (per 1M tokens)
  // WARNING: These are rough estimates and change frequently.
  // TODO: Fetch real-time pricing from OpenRouter API: GET https://openrouter.ai/api/v1/models
  const pricing: Record<string, { input: number; output: number }> = {
    // 2026 Models (recommended)
    'anthropic/claude-sonnet-4.5': { input: 0.003, output: 0.015 },
    'anthropic/claude-opus-4.5': { input: 0.015, output: 0.075 },
    'openai/gpt-5.1': { input: 0.005, output: 0.015 },
    'openai/gpt-5.2': { input: 0.01, output: 0.03 },
    'google/gemini-3-pro-preview': { input: 0.00125, output: 0.005 },
    'deepseek/deepseek-v3.2': { input: 0.00027, output: 0.0011 },

    // FREE MODELS (2026) - Zero cost!
    'mimo/mimo-v2-flash:free': { input: 0, output: 0 },
    'mistralai/devstral-2:free': { input: 0, output: 0 },
    'deepseek/deepseek-tng-r1t2-chimera:free': { input: 0, output: 0 },
    'kwaipilot/kat-coder-pro:free': { input: 0, output: 0 },
    'nvidia/nemotron-nano-2-vl:free': { input: 0, output: 0 },

    // Legacy models (deprecated but still available)
    'anthropic/claude-3.5-sonnet': { input: 0.003, output: 0.015 },
    'anthropic/claude-3-opus': { input: 0.015, output: 0.075 },
    'openai/gpt-4-turbo': { input: 0.01, output: 0.03 },
  };

  const modelPricing = pricing[model] || { input: 0, output: 0 };
  // Pricing is per 1M tokens, so divide by 1,000,000 (not 1,000!)
  const inputCost = ((usage.prompt_tokens ?? 0) / 1_000_000) * modelPricing.input;
  const outputCost = ((usage.completion_tokens ?? 0) / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

export { router as openRouterRouter };
