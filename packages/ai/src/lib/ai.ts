import { currentTenantId, type TenantId } from '@vibetech/monetization';

export type AiProviderName = 'gemini' | 'openrouter';

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd?: number;
}

export interface AiGenerateInput {
  appId: string;
  prompt: string;
  tenantId?: TenantId;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
  metadata?: Record<string, string>;
}

export interface AiGenerationResult {
  provider: AiProviderName;
  model: string;
  text: string;
  usage: AiUsage;
}

export interface AiProvider {
  readonly name: AiProviderName;
  generate(input: AiGenerateInput): Promise<AiGenerationResult>;
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

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export const DEFAULT_TOKEN_RATES: Record<AiProviderName, TokenRate> = {
  gemini: {
    inputPerMillion: 0.1,
    outputPerMillion: 0.4,
  },
  openrouter: {
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
}

export function createAiRouter(config: {
  gemini: AiProvider;
  openRouter?: AiProvider;
}): AiRouter {
  return new AiRouter(config.gemini, config.openRouter);
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
      const response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${options.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: input.prompt }],
              },
            ],
            generationConfig: {
              maxOutputTokens: input.maxOutputTokens,
              temperature: input.temperature,
            },
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`Gemini request failed with HTTP ${response.status}`);
      }

      const body = (await response.json()) as GeminiGenerateResponse;
      const usage = normalizeGeminiUsage(body.usageMetadata);
      return {
        provider: 'gemini',
        model,
        text: body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '',
        usage,
      };
    },
  };
}

export function createFetchOpenRouterProvider(options: {
  apiKey: string;
  model?: string;
  fetchImpl?: FetchLike;
  providerOrder?: string[];
}): AiProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const defaultModel = options.model ?? 'google/gemini-2.5-flash';

  return {
    name: 'openrouter',
    async generate(input) {
      const model = input.model ?? defaultModel;
      const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: input.prompt }],
          max_tokens: input.maxOutputTokens,
          temperature: input.temperature,
          provider:
            options.providerOrder == null
              ? undefined
              : {
                  order: options.providerOrder,
                },
        }),
      });
      if (!response.ok) {
        throw new Error(`OpenRouter request failed with HTTP ${response.status}`);
      }

      const body = (await response.json()) as OpenRouterChatResponse;
      const usage = normalizeOpenRouterUsage(body.usage);
      return {
        provider: 'openrouter',
        model: body.model ?? model,
        text: body.choices?.[0]?.message?.content ?? '',
        usage,
      };
    },
  };
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

interface OpenRouterChatResponse {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

const normalizeGeminiUsage = (
  usageMetadata: GeminiGenerateResponse['usageMetadata'],
): AiUsage => {
  const inputTokens = usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: usageMetadata?.totalTokenCount ?? inputTokens + outputTokens,
  };
};

const normalizeOpenRouterUsage = (usage: OpenRouterChatResponse['usage']): AiUsage => {
  const inputTokens = usage?.prompt_tokens ?? 0;
  const outputTokens = usage?.completion_tokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage?.total_tokens ?? inputTokens + outputTokens,
  };
};
