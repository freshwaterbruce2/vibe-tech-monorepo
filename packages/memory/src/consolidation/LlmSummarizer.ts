/**
 * LLM-backed Summarizer
 *
 * Calls an OpenAI-compatible chat endpoint to produce high-quality
 * summaries of episodic memory batches. Falls back to extractive
 * summarization on failure.
 */

// ── Config ──────────────────────────────────────────────────

export interface LlmSummarizerConfig {
  /** Full URL for the chat completions endpoint */
  apiUrl: string;
  /** Model identifier (e.g. 'anthropic/claude-sonnet-4-20250514') */
  model: string;
  /** Bearer token (optional — some proxies don't need one) */
  apiKey?: string;
  /** Request timeout in ms (default: 30_000) */
  timeoutMs?: number;
  /** Max tokens for the response (default: 512) */
  maxTokens?: number;
}

export interface SummarizeRequest {
  /** The texts to summarize (e.g. Q/A pairs from a session) */
  texts: string[];
  /** Context hint shown to the LLM: 'session' | 'topic' | 'domain' */
  level?: 'session' | 'topic' | 'domain';
}

export interface SummarizeResult {
  summary: string;
  /** Whether the LLM was used or we fell back to extractive */
  source: 'llm' | 'extractive';
  /** Model used (only when source === 'llm') */
  model?: string;
}

// ── Extractive Fallback ─────────────────────────────────────

function extractiveFallback(texts: string[]): string {
  if (texts.length === 0) return '';
  if (texts.length === 1) return texts[0];

  const sentences = texts
    .flatMap((t) => t.split(/[.!?]+/).map((s) => s.trim()))
    .filter((s) => s.length > 15 && s.length < 300);

  const seen = new Set<string>();
  const unique = sentences.filter((s) => {
    const key = s.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const selected = unique.sort((a, b) => a.length - b.length).slice(0, 5);
  return selected.join('. ') + '.';
}

// ── Prompt Templates ────────────────────────────────────────

const PROMPTS: Record<string, string> = {
  session: [
    'You are a concise summarizer. Given a set of Q&A interactions from,',
    'a coding session, produce a single paragraph summarizing:',
    '- What tasks were worked on',
    '- Key decisions made',
    '- Notable outcomes or problems encountered',
    'Be factual and concise. Output only the summary paragraph.',
  ].join(' '),

  topic: [
    'You are a knowledge synthesizer. Given multiple session summaries',
    'on a related topic, produce a concise paragraph capturing:',
    '- The common theme or project area',
    '- Key patterns and learnings across sessions',
    '- Current state of progress',
    'Output only the summary paragraph.',
  ].join(' '),

  domain: [
    'You are an expert knowledge architect. Given topic summaries from',
    'a developer workspace, produce a high-level strategic summary:',
    '- Major domains of work',
    '- Cross-cutting patterns and insights',
    '- Areas of strength and knowledge gaps',
    'Output only the summary paragraph.',
  ].join(' '),
};

// ── LlmSummarizer ───────────────────────────────────────────

export class LlmSummarizer {
  private apiUrl: string;
  private model: string;
  private apiKey?: string;
  private timeoutMs: number;
  private maxTokens: number;

  constructor(config: LlmSummarizerConfig) {
    this.apiUrl = config.apiUrl;
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.maxTokens = config.maxTokens ?? 512;
  }

  /**
   * Summarize texts via LLM. Falls back to extractive on any failure.
   */
  async summarize(req: SummarizeRequest): Promise<SummarizeResult> {
    const { texts, level = 'session' } = req;

    if (texts.length === 0) {
      return { summary: '', source: 'extractive' };
    }

    try {
      const summary = await this.callLlm(texts, level);
      return { summary, source: 'llm', model: this.model };
    } catch {
      return { summary: extractiveFallback(texts), source: 'extractive' };
    }
  }

  /**
   * Create a sync-compatible `summarizeFn` that uses extractive by default
   * but can be swapped out at the MCP layer with async calls.
   */
  createSyncFallback(): (texts: string[]) => string {
    return extractiveFallback;
  }

  // ── Private ───────────────────────────────────────────────

  private async callLlm(texts: string[], level: string): Promise<string> {
    const systemPrompt = PROMPTS[level] ?? PROMPTS.session;
    const userContent = texts.join('\n---\n');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API returned ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('LLM returned empty content');
      }

      return content;
    } finally {
      clearTimeout(timer);
    }
  }
}

// ── Factory ─────────────────────────────────────────────────

/**
 * Create an LlmSummarizer from environment variables.
 * Returns null if required env vars are missing.
 *
 * Env vars:
 *  - LLM_API_URL (required) — e.g. 'http://localhost:3000/v1/chat/completions'
 *  - LLM_MODEL   (required) — e.g. 'anthropic/claude-sonnet-4-20250514'
 *  - LLM_API_KEY (optional)
 */
export function createLlmSummarizerFromEnv(): LlmSummarizer | null {
  const apiUrl = process.env.LLM_API_URL;
  const model = process.env.LLM_MODEL;

  if (!apiUrl || !model) return null;

  return new LlmSummarizer({
    apiUrl,
    model,
    apiKey: process.env.LLM_API_KEY,
  });
}
