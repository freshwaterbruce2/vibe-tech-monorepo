import type { HealthStatus } from './capability.js';

/**
 * Overall server health status
 */
export interface ServerHealthStatus {
  /** Whether the server is healthy overall */
  healthy: boolean;
  /** Server uptime in seconds */
  uptimeSeconds: number;
  /** Server version */
  version: string;
  /** Individual capability health statuses */
  capabilities: Record<string, HealthStatus>;
  /** System metrics */
  system: SystemMetrics;
  /** Timestamp of the health check */
  timestamp: Date;
}

/**
 * System metrics for health reporting
 */
export interface SystemMetrics {
  /** Memory usage in bytes */
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  /** CPU usage percentage (0-100) */
  cpuUsage?: number;
  /** Event loop lag in milliseconds */
  eventLoopLag?: number;
}

/**
 * Health check options
 */
export interface HealthCheckOptions {
  /** Timeout for health checks in ms */
  timeout?: number;
  /** Include detailed metrics */
  detailed?: boolean;
  /** Specific capabilities to check */
  capabilities?: string[];
}

/**
 * Health check result with timing
 */
export interface HealthCheckResult {
  /** The health status */
  status: ServerHealthStatus;
  /** Time taken for the check in ms */
  durationMs: number;
}

/**
 * Create a healthy status
 */
export function createHealthyStatus(message?: string, details?: Record<string, unknown>): HealthStatus {
  return {
    healthy: true,
    message: message ?? 'OK',
    details,
    timestamp: new Date(),
  };
}

/**
 * Create an unhealthy status
 */
export function createUnhealthyStatus(message: string, details?: Record<string, unknown>): HealthStatus {
  return {
    healthy: false,
    message,
    details,
    timestamp: new Date(),
  };
}

/**
 * Get current system metrics
 */
export function getSystemMetrics(): SystemMetrics {
  const memUsage = process.memoryUsage();
  return {
    memoryUsage: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    },
  };
}

/**
 * Aggregate multiple health statuses into one
 */
export function aggregateHealthStatuses(statuses: HealthStatus[]): HealthStatus {
  const unhealthy = statuses.filter(s => !s.healthy);
  
  if (unhealthy.length === 0) {
    return createHealthyStatus('All checks passed', {
      totalChecks: statuses.length,
    });
  }

  return createUnhealthyStatus(
    `${unhealthy.length}/${statuses.length} checks failed`,
    {
      failedChecks: unhealthy.map(s => s.message),
      totalChecks: statuses.length,
    }
  );
}
