import { CONFIG, assertAnthropicConfigured } from '../config.js';
import type { LlmProvider, ProviderGenerateResult, ProviderPrompt } from '../types.js';

export class AnthropicProvider implements LlmProvider {
  public readonly name = 'anthropic';

  public async generateText(prompt: ProviderPrompt): Promise<ProviderGenerateResult> {
    assertAnthropicConfigured();

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: CONFIG.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: CONFIG.AGENT_ENGINE_MODEL,
      max_tokens: 4096,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('');

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
