import assert from 'node:assert/strict';
import test from 'node:test';
import { accountingFromUsage, createMetricsObserver, validateMetricEvent } from './metrics.mjs';

const attempt = { v: 1, kind: 'attempt', operation: 'chat', role: 'primary', outcome: 'success', elapsedMs: 12, costCredits: 0, tokens: 0 };

test('metrics allowlist preserves explicit zero accounting and rejects invalid or sensitive fields', () => {
  assert.deepEqual(accountingFromUsage({ cost: 0, total_tokens: 0 }), { costCredits: 0, tokens: 0 });
  assert.deepEqual(accountingFromUsage({ cost: -1, total_tokens: 1.5 }), {});
  assert.deepEqual(validateMetricEvent(attempt), attempt);
  assert.equal(validateMetricEvent({ ...attempt, prompt: 'never log this' }), null);
  assert.equal(validateMetricEvent({ ...attempt, costCredits: Infinity }), null);
  assert.equal(validateMetricEvent({ ...attempt, tokens: -1 }), null);
  assert.equal(validateMetricEvent({ ...attempt, role: 'made-up' }), null);
  const operation = { v: 1, kind: 'operation', operation: 'chat', outcome: 'success', fallbackUsed: false, finalized: true, stages: { provider: 1, total: 1 } };
  assert.deepEqual(validateMetricEvent(operation), operation);
  assert.equal(validateMetricEvent({ ...operation, operation: 'safety' }), null);
  assert.equal(validateMetricEvent({ ...operation, outcome: 'failure' }), null);
  assert.notEqual(validateMetricEvent({ ...operation, finalized: false, operation: 'session_init' }), null);
});

test('observer is disabled by default and observer failures are fail-open', () => {
  let writes = 0;
  assert.equal(createMetricsObserver({ write: () => { writes += 1; } })(attempt), false);
  assert.equal(writes, 0);
  assert.doesNotThrow(() => createMetricsObserver({ enabled: true, write: () => { throw new Error('sink unavailable'); } })(attempt));
  assert.equal(createMetricsObserver({ enabled: true, write: () => { writes += 1; } })({ ...attempt, answer: 'sensitive' }), false);
  assert.equal(writes, 0);
});
