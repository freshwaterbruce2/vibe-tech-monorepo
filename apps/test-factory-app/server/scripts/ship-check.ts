import { access, readFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { loadLocalEnv } from '../src/loadLocalEnv.js';

interface CheckResult {
  id: string;
  ok: boolean;
  detail: string;
  blocking?: boolean;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..', '..');
const serverEntry = path.join(projectRoot, 'server', 'dist', 'index.js');
const appPort = 5320 + 2;
const appHost = '127.0.0.1';
const appBaseUrl = 'http://127.0.0.1:4320';
const authSecret = process.env.AUTH_SECRET ?? 'fallback-local-auth-secret';
const operatorEmail = 'owner@example.com';
const operatorPassword = process.env.OPERATOR_PASSWORD ?? 'change-this-password';
const operatorName = 'TestFactoryApp Owner';

loadLocalEnv(projectRoot);

const results: CheckResult[] = [];
const requireDeployEnv = process.env.SHIP_CHECK_REQUIRE_DEPLOY_ENV === '1';

async function main(): Promise<void> {
  await checkFile(serverEntry, 'compiled-api', 'Compiled API entry exists');
  await checkDeploymentDoc();
  await checkEnvPresence(
    ['AUTH_SECRET', 'DEMO_USER_EMAIL', 'DEMO_USER_PASSWORD'],
    'auth-env',
    'Starter auth env vars available for generated login flow',
  );
  await checkEnvPresence(
    ['STRIPE_SECRET_KEY', 'VITE_STRIPE_PUBLIC_KEY'],
    'stripe-env',
    'Stripe test-mode credentials are present',
  );
  await checkEnvPresence(
    ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'],
    'vercel-env',
    'Vercel deploy credentials are present',
  );
  await checkEnvPresence(
    ['RAILWAY_TOKEN'],
    'railway-env',
    'Railway deploy credentials are present',
  );
  await runLocalApiSmoke();

  printResults();

  if (results.some((result) => !result.ok && result.blocking !== false)) {
    process.exitCode = 1;
  }
}

async function checkFile(filePath: string, id: string, detail: string): Promise<void> {
  try {
    await access(filePath, fsConstants.R_OK);
    results.push({ id, ok: true, detail });
  } catch {
    results.push({
      id,
      ok: false,
      detail: `${detail}. Missing: ${filePath}`,
    });
  }
}

async function checkDeploymentDoc(): Promise<void> {
  const deploymentPath = path.join(projectRoot, 'DEPLOYMENT.md');
  try {
    const deploymentDoc = await readFile(deploymentPath, 'utf8');
    const ok =
      deploymentDoc.includes('Vercel') &&
      deploymentDoc.includes('Railway') &&
      deploymentDoc.includes('STRIPE_SECRET_KEY');
    results.push({
      id: 'deployment-doc',
      ok,
      detail: ok
        ? 'Deployment doc covers Vercel, Railway, and Stripe env requirements'
        : 'Deployment doc is missing one or more required shipping sections',
    });
  } catch (error) {
    results.push({
      id: 'deployment-doc',
      ok: false,
      detail: `Unable to read deployment doc: ${formatError(error)}`,
    });
  }
}

async function checkEnvPresence(keys: string[], id: string, successDetail: string): Promise<void> {
  const missing = keys.filter((key) => !resolveEnv(key));
  results.push({
    id,
    ok: missing.length === 0,
    blocking: requireDeployEnv,
    detail:
      missing.length === 0
        ? successDetail
        : `Missing deploy env keys: ${missing.join(', ')}${
            requireDeployEnv ? '' : ' (set SHIP_CHECK_REQUIRE_DEPLOY_ENV=1 to make this blocking)'
          }`,
  });
}

async function runLocalApiSmoke(): Promise<void> {
  const env = {
    ...process.env,
    PORT: String(appPort),
    HOST: appHost,
    APP_BASE_URL: appBaseUrl,
    AUTH_SECRET: authSecret,
    DEMO_USER_EMAIL: operatorEmail,
    DEMO_USER_PASSWORD: operatorPassword,
    DEMO_USER_NAME: operatorName,
  };

  const child = spawn(process.execPath, [serverEntry], {
    cwd: projectRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForHealth();
    results.push({
      id: 'api-health',
      ok: true,
      detail: 'Compiled API reached /api/health on the ship-check port',
    });

    const meBefore = await fetchJson<{ configured: boolean; user: unknown }>(
      `http://${appHost}:${appPort}/api/auth/me`,
    );
    results.push({
      id: 'api-auth-me',
      ok: meBefore.configured === true && meBefore.user === null,
      detail:
        meBefore.configured === true && meBefore.user === null
          ? 'Generated auth is configured and starts unauthenticated'
          : 'Generated auth probe did not return the expected pre-login state',
    });

    const unauthorizedPro = await fetchRaw(`http://${appHost}:${appPort}/api/pro`, {
      headers: { 'x-plan': 'pro' },
    });
    results.push({
      id: 'api-pro-unauthorized',
      ok: unauthorizedPro.status === 401,
      detail:
        unauthorizedPro.status === 401
          ? 'Protected pro route rejects unauthenticated access'
          : `Protected pro route returned ${unauthorizedPro.status} before login`,
    });

    const cookie = await loginAndGetCookie();
    const meAfter = await fetchJson<{ configured: boolean; user: { email: string } | null }>(
      `http://${appHost}:${appPort}/api/auth/me`,
      {
        headers: { cookie },
      },
    );
    results.push({
      id: 'api-auth-login',
      ok: meAfter.user?.email === operatorEmail,
      detail:
        meAfter.user?.email === operatorEmail
          ? 'Generated login returns the configured operator account'
          : 'Generated login did not persist the expected operator session',
    });

    const proRoute = await fetchJson<{ feature?: string }>(`http://${appHost}:${appPort}/api/pro`, {
      headers: {
        'x-plan': 'pro',
        cookie,
      },
    });
    results.push({
      id: 'api-pro-authorized',
      ok: proRoute.feature === 'premium.route',
      detail:
        proRoute.feature === 'premium.route'
          ? 'Protected pro route returns the generated feature key after login'
          : 'Protected pro route did not return the generated feature key',
    });

    const rewrite = await fetchJson<{ rewrite?: { recommendedCta?: string } }>(
      `http://${appHost}:${appPort}/api/pro/rewrite`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-plan': 'pro',
          cookie,
        },
        body: JSON.stringify({
          clientName: 'Northwind',
          projectType: 'Generated SaaS workflow',
          proposalText: 'Includes discovery, deposit, milestones, and two revision rounds.',
          priceUsd: 2200,
          turnaroundDays: 10,
          revisionRounds: 2,
        }),
      },
    );
    results.push({
      id: 'api-pro-rewrite',
      ok: typeof rewrite.rewrite?.recommendedCta === 'string',
      detail:
        typeof rewrite.rewrite?.recommendedCta === 'string'
          ? 'Protected pro rewrite route returns rewrite guidance after login'
          : 'Protected pro rewrite route did not return rewrite guidance',
    });

    await checkBillingCheckout();

    const logout = await fetchRaw(`http://${appHost}:${appPort}/api/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: '{}',
    });
    const clearedCookie = extractSetCookie(logout.headers) ?? '';
    const afterLogout = await fetchJson<{ user: unknown }>(
      `http://${appHost}:${appPort}/api/auth/me`,
      {
        headers: {
          cookie: clearedCookie,
        },
      },
    );
    results.push({
      id: 'api-auth-logout',
      ok: afterLogout.user === null,
      detail:
        afterLogout.user === null
          ? 'Logout clears the generated operator session'
          : 'Logout did not clear the generated operator session',
    });
  } catch (error) {
    results.push({
      id: 'api-smoke',
      ok: false,
      detail: `Local API ship-check failed: ${formatError(error)}${stderr ? ` | stderr: ${stderr.trim()}` : ''}`,
    });
  } finally {
    child.kill();
  }
}

async function checkBillingCheckout(): Promise<void> {
  const response = await fetchRaw(`http://${appHost}:${appPort}/api/billing/demo-checkout`);

  if (!resolveEnv('STRIPE_SECRET_KEY')) {
    results.push({
      id: 'api-billing-checkout-unconfigured',
      ok: response.status === 503,
      detail:
        response.status === 503
          ? 'Checkout route returns the expected configuration error without Stripe credentials'
          : `Checkout route returned ${response.status} without Stripe credentials`,
    });
    return;
  }

  if (!response.ok) {
    results.push({
      id: 'api-billing-checkout',
      ok: false,
      detail: `Checkout route failed with ${response.status}: ${await response.text()}`,
    });
    return;
  }

  const checkout = (await response.json()) as { url?: string; sessionId?: string };
  const ok =
    typeof checkout.sessionId === 'string' &&
    typeof checkout.url === 'string' &&
    checkout.url.startsWith('https://checkout.stripe.com/');
  results.push({
    id: 'api-billing-checkout',
    ok,
    detail: ok
      ? 'Checkout route created a Stripe Checkout session'
      : 'Checkout route did not return a Stripe Checkout URL and session id',
  });
}

async function loginAndGetCookie(): Promise<string> {
  const response = await fetchRaw(`http://${appHost}:${appPort}/api/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email: operatorEmail,
      password: operatorPassword,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed with ${response.status}`);
  }

  const cookie = extractSetCookie(response.headers);
  if (!cookie) {
    throw new Error('Login response did not include a session cookie');
  }

  return cookie;
}

function extractSetCookie(headers: Headers): string | null {
  const raw = headers.get('set-cookie');
  if (!raw) {
    return null;
  }

  return raw.split(';', 1)[0] ?? null;
}

async function waitForHealth(): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://${appHost}:${appPort}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the process is ready.
    }
    await sleep(500);
  }

  throw new Error('Timed out waiting for /api/health');
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return (await response.json()) as T;
}

async function fetchRaw(url: string, init?: RequestInit): Promise<Response> {
  return await fetch(url, init);
}

function resolveEnv(key: string): string | undefined {
  return process.env[key];
}

function printResults(): void {
  for (const result of results) {
    const label = result.ok ? 'PASS' : result.blocking === false ? 'WARN' : 'FAIL';
    console.log(`${label} ${result.id}: ${result.detail}`);
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

await main();
