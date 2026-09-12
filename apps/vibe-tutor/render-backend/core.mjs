import crypto from 'node:crypto';
export const MODELS = Object.freeze({
  primary: 'deepseek/deepseek-v4-flash-0731',
  fallback: 'google/gemini-3.7-flash',
});
export const LIMITS = Object.freeze({
  daily: 30,
  monthly: 200,
  messages: 30,
  messageChars: 6000,
  totalChars: 24000,
  outputTokens: 900,
  timeoutMs: 30000,
});
export const SAFETY_LIMITS = Object.freeze({ daily: 30, monthly: 200 });
const hash = (v) => crypto.createHash('sha256').update(v).digest('base64url');
export function requestHash(installationId, requestedAt) {
  return hash(JSON.stringify({ installationId, requestedAt }));
}
export function installationHmac(id, secret) { return crypto.createHmac('sha256', secret).update(id).digest('base64url'); }
export function validateChat(value) { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 2 || !['tutor', 'friend'].includes(value.chatType) || !Array.isArray(value.messages) || value.messages.length < 1 || value.messages.length > LIMITS.messages) return null; let size = 0; for (const message of value.messages) { if (!message || typeof message !== 'object' || Object.keys(message).length !== 2 || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || !message.content.trim() || message.content.length > LIMITS.messageChars) return null; size += message.content.length; } return size <= LIMITS.totalChars ? value : null; }
export function detectCrisis(messages) { return /\b(kill myself|suicide|end my life|hurt myself|self-harm)\b/i.test(messages.map((m) => m.content).join('\n')); }
export function isAmbiguousSafetyText(text) { return /\b(i want to disappear|no reason to live|hurt myself)\b/i.test(text); }
export function makeToken(payload, secret) { const body = Buffer.from(JSON.stringify(payload)).toString('base64url'); return `${body}.${crypto.createHmac('sha256', secret).update(body).digest('base64url')}`; }
export function verifyToken(token, secret, now = Date.now()) { try { const [body, signature] = String(token).split('.'); const expected = crypto.createHmac('sha256', secret).update(body).digest(); const actual = Buffer.from(signature, 'base64url'); if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null; const payload = JSON.parse(Buffer.from(body, 'base64url')); return typeof payload.i === 'string' && Number.isFinite(payload.iat) && Number.isFinite(payload.exp) && payload.exp > now ? payload : null; } catch { return null; } }
export function allowanceFrom(counts, now = new Date()) {
  const daily = counts.daily ?? 0;
  const monthly = counts.monthly ?? 0;
  return {
    daily: {
      used: daily,
      limit: LIMITS.daily,
      remaining: Math.max(0, LIMITS.daily - daily),
      resetAt: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
      ).toISOString(),
    },
    monthly: {
      used: monthly,
      limit: LIMITS.monthly,
      remaining: Math.max(0, LIMITS.monthly - monthly),
      resetAt: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
      ).toISOString(),
    },
  };
}
export class InMemoryQuotaStore {
  constructor() { this.days = new Map(); this.months = new Map(); this.reservations = new Map(); this.safetyDays = new Map(); this.safetyMonths = new Map(); }
  periods(id, now) { return { day: `${id}:d:${now.toISOString().slice(0, 10)}`, month: `${id}:m:${now.toISOString().slice(0, 7)}` }; }
  row(map, key) { if (!map.has(key)) map.set(key, { used: 0, pending: 0 }); return map.get(key); }
  async reserve(id, now = new Date()) {
    const p = this.periods(id, now);
    const day = this.row(this.days, p.day);
    const month = this.row(this.months, p.month);
    if (day.used + day.pending >= LIMITS.daily || month.used + month.pending >= LIMITS.monthly) {
      return {
        ok: false,
        allowance: allowanceFrom({ daily: day.used, monthly: month.used }, now),
      };
    }
    const reservation = crypto.randomUUID();
    day.pending++;
    month.pending++;
    this.reservations.set(reservation, p);
    return {
      ok: true,
      reservation,
      allowance: allowanceFrom({ daily: day.used, monthly: month.used }, now),
    };
  }
  async finalize(_id, reservation, now = new Date()) {
    const p = this.reservations.get(reservation);
    if (!p) return null;
    const day = this.row(this.days, p.day);
    const month = this.row(this.months, p.month);
    day.pending--;
    month.pending--;
    day.used++;
    month.used++;
    this.reservations.delete(reservation);
    return allowanceFrom({ daily: day.used, monthly: month.used }, now);
  }
  async release(_id, reservation) {
    const p = this.reservations.get(reservation);
    if (!p) return;
    this.row(this.days, p.day).pending--;
    this.row(this.months, p.month).pending--;
    this.reservations.delete(reservation);
  }
  async allowance(id, now = new Date()) {
    const p = this.periods(id, now);
    return allowanceFrom({
      daily: this.row(this.days, p.day).used,
      monthly: this.row(this.months, p.month).used,
    }, now);
  }
  async consumeSafetyAttempt(id, now = new Date()) {
    const p = this.periods(id, now);
    const day = this.row(this.safetyDays, p.day);
    const month = this.row(this.safetyMonths, p.month);
    if (day.used >= SAFETY_LIMITS.daily || month.used >= SAFETY_LIMITS.monthly) return { ok: false };
    day.used++;
    month.used++;
    return { ok: true };
  }
}
export const SYSTEM_PROMPTS = Object.freeze({ tutor: 'You are Tutor. Explain school concepts and guide problem-solving. For life, gaming, emotions, or social questions, warmly direct the teen to Buddy.', friend: 'You are Buddy. Discuss life, gaming, emotions, and social skills supportively. For schoolwork or academic problem-solving, warmly direct the teen to Tutor.' });
