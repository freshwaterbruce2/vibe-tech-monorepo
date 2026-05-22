// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FactoryPanel } from './FactoryPanel';
import type { FactoryAppStatus, ProcessHandle } from '@shared/types';

const mockFactoryList = vi.fn();
const mockGenerate = vi.fn();
const mockSubscribe = vi.fn(() => () => {});

const factoryApps: FactoryAppStatus[] = [
  {
    name: 'factory-saas-smoke',
    projectName: 'factory-saas-smoke',
    root: 'apps/factory-saas-smoke',
    sourceRoot: 'apps/factory-saas-smoke/src',
    tags: ['scope:web', 'factory:generated', 'factory:saas'],
    generatedBy: '@vibetech/factory:saas',
    displayName: 'Factory SaaS Smoke',
    archetype: 'web-saas',
    stripeStatus: 'connected',
    firstRevenueAt: '2026-05-15',
    mrrCents: 4900,
    currency: 'usd',
    readiness: {
      auth: true,
      billing: true,
      entitlements: true,
      landing: true,
      analytics: true,
      envExample: true,
    },
    shipping: {
      shipCheck: true,
      deploymentDoc: true,
      vercelConfig: true,
      railwayConfig: true,
      stripeKeysPresent: true,
      missingStripeKeys: [],
      deployKeysPresent: true,
      missingDeployKeys: [],
    },
    links: {
      localDevUrl: 'http://127.0.0.1:4320',
      stripeDashboardUrl: 'https://dashboard.stripe.com/test/payments',
    },
    metadataSource: 'vibe-app.json',
  },
];

function setupBridge() {
  mockFactoryList.mockReset();
  mockGenerate.mockReset();
  mockSubscribe.mockReset();

  mockFactoryList.mockResolvedValue({ ok: true, data: factoryApps, timestamp: Date.now() });
  mockGenerate.mockResolvedValue({
    ok: true,
    data: {
      id: 'proc-1',
      command: 'pnpm',
      args: ['nx', 'g', '@vibetech/factory:saas', 'factory-next-app'],
      cwd: 'C:\\dev',
      pid: 123,
      status: 'running',
      startedAt: Date.now(),
      exitCode: null,
    } satisfies ProcessHandle,
    timestamp: Date.now(),
  });
  mockSubscribe.mockReturnValue(() => {});

  Object.defineProperty(window, 'commandCenter', {
    value: {
      factory: { list: mockFactoryList, generate: mockGenerate },
      stream: { subscribe: mockSubscribe },
    },
    writable: true,
    configurable: true,
  });
}

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <FactoryPanel />
    </QueryClientProvider>,
  );
}

describe('FactoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupBridge();
  });

  it('renders generated app status cards from factory metadata', async () => {
    renderPanel();

    await waitFor(() => expect(screen.getByText('factory-saas-smoke')).toBeTruthy());
    expect(screen.getByText('Factory SaaS Smoke')).toBeTruthy();
    expect(screen.getByText('connected')).toBeTruthy();
    expect(screen.getByText('May 15, 2026')).toBeTruthy();
    expect(screen.getAllByText('USD 49.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('billing')).toBeTruthy();
    expect(screen.getByText('ship:check')).toBeTruthy();
    expect(screen.getByText('deploy creds')).toBeTruthy();
    expect(screen.queryByText('Missing Stripe keys')).toBeNull();
    expect(screen.queryByText('Missing deploy keys')).toBeNull();
    expect(screen.getByRole('link', { name: /local dev/i }).getAttribute('href')).toBe('http://127.0.0.1:4320');
    expect(screen.getByRole('link', { name: /stripe dashboard/i }).getAttribute('href')).toBe('https://dashboard.stripe.com/test/payments');
  });

  it('launches the generator through the Agent Orchestrator bridge', async () => {
    const user = userEvent.setup();
    renderPanel();

    await waitFor(() => expect(screen.getByText('factory-saas-smoke')).toBeTruthy());
    await user.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => expect(mockGenerate).toHaveBeenCalled());
    expect(mockGenerate).toHaveBeenCalledWith({
      archetype: 'saas',
      name: 'factory-next-app',
    });
  });
});
