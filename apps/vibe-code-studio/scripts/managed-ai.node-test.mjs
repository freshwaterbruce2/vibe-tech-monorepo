import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { initializeUsage, managedConfig, isEntitled, reserveRequest, validateManagedBody } from './lib/managed-ai.js';
import { registerAiProxyRoutes } from './routes/ai-proxy.js';
import { resolveDatabasePath } from './lib/database-path.js';

test('database selection preserves explicit and existing workspace paths, with portable user-data fallback', () => {
  const options = { platform: 'win32', env: { APPDATA: 'C:\\Users\\test\\AppData\\Roaming' }, exists: () => false };
  assert.equal(resolveDatabasePath({ ...options, env: { ...options.env, VCS_DATABASE_PATH: 'E:\\custom\\vcs.db' } }), 'E:\\custom\\vcs.db');
  assert.equal(resolveDatabasePath({ ...options, exists: location => location === 'D:\\databases' }), 'D:\\databases\\vibe_studio.db');
  assert.equal(resolveDatabasePath(options), 'C:\\Users\\test\\AppData\\Roaming\\vibe-code-studio\\vibe_studio.db');
  assert.equal(resolveDatabasePath({ platform: 'linux', env: {}, home: '/home/test', exists: () => false }), '/home/test/.local/share/vibe-code-studio/vibe_studio.db');
  assert.throws(() => resolveDatabasePath({ ...options, env: {} }), /Set VCS_DATABASE_PATH/);
});

test('managed configuration fails closed until every cost control is configured', () => {
  assert.equal(managedConfig({}).configured, false);
  const env = { VCS_MANAGED_AI_ENABLED: 'true', OPENROUTER_API_KEY: 'test', VCS_MANAGED_AI_MONTHLY_REQUESTS: '2', VCS_MANAGED_AI_MAX_TOKENS: '100', VCS_MANAGED_AI_MODELS: 'deepseek/test' };
  assert.equal(managedConfig(env).configured, true);
  assert.equal(managedConfig({ ...env, VCS_MANAGED_AI_MONTHLY_REQUESTS: '-1' }).configured, false);
});

test('only unexpired active or trialing subscriptions grant access', () => {
  const now = new Date('2026-09-10');
  for (const status of ['canceled', 'past_due', 'unpaid', 'incomplete']) {
    assert.equal(isEntitled({ status, current_period_end: '2026-10-01' }, now), false);
  }
  assert.equal(isEntitled({ status: 'active', current_period_end: '2026-09-01' }, now), false);
  assert.equal(isEntitled({ status: 'active', current_period_end: null }, now), false);
  assert.equal(isEntitled({ status: 'active', current_period_end: '2026-10-01', cancel_at_period_end: 1 }, now), true);
});

test('atomic quota cannot exceed limit, is user isolated and resets next UTC month', () => {
  const db = new DatabaseSync(':memory:'); initializeUsage(db);
  const now = new Date('2026-09-30T23:59:59Z');
  assert.equal(reserveRequest(db, 'one', 2, now), true);
  assert.equal(reserveRequest(db, 'one', 2, now), true);
  assert.equal(reserveRequest(db, 'one', 2, now), false);
  assert.equal(reserveRequest(db, 'two', 2, now), true);
  assert.equal(reserveRequest(db, 'one', 2, new Date('2026-10-01')), true);
  db.close();
});

test('managed request rejects unpriced models, routing, plugins, multiple completions and excessive output', () => {
  const config = { models: ['deepseek/test'], maxTokens: 100 };
  const body = { model: 'deepseek/test', messages: [{ role: 'user', content: 'hi' }] };
  assert.equal(validateManagedBody(body, config), null);
  for (const change of [{ model: 'expensive/unknown' }, { max_tokens: 101 }, { max_completion_tokens: -1 }, { n: 2 }, { plugins: [] }, { models: ['other'] }]) {
    assert.ok(validateManagedBody({ ...body, ...change }, config));
  }
});

function context(user = 'one') {
  return { db: { prepare: () => ({ get: () => ({ id: user }) }) },
    parseCookies: () => ({ session: 'valid' }), getSessionCookieName: () => 'session',
    parseSessionToken: () => ({ sub: user }), getBody: async () => '{}' };
}
async function request(url, method, ctx, body) {
  const req = { url, method, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
  const res = { writeHead(status) { this.status = status; }, end(data) { this.data = JSON.parse(data); } };
  await registerAiProxyRoutes(req, res, { ...ctx, getBody: async () => JSON.stringify(body) });
  return res;
}

test('BYOK keys are isolated per account and operator environment keys never leak into BYOK', async () => {
  const before = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = 'operator-key';
  try {
    await request('/api/ai/keys', 'POST', context('one'), { provider: 'openrouter', key: 'user-one-key' });
    const own = await request('/api/ai/health', 'GET', context('one'));
    const other = await request('/api/ai/health', 'GET', context('two'));
    assert.equal(own.data.configured.openrouter, true);
    assert.equal(other.data.configured.openrouter, false);
  } finally {
    if (before === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = before;
  }
});

test('key upload requires an authenticated session', async () => {
  const ctx = context(); ctx.parseSessionToken = () => null;
  assert.equal((await request('/api/ai/keys', 'POST', ctx, { provider: 'openrouter', key: 'bad' })).status, 401);
});
