/**
 * Backend Proxy Service for Vibe Code Studio
 *
 * Routes all AI calls through the backend proxy instead of calling providers
 * directly with client-side keys. The server injects the provider key and
 * authenticates via session cookie, so the client sends NO Authorization
 * header and uses credentials: 'include'.
 *
 * Transparent passthrough — the client sends the full upstream path after the
 * provider segment:
 *   - OpenRouter: {base}/openrouter/api/v1/chat/completions
 *   - Moonshot:   {base}/moonshot/v1/chat/completions
 *   - Google:     {base}/google/v1beta/openai/chat/completions
 *
 * Implements IAIService so it can be wrapped by ServiceAdapter, exactly like
 * the direct provider services (Moonshot, OpenRouter, Google).
 */

import { logger } from '../../Logger';
import type {
  AIChatOptions,
  AICompletionRequest,
  AICompletionResponse,
  ChatMessage,
  IAIService
} from '../../../types/ai';
import type { AIModel } from '../AIProviderInterface';
import { AIProvider, MODEL_REGISTRY } from '../AIProviderInterface';
import { OpenRouterService } from './OpenRouterService';

const DEFAULT_BASE_URL = 'http://localhost:5004/api/ai';
const DEFAULT_MODEL = 'moonshot/kimi-2.5-pro';
const DEFAULT_MAX_TOKENS = 8192;

// Moonshot/Kimi rejects arbitrary temperatures — it requires a fixed value per
// mode (see MoonshotService). Thinking mode must be 1.0; non-thinking 0.6.
const THINKING_TEMPERATURE = 1.0;
const NON_THINKING_TEMPERATURE = 0.6;

/**
 * Moonshot registry-id -> upstream Moonshot model id.
 * Mirrors MoonshotService.resolveModel so proxy and direct mode agree.
 */
const MOONSHOT_MODEL_MAP: Record<string, string> = {
  'kimi': 'kimi-k2.5',
  'kimi-k2.5': 'kimi-k2.5',
  'kimi-k2': 'kimi-k2.5',
  'kimi-2.5-pro': 'kimi-k2.5',
  'moonshot/kimi-2.5-pro': 'kimi-k2.5',
  'kimi-latest': 'kimi-latest',
  'kimi-thinking': 'kimi-k2-thinking',
  'moonshot': 'kimi-k2.5',
  'moonshot-v1-32k': 'moonshot-v1-32k',
  'moonshot-v1-128k': 'moonshot-v1-128k',
};

interface ProxyRoute {
  /** Full proxy URL including the upstream path after the provider segment */
  url: string;
  /** Upstream model id to send in the request body */
  model: string;
  /** Resolved provider — drives provider-specific request shaping */
  provider: AIProvider;
}

interface OpenAIChatRequestBody {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream: boolean;
  /** Moonshot-only: explicit thinking-mode toggle */
  thinking?: { type: 'enabled' | 'disabled' };
}

export class BackendProxyService implements IAIService {
  id = 'backend-proxy';
  private baseUrl: string;
  private activeControllers: Set<AbortController> = new Set();

  constructor(config?: { baseUrl?: string }) {
    this.baseUrl =
      config?.baseUrl ?? import.meta.env['VITE_AI_PROXY_URL'] ?? DEFAULT_BASE_URL;
  }

  /**
   * No client API key required — the backend injects the provider key.
   */
  async initialize(): Promise<void> {
    logger.info(`[BackendProxy] Using AI proxy at ${this.baseUrl}`);
  }

  /**
   * Resolve the provider for a model from the registry.
   * Defaults to OpenRouter, which mirrors the direct services' fallback.
   */
  private resolveProvider(model: string): AIProvider {
    // Registered models win (keeps e.g. OpenRouter-hosted Gemini on OpenRouter).
    const registered = MODEL_REGISTRY[model]?.provider;
    if (registered) return registered;

    // Unregistered ids: recognize Moonshot/Kimi aliases and Google models so they
    // route to the right upstream instead of silently defaulting to OpenRouter.
    const lower = model.toLowerCase();
    if (lower in MOONSHOT_MODEL_MAP || lower.startsWith('kimi') || lower.startsWith('moonshot')) {
      return AIProvider.MOONSHOT;
    }
    if (lower.startsWith('google/') || lower.startsWith('gemini')) {
      return AIProvider.GOOGLE;
    }
    return AIProvider.OPENROUTER;
  }

  /**
   * Map a registry model id to the upstream Moonshot model id.
   * Replicates MoonshotService.resolveModel minimally.
   */
  private resolveMoonshotModel(model: string): string {
    return MOONSHOT_MODEL_MAP[model.toLowerCase()] ?? model;
  }

  /**
   * Build the per-provider proxy URL and upstream model id.
   */
  private buildRoute(model: string): ProxyRoute {
    const provider = this.resolveProvider(model);

    if (provider === AIProvider.MOONSHOT) {
      return {
        url: `${this.baseUrl}/moonshot/v1/chat/completions`,
        model: this.resolveMoonshotModel(model),
        provider,
      };
    }

    if (provider === AIProvider.GOOGLE) {
      return {
        url: `${this.baseUrl}/google/v1beta/openai/chat/completions`,
        model: model.replace(/^google\//, ''),
        provider,
      };
    }

    // OpenRouter (and everything else routed through it). Apply the SAME alias
    // mapping the direct OpenRouterService uses so bare ids (e.g. 'gpt-4o' from the
    // analysis services) become canonical 'author/slug' ids instead of 400ing upstream.
    return {
      url: `${this.baseUrl}/openrouter/api/v1/chat/completions`,
      model: OpenRouterService.resolveModelId(model),
      provider,
    };
  }

  /** Kimi 'thinking'/'r1' variants run in thinking mode (mirrors MoonshotService). */
  private shouldUseThinking(model: string): boolean {
    return model.includes('thinking') || model.includes('r1');
  }

  private buildBody(
    messages: ChatMessage[],
    route: ProxyRoute,
    options: { temperature?: number; maxTokens?: number; stream: boolean }
  ): OpenAIChatRequestBody {
    const body: OpenAIChatRequestBody = {
      model: route.model,
      messages,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: options.stream,
    };

    // Moonshot/Kimi rejects arbitrary temperatures and needs an explicit thinking
    // mode; mirror MoonshotService so proxy and direct mode behave identically.
    // Every other provider gets the caller's temperature passed straight through.
    if (route.provider === AIProvider.MOONSHOT) {
      const useThinking = this.shouldUseThinking(route.model);
      body.temperature = useThinking ? THINKING_TEMPERATURE : NON_THINKING_TEMPERATURE;
      body.thinking = { type: useThinking ? 'enabled' : 'disabled' };
    } else {
      body.temperature = options.temperature;
    }

    return body;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const modelInput = request.model ?? DEFAULT_MODEL;
    const route = this.buildRoute(modelInput);
    const body = this.buildBody(request.messages, route, {
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      stream: false,
    });

    const controller = new AbortController();
    if (request.signal) {
      request.signal.addEventListener('abort', () => controller.abort());
    }
    this.activeControllers.add(controller);

    try {
      const response = await fetch(route.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI proxy error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      return {
        content: choice?.message?.content ?? '',
        // kimi-k2.5 returns reasoning in `reasoning_content`; the newer K2.6 uses
        // `reasoning`. Accept either so thinking output is never silently dropped.
        reasoning_content: choice?.message?.reasoning_content ?? choice?.message?.reasoning,
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
        },
        provider: 'backend-proxy',
      };
    } finally {
      this.activeControllers.delete(controller);
    }
  }

  async *stream(
    messages: ChatMessage[],
    options?: AIChatOptions
  ): AsyncGenerator<string, void, unknown> {
    const modelInput = options?.model ?? DEFAULT_MODEL;
    const route = this.buildRoute(modelInput);
    const body = this.buildBody(messages, route, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      stream: true,
    });

    const controller = new AbortController();
    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }
    this.activeControllers.add(controller);

    try {
      const response = await fetch(route.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        throw new Error(`AI proxy stream error (${response.status}): ${text}`);
      }

      yield* this.drainSSE(response.body);
    } finally {
      this.activeControllers.delete(controller);
    }
  }

  /** Read an SSE response body and yield each chunk's content delta. */
  private async *drainSSE(
    body: ReadableStream<Uint8Array>
  ): AsyncGenerator<string, void, unknown> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            const content = this.parseChunk(trimmed);
            if (content) yield content;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private parseChunk(line: string): string | null {
    try {
      const data = JSON.parse(line.slice(6));
      return data.choices?.[0]?.delta?.content ?? null;
    } catch {
      return null;
    }
  }

  async chat(messages: ChatMessage[], options?: AIChatOptions): Promise<string> {
    const response = await this.complete({
      messages,
      model: options?.model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });
    return response.content;
  }

  async generateText(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number; model?: string }
  ): Promise<string> {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  /**
   * Probe the proxy /health endpoint. Reports both reachability and which
   * upstreams actually have a server-side key, so callers can distinguish
   * "backend down" from "no key configured" instead of a blanket failure.
   */
  async health(): Promise<{
    reachable: boolean;
    configured: Record<string, boolean>;
    anyConfigured: boolean;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { credentials: 'include' });
      if (!response.ok) {
        return { reachable: false, configured: {}, anyConfigured: false };
      }
      try {
        const data = (await response.json()) as { configured?: Record<string, boolean> };
        const configured = data?.configured ?? {};
        return {
          reachable: true,
          configured,
          anyConfigured: Object.values(configured).some(Boolean),
        };
      } catch {
        // Non-JSON 200 (bare health stub): reachable, config unknown — treat as
        // usable rather than hard-failing.
        return { reachable: true, configured: {}, anyConfigured: true };
      }
    } catch (_error) {
      return { reachable: false, configured: {}, anyConfigured: false };
    }
  }

  /**
   * Availability check used by the provider factory. Available only when the
   * proxy is reachable AND at least one upstream has a server key — a bare 200
   * with zero keys configured is NOT actually usable.
   */
  async validateConnection(): Promise<boolean> {
    const { reachable, anyConfigured } = await this.health();
    return reachable && anyConfigured;
  }

  /**
   * All models in the registry are reachable via the proxy.
   */
  async getAvailableModels(): Promise<AIModel[]> {
    return Object.values(MODEL_REGISTRY);
  }

  async getUsageStats(): Promise<{
    tokensUsed: number;
    estimatedCost: number;
    requestCount: number;
  }> {
    return { tokensUsed: 0, estimatedCost: 0, requestCount: 0 };
  }

  cancelStream(): void {
    for (const controller of this.activeControllers) {
      controller.abort();
    }
    this.activeControllers.clear();
  }
}
