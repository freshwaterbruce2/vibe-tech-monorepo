/**
 * Telemetry Service for production analytics and error tracking
 */
import { logger } from '../services/Logger';

type TelemetryPrimitive = string | number | boolean | null;
type TelemetryProperties = Record<string, TelemetryPrimitive>;

const SENSITIVE_KEY_PATTERN =
  /(api[_-]?key|authorization|cookie|password|secret|token|prompt|content|query|message|stack|selected|code)/i;
const MAX_PROPERTY_STRING_LENGTH = 160;

interface TelemetryEvent {
  event: string;
  properties?: TelemetryProperties;
  timestamp: number;
  sessionId: string;
  userIdHash?: string;
}

interface ErrorEvent {
  error: {
    name: string;
    message: string;
  };
  context?: TelemetryProperties | undefined;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  sessionId: string;
}

export class TelemetryService {
  private static instance: TelemetryService;
  private sessionId: string;
  private userIdHash?: string;
  private eventQueue: TelemetryEvent[] = [];
  private errorQueue: ErrorEvent[] = [];
  private flushInterval: number = 30000; // 30 seconds
  private maxQueueSize: number = 100;
  private enabled: boolean;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.enabled = import.meta.env['VITE_ENABLE_TELEMETRY'] === 'true';

    if (this.enabled) {
      this.startFlushInterval();
      this.setupErrorHandlers();
    }
  }

  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  /**
   * Track a custom event
   */
  trackEvent(event: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) {
      return;
    }

    const sanitizedProperties = this.sanitizeProperties(properties);
    const telemetryEvent: TelemetryEvent = {
      event,
      ...(Object.keys(sanitizedProperties).length > 0 ? { properties: sanitizedProperties } : {}),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      ...(this.userIdHash !== undefined ? { userIdHash: this.userIdHash } : {}),
    };

    this.eventQueue.push(telemetryEvent);

    if (this.eventQueue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  /**
   * Track an error
   */
  trackError(
    error: Error,
    context?: Record<string, unknown>,
    severity: ErrorEvent['severity'] = 'medium'
  ): void {
    if (!this.enabled) {
      return;
    }

    const sanitizedContext = this.sanitizeProperties(context);
    const errorEvent: ErrorEvent = {
      error: {
        name: error.name,
        message: this.sanitizeString(error.message),
      },
      ...(Object.keys(sanitizedContext).length > 0 ? { context: sanitizedContext } : {}),
      severity,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    this.errorQueue.push(errorEvent);

    // Immediately flush critical errors
    if (severity === 'critical') {
      this.flushErrors();
    }
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string): void {
    this.userIdHash = this.hashIdentifier(userId);
    this.trackEvent('user_identified', { user_id_present: true });
  }

  /**
   * Track page view
   */
  trackPageView(page: string, properties?: Record<string, any>): void {
    this.trackEvent('page_view', { page, ...properties });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, properties?: Record<string, any>): void {
    this.trackEvent('feature_used', { feature, ...properties });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.trackEvent('performance_metric', { metric, value, unit });
  }

  /**
   * Flush events to telemetry server
   */
  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch(import.meta.env['VITE_TELEMETRY_URL'] ?? '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events,
          appVersion: import.meta.env['VITE_APP_VERSION'],
          build: import.meta.env['VITE_APP_BUILD'],
        }),
      });

      if (!response.ok) {
        logger.error('Failed to send telemetry:', response.statusText);
        // Re-queue events if failed
        this.eventQueue.unshift(...events);
      }
    } catch (error) {
      logger.error('Telemetry error:', error);
      // Re-queue events if failed
      this.eventQueue.unshift(...events);
    }
  }

  /**
   * Flush errors to error tracking server
   */
  private async flushErrors(): Promise<void> {
    if (this.errorQueue.length === 0) {
      return;
    }

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    try {
      const response = await fetch(import.meta.env['VITE_ERROR_REPORTING_URL'] ?? '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errors,
          appVersion: import.meta.env['VITE_APP_VERSION'],
          build: import.meta.env['VITE_APP_BUILD'],
          platform: navigator.platform,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        logger.error('Failed to send error report:', response.statusText);
      }
    } catch (error) {
      logger.error('Error reporting failed:', error);
    }
  }

  /**
   * Setup global error handlers
   */
  private setupErrorHandlers(): void {
    // Handle unhandled errors
    window.addEventListener('error', event => {
      this.trackError(
        new Error(event.message),
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        'high'
      );
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', event => {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : this.sanitizeString(String(event.reason));
      this.trackError(
        new Error('Unhandled Promise Rejection'),
        {
          reason,
        },
        'high'
      );
    });
  }

  /**
   * Start interval to flush events
   */
  private startFlushInterval(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      this.flush();
      this.flushErrors();
    }, this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
      this.flushErrors();
    });
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Disable telemetry
   */
  disable(): void {
    this.enabled = false;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.eventQueue = [];
    this.errorQueue = [];
  }

  /**
   * Enable telemetry
   */
  enable(): void {
    this.enabled = true;
    this.startFlushInterval();
    this.setupErrorHandlers();
  }

  private sanitizeProperties(properties?: Record<string, unknown>): TelemetryProperties {
    if (!properties) {
      return {};
    }

    const sanitized: TelemetryProperties = {};

    Object.entries(properties).forEach(([key, value]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        return;
      }

      if (value === null) {
        sanitized[key] = null;
        return;
      }

      if (typeof value === 'boolean') {
        sanitized[key] = value;
        return;
      }

      if (typeof value === 'number') {
        if (Number.isFinite(value)) {
          sanitized[key] = value;
        }
        return;
      }

      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
        return;
      }

      if (Array.isArray(value)) {
        sanitized[`${key}_count`] = value.length;
        return;
      }

      if (value instanceof Error) {
        sanitized[`${key}_name`] = value.name;
        sanitized[`${key}_message`] = this.sanitizeString(value.message);
        return;
      }

      if (typeof value === 'object') {
        sanitized[`${key}_type`] = 'object';
      }
    });

    return sanitized;
  }

  private sanitizeString(value: string): string {
    const normalized = value.trim();
    if (normalized.length === 0) {
      return normalized;
    }

    if (normalized.length > MAX_PROPERTY_STRING_LENGTH) {
      return `${normalized.slice(0, MAX_PROPERTY_STRING_LENGTH)}...`;
    }

    return normalized;
  }

  private hashIdentifier(value: string): string {
    let hash = 5381;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 33) ^ value.charCodeAt(i);
    }
    return `u_${(hash >>> 0).toString(16)}`;
  }
}

// Export singleton instance
export const telemetry = TelemetryService.getInstance();
