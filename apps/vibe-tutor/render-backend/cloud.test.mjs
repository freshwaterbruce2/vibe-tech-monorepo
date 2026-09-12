import assert from 'node:assert/strict';
import test from 'node:test';
import { cloudRunTokenProvider, playIntegrityVerifier } from './cloud.mjs';

test('Cloud Run token provider caches service identity and Play verifier maps a valid verdict', async () => {
  let calls = 0; let metadataUrl; let metadataOptions; const access = cloudRunTokenProvider(async (url, options) => { calls++; metadataUrl = url; metadataOptions = options; return new Response(JSON.stringify({ access_token: 'access', expires_in: 3600 }), { status: 200 }); });
  assert.equal(await access(), 'access'); assert.equal(await access(), 'access'); assert.equal(calls, 1);
  assert.equal(metadataUrl, 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=https://www.googleapis.com/auth/playintegrity,https://www.googleapis.com/auth/cloud-platform');
  assert.equal(metadataOptions.headers['Metadata-Flavor'], 'Google');
  let requestBody; const verifier = playIntegrityVerifier({ accessToken: async () => 'access', fetchImpl: async (_url, options) => { requestBody = options.body; return new Response(JSON.stringify({ tokenPayloadExternal: { requestDetails: { requestHash: 'hash', requestPackageName: 'com.vibetech.tutor', timestampMillis: String(Date.now()) }, appIntegrity: { packageName: 'com.vibetech.tutor', versionCode: '10514', certificateSha256Digest: ['cert'], appRecognitionVerdict: 'PLAY_RECOGNIZED' }, accountDetails: { appLicensingVerdict: 'LICENSED' } } }), { status: 200 }); } });
  assert.equal((await verifier('token', 'hash')).license, 'LICENSED');
  assert.deepEqual(JSON.parse(requestBody), { integrityToken: 'token' });
});
test('Play verifier fails closed on upstream or request mismatch', async () => {
  const body = 'x'.repeat(301); const failed = playIntegrityVerifier({ accessToken: async () => 'access', fetchImpl: async () => new Response(body, { status: 503 }) });
  await assert.rejects(() => failed('token', 'hash'), (error) => error.message.startsWith('integrity-decode-failed') && error.message.includes('status=503') && error.message.endsWith(`body=${body.slice(0, 300)}`));
});
