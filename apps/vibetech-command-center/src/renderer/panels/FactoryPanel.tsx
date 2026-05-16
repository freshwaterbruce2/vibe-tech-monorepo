import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { BadgeDollarSign, Boxes, CreditCard, ExternalLink, Rocket, TerminalSquare } from 'lucide-react';
import { Panel, StatusDot } from '@renderer/components/Panel';
import { useFactoryApps, useProcessOutput } from '@renderer/hooks';
import type {
  FactoryAppStatus,
  FactoryGeneratorArchetype,
  FactoryStripeStatus,
  ProcessHandle,
} from '@shared/types';

const ARCHETYPES: Array<{
  id: FactoryGeneratorArchetype;
  label: string;
  description: string;
}> = [
  { id: 'saas', label: 'SaaS', description: 'Vite + React + Fastify' },
  { id: 'landing-only', label: 'Landing', description: 'Marketing-only site' },
  { id: 'tauri-app', label: 'Tauri', description: 'Desktop shell scaffold' },
];

export function FactoryPanel() {
  const queryClient = useQueryClient();
  const factory = useFactoryApps();
  const [appName, setAppName] = useState('factory-next-app');
  const [archetype, setArchetype] = useState<FactoryGeneratorArchetype>('saas');
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [lastHandle, setLastHandle] = useState<ProcessHandle | null>(null);
  const processOutput = useProcessOutput(lastHandle?.id ?? null);

  const summary = useMemo(() => {
    const apps = factory.data ?? [];
    return {
      total: apps.length,
      connected: apps.filter((app) => app.stripeStatus === 'connected').length,
      scaffolded: apps.filter((app) => app.stripeStatus === 'scaffolded').length,
      withRevenue: apps.filter((app) => app.firstRevenueAt !== null).length,
      shipReadyLocal: apps.filter((app) =>
        app.shipping.shipCheck
        && app.shipping.deploymentDoc
        && app.shipping.vercelConfig
        && app.shipping.railwayConfig,
      ).length,
      blockedOnCreds: apps.filter((app) =>
        app.shipping.shipCheck
        && (app.shipping.missingStripeKeys.length > 0 || app.shipping.missingDeployKeys.length > 0),
      ).length,
    };
  }, [factory.data]);

  const handleGenerate = async () => {
    setLaunchError(null);

    const trimmedName = appName.trim();
    if (!trimmedName) {
      setLaunchError('App name is required.');
      return;
    }

    const result = await window.commandCenter.factory.generate({
      archetype,
      name: trimmedName,
    });

    if (!result.ok) {
      setLaunchError(result.error);
      return;
    }

    setLastHandle(result.data);
    await queryClient.invalidateQueries({ queryKey: ['factory', 'apps'] });
  };

  return (
    <Panel
      title={`Factory (${summary.total} generated apps)`}
      loading={factory.isFetching}
      error={factory.error instanceof Error ? factory.error.message : null}
      onRefresh={() => {
        void queryClient.invalidateQueries({ queryKey: ['factory', 'apps'] });
      }}
      actions={
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Boxes size={14} />
          <span>{summary.connected} connected</span>
          <span>{summary.scaffolded} scaffolded</span>
          <span>{summary.withRevenue} with revenue</span>
          <span>{summary.shipReadyLocal} locally ready</span>
          <span>{summary.blockedOnCreds} blocked on creds</span>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryTile label="Generated apps" value={String(summary.total)} tone="neutral" />
            <SummaryTile label="Stripe connected" value={String(summary.connected)} tone="ok" />
            <SummaryTile label="Stripe scaffolded" value={String(summary.scaffolded)} tone="warn" />
            <SummaryTile label="Revenue seen" value={String(summary.withRevenue)} tone="ok" />
            <SummaryTile label="Locally ready" value={String(summary.shipReadyLocal)} tone="ok" />
            <SummaryTile label="Blocked on creds" value={String(summary.blockedOnCreds)} tone="warn" />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(factory.data ?? []).map((project) => (
              <GeneratedAppCard key={project.name} project={project} />
            ))}
          </div>

          {(factory.data ?? []).length === 0 && (
            <div className="rounded-lg border border-dashed border-bg-line p-5 text-sm text-slate-400">
              No generated apps are registered yet. Use the launcher to create the first one.
            </div>
          )}
        </section>

        <section className="rounded-lg border border-bg-line bg-bg-elev p-4">
          <div className="mb-4">
            <div className="text-sm font-semibold text-slate-100">Launch generator</div>
            <div className="mt-1 text-xs text-slate-500">
              Runs `pnpm nx g @vibetech/factory:&lt;archetype&gt; &lt;name&gt;` through the
              Agent Orchestrator.
            </div>
          </div>

          <label className="mb-2 block text-xs font-medium text-slate-400">App name</label>
          <input
            value={appName}
            onChange={(event) => setAppName(event.target.value)}
            className="mb-4 w-full rounded border border-bg-line bg-bg-panel px-3 py-2 text-sm text-slate-100 outline-none focus:border-pulse-cyan"
            spellCheck={false}
          />

          <div className="mb-2 text-xs font-medium text-slate-400">Archetype</div>
          <div className="mb-4 grid gap-2">
            {ARCHETYPES.map((option) => (
              <button
                key={option.id}
                onClick={() => setArchetype(option.id)}
                className={clsx(
                  'rounded border px-3 py-2 text-left transition-colors',
                  archetype === option.id
                    ? 'border-pulse-cyan bg-pulse-cyan-900/40 text-pulse-cyan-200'
                    : 'border-bg-line bg-bg-panel text-slate-300 hover:border-pulse-cyan-700',
                )}
              >
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-slate-500">{option.description}</div>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              void handleGenerate();
            }}
            className="btn btn-primary w-full justify-center text-sm"
          >
            <Rocket size={14} />
            Generate
          </button>

          {launchError && (
            <div className="mt-3 rounded border border-status-error/30 bg-status-error/10 p-3 text-xs text-status-error">
              {launchError}
            </div>
          )}

          <div className="mt-5 border-t border-bg-line pt-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
              <TerminalSquare size={14} />
              <span>Last run</span>
            </div>
            {lastHandle ? (
              <>
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">
                    {lastHandle.command} {lastHandle.args.join(' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusDot ok={lastHandle.status === 'running' ? 'warn' : lastHandle.exitCode === 0} />
                    <span>{lastHandle.status}</span>
                  </div>
                </div>
                <pre className="max-h-64 overflow-auto rounded bg-bg-panel p-3 text-xs text-slate-300">
                  {processOutput.length > 0
                    ? processOutput.map((chunk) => chunk.data).join('')
                    : 'Waiting for process output...'}
                </pre>
              </>
            ) : (
              <div className="text-xs text-slate-500">No generator run launched from this panel yet.</div>
            )}
          </div>
        </section>
      </div>
    </Panel>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'ok' | 'warn';
}) {
  const toneClass =
    tone === 'ok'
      ? 'border-status-ok/30 bg-status-ok/10 text-status-ok'
      : tone === 'warn'
        ? 'border-status-warn/30 bg-status-warn/10 text-status-warn'
        : 'border-bg-line bg-bg-elev text-slate-100';

  return (
    <div className={clsx('rounded-lg border p-4', toneClass)}>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function GeneratedAppCard({ project }: { project: FactoryAppStatus }) {
  return (
    <article className="rounded-lg border border-bg-line bg-bg-elev p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-sm text-slate-100">{project.name}</div>
          <div className="text-xs text-slate-500">{project.root}</div>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot ok={stripeDotTone(project.stripeStatus)} />
          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            {project.metadataSource}
          </span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {project.tags
          .filter((tag) => tag.startsWith('factory:') || tag === 'scope:web' || tag === 'scope:desktop')
          .map((tag) => (
            <span
              key={tag}
              className="rounded bg-pulse-cyan-900/40 px-2 py-0.5 text-[10px] text-pulse-cyan-200"
            >
              {tag}
            </span>
          ))}
      </div>

      <div className="space-y-2 text-xs text-slate-400">
        <SignalRow
          icon={<CreditCard size={12} />}
          label="Stripe"
          value={formatStripeStatus(project.stripeStatus)}
        />
        <SignalRow
          icon={<BadgeDollarSign size={12} />}
          label="First revenue"
          value={project.firstRevenueAt ?? 'none yet'}
        />
        <SignalRow
          icon={<BadgeDollarSign size={12} />}
          label="MRR"
          value={formatMrr(project.mrrCents, project.currency)}
        />
      </div>

      <div className="mt-4 border-t border-bg-line pt-3">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Readiness</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <ReadinessPill label="auth" ok={project.readiness.auth} />
          <ReadinessPill label="billing" ok={project.readiness.billing} />
          <ReadinessPill label="entitlements" ok={project.readiness.entitlements} />
          <ReadinessPill label="landing" ok={project.readiness.landing} />
          <ReadinessPill label="analytics" ok={project.readiness.analytics} />
          <ReadinessPill label=".env.example" ok={project.readiness.envExample} />
        </div>
      </div>

      <div className="mt-4 border-t border-bg-line pt-3">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Shipping</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <ReadinessPill label="ship:check" ok={project.shipping.shipCheck} />
          <ReadinessPill label="deploy doc" ok={project.shipping.deploymentDoc} />
          <ReadinessPill label="vercel" ok={project.shipping.vercelConfig} />
          <ReadinessPill label="railway" ok={project.shipping.railwayConfig} />
          <ReadinessPill label="stripe creds" ok={project.shipping.stripeKeysPresent} />
          <ReadinessPill label="deploy creds" ok={project.shipping.deployKeysPresent} />
        </div>
        {project.shipping.missingStripeKeys.length > 0 && (
          <MissingKeysBlock
            label="Missing Stripe keys"
            keys={project.shipping.missingStripeKeys}
          />
        )}
        {project.shipping.missingDeployKeys.length > 0 && (
          <MissingKeysBlock
            label="Missing deploy keys"
            keys={project.shipping.missingDeployKeys}
          />
        )}
        {(project.links.localDevUrl || project.links.stripeDashboardUrl) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {project.links.localDevUrl && (
              <ActionLink href={project.links.localDevUrl} label="Local dev" />
            )}
            {project.links.stripeDashboardUrl && (
              <ActionLink href={project.links.stripeDashboardUrl} label="Stripe dashboard" />
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function SignalRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-right text-slate-300">{value}</span>
    </div>
  );
}

function ReadinessPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={clsx(
        'rounded px-2 py-1 text-[11px] uppercase tracking-wide',
        ok
          ? 'bg-status-ok/15 text-status-ok'
          : 'bg-status-error/10 text-status-error',
      )}
    >
      {label}
    </div>
  );
}

function MissingKeysBlock({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="mt-3 rounded border border-status-error/20 bg-status-error/5 p-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {keys.map((key) => (
          <span
            key={key}
            className="rounded bg-status-error/10 px-2 py-1 font-mono text-[10px] text-status-error"
          >
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded border border-bg-line bg-bg-panel px-2 py-1 text-[11px] uppercase tracking-wide text-slate-300 hover:border-pulse-cyan-700 hover:text-pulse-cyan-200"
    >
      <span>{label}</span>
      <ExternalLink size={11} />
    </a>
  );
}

function stripeDotTone(status: FactoryStripeStatus): boolean | 'warn' {
  if (status === 'connected') {
    return true;
  }
  if (status === 'scaffolded' || status === 'not-applicable') {
    return 'warn';
  }
  return false;
}

function formatStripeStatus(status: FactoryStripeStatus): string {
  switch (status) {
    case 'connected':
      return 'connected';
    case 'scaffolded':
      return 'scaffolded';
    case 'not-applicable':
      return 'not applicable';
    default:
      return 'not configured';
  }
}

function formatMrr(mrrCents: number | null, currency: string | null): string {
  if (mrrCents === null) {
    return 'none yet';
  }

  const amount = (mrrCents / 100).toFixed(2);
  return `${currency?.toUpperCase() ?? 'USD'} ${amount}`;
}
