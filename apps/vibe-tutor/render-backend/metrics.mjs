const VERSION = 1;
const OPERATIONS = new Set(['chat', 'safety', 'session_init']);
const ROLES = new Set(['primary', 'fallback']);
const ATTEMPT_OUTCOMES = new Set(['success', 'failure']);
const OPERATION_OUTCOMES = new Set(['success', 'failure', 'rejected']);
const STAGES = new Set(['auth_integrity', 'quota_admission', 'provider', 'quota_finalize', 'cleanup', 'total']);

const finite = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const safeInteger = (value) => Number.isSafeInteger(value) && value >= 0;

export function elapsedMs(start, now = performance.now()) {
  const value = now - start;
  return finite(value) ? Math.round(value) : undefined;
}

export function accountingFromUsage(usage) {
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return {};
  const costCredits = finite(usage.cost) ? usage.cost : undefined;
  const tokens = safeInteger(usage.total_tokens) ? usage.total_tokens : undefined;
  const promptTokens = safeInteger(usage.prompt_tokens) ? usage.prompt_tokens : undefined;
  const completionTokens = safeInteger(usage.completion_tokens) ? usage.completion_tokens : undefined;
  return { ...(costCredits === undefined ? {} : { costCredits }), ...(tokens === undefined ? {} : { tokens }), ...(promptTokens === undefined ? {} : { promptTokens }), ...(completionTokens === undefined ? {} : { completionTokens }) };
}

export function validateMetricEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event) || event.v !== VERSION || !OPERATIONS.has(event.operation)) return null;
  if (event.kind === 'attempt') {
    if (event.operation === 'session_init' || !ROLES.has(event.role) || !ATTEMPT_OUTCOMES.has(event.outcome) || !finite(event.elapsedMs)) return null;
    if (event.costCredits !== undefined && !finite(event.costCredits)) return null;
    if (event.tokens !== undefined && !safeInteger(event.tokens)) return null;
    if (event.promptTokens !== undefined && !safeInteger(event.promptTokens)) return null;
    if (event.completionTokens !== undefined && !safeInteger(event.completionTokens)) return null;
    const allowed = new Set(['v', 'kind', 'operation', 'role', 'outcome', 'elapsedMs', 'costCredits', 'tokens', 'promptTokens', 'completionTokens']);
    if (Object.keys(event).some((key) => !allowed.has(key))) return null;
    return Object.fromEntries(Object.keys(event).map((key) => [key, event[key]]));
  }
  if (event.kind === 'operation') {
    if (!OPERATION_OUTCOMES.has(event.outcome) || typeof event.fallbackUsed !== 'boolean' || typeof event.finalized !== 'boolean' || (event.finalized && (event.operation !== 'chat' || event.outcome !== 'success')) || !event.stages || typeof event.stages !== 'object' || Array.isArray(event.stages)) return null;
    if (Object.entries(event.stages).some(([name, value]) => !STAGES.has(name) || !finite(value))) return null;
    if (!Object.hasOwn(event.stages, 'total') || (event.operation === 'chat' && event.finalized && !Object.hasOwn(event.stages, 'provider')) || (event.fallbackUsed && !Object.hasOwn(event.stages, 'provider'))) return null;
    const allowed = new Set(['v', 'kind', 'operation', 'outcome', 'fallbackUsed', 'finalized', 'stages']);
    if (Object.keys(event).some((key) => !allowed.has(key))) return null;
    return { v: event.v, kind: event.kind, operation: event.operation, outcome: event.outcome, fallbackUsed: event.fallbackUsed, finalized: event.finalized, stages: Object.fromEntries(Object.entries(event.stages)) };
  }
  return null;
}

export function createMetricsObserver({ enabled = false, write = (line) => process.stdout.write(`${line}\n`) } = {}) {
  return (event) => {
    if (!enabled) return false;
    try {
      const valid = validateMetricEvent(event);
      if (!valid) return false;
      const result = write(JSON.stringify(valid));
      if (result && typeof result.catch === 'function') result.catch(() => {});
      return true;
    } catch { return false; }
  };
}

const quantile = (values, p) => {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(p * sorted.length) - 1];
};

export function summarizeMetricEvents(events) {
  const valid = events.map(validateMetricEvent).filter(Boolean);
  const attempts = valid.filter((event) => event.kind === 'attempt');
  const operations = valid.filter((event) => event.kind === 'operation');
  const byOperation = (operation) => attempts.filter((event) => event.operation === operation);
  const chatAttempts = byOperation('chat');
  const safetyAttempts = byOperation('safety');
  const providerOperations = operations.filter((event) => event.operation === 'chat' || event.operation === 'safety').filter((event) => event.stages.provider !== undefined);
  const eligibleChatOperations = operations.filter((event) => event.operation === 'chat' && event.stages.provider !== undefined);
  const successfulChats = eligibleChatOperations.filter((event) => event.outcome === 'success' && event.finalized).length;
  const sumNumbers = (values, integer = false) => { let total = 0; for (const value of values) { total += value; if (!Number.isFinite(total) || (integer && !Number.isSafeInteger(total))) return null; } return total; };
  const accounting = (operation) => {
    const values = byOperation(operation); const knownCost = values.filter((event) => event.costCredits !== undefined); const knownTokens = values.filter((event) => event.tokens !== undefined);
    const knownCostCredits = sumNumbers(knownCost.map((event) => event.costCredits)); const knownTokenTotal = sumNumbers(knownTokens.map((event) => event.tokens), true);
    return { attempts: values.length, knownCostAttempts: knownCost.length, unknownCostAttempts: values.length - knownCost.length, knownCostCoverage: values.length ? knownCost.length / values.length : null, knownCostCredits, knownCostSumStatus: knownCostCredits === null ? 'overflow' : 'complete', knownTokenAttempts: knownTokens.length, unknownTokenAttempts: values.length - knownTokens.length, knownTokenCoverage: values.length ? knownTokens.length / values.length : null, knownTokens: knownTokenTotal, knownTokenSumStatus: knownTokenTotal === null ? 'overflow' : 'complete' };
  };
  const timing = Object.fromEntries([...OPERATIONS].map((operation) => [operation, Object.fromEntries([...STAGES].map((stage) => {
    const values = operations.filter((event) => event.operation === operation).map((event) => event.stages[stage]).filter((value) => value !== undefined);
    return [stage, { samples: values.length, p50Ms: quantile(values, 0.5) ?? null, p95Ms: quantile(values, 0.95) ?? null }];
  }))]));
  const ratio = (numerator, denominator) => (denominator ? numerator / denominator : undefined);
  const chatAccounting = accounting('chat');
  const knownChatCost = sumNumbers(chatAttempts.filter((event) => event.costCredits !== undefined).map((event) => event.costCredits));
  const costPerSuccessStatus = successfulChats === 0 ? 'no_finalized_success' : (chatAttempts.length === 0 ? 'no_attempt_observations' : (knownChatCost === null ? 'sum_overflow' : (chatAccounting.unknownCostAttempts ? 'incomplete_accounting' : 'complete')));
  return {
    schemaVersion: VERSION,
    totals: { events: valid.length, attempts: attempts.length, operations: operations.length, malformedOrRejected: events.length - valid.length },
    accounting: { chat: chatAccounting, safety: accounting('safety'), finalizedSuccessfulChats: successfulChats, observedKnownChatAttemptCostPerFinalizedSuccessfulChat: successfulChats && chatAttempts.length && knownChatCost !== null ? knownChatCost / successfulChats : null, observedKnownChatAttemptCostPerFinalizedSuccessfulChatStatus: costPerSuccessStatus },
    outcomes: {
      providerInvokingChatOperations: eligibleChatOperations.length,
      providerInvokingChatFailures: eligibleChatOperations.filter((event) => event.outcome === 'failure').length,
      providerInvokingChatFailureRate: ratio(eligibleChatOperations.filter((event) => event.outcome === 'failure').length, eligibleChatOperations.length) ?? null,
      providerFailureRate: ratio(attempts.filter((event) => event.outcome === 'failure').length, attempts.length) ?? null,
      fallbackShare: ratio(providerOperations.filter((event) => event.fallbackUsed).length, providerOperations.length) ?? null,
      safetyAttempts: safetyAttempts.length,
    },
    timing,
    limitations: ['Records are content-free and cannot reconstruct unobserved or crash-lost attempts.', 'Only nonoverlapping exports should be summarized; duplicate events are counted as supplied.'],
  };
}
