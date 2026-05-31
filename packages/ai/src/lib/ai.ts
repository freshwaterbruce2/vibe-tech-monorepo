/* eslint-disable @typescript-eslint/no-explicit-any */
import { currentTenantId, type TenantId } from '@vibetech/monetization';

export type AiProviderName = 'gemini' | 'openrouter' | 'moonshot' | 'deepseek' | 'openai' | 'local';

export type AiRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AiChatMessage {
  role: AiRole;
  content: string;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd?: number;
}

export interface AiGenerateInput {
  appId: string;
  prompt?: string;
  messages?: AiChatMessage[];
  tenantId?: TenantId;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
  metadata?: Record<string, string>;
  signal?: AbortSignal;
}

export interface AiGenerationResult {
  provider: AiProviderName;
  model: string;
  text: string;
  usage: AiUsage;
  reasoning?: string;
}

export interface AiGenerationChunk {
  text: string;
  reasoning?: string;
}

export interface AiProvider {
  readonly name: AiProviderName;
  generate(input: AiGenerateInput): Promise<AiGenerationResult>;
  stream?(input: AiGenerateInput): AsyncGenerator<AiGenerationChunk, void, unknown>;
}

export interface TokenRate {
  inputPerMillion: number;
  outputPerMillion: number;
}

export interface AiUsageRecord {
  appId: string;
  tenantId: TenantId;
  provider: AiProviderName;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export const DEFAULT_TOKEN_RATES: Record<AiProviderName, TokenRate> = {
  gemini: {
    inputPerMillion: 0.1,
    outputPerMillion: 0.4,
  },
  openrouter: {
    inputPerMillion: 0,
    outputPerMillion: 0,
  },
  moonshot: {
    inputPerMillion: 0.20,
    outputPerMillion: 0.80,
  },
  deepseek: {
    inputPerMillion: 0.14,
    outputPerMillion: 0.28,
  },
  openai: {
    inputPerMillion: 0.15,
    outputPerMillion: 0.60,
  },
  local: {
    inputPerMillion: 0,
    outputPerMillion: 0,
  },
};

const usageByScope = new Map<string, AiUsageRecord>();

const normalizeTenantId = (tenantId: TenantId | undefined): TenantId => {
  const normalized = tenantId?.trim();
  if (normalized === undefined || normalized.length === 0) {
    return currentTenantId();
  }
  return normalized;
};

const usageKey = (appId: string, tenantId: TenantId, provider: AiProviderName): string =>
  `${tenantId}:${appId}:${provider}`;

export function estimateAiCostUsd(usage: AiUsage, rate: TokenRate): number {
  return (
    (usage.inputTokens / 1_000_000) * rate.inputPerMillion +
    (usage.outputTokens / 1_000_000) * rate.outputPerMillion
  );
}

export function recordAiUsage(input: {
  appId: string;
  tenantId?: TenantId;
  provider: AiProviderName;
  usage: AiUsage;
  rate?: TokenRate;
}): AiUsageRecord {
  const tenantId = normalizeTenantId(input.tenantId);
  const key = usageKey(input.appId, tenantId, input.provider);
  const existing = usageByScope.get(key);
  const costUsd =
    input.usage.costUsd ??
    estimateAiCostUsd(input.usage, input.rate ?? DEFAULT_TOKEN_RATES[input.provider]);

  const record: AiUsageRecord = {
    appId: input.appId,
    tenantId,
    provider: input.provider,
    inputTokens: (existing?.inputTokens ?? 0) + input.usage.inputTokens,
    outputTokens: (existing?.outputTokens ?? 0) + input.usage.outputTokens,
    totalTokens: (existing?.totalTokens ?? 0) + input.usage.totalTokens,
    costUsd: (existing?.costUsd ?? 0) + costUsd,
  };
  usageByScope.set(key, record);
  return record;
}

export function getAiUsage(
  appId: string,
  provider: AiProviderName,
  tenantId: TenantId = currentTenantId(),
): AiUsageRecord | null {
  return usageByScope.get(usageKey(appId, normalizeTenantId(tenantId), provider)) ?? null;
}

export function resetAiUsage(): void {
  usageByScope.clear();
}

export async function generateWithMetering(
  provider: AiProvider,
  input: AiGenerateInput,
): Promise<AiGenerationResult> {
  const result = await provider.generate(input);
  recordAiUsage({
    appId: input.appId,
    tenantId: input.tenantId,
    provider: result.provider,
    usage: result.usage,
  });
  return result;
}

export class AiRouter implements AiProvider {
  readonly name: AiProviderName;
  private readonly primary: AiProvider;
  private readonly fallback?: AiProvider;

  constructor(primary: AiProvider, fallback?: AiProvider) {
    this.name = primary.name;
    this.primary = primary;
    this.fallback = fallback;
  }

  async generate(input: AiGenerateInput): Promise<AiGenerationResult> {
    try {
      return await this.primary.generate(input);
    } catch (error) {
      if (!this.fallback) {
        throw error;
      }
      return this.fallback.generate(input);
    }
  }

  async *stream(input: AiGenerateInput): AsyncGenerator<AiGenerationChunk, void, unknown> {
    if (this.primary.stream) {
      try {
        yield* this.primary.stream(input);
        return;
      } catch (error) {
        if (!this.fallback?.stream) {
          throw error;
        }
      }
    }
    if (this.fallback?.stream) {
      yield* this.fallback.stream(input);
    } else {
      throw new Error('Streaming not supported by router active providers');
    }
  }
}

export function createAiRouter(config: {
  gemini: AiProvider;
  openRouter?: AiProvider;
}): AiRouter {
  return new AiRouter(config.gemini, config.openRouter);
}

// Env helper for cross-environment compatibility (Node.js process.env vs Vite import.meta.env)
export function getEnvVar(name: string): string {
  if (typeof process !== 'undefined' && process.env?.[name]) {
    return process.env[name] ?? '';
  }
  if (typeof import.meta !== 'undefined') {
    const metaEnv = (import.meta as { env?: Record<string, string> }).env;
    if (metaEnv?.[name]) {
      return metaEnv[name] ?? '';
    }
  }
  return '';
}

// Normalizes input prompt vs messages format
export function getNormalizedMessages(input: AiGenerateInput): Array<{ role: string; content: string }> {
  if (input.messages && input.messages.length > 0) {
    return input.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }
  if (input.prompt) {
    return [
      {
        role: 'user',
        content: input.prompt,
      },
    ];
  }
  return [];
}

// Reusable Server-Sent Events (SSE) Stream Parser helper
export async function* parseStreamBody(
  response: Response,
  mapper: (data: any) => AiGenerationChunk | null,
  signal?: AbortSignal
): AsyncGenerator<AiGenerationChunk, void, unknown> {
  if (!response.body) {
    throw new Error('Response body is not readable');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException('The user aborted a request.', 'AbortError');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const mapped = mapper(data);
            if (mapped) {
              yield mapped;
            }
          } catch {
            // Ignore malformed chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function createFetchGeminiProvider(options: {
  apiKey: string;
  model?: string;
  fetchImpl?: FetchLike;
}): AiProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const defaultModel = options.model ?? 'gemini-2.5-flash';

  return {
    name: 'gemini',
    async generate(input) {
      const model = input.model ?? defaultModel;
      const messages = getNormalizedMessages(input);
      const systemMessage = messages.find(m => m.role === 'system');
      const chatMessages = messages.filter(m => m.role !== 'system');

      const body: any = {
        contents: chatMessages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          maxOutputTokens: input.maxOutputTokens,
          temperature: input.temperature,
        }
      };

      if (systemMessage) {
        body.system_instruction = {
          parts: [{ text: systemMessage.content }]
        };
      }

      const response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${options.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: input.signal,
        },
      );
      if (!response.ok) {
        throw new Error(`Gemini request failed with HTTP ${response.status}`);
      }

      const responseBody = (await response.json()) as any;
      const usage = {
        inputTokens: responseBody.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: responseBody.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: responseBody.usageMetadata?.totalTokenCount ?? 0,
      };
      return {
        provider: 'gemini',
        model,
        text: responseBody.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? '').join('') ?? '',
        usage,
      };
    },

    async *stream(input) {
      const model = input.model ?? defaultModel;
      const messages = getNormalizedMessages(input);
      const systemMessage = messages.find(m => m.role === 'system');
      const chatMessages = messages.filter(m => m.role !== 'system');

      const body: any = {
        contents: chatMessages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          maxOutputTokens: input.maxOutputTokens,
          temperature: input.temperature,
        }
      };

      if (systemMessage) {
        body.system_instruction = {
          parts: [{ text: systemMessage.content }]
        };
      }

      const response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${options.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: input.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini stream request failed with HTTP ${response.status}`);
      }

      yield* parseStreamBody(
        response,
        (data) => {
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          return text ? { text } : null;
        },
        input.signal
      );
    }
  };
}

export function createFetchOpenRouterProvider(options: {
  apiKey: string;
  model?: string;
  fetchImpl?: FetchLike;
  providerOrder?: string[];
  siteUrl?: string;
  siteName?: string;
}): AiProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const defaultModel = options.model ?? 'google/gemini-2.5-flash';
  const siteUrl = options.siteUrl ?? 'https://vibecodestudio.com';
  const siteName = options.siteName ?? 'Vibe Code Studio';

  return {
    name: 'openrouter',
    async generate(input) {
      const model = input.model ?? defaultModel;
      const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': siteUrl,
          'X-Title': siteName,
        },
        body: JSON.stringify({
          model,
          messages: getNormalizedMessages(input),
          max_tokens: input.maxOutputTokens,
          temperature: input.temperature,
          provider:
            options.providerOrder == null
              ? undefined
              : {
                  order: options.providerOrder,
                },
        }),
        signal: input.signal,
      });
      if (!response.ok) {
        throw new Error(`OpenRouter request failed with HTTP ${response.status}`);
      }

      const body = (await response.json()) as any;
      const inputTokens = body.usage?.prompt_tokens ?? 0;
      const outputTokens = body.usage?.completion_tokens ?? 0;
      const usage = {
        inputTokens,
        outputTokens,
        totalTokens: body.usage?.total_tokens ?? inputTokens + outputTokens,
      };
      const choice = body.choices?.[0];
      const text = choice?.message?.content ?? '';
      const reasoning = choice?.message?.reasoning_content ?? choice?.message?.reasoning ?? undefined;

      return {
        provider: 'openrouter',
        model: body.model ?? model,
        text,
        usage,
        reasoning,
      };
    },

    async *stream(input) {
      const model = input.model ?? defaultModel;
      const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': siteUrl,
          'X-Title': siteName,
        },
        body: JSON.stringify({
          model,
          messages: getNormalizedMessages(input),
          max_tokens: input.maxOutputTokens,
          temperature: input.temperature,
          stream: true,
          provider:
            options.providerOrder == null
              ? undefined
              : {
                  order: options.providerOrder,
                },
        }),
        signal: input.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenRouter stream request failed with HTTP ${response.status}`);
      }

      yield* parseStreamBody(
        response,
        (data) => {
          const choice = data.choices?.[0];
          const text = choice?.delta?.content ?? choice?.text ?? '';
          const reasoning = choice?.delta?.reasoning_content ?? choice?.delta?.reasoning ?? undefined;
          return text || reasoning ? { text, reasoning } : null;
        },
        input.signal
      );
    }
  };
}

export function createFetchMoonshotProvider(options: {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
}): AiProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const defaultModel = options.model ?? 'kimi-k2.5';
  const baseUrl = options.baseUrl ?? 'https://api.moonshot.ai/v1';

  const resolveModel = (model?: string): string => {
    if (!model) return defaultModel;
    const map: Record<string, string> = {
      'kimi': 'kimi-k2.5',
      'kimi-k2.5': 'kimi-k2.5',
      'kimi-k2.6': 'kimi-k2.6',
      'kimi-thinking': 'kimi-k2-thinking',
    };
    return map[model.toLowerCase()] ?? model;
  };

  const shouldUseThinking = (model: string): boolean => {
    return model.includes('thinking') || model.includes('r1') || model.includes('k2.6');
  };

  return {
    name: 'moonshot',
    async generate(input) {
      const model = resolveModel(input.model);
      const useThinking = shouldUseThinking(model);
      const temperature = useThinking ? 1.0 : (input.temperature ?? 0.6);

      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: getNormalizedMessages(input),
          temperature,
          max_tokens: input.maxOutputTokens ?? 8192,
          thinking: { type: useThinking ? 'enabled' : 'disabled' },
          stream: false,
        }),
        signal: input.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Moonshot request failed with HTTP ${response.status}: ${text}`);
      }

      const body = await response.json();
      const choice = body.choices?.[0];
      const text = choice?.message?.content ?? '';
      const reasoning = choice?.message?.reasoning ?? undefined;
      const usage = {
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
        totalTokens: body.usage?.total_tokens ?? 0,
      };

      return {
        provider: 'moonshot',
        model,
        text,
        usage,
        reasoning,
      };
    },

    async *stream(input) {
      const model = resolveModel(input.model);
      const useThinking = shouldUseThinking(model);
      const temperature = useThinking ? 1.0 : (input.temperature ?? 0.6);

      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: getNormalizedMessages(input),
          temperature,
          max_tokens: input.maxOutputTokens ?? 8192,
          thinking: { type: useThinking ? 'enabled' : 'disabled' },
          stream: true,
        }),
        signal: input.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Moonshot stream request failed with HTTP ${response.status}: ${text}`);
      }

      yield* parseStreamBody(
        response,
        (data) => {
          const choice = data.choices?.[0];
          const text = choice?.delta?.content ?? choice?.text ?? '';
          const reasoning = choice?.delta?.reasoning ?? undefined;
          return text || reasoning ? { text, reasoning } : null;
        },
        input.signal
      );
    }
  };
}

export function createFetchDeepSeekProvider(options: {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
}): AiProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const defaultModel = options.model ?? 'deepseek-chat';
  const baseUrl = options.baseUrl ?? 'https://api.deepseek.com/v1';

  return {
    name: 'deepseek',
    async generate(input) {
      const model = input.model ?? defaultModel;
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: getNormalizedMessages(input),
          temperature: input.temperature ?? 0.7,
          max_tokens: input.maxOutputTokens ?? 8192,
          stream: false,
        }),
        signal: input.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`DeepSeek request failed with HTTP ${response.status}: ${text}`);
      }

      const body = await response.json();
      const choice = body.choices?.[0];
      const text = choice?.message?.content ?? '';
      const reasoning = choice?.message?.reasoning_content ?? undefined;
      const usage = {
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
        totalTokens: body.usage?.total_tokens ?? 0,
      };

      return {
        provider: 'deepseek',
        model,
        text,
        usage,
        reasoning,
      };
    },

    async *stream(input) {
      const model = input.model ?? defaultModel;
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: getNormalizedMessages(input),
          temperature: input.temperature ?? 0.7,
          max_tokens: input.maxOutputTokens ?? 8192,
          stream: true,
        }),
        signal: input.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`DeepSeek stream request failed with HTTP ${response.status}: ${text}`);
      }

      yield* parseStreamBody(
        response,
        (data) => {
          const choice = data.choices?.[0];
          const text = choice?.delta?.content ?? choice?.text ?? '';
          const reasoning = choice?.delta?.reasoning_content ?? undefined;
          return text || reasoning ? { text, reasoning } : null;
        },
        input.signal
      );
    }
  };
}

export function createFetchOpenAIProvider(options: {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
}): AiProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const defaultModel = options.model ?? 'gpt-4o';
  const baseUrl = options.baseUrl ?? 'https://api.openai.com/v1';

  return {
    name: 'openai',
    async generate(input) {
      const model = input.model ?? defaultModel;
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: getNormalizedMessages(input),
          temperature: input.temperature ?? 0.7,
          max_tokens: input.maxOutputTokens ?? 4096,
          stream: false,
        }),
        signal: input.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenAI request failed with HTTP ${response.status}: ${text}`);
      }

      const body = await response.json();
      const choice = body.choices?.[0];
      const text = choice?.message?.content ?? '';
      const usage = {
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
        totalTokens: body.usage?.total_tokens ?? 0,
      };

      return {
        provider: 'openai',
        model,
        text,
        usage,
      };
    },

    async *stream(input) {
      const model = input.model ?? defaultModel;
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: getNormalizedMessages(input),
          temperature: input.temperature ?? 0.7,
          max_tokens: input.maxOutputTokens ?? 4096,
          stream: true,
        }),
        signal: input.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenAI stream request failed with HTTP ${response.status}: ${text}`);
      }

      yield* parseStreamBody(
        response,
        (data) => {
          const choice = data.choices?.[0];
          const text = choice?.delta?.content ?? choice?.text ?? '';
          return text ? { text } : null;
        },
        input.signal
      );
    }
  };
}

export function createLocalProvider(options: {
  baseUrl?: string;
  model?: string;
  fetchImpl?: FetchLike;
}): AiProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const defaultModel = options.model ?? 'local/vibe-completion';
  const baseUrl = options.baseUrl ?? getEnvVar('VITE_OPENROUTER_PROXY_URL') ?? 'http://localhost:3001';

  return {
    name: 'local',
    async generate(input) {
      const model = input.model ?? defaultModel;
      const url = baseUrl.endsWith('/v1') 
        ? `${baseUrl}/chat/completions`
        : baseUrl.includes('localhost:3001')
          ? `${baseUrl}/api/openrouter/chat`
          : `${baseUrl}/chat/completions`;

      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: getNormalizedMessages(input),
          max_tokens: input.maxOutputTokens ?? 4096,
          temperature: input.temperature ?? 0.7,
          stream: false,
        }),
        signal: input.signal,
      });

      if (!response.ok) {
        throw new Error(`Local provider request failed with HTTP ${response.status}`);
      }

      const body = await response.json();
      const choice = body.choices?.[0];
      const text = choice?.message?.content ?? choice?.text ?? '';
      const usage = {
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
        totalTokens: body.usage?.total_tokens ?? 0,
      };

      return {
        provider: 'local',
        model,
        text,
        usage,
      };
    },

    async *stream(input) {
      const model = input.model ?? defaultModel;
      const url = baseUrl.endsWith('/v1') 
        ? `${baseUrl}/chat/completions`
        : baseUrl.includes('localhost:3001')
          ? `${baseUrl}/api/openrouter/chat`
          : `${baseUrl}/chat/completions`;

      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: getNormalizedMessages(input),
          max_tokens: input.maxOutputTokens ?? 4096,
          temperature: input.temperature ?? 0.7,
          stream: true,
        }),
        signal: input.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Local provider stream request failed with HTTP ${response.status}: ${text}`);
      }

      yield* parseStreamBody(
        response,
        (data) => {
          const choice = data.choices?.[0];
          const text = choice?.delta?.content ?? choice?.text ?? '';
          return text ? { text } : null;
        },
        input.signal
      );
    }
  };
}
