import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, openRouterGenerator, openRouterSafetyClassifier } from './server.mjs';
import { InMemoryQuotaStore, MODELS, requestHash, verifyToken } from './core.mjs';

const now = 1760000000000;
const completeEnv = { NODE_ENV: 'test', SESSION_SIGNING_SECRET: 'session-secret', INSTALLATION_HMAC_SECRET: 'install-secret', PLAY_CERTIFICATE_SHA256: 'certificate' };
const integrity = async () => ({ packageName: 'com.vibetech.tutor', versionCode: 10516, license: 'LICENSED', appRecognition: 'PLAY_RECOGNIZED', certificateDigest: 'certificate' });
const provider = async () => ({ text: 'study answer', model: 'test-model' });
const safety = async () => 'none';
const reportSink = async () => {};

function completeOptions(overrides = {}) { return { now: () => now, env: { ...completeEnv }, verifyIntegrity: integrity, generate: provider, safetyClassifier: safety, reportSink, ...overrides }; }
async function fixture(overrides = {}) {
  const app = createApp(completeOptions(overrides));
  const server = await new Promise((resolve) => { const value = app.listen(0, () => resolve(value)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const installationId = 'installation-id-long-enough';
  const init = await fetch(`${base}/api/session/init`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ installationId, requestedAt: now, requestHash: requestHash(installationId, now), integrityToken: 'test-token' }) });
  const { token } = await init.json();
  return { base, token, close: () => new Promise((resolve) => server.close(resolve)) };
}
const headers = (token) => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' });

test('chat rejects client model routing and only charges successful generation', async () => {
  let calls = 0; const api = await fixture({ generate: async () => { calls += 1; return { text: 'study answer', model: 'test' }; } });
  try { const response = await fetch(`${api.base}/api/chat`, { method: 'POST', headers: headers(api.token), body: JSON.stringify({ chatType: 'tutor', messages: [{ role: 'user', content: 'Help me study' }], model: 'openrouter/free' }) }); assert.equal(response.status, 400); assert.equal(calls, 0); } finally { await api.close(); }
});

test('crisis bypasses provider and quota; provider failure releases reservation', async () => {
  let calls = 0; const api = await fixture({ generate: async () => { calls += 1; throw new Error('no upstream'); } });
  try {
    const crisis = await fetch(`${api.base}/api/chat`, { method: 'POST', headers: headers(api.token), body: JSON.stringify({ chatType: 'friend', messages: [{ role: 'user', content: 'I want to kill myself' }] }) });
    assert.equal(crisis.status, 200); assert.equal((await crisis.json()).charged, false); assert.equal(calls, 0);
    const failed = await fetch(`${api.base}/api/chat`, { method: 'POST', headers: headers(api.token), body: JSON.stringify({ chatType: 'tutor', messages: [{ role: 'user', content: 'Help with algebra' }] }) });
    assert.equal(failed.status, 503);
    const allowance = await fetch(`${api.base}/api/allowance`, { headers: { authorization: `Bearer ${api.token}` } }); assert.equal((await allowance.json()).allowance.daily.used, 0);
  } finally { await api.close(); }
});

test('safety endpoint emits only client-compatible labels and never charges quota', async () => {
  for (const classification of ['self-harm', 'abuse', 'none']) {
    const api = await fixture({ safetyClassifier: async () => classification });
    try {
      const response = await fetch(`${api.base}/api/safety/classify`, { method: 'POST', headers: headers(api.token), body: JSON.stringify({ text: 'I want to disappear' }) });
      assert.equal(response.status, 200); assert.deepEqual(await response.json(), { classification, charged: false });
      const allowance = await fetch(`${api.base}/api/allowance`, { headers: { authorization: `Bearer ${api.token}` } }); assert.equal((await allowance.json()).allowance.daily.used, 0);
    } finally { await api.close(); }
  }
});

test('safety classifier admits only 30 paid invocations per installation per UTC day', async () => {
  let invocations = 0;
  const api = await fixture({ safetyClassifier: async () => { invocations += 1; return 'none'; } });
  try {
    for (let index = 0; index < 30; index += 1) {
      const response = await fetch(`${api.base}/api/safety/classify`, {
        method: 'POST', headers: headers(api.token), body: JSON.stringify({ text: 'I want to disappear' }),
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { classification: 'none', charged: false });
    }
    const limited = await fetch(`${api.base}/api/safety/classify`, {
      method: 'POST', headers: headers(api.token), body: JSON.stringify({ text: 'I want to disappear' }),
    });
    assert.equal(limited.status, 429);
    assert.deepEqual(await limited.json(), { error: 'Safety classifier allowance is currently used. Local support remains available.' });
    assert.equal(invocations, 30);
  } finally { await api.close(); }
});

test('safety provider or parse failures return an honest unavailable response', async () => {
  for (const safetyClassifier of [async () => { throw new Error('upstream failed'); }, async () => 'crisis']) {
    const api = await fixture({ safetyClassifier });
    try {
      const response = await fetch(`${api.base}/api/safety/classify`, { method: 'POST', headers: headers(api.token), body: JSON.stringify({ text: 'I want to disappear' }) });
      assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: 'Safety classifier is unavailable.' });
    } finally { await api.close(); }
  }
});

test('safety validation and missing provider do not consume a safety attempt', async () => {
  const quota = new InMemoryQuotaStore(); let consumed = 0; const consume = quota.consumeSafetyAttempt.bind(quota); quota.consumeSafetyAttempt = async (...args) => { consumed += 1; return consume(...args); };
  const api = await fixture({ quotaStore: quota });
  try {
    const invalid = await fetch(`${api.base}/api/safety/classify`, { method: 'POST', headers: headers(api.token), body: JSON.stringify({ text: 'ordinary homework question' }) });
    assert.equal(invalid.status, 400);
    const oversized = await fetch(`${api.base}/api/safety/classify`, { method: 'POST', headers: headers(api.token), body: JSON.stringify({ text: `I want to disappear ${  'x'.repeat(2000)}` }) });
    assert.equal(oversized.status, 400);
    const unauthenticated = await fetch(`${api.base}/api/safety/classify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'I want to disappear' }) });
    assert.equal(unauthenticated.status, 401);
    assert.equal(consumed, 0);
  } finally { await api.close(); }
  const unavailableQuota = new InMemoryQuotaStore(); let unavailableConsumes = 0; const unavailableConsume = unavailableQuota.consumeSafetyAttempt.bind(unavailableQuota); unavailableQuota.consumeSafetyAttempt = async (...args) => { unavailableConsumes += 1; return unavailableConsume(...args); };
  const withoutProvider = await fixture({ quotaStore: unavailableQuota, safetyClassifier: null });
  try {
    const response = await fetch(`${withoutProvider.base}/api/safety/classify`, { method: 'POST', headers: headers(withoutProvider.token), body: JSON.stringify({ text: 'I want to disappear' }) });
    assert.equal(response.status, 503); assert.equal(unavailableConsumes, 0);
  } finally { await withoutProvider.close(); }
});

test('safety budget adapter fails closed unless it explicitly admits or denies', async () => {
  for (const consumeSafetyAttempt of [async () => undefined, async () => null, async () => ({ ok: 'yes' }), async () => { throw new Error('storage unavailable'); }]) {
    let classified = 0;
    const quotaStore = new InMemoryQuotaStore(); quotaStore.consumeSafetyAttempt = consumeSafetyAttempt;
    const api = await fixture({ quotaStore, safetyClassifier: async () => { classified += 1; return 'none'; } });
    try {
      const response = await fetch(`${api.base}/api/safety/classify`, { method: 'POST', headers: headers(api.token), body: JSON.stringify({ text: 'I want to disappear' }) });
      assert.equal(response.status, 503); assert.equal(classified, 0);
    } finally { await api.close(); }
  }
  const quotaStore = new InMemoryQuotaStore(); quotaStore.consumeSafetyAttempt = async () => ({ ok: false }); let classified = 0;
  const limited = await fixture({ quotaStore, safetyClassifier: async () => { classified += 1; return 'none'; } });
  try {
    const response = await fetch(`${limited.base}/api/safety/classify`, { method: 'POST', headers: headers(limited.token), body: JSON.stringify({ text: 'I want to disappear' }) });
    assert.equal(response.status, 429); assert.equal(classified, 0);
  } finally { await limited.close(); }
});

test('failed or invalid safety classification is charged permanently and survives session renewal without charging chat allowance', async () => {
  for (const safetyClassifier of [async () => { throw new Error('provider unavailable'); }, async () => 'invalid']) {
  let clock = now; let classified = 0; const app = createApp(completeOptions({ now: () => clock, safetyClassifier: async () => { classified += 1; return safetyClassifier(); } }));
  const server = await new Promise((resolve) => { const value = app.listen(0, () => resolve(value)); }); const base = `http://127.0.0.1:${server.address().port}`; const installationId = 'safety-renewal-installation';
  const initialize = async () => { const response = await fetch(`${base}/api/session/init`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ installationId, requestedAt: clock, requestHash: requestHash(installationId, clock), integrityToken: 'test-token' }) }); assert.equal(response.status, 200); return (await response.json()).token; };
  try {
    const first = await initialize();
    for (let index = 0; index < 30; index += 1) {
      const response = await fetch(`${base}/api/safety/classify`, { method: 'POST', headers: headers(first), body: JSON.stringify({ text: 'I want to disappear' }) });
      assert.equal(response.status, 503);
    }
    clock += 1000; const renewed = await initialize(); assert.equal(renewed !== first, true);
    const limited = await fetch(`${base}/api/safety/classify`, { method: 'POST', headers: headers(renewed), body: JSON.stringify({ text: 'I want to disappear' }) });
    assert.equal(limited.status, 429); assert.equal(classified, 30);
    const allowance = await fetch(`${base}/api/allowance`, { headers: { authorization: `Bearer ${renewed}` } });
    const counts = (await allowance.json()).allowance; assert.equal(counts.daily.used, 0); assert.equal(counts.monthly.used, 0);
  } finally { await new Promise((resolve) => server.close(resolve)); }
  }
});

test('missing safety budget capability makes health unavailable and prevents classifier work', async () => {
  const quotaStore = new InMemoryQuotaStore(); quotaStore.consumeSafetyAttempt = undefined; let classified = 0;
  const api = await fixture({ quotaStore, safetyClassifier: async () => { classified += 1; return 'none'; } });
  try {
    const health = await fetch(`${api.base}/api/health`); assert.equal(health.status, 503);
    const response = await fetch(`${api.base}/api/safety/classify`, { method: 'POST', headers: headers(api.token), body: JSON.stringify({ text: 'I want to disappear' }) });
    assert.equal(response.status, 503); assert.equal(classified, 0);
  } finally { await api.close(); }
});

test('server-owned OpenRouter safety classifier uses ZDR and primary-to-fallback policy', async () => {
  const requests = [];
  const classify = openRouterSafetyClassifier('test-key', async (_url, options) => {
    requests.push(options);
    if (requests.length === 1) return new Response('', { status: 503 });
    return new Response(JSON.stringify({ choices: [{ message: { content: 'self-harm' } }] }), { status: 200 });
  });
  assert.equal(await classify('I want to disappear'), 'self-harm'); assert.equal(requests.length, 2);
  for (const request of requests) { const body = JSON.parse(request.body); assert.deepEqual(body.provider, { zdr: true, data_collection: 'deny' }); assert.equal(body.messages[1].content, 'I want to disappear'); }
  const invalid = openRouterSafetyClassifier('test-key', async () => new Response(JSON.stringify({ choices: [{ message: { content: 'crisis' } }] }), { status: 200 }));
  await assert.rejects(() => invalid('I want to disappear'), /invalid-safety-response/);
});

test('OpenRouter generator retains allowlisted usage for every failed and fallback attempt without changing its response', async () => {
  const events = []; let calls = 0;
  const generate = openRouterGenerator('test-key', async () => {
    calls += 1;
    return calls === 1
      ? new Response(JSON.stringify({ usage: { cost: 0.25, total_tokens: 7 } }), { status: 502 })
      : new Response(JSON.stringify({ choices: [{ message: { content: 'answer' } }], usage: { cost: 0, total_tokens: 0 } }), { status: 200 });
  }, (event) => events.push(event));
  assert.deepEqual(await generate('tutor', [{ role: 'user', content: 'private prompt' }]), { text: 'answer', model: MODELS.fallback });
  assert.deepEqual(events, [
    { v: 1, kind: 'attempt', operation: 'chat', role: 'primary', outcome: 'failure', elapsedMs: events[0].elapsedMs, costCredits: 0.25, tokens: 7 },
    { v: 1, kind: 'attempt', operation: 'chat', role: 'fallback', outcome: 'success', elapsedMs: events[1].elapsedMs, costCredits: 0, tokens: 0 },
  ]);
});

test('route metrics cover auth, provider failure cleanup, crisis bypass, and safety fallback without altering responses', async () => {
  const emitted = [];
  const api = await fixture({
    env: { ...completeEnv, AI_METRICS: '1' }, metricsWrite: (line) => emitted.push(JSON.parse(line)),
    generate: async () => { throw new Error('provider failed'); },
    safetyClassifier: async (_text, observe) => { observe({ v: 1, kind: 'attempt', operation: 'safety', role: 'fallback', outcome: 'success', elapsedMs: 1 }); return 'none'; },
  });
  try {
    assert.equal((await fetch(`${api.base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) })).status, 401);
    assert.equal((await fetch(`${api.base}/api/chat`, { method: 'POST', headers: headers(api.token), body: JSON.stringify({ chatType: 'tutor', messages: [{ role: 'user', content: 'help' }] }) })).status, 503);
    assert.equal((await fetch(`${api.base}/api/chat`, { method: 'POST', headers: headers(api.token), body: JSON.stringify({ chatType: 'tutor', messages: [{ role: 'user', content: 'I want to kill myself' }] }) })).status, 200);
    assert.equal((await fetch(`${api.base}/api/safety/classify`, { method: 'POST', headers: headers(api.token), body: JSON.stringify({ text: 'I want to disappear' }) })).status, 200);
    const operations = emitted.filter((event) => event.kind === 'operation');
    assert.equal(operations.find((event) => event.operation === 'chat' && event.outcome === 'rejected').stages.auth_integrity >= 0, true);
    assert.equal(operations.find((event) => event.operation === 'chat' && event.outcome === 'failure').stages.provider >= 0, true);
    assert.equal(operations.find((event) => event.operation === 'chat' && event.outcome === 'failure').stages.cleanup >= 0, true);
    assert.equal(operations.find((event) => event.operation === 'chat' && event.outcome === 'success').finalized, false);
    assert.equal(operations.find((event) => event.operation === 'safety').fallbackUsed, true);
  } finally { await api.close(); }
});

test('metrics retain billable wrapper failures and timeout attempts while observer errors cannot change fallback', async () => {
  const events = []; let calls = 0;
  const generate = openRouterGenerator('key', async () => {
    calls += 1;
    if (calls === 1) return new Response(JSON.stringify({ usage: { cost: 0.5, prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 } }), { status: 500 });
    throw new Error('timeout');
  }, (event) => { events.push(event); throw new Error('observer unavailable'); });
  await assert.rejects(() => generate('tutor', [{ role: 'user', content: 'SENSITIVE_MARKER' }]));
  assert.equal(events.length, 2);
  assert.deepEqual(events[0].costCredits, 0.5); assert.equal(events[0].promptTokens, 2); assert.equal(events[0].completionTokens, 3);
  assert.equal(events[1].costCredits, undefined); assert.equal(JSON.stringify(events).includes('SENSITIVE_MARKER'), false);
});

test('actual wrappers retain usable accounting for invalid output and both-provider failures without accepting malformed usage', async () => {
  const chatEvents = []; let chatCalls = 0;
  const generate = openRouterGenerator('key', async () => {
    chatCalls += 1;
    return new Response(JSON.stringify(chatCalls === 1
      ? { choices: [{ message: { content: '   ' } }], usage: { cost: 0.2, total_tokens: 4 } }
      : { choices: [{ message: { content: 'answer' } }], usage: { cost: 'wrong', total_tokens: -1 } }), { status: 200 });
  }, (event) => chatEvents.push(event));
  assert.deepEqual(await generate('tutor', []), { text: 'answer', model: MODELS.fallback });
  assert.deepEqual(chatEvents.map((event) => [event.outcome, event.costCredits, event.tokens]), [['failure', 0.2, 4], ['success', undefined, undefined]]);
  const safetyEvents = []; let safetyCalls = 0;
  const classify = openRouterSafetyClassifier('key', async () => {
    safetyCalls += 1;
    return new Response(JSON.stringify({ choices: [{ message: { content: 'invalid' } }], usage: { cost: safetyCalls === 1 ? 0 : -1, total_tokens: 2 } }), { status: 200 });
  }, (event) => safetyEvents.push(event));
  await assert.rejects(() => classify('ambiguous'));
  assert.deepEqual(safetyEvents.map((event) => [event.role, event.outcome, event.costCredits, event.tokens]), [['primary', 'failure', 0, 2], ['fallback', 'failure', undefined, 2]]);
});

test('finalization failure still delivers the answer and cleans up the reservation', async () => {
  const emitted = []; const quota = new InMemoryQuotaStore();
  quota.finalize = async () => { throw new Error('finalize unavailable'); };
  const api = await fixture({ quotaStore: quota, env: { ...completeEnv, AI_METRICS: '1' }, metricsWrite: (line) => emitted.push(JSON.parse(line)) });
  try {
    const response = await fetch(`${api.base}/api/chat`, { method: 'POST', headers: headers(api.token), body: JSON.stringify({ chatType: 'tutor', messages: [{ role: 'user', content: 'help' }] }) });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(typeof body.message, 'string');
    assert.equal(body.charged, false);
    const operation = emitted.find((event) => event.kind === 'operation' && event.operation === 'chat');
    assert.equal(operation.outcome, 'success');
    assert.equal(operation.finalized, false);
    for (const name of ['provider', 'quota_finalize', 'cleanup']) assert.equal(operation.stages[name] >= 0, true);
  } finally { await api.close(); }
});

test('reports accept metadata-only submissions and surface sink failures honestly', async () => {
  const accepted = []; const api = await fixture({ reportSink: async (report) => accepted.push(report) });
  try {
    const response = await fetch(`${api.base}/api/reports`, { method: 'POST', headers: headers(api.token), body: JSON.stringify({ category: 'safety', includeContent: false }) });
    assert.equal(response.status, 202); assert.deepEqual(await response.json(), { status: 'accepted' }); assert.equal(accepted.length, 1); assert.equal(Object.hasOwn(accepted[0], 'content'), false);
  } finally { await api.close(); }
  const failing = await fixture({ reportSink: async () => { throw new Error('sink unavailable'); } });
  try {
    const response = await fetch(`${failing.base}/api/reports`, { method: 'POST', headers: headers(failing.token), body: JSON.stringify({ category: 'safety', includeContent: false }) });
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: 'Report storage is unavailable.' });
  } finally { await failing.close(); }
});

test('health requires every production dependency and becomes ready only when complete', async () => {
  const missing = [
    { env: { ...completeEnv, SESSION_SIGNING_SECRET: '' } },
    { env: { ...completeEnv, INSTALLATION_HMAC_SECRET: '' } },
    { env: { ...completeEnv, PLAY_CERTIFICATE_SHA256: '' } },
    { verifyIntegrity: null },
    { quotaStore: null, env: { ...completeEnv, NODE_ENV: 'production' } },
    { generate: null }, { safetyClassifier: null }, { reportSink: null },
  ];
  for (const override of missing) {
    const app = createApp(completeOptions(override)); const server = await new Promise((resolve) => { const value = app.listen(0, () => resolve(value)); });
    try { const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`); assert.equal(response.status, 503); assert.deepEqual(await response.json(), { status: 'unavailable', ready: false }); } finally { await new Promise((resolve) => server.close(resolve)); }
  }
  const api = await fixture();
  try {
    const response = await fetch(`${api.base}/api/health`); assert.equal(response.status, 200); assert.deepEqual(await response.json(), { status: 'ready', ready: true });
    const root = await fetch(`${api.base}/`); assert.equal(root.status, 200); assert.deepEqual(await root.json(), { status: 'ready', ready: true });
  } finally { await api.close(); }
});

test('reinitialized sessions for one installation retain allowance counts and enforce the 429 limit', async () => {
  let clock = now;
  const app = createApp(completeOptions({ now: () => clock }));
  const server = await new Promise((resolve) => { const value = app.listen(0, () => resolve(value)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const installationId = 'same-installation-id-for-quota';
  const initialize = async () => {
    const response = await fetch(`${base}/api/session/init`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ installationId, requestedAt: clock, requestHash: requestHash(installationId, clock), integrityToken: 'test-token' }),
    });
    assert.equal(response.status, 200);
    return (await response.json()).token;
  };
  try {
    const firstToken = await initialize();
    for (let index = 0; index < 30; index += 1) {
      const response = await fetch(`${base}/api/chat`, { method: 'POST', headers: headers(firstToken), body: JSON.stringify({ chatType: 'tutor', messages: [{ role: 'user', content: 'Help with algebra' }] }) });
      assert.equal(response.status, 200);
    }
    clock += 1000;
    const renewedToken = await initialize();
    assert.equal(renewedToken !== firstToken, true);
    const allowance = await fetch(`${base}/api/allowance`, { headers: headers(renewedToken) });
    const counts = (await allowance.json()).allowance;
    assert.equal(counts.daily.used, 30);
    assert.equal(counts.monthly.used, 30);
    const rejected = await fetch(`${base}/api/chat`, { method: 'POST', headers: headers(renewedToken), body: JSON.stringify({ chatType: 'tutor', messages: [{ role: 'user', content: 'Help with algebra' }] }) });
    assert.equal(rejected.status, 429);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('session initialization rejects every invalid Play entitlement field', async () => {
  const rejectedVerdicts = [
    { packageName: 'other.package' }, { versionCode: 1 }, { license: 'UNLICENSED' },
    { appRecognition: 'UNRECOGNIZED_VERSION' }, { certificateDigest: 'other-certificate' },
  ];
  const installationId = 'entitlement-rejection-installation';
  for (const invalid of rejectedVerdicts) {
    const app = createApp(completeOptions({ verifyIntegrity: async () => ({ ...await integrity(), ...invalid }) }));
    const server = await new Promise((resolve) => { const value = app.listen(0, () => resolve(value)); });
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/session/init`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ installationId, requestedAt: now, requestHash: requestHash(installationId, now), integrityToken: 'test-token' }),
      });
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: 'Entitlement verification failed.' });
    } finally { await new Promise((resolve) => server.close(resolve)); }
  }
});

test('session initialization supports only released versions and preserves identity and quota across an upgrade', async () => {
  let clock = now;
  const quotaStore = new InMemoryQuotaStore();
  const verdictVersions = new Map();
  const app = createApp(completeOptions({
    now: () => clock,
    quotaStore,
    verifyIntegrity: async (token) => ({ ...await integrity(), versionCode: verdictVersions.get(token) }),
  }));
  const server = await new Promise((resolve) => { const value = app.listen(0, () => resolve(value)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const installationId = 'version-compatible-installation';
  const initialize = async (versionCode) => {
    const integrityToken = `version-${typeof versionCode}:${String(versionCode)}`;
    verdictVersions.set(integrityToken, versionCode);
    const response = await fetch(`${base}/api/session/init`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ installationId, requestedAt: clock, requestHash: requestHash(installationId, clock), integrityToken }),
    });
    return response;
  };
  try {
    const first = await initialize(10516); assert.equal(first.status, 200);
    const firstPayload = await first.json(); const firstClaims = verifyToken(firstPayload.token, completeEnv.SESSION_SIGNING_SECRET, clock);
    assert.equal(firstClaims.v, 10516);
    const chat = await fetch(`${base}/api/chat`, { method: 'POST', headers: headers(firstPayload.token), body: JSON.stringify({ chatType: 'tutor', messages: [{ role: 'user', content: 'Help with algebra' }] }) });
    assert.equal(chat.status, 200);
    clock += 1000;
    const upgraded = await initialize(10517); assert.equal(upgraded.status, 200);
    const upgradedPayload = await upgraded.json(); const upgradedClaims = verifyToken(upgradedPayload.token, completeEnv.SESSION_SIGNING_SECRET, clock);
    assert.equal(upgradedClaims.v, 10517); assert.equal(upgradedClaims.i, firstClaims.i);
    assert.equal(upgradedPayload.allowance.daily.used, 1); assert.equal(upgradedPayload.allowance.monthly.used, 1);
    clock += 1000;
    const upgraded18 = await initialize(10518); assert.equal(upgraded18.status, 200);
    const upgraded18Payload = await upgraded18.json(); const upgraded18Claims = verifyToken(upgraded18Payload.token, completeEnv.SESSION_SIGNING_SECRET, clock);
    assert.equal(upgraded18Claims.v, 10518); assert.equal(upgraded18Claims.i, firstClaims.i);
    for (const versionCode of [10515, 10519, '10518', null, 10518.5]) {
      clock += 1000;
      const response = await initialize(versionCode);
      assert.equal(response.status, 401); assert.deepEqual(await response.json(), { error: 'Entitlement verification failed.' });
    }
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('both supported versions reject invalid non-version Play entitlement fields', async () => {
  const invalidFields = [
    { packageName: 'other.package' }, { license: 'UNLICENSED' },
    { appRecognition: 'UNRECOGNIZED_VERSION' }, { certificateDigest: 'other-certificate' },
  ];
  for (const versionCode of [10516, 10517, 10518]) {
    for (const invalid of invalidFields) {
      const app = createApp(completeOptions({ verifyIntegrity: async () => ({ ...await integrity(), versionCode, ...invalid }) }));
      const server = await new Promise((resolve) => { const value = app.listen(0, () => resolve(value)); });
      try {
        const installationId = `invalid-entitlement-${versionCode}-${Object.keys(invalid)[0]}`;
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/session/init`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ installationId, requestedAt: now, requestHash: requestHash(installationId, now), integrityToken: 'test-token' }),
        });
        assert.equal(response.status, 401); assert.deepEqual(await response.json(), { error: 'Entitlement verification failed.' });
      } finally { await new Promise((resolve) => server.close(resolve)); }
    }
  }
});
