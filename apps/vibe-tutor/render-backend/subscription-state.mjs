// Offline-only reconciliation helper. JSON-compatible inputs are trusted,
// already-fetched provider responses plus explicitly recorded local correlation
// evidence; this is not
// authentication, storage, a provider adapter, or a live billing decision.

const ACTIVE_STATUSES = new Set(['active']);
const STOPPED_STATUSES = new Set(['expired', 'in_billing_retry', 'paused', 'incomplete', 'unknown', 'trialing']);
const record = (value) => value && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' && value.length > 0;
const time = (value) => Number.isSafeInteger(value) && value > 0 ? value : null;
const isoTime = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const freeze = (value) => {
  if (record(value) || Array.isArray(value)) {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
};
const copy = (value) => JSON.parse(JSON.stringify(value));
const result = (kind, reason, detail = {}) => freeze({ kind, reason, ...detail });

function expected(policy) {
  return record(policy) && text(policy.ownerId) && text(policy.v2ProductId) && text(policy.v1ProductId)
    && text(policy.entitlementId) && policy.store === 'play_store' && policy.environment === 'production' ? policy : null;
}

function v2Shape(subscription, policy) {
  if (!record(subscription) || subscription.object !== 'subscription' || !text(subscription.id)
    || subscription.customer_id !== policy.ownerId || subscription.original_customer_id !== policy.ownerId
    || subscription.product_id !== policy.v2ProductId || subscription.store !== policy.store
    || subscription.environment !== policy.environment || subscription.ownership !== 'purchased'
    || !record(subscription.entitlements) || !Array.isArray(subscription.entitlements.items)
    || !subscription.entitlements.items.some((item) => record(item) && item.object === 'entitlement' && item.id === policy.entitlementId && item.state === 'active')
    || typeof subscription.gives_access !== 'boolean' || typeof subscription.pending_payment !== 'boolean'
    || !text(subscription.status) || !time(subscription.current_period_starts_at)
    || !time(subscription.current_period_ends_at) || !text(subscription.store_subscription_identifier)) return null;
  return subscription;
}

function cycleFrom(subscription, boundary, provisional = false) {
  return freeze({
    key: `${subscription.id}:${boundary}`,
    subscriptionId: subscription.id,
    boundary,
    periodStart: subscription.current_period_starts_at,
    periodEnd: subscription.current_period_ends_at,
    storeSubscriptionIdentifiers: [subscription.store_subscription_identifier],
    provisional,
  });
}

// v1's key is a store product identifier; it intentionally has a separate
// policy field from the v2 RevenueCat product id.
function validGrace(observation, policy, subscription, now) {
  const entry = observation?.v1?.subscriber?.subscriptions?.[policy.v1ProductId];
  const correlation = observation?.graceCorrelation;
  const deadline = isoTime(entry?.grace_period_expires_date);
  const purchasedAt = isoTime(entry?.purchase_date);
  if (!record(entry) || !record(correlation) || !deadline || deadline <= now) return null;
  if (observation.v1?.subscriber?.original_app_user_id !== policy.ownerId || !purchasedAt || purchasedAt !== subscription.current_period_starts_at
    || entry.store !== policy.store || entry.is_sandbox !== false || !text(entry.store_transaction_id) || subscription.pending_payment !== true) return null;
  // These are local assertions from a bounded reconciliation record. They do
  // not claim the two provider transaction identifiers are intrinsically equal.
  if (correlation.subscriptionId !== subscription.id || correlation.v1StoreTransactionId !== entry.store_transaction_id
    || correlation.v2StoreSubscriptionIdentifier !== subscription.store_subscription_identifier
    || !text(correlation.precedingCycleKey) || !time(correlation.failedRenewalBoundary)
    || correlation.observationGeneration !== observation.generation
    || correlation.failedRenewalBoundary !== subscription.current_period_ends_at || correlation.failedRenewalBoundary > observation.observedAt
    || subscription.current_period_starts_at >= subscription.current_period_ends_at) return null;
  return { deadline, correlation };
}

/** Normalize one schema-shaped observation without mutating it. */
export function normalizeSubscriptionObservation(observation, policy, now = Date.now()) {
  const rules = expected(policy);
  if (!rules || !record(observation) || !Number.isSafeInteger(now) || !Number.isSafeInteger(observation.generation) || observation.generation < 0 || !time(observation.observedAt) || observation.observedAt > now || observation.observedAt < now - 300_000) return result('unresolved', 'invalid_input');
  const subscription = v2Shape(observation.v2, rules);
  if (!subscription) return result('unresolved', 'ownership_or_allowlist_evidence_missing');
  if (STOPPED_STATUSES.has(subscription.status) || subscription.gives_access === false) return result('denied', 'provider_denies_access');
  if (subscription.status === 'active' && subscription.pending_payment) return result('unresolved', 'conflicting_pending_payment');
  if (subscription.status === 'in_grace_period') {
    const grace = validGrace(observation, rules, subscription, now);
    if (!grace) return result('unresolved', 'grace_correlation_missing');
    return result('eligible', 'correlated_grace', {
      accessUntil: grace.deadline,
      cycle: cycleFrom(subscription, grace.correlation.failedRenewalBoundary, true),
      precedingCycleKey: grace.correlation.precedingCycleKey,
    });
  }
  if (!ACTIVE_STATUSES.has(subscription.status) || subscription.current_period_starts_at > observation.observedAt || subscription.current_period_starts_at >= subscription.current_period_ends_at || subscription.current_period_ends_at <= now) return result('denied', 'paid_period_not_current');
  return result('eligible', 'current_paid_period', {
    accessUntil: subscription.current_period_ends_at,
    // ends_at may be a future renewed period. It never selects a cycle here.
    cycle: cycleFrom(subscription, subscription.current_period_starts_at),
  });
}

/**
 * Apply a normalized observation to immutable local cycle history. Usage and
 * pending values are only preserved; this module does not allocate quantities.
 */
export function reconcileSubscriptionState(previous, observation, policy, now = Date.now()) {
  if (previous !== undefined && (!record(previous) || previous.ownerId !== policy?.ownerId || !Array.isArray(previous.cycles) || !Number.isSafeInteger(previous.observationGeneration) || previous.observationGeneration < 0 || !time(previous.observedAt)
    || !previous.cycles.every((item) => record(item) && typeof item.provisional === 'boolean' && text(item.subscriptionId) && time(item.boundary) && item.key === `${item.subscriptionId}:${item.boundary}` && time(item.periodStart) && time(item.periodEnd) && item.periodStart < item.periodEnd && item.boundary === (item.provisional ? item.periodEnd : item.periodStart) && Array.isArray(item.storeSubscriptionIdentifiers) && item.storeSubscriptionIdentifiers.length > 0 && item.storeSubscriptionIdentifiers.every(text) && new Set(item.storeSubscriptionIdentifiers).size === item.storeSubscriptionIdentifiers.length && Number.isSafeInteger(item.used) && item.used >= 0 && Number.isSafeInteger(item.pending) && item.pending >= 0)
    || new Set(previous.cycles.map((item) => item.key)).size !== previous.cycles.length)) {
    const safe = copy(previous);
    if (record(safe)) safe.access = { kind: 'unresolved', reason: 'invalid_previous_state' };
    return freeze({ state: freeze(safe), decision: result('unresolved', 'invalid_previous_state') });
  }
  const base = previous === undefined ? { ownerId: policy?.ownerId ?? null, cycles: [] } : copy(previous);
  const decision = normalizeSubscriptionObservation(observation, policy, now);
  if (Number.isSafeInteger(observation?.generation) && (observation.generation <= base.observationGeneration || observation.observedAt < base.observedAt)) {
    base.access = { kind: 'unresolved', reason: 'stale_observation_generation' };
    return freeze({ state: freeze(base), decision: result('unresolved', 'stale_observation_generation') });
  }
  base.observationGeneration = Number.isSafeInteger(observation?.generation) ? observation.generation : base.observationGeneration;
  base.observedAt = time(observation?.observedAt) ?? base.observedAt;
  if (decision.kind !== 'eligible') {
    base.access = { kind: decision.kind, reason: decision.reason };
    return freeze({ state: freeze(base), decision });
  }
  const {cycle} = decision;
  if (base.cycles.length && !base.cycles.some((item) => item.subscriptionId === cycle.subscriptionId)) {
    base.access = { kind: 'unresolved', reason: 'changed_subscription_identity' };
    return freeze({ state: freeze(base), decision: result('unresolved', 'changed_subscription_identity') });
  }
  const newestBoundary = base.cycles.reduce((highest, item) => Math.max(highest, time(item?.boundary) ?? 0), 0);
  const existing = base.cycles.find((item) => item?.key === cycle.key);
  // A late duplicate of an older known cycle must not make it current again.
  if (cycle.boundary < newestBoundary) {
    base.access = { kind: 'denied', reason: 'stale_cycle_observation' };
    return freeze({ state: freeze(base), decision: result('denied', 'stale_cycle_observation') });
  }
  if (cycle.provisional) {
    const preceding = base.cycles.find((item) => item?.key === decision.precedingCycleKey);
    if (!preceding || preceding.subscriptionId !== cycle.subscriptionId || cycle.boundary !== preceding.periodEnd || cycle.periodStart !== preceding.periodStart) {
      base.access = { kind: 'unresolved', reason: 'grace_boundary_not_established' };
      return freeze({ state: freeze(base), decision: result('unresolved', 'grace_boundary_not_established') });
    }
  }
  if (existing) {
    // An active recovery can confirm a provisional cycle, never replace its usage.
    if (!existing.provisional && (existing.periodStart !== cycle.periodStart || existing.periodEnd !== cycle.periodEnd)) {
      base.access = { kind: 'unresolved', reason: 'contradictory_existing_cycle' };
      return freeze({ state: freeze(base), decision: result('unresolved', 'contradictory_existing_cycle') });
    }
    if (!cycle.provisional) existing.provisional = false;
    if (!Array.isArray(existing.storeSubscriptionIdentifiers)) existing.storeSubscriptionIdentifiers = [];
    for (const identifier of cycle.storeSubscriptionIdentifiers) if (!existing.storeSubscriptionIdentifiers.includes(identifier)) existing.storeSubscriptionIdentifiers.push(identifier);
    existing.periodStart = cycle.periodStart;
    existing.periodEnd = cycle.periodEnd;
  } else {
    const provisional = base.cycles.find((item) => item.provisional);
    if (!cycle.provisional && provisional) {
      base.access = { kind: 'unresolved', reason: 'recovery_boundary_changed' };
      return freeze({ state: freeze(base), decision: result('unresolved', 'recovery_boundary_changed') });
    }
    const latest = base.cycles.reduce((current, item) => item.boundary > (current?.boundary ?? 0) ? item : current, null);
    if (!cycle.provisional && latest && cycle.periodStart !== latest.periodEnd) {
      base.access = { kind: 'unresolved', reason: 'unverified_cycle_gap' };
      return freeze({ state: freeze(base), decision: result('unresolved', 'unverified_cycle_gap') });
    }
    base.cycles.push({ ...copy(cycle), precedingCycleKey: decision.precedingCycleKey ?? null, used: 0, pending: 0 });
  }
  base.access = { kind: 'eligible', cycleKey: cycle.key, accessUntil: decision.accessUntil };
  return freeze({ state: freeze(base), decision });
}
