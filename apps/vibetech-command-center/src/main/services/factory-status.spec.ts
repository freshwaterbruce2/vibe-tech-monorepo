import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FactoryStatusService } from './factory-status';
import type { NxGraph } from '../../shared/types';

const tmpRoots: string[] = [];

function makeTempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'factory-status-'));
  tmpRoots.push(root);
  return root;
}

function makeGraph(
  projectRoot: string,
  tags = ['scope:web', 'factory:generated', 'factory:saas'],
): NxGraph {
  return {
    projects: {
      'factory-saas-smoke': {
        name: 'factory-saas-smoke',
        type: 'app',
        root: projectRoot,
        sourceRoot: `${projectRoot}/src`,
        tags,
        implicitDependencies: ['@vibetech/auth', '@vibetech/billing', '@vibetech/analytics'],
      },
    },
    dependencies: {},
    generatedAt: Date.now(),
  };
}

describe('FactoryStatusService', () => {
  beforeEach(() => {
    for (const key of [
      'STRIPE_SECRET_KEY',
      'VITE_STRIPE_PUBLIC_KEY',
      'VERCEL_TOKEN',
      'VERCEL_ORG_ID',
      'VERCEL_PROJECT_ID',
      'RAILWAY_TOKEN',
    ]) {
      process.env[key] = '';
    }
  });
  afterEach(() => {
    while (tmpRoots.length > 0) {
      rmSync(tmpRoots.pop()!, { recursive: true, force: true });
    }
  });

  it('reads generated-app metadata from vibe-app.json', async () => {
    const root = makeTempRoot();
    const appRoot = join(root, 'apps', 'factory-saas-smoke');
    mkdirSync(appRoot, { recursive: true });

    writeFileSync(join(appRoot, 'vibe-app.json'), JSON.stringify({
      generatedBy: '@vibetech/factory:saas',
      projectName: 'factory-saas-smoke',
      displayName: 'Factory SaaS Smoke',
      archetype: 'web-saas',
      monetization: {
        stripeConnected: true,
        firstRevenueAt: '2026-05-15',
        mrrCents: 4900,
        currency: 'usd',
      },
    }));
    writeFileSync(join(appRoot, 'package.json'), JSON.stringify({
      dependencies: {
        '@vibetech/auth': 'workspace:*',
        '@vibetech/billing': 'workspace:*',
        '@vibetech/entitlements': 'workspace:*',
        '@vibetech/landing': 'workspace:*',
        '@vibetech/analytics': 'workspace:*',
      },
    }));
    writeFileSync(join(appRoot, 'project.json'), JSON.stringify({
      targets: {
        'ship:check': {},
      },
    }));
    writeFileSync(join(appRoot, '.env.example'), 'STRIPE_SECRET_KEY=\n');
    writeFileSync(join(appRoot, 'DEPLOYMENT.md'), '# Deploy\n');
    writeFileSync(join(appRoot, 'vercel.json'), '{}');
    writeFileSync(join(appRoot, 'railway.json'), '{}');

    const service = new FactoryStatusService({ monorepoRoot: root });
    const [status] = await service.listStatuses(makeGraph(
      'apps/factory-saas-smoke',
      ['scope:web', 'type:application'],
    ));

    expect(status).toBeDefined();
    expect(status!.projectName).toBe('factory-saas-smoke');
    expect(status!.displayName).toBe('Factory SaaS Smoke');
    expect(status!.stripeStatus).toBe('connected');
    expect(status!.firstRevenueAt).toBe('2026-05-15');
    expect(status!.mrrCents).toBe(4900);
    expect(status!.readiness.billing).toBe(true);
    expect(status!.readiness.envExample).toBe(true);
    expect(status!.shipping.shipCheck).toBe(true);
    expect(status!.shipping.deploymentDoc).toBe(true);
    expect(status!.shipping.vercelConfig).toBe(true);
    expect(status!.shipping.railwayConfig).toBe(true);
    expect(status!.shipping.stripeKeysPresent).toBe(false);
    expect(status!.shipping.missingStripeKeys).toEqual(['STRIPE_SECRET_KEY', 'VITE_STRIPE_PUBLIC_KEY']);
    expect(status!.shipping.deployKeysPresent).toBe(false);
    expect(status!.shipping.missingDeployKeys).toEqual([
      'VERCEL_TOKEN',
      'VERCEL_ORG_ID',
      'VERCEL_PROJECT_ID',
      'RAILWAY_TOKEN',
    ]);
    expect(status!.links.localDevUrl).toBeNull();
    expect(status!.links.stripeDashboardUrl).toBe('https://dashboard.stripe.com/test/payments');
    expect(status!.metadataSource).toBe('vibe-app.json');
  });

  it('falls back to heuristics when the manifest is missing', async () => {
    const root = makeTempRoot();
    const appRoot = join(root, 'apps', 'factory-saas-smoke');
    mkdirSync(appRoot, { recursive: true });

    writeFileSync(join(appRoot, 'package.json'), JSON.stringify({
      dependencies: {
        '@vibetech/billing': 'workspace:*',
      },
      scripts: {
        dev: 'node ../../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4320',
      },
    }));
    writeFileSync(join(appRoot, 'project.json'), JSON.stringify({ targets: {} }));
    writeFileSync(join(appRoot, '.env.example'), 'STRIPE_SECRET_KEY=\n');

    const service = new FactoryStatusService({ monorepoRoot: root });
    const [status] = await service.listStatuses(makeGraph('apps/factory-saas-smoke'));

    expect(status).toBeDefined();
    expect(status!.projectName).toBe('factory-saas-smoke');
    expect(status!.displayName).toBe('factory-saas-smoke');
    expect(status!.stripeStatus).toBe('scaffolded');
    expect(status!.firstRevenueAt).toBeNull();
    expect(status!.mrrCents).toBeNull();
    expect(status!.shipping.shipCheck).toBe(false);
    expect(status!.shipping.missingStripeKeys).toEqual(['STRIPE_SECRET_KEY', 'VITE_STRIPE_PUBLIC_KEY']);
    expect(status!.shipping.missingDeployKeys).toEqual([
      'VERCEL_TOKEN',
      'VERCEL_ORG_ID',
      'VERCEL_PROJECT_ID',
      'RAILWAY_TOKEN',
    ]);
    expect(status!.links.localDevUrl).toBe('http://127.0.0.1:4320');
    expect(status!.links.stripeDashboardUrl).toBe('https://dashboard.stripe.com/test/payments');
    expect(status!.metadataSource).toBe('heuristic');
  });

  it('gracefully handles placeholder Stripe secret key and flags as scaffolded', async () => {
    const root = makeTempRoot();
    const appRoot = join(root, 'apps', 'factory-saas-smoke');
    mkdirSync(appRoot, { recursive: true });

    writeFileSync(join(appRoot, 'vibe-app.json'), JSON.stringify({
      generatedBy: '@vibetech/factory:saas',
      projectName: 'factory-saas-smoke',
      displayName: 'Factory SaaS Smoke',
      archetype: 'web-saas',
      monetization: {
        stripeConnected: false,
        firstRevenueAt: null,
        mrrCents: null,
        currency: 'usd',
      },
    }));
    writeFileSync(join(appRoot, 'package.json'), JSON.stringify({
      dependencies: {
        '@vibetech/billing': 'workspace:*',
      },
    }));
    writeFileSync(join(appRoot, 'project.json'), JSON.stringify({ targets: {} }));
    writeFileSync(join(appRoot, '.env'), 'STRIPE_SECRET_KEY=sk_test_51234567890abcdefghijklmnopqrstuvwxyz\n');
    writeFileSync(join(appRoot, '.env.example'), 'STRIPE_SECRET_KEY=\n');

    const service = new FactoryStatusService({ monorepoRoot: root });
    const [status] = await service.listStatuses(makeGraph('apps/factory-saas-smoke'));

    expect(status).toBeDefined();
    expect(status!.stripeStatus).toBe('scaffolded');
    expect(status!.firstRevenueAt).toBeNull();
    expect(status!.mrrCents).toBeNull();
  });
});
