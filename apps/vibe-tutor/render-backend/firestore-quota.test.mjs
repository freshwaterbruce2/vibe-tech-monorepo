import assert from 'node:assert/strict';
import test from 'node:test';
import { FirestoreQuotaStore } from './cloud.mjs';

function firestoreMock({ conflictOnce = false, beginStatus, readStatus, commitStatus, rollbackStatus, omitLastRead = false, malformedRead = false, readThrows = false, readBodyThrows = false, commitThrows = false, commitAppliesThenThrows = false, pessimisticLocks = false } = {}) {
  const docs = new Map(); const calls = []; const transactionReads = new Map(); const locks = new Map(); let conflict = conflictOnce; let transactionNumber = 0; let revision = 0;
  const close = (transaction) => { for (const [name, holders] of locks) { holders.delete(transaction); if (!holders.size) locks.delete(name); } transactionReads.delete(transaction); };
  const fetchImpl = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : undefined; calls.push({ url, body, method: options.method ?? 'GET' });
    if (url.endsWith(':beginTransaction')) { if (beginStatus) return new Response('', { status: beginStatus }); const transaction = `tx-${++transactionNumber}`; transactionReads.set(transaction, new Map()); return new Response(JSON.stringify({ transaction }), { status: 200 }); }
    if (url.endsWith(':batchGet')) { if (readThrows) throw new Error('read-network-failure'); if (readStatus) return new Response('', { status: readStatus }); const reads = transactionReads.get(body.transaction); assert.ok(reads); for (const name of body.documents) { reads.set(name, docs.get(name)?.updateTime ?? null); if (pessimisticLocks) (locks.get(name) ?? locks.set(name, new Set()).get(name)).add(body.transaction); } const documents = omitLastRead ? body.documents.slice(0, -1) : body.documents; if (readBodyThrows) return { ok: true, text: async () => { throw new Error('read-body-failure'); } }; if (malformedRead) return new Response('{', { status: 200 }); return new Response(documents.map((name) => docs.has(name) ? JSON.stringify({ found: docs.get(name) }) : JSON.stringify({ missing: name })).join('\n'), { status: 200 }); }
    if (url.endsWith(':rollback')) { if (rollbackStatus) return new Response('', { status: rollbackStatus }); close(body.transaction); return new Response('{}', { status: 200 }); }
    if (url.endsWith(':commit')) { assert.ok(transactionReads.has(body.transaction)); assert.ok(Array.isArray(body.writes)); if (commitThrows) throw new Error('commit-network-failure'); if (commitStatus) return new Response('', { status: commitStatus }); if (conflict) { conflict = false; return new Response('', { status: 412 }); } for (const [name] of transactionReads.get(body.transaction)) if (pessimisticLocks && [...locks.get(name)].some((holder) => holder !== body.transaction)) return new Response('', { status: 409 }); for (const [name, updateTime] of transactionReads.get(body.transaction)) if ((docs.get(name)?.updateTime ?? null) !== updateTime) return new Response('', { status: 412 }); for (const write of body.writes) { if (write.delete) docs.delete(write.delete); else { assert.ok(write.update?.name); assert.ok(write.currentDocument); docs.set(write.update.name, { ...write.update, updateTime: `t${++revision}` }); } } close(body.transaction); if (commitAppliesThenThrows) throw new Error('commit-response-lost'); return new Response('{}', { status: 200 }); }
    throw new Error(`Unexpected REST URL ${url}`);
  };
  return { docs, calls, fetchImpl, locks };
}
test('Firestore transaction has exact begin/batchGet/commit shapes and 30/31 daily boundary', async () => {
  const mock = firestoreMock({ conflictOnce: true }); const store = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: mock.fetchImpl }); const now = new Date('2026-08-23T12:00:00Z'); const held = [];
  for (let i = 0; i < 30; i++) { const result = await store.reserve('id', now); assert.equal(result.ok, true); held.push(result); }
  assert.equal((await store.reserve('id', now)).ok, false); await store.release('id', held.pop().reservation, now); assert.equal((await store.reserve('id', now)).ok, true);
  assert.ok(mock.calls.some((call) => call.url.endsWith(':beginTransaction'))); const batch = mock.calls.find((call) => call.url.endsWith(':batchGet')); assert.match(batch.body.transaction, /^tx-\d+$/); const commit = mock.calls.find((call) => call.url.endsWith(':commit')); assert.match(commit.body.transaction, /^tx-\d+$/); assert.ok(commit.body.writes.some((write) => write.currentDocument?.exists === false));
});
test('Firestore monthly ledger survives days, enforces 200/201, finalizes once, and rolls UTC month', async () => {
  const mock = firestoreMock(); const store = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: mock.fetchImpl }); const id = 'id'; let last;
  for (let i = 0; i < 200; i++) { const at = new Date(Date.UTC(2026, 7, 1 + Math.floor(i / 30), 12)); const r = await store.reserve(id, at); assert.equal(r.ok, true); last = r; assert.ok(await store.finalize(id, r.reservation, at)); }
  assert.equal((await store.reserve(id, new Date('2026-08-28T12:00:00Z'))).ok, false); assert.equal(await store.finalize(id, last.reservation, new Date('2026-08-28T12:00:00Z')), null); assert.equal((await store.reserve(id, new Date('2026-09-01T00:00:00Z'))).ok, true);
  assert.ok(mock.calls.some((call) => call.url.endsWith(':commit') && call.body.writes.some((write) => write.delete?.includes('vibeTutorReservations'))));
});
test('Firestore reservations are owner-bound and duplicate finalization is fail-closed', async () => {
  const mock = firestoreMock(); const store = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: mock.fetchImpl }); const now = new Date('2026-08-23T12:00:00Z');
  const held = await store.reserve('owner-a', now); assert.equal(held.ok, true);
  assert.equal(await store.finalize('owner-b', held.reservation, now), null);
  await store.release('owner-b', held.reservation, now);
  assert.equal((await store.allowance('owner-a', now)).daily.used, 0);
  const [first, second] = await Promise.all([store.finalize('owner-a', held.reservation, now), store.finalize('owner-a', held.reservation, now)]);
  assert.equal([first, second].filter(Boolean).length, 1);
  assert.equal((await store.allowance('owner-a', now)).daily.used, 1);
});

test('Firestore safety attempts use isolated strict counters and atomically reject concurrent excess', async () => {
  const mock = firestoreMock(); const store = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: mock.fetchImpl }); const now = new Date('2026-08-23T12:00:00Z');
  for (let index = 0; index < 29; index += 1) assert.equal((await store.consumeSafetyAttempt('id', now)).ok, true);
  const recreated = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: mock.fetchImpl });
  const results = await Promise.all([store.consumeSafetyAttempt('id', now), recreated.consumeSafetyAttempt('id', now), store.consumeSafetyAttempt('id', now)]);
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(results.filter((result) => !result.ok).length, 2);
  assert.equal((await store.reserve('id', now)).ok, true);
  assert.ok([...mock.docs.keys()].some((name) => name.includes('vibeTutorSafetyDaily')));
  assert.ok([...mock.docs.keys()].some((name) => name.includes('vibeTutorSafetyMonthly')));
  assert.ok([...mock.docs.keys()].some((name) => name.includes('vibeTutorDaily')));
  const safetyName = [...mock.docs.keys()].find((name) => name.includes('vibeTutorSafetyDaily'));
  mock.docs.set(safetyName, { ...mock.docs.get(safetyName), fields: { used: { integerValue: '-1' } } });
  await assert.rejects(() => store.consumeSafetyAttempt('id', now), /safety-quota-invalid-count/);
});

test('Firestore safety attempts retain UTC monthly counts, reset periods, and isolate installations', async () => {
  const mock = firestoreMock(); const first = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: mock.fetchImpl }); const second = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: mock.fetchImpl });
  for (let index = 0; index < 200; index += 1) {
    const at = new Date(Date.UTC(2026, 7, 1 + Math.floor(index / 30), 12));
    assert.equal((await first.consumeSafetyAttempt('installation-a', at)).ok, true);
  }
  assert.equal((await second.consumeSafetyAttempt('installation-a', new Date('2026-08-28T12:00:00Z'))).ok, false);
  assert.equal((await second.consumeSafetyAttempt('installation-b', new Date('2026-08-28T12:00:00Z'))).ok, true);
  assert.equal((await second.consumeSafetyAttempt('installation-a', new Date('2026-09-01T00:00:00Z'))).ok, true);
});

test('Firestore safety attempts reject malformed reads and permanent transaction failures', async () => {
  const now = new Date('2026-08-23T12:00:00Z');
  for (const options of [{ beginStatus: 503 }, { readStatus: 503 }, { commitStatus: 503 }, { omitLastRead: true }]) {
    const mock = firestoreMock(options); const store = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: mock.fetchImpl });
    await assert.rejects(() => store.consumeSafetyAttempt('id', now));
  }
  for (const value of [undefined, null, 1, '-1', '1.5', '9007199254740992', ' 1', '1\n', '01']) {
    const mock = firestoreMock(); const store = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: mock.fetchImpl }); const names = store.safetyNames('id', now);
    mock.docs.set(names.day, { name: names.day, fields: value === undefined ? {} : { used: { integerValue: value } }, updateTime: 'existing' });
    await assert.rejects(() => store.consumeSafetyAttempt('id', now), /safety-quota-invalid-count/);
  }
});

test('Firestore safety attempts retry a conflict without duplicating the attempted charge', async () => {
  const mock = firestoreMock({ conflictOnce: true }); const store = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: mock.fetchImpl }); const now = new Date('2026-08-23T12:00:00Z');
  assert.equal((await store.consumeSafetyAttempt('id', now)).ok, true);
  const day = [...mock.docs.values()].find((document) => document.name.includes('vibeTutorSafetyDaily'));
  assert.equal(day.fields.used.integerValue, '1');
});

test('Firestore releases read-only transaction locks before the following reservation', async () => {
  const mock = firestoreMock({ pessimisticLocks: true }); const store = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: mock.fetchImpl }); const now = new Date('2026-08-23T12:00:00Z');
  await store.allowance('id', now);
  assert.equal((await store.reserve('id', now)).ok, true);
  assert.equal(mock.locks.size, 0);
  assert.equal(mock.calls.filter((call) => call.url.endsWith(':rollback')).length, 1);
});

test('Firestore retries commit contention after a failed rollback without aborting early', async () => {
  let commits = 0;
  let rollbacks = 0;
  const docs = new Map();
  let revision = 0;
  let transactionNumber = 0;
  const transactionReads = new Map();
  const fetchImpl = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : undefined;
    if (url.endsWith(':beginTransaction')) {
      const transaction = `tx-${++transactionNumber}`;
      transactionReads.set(transaction, new Map());
      return new Response(JSON.stringify({ transaction }), { status: 200 });
    }
    if (url.endsWith(':batchGet')) {
      const reads = transactionReads.get(body.transaction);
      for (const name of body.documents) reads.set(name, docs.get(name)?.updateTime ?? null);
      return new Response(body.documents.map((name) => docs.has(name) ? JSON.stringify({ found: docs.get(name) }) : JSON.stringify({ missing: name })).join('\n'), { status: 200 });
    }
    if (url.endsWith(':rollback')) {
      rollbacks += 1;
      if (rollbacks === 1) return new Response('', { status: 400 });
      transactionReads.delete(body.transaction);
      return new Response('{}', { status: 200 });
    }
    if (url.endsWith(':commit')) {
      commits += 1;
      if (commits === 1) return new Response(JSON.stringify({ error: { code: 409, message: 'Too much contention on these documents. Please try again.', status: 'ABORTED' } }), { status: 409 });
      for (const write of body.writes) {
        if (write.delete) docs.delete(write.delete);
        else docs.set(write.update.name, { ...write.update, updateTime: `t${++revision}` });
      }
      transactionReads.delete(body.transaction);
      return new Response('{}', { status: 200 });
    }
    throw new Error(`Unexpected REST URL ${url}`);
  };
  const store = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl });
  const result = await store.reserve('id', new Date('2026-08-23T12:00:00Z'));
  assert.equal(result.ok, true);
  assert.equal(commits, 2);
  assert.ok(rollbacks >= 1);
});

test('Firestore cleans up every known uncommitted transaction and preserves the primary failure', async () => {
  const now = new Date('2026-08-23T12:00:00Z');
  for (const [options, action, expected] of [
    [{ readStatus: 503 }, (store) => store.allowance('id', now), /quota-read-failed/],
    [{ readThrows: true }, (store) => store.allowance('id', now), /read-network-failure/],
    [{ readBodyThrows: true }, (store) => store.allowance('id', now), /read-body-failure/],
    [{ malformedRead: true }, (store) => store.allowance('id', now), /quota-read-parse-failed/],
    [{ commitStatus: 503 }, (store) => store.reserve('id', now), /quota-commit-failed/],
  ]) {
    const mock = firestoreMock(options); const store = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: mock.fetchImpl });
    await assert.rejects(() => action(store), expected);
    assert.equal(mock.calls.filter((call) => call.url.endsWith(':rollback')).length, 1);
  }
  const mutate = firestoreMock(); const mutatingStore = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: mutate.fetchImpl });
  await assert.rejects(() => mutatingStore.tx(['doc'], () => { throw new Error('mutate-failed'); }), /mutate-failed/);
  assert.equal(mutate.calls.filter((call) => call.url.endsWith(':rollback')).length, 1);
  const cleanupFails = firestoreMock({ readStatus: 503, rollbackStatus: 503 }); const failingStore = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: cleanupFails.fetchImpl });
  await assert.rejects(() => failingStore.allowance('id', now), /quota-read-failed/);
  const noWriteCleanupFails = firestoreMock({ rollbackStatus: 503 }); const noWriteStore = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: noWriteCleanupFails.fetchImpl });
  await assert.rejects(() => noWriteStore.allowance('id', now), /quota-rollback-failed/);
  assert.equal(noWriteCleanupFails.calls.filter((call) => call.url.endsWith(':rollback')).length, 1);
});

test('Firestore validates a begun transaction token before reading', async () => {
  for (const token of [undefined, null, 1, '', '   ']) {
    const calls = []; const store = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: async (url) => { calls.push(url); return new Response(JSON.stringify({ transaction: token }), { status: 200 }); } });
    await assert.rejects(() => store.allowance('id', new Date('2026-08-23T12:00:00Z')), /quota-transaction-invalid-token/);
    assert.equal(calls.filter((url) => url.endsWith(':batchGet')).length, 0);
  }
});

test('Firestore retries only confirmed conflicts, rejects ambiguous commit failure, and never rolls back a committed write', async () => {
  const now = new Date('2026-08-23T12:00:00Z');
  const conflict = firestoreMock({ conflictOnce: true }); const retryingStore = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: conflict.fetchImpl });
  assert.equal((await retryingStore.reserve('id', now)).ok, true);
  assert.equal(conflict.calls.filter((call) => call.url.endsWith(':rollback')).length, 1);
  const ambiguous = firestoreMock({ commitThrows: true }); const ambiguousStore = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: ambiguous.fetchImpl });
  await assert.rejects(() => ambiguousStore.reserve('id', now), /commit-network-failure/);
  assert.equal(ambiguous.calls.filter((call) => call.url.endsWith(':commit')).length, 1);
  assert.equal(ambiguous.calls.filter((call) => call.url.endsWith(':rollback')).length, 1);
  const committed = firestoreMock(); const committedStore = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: committed.fetchImpl });
  assert.equal((await committedStore.reserve('id', now)).ok, true);
  assert.equal(committed.calls.filter((call) => call.url.endsWith(':rollback')).length, 0);
  const applied = firestoreMock({ commitAppliesThenThrows: true }); const appliedStore = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: applied.fetchImpl });
  await assert.rejects(() => appliedStore.reserve('id', now), /commit-response-lost/);
  assert.equal(applied.calls.filter((call) => call.url.endsWith(':commit')).length, 1);
  assert.equal(applied.calls.filter((call) => call.url.endsWith(':rollback')).length, 1);
  assert.equal([...applied.docs.values()].filter((document) => document.name.includes('vibeTutorReservations')).length, 1);
});

test('Firestore bounds persistent confirmed conflicts and keeps retrying after conflict cleanup fails', async () => {
  const now = new Date('2026-08-23T12:00:00Z');
  for (const status of [409, 412]) {
    const mock = firestoreMock({ commitStatus: status }); const store = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: mock.fetchImpl });
    await assert.rejects(() => store.reserve('id', now), /quota-contention/);
    for (const endpoint of [':beginTransaction', ':commit', ':rollback']) assert.equal(mock.calls.filter((call) => call.url.endsWith(endpoint)).length, 8);
  }
  const cleanupFailure = firestoreMock({ commitStatus: 409, rollbackStatus: 503 }); const store = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: cleanupFailure.fetchImpl });
  await assert.rejects(() => store.reserve('id', now), /quota-contention/);
  for (const endpoint of [':beginTransaction', ':commit', ':rollback']) assert.equal(cleanupFailure.calls.filter((call) => call.url.endsWith(endpoint)).length, 8);
});

test('Firestore closes lookup, denial, owner-rejection, and safety-exhaustion reads before their next operation', async () => {
  const mock = firestoreMock({ pessimisticLocks: true }); const store = new FirestoreQuotaStore({ project: 'project', accessToken: async () => 'token', fetchImpl: mock.fetchImpl }); const now = new Date('2026-08-23T12:00:00Z');
  const held = await store.reserve('owner', now);
  assert.equal(await store.finalize('other', held.reservation, now), null);
  await store.release('other', held.reservation, now);
  assert.ok(await store.finalize('owner', held.reservation, now));
  const released = await store.reserve('owner', now);
  await store.release('owner', released.reservation, now);
  for (let index = 0; index < 28; index += 1) assert.equal((await store.reserve('denied', now)).ok, true);
  assert.equal((await store.reserve('denied', now)).ok, true);
  assert.equal((await store.reserve('denied', now)).ok, true);
  assert.equal((await store.reserve('denied', now)).ok, false);
  for (let index = 0; index < 30; index += 1) assert.equal((await store.consumeSafetyAttempt('safe', now)).ok, true);
  assert.equal((await store.consumeSafetyAttempt('safe', now)).ok, false);
  assert.equal(mock.locks.size, 0);
});
