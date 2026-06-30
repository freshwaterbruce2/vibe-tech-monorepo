// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../lib/api', () => ({ api: { runMaintenance: vi.fn(), runCleanup: vi.fn() } }));
import { api } from '../lib/api';
import { RemediationModal } from './RemediationModal';

const noop = () => undefined;

beforeEach(() => vi.clearAllMocks());

describe('RemediationModal', () => {
  it('runs the maintenance dry-run on open and shows the PowerShell preview', async () => {
    vi.mocked(api.runMaintenance).mockResolvedValue({
      success: true,
      dryRun: true,
      script: 'pnpm add lodash@^4.17.21 --save-exact --workspace-root',
      message: 'preview ready',
    });
    render(<RemediationModal action="maintenance" onClose={noop} onComplete={noop} />);

    expect(screen.getByText('Align Dependencies')).toBeInTheDocument();
    expect(api.runMaintenance).toHaveBeenCalledWith(true);
    await waitFor(() => expect(screen.getByText(/pnpm add lodash/)).toBeInTheDocument());
    expect(screen.getByText('preview ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Execute Live' })).toBeInTheDocument();
  });

  it('executes live on confirm, shows the message, and calls onComplete', async () => {
    vi.mocked(api.runMaintenance)
      .mockResolvedValueOnce({ success: true, dryRun: true, script: 's', message: 'm' })
      .mockResolvedValueOnce({ success: true, dryRun: false, message: 'aligned 1 package' });
    const onComplete = vi.fn();
    render(<RemediationModal action="maintenance" onClose={noop} onComplete={onComplete} />);

    await waitFor(() => screen.getByRole('button', { name: 'Execute Live' }));
    fireEvent.click(screen.getByRole('button', { name: 'Execute Live' }));

    await waitFor(() => expect(screen.getByText('aligned 1 package')).toBeInTheDocument());
    expect(api.runMaintenance).toHaveBeenLastCalledWith(false);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('surfaces a live failure error and does NOT call onComplete', async () => {
    vi.mocked(api.runCleanup)
      .mockResolvedValueOnce({
        success: true,
        dryRun: true,
        script: 'would remove 3',
        message: 'm',
      })
      .mockResolvedValueOnce({ success: false, dryRun: false, error: 'EBUSY' });
    const onComplete = vi.fn();
    render(<RemediationModal action="cleanup" onClose={noop} onComplete={onComplete} />);

    expect(screen.getByText('Clean Stale Artifacts')).toBeInTheDocument();
    await waitFor(() => screen.getByRole('button', { name: 'Execute Live' }));
    fireEvent.click(screen.getByRole('button', { name: 'Execute Live' }));

    await waitFor(() => expect(screen.getByText('EBUSY')).toBeInTheDocument());
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('falls back to default text when live result omits message/error', async () => {
    vi.mocked(api.runMaintenance)
      .mockResolvedValueOnce({ success: true, dryRun: true, script: 's', message: 'm' })
      .mockResolvedValueOnce({ success: false, dryRun: false });
    render(<RemediationModal action="maintenance" onClose={noop} onComplete={noop} />);
    await waitFor(() => screen.getByRole('button', { name: 'Execute Live' }));
    fireEvent.click(screen.getByRole('button', { name: 'Execute Live' }));
    await waitFor(() => expect(screen.getByText('Failed.')).toBeInTheDocument());
  });

  it('uses the "Done." default when a live success omits its message', async () => {
    vi.mocked(api.runMaintenance)
      .mockResolvedValueOnce({ success: true, dryRun: true, script: 's', message: 'm' })
      .mockResolvedValueOnce({ success: true, dryRun: false });
    render(<RemediationModal action="maintenance" onClose={noop} onComplete={noop} />);
    await waitFor(() => screen.getByRole('button', { name: 'Execute Live' }));
    fireEvent.click(screen.getByRole('button', { name: 'Execute Live' }));
    await waitFor(() => expect(screen.getByText('Done.')).toBeInTheDocument());
  });

  it('catches a live-run rejection and stringifies a non-Error', async () => {
    vi.mocked(api.runCleanup)
      .mockResolvedValueOnce({ success: true, dryRun: true, script: 's', message: 'm' })
      .mockRejectedValueOnce('socket hangup');
    render(<RemediationModal action="cleanup" onClose={noop} onComplete={noop} />);
    await waitFor(() => screen.getByRole('button', { name: 'Execute Live' }));
    fireEvent.click(screen.getByRole('button', { name: 'Execute Live' }));
    await waitFor(() => expect(screen.getByText('socket hangup')).toBeInTheDocument());
  });

  it('shows an error when the dry-run itself rejects', async () => {
    vi.mocked(api.runMaintenance).mockRejectedValue(new Error('gateway down'));
    render(<RemediationModal action="maintenance" onClose={noop} onComplete={noop} />);
    await waitFor(() => expect(screen.getByText('gateway down')).toBeInTheDocument());
  });

  it('Cancel triggers onClose', async () => {
    vi.mocked(api.runMaintenance).mockResolvedValue({
      success: true,
      dryRun: true,
      script: 's',
      message: 'm',
    });
    const onClose = vi.fn();
    render(<RemediationModal action="maintenance" onClose={onClose} onComplete={noop} />);
    await waitFor(() => screen.getByRole('button', { name: 'Execute Live' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
