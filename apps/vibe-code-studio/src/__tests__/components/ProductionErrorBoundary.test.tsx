import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/TelemetryService', () => ({
  telemetry: { trackError: vi.fn(), trackEvent: vi.fn() },
}));
vi.mock('../../services/Logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { ProductionErrorBoundary } from '../../components/ErrorBoundary/ProductionErrorBoundary';
import { useErrorHandler } from '../../components/ErrorBoundary/productionErrorHandler';
import { telemetry } from '../../services/TelemetryService';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const Boom = (): never => {
  throw new Error('kaboom');
};

describe('ProductionErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // React logs caught boundary errors; keep test output clean.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when nothing throws', () => {
    render(
      <ProductionErrorBoundary>
        <div>all good</div>
      </ProductionErrorBoundary>
    );
    expect(screen.getByText('all good')).toBeTruthy();
    expect(screen.queryByText('Oops! Something went wrong')).toBeNull();
  });

  it('catches a thrown error, generates a UUID errorId, and renders fallback UI', () => {
    const { container } = render(
      <ProductionErrorBoundary>
        <Boom />
      </ProductionErrorBoundary>
    );

    // Fallback UI (executes the Button $variant interpolation for both branches:
    // one primary + two secondary buttons).
    expect(screen.getByText('Oops! Something went wrong')).toBeTruthy();
    expect(screen.getByText('Reload Application')).toBeTruthy();
    expect(screen.getByText('Go to Home')).toBeTruthy();
    expect(screen.getByText('Report Issue')).toBeTruthy();

    // getDerivedStateFromError produced a crypto.randomUUID errorId, shown in details.
    const pre = container.querySelector('pre');
    expect(pre).toBeTruthy();
    const idMatch = pre!.textContent!.match(
      /Error ID: ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/
    );
    expect(idMatch).toBeTruthy();

    // componentDidCatch reported the same errorId to telemetry as critical.
    expect(telemetry.trackError).toHaveBeenCalledTimes(1);
    const [err, ctx, severity] = vi.mocked(telemetry.trackError).mock.calls[0]!;
    expect((err as Error).message).toBe('kaboom');
    expect(severity).toBe('critical');
    expect((ctx as { errorBoundary: boolean }).errorBoundary).toBe(true);
    expect((ctx as { errorId: string }).errorId).toMatch(UUID_RE);
    expect((ctx as { errorId: string }).errorId).toBe(idMatch![1]);
  });

  it('generates a fresh errorId per caught error', () => {
    const first = render(
      <ProductionErrorBoundary>
        <Boom />
      </ProductionErrorBoundary>
    );
    first.unmount();
    render(
      <ProductionErrorBoundary>
        <Boom />
      </ProductionErrorBoundary>
    );

    const ids = vi
      .mocked(telemetry.trackError)
      .mock.calls.map(call => (call[1] as { errorId: string }).errorId);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toMatch(UUID_RE);
    expect(ids[1]).toMatch(UUID_RE);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('opens a mailto report containing the errorId when Report Issue is clicked', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(
      <ProductionErrorBoundary>
        <Boom />
      </ProductionErrorBoundary>
    );

    fireEvent.click(screen.getByText('Report Issue'));

    const errorId = (vi.mocked(telemetry.trackError).mock.calls[0]![1] as { errorId: string })
      .errorId;
    expect(telemetry.trackEvent).toHaveBeenCalledWith('error_boundary_report', { errorId });
    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0]![0] as string;
    expect(url).toContain('mailto:support@deepcode-editor.com');
    expect(url).toContain(encodeURIComponent(errorId));
    openSpy.mockRestore();
  });
});

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports the error as high severity and re-throws it', () => {
    const handler = useErrorHandler();
    const err = new Error('handled');
    expect(() => handler(err, { where: 'test' })).toThrow('handled');
    expect(telemetry.trackError).toHaveBeenCalledWith(err, { where: 'test' }, 'high');
  });
});
