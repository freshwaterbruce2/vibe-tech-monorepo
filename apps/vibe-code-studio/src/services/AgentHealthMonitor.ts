import { EventEmitter } from '../utils/EventEmitter';
import { logger } from '../utils/logger';

export interface HealthIssue {
  type: 'timeout' | 'memory_leak' | 'high_error_rate' | 'resource_exhaustion' | 'dependency_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  firstOccurred: Date;
  lastOccurred: Date;
  occurrenceCount: number;
  autoResolve: boolean;
}

export interface AgentHealthStatus {
  agentId: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  lastResponseTime: number;
  errorRate: number;
  consecutiveFailures: number;
  lastHealthCheck: Date;
  issues: HealthIssue[];
}

export class AgentHealthMonitor extends EventEmitter {
  private healthStatuses: Map<string, AgentHealthStatus> = new Map();
  private readonly MAX_CONSECUTIVE_FAILURES = 3;

  constructor(private emitFunc: (event: string, data: Record<string, unknown>) => void) {
    super();
  }

  updateHealthStatus(agentId: string, event: 'attempting' | 'failed', errorRate: number, error?: Error): void {
    if (!this.healthStatuses.has(agentId)) {
      this.healthStatuses.set(agentId, {
        agentId,
        status: 'healthy',
        lastResponseTime: 0,
        errorRate: 0,
        consecutiveFailures: 0,
        lastHealthCheck: new Date(),
        issues: []
      });
    }

    const health = this.healthStatuses.get(agentId)!;
    health.lastHealthCheck = new Date();
    health.errorRate = errorRate;

    if (event === 'failed' && error) {
      health.consecutiveFailures++;
      
      // Determine health status
      if (health.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        health.status = 'unhealthy';
      } else if (health.errorRate > 0.2) {
        health.status = 'degraded';
      }

      // Add health issue
      const issueType = this.categorizeError(error);
      this.addHealthIssue(health, issueType, error.message);
    }

    this.emitFunc('healthStatusUpdated', { agentId, health });
  }

  resetConsecutiveFailures(agentId: string): void {
    const health = this.healthStatuses.get(agentId);
    if (health) {
      health.consecutiveFailures = 0;
      if (health.status === 'unhealthy' || health.status === 'degraded') {
        health.status = 'healthy';
      }
    }
  }

  recordFailure(agentId: string): void {
    const health = this.healthStatuses.get(agentId);
    if (health) {
      health.consecutiveFailures++;
    }
  }

  private addHealthIssue(health: AgentHealthStatus, type: HealthIssue['type'], description: string): void {
    const existingIssue = health.issues.find(issue => issue.type === type);
    
    if (existingIssue) {
      existingIssue.lastOccurred = new Date();
      existingIssue.occurrenceCount++;
    } else {
      health.issues.push({
        type,
        severity: this.getSeverityForIssueType(type),
        description,
        firstOccurred: new Date(),
        lastOccurred: new Date(),
        occurrenceCount: 1,
        autoResolve: this.canAutoResolve(type)
      });
    }
  }

  categorizeError(error: Error): HealthIssue['type'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) {return 'timeout';}
    if (message.includes('memory') || message.includes('heap')) {return 'memory_leak';}
    if (message.includes('resource') || message.includes('limit')) {return 'resource_exhaustion';}
    if (message.includes('connection') || message.includes('network')) {return 'dependency_failure';}
    
    return 'high_error_rate';
  }

  private getSeverityForIssueType(type: HealthIssue['type']): HealthIssue['severity'] {
    switch (type) {
      case 'memory_leak':
      case 'resource_exhaustion':
        return 'critical';
      case 'timeout':
      case 'dependency_failure':
        return 'high';
      case 'high_error_rate':
        return 'medium';
      default:
        return 'low';
    }
  }

  private canAutoResolve(type: HealthIssue['type']): boolean {
    return ['timeout', 'dependency_failure'].includes(type);
  }

  performHealthChecks(): void {
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

  cleanupOldData(cutoffTime: number): void {
    for (const health of this.healthStatuses.values()) {
      health.issues = health.issues.filter(issue => 
        issue.lastOccurred.getTime() > cutoffTime
      );
    }
  }

  getAgentHealth(agentId: string): AgentHealthStatus | undefined {
    return this.healthStatuses.get(agentId);
  }

  getAllAgentHealth(): Map<string, AgentHealthStatus> {
    return new Map(this.healthStatuses);
  }

  forceHealthCheck(agentId: string): AgentHealthStatus {
    this.performHealthChecks();
    return this.getAgentHealth(agentId) ?? {
      agentId,
      status: 'offline',
      lastResponseTime: 0,
      errorRate: 1,
      consecutiveFailures: 999,
      lastHealthCheck: new Date(),
      issues: []
    };
  }

  reset(): void {
    this.healthStatuses.clear();
  }
}
