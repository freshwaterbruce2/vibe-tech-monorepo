import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FactoryAppStatus, FactoryStripeStatus, NxGraph } from '../../shared/types';

const STRIPE_ENV_KEYS = ['STRIPE_SECRET_KEY', 'VITE_STRIPE_PUBLIC_KEY'] as const;
const DEPLOY_ENV_KEYS = [
  'VERCEL_TOKEN',
  'VERCEL_ORG_ID',
  'VERCEL_PROJECT_ID',
  'RAILWAY_TOKEN',
] as const;

interface FactoryStatusServiceOptions {
  monorepoRoot: string;
}

interface FactoryManifest {
  generatedBy?: string;
  projectName?: string;
  displayName?: string;
  archetype?: string;
  monetization?: {
    stripeConnected?: boolean | null;
    firstRevenueAt?: string | null;
    mrrCents?: number | null;
    currency?: string | null;
  };
}

interface FactoryMonetizationSignals {
  stripeConnected: boolean | null;
  firstRevenueAt: string | null;
  mrrCents: number | null;
  currency: string | null;
}

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export class FactoryStatusService {
  constructor(private readonly opts: FactoryStatusServiceOptions) {}

  async listStatuses(graph: NxGraph): Promise<FactoryAppStatus[]> {
    return Object.values(graph.projects)
      .filter((project) => project.type === 'app' && this.isFactoryGeneratedProject(project))
      .map((project) => this.readProjectStatus(project))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private readProjectStatus(project: NxGraph['projects'][string]): FactoryAppStatus {
    const projectRoot = join(this.opts.monorepoRoot, project.root);
    const manifestPath = join(projectRoot, 'vibe-app.json');
    const envExamplePath = join(projectRoot, '.env.example');
    const packageJsonPath = join(projectRoot, 'package.json');
    const projectJsonPath = join(projectRoot, 'project.json');
    const deploymentDocPath = join(projectRoot, 'DEPLOYMENT.md');
    const vercelConfigPath = join(projectRoot, 'vercel.json');
    const railwayConfigPath = join(projectRoot, 'railway.json');

    const manifest = this.readJsonFile<FactoryManifest>(manifestPath);
    const packageJson = this.readJsonFile<PackageManifest>(packageJsonPath);
    const projectJson = this.readJsonFile<{ targets?: Record<string, unknown> }>(projectJsonPath);
    const archetype = manifest?.archetype ?? this.deriveArchetype(project.tags);
    const monetization = this.normalizeMonetization(manifest?.monetization);
    const dependencyNames = new Set([
      ...Object.keys(packageJson?.dependencies ?? {}),
      ...Object.keys(packageJson?.devDependencies ?? {}),
      ...project.implicitDependencies,
    ]);
    const missingStripeKeys = this.getMissingEnvKeys(STRIPE_ENV_KEYS);
    const missingDeployKeys = this.getMissingEnvKeys(DEPLOY_ENV_KEYS);

    const stripeStatus = this.resolveStripeStatus({
      archetype,
      stripeConnected: monetization.stripeConnected,
      dependencyNames,
      envExamplePath,
    });

    return {
      name: project.name,
      projectName: manifest?.projectName ?? project.name,
      root: project.root,
      sourceRoot: project.sourceRoot,
      tags: project.tags,
      generatedBy: manifest?.generatedBy ?? null,
      displayName: manifest?.displayName ?? manifest?.projectName ?? project.name,
      archetype,
      stripeStatus,
      firstRevenueAt: monetization.firstRevenueAt,
      mrrCents: monetization.mrrCents,
      currency: monetization.currency,
      readiness: {
        auth: dependencyNames.has('@vibetech/auth'),
        billing: dependencyNames.has('@vibetech/billing'),
        entitlements: dependencyNames.has('@vibetech/entitlements'),
        landing: dependencyNames.has('@vibetech/landing'),
        analytics: dependencyNames.has('@vibetech/analytics'),
        envExample: existsSync(envExamplePath),
      },
      shipping: {
        shipCheck: Boolean(projectJson?.targets?.['ship:check']),
        deploymentDoc: existsSync(deploymentDocPath),
        vercelConfig: existsSync(vercelConfigPath),
        railwayConfig: existsSync(railwayConfigPath),
        stripeKeysPresent: missingStripeKeys.length === 0,
        missingStripeKeys,
        deployKeysPresent: missingDeployKeys.length === 0,
        missingDeployKeys,
      },
      links: {
        localDevUrl: this.resolveLocalDevUrl(packageJson, projectRoot),
        stripeDashboardUrl: stripeStatus === 'not-applicable'
          ? null
          : 'https://dashboard.stripe.com/test/payments',
      },
      metadataSource: manifest ? 'vibe-app.json' : 'heuristic',
    };
  }

  private isFactoryGeneratedProject(project: NxGraph['projects'][string]): boolean {
    if (project.tags.includes('factory:generated')) {
      return true;
    }

    const manifestPath = join(this.opts.monorepoRoot, project.root, 'vibe-app.json');
    const manifest = this.readJsonFile<FactoryManifest>(manifestPath);
    return manifest?.generatedBy?.startsWith('@vibetech/factory:') === true;
  }

  private deriveArchetype(tags: string[]): string {
    const tag = tags.find((entry) => entry.startsWith('factory:') && entry !== 'factory:generated');
    return tag ? tag.replace('factory:', '') : 'generated';
  }

  private normalizeMonetization(
    monetization: FactoryManifest['monetization'] | undefined,
  ): FactoryMonetizationSignals {
    const stripeConnected = typeof monetization?.stripeConnected === 'boolean'
      ? monetization.stripeConnected
      : null;
    const firstRevenueAt = typeof monetization?.firstRevenueAt === 'string'
      && monetization.firstRevenueAt.trim().length > 0
      ? monetization.firstRevenueAt.trim()
      : null;
    const mrrCents = typeof monetization?.mrrCents === 'number'
      && Number.isFinite(monetization.mrrCents)
      ? monetization.mrrCents
      : null;
    const currency = typeof monetization?.currency === 'string'
      && monetization.currency.trim().length > 0
      ? monetization.currency.trim().toLowerCase()
      : null;

    return { stripeConnected, firstRevenueAt, mrrCents, currency };
  }

  private resolveStripeStatus(input: {
    archetype: string;
    stripeConnected: boolean | null;
    dependencyNames: Set<string>;
    envExamplePath: string;
  }): FactoryStripeStatus {
    if (input.archetype === 'landing-only') {
      return 'not-applicable';
    }

    if (input.stripeConnected === true) {
      return 'connected';
    }
    if (input.stripeConnected === false) {
      return 'not-configured';
    }

    const hasBilling = input.dependencyNames.has('@vibetech/billing');
    const hasEnv = existsSync(input.envExamplePath)
      && readFileSync(input.envExamplePath, 'utf8').includes('STRIPE_SECRET_KEY');

    if (hasBilling || hasEnv) {
      return 'scaffolded';
    }

    return 'not-configured';
  }

  private readJsonFile<T>(path: string): T | undefined {
    if (!existsSync(path)) {
      return undefined;
    }

    try {
      return JSON.parse(readFileSync(path, 'utf8')) as T;
    } catch {
      return undefined;
    }
  }

  private getMissingEnvKeys(keys: readonly string[]): string[] {
    return keys.filter((key) => {
      const value = process.env[key];
      return typeof value !== 'string' || value.length === 0;
    });
  }

  private resolveLocalDevUrl(packageJson: PackageManifest | undefined, projectRoot: string): string | null {
    const candidateScripts = [
      packageJson?.scripts?.['dev:web'],
      packageJson?.scripts?.dev,
    ].filter((script): script is string => typeof script === 'string' && script.length > 0);

    for (const script of candidateScripts) {
      const portMatch = script.match(/--port\s+(\d+)/);
      if (!portMatch) {
        continue;
      }

      const hostMatch = script.match(/--host\s+([^\s]+)/);
      const host = hostMatch?.[1] ?? '127.0.0.1';
      return `http://${host}:${portMatch[1]}`;
    }

    const tauriConfigPath = join(projectRoot, 'src-tauri', 'tauri.conf.json');
    const tauriConfig = this.readJsonFile<{ build?: { devUrl?: string } }>(tauriConfigPath);
    return tauriConfig?.build?.devUrl ?? null;
  }
}

export type { FactoryStatusServiceOptions };
