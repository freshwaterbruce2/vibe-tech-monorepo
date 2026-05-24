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
    const projects = Object.values(graph.projects)
      .filter((project) => project.type === 'app' && this.isFactoryGeneratedProject(project));

    const statuses = await Promise.all(
      projects.map((project) => this.readProjectStatus(project))
    );

    return statuses.sort((a, b) => a.name.localeCompare(b.name));
  }

  private async readProjectStatus(project: NxGraph['projects'][string]): Promise<FactoryAppStatus> {
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

    // Load project-specific environment variables from .env.local and .env
    const envVars: Record<string, string> = {};
    for (const fileName of ['.env.local', '.env']) {
      const filePath = join(projectRoot, fileName);
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf8');
          for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const separator = trimmed.indexOf('=');
            if (separator <= 0) continue;
            const key = trimmed.slice(0, separator).trim();
            const value = this.trimEnvQuotes(trimmed.slice(separator + 1).trim());
            if (/^[A-Z0-9_]+$/i.test(key)) {
              envVars[key] = value;
            }
          }
        } catch {
          // Ignore read errors
        }
      }
    }

    const missingStripeKeys = this.getMissingKeysForProject(envVars, STRIPE_ENV_KEYS);
    const missingDeployKeys = this.getMissingKeysForProject(envVars, DEPLOY_ENV_KEYS);

    let stripeStatus = this.resolveStripeStatus({
      archetype,
      stripeConnected: monetization.stripeConnected,
      dependencyNames,
      envExamplePath,
    });

    let firstRevenueAt = monetization.firstRevenueAt;
    let mrrCents = monetization.mrrCents;
    let currency = monetization.currency;

    const stripeSecretKey = envVars['STRIPE_SECRET_KEY'] ?? process.env['STRIPE_SECRET_KEY'];
    if (stripeStatus !== 'not-applicable' && stripeSecretKey && stripeSecretKey.trim().length > 0) {
      try {
        const balanceRes = await this.queryStripeAPI('balance', stripeSecretKey);
        if (balanceRes) {
          stripeStatus = 'connected';

          const chargesRes = await this.queryStripeAPI('charges?limit=100&status=succeeded', stripeSecretKey);
          if (chargesRes && Array.isArray(chargesRes.data) && chargesRes.data.length > 0) {
            let oldestCharge = chargesRes.data[chargesRes.data.length - 1];
            for (let i = chargesRes.data.length - 1; i >= 0; i--) {
              const charge = chargesRes.data[i];
              if (charge.status === 'succeeded' && charge.amount > 0) {
                oldestCharge = charge;
                break;
              }
            }
            if (oldestCharge && oldestCharge.created) {
              firstRevenueAt = new Date(oldestCharge.created * 1000).toISOString().split('T')[0] ?? null;
            }
          }

          const subsRes = await this.queryStripeAPI('subscriptions?status=active&limit=100', stripeSecretKey);
          if (subsRes && Array.isArray(subsRes.data)) {
            let computedMrr = 0;
            for (const sub of subsRes.data) {
              const items = sub.items?.data ?? [];
              for (const item of items) {
                const price = item.price;
                if (price && price.unit_amount) {
                  const amount = price.unit_amount * (item.quantity ?? 1);
                  const interval = price.recurring?.interval ?? 'month';
                  const intervalCount = price.recurring?.interval_count ?? 1;

                  let monthlyAmount = amount;
                  if (interval === 'year') {
                    monthlyAmount = amount / 12;
                  } else if (interval === 'week') {
                    monthlyAmount = (amount * 52) / 12;
                  } else if (interval === 'day') {
                    monthlyAmount = (amount * 365) / 12;
                  } else if (interval === 'month') {
                    monthlyAmount = amount / intervalCount;
                  }
                  computedMrr += monthlyAmount;
                }
              }
            }
            mrrCents = Math.round(computedMrr);
            if (subsRes.data.length > 0 && subsRes.data[0].currency) {
              currency = subsRes.data[0].currency;
            }
          }
        }
      } catch (stripeError) {
        console.warn(`Stripe API query failed for project ${project.name}:`, stripeError);
      }
    }

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
      firstRevenueAt,
      mrrCents,
      currency,
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

  private trimEnvQuotes(value: string): string {
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }
    return value;
  }

  private getMissingKeysForProject(envVars: Record<string, string>, keys: readonly string[]): string[] {
    return keys.filter((key) => {
      const value = envVars[key] ?? process.env[key];
      return typeof value !== 'string' || value.length === 0;
    });
  }

  private async queryStripeAPI(endpoint: string, secretKey: string): Promise<any> {
    const response = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Stripe API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
}

export type { FactoryStatusServiceOptions };
