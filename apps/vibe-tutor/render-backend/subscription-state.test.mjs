import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSubscriptionObservation, reconcileSubscriptionState } from './subscription-state.mjs';

const now = Date.parse('2026-09-08T12:00:00Z');
const policy = Object.freeze({ ownerId: 'parent-opaque-1', v2ProductId: 'prod_extra_monthly', v1ProductId: 'com.vibetech.tutor.extra.monthly', entitlementId: 'entl_extra_ai', store: 'play_store', environment: 'production' });
const observed = (generation, observedAt = now - 1) => ({ generation, observedAt });
const v2 = (changes = {}) => ({
  object: 'subscription', id: 'sub_1', customer_id: policy.ownerId, original_customer_id: policy.ownerId,
  product_id: policy.v2ProductId, current_period_starts_at: now - 10_000, current_period_ends_at: now + 10_000,
  ends_at: now + 10_000, gives_access: true, pending_payment: false, status: 'active',
  store: 'play_store', environment: 'production', ownership: 'purchased', store_subscription_identifier: 'GPA.1',
  entitlements: { object: 'list', items: [{ object: 'entitlement', id: policy.entitlementId, state: 'active' }], next_page: null, url: '/synthetic' },
  ...changes,
});
const grace = (boundary, generation = 2) => ({
  ...observed(generation),
  v2: v2({ status: 'in_grace_period', pending_payment: true, current_period_ends_at: now - 1, gives_access: true }),
  v1: { subscriber: { original_app_user_id: policy.ownerId, subscriptions: { [policy.v1ProductId]: { store: 'play_store', is_sandbox: false, store_transaction_id: 'GPA.v1', purchase_date: new Date(now - 10_000).toISOString(), grace_period_expires_date: '2026-09-08T12:00:05Z' } } } },
  graceCorrelation: { subscriptionId: 'sub_1', v1StoreTransactionId: 'GPA.v1', v2StoreSubscriptionIdentifier: 'GPA.1', precedingCycleKey: `sub_1:${now - 10_000}`, failedRenewalBoundary: boundary, observationGeneration: generation },
});

test('current paid and cancelled periods grant only their current v2 cycle, immutably', () => {
  const source = { ...observed(1), v2: v2({ ends_at: now + 99_999, auto_renewal_status: 'has_already_renewed' }) };
  const before = structuredClone(source);
  const decision = normalizeSubscriptionObservation(source, policy, now);
  assert.equal(decision.kind, 'eligible');
  assert.equal(decision.cycle.boundary, now - 10_000);
  assert.deepEqual(source, before);
  assert.equal(normalizeSubscriptionObservation({ ...observed(2), v2: v2({ auto_renewal_status: 'will_not_renew' }) }, policy, now).kind, 'eligible');
  assert.equal(normalizeSubscriptionObservation({ ...observed(3), v2: v2({ current_period_ends_at: now - 1 }) }, policy, now).kind, 'denied');
});

test('ownership, allowlist, period, unknown status, and stopped states fail closed', () => {
  for (const changes of [{ customer_id: 'other' }, { ownership: 'family_shared' }, { product_id: 'prod_other' }, { environment: 'sandbox' }, { status: 'unknown' }, { status: 'in_billing_retry' }, { status: 'paused' }, { gives_access: false }]) {
    assert.notEqual(normalizeSubscriptionObservation({ ...observed(1), v2: v2(changes) }, policy, now).kind, 'eligible');
  }
  assert.equal(normalizeSubscriptionObservation({ ...observed(1), v2: v2({ entitlements: { items: [] } }) }, policy, now).kind, 'unresolved');
});

test('grace requires explicit v1 deadline, separately mapped product, and local boundary correlation', () => {
  assert.equal(normalizeSubscriptionObservation({ ...observed(1), v2: grace(now).v2 }, policy, now).kind, 'unresolved');
  const firstSeen = reconcileSubscriptionState(undefined, grace(now - 1), policy, now);
  assert.equal(firstSeen.decision.kind, 'unresolved');
  const paid = reconcileSubscriptionState(undefined, { ...observed(1, now - 2), v2: v2({ current_period_ends_at: now - 1 }) }, policy, now - 2);
  const provisional = reconcileSubscriptionState(paid.state, grace(now - 1), policy, now);
  assert.equal(provisional.decision.kind, 'eligible');
  assert.equal(provisional.state.cycles.length, 2);
  assert.equal(normalizeSubscriptionObservation({ ...grace(now - 1), graceCorrelation: { ...grace(now - 1).graceCorrelation, v2StoreSubscriptionIdentifier: 'GPA.unrelated' } }, policy, now).kind, 'unresolved');
});

test('recovery, duplicates, and reordered observations preserve cycle counters without refilling or reopening', () => {
  const paid = reconcileSubscriptionState(undefined, { ...observed(1, now - 2), v2: v2({ current_period_ends_at: now - 1 }) }, policy, now - 2);
  const provisional = reconcileSubscriptionState(paid.state, grace(now - 1), policy, now);
  const used = structuredClone(provisional.state);
  used.cycles[1].used = 4; used.cycles[1].pending = 1;
  const recovered = reconcileSubscriptionState(used, { ...observed(3), v2: v2({ current_period_starts_at: now - 1, current_period_ends_at: now + 20_000, store_subscription_identifier: 'GPA.2' }) }, policy, now);
  assert.equal(recovered.state.cycles.length, 2);
  assert.deepEqual(recovered.state.cycles[1].used, 4);
  assert.equal(recovered.state.cycles[1].pending, 1);
  assert.deepEqual(recovered.state.cycles[1].storeSubscriptionIdentifiers, ['GPA.1', 'GPA.2']);
  const duplicate = reconcileSubscriptionState(recovered.state, { ...observed(3), v2: v2({ current_period_starts_at: now - 1, current_period_ends_at: now + 20_000 }) }, policy, now);
  assert.equal(duplicate.state.cycles.length, 2);
  const reordered = reconcileSubscriptionState(recovered.state, { ...observed(4), v2: v2() }, policy, now);
  assert.equal(reordered.decision.reason, 'stale_cycle_observation');
  assert.equal(reordered.state.cycles.length, 2);
});

test('denial closes access while preserving history; malformed state and changed identity stay unresolved', () => {
  const paid = reconcileSubscriptionState(undefined, { ...observed(1), v2: v2() }, policy, now);
  const stopped = reconcileSubscriptionState(paid.state, { ...observed(2), v2: v2({ status: 'paused' }) }, policy, now);
  assert.equal(stopped.state.access.kind, 'denied');
  assert.equal(stopped.state.cycles.length, 1);
  assert.equal(reconcileSubscriptionState({ ownerId: 'wrong', cycles: [] }, { ...observed(3), v2: v2() }, policy, now).decision.reason, 'invalid_previous_state');
  assert.equal(reconcileSubscriptionState(paid.state, { ...observed(3), v2: v2({ id: 'sub_changed' }) }, policy, now).decision.reason, 'changed_subscription_identity');
});

test('only a contiguous new paid boundary creates history; expiry changes, future starts, and expired grace do not grant', () => {
  const paid = reconcileSubscriptionState(undefined, { ...observed(1), v2: v2() }, policy, now);
  const renewalNow = now + 10_001;
  const renewed = reconcileSubscriptionState(paid.state, { generation: 2, observedAt: renewalNow, v2: v2({ current_period_starts_at: now + 10_000, current_period_ends_at: now + 20_000 }) }, policy, renewalNow);
  assert.equal(renewed.state.cycles.length, 2);
  assert.equal(reconcileSubscriptionState(renewed.state, { generation: 3, observedAt: renewalNow, v2: v2({ current_period_starts_at: now + 10_000, current_period_ends_at: now + 30_000 }) }, policy, renewalNow).decision.reason, 'contradictory_existing_cycle');
  assert.equal(normalizeSubscriptionObservation({ ...observed(4), v2: v2({ current_period_starts_at: now + 1 }) }, policy, now).kind, 'denied');
  const expiredGrace = { ...grace(now - 1, 4), v1: { subscriber: { original_app_user_id: policy.ownerId, subscriptions: { [policy.v1ProductId]: { store: 'play_store', is_sandbox: false, store_transaction_id: 'GPA.v1', purchase_date: new Date(now - 10_000).toISOString(), grace_period_expires_date: '2026-09-08T11:59:59Z' } } } } };
  assert.equal(normalizeSubscriptionObservation(expiredGrace, policy, now).kind, 'unresolved');
});

test('monthly boundaries are evidence, never 30-day arithmetic', () => {
  const aug8 = Date.parse('2026-08-08T00:00:00Z');
  const sep8 = Date.parse('2026-09-08T00:00:00Z');
  const oct8 = Date.parse('2026-10-08T00:00:00Z');
  const aug = reconcileSubscriptionState(undefined, { generation: 1, observedAt: sep8 - 1, v2: v2({ current_period_starts_at: aug8, current_period_ends_at: sep8 }) }, policy, sep8 - 1);
  const sep = reconcileSubscriptionState(aug.state, { generation: 2, observedAt: sep8, v2: v2({ current_period_starts_at: sep8, current_period_ends_at: oct8, store_subscription_identifier: 'GPA.sep' }) }, policy, sep8);
  assert.deepEqual(sep.state.cycles.map((cycle) => cycle.boundary), [aug8, sep8]);
  const jan31 = Date.parse('2027-01-31T00:00:00Z');
  const feb28 = Date.parse('2027-02-28T00:00:00Z');
  const mar31 = Date.parse('2027-03-31T00:00:00Z');
  const feb = normalizeSubscriptionObservation({ generation: 1, observedAt: feb28 - 1, v2: v2({ current_period_starts_at: jan31, current_period_ends_at: feb28 }) }, policy, feb28 - 1);
  const mar = normalizeSubscriptionObservation({ generation: 2, observedAt: mar31 - 1, v2: v2({ current_period_starts_at: feb28, current_period_ends_at: mar31 }) }, policy, mar31 - 1);
  assert.equal(feb.cycle.boundary, jan31);
  assert.equal(mar.cycle.boundary, feb28);
});

test('adversarial schema, freshness, history, and replay cases fail closed without mutation', () => {
  const source = { ...observed(1), v2: v2() };
  const before = structuredClone(source);
  const malformed = [
    { current_period_starts_at: null }, { current_period_ends_at: null }, { current_period_starts_at: now + 1 },
    { status: 'active', pending_payment: true }, { status: 'expired' }, { status: 'in_billing_retry' },
  ];
  for (const changes of malformed) assert.notEqual(normalizeSubscriptionObservation({ ...observed(1), v2: v2(changes) }, policy, now).kind, 'eligible');
  assert.equal(normalizeSubscriptionObservation({ generation: 2, observedAt: now - 300_000, v2: v2({ current_period_starts_at: now - 300_001 }) }, policy, now).kind, 'eligible');
  assert.equal(normalizeSubscriptionObservation({ generation: 2, observedAt: now - 300_001, v2: v2({ current_period_starts_at: now - 300_002 }) }, policy, now).kind, 'unresolved');
  const badGrace = grace(now - 1, 2);
  for (const change of [
    { original_app_user_id: 'other' },
    { subscriptions: { [policy.v1ProductId]: { ...badGrace.v1.subscriber.subscriptions[policy.v1ProductId], store: 'amazon' } } },
    { subscriptions: { [policy.v1ProductId]: { ...badGrace.v1.subscriber.subscriptions[policy.v1ProductId], is_sandbox: true } } },
  ]) assert.equal(normalizeSubscriptionObservation({ ...badGrace, v1: { subscriber: { ...badGrace.v1.subscriber, ...change } } }, policy, now).kind, 'unresolved');
  const paid = reconcileSubscriptionState(undefined, source, policy, now);
  const corruptions = [
    (state) => { state.cycles[0].used = -1; }, (state) => { state.cycles[0].key = 'bad'; },
    (state) => { state.cycles.push(structuredClone(state.cycles[0])); }, (state) => { state.observationGeneration = -1; },
  ];
  for (const corrupt of corruptions) { const state = structuredClone(paid.state); corrupt(state); assert.equal(reconcileSubscriptionState(state, { ...observed(2), v2: v2() }, policy, now).decision.reason, 'invalid_previous_state'); }
  const denied = reconcileSubscriptionState(paid.state, { ...observed(2), v2: v2({ status: 'paused' }) }, policy, now);
  const replay = reconcileSubscriptionState(denied.state, { ...observed(1), v2: v2() }, policy, now);
  assert.equal(replay.decision.reason, 'stale_observation_generation');
  assert.deepEqual(source, before);
});
