import assert from 'node:assert/strict';
import test from 'node:test';
import { VibeAIClient } from '../src/index.ts';

test('VibeAIClient: validates config apiKey', () => {
  assert.throws(() => new VibeAIClient({ apiKey: '' }), /apiKey/);
});

test('VibeAIClient: generateText sends formatted payload and extracts content', async () => {
  let capturedUrl = '';
  let capturedHeaders = {};
  let capturedBody = {};

  const mockFetch = async (url, init) => {
    capturedUrl = url;
    capturedHeaders = init.headers;
    capturedBody = JSON.parse(init.body);

    return {
      ok: true,
      json: async () => ({
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 1234567,
        model: 'deepseek/deepseek-chat',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Invoice processed successfully.' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 },
        vibe_gateway: { fallback_used: false, resolved_model: 'deepseek/deepseek-chat' },
      }),
    };
  };

  const client = new VibeAIClient({
    apiKey: 'vibe_sk_invoice_live_test',
    baseURL: 'http://localhost:8080',
    fetchImpl: mockFetch,
  });

  const text = await client.generateText('Process invoice #402');
  assert.equal(text, 'Invoice processed successfully.');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/chat/completions');
  assert.equal(capturedHeaders['Authorization'], 'Bearer vibe_sk_invoice_live_test');
  assert.equal(capturedBody.messages[0].content, 'Process invoice #402');
});

test('VibeAIClient: throws clean error on gateway failure', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 502,
    json: async () => ({
      error: { message: 'All upstream providers timed out.' },
    }),
  });

  const client = new VibeAIClient({
    apiKey: 'vibe_sk_test',
    baseURL: 'http://localhost:8080',
    fetchImpl: mockFetch,
  });

  await assert.rejects(
    () => client.generateText('hello'),
    /All upstream providers timed out/
  );
});
