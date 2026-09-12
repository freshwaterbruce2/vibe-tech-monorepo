import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { summarizeMetricEvents } from './metrics.mjs';

test('summary counts each supplied event once and separates safety, failures, fallback and partial accounting', () => {
  const result = summarizeMetricEvents([
    { v: 1, kind: 'attempt', operation: 'chat', role: 'primary', outcome: 'failure', elapsedMs: 20, costCredits: 0.1, tokens: 10 },
    { v: 1, kind: 'attempt', operation: 'chat', role: 'fallback', outcome: 'success', elapsedMs: 10, costCredits: 0, tokens: 0 },
    { v: 1, kind: 'operation', operation: 'chat', outcome: 'success', fallbackUsed: true, finalized: true, stages: { provider: 30, quota_finalize: 2, total: 40 } },
    { v: 1, kind: 'attempt', operation: 'safety', role: 'primary', outcome: 'failure', elapsedMs: 8 },
    { v: 1, kind: 'operation', operation: 'safety', outcome: 'failure', fallbackUsed: false, finalized: false, stages: { provider: 8, total: 9 } },
    { invalid: 'ignored without echoing it' },
  ]);
  assert.deepEqual(result.totals, { events: 5, attempts: 3, operations: 2, malformedOrRejected: 1 });
  assert.equal(result.accounting.chat.knownCostCredits, 0.1);
  assert.equal(result.accounting.safety.unknownCostAttempts, 1);
  assert.equal(result.accounting.observedKnownChatAttemptCostPerFinalizedSuccessfulChat, 0.1);
  assert.equal(result.outcomes.fallbackShare, 0.5);
  assert.equal(result.outcomes.providerFailureRate, 2 / 3);
  assert.equal(result.timing.chat.provider.p50Ms, 30);
  assert.equal(result.timing.safety.provider.p95Ms, 8);
});

test('summary reports unavailable ratios and timing for empty input', () => {
  const result = summarizeMetricEvents([]);
  assert.equal(result.outcomes.fallbackShare, null);
  assert.equal(result.outcomes.providerInvokingChatFailureRate, null);
  assert.equal(result.timing.chat.total.samples, 0);
  assert.equal(result.timing.chat.total.p50Ms, null);
});

test('cost-per-finalized-success labels incomplete accounting and excludes crisis-only operations', () => {
  const result = summarizeMetricEvents([
    { v: 1, kind: 'attempt', operation: 'chat', role: 'primary', outcome: 'success', elapsedMs: 1, costCredits: 1 },
    { v: 1, kind: 'operation', operation: 'chat', outcome: 'success', fallbackUsed: false, finalized: true, stages: { provider: 1, total: 1 } },
    { v: 1, kind: 'attempt', operation: 'chat', role: 'primary', outcome: 'failure', elapsedMs: 1 },
    { v: 1, kind: 'operation', operation: 'chat', outcome: 'failure', fallbackUsed: false, finalized: false, stages: { provider: 1, total: 1 } },
    { v: 1, kind: 'operation', operation: 'chat', outcome: 'success', fallbackUsed: false, finalized: false, stages: { total: 1 } },
  ]);
  assert.equal(result.outcomes.providerInvokingChatFailureRate, 0.5);
  assert.equal(result.accounting.observedKnownChatAttemptCostPerFinalizedSuccessfulChat, 1);
  assert.equal(result.accounting.observedKnownChatAttemptCostPerFinalizedSuccessfulChatStatus, 'incomplete_accounting');
});

test('offline CLI has bounded errors and counts malformed lines without echoing input', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vibe-metrics-'));
  try {
    const input = join(directory, 'sanitized.jsonl');
    await writeFile(input, '{"v":1,"kind":"attempt","operation":"chat","role":"primary","outcome":"success","elapsedMs":1}\nPRIVATE_MARKER\n');
    const script = join(process.cwd(), 'scripts', 'summarize-ai-metrics.mjs');
    const good = spawnSync(process.execPath, [script, input], { encoding: 'utf8' });
    assert.equal(good.status, 0); assert.equal(good.stdout.includes('PRIVATE_MARKER'), false); assert.equal(JSON.parse(good.stdout).totals.malformedOrRejected, 1);
    assert.equal(spawnSync(process.execPath, [script], { encoding: 'utf8' }).status, 2);
    assert.equal(spawnSync(process.execPath, [script, join(directory, 'missing.jsonl')], { encoding: 'utf8' }).status, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('finalized success without observed attempts is explicitly incomplete', () => {
  const result = summarizeMetricEvents([{ v: 1, kind: 'operation', operation: 'chat', outcome: 'success', fallbackUsed: false, finalized: true, stages: { provider: 1, total: 1 } }]);
  assert.equal(result.accounting.observedKnownChatAttemptCostPerFinalizedSuccessfulChat, null);
  assert.equal(result.accounting.observedKnownChatAttemptCostPerFinalizedSuccessfulChatStatus, 'no_attempt_observations');
});
