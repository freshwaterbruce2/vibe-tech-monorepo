import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DelayedIframe } from './DelayedIframe';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('DelayedIframe', () => {
  it('renders iframe when local endpoint signals load', async () => {
    render(<DelayedIframe url="http://localhost:8200" title="Local App" probeTimeoutMs={2000} />);

    const iframe = screen.getByTitle('Local App');
    expect(screen.getByText(/Starting Local Application Server/i)).toBeTruthy();

    fireEvent.load(iframe);
    expect(screen.queryByText(/Starting Local Application Server/i)).toBeNull();
  });

  it('shows error state when local app does not become ready before timeout', async () => {
    vi.useFakeTimers();
    render(<DelayedIframe url="http://localhost:8300" title="Offline App" probeTimeoutMs={300} />);

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByText(/did not become ready in time/i)).toBeTruthy();
  });

  it('returns to loading state when retry is clicked after timeout', async () => {
    vi.useFakeTimers();
    render(<DelayedIframe url="http://localhost:8400" title="Retry App" probeTimeoutMs={200} />);

    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByText(/did not become ready in time/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(screen.getByText(/Starting Local Application Server/i)).toBeTruthy();
  });

  it('renders non-local URLs without local startup overlay', async () => {
    render(<DelayedIframe url="https://example.com" title="External App" />);

    expect(screen.getByTitle('External App')).toBeTruthy();
    expect(screen.queryByText(/Starting Local Application Server/i)).toBeNull();
  });
});
