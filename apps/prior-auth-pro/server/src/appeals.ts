import type { AuthUser } from '@vibetech/auth';

export interface AppealInput {
  diagnosis: string;
  procedure: string;
  denialReason: string;
}

export interface AppealGenerationContext {
  user: AuthUser;
  plan: 'free' | 'pro';
}

export interface AppealGenerationResult {
  appealLetter: string;
  source: 'ai' | 'local-draft';
  aiUsage?: AppealAiUsage;
}

export interface AppealAiUsage {
  provider?: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd?: number;
}

interface AiTextInput {
  system: string;
  prompt: string;
  temperature: number;
  metadata: Record<string, string>;
}

type AiTextResult =
  | string
  | {
      text?: string;
      content?: string;
      output?: string;
      appealLetter?: string;
      provider?: string;
      model?: string;
      usage?: {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
        costUsd?: number;
      };
    };

type AiGenerator = (input: AiTextInput) => AiTextResult | Promise<AiTextResult>;
type AiProviderFactory = (options: {
  apiKey: string;
  model?: string;
}) => AiProvider;
type AiMeteringRunner = (
  provider: AiProvider,
  input: {
    appId: string;
    prompt: string;
    model?: string;
    maxOutputTokens?: number;
    temperature?: number;
    metadata?: Record<string, string>;
  },
) => AiTextResult | Promise<AiTextResult>;

interface AiProvider {
  generate(input: {
    appId: string;
    prompt: string;
    model?: string;
    maxOutputTokens?: number;
    temperature?: number;
    metadata?: Record<string, string>;
  }): AiTextResult | Promise<AiTextResult>;
}

export function normalizeAppealInput(body: unknown): AppealInput | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const raw = body as Record<string, unknown>;
  const diagnosis = normalizeTextField(raw.diagnosis);
  const procedure = normalizeTextField(raw.procedure);
  const denialReason = normalizeTextField(raw.denialReason);

  if (!diagnosis || !procedure || !denialReason) {
    return null;
  }

  return {
    diagnosis,
    procedure,
    denialReason,
  };
}

export async function generateAppealLetter(
  input: AppealInput,
  context: AppealGenerationContext,
): Promise<AppealGenerationResult> {
  const aiGenerator = await loadAiGenerator();
  if (!aiGenerator) {
    return {
      appealLetter: generateFallbackAppeal(input),
      source: 'local-draft',
    };
  }

  const result = await aiGenerator({
    system:
      'You draft formal payer appeal letters for prior authorization denials. Write with clinical, medical necessity language. Do not invent facts beyond the provided diagnosis, procedure, and denial reason.',
    prompt: buildAppealPrompt(input),
    temperature: 0.2,
    metadata: {
      app: 'prior-auth-pro',
      userId: context.user.id,
      plan: context.plan,
    },
  });

  const appealLetter = unwrapAiText(result);
  if (!appealLetter) {
    return {
      appealLetter: generateFallbackAppeal(input),
      source: 'local-draft',
    };
  }

  return {
    appealLetter,
    source: 'ai',
    aiUsage: extractAiUsage(result),
  };
}

export function generateFallbackAppeal(input: AppealInput): string {
  return [
    'To the Medical Review Department:',
    '',
    `I am writing to appeal the denial of coverage for ${input.procedure} for a patient with ${input.diagnosis}. The denial rationale states: ${input.denialReason}.`,
    '',
    `The requested ${input.procedure} meets medical necessity criteria because it directly addresses the documented diagnosis of ${input.diagnosis}. Delaying or denying this service may prevent timely evaluation and treatment, increase the risk of clinical deterioration, and require avoidable downstream care.`,
    '',
    'Please reconsider the denial based on the clinical relationship between the diagnosis, the requested service, and the need for appropriate evidence-based care. The requested service is not elective or convenience-based; it is part of a reasonable treatment plan intended to confirm, treat, or manage the patient condition.',
    '',
    'For these reasons, I respectfully request that the plan overturn the denial and authorize coverage for the requested service.',
    '',
    'Sincerely,',
    'PriorAuthPro Appeal Desk',
  ].join('\n');
}

function normalizeTextField(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function buildAppealPrompt(input: AppealInput): string {
  return [
    'Draft a formal prior authorization appeal letter.',
    '',
    `Diagnosis: ${input.diagnosis}`,
    `Requested procedure: ${input.procedure}`,
    `Denial reason: ${input.denialReason}`,
    '',
    'Requirements:',
    '- Use a professional payer-facing tone.',
    '- Include medical necessity language.',
    '- Ask for reconsideration and authorization.',
    '- Do not include citations or facts that were not provided.',
  ].join('\n');
}

async function loadAiGenerator(): Promise<AiGenerator | null> {
  try {
    const module = (await import('@vibetech/ai')) as unknown;
    return resolveAiGenerator(module);
  } catch {
    return null;
  }
}

function resolveAiGenerator(module: unknown): AiGenerator | null {
  if (!module || typeof module !== 'object') {
    return null;
  }

  const record = module as Record<string, unknown>;
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const runWithMetering = resolveMeteringRunner(record.generateWithMetering);

  if (openRouterKey) {
    const createProvider = resolveProviderFactory(record.createFetchOpenRouterProvider);
    if (createProvider) {
      const provider = createProvider({
        apiKey: openRouterKey,
        model: optionalTrimmedEnv('PRIOR_AUTH_AI_MODEL'),
      });
      return runProvider(provider, runWithMetering);
    }
  }

  if (geminiKey) {
    const createProvider = resolveProviderFactory(record.createFetchGeminiProvider);
    if (createProvider) {
      const provider = createProvider({
        apiKey: geminiKey,
        model: optionalTrimmedEnv('PRIOR_AUTH_AI_MODEL'),
      });
      return runProvider(provider, runWithMetering);
    }
  }

  const defaultExport = record.default;
  if (defaultExport && typeof defaultExport === 'object') {
    return resolveAiGenerator(defaultExport);
  }

  return null;
}

function runProvider(provider: AiProvider, runWithMetering: AiMeteringRunner | null): AiGenerator {
  return async (input) => {
    const prompt = `${input.system}\n\n${input.prompt}`;
    const request = {
      appId: 'prior-auth-pro',
      prompt,
      maxOutputTokens: 900,
      temperature: input.temperature,
      metadata: input.metadata,
    };

    return runWithMetering ? runWithMetering(provider, request) : provider.generate(request);
  };
}

function resolveProviderFactory(value: unknown): AiProviderFactory | null {
  return typeof value === 'function' ? (value as AiProviderFactory) : null;
}

function resolveMeteringRunner(value: unknown): AiMeteringRunner | null {
  return typeof value === 'function' ? (value as AiMeteringRunner) : null;
}

function optionalTrimmedEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  if (!value) {
    return undefined;
  }
  return value;
}

function unwrapAiText(result: AiTextResult): string | null {
  if (typeof result === 'string') {
    return result.trim() || null;
  }

  for (const key of ['appealLetter', 'text', 'content', 'output'] as const) {
    const value = result[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function extractAiUsage(result: AiTextResult): AppealAiUsage | undefined {
  if (typeof result === 'string' || !result.usage) {
    return undefined;
  }

  const inputTokens = Math.max(0, result.usage.inputTokens ?? 0);
  const outputTokens = Math.max(0, result.usage.outputTokens ?? 0);
  const totalTokens = Math.max(0, result.usage.totalTokens ?? inputTokens + outputTokens);

  return {
    provider: result.provider,
    model: result.model,
    inputTokens,
    outputTokens,
    totalTokens,
    costUsd: result.usage.costUsd,
  };
}
