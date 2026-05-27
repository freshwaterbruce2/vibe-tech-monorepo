import { CircuitBreaker } from './CircuitBreaker.js';

/**
 * DeepSeek API Integration with Advanced Error Handling
 */
export class DeepSeekService {
  private circuitBreaker = new CircuitBreaker(3, 30000, 60000);
  private readonly apiKey = process.env.DEEPSEEK_API_KEY;
  private readonly baseUrl = 'https://api.deepseek.com/v1';

  async analyzeShipment(data: any): Promise<any> {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    return this.circuitBreaker.execute(async () => {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a logistics optimization assistant. Analyze shipping data and provide efficiency recommendations.'
            },
            {
              role: 'user',
              content: `Analyze this shipping schedule: ${JSON.stringify(data)}`
            }
          ],
          max_tokens: 500,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      return result.choices?.[0]?.message?.content || 'No analysis available';
    });
  }

  getCircuitBreakerStatus() {
    return this.circuitBreaker.getStatus();
  }
}

export const deepSeekService = new DeepSeekService();
