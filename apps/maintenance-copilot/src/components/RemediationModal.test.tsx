// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../lib/api', () => ({ api: { runMaintenance: vi.fn(), runCleanup: vi.fn() } }));
import { api } from '../lib/api';
import { RemediationModal } from './RemediationModal';

const noop = () => undefined;
const BASELINE = { dryRun: true, backup: false, vacuum: false, retention: false };

beforeEach(() => vi.clearAllMocks());

describe('RemediationModal', () => {
  it('runs the maintenance dry-run with baseline flags and shows the command preview', async () => {
    vi.mocked(api.runMaintenance).mockResolvedValue({
      success: true,
      dryRun: true,
      script: 'python "D:/learning-system/scripts/run_maintenance.py"',
      message: 'preview ready',
    });
    render(<RemediationModal action="maintenance" onClose={noop} onComplete={noop} />);

    expect(screen.getByText('Run Database Maintenance')).toBeInTheDocument();
    expect(api.runMaintenance).toHaveBeenCalledWith(BASELINE);
    // The deep-clean opt-ins are present and default-off.
    expect(screen.getByRole('checkbox', { name: /Backup/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /VACUUM/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Retention purge/ })).not.toBeChecked();
    await waitFor(() => expect(screen.getByText(/run_maintenance\.py/)).toBeInTheDocument());
    expect(screen.getByText('preview ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Execute Live' })).toBeInTheDocument();
  });

  it('executes the baseline live on confirm, shows the message, and calls onComplete', async () => {
    vi.mocked(api.runMaintenance)
      .mockResolvedValueOnce({ success: true, dryRun: true, script: 's', message: 'm' })
      .mockResolvedValueOnce({ success: true, dryRun: false, message: 'MAINTENANCE SUCCESS' });
    const onComplete = vi.fn();
    render(<RemediationModal action="maintenance" onClose={noop} onComplete={onComplete} />);

    await waitFor(() => screen.getByRole('button', { name: 'Execute Live' }));
    fireEvent.click(screen.getByRole('button', { name: 'Execute Live' }));

    await waitFor(() => expect(screen.getByText('MAINTENANCE SUCCESS')).toBeInTheDocument());
    expect(api.runMaintenance).toHaveBeenLastCalledWith({
      dryRun: false,
      backup: false,
      vacuum: false,
      retention: false,
    });
    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('toggling VACUUM + Retention shows the destructive warning and re-previews with flags', async () => {
    vi.mocked(api.runMaintenance).mockResolvedValue({
      success: true,
      dryRun: true,
      script: 's',
      message: 'm',
    });
    render(<RemediationModal action="maintenance" onClose={noop} onComplete={noop} />);
    await waitFor(() => screen.getByRole('button', { name: 'Execute Live' }));

    fireEvent.click(screen.getByRole('checkbox', { name: /VACUUM/ }));
    await waitFor(() =>
      expect(api.runMaintenance).toHaveBeenCalledWith({
        dryRun: true,
        backup: false,
        vacuum: true,
        retention: false,
      }),
    );
    let warn = await screen.findByText(/Destructive/);
    expect(warn.textContent).toMatch(/VACUUM/);

    fireEvent.click(screen.getByRole('checkbox', { name: /Retention purge/ }));
    await waitFor(() =>
      expect(api.runMaintenance).toHaveBeenCalledWith({
        dryRun: true,
        backup: false,
        vacuum: true,
        retention: true,
      }),
    );
    warn = await screen.findByText(/Destructive/);
    expect(warn.textContent).toMatch(/VACUUM \+ retention purge \(permanent\)/);
  });

  it('retention-only warns about the permanent purge without VACUUM', async () => {
    vi.mocked(api.runMaintenance).mockResolvedValue({
      success: true,
      dryRun: true,
      script: 's',
      message: 'm',
    });
    render(<RemediationModal action="maintenance" onClose={noop} onComplete={noop} />);
    await waitFor(() => screen.getByRole('button', { name: 'Execute Live' }));

    fireEvent.click(screen.getByRole('checkbox', { name: /Retention purge/ }));
    const warn = await screen.findByText(/Destructive/);
    expect(warn.textContent).toMatch(/retention purge \(permanent\)/);
    expect(warn.textContent).not.toMatch(/VACUUM/);
  });

  it('surfaces a live failure error and does NOT call onComplete (cleanup action)', async () => {
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
    // cleanup has no deep-clean opt-ins
    expect(screen.queryByRole('checkbox')).toBeNull();
    await waitFor(() => screen.getByRole('button', { name: 'Execute Live' }));
    fireEvent.click(screen.getByRole('button', { name: 'Execute Live' }));

    await waitFor(() => expect(screen.getByText('EBUSY')).toBeInTheDocument());
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('falls back to default text when a live result omits message/error', async () => {
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

  it('catches a live-run rejection and stringifies a non-Error (cleanup action)', async () => {
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
