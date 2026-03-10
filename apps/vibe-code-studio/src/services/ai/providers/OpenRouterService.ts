import type {
    AIChatOptions,
    AICompletionRequest,
    AICompletionResponse,
    ChatMessage,
    IAIService
} from '../../../types/ai';
import { isReasoningModel, parseDeepSeekStream } from '../../../utils/deepseekParser';
import { logger } from '../../Logger';

export class OpenRouterService implements IAIService {
  id = 'openrouter';
  // Direct OpenRouter API (production) or local proxy (development)
  private baseUrl = import.meta.env?.['VITE_OPENROUTER_PROXY_URL'] ?? 'https://openrouter.ai/api/v1';
  private apiKey: string;
  private siteUrl: string;
  private siteName: string;
  private useProxy: boolean;

  constructor(config?: { apiKey?: string; siteUrl?: string; siteName?: string }) {
    this.apiKey = config?.apiKey ?? import.meta.env?.['VITE_OPENROUTER_API_KEY'] ?? '';
    this.siteUrl = config?.siteUrl ?? 'https://vibecodestudio.com';
    this.siteName = config?.siteName ?? 'Vibe Code Studio';
    // Use proxy if explicitly configured, otherwise use direct API
    this.useProxy = import.meta.env?.['VITE_OPENROUTER_PROXY_URL'] !== undefined;

    if (!this.apiKey && !this.useProxy) {
      logger.warn('[OpenRouter] No API key provided. Service will not work without authentication.');
    }
  }

  async initialize(): Promise<void> {
    const directApiUrl = import.meta.env?.['VITE_OPENROUTER_BASE_URL'] ?? 'https://openrouter.ai/api/v1';

    if (this.useProxy) {
      // Check if proxy is reachable
      try {
        const response = await fetch(`${this.baseUrl}/health`);
        if (response.ok) {
          logger.info('[OpenRouter] Connected to proxy at ' + this.baseUrl);
        } else {
          logger.warn('[OpenRouter] Proxy health check failed at ' + this.baseUrl + '. Falling back to direct API.');
          this.useProxy = false;
          this.baseUrl = directApiUrl;
        }
      } catch (_error) {
        logger.warn('[OpenRouter] Could not connect to proxy at ' + this.baseUrl + '. Falling back to direct API.');
        this.useProxy = false;
        this.baseUrl = directApiUrl;
      }
    } else {
      this.baseUrl = directApiUrl;
      logger.info('[OpenRouter] Using direct API at ' + this.baseUrl);
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (!this.useProxy && this.apiKey) {
      // Direct API: include authorization and site headers
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['HTTP-Referer'] = this.siteUrl;
      headers['X-Title'] = this.siteName;
    }

    return headers;
  }

  // Map internal Vibe IDs to OpenRouter IDs
  // Updated: January 3, 2026 - Based on current OpenRouter model list
  private static readonly MODEL_MAP: Record<string, string> = {
      // ========================================
      // OpenAI - GPT-5 Series (January 2026)
      // ========================================
      'gpt-5.3-codex': 'openai/gpt-5.3-codex',
      'gpt-5.2-codex': 'openai/gpt-5.2-codex',          // Best for coding (current)
      'gpt-5.2-pro': 'openai/gpt-5.2-pro',              // Best for complex reasoning/agentic tasks
      'gpt-5.2': 'openai/gpt-5.2',                      // Standard flagship (balanced)
      'gpt-5.1-codex-max': 'openai/gpt-5.1-codex-max',  // Legacy codex alias
      'gpt-5-mini': 'openai/gpt-5-mini',                // Replaces gpt-4o-mini (cheap/fast)

      // OpenAI Common Aliases
      'gpt-5': 'openai/gpt-5.2',                        // Alias to flagship
      'gpt-5-codex': 'openai/gpt-5.2-codex',            // Alias to codex
      'gpt-latest': 'openai/gpt-5.2-pro',               // Alias to latest
      'gpt-fast': 'openai/gpt-5-mini',                  // Alias to fast/cheap
      'gpt-code': 'openai/gpt-5.2-codex',               // Alias for coding

      // OpenAI Legacy (GPT-4 era)
      'gpt-4o': 'openai/gpt-4o',
      'gpt-4o-mini': 'openai/gpt-4o-mini',
      'o1-preview': 'openai/o1-preview',
      'o1-mini': 'openai/o1-mini',

      // ========================================
      // Anthropic - Claude 4.5 Series (January 2026)
      // ========================================
      'claude-4.6-opus': 'anthropic/claude-opus-4.6',
      'claude-4.6-sonnet': 'anthropic/claude-sonnet-4.6',
      'claude-4.5-opus': 'anthropic/claude-opus-4.5',       // Maximum intelligence, higher latency
      'claude-opus-4.5': 'anthropic/claude-opus-4.5',       // Alias
      'claude-4.5-sonnet': 'anthropic/claude-sonnet-4.5',   // Daily driver for devs (speed/cost)
      'claude-sonnet-4.5': 'anthropic/claude-sonnet-4.5',   // Alias

      // Claude Common Aliases
      'claude-opus': 'anthropic/claude-opus-4.5',
      'claude-sonnet': 'anthropic/claude-sonnet-4.5',
      'claude-latest': 'anthropic/claude-opus-4.5',
      'claude': 'anthropic/claude-sonnet-4.5',              // Default to Sonnet 4.5

      // Claude Legacy (3.5 series - still widely used)
      'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
      'claude-3-5-sonnet': 'anthropic/claude-3.5-sonnet',
      'claude-3-opus': 'anthropic/claude-3-opus',
      'claude-3-haiku': 'anthropic/claude-3-haiku',

      // ========================================
      // Google - Gemini 2.5/3 Series (January 2026)
      // ========================================
      'gemini-3.1-pro': 'google/gemini-3.1-pro',
      'gemini-3-flash': 'google/gemini-3-flash-preview',    // Fastest model currently available
      'gemini-3-flash-preview': 'google/gemini-3-flash-preview',
      'gemini-2.5-pro': 'google/gemini-2.5-pro',            // Stable high-end reasoning
      'gemini-2.5-flash': 'google/gemini-2.5-flash',        // Standard high-throughput

      // Gemini Common Aliases
      'gemini-flash': 'google/gemini-3-flash-preview',
      'gemini-pro': 'google/gemini-2.5-pro',
      'gemini-latest': 'google/gemini-2.5-pro',

      // Gemini Legacy
      'gemini-2.0-flash-exp': 'google/gemini-2.0-flash-exp:free',
      'gemini-1.5-pro': 'google/gemini-pro-1.5',
      'gemini-1.5-flash': 'google/gemini-flash-1.5',

      // ========================================
      // DeepSeek V3.2 & R1 (January 2026)
      // ========================================
      'deepseek-v3.2': 'deepseek/deepseek-v3.2',        // General purpose chat/code
      'deepseek-r1': 'deepseek/deepseek-r1',            // Reasoning/CoT model (slow, high IQ)

      // DeepSeek Aliases
      'deepseek-reasoner': 'deepseek/deepseek-r1',      // Alias for R1
      'deepseek-chat': 'deepseek/deepseek-v3.2',        // Default to v3.2
      'deepseek': 'deepseek/deepseek-v3.2',
      'deepseek-latest': 'deepseek/deepseek-v3.2',

      // ========================================
      // Low/Free Models (January 2026)
      // ========================================
      'lfm-2.5-thinking': 'liquid/lfm-2.5-1.2b-thinking:free',
      'lfm-2.5-instruct': 'liquid/lfm-2.5-1.2b-instruct:free',
      'kimi-2.5-pro': 'moonshot/kimi-2.5-pro',
      'glm-5': 'z-ai/glm-5',
      'glm-4.7-flash': 'z-ai/glm-4.7-flash',

      // ========================================
      // xAI - Grok 4 Series (January 2026)
      // ========================================
      'grok-4': 'x-ai/grok-4',                          // Latest flagship
      'grok-4.1-fast': 'x-ai/grok-4.1-fast',            // Low latency variant
      'grok-code-fast': 'x-ai/grok-code-fast-1',        // Optimized for code generation

      // Grok Aliases
      'grok': 'x-ai/grok-4',                            // Default to Grok 4
      'grok-fast': 'x-ai/grok-4.1-fast',
      'grok-code': 'x-ai/grok-code-fast-1',
      'grok-latest': 'x-ai/grok-4',

      // Grok Legacy
      'grok-beta': 'x-ai/grok-beta',

      // ========================================
      // FREE MODELS - Cost-Effective for Simple Tasks (January 2026)
      // ========================================

      // Meta - Llama 3.x Series (FREE)
      'llama-3.3-70b': 'meta-llama/llama-3.3-70b-instruct:free',       // Latest free flagship
      'llama-3.2-90b': 'meta-llama/llama-3.2-90b-vision-instruct:free', // Vision support
      'llama-3.2-11b': 'meta-llama/llama-3.2-11b-vision-instruct:free', // Fast vision
      'llama-3.2-3b': 'meta-llama/llama-3.2-3b-instruct:free',         // Ultra-fast, simple tasks
      'llama-3.2-1b': 'meta-llama/llama-3.2-1b-instruct:free',         // Fastest free model
      'llama-3.1-405b': 'meta-llama/llama-3.1-405b-instruct:free',     // Largest free model
      'llama-3.1-70b': 'meta-llama/llama-3.1-70b-instruct:free',
      'llama-3.1-8b': 'meta-llama/llama-3.1-8b-instruct:free',

      // Llama Aliases
      'llama-free': 'meta-llama/llama-3.3-70b-instruct:free',
      'llama-fast': 'meta-llama/llama-3.2-3b-instruct:free',
      'llama-vision': 'meta-llama/llama-3.2-11b-vision-instruct:free',
      'free-llama': 'meta-llama/llama-3.3-70b-instruct:free',

      // Alibaba - Qwen 2.5 Series (FREE)
      'qwen-2.5-72b': 'qwen/qwen-2.5-72b-instruct:free',              // Best free reasoning
      'qwen-2.5-coder-32b': 'qwen/qwen-2.5-coder-32b-instruct:free',  // Best free coder
      'qwen-2.5-7b': 'qwen/qwen-2.5-7b-instruct:free',                // Fast and capable
      'qwq-32b': 'qwen/qwq-32b-preview:free',                         // Reasoning specialist

      // Qwen Aliases
      'qwen-free': 'qwen/qwen-2.5-72b-instruct:free',
      'qwen-code': 'qwen/qwen-2.5-coder-32b-instruct:free',
      'qwen-fast': 'qwen/qwen-2.5-7b-instruct:free',
      'free-qwen': 'qwen/qwen-2.5-72b-instruct:free',

      // Qwen model name fixes (HuggingFace naming → OpenRouter naming)
      'qwen/qwen3-coder': 'qwen/qwen-2.5-coder-32b-instruct:free',
      'Qwen/Qwen2.5-Coder-7B-Instruct': 'qwen/qwen-2.5-coder-32b-instruct:free',
      'Qwen/Qwen2.5-Coder-32B-Instruct': 'qwen/qwen-2.5-coder-32b-instruct:free',

      // Microsoft - Phi-3.5 Series (FREE)
      'phi-3.5-mini': 'microsoft/phi-3.5-mini-128k-instruct:free',    // Mini but capable
      'phi-3-mini': 'microsoft/phi-3-mini-128k-instruct:free',
      'phi-3-medium': 'microsoft/phi-3-medium-128k-instruct:free',

      // Phi Aliases
      'phi-free': 'microsoft/phi-3.5-mini-128k-instruct:free',
      'free-phi': 'microsoft/phi-3.5-mini-128k-instruct:free',

      // Mistral - Free Tier
      'mistral-7b': 'mistralai/mistral-7b-instruct:free',            // Classic free model
      'mixtral-8x7b': 'mistralai/mixtral-8x7b-instruct:free',        // MoE free model

      // Mistral Aliases
      'mistral-free': 'mistralai/mistral-7b-instruct:free',
      'free-mistral': 'mistralai/mistral-7b-instruct:free',

      // Google - Gemini Free Tier (Already exists but adding aliases)
      'gemini-free': 'google/gemini-2.0-flash-exp:free',
      'free-gemini': 'google/gemini-2.0-flash-exp:free',
      'gemini-flash-free': 'google/gemini-2.0-flash-exp:free',

      // ========================================
      // SMART ALIASES - Auto-select best free model for task type
      // ========================================
      'free': 'meta-llama/llama-3.3-70b-instruct:free',              // Default free (best quality)
      'free-fast': 'meta-llama/llama-3.2-3b-instruct:free',          // Fastest free
      'free-code': 'qwen/qwen-2.5-coder-32b-instruct:free',          // Best free for code
      'free-reasoning': 'qwen/qwen-2.5-72b-instruct:free',           // Best free for reasoning
      'free-vision': 'meta-llama/llama-3.2-11b-vision-instruct:free', // Free with vision
  };

  private resolveModel(model: string): string {
    const mapped = OpenRouterService.MODEL_MAP[model];
    if (mapped) return mapped;

    // If it already contains a slash, assume it's a valid OpenRouter ID
    if (model.includes('/')) return model;

    // Fallback: assume OpenAI/ prefix if unknown
    return `openai/${model}`;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    // Use proxy endpoint or direct OpenRouter API
    const url = this.useProxy
      ? `${this.baseUrl}/api/openrouter/chat`
      : `${this.baseUrl}/chat/completions`;
    const modelInput = request.model ?? 'deepseek/deepseek-v3.2';
    const model = this.resolveModel(modelInput);

    // OpenRouter specific: mapping 'maxTokens' to 'max_tokens' is standard
    const body = {
      model, // Resolved model
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: false
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.text();
      let errorMsg = `OpenRouter Error (${response.status})`;
      try {
        const json = JSON.parse(err);
        if (json.error?.message) errorMsg += `: ${json.error.message}`;
      } catch {
        errorMsg += `: ${err}`;
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const choice = data.choices[0];
    const rawContent = choice.message.content;

    // Parse reasoning if using a reasoning model
    const parsed = isReasoningModel(model) ? parseDeepSeekStream(rawContent) : { content: rawContent, reasoning: null };

    return {
      content: parsed.content,
      reasoning_content: parsed.reasoning ?? undefined,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0
      },
      provider: 'openrouter'
    };
  }

  async *stream(messages: ChatMessage[], options?: AIChatOptions): AsyncGenerator<string, void, unknown> {
    // Use proxy endpoint or direct OpenRouter API
    const url = this.useProxy
      ? `${this.baseUrl}/api/openrouter/chat`
      : `${this.baseUrl}/chat/completions`;
    const modelInput = options?.model ?? 'deepseek/deepseek-v3.2';
    const model = this.resolveModel(modelInput);
    const body = {
      model,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      stream: true
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(`OpenRouter Stream Error (${response.status}): ${text}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // Keep incomplete line

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

  /*
   * Helper to parse and yield content from SSE data line.
   * Note: Required generator syntax in main loop, effectively inlined here for clarity
   * but 'yield' cannot be easily delegated to a void-returning helper without syntax tricks.
   * So we will stick to the loop but simplified.
   *
   * Improved simplified loop:
   */
  private parseChunk(line: string): string | null {
    try {
      const data = JSON.parse(line.slice(6));
      return data.choices?.[0]?.delta?.content ?? null;
    } catch {
      return null;
    }
  }

  // Helper for direct chat without full request object
  async chat(messages: ChatMessage[], options?: AIChatOptions): Promise<string> {
    const request: AICompletionRequest = {
      messages,
      ...(options?.model && { model: options.model }),
      ...(options?.temperature && { temperature: options.temperature }),
      ...(options?.maxTokens && { maxTokens: options.maxTokens })
    };
    const response = await this.complete(request);
    return response.content;
  }

  async generateText(prompt: string, options?: { maxTokens?: number; temperature?: number; model?: string; signal?: AbortSignal }): Promise<string> {
    return this.chat([{ role: 'user', content: prompt }], options);
  }
}
