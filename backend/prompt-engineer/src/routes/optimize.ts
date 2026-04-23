import { Router, type Request, type Response } from 'express';
import modelsConfig from '../config/models.json' with { type: 'json' };
import {
  sanitizeUserInput,
  wrapInDelimiters,
  validateStreamChunk,
  costTracker,
  type ValidationIssue,
} from '@vibetech/shared-utils';

const router = Router();

interface OptimizeRequest {
  prompt: string;
  model: string;
  mode: string;
  extendedThinking: boolean;
}

// Build the system prompt for optimizing user prompts
function buildSystemPrompt(model: string, mode: string, extendedThinking: boolean): string {
  const modelInfo = modelsConfig.models[model as keyof typeof modelsConfig.models];
  const modeInfo = modelsConfig.modes[mode as keyof typeof modelsConfig.modes];

  const parts = [
    "You are an expert prompt engineer. Your task is to optimize the user's prompt for the specified AI model and mode.",
    '',
    `TARGET MODEL: ${modelInfo?.name || model}`,
    `Provider: ${modelInfo?.provider || 'Unknown'}`,
    `Context Window: ${modelInfo?.context?.toLocaleString() || 'Unknown'} tokens`,
    `Max Output: ${modelInfo?.maxOutput?.toLocaleString() || 'Unknown'} tokens`,
    `Thinking Mode: ${modelInfo?.thinking ? 'Supported' : 'Not supported'}`,
    `Strengths: ${modelInfo?.strengths?.join(', ') || 'General purpose'}`,
    '',
    'MODEL-SPECIFIC GUIDELINES:',
    ...(modelInfo?.promptGuidelines || []).map((g) => `- ${g}`),
    '',
    `MODE: ${modeInfo?.name || mode}`,
    modeInfo?.systemPromptAddition || '',
    '',
    'MODE-SPECIFIC GUIDELINES:',
    ...(modeInfo?.guidelines || []).map((g) => `- ${g}`),
    '',
    'YOUR TASK:',
    "1. Analyze the user's original prompt",
    '2. Optimize it for the target model and mode',
    '3. Apply best practices for prompt engineering:',
    '   - Be specific and clear',
    '   - Provide context and constraints',
    '   - Structure complex prompts with sections',
    '   - Include examples if helpful',
    '   - Specify desired output format',
    '',
    'OUTPUT:',
    'Return ONLY the optimized prompt. Do not include explanations or meta-commentary.',
    'The optimized prompt should be ready to copy and paste directly into the target AI.',
  ];

  if (extendedThinking) {
    parts.push(
      '',
      'EXTENDED THINKING MODE:',
      'The user has enabled extended thinking. Include instructions in the prompt for the model to:',
      '- Think step-by-step before providing the answer',
      '- Show reasoning process',
      '- Consider multiple approaches before deciding',
    );
  }

  return parts.join('\n');
}

router.post('/', async (req: Request, res: Response) => {
  const { prompt, model, mode, extendedThinking } = req.body as OptimizeRequest;

  if (!prompt || !model || !mode) {
    res.status(400).json({ error: 'Missing required fields: prompt, model, mode' });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });
    return;
  }

  try {
    const modelInfo = modelsConfig.models[model as keyof typeof modelsConfig.models];
    const systemPrompt = buildSystemPrompt(model, mode, extendedThinking);

    // Sanitize user input to prevent prompt injection
    const { sanitized, warnings } = sanitizeUserInput(prompt, {
      maxLength: 50000,
      checkInjection: true,
      escapeFormat: 'none', // We'll use XML delimiters instead
    });

    // Log any injection warnings
    if (warnings.length > 0) {
      console.warn('[PromptOptimize] Input sanitization warnings:', warnings);
    }

    // Wrap in XML delimiters to prevent injection
    const safePrompt = wrapInDelimiters(sanitized, 'xml');

    let userPrompt = `Please optimize this prompt:\n\n${safePrompt}`;
    if (extendedThinking) {
      userPrompt = 'Think step-by-step before providing your answer.\n\n' + userPrompt;
    }

    const openRouterId = ((modelInfo as Record<string, unknown>)?.openRouterId as string) ?? model;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Prompt Engineer',
      },
      body: JSON.stringify({
        model: openRouterId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      res.status(response.status).json({ error: `OpenRouter API error: ${response.statusText}` });
      return;
    }

    // Set up SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body?.getReader();
    if (!reader) {
      res.status(500).json({ error: 'No response body from API' });
      return;
    }

    const decoder = new TextDecoder();
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Validate chunk before forwarding
        const validation = validateStreamChunk(chunk, {
          allowHTML: false,
          checkHarmful: true,
        });

        if (!validation.valid) {
          console.warn('[PromptOptimize] Chunk validation issues:', validation.issues);
        }

        // Log severe validation errors
        const hasErrors = validation.issues.some((i: ValidationIssue) => i.severity === 'error');
        if (hasErrors) {
          console.error('[PromptOptimize] Harmful content detected:', validation.issues);
          // Still forward but use sanitized version
          res.write(validation.sanitized);
        } else {
          // Forward the original chunk
          res.write(chunk);
        }

        // Extract token usage from SSE data if present
        const tokenMatch = chunk.match(/"usage":\s*\{[^}]*"prompt_tokens":\s*(\d+)[^}]*"completion_tokens":\s*(\d+)/);
        if (tokenMatch) {
          totalInputTokens = parseInt(tokenMatch[1] ?? '0', 10);
          totalOutputTokens = parseInt(tokenMatch[2] ?? '0', 10);
        }
      }
    } finally {
      reader.releaseLock();

      // Log cost tracking after stream completes
      if (totalInputTokens > 0 || totalOutputTokens > 0) {
        costTracker.logRequest(model, totalInputTokens, totalOutputTokens, {
          endpoint: 'optimize',
          mode,
          extendedThinking,
        });
        console.log(
          `[PromptOptimize] Cost logged: ${totalInputTokens} input + ${totalOutputTokens} output tokens`
        );
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Optimization error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.end();
    }
  }
});

export { router as optimizeRouter };
