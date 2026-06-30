// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../lib/api', () => ({ api: { diagnose: vi.fn() } }));
import { api } from '../lib/api';
import { AiTab } from './AiTab';

beforeEach(() => vi.clearAllMocks());

describe('AiTab', () => {
  it('renders the notice returned by the diagnose endpoint', async () => {
    vi.mocked(api.diagnose).mockResolvedValue({ active: false, notice: 'Offline (from gateway)' });
    render(<AiTab />);
    await waitFor(() => expect(screen.getByText(/Offline \(from gateway\)/)).toBeInTheDocument());
  });

  it('keeps the default notice when diagnose fails', async () => {
    vi.mocked(api.diagnose).mockRejectedValue(new Error('down'));
    render(<AiTab />);
    await waitFor(() => expect(api.diagnose).toHaveBeenCalled());
    expect(screen.getByText(/AI Diagnostics offline/)).toBeInTheDocument();
  });
});
