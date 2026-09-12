import assert from 'node:assert/strict';
import test from 'node:test';
import { parseModelProfile, validateChatRequest, buildChatCompletionResponse, DEFAULT_MODELS } from '../src/core.mjs';
import { createAuthMiddleware } from '../src/auth.mjs';
import { createOpenRouterProvider } from '../src/router.mjs';
import { createGatewayApp } from '../src/server.mjs';

test('core: parseModelProfile handles defaults and named profiles', () => {
  const auto = parseModelProfile('auto');
  assert.equal(auto.primary, DEFAULT_MODELS.primary);
  assert.equal(auto.fallback, DEFAULT_MODELS.fallback);

  const empty = parseModelProfile(undefined);
  assert.equal(empty.primary, DEFAULT_MODELS.primary);

  const fast = parseModelProfile('fast');
  assert.equal(fast.primary, 'google/gemini-2.5-flash');

  const custom = parseModelProfile('openai/gpt-4o-mini');
  assert.equal(custom.primary, 'openai/gpt-4o-mini');
  assert.equal(custom.fallback, DEFAULT_MODELS.fallback);
});

test('core: validateChatRequest enforces message bounds and schema', () => {
  assert.equal(validateChatRequest(null).ok, false);
  assert.equal(validateChatRequest({}).ok, false);
  assert.equal(validateChatRequest({ messages: [] }).ok, false);
  assert.equal(validateChatRequest({ messages: [{ role: 'bad', content: 'hi' }] }).ok, false);
  assert.equal(validateChatRequest({ messages: [{ role: 'user', content: '' }] }).ok, false);

  const valid = validateChatRequest({
    messages: [{ role: 'user', content: 'Hello Vibe' }],
    temperature: 0.7,
    max_tokens: 500,
  });
  assert.equal(valid.ok, true);
});

test('core: buildChatCompletionResponse constructs standard OpenAI shape with Vibe telemetry', () => {
  const res = buildChatCompletionResponse({
    content: 'All systems operational',
    model: 'deepseek/deepseek-chat',
    fallbackUsed: false,
    promptTokens: 10,
    completionTokens: 20,
  });

  assert.equal(res.object, 'chat.completion');
  assert.equal(res.choices[0].message.content, 'All systems operational');
  assert.equal(res.usage.total_tokens, 30);
  assert.equal(res.vibe_gateway.fallback_used, false);
  assert.equal(res.vibe_gateway.resolved_model, 'deepseek/deepseek-chat');
});

test('auth: createAuthMiddleware accepts valid keys and rejects unauthorized requests', async () => {
  const auth = createAuthMiddleware({
    allowedKeys: ['vibe_sk_invoice_12345', 'vibe_sk_avatar_67890'],
  });

  // Missing header
  let status = 0;
  let jsonResult = null;
  const mockRes = {
    status(s) { status = s; return this; },
    json(j) { jsonResult = j; return this; },
  };

  auth({ headers: {}, path: '/v1/chat/completions' }, mockRes, () => {});
  assert.equal(status, 401);
  assert.equal(jsonResult.error.type, 'authentication_error');

  // Wrong key
  auth({ headers: { authorization: 'Bearer vibe_sk_fake' }, path: '/v1/chat/completions' }, mockRes, () => {});
  assert.equal(status, 401);

  // Correct key
  let nextCalled = false;
  const req = { headers: { authorization: 'Bearer vibe_sk_invoice_12345' }, path: '/v1/chat/completions' };
  auth(req, mockRes, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.clientId, 'invoice');
});

test('router: seamlessly falls back to secondary model when primary fails or times out', async () => {
  let callCount = 0;
  const attemptedModels = [];

  const mockFetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    attemptedModels.push(body.model);
    callCount++;

    // Primary model (deepseek) fails
    if (body.model === 'deepseek/deepseek-chat') {
      throw new Error('Primary provider timeout / upstream drop');
    }

    // Fallback model (gemini) succeeds
    return {
      ok: true,
      json: async () => ({
        model: 'google/gemini-3.7-flash',
        choices: [{ message: { role: 'assistant', content: 'Fallback response from Gemini' } }],
        usage: { prompt_tokens: 15, completion_tokens: 25 },
      }),
    };
  };

  const provider = createOpenRouterProvider({
    apiKey: 'mock-key',
    fetchImpl: mockFetch,
  });

  const response = await provider({
    profile: {
      primary: 'deepseek/deepseek-chat',
      fallback: 'google/gemini-3.7-flash',
    },
    messages: [{ role: 'user', content: 'Test fallback' }],
  });

  assert.equal(callCount, 2);
  assert.deepEqual(attemptedModels, ['deepseek/deepseek-chat', 'google/gemini-3.7-flash']);
  assert.equal(response.choices[0].message.content, 'Fallback response from Gemini');
  assert.equal(response.vibe_gateway.fallback_used, true);
  assert.equal(response.vibe_gateway.resolved_model, 'google/gemini-3.7-flash');
});

test('server: full end-to-end HTTP completions endpoint works with auth & routing', async () => {
  const mockProvider = async ({ messages }) => {
    return buildChatCompletionResponse({
      content: `Echo: ${messages[0].content}`,
      model: 'deepseek/deepseek-chat',
      fallbackUsed: false,
    });
  };

  const app = createGatewayApp({
    provider: mockProvider,
    authMiddleware: (_req, _res, next) => next(), // bypass auth for test
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Health endpoint
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.equal(healthJson.status, 'ready');

    // 2. Chat completion endpoint
    const chatRes = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Universal Gateway Online' }],
      }),
    });

    assert.equal(chatRes.status, 200);
    const chatJson = await chatRes.json();
    assert.equal(chatJson.choices[0].message.content, 'Echo: Universal Gateway Online');
    assert.equal(chatJson.vibe_gateway.fallback_used, false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
