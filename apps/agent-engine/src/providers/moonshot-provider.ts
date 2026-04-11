import { CONFIG } from '../config.js';
import type { LlmProvider, ProviderGenerateResult, ProviderPrompt } from '../types.js';

const MOONSHOT_API_URL = 'https://api.moonshot.ai/v1';

export class MoonshotProvider implements LlmProvider {
  public readonly name = 'moonshot';

  public async generateText(prompt: ProviderPrompt): Promise<ProviderGenerateResult> {
    if (!CONFIG.KIMI_API_KEY) {
      throw new Error('KIMI_API_KEY is required for Moonshot/Kimi agent execution.');
    }

    const response = await fetch(`${MOONSHOT_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: CONFIG.AGENT_ENGINE_MODEL,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        max_tokens: 4096,
        temperature: 0.6,
        thinking: { type: 'disabled' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Moonshot API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      text: data.choices[0]?.message?.content ?? '',
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    };
  }
}
