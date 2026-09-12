import crypto from 'node:crypto';
import { LIMITS, SAFETY_LIMITS, allowanceFrom } from './core.mjs';

const QUOTA_FETCH_MS = 10000;
const QUOTA_TX_ATTEMPTS = 8;
const timeoutFetch = async (fetchImpl, url, options = {}, ms = QUOTA_FETCH_MS) => fetchImpl(url, { ...options, signal: AbortSignal.timeout(ms) });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const contentionBackoffMs = (attempt) => {
  // Keep the full retry budget well under the client chat read timeout.
  const base = Math.min(800, 40 * (2 ** attempt));
  return base + Math.floor(Math.random() * 40);
};
export function cloudRunTokenProvider(fetchImpl = fetch) {
  let cached;
  return async () => {
    if (cached && cached.exp > Date.now() + 60000) return cached.token;
    const response = await timeoutFetch(fetchImpl, 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=https://www.googleapis.com/auth/playintegrity,https://www.googleapis.com/auth/cloud-platform', { headers: { 'Metadata-Flavor': 'Google' } });
    if (!response.ok) throw new Error('service-identity-unavailable');
    const data = await response.json(); if (typeof data.access_token !== 'string' || !Number.isFinite(data.expires_in)) throw new Error('invalid-service-identity');
    cached = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 }; return cached.token;
  };
}
export function playIntegrityVerifier({ accessToken = cloudRunTokenProvider(), fetchImpl = fetch, packageName = 'com.vibetech.tutor' } = {}) {
  return async (integrityToken, requestHash) => {
    const token = await accessToken(); const response = await timeoutFetch(fetchImpl, `https://playintegrity.googleapis.com/v1/${packageName}:decodeIntegrityToken`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ integrityToken }) });
    if (!response.ok) throw new Error(`integrity-decode-failed status=${response.status} body=${(await response.text()).slice(0, 300)}`); const payload = (await response.json()).tokenPayloadExternal;
    const request = payload?.requestDetails; const app = payload?.appIntegrity; const account = payload?.accountDetails;
    if (request?.requestHash !== requestHash || request?.requestPackageName !== packageName || !Number.isFinite(Number(request?.timestampMillis)) || Math.abs(Date.now() - Number(request.timestampMillis)) > 300000) throw new Error('integrity-request-mismatch');
    return { packageName: app?.packageName, versionCode: Number(app?.versionCode), certificateDigest: app?.certificateSha256Digest?.[0], appRecognition: app?.appRecognitionVerdict, license: account?.appLicensingVerdict };
  };
}
const field = (value) => ({ integerValue: String(value) });
const ledger = (document) => ({ used: Number(document?.fields?.used?.integerValue ?? 0), pending: Number(document?.fields?.pending?.integerValue ?? 0) });
const writePrecondition = (existing) => {
  if (!existing) return { exists: false };
  if (typeof existing.updateTime !== 'string' || !existing.updateTime.trim()) throw new Error('quota-write-precondition-invalid-update-time');
  return { updateTime: existing.updateTime };
};
const ledgerWrite = (name, row, existing) => ({ update: { name, fields: { used: field(row.used), pending: field(row.pending) } }, updateMask: { fieldPaths: ['used', 'pending'] }, currentDocument: writePrecondition(existing) });
const safetyCount = (document) => {
  if (document === null) return 0;
  const value = document?.fields?.used?.integerValue;
  if (typeof value !== 'string' || value !== value.trim() || !/^(0|[1-9]\d*)$/.test(value)) throw new Error('safety-quota-invalid-count');
  const count = Number(value);
  if (!Number.isSafeInteger(count)) throw new Error('safety-quota-invalid-count');
  return count;
};
const safetyWrite = (name, used, existing) => ({ update: { name, fields: { used: field(used) } }, updateMask: { fieldPaths: ['used'] }, currentDocument: writePrecondition(existing) });
const reservationWrite = (name, data, existing) => ({ update: { name, fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, { stringValue: value }])) }, updateMask: { fieldPaths: ['day', 'month', 'owner'] }, currentDocument: writePrecondition(existing) });
export class FirestoreQuotaStore {
  constructor({ project, database = '(default)', accessToken = cloudRunTokenProvider(), fetchImpl = fetch }) { if (!project) throw new Error('GOOGLE_CLOUD_PROJECT is required'); this.base = `https://firestore.googleapis.com/v1/projects/${project}/databases/${database}`; this.docs = `projects/${project}/databases/${database}/documents`; this.accessToken = accessToken; this.fetch = fetchImpl; }
  key(id, period) { return crypto.createHash('sha256').update(`${id}:${period}`).digest('hex'); }
  names(id, now, reservation) { const day = now.toISOString().slice(0, 10); const month = now.toISOString().slice(0, 7); return { day: `${this.docs}/vibeTutorDaily/${this.key(id, `d:${day}`)}`, month: `${this.docs}/vibeTutorMonthly/${this.key(id, `m:${month}`)}`, reservation: reservation ? `${this.docs}/vibeTutorReservations/${reservation}` : null }; }
  safetyNames(id, now) { const day = now.toISOString().slice(0, 10); const month = now.toISOString().slice(0, 7); return { day: `${this.docs}/vibeTutorSafetyDaily/${this.key(id, `d:${day}`)}`, month: `${this.docs}/vibeTutorSafetyMonthly/${this.key(id, `m:${month}`)}` }; }
  async tx(names, mutate) {
    const token = await this.accessToken(); const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    for (let attempt = 0; attempt < QUOTA_TX_ATTEMPTS; attempt++) {
      const begun = await timeoutFetch(this.fetch, `${this.base}/documents:beginTransaction`, { method: 'POST', headers, body: '{}' });
      if (!begun.ok) throw new Error(`quota-transaction-unavailable status=${begun.status} body=${(await begun.text()).slice(0, 300)}`);
      const {transaction} = await begun.json();
      if (typeof transaction !== 'string' || !transaction.trim()) throw new Error('quota-transaction-invalid-token');
      let open = true; let cleanupAttempted = false;
      const rollback = async () => {
        cleanupAttempted = true;
        let response;
        try { response = await timeoutFetch(this.fetch, `${this.base}/documents:rollback`, { method: 'POST', headers, body: JSON.stringify({ transaction }) }); } catch { throw new Error('quota-rollback-failed'); }
        if (!response.ok) throw new Error(`quota-rollback-failed status=${response.status}`);
        open = false;
      };
      const preservePrimary = async () => {
        if (!open || cleanupAttempted) return;
        try { await rollback(); } catch { console.error('quota-rollback-failed primary-preserved'); open = false; }
      };
      try {
        const read = await timeoutFetch(this.fetch, `${this.base}/documents:batchGet`, { method: 'POST', headers, body: JSON.stringify({ documents: names, transaction }) });
        if (!read.ok) throw new Error(`quota-read-failed status=${read.status} body=${(await read.text()).slice(0, 300)}`);
        const raw = (await read.text()).trim(); let items;
        try { if (!raw) throw new Error('empty batchGet response'); items = raw.startsWith('[') ? JSON.parse(raw) : raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)); if (!Array.isArray(items)) throw new Error('batchGet response was not an array'); } catch { throw new Error(`quota-read-parse-failed preview=${JSON.stringify(raw.slice(0, 120))}`); }
        const records = new Map();
        try { for (const item of items) { if (typeof item?.found?.name === 'string') records.set(item.found.name, item.found); else if (typeof item?.missing === 'string') records.set(item.missing, null); else throw new Error('invalid batchGet item'); } } catch { throw new Error(`quota-read-parse-failed preview=${JSON.stringify(raw.slice(0, 120))}`); }
        const outcome = mutate(records);
        if (!outcome?.writes) { await rollback(); return outcome?.result ?? null; }
        const commit = await timeoutFetch(this.fetch, `${this.base}/documents:commit`, { method: 'POST', headers, body: JSON.stringify({ transaction, writes: outcome.writes }) });
        if (commit.ok) { open = false; return outcome.result; }
        const body = (await commit.text()).slice(0, 300); const error = new Error(`quota-commit-failed status=${commit.status} body=${body}`);
        console.error(`quota-commit-failed status=${commit.status}`);
        if (![409, 412].includes(commit.status)) throw error;
        // A failed commit already ends the transaction. Best-effort rollback, then retry
        // with backoff — do not abort the whole chat on a rollback race after 409/412.
        try { await rollback(); } catch { console.error('quota-rollback-failed primary-preserved'); open = false; }
        if (attempt + 1 < QUOTA_TX_ATTEMPTS) await sleep(contentionBackoffMs(attempt));
        continue;
      } catch (error) { await preservePrimary(); throw error; }
    }
    throw new Error('quota-contention');
  }
  async reserve(id, now = new Date()) { const reservation = crypto.randomUUID(); const names = this.names(id, now, reservation); const result = await this.tx([names.day, names.month, names.reservation], (records) => { const day = ledger(records.get(names.day)); const month = ledger(records.get(names.month)); if (day.used + day.pending >= LIMITS.daily || month.used + month.pending >= LIMITS.monthly) return { result: null }; day.pending++; month.pending++; return { writes: [ledgerWrite(names.day, day, records.get(names.day)), ledgerWrite(names.month, month, records.get(names.month)), reservationWrite(names.reservation, { day: names.day, month: names.month, owner: id }, records.get(names.reservation))], result: { ok: true, reservation, allowance: allowanceFrom({ daily: day.used, monthly: month.used }, now) } }; }); return result ?? { ok: false, allowance: await this.allowance(id, now) }; }
  async finalize(id, reservation, now = new Date()) { const current = this.names(id, now, reservation); const result = await this.tx([current.reservation], (records) => { const record = records.get(current.reservation); if (!record || record.fields.owner?.stringValue !== id) return { result: null }; return { result: { follow: [record.fields.day.stringValue, record.fields.month.stringValue] } }; }); if (!result?.follow) return null; return this.tx([result.follow[0], result.follow[1], current.reservation], (records) => { const record = records.get(current.reservation); if (!record || record.fields.owner?.stringValue !== id) return { result: null }; const day = ledger(records.get(result.follow[0])); const month = ledger(records.get(result.follow[1])); day.pending--; month.pending--; day.used++; month.used++; return { writes: [ledgerWrite(result.follow[0], day, records.get(result.follow[0])), ledgerWrite(result.follow[1], month, records.get(result.follow[1])), { delete: current.reservation }], result: allowanceFrom({ daily: day.used, monthly: month.used }, now) }; }); }
  async release(id, reservation, now = new Date()) { const current = this.names(id, now, reservation); const lookup = await this.tx([current.reservation], (records) => ({ result: records.get(current.reservation) })); if (!lookup || lookup.fields.owner?.stringValue !== id) return; const dayName = lookup.fields.day.stringValue; const monthName = lookup.fields.month.stringValue; await this.tx([dayName, monthName, current.reservation], (records) => { const record = records.get(current.reservation); if (!record || record.fields.owner?.stringValue !== id) return { result: null }; const day = ledger(records.get(dayName)); const month = ledger(records.get(monthName)); day.pending--; month.pending--; return { writes: [ledgerWrite(dayName, day, records.get(dayName)), ledgerWrite(monthName, month, records.get(monthName)), { delete: current.reservation }], result: true }; }); }
  async allowance(id, now = new Date()) { const names = this.names(id, now); return this.tx([names.day, names.month], (records) => ({ result: allowanceFrom({ daily: ledger(records.get(names.day)).used, monthly: ledger(records.get(names.month)).used }, now) })); }
  async consumeSafetyAttempt(id, now = new Date()) {
    const names = this.safetyNames(id, now);
    return this.tx([names.day, names.month], (records) => {
      if (!records.has(names.day) || !records.has(names.month)) throw new Error('safety-quota-incomplete-read');
      const day = safetyCount(records.get(names.day));
      const month = safetyCount(records.get(names.month));
      if (day >= SAFETY_LIMITS.daily || month >= SAFETY_LIMITS.monthly) return { result: { ok: false } };
      return { writes: [safetyWrite(names.day, day + 1, records.get(names.day)), safetyWrite(names.month, month + 1, records.get(names.month))], result: { ok: true } };
    });
  }
}
export function firestoreReportSink({ project, database = '(default)', accessToken = cloudRunTokenProvider(), fetchImpl = fetch }) {
  if (!project) throw new Error('GOOGLE_CLOUD_PROJECT is required');
  const endpoint = `https://firestore.googleapis.com/v1/projects/${project}/databases/${database}/documents/vibeTutorReports`;
  return async (report) => {
    const token = await accessToken();
    const fields = { installation: { stringValue: report.installation }, category: { stringValue: report.category }, includeContent: { booleanValue: report.includeContent }, createdAt: { timestampValue: report.createdAt } };
    if (report.includeContent) { fields.content = { stringValue: report.content }; fields.expiresAt = { timestampValue: report.expiresAt }; }
    const response = await timeoutFetch(fetchImpl, endpoint, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ fields }) });
    if (!response.ok) throw new Error('report-storage-failed');
  };
}
