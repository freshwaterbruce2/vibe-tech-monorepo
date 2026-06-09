/**
 * AgentReliabilityManagerBase - State, circuit breakers, health tracking, and monitoring
 */
import { EventEmitter } from '../utils/EventEmitter';
import { logger } from '../utils/logger';
import type { AgentContext } from './specialized-agents/BaseSpecializedAgent';
import type {
  AgentHealthStatus,
  HealthIssue,
  ReliabilityMetrics,
} from './AgentReliabilityManagerTypes';
import {
  categorizeError,
  getSeverityForIssueType,
  canAutoResolve,
} from './AgentReliabilityManagerHelpers';

/**
 * Abstract base that owns all shared state and supporting mechanics.
 * Subclasses add the request-execution and recovery-strategy logic.
 */
export abstract class AgentReliabilityManagerBase extends EventEmitter {
  protected healthStatuses: Map<string, AgentHealthStatus> = new Map();
  protected failureHistory: Map<string, Array<{
    timestamp: Date;
    error: string;
    context: AgentContext;
    recovered: boolean;
    recoveryTime?: number;
  }>> = new Map();
  protected circuitBreakers: Map<string, {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime: Date;
    halfOpenTime?: Date;
  }> = new Map();
  protected reliabilityMetrics: Map<string, ReliabilityMetrics> = new Map();

  // Health check configuration
  protected readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  protected readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  protected readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  protected readonly MAX_CONSECUTIVE_FAILURES = 3;
  protected healthInterval: ReturnType<typeof setInterval> | null = null;

  // -------------------------------------------------------------------------
  // Metrics helpers
  // -------------------------------------------------------------------------

  protected getOrCreateMetrics(agentId: string): ReliabilityMetrics {
    if (!this.reliabilityMetrics.has(agentId)) {
      this.reliabilityMetrics.set(agentId, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        uptime: 1.0,
        mtbf: 0,
        mttr: 0,
      });
    }
    return this.reliabilityMetrics.get(agentId)!;
  }

  // -------------------------------------------------------------------------
  // Circuit breaker
  // -------------------------------------------------------------------------

  protected isCircuitBreakerOpen(agentId: string): boolean {
    const breaker = this.circuitBreakers.get(agentId);
    return breaker?.isOpen ?? false;
  }

  protected updateCircuitBreaker(agentId: string, _error: Error): void {
    if (!this.circuitBreakers.has(agentId)) {
      this.circuitBreakers.set(agentId, {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: new Date(),
      });
    }

    const breaker = this.circuitBreakers.get(agentId)!;
    breaker.failureCount++;
    breaker.lastFailureTime = new Date();

    if (breaker.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.openCircuitBreaker(agentId);
    }
  }

  protected openCircuitBreaker(agentId: string): void {
    const breaker = this.circuitBreakers.get(agentId);
    if (breaker) {
      breaker.isOpen = true;
      breaker.halfOpenTime = new Date(Date.now() + this.CIRCUIT_BREAKER_TIMEOUT);

      logger.warn(`Circuit breaker opened for agent ${agentId}`);
      this.emit('circuitBreakerOpened', { agentId });
    }
  }

  protected resetCircuitBreaker(agentId: string): void {
    const breaker = this.circuitBreakers.get(agentId);
    if (breaker) {
      breaker.isOpen = false;
      breaker.failureCount = 0;
      delete breaker.halfOpenTime;

      logger.info(`Circuit breaker reset for agent ${agentId}`);
      this.emit('circuitBreakerReset', { agentId });
    }
  }

  protected resetConsecutiveFailures(agentId: string): void {
    const health = this.healthStatuses.get(agentId);
    if (health) {
      health.consecutiveFailures = 0;
      if (health.status === 'unhealthy' || health.status === 'degraded') {
        health.status = 'healthy';
      }
    }
  }

  // -------------------------------------------------------------------------
  // Health status
  // -------------------------------------------------------------------------

  protected updateHealthStatus(agentId: string, event: 'attempting' | 'failed', error?: Error): void {
    if (!this.healthStatuses.has(agentId)) {
      this.healthStatuses.set(agentId, {
        agentId,
        status: 'healthy',
        lastResponseTime: 0,
        errorRate: 0,
        consecutiveFailures: 0,
        lastHealthCheck: new Date(),
        issues: [],
      });
    }

    const health = this.healthStatuses.get(agentId)!;
    health.lastHealthCheck = new Date();

    if (event === 'failed' && error) {
      health.consecutiveFailures++;

      if (health.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        health.status = 'unhealthy';
      } else if (health.errorRate > 0.2) {
        health.status = 'degraded';
      }

      const issueType = categorizeError(error);
      this.addHealthIssue(health, issueType, error.message);
    }

    this.emit('healthStatusUpdated', { agentId, health });
  }

  protected addHealthIssue(health: AgentHealthStatus, type: HealthIssue['type'], description: string): void {
    const existingIssue = health.issues.find(issue => issue.type === type);

    if (existingIssue) {
      existingIssue.lastOccurred = new Date();
      existingIssue.occurrenceCount++;
    } else {
      health.issues.push({
        type,
        severity: getSeverityForIssueType(type),
        description,
        firstOccurred: new Date(),
        lastOccurred: new Date(),
        occurrenceCount: 1,
        autoResolve: canAutoResolve(type),
      });
    }
  }

  // -------------------------------------------------------------------------
  // Health monitoring
  // -------------------------------------------------------------------------

  protected startHealthMonitoring(): void {
    this.healthInterval = setInterval(() => {
      this.performHealthChecks();
      this.calculateReliabilityMetrics();
      this.cleanupOldData();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  protected performHealthChecks(): void {
    for (const [agentId, health] of this.healthStatuses.entries()) {
      health.issues = health.issues.filter(issue => {
        if (issue.autoResolve &&
            Date.now() - issue.lastOccurred.getTime() > 5 * 60 * 1000) {
          logger.info(`Auto-resolved issue ${issue.type} for agent ${agentId}`);
          return false;
        }
        return true;
      });

      if (health.issues.length === 0 && health.consecutiveFailures === 0) {
        health.status = 'healthy';
      }
    }
  }

  protected calculateReliabilityMetrics(): void {
    for (const [agentId, metrics] of this.reliabilityMetrics.entries()) {
      const history = this.failureHistory.get(agentId) ?? [];

      if (history.length > 1) {
        const intervals: number[] = [];
        for (let i = 1; i < history.length; i++) {
          const current = history[i];
          const previous = history[i - 1];
          if (current && previous) {
            intervals.push(current.timestamp.getTime() - previous.timestamp.getTime());
          }
        }
        // Convert to minutes
        metrics.mtbf = intervals.reduce((sum, interval) => sum + interval, 0)
          / intervals.length / 1000 / 60;
      }

      const recoveredFailures = history.filter(f => f.recovered && f.recoveryTime);
      if (recoveredFailures.length > 0) {
        // Convert to seconds
        metrics.mttr = recoveredFailures.reduce((sum, f) => sum + (f.recoveryTime ?? 0), 0)
          / recoveredFailures.length / 1000;
      }

      metrics.uptime = metrics.totalRequests > 0
        ? metrics.successfulRequests / metrics.totalRequests
        : 1.0;
    }
  }

  protected cleanupOldData(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

    for (const [agentId, history] of this.failureHistory.entries()) {
      this.failureHistory.set(agentId, history.filter(f => f.timestamp.getTime() > cutoffTime));
    }

    for (const health of this.healthStatuses.values()) {
      health.issues = health.issues.filter(issue =>
        issue.lastOccurred.getTime() > cutoffTime
      );
    }
  }
}
