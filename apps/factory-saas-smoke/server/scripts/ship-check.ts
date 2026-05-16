import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const workspaceRoot = path.resolve(import.meta.dirname, '../../../../..');
const projectRoot = path.resolve(import.meta.dirname, '../..');
const appName = 'factory-saas-smoke';
const apiPort = 5420;

type CheckResult = {
  id: string;
  ok: boolean;
  detail: string;
};

async function main(): Promise<void> {
  const checks: CheckResult[] = [];

  await checkDeploymentDoc(checks);
  await checkEnvPresence(
    ['STRIPE_SECRET_KEY', 'VITE_STRIPE_PUBLIC_KEY'],
    'stripe-env',
    'Stripe test credentials are present',
    checks,
  );
  await checkEnvPresence(
    ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'],
    'vercel-env',
    'Vercel deploy credentials are present',
    checks,
  );
  await checkEnvPresence(['RAILWAY_TOKEN'], 'railway-env', 'Railway deploy credentials are present', checks);
  await checkCompiledApi(checks);

  const failed = checks.filter((check) => !check.ok);
  for (const check of checks) {
    console.log(`${check.ok ? 'PASS' : 'FAIL'} [${check.id}] ${check.detail}`);
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function checkDeploymentDoc(checks: CheckResult[]): Promise<void> {
  const deploymentPath = path.join(projectRoot, 'DEPLOYMENT.md');
  try {
    const deploymentDoc = await readFile(deploymentPath, 'utf8');
    const ok =
      deploymentDoc.includes('Vercel') &&
      deploymentDoc.includes('Railway') &&
      deploymentDoc.includes('STRIPE_SECRET_KEY');
    checks.push({
      id: 'deployment-doc',
      ok,
      detail: ok
        ? 'Deployment doc covers Vercel, Railway, and Stripe env requirements'
        : 'Deployment doc is missing one or more required shipping sections',
    });
  } catch (error) {
    checks.push({
      id: 'deployment-doc',
      ok: false,
      detail: `Unable to read deployment doc: ${formatError(error)}`,
    });
  }
}

async function checkEnvPresence(
  keys: string[],
  id: string,
  successDetail: string,
  checks: CheckResult[],
): Promise<void> {
  const missing = keys.filter((key) => !process.env[key]);
  checks.push({
    id,
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? successDetail
        : `Missing required env keys: ${missing.join(', ')}`,
  });
}

async function checkCompiledApi(checks: CheckResult[]): Promise<void> {
  const child = spawn(
    process.execPath,
    [path.join(projectRoot, 'server/dist/index.js')],
    {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        PORT: String(apiPort),
        HOST: '127.0.0.1',
        APP_BASE_URL: `http://127.0.0.1:${apiPort - 1000}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForHealth();
    const healthRes = await fetch(`http://127.0.0.1:${apiPort}/api/health`);
    const body = (await healthRes.json()) as { ok?: boolean; app?: string };
    const ok = healthRes.ok && body.ok === true && body.app === appName;
    checks.push({
      id: 'compiled-api-health',
      ok,
      detail: ok
        ? 'Compiled API reached /api/health on the ship-check port'
        : `Compiled API health probe returned status=${healthRes.status}, ok=${String(body.ok)}, app=${String(body.app)}`,
    });
  } catch (error) {
    checks.push({
      id: 'compiled-api-health',
      ok: false,
      detail: `Local API ship-check failed: ${formatError(error)}${stderr ? ` | stderr: ${stderr.trim()}` : ''}`,
    });
  } finally {
    child.kill('SIGTERM');
    await onceExit(child);
  }
}

async function waitForHealth(): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${apiPort}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // server still booting
    }
    await delay(250);
  }

  throw new Error('Compiled API did not become healthy in time');
}

async function onceExit(child: ReturnType<typeof spawn>): Promise<void> {
  if (child.exitCode !== null) {
    return;
  }

  await new Promise<void>((resolve) => {
    child.once('exit', () => resolve());
  });
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

await access(path.join(projectRoot, 'server/dist/index.js'));
await main();
