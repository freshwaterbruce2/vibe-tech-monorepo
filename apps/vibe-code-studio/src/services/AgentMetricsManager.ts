export interface ReliabilityMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  uptime: number;
  mtbf: number; // Mean Time Between Failures
  mttr: number; // Mean Time To Recovery
}

export interface FailureRecord {
  timestamp: Date;
  error: string;
  context: Record<string, unknown>;
  recovered: boolean;
  recoveryTime?: number;
}

export class AgentMetricsManager {
  private reliabilityMetrics: Map<string, ReliabilityMetrics> = new Map();
  private failureHistory: Map<string, FailureRecord[]> = new Map();
  private startTime = Date.now();

  getStartTime(): number {
    return this.startTime;
  }

  getMetrics(agentId: string): ReliabilityMetrics {
    if (!this.reliabilityMetrics.has(agentId)) {
      this.reliabilityMetrics.set(agentId, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        uptime: 1.0,
        mtbf: 0,
        mttr: 0
      });
    }
    return this.reliabilityMetrics.get(agentId)!;
  }

  getHistory(agentId: string): FailureRecord[] {
    if (!this.failureHistory.has(agentId)) {
      this.failureHistory.set(agentId, []);
    }
    return this.failureHistory.get(agentId)!;
  }

  getAllMetrics(): Map<string, ReliabilityMetrics> {
    return new Map(this.reliabilityMetrics);
  }

  recordSuccess(agentId: string, responseTime: number): void {
    const metrics = this.getMetrics(agentId);
    metrics.totalRequests++;
    metrics.successfulRequests++;
    metrics.averageResponseTime = (
      (metrics.averageResponseTime * (metrics.totalRequests - 1)) + responseTime
    ) / metrics.totalRequests;

    this.reliabilityMetrics.set(agentId, metrics);
  }

  recordFailure(agentId: string, error: Error, context: Record<string, unknown>, _responseTime: number): number {
    const metrics = this.getMetrics(agentId);
    metrics.totalRequests++;
    metrics.failedRequests++;

    const history = this.getHistory(agentId);
    history.push({
      timestamp: new Date(),
      error: error.message,
      context,
      recovered: false
    });

    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    this.reliabilityMetrics.set(agentId, metrics);
    return metrics.totalRequests > 0 ? metrics.failedRequests / metrics.totalRequests : 0;
  }

  recordRecovery(agentId: string, totalTime: number): void {
    const history = this.getHistory(agentId);
    if (history.length > 0) {
      const lastFailure = history[history.length - 1];
      if (lastFailure) {
        lastFailure.recovered = true;
        lastFailure.recoveryTime = totalTime;
      }
    }
  }

  calculateReliabilityMetrics(): void {
    for (const [agentId, metrics] of this.reliabilityMetrics.entries()) {
      const history = this.failureHistory.get(agentId) ?? [];
      
      if (history.length > 1) {
        const intervals = [];
        for (let i = 1; i < history.length; i++) {
          const current = history[i];
          const previous = history[i-1];
          if (current && previous) {
            intervals.push(current.timestamp.getTime() - previous.timestamp.getTime());
          }
        }
        metrics.mtbf = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length / 1000 / 60;
      }

      const recoveredFailures = history.filter(f => f.recovered && f.recoveryTime);
      if (recoveredFailures.length > 0) {
        metrics.mttr = recoveredFailures.reduce((sum, f) => sum + (f.recoveryTime ?? 0), 0) / recoveredFailures.length / 1000;
      }

      metrics.uptime = metrics.totalRequests > 0 ? metrics.successfulRequests / metrics.totalRequests : 1.0;
    }
  }

  cleanupOldData(cutoffTime: number): void {
    for (const [agentId, history] of this.failureHistory.entries()) {
      const filteredHistory = history.filter(f => f.timestamp.getTime() > cutoffTime);
      this.failureHistory.set(agentId, filteredHistory);
    }
  }

  reset(): void {
    this.reliabilityMetrics.clear();
    this.failureHistory.clear();
    this.startTime = Date.now();
  }
}
