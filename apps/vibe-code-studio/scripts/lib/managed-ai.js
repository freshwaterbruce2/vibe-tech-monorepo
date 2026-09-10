/** Paid usage is authoritative only on a trusted, operator-controlled backend. */
export function managedConfig(env = process.env) {
  const positive = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : 0;
  const limit = positive(env.VCS_MANAGED_AI_MONTHLY_REQUESTS);
  const maxTokens = positive(env.VCS_MANAGED_AI_MAX_TOKENS);
  const models = (env.VCS_MANAGED_AI_MODELS || '').split(',').map(x => x.trim()).filter(Boolean);
  const configured = env.VCS_MANAGED_AI_ENABLED === 'true' && !!env.OPENROUTER_API_KEY && limit > 0 && maxTokens > 0 && models.length > 0;
  return { configured, limit, maxTokens, models };
}

export function initializeUsage(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS managed_ai_usage (
    user_id TEXT NOT NULL, period TEXT NOT NULL, requests INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, period)
  )`);
}

export function subscriptionFor(db, userId) {
  return db.prepare(`SELECT s.* FROM stripe_subscriptions s
    JOIN stripe_customers c ON c.id = s.customer_id WHERE c.user_id = ?
    ORDER BY CASE WHEN s.status IN ('active', 'trialing') THEN 0 ELSE 1 END,
    s.updated_at DESC LIMIT 1`).get(String(userId));
}

export function isEntitled(sub, now = new Date()) {
  return !!sub && ['active', 'trialing'].includes(sub.status) &&
    !!sub.current_period_end && Date.parse(sub.current_period_end) > now.getTime();
}

export function usageStatus(db, userId, now = new Date()) {
  const config = managedConfig();
  const period = now.toISOString().slice(0, 7);
  const used = db.prepare('SELECT requests FROM managed_ai_usage WHERE user_id = ? AND period = ?')
    .get(String(userId), period)?.requests || 0;
  return { ...config, used, remaining: Math.max(0, config.limit - used),
    available: config.configured && isEntitled(subscriptionFor(db, userId), now),
    resetsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString() };
}

/** Reserve before upstream spend. Ambiguous failures count to avoid free retry abuse. */
export function reserveRequest(db, userId, limit, now = new Date()) {
  const period = now.toISOString().slice(0, 7);
  return db.prepare(`INSERT INTO managed_ai_usage (user_id, period, requests) VALUES (?, ?, 1)
    ON CONFLICT(user_id, period) DO UPDATE SET requests = requests + 1
    WHERE requests < ?`).run(String(userId), period, limit).changes === 1;
}

export function validateManagedBody(body, config) {
  if (!body || typeof body !== 'object' || !config.models.includes(body.model)) return 'Select an included subscription model.';
  if (!Array.isArray(body.messages) || body.messages.length === 0) return 'Messages are required.';
  if (JSON.stringify(body).length > 128_000) return 'Request exceeds the managed AI size limit.';
  if (body.n != null && body.n !== 1) return 'Only one completion per request is supported.';
  if (body.models || body.route || body.plugins) return 'Model routing and plugins are not included.';
  for (const field of ['max_tokens', 'max_completion_tokens']) {
    if (body[field] != null && (!Number.isSafeInteger(body[field]) || body[field] < 1 || body[field] > config.maxTokens)) return `Maximum output is ${config.maxTokens} tokens.`;
  }
  return null;
}
