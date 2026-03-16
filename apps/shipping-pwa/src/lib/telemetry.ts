import { addBreadcrumb, captureError, captureMessage } from '@/lib/sentry';

type TelemetryLevel = 'info' | 'warning' | 'error';

interface TelemetryOptions {
  category?: string;
  data?: Record<string, unknown>;
  level?: TelemetryLevel;
}

export function logClientEvent(message: string, options: TelemetryOptions = {}): void {
  const category = options.category ?? 'app';
  const level = options.level ?? 'info';

  void addBreadcrumb(message, category, level, options.data as Record<string, any> | undefined);

  if (level === 'warning') {
    void captureMessage(message, 'warning', {
      tags: { category },
      extra: options.data as Record<string, any> | undefined,
    });
  }
}

export function reportClientError(
  message: string,
  error: unknown,
  options: TelemetryOptions = {}
): void {
  const category = options.category ?? 'app';
  const level = options.level ?? 'error';
  const extra = {
    message,
    ...options.data,
    rawError: error instanceof Error ? undefined : error,
  };

  if (error instanceof Error) {
    void captureError(error, {
      tags: { category },
      extra,
      level,
      fingerprint: ['{{ default }}', category, message],
    });
    return;
  }

  void captureMessage(message, level, {
    tags: { category },
    extra,
    fingerprint: ['{{ default }}', category, message],
  });
}
