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
  IAIService,
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
  kimi: 'kimi-k2.5',
  'kimi-k2.5': 'kimi-k2.5',
  'kimi-k2': 'kimi-k2.5',
  'kimi-2.5-pro': 'kimi-k2.5',
  'moonshot/kimi-2.5-pro': 'kimi-k2.5',
  'kimi-latest': 'kimi-latest',
  'kimi-thinking': 'kimi-k2-thinking',
  moonshot: 'kimi-k2.5',
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
  /** Cached /health `configured` map — drives key-aware provider rerouting. */
  private configuredCache: { value: Record<string, boolean>; at: number } | null = null;

  constructor(config?: { baseUrl?: string }) {
    this.baseUrl = config?.baseUrl ?? import.meta.env['VITE_AI_PROXY_URL'] ?? DEFAULT_BASE_URL;
  }

  /**
   * Last-known /health `configured` map, refreshed in the background when
   * stale (30s). Fully synchronous so the request path adds no await before
   * fetch (callers may abort synchronously right after invoking). Null = no
   * rerouting (legacy behavior) — also the case under vitest, where there is
   * no sidecar and the extra fetch would only break fetch-mock ordering.
   */
  private configuredSnapshot(): Record<string, boolean> | null {
    if (import.meta.env['VITEST']) return null;
    const now = Date.now();
    if (!this.configuredCache || now - this.configuredCache.at > 30_000) {
      void this.refreshConfigured();
    }
    return this.configuredCache?.value ?? null;
  }

  /** Dedups concurrent /health probes so a request burst fires one fetch. */
  private healthInFlight: Promise<void> | null = null;

  private refreshConfigured(): Promise<void> {
    this.healthInFlight ??= (async () => {
      try {
        const health = await this.health();
        if (health.reachable) {
          this.configuredCache = { value: health.configured, at: Date.now() };
        }
      } catch {
        // keep last snapshot
      } finally {
        this.healthInFlight = null;
      }
    })();
    return this.healthInFlight;
  }

  /**
   * Whether OpenRouter has a server key, awaiting a one-shot /health probe
   * when the snapshot is still cold (first request after start, before
   * initialize()'s background refresh lands). Used only on the quota-error
   * path, so the extra await costs nothing on the happy path.
   */
  private async isOpenRouterConfigured(): Promise<boolean> {
    // Warm the snapshot only when cold and outside vitest (the VITEST guard
    // keeps fetch-mock ordering deterministic; tests seed configuredCache).
    if (!this.configuredCache && !import.meta.env['VITEST']) {
      await this.refreshConfigured();
    }
    return this.configuredCache?.value['openrouter'] === true;
  }

  /**
   * No client API key required — the backend injects the provider key.
   * Warms the configured-keys snapshot so the first user call can reroute.
   */
  async initialize(): Promise<void> {
    logger.info(`[BackendProxy] Using AI proxy at ${this.baseUrl}`);
    void this.refreshConfigured();
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
   *
   * Key-aware rerouting: when the request's natural provider has NO key on the
   * server but OpenRouter does, translate the model to its OpenRouter-hosted
   * equivalent and send it via the OpenRouter route. This makes a single
   * OpenRouter key serve EVERY feature — including services that hardcode
   * Moonshot/Google model ids — instead of 503ing.
   */
  private buildRoute(model: string, configured?: Record<string, boolean> | null): ProxyRoute {
    const provider = this.resolveProvider(model);
    const openRouterAvailable = configured?.['openrouter'] === true;

    if (provider === AIProvider.MOONSHOT) {
      if (configured && configured['moonshot'] !== true && openRouterAvailable) {
        const rerouted = this.buildOpenRouterRoute(model);
        logger.info(
          `[BackendProxy] Rerouting ${model} -> ${rerouted.model} via OpenRouter (no Moonshot server key)`
        );
        return rerouted;
      }
      return {
        url: `${this.baseUrl}/moonshot/v1/chat/completions`,
        model: this.resolveMoonshotModel(model),
        provider,
      };
    }

    if (provider === AIProvider.GOOGLE) {
      if (configured && configured['google'] !== true && openRouterAvailable) {
        const rerouted = this.buildOpenRouterRoute(model);
        logger.info(
          `[BackendProxy] Rerouting ${model} -> ${rerouted.model} via OpenRouter (no Google server key)`
        );
        return rerouted;
      }
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

  /**
   * The OpenRouter-hosted equivalent of ANY model id. Moonshot upstream ids
   * exist on OpenRouter under the moonshotai/ author (verified against the
   * live catalog: moonshotai/kimi-k2.5, kimi-k2.6, kimi-latest); Google under
   * google/. Body shaping keys off the returned OPENROUTER provider, so
   * Moonshot's fixed-temperature/thinking fields are NOT applied here.
   */
  private buildOpenRouterRoute(model: string): ProxyRoute {
    const provider = this.resolveProvider(model);
    let orId: string;
    if (provider === AIProvider.MOONSHOT) {
      const upstreamId = this.resolveMoonshotModel(model);
      orId = upstreamId.startsWith('moonshotai/') ? upstreamId : `moonshotai/${upstreamId}`;
    } else if (provider === AIProvider.GOOGLE) {
      orId = model.startsWith('google/') ? model : `google/${model}`;
    } else {
      orId = OpenRouterService.resolveModelId(model);
    }
    return {
      url: `${this.baseUrl}/openrouter/api/v1/chat/completions`,
      model: orId,
      provider: AIProvider.OPENROUTER,
    };
  }

  /**
   * When an upstream answers with a quota/billing error (429 or 402) on a
   * non-OpenRouter route and the server has an OpenRouter key, return the
   * OpenRouter route to retry ONCE. Reads the cached /health snapshot
   * directly (a fallback decision happens after a real upstream response, so
   * the VITEST guard in configuredSnapshot must not blank it).
   */
  private async quotaFallbackRoute(
    status: number,
    route: ProxyRoute,
    model: string
  ): Promise<ProxyRoute | null> {
    if (status !== 429 && status !== 402) return null;
    if (route.provider === AIProvider.OPENROUTER) return null;
    // Await a health probe if the snapshot is cold so a quota error on the
    // very first request (before initialize()'s refresh lands) still falls
    // back instead of surfacing the raw 429.
    if (!(await this.isOpenRouterConfigured())) return null;
    return this.buildOpenRouterRoute(model);
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

  /** Track an AbortController for cancelStream, chained to the caller's signal. */
  private trackController(signal?: AbortSignal): AbortController {
    const controller = new AbortController();
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }
    this.activeControllers.add(controller);
    return controller;
  }

  /** POST one chat request to a route (body shaped per the route's provider). */
  private postChat(
    route: ProxyRoute,
    messages: ChatMessage[],
    options: { temperature?: number; maxTokens?: number; stream: boolean },
    controller: AbortController
  ): Promise<Response> {
    const body = this.buildBody(messages, route, options);
    return fetch(route.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  }

  private parseCompletion(data: {
    choices?: Array<{
      message?: { content?: string; reasoning_content?: string; reasoning?: string };
    }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  }): AICompletionResponse {
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
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const modelInput = request.model ?? DEFAULT_MODEL;
    const route = this.buildRoute(modelInput, this.configuredSnapshot());
    const options = {
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      stream: false,
    };
    const controller = this.trackController(request.signal);

    try {
      let response = await this.postChat(route, request.messages, options, controller);

      if (!response.ok) {
        const errorText = await response.text();
        const fallback = await this.quotaFallbackRoute(response.status, route, modelInput);
        if (!fallback) {
          throw new Error(`AI proxy error (${response.status}): ${errorText}`);
        }
        logger.warn(
          `[BackendProxy] ${route.provider} quota error (${response.status}) — ` +
            `retrying via OpenRouter as ${fallback.model}`
        );
        const originalStatus = response.status;
        response = await this.postChat(fallback, request.messages, options, controller);
        if (!response.ok) {
          const retryText = await response.text();
          throw new Error(
            `AI proxy error (${originalStatus}): ${errorText} ` +
              `(OpenRouter fallback failed with ${response.status}: ${retryText})`
          );
        }
      }

      return this.parseCompletion(await response.json());
    } finally {
      this.activeControllers.delete(controller);
    }
  }

  async *stream(
    messages: ChatMessage[],
    options?: AIChatOptions
  ): AsyncGenerator<string, void, unknown> {
    const modelInput = options?.model ?? DEFAULT_MODEL;
    const route = this.buildRoute(modelInput, this.configuredSnapshot());
    const requestOptions = {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      stream: true,
    };
    const controller = this.trackController(options?.signal);

    try {
      let response = await this.postChat(route, messages, requestOptions, controller);

      if (!response.ok || !response.body) {
        const text = await response.text();
        const fallback = await this.quotaFallbackRoute(response.status, route, modelInput);
        if (!fallback) {
          throw new Error(`AI proxy stream error (${response.status}): ${text}`);
        }
        logger.warn(
          `[BackendProxy] ${route.provider} quota error (${response.status}) — ` +
            `retrying stream via OpenRouter as ${fallback.model}`
        );
        const originalStatus = response.status;
        response = await this.postChat(fallback, messages, requestOptions, controller);
        if (!response.ok || !response.body) {
          const retryText = await response.text();
          throw new Error(
            `AI proxy stream error (${originalStatus}): ${text} ` +
              `(OpenRouter fallback failed with ${response.status}: ${retryText})`
          );
        }
      }

      yield* this.drainSSE(response.body);
    } finally {
      this.activeControllers.delete(controller);
    }
  }

  /** Read an SSE response body and yield each chunk's content delta. */
  private async *drainSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string, void, unknown> {
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
