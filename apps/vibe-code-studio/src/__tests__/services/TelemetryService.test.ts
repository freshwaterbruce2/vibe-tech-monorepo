/**
 * TelemetryService Tests
 *
 * Verifies the global error/unhandledrejection handlers installed by
 * enable() and the UUID-based session id.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { telemetry } from '../../services/TelemetryService';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('TelemetryService', () => {
  afterEach(() => {
    telemetry.disable();
    vi.restoreAllMocks();
  });

  it('generates a bare UUID session id', () => {
    expect(telemetry.getSessionId()).toMatch(UUID_RE);
  });

  describe('global error handlers', () => {
    it('tracks window error events with high severity once enabled', () => {
      telemetry.enable();
      const trackError = vi.spyOn(telemetry, 'trackError');

      window.dispatchEvent(
        new ErrorEvent('error', {
          message: 'kaboom',
          filename: 'src/app.ts',
          lineno: 12,
          colno: 7,
        })
      );

      expect(trackError).toHaveBeenCalled();
      const [error, context, severity] = trackError.mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('kaboom');
      expect(context).toMatchObject({ filename: 'src/app.ts', lineno: 12, colno: 7 });
      expect(severity).toBe('high');
    });

    it('tracks unhandled promise rejections with an Error reason', () => {
      telemetry.enable();
      const trackError = vi.spyOn(telemetry, 'trackError');

      const event = new Event('unhandledrejection');
      Object.assign(event, { reason: new Error('rejected hard') });
      window.dispatchEvent(event);

      expect(trackError).toHaveBeenCalled();
      const [error, context, severity] = trackError.mock.calls[0];
      expect((error as Error).message).toBe('Unhandled Promise Rejection');
      expect(context).toMatchObject({ reason: 'rejected hard' });
      expect(severity).toBe('high');
    });

    it('sanitizes non-Error rejection reasons into strings', () => {
      telemetry.enable();
      const trackError = vi.spyOn(telemetry, 'trackError');

      const event = new Event('unhandledrejection');
      Object.assign(event, { reason: '  plain string reason  ' });
      window.dispatchEvent(event);

      expect(trackError).toHaveBeenCalled();
      const [, context] = trackError.mock.calls[0];
      expect(context).toMatchObject({ reason: 'plain string reason' });
    });
  });
});
