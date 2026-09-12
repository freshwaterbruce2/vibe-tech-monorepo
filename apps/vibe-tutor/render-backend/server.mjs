import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { InMemoryQuotaStore, LIMITS, MODELS, SYSTEM_PROMPTS, detectCrisis, installationHmac, isAmbiguousSafetyText, makeToken, requestHash, validateChat, verifyToken } from './core.mjs';
import { FirestoreQuotaStore, firestoreReportSink, playIntegrityVerifier } from './cloud.mjs';
import { accountingFromUsage, createMetricsObserver, elapsedMs } from './metrics.mjs';
import policy from '../privacy-policy.json' with { type: 'json' };

dotenv.config();
export const CSP_DIRECTIVES = { defaultSrc: ["'self'"], baseUri: ["'self'"], formAction: ["'self'"], objectSrc: ["'none'"], scriptSrc: ["'self'", "'unsafe-inline'"], styleSrc: ["'self'", "'unsafe-inline'"], fontSrc: ["'self'", 'https:', 'data:'], imgSrc: ["'self'", 'https:', 'data:', 'blob:'], mediaSrc: ["'self'", 'https:', 'data:', 'blob:'], connectSrc: ["'self'", 'https:', 'wss:'] };
const policyHtml = () => `<!doctype html><html lang="en"><meta charset="utf-8"><title>${policy.title}</title><main><h1>${policy.title}</h1><p>Effective ${policy.effectiveDate}</p>${policy.sections.map((s) => `<h2>${s.heading}</h2>${s.paragraphs.map((p) => `<p>${p}</p>`).join('')}`).join('')}</main></html>`;
const logOperationalFailure = () => {}; // never emit user content, credentials, tokens, or identifiers
const SAFETY_PROMPT = 'Classify only the supplied learner text for imminent self-harm or abuse. Reply with exactly one lowercase label: self-harm, abuse, or none. Do not explain, repeat, or retain the text.';
const safelyObserve = (observer, event) => { try { const result = observer(event); if (result && typeof result.catch === 'function') result.catch(() => {}); } catch {} };

export function openRouterGenerator(apiKey, fetchImpl = fetch, observeAttempt = () => {}) {
  return async (chatType, messages, operationObserver = () => {}) => {
    const call = async (model, role) => {
      const started = performance.now(); let usage; let response; let success = false;
      try {
        response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM_PROMPTS[chatType] }, ...messages], temperature: 0.4, max_tokens: LIMITS.outputTokens, provider: { zdr: true, data_collection: 'deny' } }), signal: AbortSignal.timeout(LIMITS.timeoutMs) });
        try { usage = await response.json(); } catch {}
        if (!response.ok) throw new Error(`upstream-${response.status}`);
        const text = usage?.choices?.[0]?.message?.content;
        if (typeof text !== 'string' || !text.trim()) throw new Error('empty-upstream-response');
        success = true; return { text, model };
      } finally {
        const event = { v: 1, kind: 'attempt', operation: 'chat', role, outcome: success ? 'success' : 'failure', elapsedMs: elapsedMs(started), ...accountingFromUsage(usage?.usage) };
        safelyObserve(observeAttempt, event); safelyObserve(operationObserver, event);
      }
    };
    try { return await call(MODELS.primary, 'primary'); } catch { return call(MODELS.fallback, 'fallback'); }
  };
}

export function openRouterSafetyClassifier(apiKey, fetchImpl = fetch, observeAttempt = () => {}) {
  return async (text, operationObserver = () => {}) => {
    const call = async (model, role) => {
      const started = performance.now(); let payload; let response; let success = false;
      try {
        response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: SAFETY_PROMPT }, { role: 'user', content: text }],
          temperature: 0,
          max_tokens: 16,
          provider: { zdr: true, data_collection: 'deny' },
        }),
        signal: AbortSignal.timeout(LIMITS.timeoutMs),
        });
        try { payload = await response.json(); } catch {}
        if (!response.ok) throw new Error(`safety-upstream-${response.status}`);
        const classification = payload?.choices?.[0]?.message?.content;
        const normalized = typeof classification === 'string' ? classification.trim().toLowerCase() : '';
        if (!['self-harm', 'abuse', 'none'].includes(normalized)) throw new Error('invalid-safety-response');
        success = true; return normalized;
      } finally {
        const event = { v: 1, kind: 'attempt', operation: 'safety', role, outcome: success ? 'success' : 'failure', elapsedMs: elapsedMs(started), ...accountingFromUsage(payload?.usage) };
        safelyObserve(observeAttempt, event); safelyObserve(operationObserver, event);
      }
    };
    try { return await call(MODELS.primary, 'primary'); } catch { return call(MODELS.fallback, 'fallback'); }
  };
}

export function createApp({ env = process.env, verifyIntegrity, quotaStore, generate, safetyClassifier, reportSink, now = () => Date.now(), metricNow = () => performance.now(), metricsWrite } = {}) {
  const app = express();
  const observeMetric = createMetricsObserver({ enabled: env.AI_METRICS === '1', ...(metricsWrite ? { write: metricsWrite } : {}) });
  const beginMetric = (operation) => (req, _res, next) => { req.aiMetric = { operation, started: metricNow(), stages: {}, fallbackUsed: false, finished: false }; next(); };
  const stage = (req, name, started) => { if (req.aiMetric) req.aiMetric.stages[name] = elapsedMs(started, metricNow()); };
  const finishMetric = (req, outcome, finalized = false) => {
    const metric = req.aiMetric;
    if (!metric || metric.finished) return;
    metric.finished = true;
    observeMetric({ v: 1, kind: 'operation', operation: metric.operation, outcome, fallbackUsed: metric.fallbackUsed, finalized, stages: { ...metric.stages, total: elapsedMs(metric.started, metricNow()) } });
  };
  const production = env.NODE_ENV === 'production';
  const signing = env.SESSION_SIGNING_SECRET;
  const installationSecret = env.INSTALLATION_HMAC_SECRET;
  const playCertificate = typeof env.PLAY_CERTIFICATE_SHA256 === 'string' && env.PLAY_CERTIFICATE_SHA256.trim() === env.PLAY_CERTIFICATE_SHA256 && env.PLAY_CERTIFICATE_SHA256.length > 0
    ? env.PLAY_CERTIFICATE_SHA256
    : null;
  // Production must inject a durable Cloud storage adapter; this test-only fallback cannot be selected in production.
  const quota = quotaStore ?? (production && env.GOOGLE_CLOUD_PROJECT ? new FirestoreQuotaStore({ project: env.GOOGLE_CLOUD_PROJECT, database: env.FIRESTORE_DATABASE || '(default)' }) : (production ? null : new InMemoryQuotaStore()));
  const reports = reportSink ?? (production && env.GOOGLE_CLOUD_PROJECT ? firestoreReportSink({ project: env.GOOGLE_CLOUD_PROJECT, database: env.FIRESTORE_DATABASE || '(default)' }) : null);
  const provider = generate ?? (typeof env.OPENROUTER_API_KEY === 'string' && env.OPENROUTER_API_KEY.trim()
    ? openRouterGenerator(env.OPENROUTER_API_KEY, fetch, observeMetric)
    : null);
  const integrityVerifier = verifyIntegrity ?? (production ? playIntegrityVerifier() : null);
  const safety = safetyClassifier ?? (typeof env.OPENROUTER_API_KEY === 'string' && env.OPENROUTER_API_KEY.trim()
    ? openRouterSafetyClassifier(env.OPENROUTER_API_KEY, fetch, observeMetric)
    : null);
  const hasUsableQuota = Boolean(
    quota && ['allowance', 'reserve', 'finalize', 'release', 'consumeSafetyAttempt'].every((method) => typeof quota[method] === 'function'),
  );
  const aiReady = Boolean(
    signing && installationSecret && playCertificate && hasUsableQuota &&
    typeof integrityVerifier === 'function' && typeof provider === 'function' &&
    typeof safety === 'function' && typeof reports === 'function',
  );
  app.use(helmet({ contentSecurityPolicy: { useDefaults: false, directives: CSP_DIRECTIVES } }));
  app.use(cors({ origin: ['capacitor://localhost', 'http://localhost'], credentials: false }));
  app.use(express.json({ limit: '32kb', strict: true }));
  const auth = async (req, res, next) => {
    const started = metricNow();
    if (!signing || !installationSecret || !quota) { stage(req, 'auth_integrity', started); finishMetric(req, 'failure'); return res.status(503).json({ error: 'AI service is not configured.' }); }
    const session = verifyToken(req.get('authorization')?.replace(/^Bearer\s+/i, ''), signing, now());
    stage(req, 'auth_integrity', started);
    if (!session) { finishMetric(req, 'rejected'); return res.status(401).json({ error: 'Invalid or expired session.' }); }
    req.session = session;
    return next();
  };
  app.post('/api/session/init', beginMetric('session_init'), async (req, res) => {
    const authStarted = metricNow();
    const b = req.body;
    const expected = 'installationId,integrityToken,requestHash,requestedAt';
    if (!signing || !installationSecret || !quota || !b || Object.keys(b).sort().join(',') !== expected || typeof b.installationId !== 'string' || b.installationId.length < 16 || b.installationId.length > 128 || !Number.isFinite(b.requestedAt) || Math.abs(now() - b.requestedAt) > 300000 || b.requestHash !== requestHash(b.installationId, b.requestedAt) || typeof b.integrityToken !== 'string') { stage(req, 'auth_integrity', authStarted); finishMetric(req, 'rejected'); return res.status(401).json({ error: 'Entitlement verification failed.' }); }
    let verdict;
    try { verdict = integrityVerifier ? await integrityVerifier(b.integrityToken, b.requestHash) : null; } catch (err) { stage(req, 'auth_integrity', authStarted); finishMetric(req, 'failure'); throw err; }
    stage(req, 'auth_integrity', authStarted);
    if (!verdict || verdict.packageName !== 'com.vibetech.tutor' || ![10516, 10517, 10518].includes(verdict.versionCode) || verdict.license !== 'LICENSED' || verdict.appRecognition !== 'PLAY_RECOGNIZED' || verdict.certificateDigest !== playCertificate) { finishMetric(req, 'rejected'); return res.status(401).json({ error: 'Entitlement verification failed.' }); }
    const id = installationHmac(b.installationId, installationSecret); const issuedAt = now();
    const token = makeToken({ i: id, iat: issuedAt, exp: issuedAt + 1800000, v: verdict.versionCode, l: 'LICENSED' }, signing);
    try { const allowance = await quota.allowance(id, new Date(issuedAt)); finishMetric(req, 'success'); return res.json({ token, expiresIn: 1800, allowance }); } catch (err) { finishMetric(req, 'failure'); throw err; }
  });
  app.get('/api/allowance', auth, async (req, res) => res.json({ allowance: await quota.allowance(req.session.i, new Date(now())) }));
  app.post('/api/chat', beginMetric('chat'), auth, async (req, res) => {
    const chat = validateChat(req.body); if (!chat) { finishMetric(req, 'rejected'); return res.status(400).json({ error: 'Invalid chat request.' }); }
    if (detectCrisis(chat.messages)) { try { const allowance = await quota.allowance(req.session.i, new Date(now())); finishMetric(req, 'success'); return res.json({ message: 'I’m really glad you told me. Please contact a trusted adult now. In the US or Canada, call or text 988 for immediate support.', charged: false, allowance }); } catch (err) { finishMetric(req, 'failure'); throw err; } }
    let reservation;
    const admissionStarted = metricNow();
    try {
      reservation = await quota.reserve(req.session.i, new Date(now()));
      stage(req, 'quota_admission', admissionStarted);
    } catch {
      stage(req, 'quota_admission', admissionStarted); finishMetric(req, 'failure');
      logOperationalFailure();
      return res.status(503).json({ error: 'AI is temporarily unavailable. Please try again later.', code: 'ai_unavailable' });
    }
    if (!reservation.ok) { finishMetric(req, 'rejected'); return res.status(429).json({ error: 'Your included AI allowance is currently used. Core Vibe Tutor features are still available.', allowance: reservation.allowance }); }
    let response;
    try {
      if (!provider) throw new Error('provider-unavailable');
      const providerStarted = metricNow();
      try {
        response = await provider(chat.chatType, chat.messages, (event) => { if (event.role === 'fallback') req.aiMetric.fallbackUsed = true; });
      } finally {
        stage(req, 'provider', providerStarted);
      }
    } catch {
      let allowance;
      try {
        const cleanupStarted = metricNow();
        try {
          await quota.release(req.session.i, reservation.reservation, new Date(now()));
          allowance = await quota.allowance(req.session.i, new Date(now()));
        } finally {
          stage(req, 'cleanup', cleanupStarted);
        }
      } catch { /* Preserve the controlled response when quota cleanup is unavailable. */ }
      finishMetric(req, 'failure');
      logOperationalFailure();
      return res.status(503).json({ error: 'AI is temporarily unavailable. Please try again later.', code: 'ai_unavailable', ...(allowance ? { allowance } : {}) });
    }
    // Deliver the model answer even when quota finalize contends. Releasing the
    // reservation avoids stuck pending counts that previously caused chat 503s.
    const finalizeStarted = metricNow();
    try {
      const allowance = await quota.finalize(req.session.i, reservation.reservation, new Date(now()));
      stage(req, 'quota_finalize', finalizeStarted);
      finishMetric(req, 'success', true);
      return res.json({ message: response.text, model: response.model, charged: true, allowance });
    } catch {
      stage(req, 'quota_finalize', finalizeStarted);
      let allowance;
      try {
        const cleanupStarted = metricNow();
        try {
          await quota.release(req.session.i, reservation.reservation, new Date(now()));
          allowance = await quota.allowance(req.session.i, new Date(now()));
        } finally {
          stage(req, 'cleanup', cleanupStarted);
        }
      } catch { /* Still return the answer; charging can fail closed. */ }
      finishMetric(req, 'success', false);
      return res.json({ message: response.text, model: response.model, charged: false, ...(allowance ? { allowance } : {}) });
    }
  });
  app.post('/api/safety/classify', beginMetric('safety'), auth, async (req, res) => {
    const text = req.body?.text;
    if (Object.keys(req.body ?? {}).length !== 1 || typeof text !== 'string' || text.length > 2000 || !isAmbiguousSafetyText(text)) {
      finishMetric(req, 'rejected'); return res.status(400).json({ error: 'Safety classification is only available for ambiguous safety text.' });
    }
    if (!safety || typeof quota.consumeSafetyAttempt !== 'function') {
      finishMetric(req, 'failure'); return res.status(503).json({ error: 'Safety classifier is unavailable.' });
    }
    let attempt; const admissionStarted = metricNow();
    try {
      attempt = await quota.consumeSafetyAttempt(req.session.i, new Date(now()));
      stage(req, 'quota_admission', admissionStarted);
    } catch {
      stage(req, 'quota_admission', admissionStarted);
      finishMetric(req, 'failure'); return res.status(503).json({ error: 'Safety classifier is unavailable.' });
    }
    if (attempt?.ok === false) {
      finishMetric(req, 'rejected'); return res.status(429).json({ error: 'Safety classifier allowance is currently used. Local support remains available.' });
    }
    if (attempt?.ok !== true) {
      finishMetric(req, 'failure'); return res.status(503).json({ error: 'Safety classifier is unavailable.' });
    }
    try {
      const providerStarted = metricNow(); let classification; try { classification = await safety(text, (event) => { if (event.role === 'fallback') req.aiMetric.fallbackUsed = true; }); } finally { stage(req, 'provider', providerStarted); }
      if (!['self-harm', 'abuse', 'none'].includes(classification)) throw new Error('invalid-safety-classification');
      finishMetric(req, 'success');
      return res.json({ classification, charged: false });
    } catch {
      finishMetric(req, 'failure');
      return res.status(503).json({ error: 'Safety classifier is unavailable.' });
    }
  });
  app.post('/api/reports', auth, async (req, res) => { const b = req.body; if (!b || typeof b !== 'object' || typeof b.category !== 'string' || b.category.length > 80 || typeof b.includeContent !== 'boolean' || (b.includeContent && (typeof b.content !== 'string' || !b.content.trim() || b.content.length > 6000)) || (!b.includeContent && Object.hasOwn(b, 'content'))) return res.status(400).json({ error: 'Invalid report.' }); if (!reports) return res.status(503).json({ error: 'Report storage is unavailable.' }); try { await reports({ installation: req.session.i, category: b.category, includeContent: b.includeContent, ...(b.includeContent ? { content: b.content, expiresAt: new Date(now() + 2592000000).toISOString() } : {}), createdAt: new Date(now()).toISOString() }); return res.status(202).json({ status: 'accepted' }); } catch { return res.status(503).json({ error: 'Report storage is unavailable.' }); } });
  app.get(['/privacy', '/privacy-legacy'], (_req, res) => res.type('html').send(policyHtml()));
  app.get('/api/health', (_req, res) => res.status(aiReady ? 200 : 503).json(
    aiReady ? { status: 'ready', ready: true } : { status: 'unavailable', ready: false },
  ));
  app.get('/', (_req, res) => res.status(aiReady ? 200 : 503).json(
    aiReady ? { status: 'ready', ready: true } : { status: 'unavailable', ready: false },
  ));
  app.use((_req, res) => res.status(404).json({ error: 'Not found.' })); return app;
}
if (process.argv[1]?.endsWith('server.mjs')) { const app = createApp(); app.listen(Number(process.env.PORT || 3001), logOperationalFailure); }
