// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EnvConfigPanel } from './EnvConfigPanel';
import type { ProjectEnvInfo } from '@shared/types';

const mockEnvList = vi.fn();
const mockEnvUpdate = vi.fn();
const mockSubscribe = vi.fn(() => () => {});

const envConfigs: ProjectEnvInfo[] = [
  {
    projectName: 'factory-saas-smoke',
    projectRoot: 'apps/factory-saas-smoke',
    envExampleExists: true,
    envExists: true,
    envLocalExists: true,
    requiredKeys: ['PORT', 'STRIPE_SECRET_KEY'],
    values: {
      PORT: {
        envValue: '3000',
        envLocalValue: '3001',
        resolvedValue: '3001',
        isPlaceholder: false,
      },
      STRIPE_SECRET_KEY: {
        envValue: 'sk_test_51234567890abcdefghijklmnopqrstuvwxyz',
        envLocalValue: null,
        resolvedValue: 'sk_test_51234567890abcdefghijklmnopqrstuvwxyz',
        isPlaceholder: true,
      },
    },
    missingKeys: ['STRIPE_SECRET_KEY'],
  },
];

function setupBridge() {
  mockEnvList.mockReset();
  mockEnvUpdate.mockReset();
  mockSubscribe.mockReset();

  mockEnvList.mockResolvedValue({ ok: true, data: envConfigs, timestamp: Date.now() });
  mockEnvUpdate.mockResolvedValue({ ok: true, data: undefined, timestamp: Date.now() });
  mockSubscribe.mockReturnValue(() => {});

  Object.defineProperty(window, 'commandCenter', {
    value: {
      envConfig: { list: mockEnvList, update: mockEnvUpdate },
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
      <EnvConfigPanel />
    </QueryClientProvider>,
  );
}

describe('EnvConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupBridge();
  });

  it('renders application list and flags missing environment keys', async () => {
    renderPanel();

    await waitFor(() => expect(screen.getByText('factory-saas-smoke')).toBeDefined());
    expect(screen.getByText('1 missing')).toBeDefined();
  });

  it('displays detailed env variables on click', async () => {
    renderPanel();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('factory-saas-smoke')).toBeDefined());
    await user.click(screen.getByText('factory-saas-smoke'));

    expect(screen.getByText('Required values missing from `.env.local` / `.env`')).toBeDefined();
    expect(screen.getByText('PORT')).toBeDefined();
    expect(screen.getAllByText('STRIPE_SECRET_KEY').length).toBeGreaterThan(0);
  });

  it('filters by project name, keys, or values via search box', async () => {
    renderPanel();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('factory-saas-smoke')).toBeDefined());

    const searchInput = screen.getByPlaceholderText('Filter apps, keys or values...');
    
    // Type something that doesn't exist
    await user.type(searchInput, 'nonexistentkey');
    expect(screen.queryByText('factory-saas-smoke')).toBeNull();
    expect(screen.getByText('No applications match your search or filter criteria.')).toBeDefined();

    // Clear search and search for key "PORT"
    await user.clear(searchInput);
    await user.type(searchInput, 'PORT');
    expect(screen.getByText('factory-saas-smoke')).toBeDefined();
  });

  it('pre-fills edit form when clicking the edit button', async () => {
    renderPanel();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('factory-saas-smoke')).toBeDefined());
    await user.click(screen.getByText('factory-saas-smoke'));

    // Find the Edit button next to PORT
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]!);

    // Form inputs should be pre-filled with key "PORT" and value "3001"
    const keyInput = screen.getByPlaceholderText('KEY (e.g. STRIPE_SECRET_KEY)');
    const valueInput = screen.getByPlaceholderText('VALUE');

    expect((keyInput as HTMLInputElement).value).toBe('PORT');
    expect((valueInput as HTMLInputElement).value).toBe('3001');
  });
});
